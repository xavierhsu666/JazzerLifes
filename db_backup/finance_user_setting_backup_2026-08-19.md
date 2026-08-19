# FIN.UserSetting 結構備份（2026-08-19）

搭配腳本：`scripts/sql/finance_user_setting_2026-08-19.sql`（需自行於 SSMS 手動執行）

## 一、功能說明

使用者層級的鍵值設定表。第一個用途是「集保存摺 PDF 開啟密碼」，讓上傳集保 PDF 時不必每次輸入密碼。

之後若有其他不值得單開一張表的個人化設定，沿用同一張表加新的 `SettingKey` 即可。

| SettingKey | 用途 | 是否加密 |
|---|---|---|
| `tdcc.pdf.password` | 集保存摺 PDF 開啟密碼 | 是 |
| `finance.closing.day` | 每月結帳日（1~28，超過 28 的日期在二月不存在故不收） | 否 |

## 二、欄位定義

| 欄位 | 型別 | 允許 NULL | 說明 |
|---|---|---|---|
| SettingID | INT IDENTITY(1,1) | N | 主鍵 `PK_UserSetting` |
| UserID | INT | N | 對應 `MEM.Users.UserID` |
| SettingKey | NVARCHAR(100) | N | 設定鍵名 |
| SettingValue | NVARCHAR(MAX) | Y | 設定值；加密項目存的是密文 |
| IsEncrypted | BIT | N | 預設 0；為 1 表示 SettingValue 是 Data Protection 密文 |
| CreatedAt | DATETIME | N | 預設 GETDATE() |
| UpdatedAt | DATETIME | N | 預設 GETDATE() |

索引／限制：

- `PK_UserSetting`：叢集主鍵（SettingID）
- `UQ_UserSetting_UserKey`：UNIQUE (UserID, SettingKey)，一個使用者同一個鍵只會有一筆

## 三、對應程式

| 層 | 檔案 |
|---|---|
| Model | `JazzerLifeApi/Models/UserSetting.cs` |
| DbContext | `JazzerLifeApi/Models/JazzerLifeContext.cs`（`DbSet<UserSetting> UserSettings` + `modelBuilder.Entity<UserSetting>`） |
| API | `JazzerLifeApi/Endpoints/FinanceSettingEndpoints.cs` |
| 使用端 | `JazzerLifeApi/Endpoints/FinanceStockPdfEndpoints.cs`（上傳集保 PDF 時取密碼） |
| 前端 | `wwwroot/finance/finance.html`（設定 → 一般設定）、`wwwroot/assets/js/finance.js` |

API：

| Method | 路徑 | 說明 |
|---|---|---|
| GET | `/api/finance/settings` | 回傳 `TdccPasswordSaved`（布林）與 `TdccPasswordUpdatedAt`，**不回傳密碼本身** |
| PUT | `/api/finance/settings/tdcc-password` | body `{ "password": "..." }` 儲存；傳空字串則刪除該筆設定 |
| PUT | `/api/finance/settings/closing-day` | body `{ "day": 5 }` 儲存；傳 `null` 則刪除該筆設定 |
| GET | `/api/finance/monthly-checklist?month=yyyy-MM` | 當月結帳檢查清單：麻布明細／麻布帳戶餘額／集保存摺上傳／集保結算四項的完成狀態，含結帳日倒數天數 |

## 四、密碼加密方式（重要）

密碼用 ASP.NET Core Data Protection 加密（purpose 字串 `JazzerLife.Finance.UserSetting`）後才寫入 `SettingValue`，資料庫看到的是密文。

金鑰存放位置由 `Program.cs` 明確指定：

```
<ContentRoot>\App_Data\keys        （可用 appsettings.json 的 DataProtection:KeysPath 覆寫）
```

原因與注意事項：

- 預設金鑰會放在使用者設定檔目錄，但 IIS App Pool 常常沒有載入使用者設定檔，金鑰只會留在記憶體，**應用程式集區一重啟，先前存的密碼就解不開**。
- 因此該資料夾必須給 App Pool 帳號寫入權限：

  ```powershell
  icacls "<發布路徑>\App_Data" /grant "IIS AppPool\<PoolName>:(OI)(CI)M" /T
  ```

- **資料夾建不起來不會讓網站掛掉**：`Program.cs` 對 `Directory.CreateDirectory` 包了 try-catch，失敗時退回「金鑰只放記憶體」並在啟動日誌留警告（曾在正式機第一次部署時因 App Pool 沒有寫入權限而導致整站啟動失敗，故改為非致命）。
- 金鑰若遺失或只在記憶體，後端解密會失敗，此時 API 會當成「沒設定密碼」處理（不會丟例外），使用者重新在「一般設定」輸入一次即可。
- 正式機一併記得授權：

  ```powershell
  New-Item -ItemType Directory -Force "C:\inetpub\JazzerLife\App_Data\keys"
  icacls "C:\inetpub\JazzerLife\App_Data" /grant "IIS AppPool\JazzerLifeAppPool:(OI)(CI)M" /T
  ```

## 五、集保 PDF 匯入相關

集保 PDF 辨識後寫入既有的 `FIN.Stock`，並另有匯入紀錄與月結流程（`FIN.StockPdfImport`／`FIN.StockSettlement`），
詳見 `db_backup/finance_stock_pdf_import_backup_2026-08-19.md`。
