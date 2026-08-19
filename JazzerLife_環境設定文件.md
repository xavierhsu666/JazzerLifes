# JazzerLife 環境設定文件

**最後更新：** 2026 年 8 月 10 日（v11：Rent 模組公共電費邏輯重整 — 主表電費紀錄改存明確起訖月區間、公共電費改為快照欄位、套用入口收斂到「電費計算」頁並新增操作流程列，含 2 支新 SQL 腳本部署方式與 RENT 腳本執行狀態更正；另含 Trading 模組手機版日期區間篩選改版）
**歷史版本：**
- v10（2026 年 7 月 31 日）：Finance 模組多項調整 — 分類分析/總覽卡片 UI 精簡、專案摘要列表達成率改以「預期資產 vs 實際資產」計算、帳單管理新增編輯/刪除（`FIN.Bill` 補上 `BillID` 主鍵）、專案現金流命中明細新增「專案層面排除」機制，含 2 支新 SQL 腳本部署方式
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
> 兩支皆內含 `IF NOT EXISTS` 防呆、可重複執行，且第 2 支依賴第 1 支已先執行過。結構備份分別存於 `db_backup/rent_schema_backup_2026-07-27.md`、`db_backup/rent_schema_add_public_electricity_backup_2026-07-27.md`。
>
> **【2026-08-10 更正】這兩支腳本其實都已經執行過了**（實際連線查詢確認 `RENT.MasterMeterReading` 與 `RoomBill.PublicElectricityFee` 皆存在，`RENT.Property`／`Room`／`RoomBill` 亦有實際使用中的資料）。原本記載的「測試機與正式機目前皆尚未執行」為過期資訊。注意測試機的連線字串指向的就是正式機的 `JazzerLife` 資料庫，兩邊看到的是同一份資料。

> **RENT 主表期間改版（2026-08-10，公共電費邏輯重整）部署方式：** 需在部署前於 SSMS 對 JazzerLife 資料庫依序手動執行：
> 1. `scripts/sql/rent_schema_add_master_period_2026-08-10.sql`（`RENT.MasterMeterReading` 新增 `StartMonth`／`EndMonth`，唯一索引改掛在 `(PropertyID, EndMonth)`，並加上 `EndMonth >= StartMonth` 檢查條件）
> 2. `scripts/sql/rent_fix_initial_readings_2026-08-10.sql`（修正「期初建檔列」被當成用電量的資料；正式資料庫的 2026-05 四列合計 110,148 度、電費 10~19 萬元，會讓公共電費試算失效）
>
> 第 1 支內含 `IF NOT EXISTS` 防呆、可重複執行；第 2 支的判定條件為 `PrevReading = 0 AND CurrentReading > 0 AND UsageUnits > 0`，同樣可重複執行（第二次執行影響 0 筆），腳本開頭附有先查詢受影響資料列的 SELECT，建議先單獨執行確認清單無誤再往下。**第 2 支會異動正式資料，執行前請先看過該清單。** 結構備份與設計說明存於 `db_backup/rent_schema_add_master_period_backup_2026-08-10.md`。未執行第 1 支時，`/api/rent/master-meter` 與 `/api/rent/public-electricity-estimate` 會因查不到 `StartMonth`／`EndMonth` 而失敗。

> **TRADING schema（交易日誌模組，新增）部署方式：** 需在部署前於 SSMS 對 JazzerLife 資料庫依序手動執行：
> 1. `scripts/sql/trading_schema.sql`（建立 TRADING schema，共 2 張表：`StrategyTag`／`Trade`）
> 2. `scripts/sql/trading_schema_add_ctrader_records_2026-07-30.sql`（`EntryTime` 改為可為 NULL，新增 cTrader Records 匯入用的自然鍵唯一索引）
> 3. `scripts/sql/trading_schema_add_exit_quality_2026-07-30.sql`（`Trade` 新增 `ExitReason`、`ExitSlippage` 欄位，供出場方式分類與滑價分析）
>
> 三支皆內含 `IF NOT EXISTS` 防呆、可重複執行，且依序有相依關係（第 2、3 支皆假設第 1 支已先執行過）。結構備份分別存於 `db_backup/trading_schema_backup_2026-07-30.md`、`db_backup/trading_schema_add_ctrader_records_backup_2026-07-30.md`、`db_backup/trading_schema_remove_position_history_import_2026-07-30.md`、`db_backup/trading_schema_add_exit_quality_backup_2026-07-30.md`。**測試機與正式機目前皆尚未執行**，部署前務必先於 SSMS 手動跑過這三支腳本，否則 `/api/trading/*` 系列 API 會全部失敗。另需 `dotnet restore` 還原新增的 ClosedXML 套件（供解析 cTrader `.xlsx` 匯出檔）。

> **FIN schema 異動（2026-08-10，專案現金流計入實際資產）部署方式：** 需在部署前於 SSMS 對 JazzerLife 資料庫執行 `scripts/sql/finance_project_include_cashflow_2026-08-10.sql`（`FIN.Projects` 新增 `IncludeCashflowInActualAsset BIT NOT NULL DEFAULT 0`）。內含 `IF NOT EXISTS` 防呆、可重複執行，預設值 0 維持既有專案行為不變。未執行時 `/api/finance/projects` 會因 EF 查不到該欄位而失敗（專案列表整頁無法載入）。結構備份與同批次前端改動說明存於 `db_backup/finance_project_include_cashflow_backup_2026-08-10.md`。

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
| Clone 路徑（測試機） | `E:\Project\JazzerLifes`（clone 的是上層 `JazzerLife` 目錄本身，讓 `scripts`、`db_backup` 等資料夾一併納入版控；`.git` 在此路徑下，不是在 `JazzerLifeApi` 子目錄裡——2026-08-03 修正原本表格寫錯層級的筆誤） |
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
- **`.git/index.lock` 等鎖定檔殘留（2026-08-03 新增）**：git 指令若中途被中斷（例如終端機被關掉、指令卡住被強制結束），`.git` 目錄下會留下 `.lock` 檔案，之後任何 git 操作都會出現「Unable to create '.git/xxx.lock': File exists」而卡住。**執行前務必先確認沒有其他 git 指令正在跑**，確認後可用以下腳本清除：
  ```powershell
  # 清除測試機 JazzerLife repo 殘留的 git 鎖定檔
  $repoPath = "E:\Project\JazzerLifes"

  $gitProc = Get-Process git -ErrorAction SilentlyContinue
  if ($gitProc) {
      Write-Warning "偵測到 git.exe 行程正在執行中（PID: $($gitProc.Id -join ', ')），請先確認該指令是否已完成，再重新執行本腳本。"
      return
  }

  $lockFiles = @(
      "$repoPath\.git\index.lock",
      "$repoPath\.git\HEAD.lock",
      "$repoPath\.git\config.lock",
      "$repoPath\.git\packed-refs.lock",
      "$repoPath\.git\refs\heads\main.lock"
  )
  foreach ($lock in $lockFiles) {
      if (Test-Path $lock) {
          Remove-Item $lock -Force
          Write-Host "已移除: $lock" -ForegroundColor Green
      }
  }
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

### Data Protection 金鑰資料夾（2026-08-19 新增，部署必看）

集保存摺 PDF 的開啟密碼會用 ASP.NET Core Data Protection 加密後存進 `FIN.UserSetting`，金鑰預設落地在
`<發布路徑>\App_Data\keys`（可用 `appsettings.json` 的 `DataProtection:KeysPath` 覆寫）。

**兩台機器部署後都要給應用程式集區寫入權限**，否則金鑰只會留在記憶體，重啟後已儲存的密碼就解不開：

```powershell
# 正式機
New-Item -ItemType Directory -Force "C:\inetpub\JazzerLife\App_Data\keys"
icacls "C:\inetpub\JazzerLife\App_Data" /grant "IIS AppPool\JazzerLifeAppPool:(OI)(CI)M" /T

# 測試機
New-Item -ItemType Directory -Force "E:\WebApplication\JazzerLifeTest\App_Data\keys"
icacls "E:\WebApplication\JazzerLifeTest\App_Data" /grant "IIS AppPool\JazzerLifeTestPool:(OI)(CI)M" /T
```

> **踩過的坑**：第一版把 `Directory.CreateDirectory` 放在啟動路徑上且未攔例外，正式機因 App Pool 沒有建立
> 資料夾的權限，直接在啟動階段丟 `UnauthorizedAccessException`，**整個網站起不來**。現已改為 try-catch，
> 建不起來只會退回「金鑰放記憶體」並在啟動日誌留警告，網站照常啟動——但密碼持久化仍需上面的授權。

`App_Data/` 已加入 `.gitignore`，金鑰不進版控（兩台機器各自產生）。

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
| 登入 / 登出 / 身份確認 | `/api/auth/login`、`/api/auth/logout`、`/api/auth/me` | 完成（Cookie session，BCrypt 雜湊）；**2026-08-03 起 car.html 導覽列拿掉獨立的 LogOut 按鈕**（`/api/auth/logout` API 本身沒動，首頁 index.html 的登入/登出流程不受影響） |
| 車輛 CRUD | `/api/vehicles`、`/api/my-vehicles` | 完成 |
| 油耗紀錄（查詢/新增） | `/api/vehicles/{id}/fuel` | 完成；趨勢圖表 2026-08-03 改用 Highcharts `scrollablePlotArea`（詳見下方異動記錄） |
| Dashboard 綜合查詢 | `/api/dashboard/{id}` | 完成 |
| 保養週期設定（CRUD+推薦） | `/api/vehicles/{id}/cycles`、`/cycles/recommend` | 完成；2026-08-03 起建議週期只納入分類「例行」「保養」的紀錄 |
| 保養紀錄（查詢/新增/刪除） | `/api/vehicles/{id}/maintenance` | 完成；2026-08-03 新增可綁定 `CategoryId` |
| 保養分類 CRUD（新增 2026-08-03） | `/api/part-categories` | 完成，沿用既有 `CarMan.PartCategories` 資料表（Model 早已 scaffold，未新增 SQL） |
| 安全報表查詢（取代 meta_sql） | `/api/reports/query` | 完成（僅限單一 SELECT，黑名單防護） |

- 密碼安全性：資料庫 User 表密碼已由明碼一次性轉換為 BCrypt 雜湊（遷移用 endpoint 已移除）。
- car.js 死代碼已清理（原約 2000 行 → 約 1376 行）。

### UI／UX 重構

- 拿掉 Saved Reports 區塊。
- 新增響應式導航：桌面顯示側邊欄（`.app-sidebar`），手機（≤767px）改用底部固定導覽列（`.app-bottom-nav`），樣式檔為 `assets/css/car-layout.css`。
- ag-Grid 效能優化：`carGrid()` 改為表格已存在時用 `setGridOption("rowData", ...)` 更新資料，不重新 `createGrid`。
- 手機表格顯示：改為橫向捲動（`.car-grid { overflow-x: auto }`，`.ag-root-wrapper { min-width: 640px }`）。

### 異動記錄（2026-08-03）— 保養分類 + 油耗趨勢圖表修正

- **油耗趨勢圖表**：Dashboard `#chart_area`、油耗紀錄 `#oilTrendChart` 原本沒有規劃寬度，月份一多時 Highcharts 會把所有類別硬擠進可視寬度，柱子被壓到不到 1px、刻度文字也被自動略過，視覺上像只顯示十幾筆資料。比照 `finance.js` 既有的 `getMobileChartTweaks` 手法，改用 `scrollablePlotArea` 讓每個類別保留足夠寬度，超出時橫向捲動查看。
- **保養分類管理**：新增 `PartCategoryEndpoints.cs`（`/api/part-categories` CRUD），沿用資料庫既有的 `CarMan.PartCategories` 資料表（Model 先前已 scaffold 好，本次**未新增 SQL 腳本**）；前端獨立成「保養分類」頁籤（`categorytable` section），新增/刪除分類，分類已被保養紀錄使用中時禁止刪除。
- **保養紀錄綁定分類**：新增保養時可選擇分類（選填），保養紀錄清單顯示分類欄位；建議保養週期（`/cycles/recommend`）改為只納入分類「例行」「保養」的歷史紀錄，需使用者在「保養分類」頁籤建立完全一致的分類名稱才會被納入計算。
- **表單體驗微調**：分類下拉選單樣式從 `form-select` 改為 `form-control`（本專案用 Bootstrap 4，沒有 `.form-select` 樣式定義，用 `form-select` 會退回瀏覽器原生外觀、跟其他欄位不一致）；新增保養時里程欄位若空白會自動帶入目前已知最大里程（`/latest-odometer`，油耗+保養兩者取大者），使用者仍可覆寫。
- **移除 car 頁面 LogOut**：只拿掉 car.html 導覽列與 car.js 的 `handleSignOut()`，首頁 index.html 的登入/登出按鈕未變動。
- 本次**無資料庫結構異動**，部署只需 `dotnet publish`，不需額外執行 SQL 腳本。

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
| 自動分類規則（2026-08-17 新增） | `/api/finance/auto-rules`（GET/POST）、`/{ruleId}`（PUT/DELETE）、`/{ruleId}/toggle`、`/reorder`、`/preview`、`/{ruleId}/run`、`/run-all` | 開發完成，**2 支 SQL 尚未執行**；取代舊的 `FIN.ins_Detail_Tag_With_Rule` 預存程序（詳見下方設計決策） |
| 集保存摺 PDF 月結（2026-08-19 新增） | `/api/finance/stock-pdf/preview`、`/import`、`/imports`（GET/DELETE）、`/settle` | 開發完成，**1 支 SQL 尚未執行**（`finance_stock_pdf_import_2026-08-19.sql`），待測試機驗證 |
| 一般設定（2026-08-19 新增） | `/api/finance/settings`、`/settings/tdcc-password`、`/settings/closing-day`、`/monthly-checklist` | 開發完成，**1 支 SQL 尚未執行**（`finance_user_setting_2026-08-19.sql`） |
| 資產統計未計入診斷（2026-08-19 新增） | `/api/finance/overview/uncounted` | 完成，無 SQL |
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

### 設計決策 — 自動分類規則取代 `FIN.ins_Detail_Tag_With_Rule`（2026-08-17）

原本明細的分類／標籤／備註靠一支手寫的預存程序批次 UPDATE，規則寫死在 SQL 裡、只能由開發者維護，且無法預覽影響範圍。改為資料驅動的規則引擎（`FIN.DetailAutoRule` + `FIN.DetailAutoRuleCondition`），使用者可自行在 UI 增刪改。

**與既有機制的區隔：** 跟 `FIN.ProjectCashflowRule`（專案現金流的單一關鍵字比對）是兩套獨立機制，不共用。前者只決定「某筆明細算不算進某個專案」、**不改動明細本身**；自動分類規則則是**直接改寫** `Detail` 的 `Category`／`Tag`／`Notes`／`IsExcluded`／`Activate`。

**四個核心語意：**

1. **條件間一律 AND**，文字條件的值以半形逗號分隔多值時視為 OR；`notContains` 是否定條件，多值時要「每個值都不包含」才算命中。沒有任何條件的規則不允許儲存，也一律不命中（避免空規則掃到全部明細）。
2. **金額一律取絕對值比較**。支出在 `FIN.Detail` 是負數，使用者說「金額大於 1000」指的是「花超過 1000」而非「大於 -1000」。
3. **依 `Priority` 由小到大依序套用、後者覆蓋前者**，且**後面的規則看到的是前面規則改過之後的明細**（`RunRules` 就地改物件）。這個特性讓「標籤 為空白」條件可以完整取代舊 SP 的 `Tag is null` 守門寫法 —— 排在前面的規則先填上標籤，後面條件較寬的規則就自動不再命中同一筆。**調整規則順序會改變結果，UI 的「▲▼」不是排版功能。**
4. **動作模式**：`覆寫`／`僅空白時填入`（保護手動改過的值）／`附加`（僅 Tag、Notes，逗號串接、已存在不重複加、超長則不動，因此重跑冪等）。

**排除 vs 停用：**

| | `IsExcluded`（排除） | `Activate`（停用） |
|---|---|---|
| 語意 | 不計入報表統計 | 軟刪除 |
| 明細頁 | 切「顯示已排除」還看得到 | 所有查詢都撈不到 |
| 適用 | 一次性大額支出等不想污染趨勢的項目 | 重複扣款、帳戶互轉等根本不該出現在帳上的列 |

**比對範圍**是該使用者的**全部**明細，不以 `Activate` 或 `IsExcluded` 篩選 —— 規則本身可能就是要設定這兩個旗標，先篩掉就永遠無法命中要還原的列；這也跟舊 SP 直接對整張表下 UPDATE 一致。

**舊 SP 未能轉換的三段**（種子腳本未納入，SP 需保留或另行處理）：

| SP 段落 | 原因 | 處置 |
|---|---|---|
| 抽籤沒抽到（`#map_lottery_1~3`） | 需把「抽籤預扣」與「抽籤退款」依金額（扣款金額 − 20）配對，再用 `ROW_NUMBER()` 取第二筆。這是跨資料列的關聯運算，規則引擎逐筆比對做不到 | 保留該段 SP 單獨執行，或日後做成專用功能 |
| 帳戶指派（`BankAccount set Tag = '#專案名'`） | 目標是 `FIN.BankAccount` 不是 `FIN.Detail`；且 `BankAccount.Tag` 在現行程式碼中**沒有任何地方讀取**，是舊 asmx 架構的遺留欄位 | 已被「專案管理 › 資產流 › 綁定資產帳戶」（`FIN.ProjectAssetBinding`）取代，不需再維護 |
| 停用帳戶（`BankAccount set Activate=0`） | 同上，目標是帳戶資料表 | 保留在 SP，或於「存款帳戶」頁面手動處理 |

**已知的原 SP 行為缺陷（種子腳本忠實重現，未擅自修正）：** `信貸投資案－台新證券劃撥` 規則要寫入 `Notes='劃撥'`，但排在它前面的 `Category='投資買賣' and 劃撥` 規則**沒有** `Tag is null` 守門，會先把 Tag 填掉，導致前者的「標籤 為空白」條件不成立、備註永遠寫不進去。若確實需要該備註，在 UI 用「▲」把它移到前面即可。同一條無守門的規則也會蓋掉人工標記過的標籤。

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
| — | **Rent 模組（新增）：房間房租/電費計算、公共電費雙月抄表試算、複製圖片** | 已上線使用中（2026-08-10 更正：SQL 腳本其實早已執行，資料庫已有實際帳單資料） |
| — | **Rent 模組（2026-08-10）：公共電費邏輯重整** — 主表改存明確起訖月區間、公共電費改為快照、套用入口收斂到「電費計算」頁、新增操作流程列 | 開發完成，**2 支 SQL 尚未執行（含 1 支正式資料修正），待測試機驗證** |
| — | Rent 模組：手機版 UI 優化（表格字級加大、操作按鈕排版） | 開發完成，待測試機驗證 |
| — | Rent 模組：複製圖片穩定性修正（整表/單一房間/電費明細改離屏靜態表格擷取；移除與 html2canvas 衝突的 sticky 房間欄位） | 開發完成，待測試機驗證 |
| — | **Trading 模組（新增）：交易日誌，cTrader Records + TradingView 訂單匯入，績效分析/出場方式分類/隱含成本/滑價分析** | 開發完成，**SQL 腳本尚未於任一環境執行，待測試機驗證** |
| — | **Finance 模組（2026-07-31）：分類分析表格 UI、總覽資產分頁卡片精簡、專案摘要列表達成率重新定義、帳單管理新增編輯/刪除、專案現金流「專案層面排除」** | 開發完成，**2 支新 SQL 腳本尚未於任一環境執行，待測試機驗證** |
| — | **car 模組（2026-08-03）：保養分類管理（新增/綁定/建議週期篩選）、油耗趨勢圖表 scrollablePlotArea 修正、移除 car 頁 LogOut** | 開發完成，**無 SQL 待執行**，可直接部署 |
| — | **Trading 模組（2026-08-10）：手機版日期區間篩選改版** — 導覽列改為區間摘要按鈕 + 展開式面板（快捷區間膠囊、起訖日期、清除/套用），修正原本擠成兩列蓋住內容的問題 | 開發完成，**無 SQL 待執行**，可直接部署 |
| — | **Finance 模組（2026-08-10）：專案管理編輯重新設計** — 資產綁定改彈窗（勾選/資產分類/資產/餘額表格 + 套用至版本月份／所有月份）、基礎資訊新增「現金流計入上月實際資產」勾選、收支對比圖表改為每專案一張小圖各自 y 軸 | 開發完成，**1 支 SQL 尚未執行**，待測試機驗證 |
| — | **全模組（2026-08-10）：手機版回首頁按鈕** — finance／macro／rent／trading 頂端導覽列新增僅手機顯示的 🏠 按鈕，修正手機上無法回 index.html 的問題（car 模組結構不同，尚未處理） | 開發完成，**無 SQL 待執行**，可直接部署 |
| — | **Finance 模組（2026-08-17）：自動分類規則** — 多條件 AND／欄位內多值 OR 的規則引擎，命中後自動套用分類/標籤/備註/排除/停用；規則可單獨啟停、編輯、刪除、執行，也可整批執行；新增/編輯時即時預覽命中明細；明細上傳後自動對新明細套用一次。取代舊的 `FIN.ins_Detail_Tag_With_Rule` 預存程序 | 開發完成，**2 支 SQL 尚未於任一環境執行**（第 2 支為選用的規則種子），待測試機驗證 |
| — | **Finance 模組（2026-08-19）：集保存摺 PDF 辨識與月結** — PdfPig 依文字座標還原表格、多份 PDF 逐份上傳、四道重複防呆（檔案雜湊／內容雜湊／同來源更新版／同月重複結算）、結算合併成一筆 `FIN.BankAccount`（集保／集保庫存） | 開發完成，**2 支 SQL 尚未於任一環境執行**，待測試機驗證 |
| — | **Finance 模組（2026-08-19）：一般設定 + 結帳檢查清單** — 集保 PDF 密碼加密儲存（Data Protection）、每月結帳日設定、上傳頁顯示當月四項結帳待辦（麻布明細／麻布帳戶餘額／集保上傳／集保結算） | 開發完成，**1 支 SQL 尚未執行**（與上列共用 `finance_user_setting`） |
| — | **Finance 模組（2026-08-19）：資產統計改依帳戶分類** — 總資產／總負債／淨資產不再用餘額正負號，改以「設定 › 帳戶分類」判定（含「資產」計資產、含「負債」計負債、含「忽視／忽略／不計入／排除」視為刻意排除、其餘提醒補設定），並修正「本月資產結餘」把負債重複加一次的既有 bug | 開發完成，**無 SQL 待執行** |
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
- [x] ~~Rent 模組部署前需先於測試機、正式機 SSMS 依序執行 `scripts/sql/rent_schema.sql` 與 `scripts/sql/rent_schema_add_public_electricity_2026-07-27.sql`。~~（2026-08-10 確認兩支皆已執行完畢）
- [ ] Rent 模組 2026-08-10 異動部署前需先於 SSMS 依序執行 `scripts/sql/rent_schema_add_master_period_2026-08-10.sql` 與 `scripts/sql/rent_fix_initial_readings_2026-08-10.sql`（第 2 支會異動正式資料，先跑腳本內的 SELECT 確認受影響列）。
- [ ] Rent 模組公共電費維持「度數平均分攤 × 各房約定電價」，主表的總電費金額不進入計算，因此分攤總額與台電實際帳單金額會有落差（各房電價與實際均價的差額由房東吸收或多收）。此為已知取捨，若日後希望兩者對齊，需改為「金額分攤」（公共電費總額 = 主表總金額 − Σ各房自身電費）。
- [ ] Rent 模組公共電費的分攤分母採「目前啟用中的房間數」，期間內有房間退租／新入住時會與實際居住狀況有落差（已退租房間的用電仍會被扣除，只是不分攤公共部分）。
- [ ] **Service Worker 靜態檔快取（2026-08-10 新增，部署後若畫面沒更新請先看這裡）**：`wwwroot/service-worker.js` 採「網路優先、失敗才回快取」策略快取同網域的 HTML/CSS/JS。手機（尤其是加到主畫面的 PWA）可能出現「HTML 是新的、CSS/JS 是舊的」的混合狀態，症狀是版面錯亂、新功能沒作用。`CACHE_VERSION` 已於 2026-08-19 隨「集保存摺月結／一般設定／資產統計改版」的前端改動由 `v2` 提升為 `v3`（activate 階段會清掉 `jazzerlife-shell-v2` 快取）。**往後每次含前端改動的部署，都要一併把此版本號往上加。**
- [ ] car 模組手機版沒有回 index.html 的入口（`car-layout.css` 直接 `.app-sidebar { display: none }`，且無頂端導覽列可放按鈕）。其餘四個模組已於 2026-08-10 以 `.navbar-home` 補上，car 需另行決定放在底部導覽列或車輛下拉選單旁。
- [ ] Rent 模組「公共電費」試算需要使用者持續在「公共電費」頁籤登記主表（母表）讀數（期間需與電費月相同），否則會以 0 帶入；待實際使用幾個月後再評估試算準確度。
- [ ] Rent 模組目前只有前端單一物件視角（無物件切換 UI），資料庫已支援多物件，未來如需擴充多個出租地址只需前端調整。
- [ ] Trading 模組部署前需先於測試機、正式機 SSMS 依序執行 `scripts/sql/trading_schema.sql`、`trading_schema_add_ctrader_records_2026-07-30.sql`、`trading_schema_add_exit_quality_2026-07-30.sql`，並執行 `dotnet restore` 還原 ClosedXML 套件。
- [ ] Trading 模組隱含成本分析的合約乘數（每手對應商品單位數）目前只有 BTCUSD 經實際交易驗證為 1，其餘商品暫預設 1，可能不準確，待累積更多商品實際交易資料後擴充對照表（`TradeEndpoints.cs` 內 `TradeCostCalculator.ContractMultipliers`）。
- [ ] Finance 模組 2026-07-31 異動部署前需先於測試機、正式機 SSMS 依序執行 `scripts/sql/finance_bill_add_id_2026-07-31.sql` 與 `scripts/sql/finance_project_cashflow_exclusion_2026-07-31.sql`（兩支互不相依，順序不拘）。
- [ ] 專案摘要列表「上月實際資產」算法待進一步規劃（詳見上方設計決策）：(1) 槓桿型專案的負債抵銷方式（帳戶分類文字篩選 vs 餘額正負號直接加總）、(2) 房地產等非帳戶型資產是否新增「手動新增/編輯月結餘快照」功能、(3) 房租/管理費等現金流是否併入實際資產數字。三個方向使用者尚未選定，等有明確需求再實作。
- [ ] **Finance 模組自動分類規則（2026-08-17）部署前需先於測試機、正式機 SSMS 執行 `scripts/sql/finance_detail_auto_rule_2026-08-17.sql`**（建表；腳本尾端含 idempotent 的 `ALTER TABLE ... ADD ActionActivate`，已跑過早期版本者重跑同一支即可補欄位）。未執行前呼叫任何 `/api/finance/auto-rules*` 端點會因 EF 找不到資料表而報錯；明細上傳仍可正常寫入（自動套用階段的例外已被攔截，回應改帶 `autoRuleError`）。
- [ ] Finance 模組自動分類規則種子（選用）：`scripts/sql/finance_detail_auto_rule_seed_from_sp_2026-08-17.sql` 會建立由舊 SP 轉出的 12 條規則（`@UserID` 預設 1003，可重複執行、同名規則自動略過）。**首次套用前務必先逐條按「執行」看預覽**，尤其編號 1、2、12 的動作是「停用明細」（軟刪除），確認命中結果後再按「執行全部規則」。
- [ ] 舊的 `FIN.ins_Detail_Tag_With_Rule` 預存程序在自動分類規則上線後仍有三段無法被取代（抽籤配對、BankAccount 帳戶指派與停用），需決定是保留 SP 只跑那三段、還是另行開發。**在決定前不要直接刪除該 SP。**
- [ ] **Finance 模組 2026-08-19 異動部署前需先於測試機、正式機 SSMS 依序執行 `scripts/sql/finance_user_setting_2026-08-19.sql` 與 `scripts/sql/finance_stock_pdf_import_2026-08-19.sql`**（兩支互不相依，皆可重複執行）。未執行前「設定 › 一般設定」、「上傳 › 集保存摺」與結帳檢查清單的 API 會因 EF 找不到資料表而報錯。
- [ ] Finance 集保結算寫出的「集保／集保庫存」帳戶記得到「設定 › 帳戶分類」設為「資產」，否則不會被計入總資產。
- [ ] 集保 PDF 的券商／帳號辨識是用內文正則（`帳號`、`○○證券`）盡力抓，抓不到時改用「持股代號重疊率 ≥ 60%」判斷是否為同一來源的更新版；若實際版面辨識不到來源，重複上傳的提醒可能會漏判，屆時把 `/finance/stock-pdf-test.html` 印出的原始文字提供出來調整規則。
- [ ] 結帳檢查清單固定看「本月」（`DateTime.Today` 的年月）。若習慣是「每月 N 號結上個月的帳」，清單月份會對不上，需改為依結帳日推算目標月份或加月份切換，尚未決定。
- [ ] 資料清理：`FIN.BankAccount` 有一筆「台新銀行」且 `AccountName` 為空字串、餘額 0 的髒資料（來源疑似某次 CSV 空列），會出現在資產統計的「未分類」提醒中，待確認來源後清除。
- [ ] car 模組保養分類（2026-08-03 新增）：建議保養週期只會納入分類名稱**完全等於**「例行」「保養」的紀錄，需使用者自行在「保養分類」頁籤建立這兩個分類（系統不會自動 seed）；歷史上沒設分類的舊保養紀錄也不會被納入建議計算，除非事後手動補分類（目前無批次補分類的功能，需要的話可再開發）。

---

## 十一、與 Claude 協作備註

- **每次程式碼異動後，Claude 都要主動提供驗證方式**（例如要跑哪個指令、測哪支 API、預期看到什麼結果），不要只說改完了。
- **測試機（KAZUO）上測試用的暫存檔案一律放在 `E:\temp`**（例如驗證用的測試 CSV、大檔案等），不要放 `C:\temp` 或其他路徑。
