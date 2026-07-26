"""
用途：擷取台灣官方開放資料（主計總處、國發會等）的總經指標時序資料。
路徑：scripts/fetch_tw_gov.py
呼叫方式：python fetch_tw_gov.py <codes_json>
  codes_json 範例：["TW_UNEMPLOYMENT", "TW_CPI_YOY"]

資料來源設定於同目錄 tw_gov_sources.json（url / periodField / valueField）。
若某指標尚未設定 url 或 periodField/valueField，會被略過並於 stderr 說明原因，不會寫入猜測資料。

輸出：成功擷取的資料以 JSON 陣列印到 stdout，格式：
  [{"code":"TW_UNEMPLOYMENT","periodDate":"2026-06-01","value":3.4,"releaseDate":null}, ...]
僅使用標準函式庫（urllib/json/csv/xml），不需額外安裝套件。
"""

import sys
import os
import json
import csv
import io
import re
import ssl
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET
from datetime import date

REQUEST_TIMEOUT_SEC = 15
CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tw_gov_sources.json")

# 台灣政府網站（.gov.tw）多半使用政府憑證管理中心（GRCA）簽發的憑證，
# 其憑證鏈未內建於 Python 預設的憑證信任庫（certifi）。瀏覽器能開啟是因作業系統已信任 GRCA，
# 但 Python 的 ssl 模組不會自動採用系統憑證庫，直接連線會丟出 CERTIFICATE_VERIFY_FAILED。
# 這裡僅在偵測到「憑證驗證失敗」時，針對本檔案設定中已由人工確認過的固定政府資料網址，
# 改用不驗證憑證的連線重試一次（唯讀 GET、不含任何帳密/憑證資料，風險可控）。
_INSECURE_SSL_CONTEXT = ssl._create_unverified_context()


def log_error(message: str) -> None:
    print(f"[fetch_tw_gov] {message}", file=sys.stderr)


def load_config():
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def download(url: str) -> bytes:
    try:
        with urllib.request.urlopen(url, timeout=REQUEST_TIMEOUT_SEC) as resp:
            return resp.read()
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}：{e.reason}") from e
    except urllib.error.URLError as e:
        if isinstance(e.reason, ssl.SSLCertVerificationError):
            log_error(f"憑證驗證失敗（{url}），改用略過驗證的連線重試一次：{e.reason}")
            try:
                with urllib.request.urlopen(url, timeout=REQUEST_TIMEOUT_SEC, context=_INSECURE_SSL_CONTEXT) as resp:
                    return resp.read()
            except urllib.error.HTTPError as e2:
                raise RuntimeError(f"HTTP {e2.code}：{e2.reason}") from e2
            except urllib.error.URLError as e2:
                raise RuntimeError(f"連線失敗（略過憑證驗證後仍失敗）：{e2.reason}") from e2
        raise RuntimeError(f"連線失敗：{e.reason}") from e


def parse_period(text: str):
    """嘗試解析常見的台灣官方期別格式，回傳 date 或 None。"""
    text = text.strip()
    if not text:
        return None

    # 民國年月，如 "115年06月" / "115年6月"
    m = re.match(r"^(\d{2,3})年(\d{1,2})月?$", text)
    if m:
        roc_year, month = int(m.group(1)), int(m.group(2))
        return date(roc_year + 1911, month, 1)

    # 西元年月，如 "2026年06月"
    m = re.match(r"^(\d{4})年(\d{1,2})月?$", text)
    if m:
        year, month = int(m.group(1)), int(m.group(2))
        return date(year, month, 1)

    # 主計總處常見格式：西元年 + M + 月，如 "1978M01"（若無 M 僅為年度彙總列，不視為月資料）
    m = re.match(r"^(\d{4})M(\d{1,2})$", text)
    if m:
        year, month = int(m.group(1)), int(m.group(2))
        return date(year, month, 1)

    # YYYYMM / YYYY-MM / YYYY/MM
    m = re.match(r"^(\d{4})[-/]?(\d{2})$", text)
    if m:
        year, month = int(m.group(1)), int(m.group(2))
        return date(year, month, 1)

    return None


def parse_value(text: str):
    cleaned = text.strip().replace(",", "")
    # 部分政府資料集會在數值前加註 r（修正數）/ p（初步估計數）/ f（預測數）等前綴，如 "r 12.95"、"p  14.55"，
    # 需先去除前綴才能轉成數字；"…" 為官方慣用的「尚無資料/數值不明」註記，與 "-" 一併視為缺值。
    cleaned = re.sub(r"^[a-zA-Z]\s+", "", cleaned).strip()
    if cleaned in ("", "-", "N/A", "NA", "…", "--"):
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def extract_rows_xml(raw: bytes):
    """通用 XML 解析：以根節點的直接子節點視為一列資料，回傳 dict 列表。"""
    root = ET.fromstring(raw)
    rows = []
    for row_elem in root:
        fields = {}
        for child in row_elem:
            fields[child.tag] = (child.text or "").strip()
        if fields:
            rows.append(fields)
    return rows


def extract_rows_csv(raw: bytes):
    text = raw.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    return list(reader)


def process_indicator(code: str, source_cfg: dict):
    url = source_cfg.get("url")
    period_field = source_cfg.get("periodField")
    value_field = source_cfg.get("valueField")
    fmt = source_cfg.get("format", "xml")

    if not url:
        log_error(f"指標 {code} 尚未設定 url，略過（見 tw_gov_sources.json 的 note 說明）")
        return []

    if not period_field or not value_field:
        log_error(f"指標 {code} 尚未設定 periodField/valueField，略過，避免寫入錯誤欄位")
        return []

    try:
        raw = download(url)
    except RuntimeError as e:
        log_error(f"指標 {code} 下載失敗：{e}")
        return []

    try:
        rows = extract_rows_xml(raw) if fmt == "xml" else extract_rows_csv(raw)
    except ET.ParseError as e:
        log_error(f"指標 {code} XML 解析失敗：{e}")
        return []
    except Exception as e:
        log_error(f"指標 {code} 資料解析失敗：{e}")
        return []

    if not rows:
        log_error(f"指標 {code} 未解析出任何資料列，請確認來源格式是否變更")
        return []

    if period_field not in rows[0] or value_field not in rows[0]:
        log_error(
            f"指標 {code} 設定的欄位名稱不存在，實際欄位為：{list(rows[0].keys())}，"
            f"請修正 tw_gov_sources.json 的 periodField/valueField"
        )
        return []

    results = []
    for row in rows:
        period_raw = row.get(period_field, "")
        value_raw = row.get(value_field, "")

        period = parse_period(period_raw)
        value = parse_value(value_raw)

        if period is None or value is None:
            continue

        results.append({
            "code": code,
            "periodDate": period.isoformat(),
            "value": value,
            "releaseDate": None,
        })

    return results


def main():
    if len(sys.argv) < 2:
        log_error("缺少參數，用法：fetch_tw_gov.py <codes_json>")
        sys.exit(1)

    try:
        codes = json.loads(sys.argv[1])
    except json.JSONDecodeError as e:
        log_error(f"codes_json 參數不是合法 JSON：{e}")
        sys.exit(1)

    try:
        config = load_config()
    except (OSError, json.JSONDecodeError) as e:
        log_error(f"讀取 tw_gov_sources.json 失敗：{e}")
        sys.exit(1)

    all_results = []
    for code in codes:
        source_cfg = config.get(code)
        if not source_cfg:
            log_error(f"指標 {code} 未在 tw_gov_sources.json 設定，略過")
            continue
        all_results.extend(process_indicator(code, source_cfg))

    print(json.dumps(all_results, ensure_ascii=False))


if __name__ == "__main__":
    main()
