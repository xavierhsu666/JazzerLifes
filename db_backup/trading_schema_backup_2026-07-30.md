# TRADING schema 結構備份（交易紀錄與覆盤分析）

- **建立日期**：2026-07-30
- **異動類型**：新增（新建 TRADING schema，共 2 張表，不影響既有資料表）
- **對應腳本**：`scripts/sql/trading_schema.sql`
- **對應 Model**：`JazzerLifeApi/Models/Trade.cs`、`StrategyTag.cs`
- **對應 DbContext 變更**：`JazzerLifeApi/Models/JazzerLifeContext.cs` 新增 `DbSet<Trade> Trades`、`DbSet<StrategyTag> StrategyTags`，並在 `OnModelCreating` 新增對應設定（含 Filtered Unique Index）
- **對應 API**：`TradeEndpoints.cs` / `StrategyTagEndpoints.cs` / `TradeImportEndpoints.cs` / `TradeAnalysisEndpoints.cs`
- **對應前端頁面**：新模組 `wwwroot/trading/trading.html` + `assets/js/trading.js` + `assets/css/trading.css`，Tab1「總覽」／Tab2「交易明細」／Tab3「策略標籤管理」
- **新增套件相依**：`JazzerLifeApi.csproj` 新增 `ClosedXML` 0.104.2（MIT 授權，用於解析 cTrader 匯出的 .xlsx 檔）

## 功能說明

個人交易紀錄與覆盤分析工具。資料來源三種：IC Markets cTrader Position History List（.xlsx 匯入）、
TradingView Broker 面板訂單匯出（.csv 匯入，僅補值不新增交易）、手動輸入。

**設計上的關鍵取捨**（討論過程中確認，記錄原因供日後回顧）：

1. **一筆交易 = 一次完整進場+出場**，不是原始逐筆訂單列。cTrader 匯入時依 Position 編號把同一部位的
   多列（通常 2 列：開倉+平倉）配對成一筆 `TRADING.Trade`。若同一 Position 編號超過 2 列（加碼/減碼等
   複雜情況），仍會配對出一筆估計值（用最早/最晚時間當進出場時間、加總損益），但標記 `NeedsReview = 1`，
   不會擋住整批匯入，交由使用者在前端手動確認。
2. **EntryPrice/ExitPrice 允許 NULL**：cTrader 的「Position History List」報表本身不含進出場價格
   （Open Price 欄位恆為 0），只有損益金額（Profit，已含手續費/庫存費，未再拆分）。
3. **TradingView 訂單匯出只補值、不新增交易**：cTrader 的 Position 編號與 TradingView 的訂單編號是
   cTrader 內部不同的流水號體系，兩者無法直接互相對應（曾嘗試用同一帳戶不同時段的樣本檔比對，數字範圍
   對不上，確認並非同一編號空間）。因此改用「商品＋數量＋時間相近（預設容許誤差 10 分鐘，可調整）」
   的方式，把 TradingView 訂單的「成交均價」比對回填到既有交易的 EntryPrice/ExitPrice，已有值的欄位
   不會被覆蓋。
4. **Profit 直接採用來源報表淨值**：cTrader 報表無獨立的手續費/庫存費欄位，假設 Profit 已經是淨損益，
   不再另外拆分成本結構。
5. **策略標籤採軟刪除**：比照 `RENT.Room` 慣例，停用（`IsActive = 0`）後下拉選單不再列出，但既有交易
   紀錄的標籤關聯不受影響；刪除標籤 API 會擋下「已有交易使用該標籤」的情況，避免歷史紀錄的標籤名稱
   憑空消失。

## 資料表結構

### TRADING.StrategyTag（策略標籤主檔）

| 欄位 | 型別 | 說明 |
|---|---|---|
| StrategyTagID | INT IDENTITY PK | |
| UserID | INT NOT NULL | 沒有額外 FK 約束（比照 FIN.AccountCategory / RENT.Property 慣例），僅在應用層以 ClaimsPrincipal 過濾 |
| Name | NVARCHAR(50) | 標籤名稱 |
| SortOrder | INT DEFAULT 0 | 下拉選單顯示排序 |
| IsActive | BIT DEFAULT 1 | 軟刪除，停用不影響既有交易的標籤關聯 |
| CreatedAt / UpdatedAt | DATETIME DEFAULT GETDATE() | |

UNIQUE (UserID, Name)

### TRADING.Trade（交易主表）

| 欄位 | 型別 | 說明 |
|---|---|---|
| TradeID | INT IDENTITY PK | |
| UserID | INT NOT NULL | 同上，應用層過濾 |
| Symbol | NVARCHAR(20) | 商品代碼（如 BTCUSD、XAUUSD），匯入時會 trim 前後空白並轉大寫 |
| Direction | NVARCHAR(10) | "Buy"（做多）/ "Sell"（做空），依開倉當下的買賣別決定 |
| Volume | DECIMAL(18,4) | 交易量（手數） |
| EntryTime | DATETIME NOT NULL | 進場時間 |
| ExitTime | DATETIME NULL | 出場時間，NULL 代表尚未平倉（保留未來支援持倉中部位的彈性，目前匯入僅處理已平倉） |
| EntryPrice / ExitPrice | DECIMAL(18,6) NULL | 進出場價格，cTrader 匯入預設為 NULL，需搭配 TradingView 補值匯入才會有值 |
| Profit | DECIMAL(18,2) | 損益金額，直接採用來源報表淨值 |
| Source | NVARCHAR(20) | "ICMarkets" / "TradingView" / "Manual" |
| BrokerPositionId | NVARCHAR(50) NULL | 來源報表的部位編號，僅用於同來源重複匯入防呆，不同來源間不保證可互相對應 |
| StrategyTagID | INT NULL FK -> TRADING.StrategyTag | |
| Note | NVARCHAR(1000) NULL | 進出場理由／事後檢討心得 |
| NeedsReview | BIT DEFAULT 0 | 匯入時同部位編號超過 2 筆訂單列（加碼/減碼）無法簡單配對，標記需人工檢查 |
| CreatedAt / UpdatedAt | DATETIME DEFAULT GETDATE() | |

INDEX (UserID, EntryTime)；INDEX (UserID, Symbol)
UNIQUE FILTERED INDEX (UserID, Source, BrokerPositionId) WHERE BrokerPositionId IS NOT NULL — 防止同一份報表重複匯入產生重複交易，手動輸入（BrokerPositionId 恆為 NULL）不受此約束影響

## API 端點

| 方法 | 路徑 | 說明 |
|---|---|---|
| GET | `/api/trading/trades` | 交易明細查詢（可依商品/來源/策略標籤/日期區間/僅顯示待檢查 篩選） |
| POST | `/api/trading/trades` | 手動新增一筆交易（Source 固定 Manual） |
| PUT | `/api/trading/trades/{id}` | 更新交易（標籤/心得為主，也可修正其他欄位；存檔會清除 NeedsReview 標記） |
| DELETE | `/api/trading/trades/{id}` | 刪除交易 |
| GET/POST/PUT/DELETE | `/api/trading/strategy-tags` | 策略標籤 CRUD（刪除會擋下已被交易使用的標籤） |
| POST | `/api/trading/import/ctrader` | 匯入 cTrader Position History List（.xlsx），依 Position 編號配對成交易，同編號重複匯入會略過 |
| POST | `/api/trading/import/tradingview-orders` | 匯入 TradingView 訂單匯出（.csv），只補 EntryPrice/ExitPrice，不新增交易；`toleranceMinutes` 參數控制時間比對容許誤差（預設 10 分鐘） |
| GET | `/api/trading/analysis/summary` | 績效指標：交易筆數、勝率、獲利因子、平均賺賠比、平均持倉時間（僅採計已平倉交易） |
| GET | `/api/trading/analysis/by-symbol` | 依商品分類統計：筆數/總損益/勝率 |
| GET | `/api/trading/analysis/equity-curve` | 依平倉時間排序的累積損益序列 |
| GET | `/api/trading/analysis/by-tag` | 依策略標籤統計：筆數/總損益/勝率（未標記歸類為「未標記」） |

分析端點皆支援 `dateFrom`/`dateTo`（依 EntryTime 篩選）query 參數。

## 前端影響範圍

- 全新模組，不影響 car / finance / macro / rent 既有頁面與計算邏輯。
- `wwwroot/trading/trading.html`：Tab1「總覽」（KPI 卡片＋資金曲線 Highcharts＋商品分類長條圖＋策略標籤統計表）、
  Tab2「交易明細」（篩選＋ag-Grid 風格但改用一般 table 呈現、行內編輯標籤/心得、匯入面板、手動新增表單）、
  Tab3「策略標籤管理」（CRUD）。
- 已加入 `wwwroot/index.html` 首頁卡片與 `manifest-trading.json`（PWA scope `/trading/`）。

## 部署前置作業

1. 於 SSMS 對 JazzerLife 資料庫執行 `scripts/sql/trading_schema.sql`（未執行前 `/api/trading/*` 相關 API 會因資料表不存在而失敗）。
2. `dotnet restore` 還原新增的 `ClosedXML` 套件後再建置/發布。
