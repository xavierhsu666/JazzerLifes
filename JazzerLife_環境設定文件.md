# JazzerLife 環境設定文件

**最後更新：** 2026 年 7 月 25 日（v4：新增測試機環境、Git 工作流程）
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
| 主要 Schema | CarMan、FIN、MEM |
| 正式機驗證方式 | Windows 整合式驗證（Trusted_Connection），帳號 `IIS APPPOOL\JazzerLifeAppPool` |
| **測試機驗證方式** | **SQL Server 驗證**，帳號 `kazuo`（因跨子網域，Windows 整合式驗證的虛擬帳號無法被正式機 SQL Server 辨識） |
| 帳號權限 | db_datareader、db_datawriter（無 db_owner） |

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

**Python 環境（虛擬環境，與系統 Python 隔離）：**

```
腳本路徑：C:\Users\ServerDeployArea\JazzerLife\scripts\
虛擬環境：C:\Users\ServerDeployArea\JazzerLife\scripts\venv\
呼叫用 python.exe：C:\Users\ServerDeployArea\JazzerLife\scripts\venv\Scripts\python.exe
```

**PythonRunner 安全設計重點：**
- FileName 與腳本路徑固定寫死，不由外部輸入決定；參數一律用 `ArgumentList` 陣列傳遞，不做字串拼接、不經過 shell。
- 設定執行逾時（目前 30 秒）並於逾時強制 `Kill()`，避免程序卡死佔用資源。
- 重新導向 StandardOutput / StandardError，執行結果與錯誤皆可回收處理。

**待決策：** Python 腳本存放位置（與 JazzerLifeApi 專案平行、不在其內）是否維持，使用者仍在考慮中。

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
| 專案列表（CRUD + KPI） | `/api/finance/projects` | 完成 |
| 專案詳情 - 資產流 | `/api/finance/projects/{id}/assets`、`/assets/trend`、`/assets/apply-all-months` | 完成（追蹤實際淨資產變化） |
| 專案詳情 - 現金流 | `/api/finance/projects/{id}/cashflow-rules`、`/cashflow-matches` | 完成（追蹤每月實際收支） |
| 專案詳情 - 預期資產變化 | `/api/finance/projects/{id}/expected`、`/expected/generate` | 完成（重新設計：期初資產＝專案預算） |
| 帳單管理（列表 + 每月支出預測） | `/api/finance/bills` | 完成（頻率展開計算 `computeMonthlyForecast` 保留於前端） |
| 麻布資料上傳（原收支明細上傳） | `/api/finance/upload-details` | 完成（C# CsvHelper 解析，取代原 Python Flask + 排程機制） |
| 存款帳戶總覽 + 修改結餘 | `/api/finance/accounts`、`/accounts/months`、`/accounts/balance` | 完成 |
| 投資組合 | — | 決定移除（不再維護） |
| 未來規劃（退休/貸款試算） | — | 決定移除（不再維護） |

### 設計決策 — 專案詳情三個子系統定位

- **資產流**：獨立追蹤淨資產的實際變化，確認是否穩定成長；資料來源為每月綁定的實際銀行帳戶餘額。
- **現金流**：獨立追蹤每月實際收入/支出；資料來源為關鍵字規則比對交易明細。
- **預期資產變化**：驗證當初財務規劃假設是否如預期（例如貸款金額 × 預期年化報酬率/利率）；期初資產固定＝建立專案時設定的「預算」，並用年化流入/流出率逐月推算，與資產流、現金流完全獨立、不互相勾稽。

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
| 五 | 上線前安全檢查清單 | 尚未開始 |

### 尚待處理事項

- [ ] finance.html／finance.js：移除投資組合、未來規劃相關的 HTML 區塊與對應 JS 函式。
- [ ] win-acme 通知信箱補回。
- [ ] HTTP 是否已正確強制導向 HTTPS，需再次確認測試。
- [ ] Hangfire Dashboard 授權範圍（目前整個 192.168.x.x 網段皆可存取），未來視環境調整是否加帳密。
- [ ] Python 腳本存放位置決策待定（目前維持與 JazzerLifeApi 平行、專案外部）。
- [ ] 階段五：應用程式集區權限最小化複查、Hangfire Dashboard 壓力測試、SQL Server 對外埠是否封閉之確認。
- [ ] 若正式機 IP（192.168.1.101）未來變動，需同步更新測試機的 `appsettings.json` 連線字串。

---

## 十一、與 Claude 協作備註

- **每次程式碼異動後，Claude 都要主動提供驗證方式**（例如要跑哪個指令、測哪支 API、預期看到什麼結果），不要只說改完了。
- **測試機（KAZUO）上測試用的暫存檔案一律放在 `E:\temp`**（例如驗證用的測試 CSV、大檔案等），不要放 `C:\temp` 或其他路徑。
