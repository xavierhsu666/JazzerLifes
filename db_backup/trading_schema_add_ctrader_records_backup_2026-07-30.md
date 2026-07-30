# TRADING.Trade 結構備份（新增 cTrader Records 匯入格式支援）

- **建立日期**：2026-07-30
- **異動類型**：異動既有欄位（EntryTime 改為可為 NULL）＋新增 Filtered Unique Index，不影響既有資料列
- **對應腳本**：`scripts/sql/trading_schema_add_ctrader_records_2026-07-30.sql`
- **對應 Model**：`JazzerLifeApi/Models/Trade.cs`（`EntryTime` 型別改為 `DateTime?`）
- **對應 API**：
  - `TradeImportEndpoints.cs` 新增 `POST /api/trading/import/ctrader-records`
  - `TradeImportEndpoints.cs` 的 `POST /api/trading/import/tradingview-orders` 擴充：除了補進出場價格，也會嘗試回填缺少的進場時間
  - `TradeEndpoints.cs`／`TradeAnalysisEndpoints.cs` 調整以正確處理 `EntryTime` 為 NULL 的交易
- **對應前端**：`trading.html`／`trading.js` 新增 cTrader Records 上傳區塊，交易明細表 EntryTime 缺值時顯示「未知」

## 背景

使用者實際找到 cTrader 除了「Position History List」外，另有一種「Records」匯出（.xlsx，單一工作表
名為 "Records"），欄位為：交易品种／开仓方向／平仓时间／建仓价／平仓价格／平仓量／平仓交易量／
净值($)／账户余额 $。這個格式**一列就是一筆完整的已平倉交易**，直接含進場價、出場價、損益，
不需要像「Position History List」那樣配對兩列，資料品質明顯更好。

但這個格式有兩個限制：

1. **沒有 Position/訂單編號**，無法比照 `ICMarkets` 來源用 `BrokerPositionId` 防重複匯入。
   改用「商品＋平倉時間（含毫秒）＋數量＋損益」當天然鍵，比對到毫秒等級的時間欄位重複機率極低，
   足以當唯一識別。因此另立 `Source = 'ICMarketsRecords'`，與原本 `ICMarkets`（Position History List）
   分開處理，兩者的防重複邏輯不同。
2. **只有「平倉時間」，沒有「進場時間」**。討論後決定：匯入當下 `EntryTime` 先留空（NULL），
   若使用者之後有上傳同時段的 TradingView 訂單匯出，才自動比對回填；比對不到就維持空白，
   不會自行捏造「用平倉時間充當進場時間」這種不準確的假資料。

## 欄位異動

### TRADING.Trade

| 欄位 | 異動前 | 異動後 | 說明 |
|---|---|---|---|
| EntryTime | DATETIME NOT NULL | DATETIME NULL | `ICMarketsRecords` 來源匯入時可能無法得知進場時間，允許留空；`Manual` 手動新增時，前端/API 仍會要求必填 |

### 新增索引

`UQ_Trade_ICMarketsRecords_NaturalKey`：`(UserID, Source, Symbol, ExitTime, Volume, Profit)`，
`WHERE Source = 'ICMarketsRecords'` 的 Filtered Unique Index，只約束此來源的交易，不影響
`ICMarkets`（用 `BrokerPositionId` 防重複）與 `Manual`（無防重複約束）。

## API 端點異動

| 方法 | 路徑 | 說明 |
|---|---|---|
| POST | `/api/trading/import/ctrader-records` | 新增：解析 cTrader「Records」匯出（.xlsx），一列直接對應一筆交易，含進場價/出場價/損益；用商品+平倉時間+數量+損益天然鍵防重複 |
| POST | `/api/trading/import/tradingview-orders` | 擴充：除了原本補 EntryPrice/ExitPrice，也會對 `EntryTime` 為 NULL 的交易，用「商品+開倉方向+數量」在平倉時間之前找最接近的一筆訂單成交時間回填進場時間（找不到則維持 NULL） |

## 前端影響範圍

- `trading.html` 匯入面板新增「cTrader Records」上傳區塊（與既有 cTrader Position History List、
  TradingView 訂單匯入並列，三選一或依需求都上傳）。
- 交易明細表格：`EntryTime` 為 NULL 時顯示「未知」而非空白或錯誤格式；「平均持倉時間」KPI 計算時
  會排除進場時間未知的交易，不會因缺值而整體算錯或報錯。

## 部署前置作業

於 SSMS 對 JazzerLife 資料庫依序執行（若尚未執行過前一版本）：

1. `scripts/sql/trading_schema.sql`（若尚未執行過）
2. `scripts/sql/trading_schema_add_ctrader_records_2026-07-30.sql`
