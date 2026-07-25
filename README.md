# JazzerLife

個人生活管理系統，整合**車輛管理**與**財務管理**兩大功能模組，透過 ASP.NET Core Web API 提供服務，前端為純 HTML + jQuery + ag-Grid + Highcharts 打造的儀表板介面。

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
| 油耗紀錄 | 記錄加油量、里程、單價，自動計算行駛距離與油耗效率，趨勢圖表（週/月/年）|
| 車輛管理 | 新增/編輯/刪除車輛基本資料 |
| 保養週期設定 | 依里程或時間週期設定保養提醒，並依歷史紀錄自動推算建議週期 |
| 保養紀錄 | 記錄保養項目、花費、里程、店家，KPI 統計 |

響應式設計：桌面顯示側邊欄導航，手機（≤767px）自動切換為底部固定導覽列。

### 💰 財務管理（Finance）

| 功能 | 說明 |
|---|---|
| 總覽 | 資產走勢、現金流走勢，含月對月/年對年比較 |
| 收支明細 | 總收支/收入/支出明細查詢，支援關鍵字搜尋、月份篩選、行內編輯、排除（軟刪除）|
| 分類分析 | 依收入/支出、月/年粒度做分類統計，支援下鑽查看單筆明細 |
| 專案管理 | 財務專案追蹤，包含三個獨立子系統： |
| ├─ 資產流 | 追蹤專案綁定資產的**實際淨資產變化**，確認資產是否穩定成長 |
| ├─ 現金流 | 用關鍵字規則比對交易明細，追蹤專案的**每月實際收支** |
| └─ 預期資產變化 | 以「建立專案時設定的預算」為期初資產，依年化流入/流出率推算，驗證財務規劃假設是否如預期 |
| 帳單管理 | 週期性帳單登記，依頻率規則（週/月/年）自動展開全年支出預測 |
| 資料上傳 | 上傳銀行匯出的 CSV 檔案，自動依欄位特徵判斷為收支明細/帳戶餘額/股票庫存並寫入資料庫 |
| 存款帳戶總覽 | 依月份查看各帳戶餘額快照，支援手動修改結餘 |

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
│   ├── DashboardEndpoints.cs        # 車輛 Dashboard 綜合查詢
│   ├── FinanceOverviewEndpoints.cs  # 財務總覽
│   ├── FinanceDetailEndpoints.cs    # 收支明細 + 分類分析
│   ├── FinanceProjectEndpoints.cs   # 財務專案列表
│   ├── FinanceProjectAssetEndpoints.cs     # 專案-資產流
│   ├── FinanceProjectCashflowEndpoints.cs  # 專案-現金流
│   ├── FinanceProjectExpectedEndpoints.cs  # 專案-預期資產變化
│   ├── FinanceBillEndpoints.cs      # 帳單管理
│   ├── FinanceAccountEndpoints.cs   # 存款帳戶總覽
│   └── FinanceUploadEndpoints.cs    # CSV 資料上傳解析
├── wwwroot/                         # 靜態前端頁面
│   ├── car.html / assets/js/car.js         # 車輛管理前端
│   ├── finance.html / assets/js/finance.js # 財務管理前端
│   └── signin.html / assets/js/signin.js   # 登入頁
├── Program.cs                       # 應用程式進入點，服務註冊、路由掛載
├── HangfireAuthFilter.cs            # Hangfire Dashboard 授權過濾器
├── PythonRunner.cs                  # 安全呼叫 Python 腳本的工具方法
└── JazzerLifeApi.csproj
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
| GET | `/api/vehicles/{id}/cycles/recommend` | 依歷史紀錄推薦保養週期 |
| GET/POST/DELETE | `/api/vehicles/{id}/maintenance` | 保養紀錄查詢/新增/刪除 |

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
| GET | `/api/finance/projects/{id}/cashflow-matches` | 現金流命中明細 |
| GET/POST | `/api/finance/projects/{id}/expected` | 預期資產變化查詢/產生草稿 |
| GET/POST | `/api/finance/bills` | 帳單管理 |
| GET/PUT | `/api/finance/accounts` | 存款帳戶總覽/修改結餘 |
| POST | `/api/finance/upload-details` | CSV 資料上傳（明細/帳戶/庫存自動判斷）|

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

---

## 授權

本專案為個人使用之生活管理系統，非公開商業產品。
