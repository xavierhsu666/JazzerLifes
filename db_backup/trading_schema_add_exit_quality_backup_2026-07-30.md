# TRADING.Trade 結構備份（新增出場方式分類與滑價欄位）

- **建立日期**：2026-07-30
- **異動類型**：新增欄位，不影響既有資料列（新欄位皆為 NULL 預設值）
- **對應腳本**：`scripts/sql/trading_schema_add_exit_quality_2026-07-30.sql`
- **對應 Model**：`JazzerLifeApi/Models/Trade.cs`（新增 `ExitReason`、`ExitSlippage`）
- **對應 API**：
  - `TradeImportEndpoints.cs` 的 `POST /api/trading/import/tradingview-orders` 擴充：比對到平倉訂單時，
    依訂單「種類」欄位回填 `ExitReason`，並在 `ExitReason` 為停損/停利時計算 `ExitSlippage`
  - `TradeAnalysisEndpoints.cs` 新增 `GET /api/trading/analysis/by-exit-reason`、`GET /api/trading/analysis/cost-summary`
  - `TradeEndpoints.cs` 的交易明細查詢/更新，新增 `ExitReason`（可手動編輯修正）與 `ExitSlippage`（唯讀）
- **對應前端**：`trading.html`／`trading.js` 交易明細表新增出場方式/滑價欄位，總覽頁新增依出場方式統計與隱含成本面板

## 背景

cTrader Records + TradingView 訂單兩份資料合併後，除了進出場價格，還能額外萃取兩個覆盤很有價值的維度：

1. **出場方式**：TradingView 訂單的「種類」欄位區分市場/停損/停利。比對到平倉那筆訂單時，順便
   把這個分類寫回交易紀錄，之後就能比較「被停損出場」vs「主動停利」vs「手動平倉」各自的損益分布與
   次數——這通常最能看出風控紀律的問題（例如停損設太緊常常反彈、或凹單導致虧損擴大）。
2. **滑價**：停損/停利訂單原本設定的觸發價（停損價/限價）跟實際成交均價一定會有落差（尤其
   BTCUSD 這種高波動商品），這個落差就是滑價成本，長期追蹤能看出商品/時段的執行品質。

## 欄位新增

### TRADING.Trade

| 欄位 | 型別 | 說明 |
|---|---|---|
| ExitReason | NVARCHAR(20) NULL | "StopLoss" / "TakeProfit" / "Market"（手動或市價平倉）/ NULL（尚未比對出來或無法判斷）。由 TradingView 訂單匯入自動回填，也開放使用者手動編輯修正 |
| ExitSlippage | DECIMAL(18,6) NULL | 停損/停利觸發價 vs 實際成交價的差，正值代表對使用者不利。只有 `ExitReason` 為 StopLoss/TakeProfit 時才有值（Market 出場沒有明確的「預期價格」可比較），由匯入邏輯自動計算，不開放手動編輯 |

## API 端點異動

| 方法 | 路徑 | 說明 |
|---|---|---|
| GET | `/api/trading/analysis/by-exit-reason` | 新增：依出場方式（停損/停利/手動/未知）統計筆數/總損益/勝率 |
| GET | `/api/trading/analysis/cost-summary` | 新增：用進出場價格＋方向反推毛損益，跟實際淨損益比較算出隱含成本；同時回傳平均滑價。**目前合約乘數（每手對應的商品單位數）只針對 BTCUSD 驗證過為 1，其餘商品預設也是 1，可能不準確**，之後有更多商品資料再擴充對照表 |

## 部署前置作業

於 SSMS 對 JazzerLife 資料庫依序執行（若尚未執行過前面版本）：

1. `scripts/sql/trading_schema.sql`
2. `scripts/sql/trading_schema_add_ctrader_records_2026-07-30.sql`
3. `scripts/sql/trading_schema_add_exit_quality_2026-07-30.sql`
