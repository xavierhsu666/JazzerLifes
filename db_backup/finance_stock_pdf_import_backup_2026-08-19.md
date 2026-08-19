# 集保存摺 PDF 月結流程 結構備份（2026-08-19）

搭配腳本：`scripts/sql/finance_stock_pdf_import_2026-08-19.sql`（需自行於 SSMS 手動執行）

## 一、功能說明

每月結帳流程：

1. 在「上傳 → 集保存摺」逐份上傳股票庫存 PDF（每家券商一份），辨識後寫入 `FIN.Stock`，並留一筆 `FIN.StockPdfImport` 匯入紀錄。
2. 確認當月清單無誤（可單筆刪除重上）。
3. 按「結算本月」，把當月所有匯入的庫存合併成一筆 `FIN.BankAccount`（機構「集保」／帳戶「集保庫存」／金額＝總市值），資產走勢與帳戶總覽即可看到。

## 二、防呆設計

| 情境 | 判定方式 | 行為 |
|---|---|---|
| 同一個檔案再上傳 | `FileHash`（檔案位元組 SHA256）已存在 | 直接擋下（HTTP 409 `DUPLICATE_FILE`） |
| 同月、內容完全相同（換檔名／重新下載） | `ContentHash`（代號:股數 排序後 SHA256）已存在 | 直接擋下（409 `DUPLICATE_CONTENT`） |
| 同月、同一來源的更新版 | `SourceKey` 相同，或持股代號重疊率 ≥ 60% | 409 `SAME_SOURCE`，前端跳確認，確認後帶 `replaceImportId` 取代舊的 |
| 當月已結算又按結算 | `UQ_StockSettlement_UserMonth` + 後端檢查 | 409 `ALREADY_SETTLED`，確認後帶 `force=true` 重新結算 |
| 結算後又上傳／刪除 | `imports.Count != settlement.ImportCount` 或有 `SettlementID` 為 null 的匯入 | 清單顯示「請重新結算」提示 |

`SourceKey` 來自 PDF 內文辨識（券商名稱 + 帳號），使用者不需自行填寫；抓不到時退回持股重疊率判斷。

## 三、FIN.StockPdfImport 欄位

| 欄位 | 型別 | Null | 說明 |
|---|---|---|---|
| ImportID | INT IDENTITY | N | 主鍵 |
| UserID | INT | N | 使用者 |
| YearMonth | CHAR(7) | N | 例 `2026-08`，取自快照日 |
| FileName | NVARCHAR(260) | N | 原始檔名 |
| FileHash | CHAR(64) | N | 檔案位元組 SHA256 |
| ContentHash | CHAR(64) | N | 辨識內容 SHA256 |
| SourceKey | NVARCHAR(100) | Y | 券商-帳號 |
| OrganizationName / AccountName | NVARCHAR(100) | N | 寫入 FIN.Stock 用 |
| SnapshotDate | DATETIME | N | PDF 上的收盤價日期 |
| StockCount | INT | N | 該份筆數 |
| TotalMarketValue / TotalCost | DECIMAL(18,2) | N | 該份合計 |
| SettlementID | INT | Y | 已納入哪次結算 |
| CreatedAt / UpdatedAt | DATETIME | N | 預設 GETDATE() |

限制：`PK_StockPdfImport`、`UQ_StockPdfImport_UserFile (UserID, FileHash)`、索引 `IX_StockPdfImport_UserMonth (UserID, YearMonth)`

## 四、FIN.StockSettlement 欄位

| 欄位 | 型別 | Null | 說明 |
|---|---|---|---|
| SettlementID | INT IDENTITY | N | 主鍵 |
| UserID | INT | N | 使用者 |
| YearMonth | CHAR(7) | N | 結算月份 |
| OrganizationName / AccountName | NVARCHAR(100) | N | 預設「集保」／「集保庫存」 |
| ImportCount / StockCount | INT | N | 納入的存摺份數與庫存筆數 |
| TotalMarketValue / TotalCost | DECIMAL(18,2) | N | 合計 |
| SnapshotDate | DATETIME | N | 寫入 BankAccount 的 CreatedAt |
| SettledAt / UpdatedAt | DATETIME | N | 預設 GETDATE() |

限制：`PK_StockSettlement`、`UQ_StockSettlement_UserMonth (UserID, YearMonth)` ← 重複結算的最後一道防線

## 五、FIN.Stock 異動

新增欄位 `ImportID INT NULL` ＋ 索引 `IX_Stock_ImportID`。

原因：`FIN.Stock` 沒有主鍵，若不記錄來源匯入，就無法只刪除／取代其中一份 PDF 的庫存。舊資料與 CSV 匯入的資料為 NULL，不受影響。

## 六、API

| Method | 路徑 | 說明 |
|---|---|---|
| POST | `/api/finance/stock-pdf/preview` | 只辨識不寫入 |
| POST | `/api/finance/stock-pdf/import` | 辨識並寫入；表單可帶 `password`、`snapshotDate`、`replaceImportId` |
| GET | `/api/finance/stock-pdf/imports?month=yyyy-MM` | 當月清單 + 結算狀態 |
| DELETE | `/api/finance/stock-pdf/imports/{importId}` | 刪除該次匯入與其庫存 |
| POST | `/api/finance/stock-pdf/settle` | body `{ month, organizationName?, accountName?, force }` |

## 七、對應程式

| 層 | 檔案 |
|---|---|
| Model | `Models/StockPdfImport.cs`、`Models/StockSettlement.cs`、`Models/Stock.cs`（新增 `ImportId`） |
| DbContext | `Models/JazzerLifeContext.cs` |
| API | `Endpoints/FinanceStockPdfEndpoints.cs` |
| 前端 | `wwwroot/finance/finance.html`（上傳 → 集保存摺）、`wwwroot/assets/js/finance.js` |

## 八、注意事項

- 結算寫入 `FIN.BankAccount` 前，會先刪除同月同機構同帳戶的既有帳戶列，避免帳戶總覽出現兩筆集保庫存。
- 快照日一律取自 PDF 的收盤價日期，因此同一個月的多份存摺即使抄錄日不同，仍會歸到同一個 `YearMonth`；帳戶的 `CreatedAt` 取當月最後一份存摺的快照日。
- 集保沒有成本資料，`Cost` 沿用同使用者同代號最近一筆；因此 `TotalCost` 在第一次匯入時可能是 0。
