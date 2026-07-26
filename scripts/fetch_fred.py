"""
用途：呼叫 FRED（美國聯準會）API，擷取指定指標的時序資料。
路徑：scripts/fetch_fred.py
呼叫方式：python fetch_fred.py <FRED_API_KEY> <indicators_json>
  indicators_json 範例：[{"code":"US_CPI","seriesId":"CPIAUCSL"},{"code":"US_UNRATE","seriesId":"UNRATE"}]

輸出：成功擷取的資料以 JSON 陣列印到 stdout，格式：
  [{"code":"US_CPI","periodDate":"2026-06-01","value":314.5,"releaseDate":"2026-07-11"}, ...]
單一指標失敗不影響其他指標，錯誤訊息輸出到 stderr，結束碼恆為 0（由呼叫端依 stdout 內容判斷成功筆數）。
僅使用標準函式庫（urllib/json），不需額外安裝套件。
"""

import sys
import json
import urllib.request
import urllib.parse
import urllib.error

FRED_BASE_URL = "https://api.stlouisfed.org/fred/series/observations"
REQUEST_TIMEOUT_SEC = 15
OBSERVATION_LIMIT = 24  # 每次同步取最近 24 期，配合 DB 端 upsert 去重


def log_error(message: str) -> None:
    print(f"[fetch_fred] {message}", file=sys.stderr)


def fetch_series(api_key: str, series_id: str):
    params = {
        "series_id": series_id,
        "api_key": api_key,
        "file_type": "json",
        "sort_order": "desc",
        "limit": OBSERVATION_LIMIT,
    }
    url = f"{FRED_BASE_URL}?{urllib.parse.urlencode(params)}"

    try:
        with urllib.request.urlopen(url, timeout=REQUEST_TIMEOUT_SEC) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}：{e.reason}") from e
    except urllib.error.URLError as e:
        raise RuntimeError(f"連線失敗：{e.reason}") from e
    except (TimeoutError, json.JSONDecodeError) as e:
        raise RuntimeError(f"回應解析失敗：{e}") from e

    observations = payload.get("observations")
    if observations is None:
        raise RuntimeError(f"回應格式異常，缺少 observations 欄位：{payload}")

    return observations


def main():
    if len(sys.argv) < 3:
        log_error("缺少參數，用法：fetch_fred.py <api_key> <indicators_json>")
        sys.exit(1)

    api_key = sys.argv[1]
    if not api_key:
        log_error("FRED API Key 為空，請確認 appsettings.json 的 FredApiKey 設定")
        sys.exit(1)

    try:
        indicators = json.loads(sys.argv[2])
    except json.JSONDecodeError as e:
        log_error(f"indicators_json 參數不是合法 JSON：{e}")
        sys.exit(1)

    results = []
    for item in indicators:
        code = item.get("code")
        series_id = item.get("seriesId")
        if not code or not series_id:
            log_error(f"指標設定缺少 code 或 seriesId，略過：{item}")
            continue

        try:
            observations = fetch_series(api_key, series_id)
        except RuntimeError as e:
            log_error(f"指標 {code}（{series_id}）擷取失敗：{e}")
            continue

        for obs in observations:
            value_str = obs.get("value")
            period_date = obs.get("date")
            if value_str is None or value_str == "." or period_date is None:
                # FRED 以 "." 代表缺值（尚未公布），略過該筆
                continue
            try:
                value = float(value_str)
            except ValueError:
                log_error(f"指標 {code} 於 {period_date} 的數值無法轉換：{value_str}")
                continue

            results.append({
                "code": code,
                "periodDate": period_date,
                "value": value,
                "releaseDate": None,
            })

    print(json.dumps(results, ensure_ascii=False))


if __name__ == "__main__":
    main()
