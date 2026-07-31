# JazzerLife 環境設定文件

**最後更新：** 2026 年 7 月 31 日（v10：Finance 模組多項調整 — 分類分析/總覽卡片 UI 精簡、專案摘要列表達成率改以「預期資產 vs 實際資產」計算、帳單管理新增編輯/刪除（`FIN.Bill` 補上 `BillID` 主鍵）、專案現金流命中明細新增「專案層面排除」機制，含 2 支新 SQL 腳本部署方式）
**歷史版本：**
- v9（2026 年 7 月 30 日）：新增交易日誌模組 — cTrader Records + TradingView 訂單匯入分析，含出場方式分類/隱含成本/滑價分析，含 TRADING schema 部署方式
- v8（2026 年 7 月 29 日）：租屋處電費管理模組複製圖片穩定性修正 — 整表/單一房間/電費明細三種複製皆改為離屏靜態表格擷取，並移除與 html2canvas 衝突的 sticky 房間欄位
- v7（2026 年 7 月 29 日）：租屋處電費管理模組手機版 UI 優化 — 表格加大、操作按鈕排版調整（原同時嘗試的 sticky 房間欄位固定，已於 v8 移除）
- v6（2026 年 7 月 28 日）：新增租屋處電費管理模組 — 房間房租/電費計算、公共電費雙月抄表試算，含 RENT schema 部署方式
**用途：** 記錄伺服器、IIS、資料庫、部署流程與已知眉角，供之後接續開發或交接使用。

---

## 一、主機環境

### 正式機

| 項目 | 內容 |
|---|---|
| 主機名稱 | DESKTOP-E4G7MO5 |
| 作業系統 | Windows 10 Home (10.0.19045) |
| 內網 IP | 192.168.1.101 |
| 對外域名 | jzshome.ddns.net（DDNS） |
| 使用規模 | 約 2 位使用者，對外公開 |

### 測試機（新增）

| 項目 | 內容 |
|---|---|
| 電腦名稱 | KAZUO |
| 作業系統 | Windows 11（Build 26200） |
| 專案路徑 | `E:\Project\JazzerLifes\JazzerLifeApi` |
| 發布輸出路徑 | `E:\WebApplication\JazzerLifeTest` |
| 網站/測試埠 | `http://localhost:8080` |
| 與正式機關係 | 同內網、**不同子網域**；連線資料庫需用 IP，主機名稱無法解析 |

**已知風險（決策已確認接受，供未來檢討參考）：**
- Windows 10 的 IIS 有同時連線數上限（約 10），非授權允許的正式對外主機環境；若使用量成長需評估遷移至 Windows Server。
- SQL Server 版本為 Developer 版，授權條款僅限開發/測試用途，正式環境使用有授權風險。

---

## 二、IIS 設定

### 2.1 網站

| 網站名稱 | 主機 | 實體路徑 | 繫結 | 說明 |
|---|---|---|---|---|
| JazzerLifes | 正式機 | `C:\inetpub\JazzerLife` | 80 / 443 (jzshome.ddns.net) | 主要正式環境 ASP.NET Core 網站 |
| JazzerLife（舊） | 正式機 | `C:\xampp\htdocs\JazzerLife` | 3001 | XAMPP/PHP 舊網站，與新專案無關 |
| StockProphet_Project | 正式機 | `C:\StockProphet_Project` | — | 另一個既有專案，與本次架構無關 |
| JazzerLifeTest | 測試機 | `E:\WebApplication\JazzerLifeTest` | 8080 | 測試環境，接正式機資料庫 |

**注意事項：**
- 網站命名容易混淆（JazzerLife 與 JazzerLifes），操作前務必用 `Get-Website` 確認實體路徑。
- 正式機應用程式集區名稱：`JazzerLifeAppPool`；測試機為 `JazzerLifeTestPool`。兩者都設為「沒有 Managed 程式碼」。
- 正式機應用程式集區身分：預設 ApplicationPoolIdentity（虛擬帳號 `IIS APPPOOL\JazzerLifeAppPool`）。
- **測試機因跨子網域，虛擬帳號的 Windows 整合式驗證無法跨機器辨識**，改用 SQL Server 驗證（詳見第三節）。

### 2.2 已安裝元件（兩台機器皆需要）

| 元件 | 版本 / 說明 |
|---|---|
| .NET SDK | 正式機：8.0.202 + 10.0.302；測試機：多版本並存（6.0/8.0/9.0/10.0），供建置用 |
| ASP.NET Core Hosting Bundle | .NET 10 LTS（含 ANCM v2 模組，供 IIS 執行 ASP.NET Core 用） |
| Python | 3.11.8（僅正式機需要，供 C# 以 Process 呼叫） |

> **重要觀念：** Hosting Bundle 僅包含 Runtime（給 IIS 執行用），不含 SDK（給開發/建置用），兩者需分開安裝。

### 2.3 HTTPS 憑證（僅正式機）

- 憑證來源：Let's Encrypt，透過 win-acme（wacs.exe）申請與自動續約。
- 自動續約排程：Windows 工作排程器（win-acme 安裝時自動建立），效期 90 天，需確認排程持續有效。
- 待辦：申請時不慎跳過通知信箱設定，尚未補回，之後執行 `wacs.exe --register --emailaddress` 補上。
- 測試技巧：因憑證綁定域名（SNI），用 IP 或 localhost 直接測試會連線失敗；本機測試建議用 `curl --resolve 網域:443:內網IP` 方式，不要修改 hosts 檔案（容易忘記還原）。

---

## 三、資料庫

| 項目 | 內容 |
|---|---|
| 資料庫產品 | SQL Server 2022 Developer（16.0.1000.6） |
| 主機 | DESKTOP-E4G7MO5（與正式機 IIS 同機） |
| 資料庫名稱 | JazzerLife |
| 主要 Schema | CarMan、FIN、MEM、MACRO、RENT |
| 正式機驗證方式 | Windows 整合式驗證（Trusted_Connection），帳號 `IIS APPPOOL\JazzerLifeAppPool` |
| **測試機驗證方式** | **SQL Server 驗證**，帳號 `kazuo`（因跨子網域，Windows 整合式驗證的虛擬帳號無法被正式機 SQL Server 辨識） |
| 帳號權限 | db_datareader、db_datawriter（無 db_owner） |

> **MACRO schema（總體經濟溫度計模組）部署方式：** `CarMan`/`FIN`/`MEM` 三個 schema 是原始資料庫既有結構，`MACRO` 為新增模組，需在部署前於 SSMS 對 JazzerLife 資料庫依序手動執行：
> 1. `scripts/sql/macro_schema.sql`（建表 + 15 項基礎種子指標）
> 2. `scripts/sql/macro_schema_add_indicators_2026-07-26.sql`（追加 4 項美國指標：10Y-2Y利差/VIX/核心PCE/消費者信心指數）
> 3. `scripts/sql/macro_schema_add_market_2026-07-26.sql`（追加 5 項市場資產指標：黃金/比特幣/SP500/費半/台股）
>
> 三支皆內含 `IF NOT EXISTS` 防呆、可重複執行。結構備份分別存於 `db_backup/macro_schema_backup_2026-07-26.md`、`macro_schema_add_indicators_backup_2026-07-26.md`。正式區完整部署檢查清單另見 `總經模組_正式區部署備註.md`。

> **RENT schema（租屋處電費管理模組）部署方式：** 需在部署前於 SSMS 對 JazzerLife 資料庫依序手動執行：
> 1. `scripts/sql/rent_schema.sql`（建立 RENT schema，共 3 張表：`Property`／`Room`／`RoomBill`）
> 2. `scripts/sql/rent_schema_add_public_electricity_2026-07-27.sql`（`RoomBill` 新增 `PublicElectricityFee` 欄位；新增 `MasterMeterReading` 表，供公共電費試算用）
>
> 兩支皆內含 `IF NOT EXISTS` 防呆、可重複執行，且第 2 支依賴第 1 支已先執行過。結構備份分別存於 `db_backup/rent_schema_backup_2026-07-27.md`、`db_backup/rent_schema_add_public_electricity_backup_2026-07-27.md`。**測試機與正式機目前皆尚未執行**，部署前務必先於 SSMS 手動跑過這兩支腳本，否則 `/api/rent/*` 系列 API 會全部失敗。

> **TRADING schema（交易日誌模組，新增）部署方式：** 需在部署前於 SSMS 對 JazzerLife 資料庫依序手動執行：
> 1. `scripts/sql/trading_schema.sql`（建立 TRADING schema，共 2 張表：`StrategyTag`／`Trade`）
> 2. `scripts/sql/trading_schema_add_ctrader_records_2026-07-30.sql`（`EntryTime` 改為可為 NULL，新增 cTrader Records 匯入用的自然鍵唯一索引）
> 3. `scripts/sql/trading_schema_add_exit_quality_2026-07-30.sql`（`Trade` 新增 `ExitReason`、`ExitSlippage` 欄位，供出場方式分類與滑價分析）
>
> 三支皆內含 `IF NOT EXISTS` 防呆、可重複執行，且依序有相依關係（第 2、3 支皆假設第 1 支已先執行過）。結構備份分別存於 `db_backup/trading_schema_backup_2026-07-30.md`、`db_backup/trading_schema_add_ctrader_records_backup_2026-07-30.md`、`db_backup/trading_schema_remove_position_history_import_2026-07-30.md`、`db_backup/trading_schema_add_exit_quality_backup_2026-07-30.md`。**測試機與正式機目前皆尚未執行**，部署前務必先於 SSMS 手動跑過這三支腳本，否則 `/api/trading/*` 系列 API 會全部失敗。另需 `dotnet restore` 還原新增的 ClosedXML 套件（供解析 cTrader `.xlsx` 匯出檔）。

> **FIN schema 異動（2026-07-31，帳單管理 BillID + 專案現金流排除）部署方式：** 需在部署前於 SSMS 對 JazzerLife 資料庫依序手動執行：
> 1. `scripts/sql/finance_bill_add_id_2026-07-31.sql`（`FIN.Bill` 原本 `HasNoKey()`，新增 `BillID INT IDENTITY(1,1)` 並設為主鍵，既有資料列由 SQL Server 自動依序補號，才能支援單一帳單的編輯/刪除）
> 2. `scripts/sql/finance_project_cashflow_exclusion_2026-07-31.sql`（新增 `FIN.ProjectCashflowExclusion` 表，記錄「這筆明細在這個專案被手動排除」，供專案現金流命中明細的「專案層面排除」功能使用，不影響 `Detail.IsExcluded` 或其他專案）
>
> 兩支皆內含 `IF NOT EXISTS` 防呆、可重複執行，彼此互不相依。結構備份分別存於 `db_backup/finance_bill_add_id_backup_2026-07-31.md`、`db_backup/finance_project_cashflow_exclusion_backup_2026-07-31.md`。**測試機與正式機目前皆尚未執行**，部署前務必先於 SSMS 手動跑過這兩支腳本，否則 `GET/PUT/DELETE /api/finance/bills*`、`GET/POST /api/finance/projects/{id}/cashflow-matches*` 系列 API 會全部失敗（EF 查不到 `BillID`／`ProjectCashflowExclusion` 資料表）。

### 正式機連線字串

```
Server=DESKTOP-E4G7MO5;Database=JazzerLife;Trusted_Connection=True;TrustServerCertificate=True;
```

### 測試機連線字串（重點：必須用 IP，不能用主機名稱）

```
Server=192.168.1.101\DESKTOP-E4G7MO5,1433;Database=JazzerLife;User Id=kazuo;Password=<kazuo密碼>;TrustServerCertificate=True;
```

> **關鍵眉角：** 測試機（KAZUO）與正式機（DESKTOP-E4G7MO5）在同一內網但不同子網域，`Test-NetConnection -ComputerName DESKTOP-E4G7MO5` 會出現 `Name resolution failed`（主機名稱無法解析）。改用 IP 位址 `192.168.1.101` 即可正常連線。若之後正式機更換 IP，測試機連線字串需要同步更新。

### 正式機建立登入與授權 SQL（虛擬帳號需等應用程式集區啟動過一次才會存在）

```sql
USE [master];
CREATE LOGIN [IIS APPPOOL\JazzerLifeAppPool] FROM WINDOWS;

USE [JazzerLife];
CREATE USER [IIS APPPOOL\JazzerLifeAppPool] FOR LOGIN [IIS APPPOOL\JazzerLifeAppPool];
ALTER ROLE db_datareader ADD MEMBER [IIS APPPOOL\JazzerLifeAppPool];
ALTER ROLE db_datawriter ADD MEMBER [IIS APPPOOL\JazzerLifeAppPool];
```

### 正式機 SQL Server 驗證模式

已確認設定為「**SQL Server 及 Windows 驗證模式**」（混合模式），測試機用 `kazuo` 帳號可正常登入。

---

## 四、Git / GitHub 版控

| 項目 | 內容 |
|---|---|
| 儲存庫可見性 | 公開 Repo（免費） |
| 分支策略 | 單一 `main` 分支，正式機與測試機皆直接使用，不使用 feature branch |
| Clone 路徑（測試機） | `E:\Project\JazzerLifes\JazzerLifeApi`（clone 上層 `JazzerLife` 目錄，讓 `scripts` 資料夾一併納入版控） |
| Clone 路徑（正式機） | `C:\Users\ServerDeployArea\JazzerLife` |

### 重要：`appsettings.json` 不進版控

- `appsettings.json`、`appsettings.Development.json` 已加入 `.gitignore`，**不會**被 Git 追蹤或推送到 GitHub。
- 原因：內含資料庫連線字串（伺服器名稱、資料庫名稱），公開 Repo 不適合曝露。
- **已知取捨**：過去的 Git 歷史紀錄中仍留有這兩個檔案的舊版本內容（未執行歷史清除），因專案目前無外部關注者，此風險已知並接受。
- **後果**：每台機器（正式機、測試機）都需要**手動維護自己的一份** `appsettings.json`，不會因為 `git pull` 自動更新或同步。兩邊連線字串目前**不同**（正式機用 Windows 整合式驗證，測試機用 SQL Server 驗證 + IP）。

### 正式機 `.gitignore` 排除清單（節錄）

```
JazzerLifeApi/appsettings.json
JazzerLifeApi/appsettings.Development.json
```

### 日常工作流程

**測試機（開發/驗證新功能）：**

```powershell
cd E:\Project\JazzerLifes\JazzerLifeApi
git pull
dotnet build
Stop-WebAppPool -Name "JazzerLifeTestPool"
dotnet publish -c Release -o E:\WebApplication\JazzerLifeTest
Start-WebAppPool -Name "JazzerLifeTestPool"
```

**正式機（確認測試機驗證無誤後才部署）：**

```powershell
cd C:\Users\ServerDeployArea\JazzerLife\JazzerLifeApi
git pull
Stop-WebAppPool -Name "JazzerLifeAppPool"
dotnet publish -c Release -o C:\inetpub\JazzerLife
Start-WebAppPool -Name "JazzerLifeAppPool"
```

> 因兩台機器共用同一個 `main` 分支，避免同時在兩邊修改同一檔案造成衝突；建議動工前先 `git pull`，完成並驗證後立即 `git push`。

### Git 使用注意事項

- 若跨使用者操作同一個 clone 資料夾，可能出現 `detected dubious ownership` 錯誤，需執行：
  ```powershell
  git config --global --add safe.directory <資料夾路徑>
  ```

---

## 五、ASP.NET Core 專案（JazzerLifeApi）

| 項目 | 正式機 | 測試機 |
|---|---|---|
| 專案路徑 | `C:\Users\ServerDeployArea\JazzerLife\JazzerLifeApi` | `E:\Project\JazzerLifes\JazzerLifeApi` |
| 發布輸出路徑 | `C:\inetpub\JazzerLife` | `E:\WebApplication\JazzerLifeTest` |
| 目標框架 | net10.0 | net10.0 |
| 專案類型 | ASP.NET Core Web API | 同左 |
| 資料存取 | Entity Framework Core（由既有 JazzerLife 資料庫 Scaffold 產生 Model） | 同左 |

### 登入 Cookie 與 HTTPS 的眉角

- `Program.cs` 的登入 Cookie 預設 `SecurePolicy = Always`（只允許 HTTPS 才會傳送 Cookie），正式機有 HTTPS 沒問題，但**測試機（KAZUO）只有 HTTP:8080，會導致登入後 Cookie 傳不回來、一直被當成未登入**。
- 已改成從設定讀取：`builder.Configuration.GetValue<bool>("Auth:RequireHttpsCookie", true)`，預設 `true`（維持正式機安全性，不用改正式機的 appsettings.json）。
- **測試機的 `appsettings.json` 需要加上：**
  ```json
  "Auth": { "RequireHttpsCookie": false }
  ```
  才能在 HTTP 環境下正常登入。這個設定不進版控，換新測試機或重建 appsettings.json 時容易忘記，要記得補上。

### 專案結構（節錄）

```
JazzerLifeApi/
├── Models/                          (EF Core Scaffold 產生)
├── Endpoints/
│   ├── ReportEndpoints.cs           (安全報表查詢 API)
│   ├── VehicleEndpoints.cs
│   ├── FuelEndpoints.cs
│   ├── CycleEndpoints.cs
│   ├── MaintenanceEndpoints.cs
│   ├── DashboardEndpoints.cs
│   ├── FinanceOverviewEndpoints.cs
│   ├── FinanceDetailEndpoints.cs
│   ├── FinanceProjectEndpoints.cs
│   ├── FinanceProjectAssetEndpoints.cs
│   ├── FinanceProjectCashflowEndpoints.cs
│   ├── FinanceProjectExpectedEndpoints.cs
│   ├── FinanceBillEndpoints.cs
│   ├── FinanceAccountEndpoints.cs
│   └── FinanceUploadEndpoints.cs
├── Program.cs
├── HangfireAuthFilter.cs            (Hangfire Dashboard 授權)
├── PythonRunner.cs                  (安全呼叫 Python 的工具方法)
├── appsettings.json                 (⚠️ 不進版控，需各機器手動維護)
└── JazzerLifeApi.csproj
```

### 重要指令

**Scaffold（如需重新產生 Model，於正式機執行）：**

```powershell
dotnet ef dbcontext scaffold "Server=DESKTOP-E4G7MO5;Database=JazzerLife;Trusted_Connection=True;TrustServerCertificate=True;" Microsoft.EntityFrameworkCore.SqlServer -o Models --context JazzerLifeContext
```

**標準部署流程（若應用程式集區正在執行中，publish 會因檔案鎖定失敗，需先停用）：**

```powershell
Stop-WebAppPool -Name "<集區名稱>"
dotnet publish -c Release -o <輸出路徑>
Start-WebAppPool -Name "<集區名稱>"
```

---

## 六、Hangfire（背景工作 / Python 觸發，僅正式機）

| 項目 | 內容 |
|---|---|
| 套件 | Hangfire.AspNetCore、Hangfire.SqlServer |
| 儲存 | 使用 JazzerLife 資料庫（自動建立 HangFire.* 系列資料表） |
| Dashboard 路徑 | `/hangfire` |
| Dashboard 授權 | 自訂 HangfireAuthFilter，允許 loopback 與 192.168.x.x 網段 |

觸發流程：使用者 API → `BackgroundJob.Enqueue`（立即回應，不等待）→ Hangfire Server 背景執行 → PythonRunner 以 `Process.Start` 呼叫 python.exe → 結果可於 Dashboard 追蹤。

**Python 環境（原為虛擬環境，2026-07-26 起路徑改為可設定化，兩台機器各自維護）：**

```
正式機（預設值，PythonRunner.cs 內建 fallback，appsettings.json 未設定時自動套用）：
  腳本路徑：C:\Users\ServerDeployArea\JazzerLife\scripts\
  呼叫用 python.exe：C:\Users\ServerDeployArea\JazzerLife\scripts\venv\Scripts\python.exe（venv）

測試機（KAZUO，appsettings.json 自行設定，因 venv 是從別台機器複製過來的失效產物）：
  ScriptsRoot：E:\Project\JazzerLifes\scripts\
  PythonExePath：C:\Users\wryi6\AppData\Local\Programs\Python\Python313\python.exe（系統 Python，繞過失效的 venv）
```

- `PythonRunner.Configure(scriptsRoot, pythonExePathOverride)` 於 `Program.cs` 啟動時讀取 `appsettings.json` 的 `ScriptsRoot`／`PythonExePath` 兩個獨立設定值，兩者互不影響：`ScriptsRoot` 決定去哪裡找 `.py` 腳本檔案，`PythonExePath` 決定用哪個直譯器執行。皆為選填，未設定時退回上方正式機的舊硬編碼路徑，不影響既有正式機運作。
- 若某台機器的 Python 腳本只用標準函式庫（目前 `fetch_fred.py`／`fetch_tw_gov.py`／`fetch_yahoo.py` 皆是），其實不需要 venv，可直接用 `PythonExePath` 指向系統 Python，這是測試機採用的做法。

**⚠️ IIS App Pool 權限眉角（2026-07-26 除錯發現，之後任何機器只要改用非預設 `PythonExePath` 都可能踩到）：**

- **症狀**：Hangfire job 顯示「Succeeded」，但 Duration 只有個位數~數十毫秒（正常應有實際 HTTP 連線的秒級時間），`/api/macro/indicators` 查詢仍全部是 null。IIS 底下預設看不到 Console/ILogger 輸出，很難察覺問題。
- **除錯技巧**：暫時 `Stop-WebAppPool`，改用 `dotnet <發布輸出資料夾>\JazzerLifeApi.dll --urls http://localhost:5099` 直接在主控台跑，這樣才看得到即時的 EF Core SQL log 與例外訊息。
- **根因**：IIS App Pool 身分（預設 `IIS AppPool\<PoolName>` 虛擬帳號）對 `PythonExePath` 指向的 python.exe 所在資料夾、以及 `ScriptsRoot` 資料夾，沒有讀取＋執行權限。**個人使用者的 AppData 路徑格外容易中招**，因為 App Pool 虛擬帳號完全碰不到別人的使用者設定檔目錄。
- **修法**：
  ```powershell
  Import-Module WebAdministration
  Get-ItemProperty "IIS:\AppPools\<PoolName>" -Name processModel.identityType   # 先確認身分

  icacls "<PythonExePath 所在資料夾>" /grant "IIS AppPool\<PoolName>:(OI)(CI)RX" /T
  icacls "<ScriptsRoot 資料夾>" /grant "IIS AppPool\<PoolName>:(OI)(CI)RX" /T
  ```
- 正式機若沿用預設的 `C:\Users\ServerDeployArea\JazzerLife\scripts\venv\Scripts\python.exe`（本來就是給 IIS 用的固定服務帳號路徑），理論上不會踩到這個問題；此提醒主要留給日後任何機器改用個人化 `PythonExePath` 的情境。

**PythonRunner 安全設計重點：**
- FileName 與腳本路徑固定寫死，不由外部輸入決定；參數一律用 `ArgumentList` 陣列傳遞，不做字串拼接、不經過 shell。
- 設定執行逾時（目前 30~60 秒依腳本而定）並於逾時強制 `Kill()`，避免程序卡死佔用資源。
- 重新導向 StandardOutput / StandardError，執行結果與錯誤皆可回收處理。

**待決策：** Python 腳本存放位置（與 JazzerLifeApi 專案平行、不在其內）是否維持，使用者仍在考慮中。

**總經資料同步排程（RecurringJob）：**

| 項目 | 內容 |
|---|---|
| Job ID | `macro-daily-sync` |
| 排程 | 每日 06:00（`Cron.Daily(6)`），於 `Program.cs` 以 `RecurringJob.AddOrUpdate<EconDataSyncRunner>` 註冊 |
| 執行內容 | 依序呼叫 `fetch_fred.py`（美國，含 SP500/比特幣）、`fetch_tw_gov.py`（台灣）、`fetch_yahoo.py`（黃金/費半指數/台股，市場資產），寫入 `MACRO.EconIndicatorValue`，再比對 `MACRO.EconAlertRule` 觸發示警 |
| 手動觸發 | `POST /api/tasks/run-macro-sync`（需登入） |
| 相依設定 | `appsettings.json` 需新增 `FredApiKey`（至 https://fred.stlouisfed.org/docs/api/api_key.html 申請免費 Key），未設定時僅略過 FRED 同步並記錄警告，不會拋錯 |
| 台灣資料來源設定 | `scripts/tw_gov_sources.json`，目前完成 `TW_UNEMPLOYMENT`／`TW_CPI_YOY`／`TW_PPI_YOY`／`TW_GDP_YOY` 共 4 項；`TW_CORE_CPI_YOY`／`TW_EXPORT_ORDERS_YOY` 待人工確認來源網址，`TW_BUSINESS_SIGNAL` 已知來源但格式是 ZIP、腳本尚未支援解壓縮 |
| 指標分類與溫度計計分 | `EconIndicator.Category = '市場'`（黃金/比特幣/SP500/費半/台股）不計入 `MacroCompositeEndpoints.cs` 的景氣溫度計綜合分數，避免市場情緒污染總體經濟健康度判讀，但仍會出現在指標矩陣與走勢圖 |
| Yahoo Finance 資料源 | 非官方 API，無 Key、無 SLA，`fetch_yahoo.py` 已設定瀏覽器樣式 User-Agent 降低被擋機率，但仍需留意長期穩定性，已於測試機（KAZUO）驗證連線正常（2026-07-26） |

---

## 七、舊系統遷移 — car（車輛管理）模組

舊 .asmx 前端（純靜態 HTML + jQuery）已整包搬進 wwwroot，逐支功能改為呼叫新 API，登入改為安全機制。

| 功能 | 新 API | 狀態 |
|---|---|---|
| 登入 / 登出 / 身份確認 | `/api/auth/login`、`/api/auth/logout`、`/api/auth/me` | 完成（Cookie session，BCrypt 雜湊） |
| 車輛 CRUD | `/api/vehicles`、`/api/my-vehicles` | 完成 |
| 油耗紀錄（查詢/新增） | `/api/vehicles/{id}/fuel` | 完成 |
| Dashboard 綜合查詢 | `/api/dashboard/{id}` | 完成 |
| 保養週期設定（CRUD+推薦） | `/api/vehicles/{id}/cycles`、`/cycles/recommend` | 完成 |
| 保養紀錄（查詢/新增/刪除） | `/api/vehicles/{id}/maintenance` | 完成 |
| 安全報表查詢（取代 meta_sql） | `/api/reports/query` | 完成（僅限單一 SELECT，黑名單防護） |

- 密碼安全性：資料庫 User 表密碼已由明碼一次性轉換為 BCrypt 雜湊（遷移用 endpoint 已移除）。
- car.js 死代碼已清理（原約 2000 行 → 約 1376 行）。

### UI／UX 重構

- 拿掉 Saved Reports 區塊。
- 新增響應式導航：桌面顯示側邊欄（`.app-sidebar`），手機（≤767px）改用底部固定導覽列（`.app-bottom-nav`），樣式檔為 `assets/css/car-layout.css`。
- ag-Grid 效能優化：`carGrid()` 改為表格已存在時用 `setGridOption("rowData", ...)` 更新資料，不重新 `createGrid`。
- 手機表格顯示：改為橫向捲動（`.car-grid { overflow-x: auto }`，`.ag-root-wrapper { min-width: 640px }`）。

---

## 八、Finance（財務管理）模組 — 進度

finance.html / finance.js 為獨立的 Class 架構（FinanceApp）。已完成登入統一，並逐區塊將 meta_sql 萬用查詢替換為安全的專屬 API。

| 功能區塊 | 新 API | 狀態 |
|---|---|---|
| 登入機制 | 共用 `/api/auth/*` | 完成（`_uidPrefix` 已改用已知 userId，不再查詢資料庫） |
| 總覽（資產走勢/現金流） | `/api/finance/overview` | 完成 |
| 明細（收支/分類分析/編輯/排除） | `/api/finance/details`、`/details/batch`、`/details/{id}/toggle-exclude`、`/category-analysis` | 完成 |
| 專案列表（CRUD + KPI） | `/api/finance/projects` | 完成；摘要列表「達成率」改為「上月預期資產 vs 上月實際資產」（2026-07-31，詳見下方設計決策） |
| 專案詳情 - 資產流 | `/api/finance/projects/{id}/assets`、`/assets/trend`、`/assets/apply-all-months` | 完成（追蹤實際淨資產變化） |
| 專案詳情 - 現金流 | `/api/finance/projects/{id}/cashflow-rules`、`/cashflow-matches`、`/cashflow-matches/{detailId}/toggle-exclude` | 完成（追蹤每月實際收支）；2026-07-31 新增「專案層面排除」— 命中規則的個別明細可單獨排除於某一專案外，不動 `Detail.IsExcluded`、不影響其他專案 |
| 專案詳情 - 預期資產變化 | `/api/finance/projects/{id}/expected`、`/expected/generate` | 完成（重新設計：期初資產＝專案預算） |
| 帳單管理（CRUD + 每月支出預測） | `/api/finance/bills`、`/bills/{billId}`（PUT/DELETE，2026-07-31 新增） | 完成；`FIN.Bill` 原無主鍵，已補上 `BillID` 供編輯/刪除定位單一筆（頻率展開計算 `computeMonthlyForecast` 保留於前端） |
| 麻布資料上傳（原收支明細上傳） | `/api/finance/upload-details` | 完成（C# CsvHelper 解析，取代原 Python Flask + 排程機制） |
| 存款帳戶總覽 + 修改結餘 | `/api/finance/accounts`、`/accounts/months`、`/accounts/balance` | 完成 |
| 投資組合 | — | 決定移除（不再維護） |
| 未來規劃（退休/貸款試算） | — | 決定移除（不再維護） |

### 設計決策 — 專案詳情三個子系統定位

- **資產流**：獨立追蹤淨資產的實際變化，確認是否穩定成長；資料來源為每月綁定的實際銀行帳戶餘額。
- **現金流**：獨立追蹤每月實際收入/支出；資料來源為關鍵字規則比對交易明細。
- **預期資產變化**：驗證當初財務規劃假設是否如預期（例如貸款金額 × 預期年化報酬率/利率）；期初資產固定＝建立專案時設定的「預算」，並用年化流入/流出率逐月推算，與資產流、現金流完全獨立、不互相勾稽。

### 設計決策 — 專案摘要列表「達成率」重新定義（2026-07-31）

原本「達成率」＝現金流命中金額 ÷ 建立專案時的預算，2026-07-31 改為「上月實際資產 ÷ 上月預期資產」：

- **上月預期資產**：取「預期資產變化」子系統推算草稿中，實際有資料的最新一列的期末資產（`ComputeRows` 最後一筆 `ClosingAsset`），已改為 `internal` 供 `FinanceProjectEndpoints` 重用同一套推算邏輯。
- **上月實際資產**：取「資產流」子系統綁定帳戶中，實際有資料的最新月份，且帳戶在「設定 > 帳戶分類」被標成「資產」的帳戶餘額加總；未分類或分類非「資產」（含負債）的帳戶不計入。
- 兩者皆採「該專案資料實際存在的最新月份」，不強制對齊到日曆上個月，避免資料還沒建到當月時卡片顯示 0。

**尚未解決、待下次規劃：** 這套算法目前只覆蓋「資產全部是可綁定的銀行/證券帳戶、且無槓桿」的專案。使用者已指出至少兩類情境算法不夠用，已提出三個方向但使用者尚未選定（見下方尚待處理事項）：
1. 槓桿型專案（例如信貸投資股票）：目前用帳戶分類文字篩選「資產」，會把綁定的貸款帳戶（負債）整筆排除，達成率會虛高；候選方案是改用「綁定帳戶餘額直接加總、正負號自動抵銷」（跟總覽頁淨資產算法一致），负债帳戶自然被扣掉。
2. 非帳戶型資產（例如房地產市值）：`FIN.BankAccount` 目前只能靠 CSV 上傳自動產生月快照，沒有「手動新增/編輯月結餘快照」的功能，這類資產完全進不了資產流系統。
3. 現金流是否併入「實際資產」數字：房租收入/管理費這類現金流，要不要跟淨值合併成接近「總報酬」的概念，還是維持資產流／現金流兩條線分開由使用者自行對照。

---

## 九、常用操作指令速查

**查詢網站與應用程式集區設定：**

```powershell
Get-Website | Select-Object Name, PhysicalPath
Get-Website -Name "JazzerLifes" | Select-Object Name, ApplicationPool
Get-WebBinding -Name "JazzerLifes"
```

**重啟服務：**

```powershell
Restart-WebAppPool -Name "JazzerLifeAppPool"
iisreset
```

**驗證 ANCM 模組是否掛載成功：**

```powershell
Get-WebGlobalModule | Where-Object { $_.Name -like "*AspNetCore*" }
```

**本機測試 HTTPS（不修改 hosts 檔案，僅正式機）：**

```powershell
curl.exe -k --resolve jzshome.ddns.net:443:192.168.1.101 https://jzshome.ddns.net/api/vehicles
```

**測試機到正式機的連線埠檢查：**

```powershell
Test-NetConnection -ComputerName 192.168.1.101 -Port 1433
```

> 注意：用主機名稱 `DESKTOP-E4G7MO5` 檢查會失敗（`Name resolution failed`），務必用 IP。

**Git 跨使用者權限問題排除：**

```powershell
git config --global --add safe.directory <資料夾路徑>
```

---

## 十、進度總覽

| 階段 | 內容 | 狀態 |
|---|---|---|
| 一 | 基礎環境（IIS、Hosting Bundle、SQL Server、Python） | 完成 |
| 二 | 資料庫建立與帳號授權 | 完成 |
| 三 | ASP.NET Core 部署、HTTPS 憑證 | 完成 |
| 四 | Hangfire 背景工作、Python 觸發 | 完成 |
| — | car 模組：舊系統功能安全重寫 | 完成 |
| — | car 模組：UI／UX 重構（響應式導航、效能優化） | 完成 |
| — | Finance 模組：登入、總覽、明細、專案列表 | 完成 |
| — | Finance 模組：專案詳情（資產流／現金流／預期資產） | 完成，含邏輯重新設計 |
| — | Finance 模組：帳單管理、麻布資料上傳、存款帳戶 | 完成 |
| — | Finance 模組：移除投資組合、未來規劃 | 待前端 HTML/JS 清理收尾 |
| — | **測試機環境建置（KAZUO）** | **完成** |
| — | Macro 模組：DB Schema、資料同步管線（FRED/台灣官方/Yahoo Finance）、API、示警、前端（含分類分組、圖表美化） | 測試機驗證完成，正式區未部署 |
| — | **Rent 模組（新增）：房間房租/電費計算、公共電費雙月抄表試算、複製圖片** | 開發完成，**SQL 腳本尚未於任一環境執行，待測試機驗證** |
| — | Rent 模組：手機版 UI 優化（表格字級加大、操作按鈕排版） | 開發完成，待測試機驗證 |
| — | Rent 模組：複製圖片穩定性修正（整表/單一房間/電費明細改離屏靜態表格擷取；移除與 html2canvas 衝突的 sticky 房間欄位） | 開發完成，待測試機驗證 |
| — | **Trading 模組（新增）：交易日誌，cTrader Records + TradingView 訂單匯入，績效分析/出場方式分類/隱含成本/滑價分析** | 開發完成，**SQL 腳本尚未於任一環境執行，待測試機驗證** |
| — | **Finance 模組（2026-07-31）：分類分析表格 UI、總覽資產分頁卡片精簡、專案摘要列表達成率重新定義、帳單管理新增編輯/刪除、專案現金流「專案層面排除」** | 開發完成，**2 支新 SQL 腳本尚未於任一環境執行，待測試機驗證** |
| 五 | 上線前安全檢查清單 | 尚未開始 |

### 尚待處理事項

- [ ] finance.html／finance.js：移除投資組合、未來規劃相關的 HTML 區塊與對應 JS 函式。
- [ ] win-acme 通知信箱補回。
- [ ] HTTP 是否已正確強制導向 HTTPS，需再次確認測試。
- [ ] Hangfire Dashboard 授權範圍（目前整個 192.168.x.x 網段皆可存取），未來視環境調整是否加帳密。
- [ ] Python 腳本存放位置決策待定（目前維持與 JazzerLifeApi 平行、專案外部）。
- [ ] 階段五：應用程式集區權限最小化複查、Hangfire Dashboard 壓力測試、SQL Server 對外埠是否封閉之確認。
- [ ] 若正式機 IP（192.168.1.101）未來變動，需同步更新測試機的 `appsettings.json` 連線字串。
- [ ] 正式區部署總經模組：依 `總經模組_正式區部署備註.md` 執行（含新增指標 SQL、`fetch_yahoo.py` 複製與連線驗證、IIS App Pool 權限檢查）。
- [ ] 台灣官方資料：`TW_CORE_CPI_YOY`、`TW_EXPORT_ORDERS_YOY` 待人工查詢穩定資料源；`TW_BUSINESS_SIGNAL` 已知來源但為 ZIP 格式，`fetch_tw_gov.py` 需擴充解壓縮支援才能啟用。
- [ ] Yahoo Finance（`fetch_yahoo.py`）為非官方 API，需持續觀察正式機的長期連線穩定性，若頻繁失敗需評估替代來源。
- [ ] Rent 模組部署前需先於測試機、正式機 SSMS 依序執行 `scripts/sql/rent_schema.sql` 與 `scripts/sql/rent_schema_add_public_electricity_2026-07-27.sql`。
- [ ] Rent 模組「公共電費」試算需要使用者持續在「公共電費」頁籤登記主表（母表）讀數（期間需與電費月相同），否則會以 0 帶入；待實際使用幾個月後再評估試算準確度。
- [ ] Rent 模組目前只有前端單一物件視角（無物件切換 UI），資料庫已支援多物件，未來如需擴充多個出租地址只需前端調整。
- [ ] Trading 模組部署前需先於測試機、正式機 SSMS 依序執行 `scripts/sql/trading_schema.sql`、`trading_schema_add_ctrader_records_2026-07-30.sql`、`trading_schema_add_exit_quality_2026-07-30.sql`，並執行 `dotnet restore` 還原 ClosedXML 套件。
- [ ] Trading 模組隱含成本分析的合約乘數（每手對應商品單位數）目前只有 BTCUSD 經實際交易驗證為 1，其餘商品暫預設 1，可能不準確，待累積更多商品實際交易資料後擴充對照表（`TradeEndpoints.cs` 內 `TradeCostCalculator.ContractMultipliers`）。
- [ ] Finance 模組 2026-07-31 異動部署前需先於測試機、正式機 SSMS 依序執行 `scripts/sql/finance_bill_add_id_2026-07-31.sql` 與 `scripts/sql/finance_project_cashflow_exclusion_2026-07-31.sql`（兩支互不相依，順序不拘）。
- [ ] 專案摘要列表「上月實際資產」算法待進一步規劃（詳見上方設計決策）：(1) 槓桿型專案的負債抵銷方式（帳戶分類文字篩選 vs 餘額正負號直接加總）、(2) 房地產等非帳戶型資產是否新增「手動新增/編輯月結餘快照」功能、(3) 房租/管理費等現金流是否併入實際資產數字。三個方向使用者尚未選定，等有明確需求再實作。

---

## 十一、與 Claude 協作備註

- **每次程式碼異動後，Claude 都要主動提供驗證方式**（例如要跑哪個指令、測哪支 API、預期看到什麼結果），不要只說改完了。
- **測試機（KAZUO）上測試用的暫存檔案一律放在 `E:\temp`**（例如驗證用的測試 CSV、大檔案等），不要放 `C:\temp` 或其他路徑。
