# JazzerLife

個人生活管理系統，整合**車輛管理**、**財務管理**、**總體經濟溫度計**、**租屋處電費管理**與**交易日誌**五大功能模組，透過 ASP.NET Core Web API 提供服務，前端為純 HTML + jQuery + ag-Grid + Highcharts 打造的儀表板介面。

> 本專案由舊版 ASP.NET Framework（.asmx Web Service）+ 直接 SQL 拼接查詢的架構，逐步安全重寫為 ASP.NET Core + Entity Framework Core 架構。

---

## 目錄

- [功能總覽](#功能總覽)
- [技術架構](#技術架構)
- [系統需求](#系統需求)
- [安裝與部署](#安裝與部署)
- [專案結構](#專案結構)
- [API 一覽](#api-一覽)
- [安全性設計](#安全性設計)
- [開發工作流程](#開發工作流程)
- [已知限制](#已知限制)

---

## 功能總覽

### 🚗 車輛管理（AutoCare Manager）

| 功能 | 說明 |
|---|---|
| Dashboard | 綜合儀表板，顯示總里程、本月油耗花費、平均油耗、每公里成本、保養提醒 |
| 油耗紀錄 | 記錄加油量、里程、單價，自動計算行駛距離與油耗效率，趨勢圖表（週/月/年，多筆資料改用 Highcharts `scrollablePlotArea` 橫向捲動，避免月份一多被壓縮到看不清楚）|
| 車輛管理 | 新增/編輯/刪除車輛基本資料 |
| 保養週期設定 | 依里程或時間週期設定保養提醒；建議週期只納入分類為「例行」「保養」的歷史紀錄推算，避免維修等非固定週期花費拉低平均 |
| 保養紀錄 | 記錄保養項目、花費、里程、店家、分類，KPI 統計；里程欄位自動帶入目前已知最大里程 |
| 保養分類管理 | 獨立頁籤維護保養分類（例如：例行、保養、維修），供保養紀錄綁定使用，跨車輛共用 |

響應式設計：桌面顯示側邊欄導航，手機（≤767px）自動切換為底部固定導覽列。

> **回首頁入口**：finance／macro／rent／trading 四個模組的頂端導覽列左側有一顆僅在手機版顯示的 🏠 按鈕（`.navbar-home`）。原因是手機版把側邊欄移到畫面外、開關按鈕本身也在側邊欄裡、懸浮選單鈕又被底部導覽列取代，導致側邊欄裡的 JazzerLife LOGO（回 `index.html` 的唯一入口）在手機上完全點不到。car 模組因版面結構不同（無頂端導覽列）尚未加入，手機上仍需以瀏覽器上一頁返回。

### 💰 財務管理（Finance）

| 功能 | 說明 |
|---|---|
| 總覽 | 資產走勢、現金流走勢，含月對月/年對年比較 |
| 收支明細 | 總收支/收入/支出明細查詢，支援關鍵字搜尋、月份篩選、行內編輯、排除（軟刪除）|
| 分類分析 | 依收入/支出、月/年粒度做分類統計，支援下鑽查看單筆明細 |
| 專案管理 | 財務專案追蹤，包含三個獨立子系統，摘要列表的**達成率**＝上月實際資產 ÷ 上月預期資產（各自取該專案資料實際存在的最新月份）： |
| ├─ 資產流 | 追蹤專案綁定資產的**實際淨資產變化**，確認資產是否穩定成長 |
| ├─ 現金流 | 用關鍵字規則比對交易明細，追蹤專案的**每月實際收支**；命中的個別明細可再手動設定「專案層面排除」，只影響該專案的統計，不動全域排除旗標、不影響其他專案 |
| └─ 預期資產變化 | 以「建立專案時設定的預算」為期初資產，依年化流入/流出率推算，驗證財務規劃假設是否如預期 |
| 帳單管理 | 週期性帳單登記，支援新增/編輯/刪除，依頻率規則（週/月/年）自動展開全年支出預測 |
| 資料上傳 | 上傳銀行匯出的 CSV 檔案，自動依欄位特徵判斷為收支明細/帳戶餘額/股票庫存並寫入資料庫 |
| 存款帳戶總覽 | 依月份查看各帳戶餘額快照，支援手動修改結餘 |

### 🌡️ 總體經濟溫度計（Macro Pulse）

| 功能 | 說明 |
|---|---|
| 景氣溫度計 | 台灣／美國各自的綜合分數（0-100）與燈號（藍/綠/黃紅/紅），依指標歷史百分位加權計算；「市場」分類（股市/黃金/加密貨幣等資產）不計入分數，避免市場情緒污染總體經濟健康度判讀 |
| 指標矩陣 | 台美共 24 項指標，依分類（景氣/物價/就業/生產/利率/貿易/市場）分組顯示，含最新值、年增率、個別燈號 |
| 歷史走勢 | 單一指標歷史趨勢圖（Highcharts areaspline，依分類配色的漸層區域圖），指標選擇改為依分類分組的下拉選單 |
| 示警規則 | 自訂指標門檻條件，資料同步後自動比對並記錄觸發通知 |
| 資料同步 | Hangfire 每日排程呼叫 Python 腳本擷取 FRED（美國）、台灣官方開放資料、Yahoo Finance（市場資產），寫入資料庫 |

> 台灣官方開放資料來源目前完成失業率／CPI年增率／PPI年增率／GDP成長率共 4 項（`scripts/tw_gov_sources.json`），其餘 3 項（核心CPI/景氣信號燈/外銷訂單）因未找到穩定固定下載網址或格式尚未支援（ZIP），需人工確認來源或擴充腳本後補上，詳見該檔案內的 note 說明。市場資產指標（黃金/費半指數/台股加權指數）走 Yahoo Finance 非官方 API，無 SLA 保證，需留意長期穩定性。

### 🏠 租屋處電費管理（Rent Manager）

| 功能 | 說明 |
|---|---|
| 房間設定 | 房間別名、房租、每度電費、彈性調整金額（可正可負）；支援軟刪除（退租），歷史帳單不受影響 |
| 電費計算 | 依房間設定自動產生當月填寫表，輸入電表讀數即時試算用電度數/電費/應繳合計；房租/電價/調整金額採「當月建立時快照」，之後調整房間設定不影響歷史月份；頁面上方有操作流程列（① 填本月讀數 → ② 帶入公共電費 → ③ 儲存），並顯示當月主表是否已登記 |
| 公共電費 | 主表（母表）電費紀錄管理 + 試算。主表紀錄以**明確的起訖月份區間**登記（`StartMonth` ~ `EndMonth`，不再依賴「一筆隱含涵蓋兩個月」的約定），試算為「主表總度數 − 區間內所有月份各房用電加總」，度數平均分攤給目前啟用中的房間，再各自依房間電價換算金額；公共電費一律落在區間結算月（`EndMonth`）的房客帳單，套用入口統一收在「電費計算」頁 |
| 繳費狀態 | 每筆帳單可標記已收/未收 |
| 複製圖片 | 整表／單一房間／僅電費相關欄位，皆可複製成圖片（`html2canvas` + 剪貼簿，不支援時自動改為下載 PNG），方便傳給房客對帳 |

> 目前資料庫設計已支援多個出租物件（`RENT.Property`），但前端尚未提供物件切換 UI，預設使用使用者名下第一筆物件。

> **手機版優化**：表格文字、頂部操作按鈕（重新整理／帶入公共電費／複製圖片等）均加大並改為兩欄等寬排列；房間設定的「儲存／退租」改為橫向並排的小按鈕，避免在窄螢幕上換行堆疊；表格改為單純橫向捲動（原本第一欄嘗試用 `position: sticky` 固定，但與 `html2canvas` 擷取圖片衝突，已移除）。
>
> **複製圖片穩定性**：整表／單一房間／僅電費相關欄位三種複製，皆改為另外組一份離屏、固定寬度、不放在可捲動容器內的靜態表格再交給 `html2canvas` 擷取（而非直接擷取畫面上會橫向捲動的即時表格），避免手機窄螢幕下內容寬度超出可視範圍造成擷取失敗或裁切。
>
> **公共電費為快照欄位**：`PublicElectricityFee` 的行為比照房租／電價／調整金額，建立當下寫入後，一般儲存不會再變動。已存檔的列在畫面上預設鎖定，要修改需按鎖頭解鎖或明確重新試算；重新試算會覆蓋已存檔金額，操作前會先跳出確認。設計目的是避免按「儲存本月帳單」時，把先前已確認的金額無聲蓋掉。
>
> **抄表日期落差不做對齊**：房間分表固定每月 15 日抄表，台電主表的抄表日不會與之對齊，期間一律以「月」為單位比較，不做日期層級的比例換算。因此公共度數算出負數時視為正常誤差，一律以 0 計（不倒扣房客）並在畫面提示；只有負得離譜（超過主表總度數）才會提示可能是期間或讀數填錯。

### 📈 交易日誌（Trading Journal）

| 功能 | 說明 |
|---|---|
| 交易紀錄 | 一筆代表一次已配對好的完整進場+出場交易；支援手動新增/編輯/刪除，也可由匯入資料自動產生 |
| 資料匯入 - cTrader Records | 匯入 IC Markets cTrader 平台匯出的「Records」報表（`.xlsx`），含時區轉換（`timezoneOffsetHours`，預設 UTC+8） |
| 資料匯入 - TradingView 訂單 | 匯入 TradingView 訂單明細（`.csv`），依時間/商品/方向/數量比對回填進場時間、進場價、出場價；並依訂單「種類」欄位判斷出場方式（停損/停利/手動） |
| 績效總覽 | 總損益、勝率、獲利因子、平均賺賠比、平均持倉時間等 KPI，資金曲線走勢圖 |
| 分類統計 | 依商品、策略標籤、出場方式分別統計筆數/總損益/勝率 |
| 隱含成本分析 | 用進出場價格＋方向反推毛損益，與實際淨損益比較算出隱含手續費/庫存費 |
| 滑價分析 | 停損/停利觸發價與實際成交價的差，隨匯入自動計算 |
| 策略標籤 | 下拉選單管理（新增/停用），交易紀錄可標記策略並填寫文字心得 |

> **手機版日期區間篩選**：頂端導覽列在窄螢幕上只保留一顆顯示目前區間的膠囊按鈕（例如「📅 08/01～08/10」），點擊後從導覽列下緣整寬展開面板，內含快捷區間（近7天／近30天／本月／今年／全部）、起訖日期與清除／套用。原本「區間 + 兩個日期輸入框 + 套用鈕」直接排在導覽列上，在手機寬度會擠成兩列並蓋住下方內容。桌機維持原本的單列排版。

> 交易資料無法用單一 Position ID 比對（cTrader 與 TradingView 是各自獨立的內部編號），改用商品＋數量＋時間相近度做配對，較不依賴特定券商格式。
>
> 隱含成本分析的合約乘數（每手對應商品單位數）目前僅 BTCUSD 經實際交易驗證為 1，其餘商品暫預設 1，可能不準確，介面會顯示提示文字。

---

## 技術架構

```
┌─────────────┐      HTTPS       ┌──────────────────────┐
│  瀏覽器      │ ───────────────▶ │   IIS (反向代理)       │
│ (前端頁面)   │                  │   + ASP.NET Core       │
└─────────────┘                  │   Module (ANCM)        │
                                  └──────────┬────────────┘
                                             │
                                  ┌──────────▼────────────┐
                                  │  ASP.NET Core Web API  │
                                  │  (.NET 10, Minimal API) │
                                  │  + Entity Framework Core│
                                  └──────────┬────────────┘
                                             │
                       ┌─────────────────────┼─────────────────────┐
                       ▼                     ▼                     ▼
              ┌────────────────┐   ┌──────────────────┐  ┌──────────────────┐
              │  SQL Server     │   │  Hangfire         │  │  Python (venv)    │
              │  (JazzerLife DB)│   │  (背景工作排程)     │  │  (由 C# 觸發執行)  │
              └────────────────┘   └──────────────────┘  └──────────────────┘
```

**前端**：純靜態 HTML + jQuery + [ag-Grid](https://www.ag-grid.com/)（表格）+ [Highcharts](https://www.highcharts.com/)（圖表）
**後端**：ASP.NET Core 10（Minimal API）+ Entity Framework Core
**資料庫**：SQL Server（Windows 整合式驗證 / SQL Server 驗證）
**背景工作**：Hangfire（觸發 Python 腳本執行耗時任務）
**身分驗證**：Cookie-based Session + BCrypt 密碼雜湊
**部署**：IIS + ASP.NET Core Hosting Bundle，HTTPS 憑證使用 Let's Encrypt（win-acme）

---

## 系統需求

- Windows 10/11 或 Windows Server（含 IIS）
- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)（開發/建置用）
- [ASP.NET Core Hosting Bundle](https://dotnet.microsoft.com/download/dotnet/10.0)（伺服器執行用，含 ANCM 模組）
- SQL Server（2019 以上，Developer 版供開發測試）
- Python 3.11+（供 Hangfire 觸發的背景任務使用，選用）

---

## 安裝與部署

### 1. 複製專案

```powershell
git clone <repo-url> JazzerLife
cd JazzerLife\JazzerLifeApi
```

### 2. 建立 `appsettings.json`

> ⚠️ 此檔案**不包含在版控內**（見 `.gitignore`），需自行建立，內含資料庫連線字串等機敏資訊。

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "JazzerLife": "Server=<你的SQL Server位址>;Database=JazzerLife;Trusted_Connection=True;TrustServerCertificate=True;"
  }
}
```

跨網段連線時，`Server` 建議使用 **IP 位址**而非主機名稱（主機名稱在不同子網域可能無法解析）。

### 3. 還原套件並建置

```powershell
dotnet restore
dotnet build
```

### 4. 資料庫權限設定

若使用 Windows 整合式驗證，IIS 應用程式集區的虛擬帳號需要先被 SQL Server 授權：

```sql
USE [master];
CREATE LOGIN [IIS APPPOOL\<你的應用程式集區名稱>] FROM WINDOWS;

USE [JazzerLife];
CREATE USER [IIS APPPOOL\<你的應用程式集區名稱>] FOR LOGIN [IIS APPPOOL\<你的應用程式集區名稱>];
ALTER ROLE db_datareader ADD MEMBER [IIS APPPOOL\<你的應用程式集區名稱>];
ALTER ROLE db_datawriter ADD MEMBER [IIS APPPOOL\<你的應用程式集區名稱>];
```

> 虛擬帳號需等應用程式集區**實際啟動執行過一次**，Windows 才會產生對應帳號，`CREATE LOGIN` 才找得到它。

### 5. 部署到 IIS

```powershell
# 若集區正在執行中，需先停用才能覆蓋檔案
Stop-WebAppPool -Name "<應用程式集區名稱>"

dotnet publish -c Release -o <IIS 網站實體路徑>

Start-WebAppPool -Name "<應用程式集區名稱>"
```

### 6. 驗證

```powershell
curl.exe http://localhost/api/vehicles
```

回傳 JSON 資料代表資料庫連線正常。

---

## 專案結構

```
JazzerLifeApi/
├── Models/                          # EF Core Scaffold 產生的資料模型
├── Endpoints/                       # 依功能模組拆分的 Minimal API endpoint
│   ├── ReportEndpoints.cs           # 安全報表查詢（限單一 SELECT）
│   ├── VehicleEndpoints.cs          # 車輛 CRUD
│   ├── FuelEndpoints.cs             # 油耗紀錄
│   ├── CycleEndpoints.cs            # 保養週期設定
│   ├── MaintenanceEndpoints.cs      # 保養紀錄
│   ├── PartCategoryEndpoints.cs     # 保養分類 CRUD
│   ├── DashboardEndpoints.cs        # 車輛 Dashboard 綜合查詢
│   ├── FinanceOverviewEndpoints.cs  # 財務總覽
│   ├── FinanceDetailEndpoints.cs    # 收支明細 + 分類分析
│   ├── FinanceProjectEndpoints.cs   # 財務專案列表
│   ├── FinanceProjectAssetEndpoints.cs     # 專案-資產流
│   ├── FinanceProjectCashflowEndpoints.cs  # 專案-現金流
│   ├── FinanceProjectExpectedEndpoints.cs  # 專案-預期資產變化
│   ├── FinanceBillEndpoints.cs      # 帳單管理
│   ├── FinanceAccountEndpoints.cs   # 存款帳戶總覽
│   ├── FinanceUploadEndpoints.cs    # CSV 資料上傳解析
│   ├── MacroIndicatorEndpoints.cs   # 總經指標清單/時序查詢
│   ├── MacroCompositeEndpoints.cs   # 總經綜合溫度計分數/燈號計算
│   ├── MacroAlertEndpoints.cs       # 總經示警規則 CRUD + 觸發紀錄
│   ├── MacroSignalHelper.cs         # 燈號/百分位計算共用邏輯
│   ├── RentPropertyEndpoints.cs     # 出租物件 CRUD
│   ├── RentRoomEndpoints.cs         # 房間設定 CRUD（含軟刪除/退租）
│   ├── RentBillEndpoints.cs         # 月度帳單查詢/批次儲存/繳費狀態切換
│   ├── RentMasterMeterEndpoints.cs  # 主表電費紀錄 CRUD + 公共電費試算邏輯
│   ├── TradeEndpoints.cs            # 交易紀錄 CRUD（含隱含成本計算 TradeCostCalculator）
│   ├── StrategyTagEndpoints.cs      # 策略標籤 CRUD（軟刪除）
│   ├── TradeImportEndpoints.cs      # cTrader Records / TradingView 訂單匯入解析
│   └── TradeAnalysisEndpoints.cs    # 交易績效統計/分類統計/隱含成本分析
├── wwwroot/                         # 靜態前端頁面
│   ├── car.html / assets/js/car.js         # 車輛管理前端
│   ├── finance.html / assets/js/finance.js # 財務管理前端
│   ├── macro.html / assets/js/macro.js     # 總經溫度計前端
│   ├── rent/rent.html / assets/js/rent.js  # 租屋處電費管理前端
│   ├── trading/trading.html / assets/js/trading.js # 交易日誌前端
│   └── signin.html / assets/js/signin.js   # 登入頁
├── Program.cs                       # 應用程式進入點，服務註冊、路由掛載
├── HangfireAuthFilter.cs            # Hangfire Dashboard 授權過濾器
├── PythonRunner.cs                  # 安全呼叫 Python 腳本的工具方法
├── EconDataSyncRunner.cs            # 總經資料同步（FRED/台灣官方）+ 示警評估
└── JazzerLifeApi.csproj
```

```
scripts/
├── fetch_fred.py           # 擷取 FRED（美國聯準會）指標
├── fetch_tw_gov.py         # 擷取台灣官方開放資料指標
├── fetch_yahoo.py          # 擷取 Yahoo Finance 市場資產指標（黃金/費半/台股，非官方API）
├── tw_gov_sources.json     # 台灣資料來源設定（url/欄位對應）
├── sql/                    # MACRO / RENT / TRADING schema 建立與追加異動腳本
└── test_task.py            # Hangfire 測試腳本
```

---

## API 一覽

### 身分驗證

| Method | 路徑 | 說明 |
|---|---|---|
| POST | `/api/auth/login` | 登入，成功後簽發 HttpOnly Cookie |
| POST | `/api/auth/logout` | 登出 |
| GET | `/api/auth/me` | 查詢目前登入狀態 |

### 車輛管理

| Method | 路徑 | 說明 |
|---|---|---|
| GET/POST/PUT/DELETE | `/api/vehicles` | 車輛 CRUD |
| GET | `/api/my-vehicles` | 查詢目前使用者的車輛清單 |
| GET/POST | `/api/vehicles/{id}/fuel` | 油耗紀錄查詢/新增 |
| GET | `/api/dashboard/{id}` | 車輛 Dashboard 綜合資料 |
| GET/POST/PUT/DELETE | `/api/vehicles/{id}/cycles` | 保養週期 CRUD |
| GET | `/api/vehicles/{id}/cycles/recommend` | 依歷史紀錄推薦保養週期（只納入分類為「例行」「保養」的紀錄） |
| GET/POST/DELETE | `/api/vehicles/{id}/maintenance` | 保養紀錄查詢/新增/刪除（可綁定分類 `CategoryId`） |
| GET | `/api/vehicles/{id}/maintenance/part-names` | 查詢曾用過的零件名稱（表單自動完成用） |
| GET | `/api/vehicles/{id}/latest-odometer` | 查詢目前已知最大里程（油耗+保養紀錄取大者，供表單預填/Dashboard 使用） |
| GET/POST/PUT/DELETE | `/api/part-categories` | 保養分類 CRUD（使用者層級共用，跨車輛；刪除時若分類已被保養紀錄使用中會擋下） |

### 財務管理

| Method | 路徑 | 說明 |
|---|---|---|
| GET | `/api/finance/overview` | 資產/現金流總覽 |
| GET/PUT | `/api/finance/details` | 收支明細查詢/批次編輯 |
| POST | `/api/finance/details/{id}/toggle-exclude` | 切換明細排除狀態 |
| GET | `/api/finance/category-analysis` | 分類分析 |
| GET/POST/PUT/DELETE | `/api/finance/projects` | 財務專案 CRUD |
| GET/PUT | `/api/finance/projects/{id}/assets` | 專案資產流綁定 |
| GET | `/api/finance/projects/{id}/assets/trend` | 淨資產趨勢 |
| GET/PUT | `/api/finance/projects/{id}/cashflow-rules` | 現金流關鍵字規則 |
| GET | `/api/finance/projects/{id}/cashflow-matches` | 現金流命中明細（`showExcluded` 篩選是否列出已排除列） |
| POST | `/api/finance/projects/{id}/cashflow-matches/{detailId}/toggle-exclude` | 切換單一明細在此專案的「專案層面排除」狀態 |
| GET | `/api/finance/projects/{id}/cashflow-monthly` | 每月實際收支彙總（供現金流趨勢圖，已扣除專案層面排除的明細） |
| GET/POST | `/api/finance/projects/{id}/expected` | 預期資產變化查詢/產生草稿 |
| GET/POST/PUT/DELETE | `/api/finance/bills` | 帳單管理 CRUD（`PUT`/`DELETE` 需帶 `{billId}`） |
| GET/PUT | `/api/finance/accounts` | 存款帳戶總覽/修改結餘 |
| POST | `/api/finance/upload-details` | CSV 資料上傳（明細/帳戶/庫存自動判斷）|

### 總體經濟溫度計

| Method | 路徑 | 說明 |
|---|---|---|
| GET | `/api/macro/indicators` | 指標矩陣（可用 `country` 篩選 TW/US）|
| GET | `/api/macro/indicators/{code}/series` | 單一指標歷史走勢（`months` 參數） |
| GET | `/api/macro/composite-score` | 綜合溫度計分數與燈號（`country` 必填） |
| GET/POST/PUT/DELETE | `/api/macro/alert-rules` | 示警規則 CRUD |
| GET | `/api/macro/alerts` | 示警觸發紀錄查詢（`unreadOnly` 篩選） |
| POST | `/api/macro/alerts/{id}/mark-read` | 標記示警紀錄已讀 |
| POST | `/api/tasks/run-macro-sync` | 手動觸發總經資料同步（另有 Hangfire 每日 06:00 排程） |

### 租屋處電費管理

| Method | 路徑 | 說明 |
|---|---|---|
| GET/POST/PUT | `/api/rent/properties` | 出租物件查詢/新增/更新 |
| GET/POST/PUT | `/api/rent/rooms` | 房間設定查詢（`includeInactive` 篩選）/新增/更新（含退租） |
| GET/POST | `/api/rent/bills` | 查詢某物件某月帳單／批次儲存。草稿列的公共電費一律回 0（由前端顯示「待試算」，不自動帶入試算值）；儲存時 `PublicElectricityFee` 可為 `null`，代表維持資料庫既有快照 |
| POST | `/api/rent/bills/{id}/toggle-paid` | 切換已收/未收款狀態 |
| GET/POST/DELETE | `/api/rent/master-meter` | 主表（母表）電費紀錄查詢/新增更新（依 `PropertyId + EndMonth` upsert，儲存時檢查期間是否與既有紀錄重疊）/刪除 |
| GET | `/api/rent/public-electricity-estimate` | 試算公共電費，以 `EndMonth` 對應電費月；回傳含涵蓋期間、逐月各房用電明細與負數差額標記（`currentMonthUsage` 選填，優先採用前端即時輸入值） |

### 交易日誌

| Method | 路徑 | 說明 |
|---|---|---|
| GET/POST/PUT/DELETE | `/api/trading/trades` | 交易紀錄 CRUD（支援依商品/來源/策略標籤/待檢查篩選） |
| GET/POST/PUT/DELETE | `/api/trading/strategy-tags` | 策略標籤 CRUD（軟刪除，使用中標籤禁止刪除） |
| POST | `/api/trading/import/ctrader-records` | 匯入 cTrader Records（`.xlsx`），`timezoneOffsetHours` 選填（預設 8） |
| POST | `/api/trading/import/tradingview-orders` | 匯入 TradingView 訂單（`.csv`），比對回填進場時間/價格/出場方式/滑價，`toleranceMinutes` 選填（預設 10） |
| GET | `/api/trading/analysis/summary` | 績效總覽 KPI（總損益/勝率/獲利因子/平均賺賠比/平均持倉時間） |
| GET | `/api/trading/analysis/equity-curve` | 資金曲線（累積損益走勢） |
| GET | `/api/trading/analysis/by-symbol` | 依商品分類統計 |
| GET | `/api/trading/analysis/by-tag` | 依策略標籤分類統計 |
| GET | `/api/trading/analysis/by-exit-reason` | 依出場方式（停損/停利/手動/未知）分類統計 |
| GET | `/api/trading/analysis/cost-summary` | 隱含成本分析（毛損益 vs 淨損益）＋平均滑價 |

### 報表工具

| Method | 路徑 | 說明 |
|---|---|---|
| POST | `/api/reports/query` | 安全的自訂 SELECT 查詢（僅限單一查詢，關鍵字黑名單防護）|

---

## 安全性設計

- **身分驗證**：Cookie-based Session（HttpOnly + Secure + SameSite=Lax），密碼以 BCrypt 雜湊儲存。
- **參數化查詢**：所有資料存取皆透過 Entity Framework Core 或 `ExecuteSqlInterpolatedAsync` 參數化插值，杜絕 SQL Injection。
- **權限檢查**：每個涉及使用者資料的 API 都會先驗證登入身分（`ClaimsPrincipal`），並確認資源（車輛/專案/明細）確實屬於該使用者，防止跨帳號存取。
- **報表查詢分層防護**：`/api/reports/query` 僅允許單一 `SELECT` 語句、關鍵字黑名單（拒絕 `INSERT`/`UPDATE`/`DELETE`/`DROP` 等）、查詢筆數上限、逾時限制。
- **Python 執行安全**：`PythonRunner` 固定寫死執行檔路徑與腳本路徑，參數一律以陣列傳遞（不經過 shell 字串拼接），並設定執行逾時強制終止，避免程序卡死或指令注入。
- **敏感設定隔離**：`appsettings.json` 不納入版控，資料庫連線字串等機敏資訊由各部署環境自行維護。

---

## 開發工作流程

本專案採單一 `main` 分支開發模式：

```powershell
# 開發/測試環境
git pull
dotnet build
Stop-WebAppPool -Name "<測試環境集區名稱>"
dotnet publish -c Release -o <測試環境輸出路徑>
Start-WebAppPool -Name "<測試環境集區名稱>"

# 確認測試環境驗證無誤後，於正式環境執行
git pull
Stop-WebAppPool -Name "<正式環境集區名稱>"
dotnet publish -c Release -o <正式環境輸出路徑>
Start-WebAppPool -Name "<正式環境集區名稱>"
```

> 因多台機器共用同一分支，動工前建議先 `git pull`，完成並驗證後盡快 `git push`，避免長時間佔用同一檔案造成衝突。

---

## 已知限制

- SQL Server 若使用 Developer 版，授權條款僅限開發/測試用途，正式環境長期使用需評估授權合規性。
- Windows 用戶端作業系統（非 Server 版）的 IIS 有同時連線數上限，不適合高流量對外服務。
- 跨網段部署時，Windows 整合式驗證的應用程式集區虛擬帳號無法被遠端 SQL Server 辨識，需改用 SQL Server 驗證帳號密碼。
- 部分歷史功能（投資組合、退休/貸款試算）因不再使用已從前端移除，相關資料表仍保留於資料庫但無對應 UI。
- 台灣官方開放資料多數缺乏穩定的固定下載 API，`scripts/tw_gov_sources.json` 目前完成失業率／CPI年增率／PPI年增率／GDP成長率共 4 項，其餘 3 項（核心CPI、景氣對策信號燈、外銷訂單）需人工確認來源網址（或擴充腳本支援 ZIP 格式）後補上。
- FRED API 需自行申請免費 API Key 並填入 `appsettings.json` 的 `FredApiKey`，否則 `/api/tasks/run-macro-sync` 會略過美國指標同步（不會報錯，僅記錄警告 log）。
- Yahoo Finance Chart API（`fetch_yahoo.py` 使用）為非官方公開端點，無 API Key 也無官方 SLA，長期穩定性未知，若持續失敗需評估改用付費/官方資料源替代。
- IIS 部署時，若 `PythonExePath` 指向個人使用者的 AppData 路徑，App Pool 虛擬帳號預設無權限存取，需另外用 `icacls` 授權（詳見 `JazzerLife_環境設定文件.md` 第六節）。
- 租屋處電費管理的「公共電費」需使用者持續在「公共電費」頁籤登記主表讀數與涵蓋期間；未登記時「帶入公共電費」按鈕會停用並提示前往登記（不再靜默以 0 帶入）。
- 公共電費採「度數平均分攤 × 各房約定電價」，主表的**總電費金額不進入計算**（僅供對照平均電價），因此向房客收取的公共電費總額與台電實際帳單金額會有落差（各房約定電價與實際均價的差額由房東吸收或多收）。這是已知取捨；若日後希望兩者對齊，需改為「金額分攤」（公共電費總額 = 主表總金額 − Σ 各房自身電費）。
- 公共電費的分攤分母採「目前啟用中的房間數」，期間內若有房間退租／新入住會與實際居住狀況有落差（已退租房間在期間內的用電仍會被扣除，只是不分攤公共部分）。
- 租屋處電費管理目前僅支援使用者名下第一筆出租物件的前端切換 UI，資料庫已可支援多物件，未來如需擴充多物件切換僅需前端調整。
- 交易日誌的隱含成本分析（毛損益 vs 淨損益反推手續費/庫存費）依賴每個商品的合約乘數，目前僅 BTCUSD 經實際交易驗證為 1，其餘商品暫預設 1，可能不準確；累積更多商品實際交易資料後可擴充 `TradeEndpoints.cs` 內的 `TradeCostCalculator.ContractMultipliers` 對照表。
- 交易日誌的 cTrader Records 與 TradingView 訂單並非以共同 ID 比對（兩個平台的內部編號互不相通），改用商品＋數量＋時間相近度配對，若同時間有多筆相同商品/數量的交易可能配對錯誤，建議搭配「待檢查」標記人工複核。

---

## 授權

本專案為個人使用之生活管理系統，非公開商業產品。
