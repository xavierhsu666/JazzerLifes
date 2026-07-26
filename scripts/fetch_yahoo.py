"""
用途：呼叫 Yahoo Finance Chart API，擷取股價指數／商品期貨／加密貨幣等市場資產的每日收盤價。
路徑：scripts/fetch_yahoo.py
呼叫方式：python fetch_yahoo.py <indicators_json>
  indicators_json 範例：[{"code":"US_GOLD","symbol":"GC=F"},{"code":"TW_TAIEX","symbol":"^TWII"}]

輸出：成功擷取的資料以 JSON 陣列印到 stdout，格式：
  [{"code":"US_GOLD","periodDate":"2026-07-25","value":2385.6,"releaseDate":null}, ...]
單一指標失敗不影響其他指標，錯誤訊息輸出到 stderr，結束碼恆為 0（由呼叫端依 stdout 內容判斷成功筆數）。
僅使用標準函式庫（urllib/json），不需額外安裝套件。

注意：Yahoo Finance 為非官方公開 API（無 API Key、無官方 SLA），實務上偶爾會因為請求端 IP／User-Agent
被判定為爬蟲而暫時阻擋。啟用前務必先在實際部署機器手動執行本腳本驗證連線是否正常，
若長期不穩定，需評估改用付費/官方資料源替代。
"""

import sys
import json
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, timezone

YAHOO_BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart/"
REQUEST_TIMEOUT_SEC = 15
CHART_RANGE = "2y"     # 抓 2 年資料，足夠計算年增率與百分位燈號
CHART_INTERVAL = "1d"  # 日線

# Yahoo 對預設的 urllib User-Agent（Python-urllib/x.x）容易直接判定為爬蟲阻擋，
# 這裡改用一般瀏覽器慣用的 User-Agent 字串降低被擋機率。
REQUEST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
}


def log_error(message: str) -> None:
    print(f"[fetch_yahoo] {message}", file=sys.stderr)


def fetch_symbol(symbol: str):
    encoded_symbol = urllib.parse.quote(symbol, safe="")
    params = {"range": CHART_RANGE, "interval": CHART_INTERVAL}
    url = f"{YAHOO_BASE_URL}{encoded_symbol}?{urllib.parse.urlencode(params)}"

    req = urllib.request.Request(url, headers=REQUEST_HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT_SEC) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}：{e.reason}") from e
    except urllib.error.URLError as e:
        raise RuntimeError(f"連線失敗：{e.reason}") from e
    except (TimeoutError, json.JSONDecodeError) as e:
        raise RuntimeError(f"回應解析失敗：{e}") from e

    chart = payload.get("chart", {})
    if chart.get("error"):
        raise RuntimeError(f"Yahoo 回傳錯誤：{chart['error']}")

    results = chart.get("result")
    if not results:
        raise RuntimeError(f"回應格式異常，缺少 result 欄位：{payload}")

    result = results[0]
    timestamps = result.get("timestamp") or []
    quote_list = result.get("indicators", {}).get("quote") or [{}]
    closes = quote_list[0].get("close") or []

    if not timestamps or not closes:
        raise RuntimeError("回應中沒有 timestamp/close 資料")

    return list(zip(timestamps, closes))


def main():
    if len(sys.argv) < 2:
        log_error("缺少參數，用法：fetch_yahoo.py <indicators_json>")
        sys.exit(1)

    try:
        indicators = json.loads(sys.argv[1])
    except json.JSONDecodeError as e:
        log_error(f"indicators_json 參數不是合法 JSON：{e}")
        sys.exit(1)

    results = []
    for item in indicators:
        code = item.get("code")
        symbol = item.get("symbol")
        if not code or not symbol:
            log_error(f"指標設定缺少 code 或 symbol，略過：{item}")
            continue

        try:
            points = fetch_symbol(symbol)
        except RuntimeError as e:
            log_error(f"指標 {code}（{symbol}）擷取失敗：{e}")
            continue

        for ts, close in points:
            if close is None:
                # 非交易日／資料缺漏，Yahoo 會回傳 null，略過
                continue
            try:
                period_date = datetime.fromtimestamp(ts, tz=timezone.utc).date().isoformat()
                value = float(close)
            except (ValueError, TypeError, OSError) as e:
                log_error(f"指標 {code} 於時間戳 {ts} 的資料無法轉換：{e}")
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
