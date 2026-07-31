# FIN.Bill 結構備份（新增 BillID 識別欄位）

- **建立日期**：2026-07-31
- **異動類型**：新增 IDENTITY 欄位並設為主鍵，不影響既有資料列內容（既有資料列由 SQL Server 自動依序補上 1,2,3... 的 BillID）
- **對應腳本**：`scripts/sql/finance_bill_add_id_2026-07-31.sql`
- **對應 Model**：`JazzerLifeApi/Models/Bill.cs`（新增 `BillId`）
- **對應 DbContext**：`JazzerLifeApi/Models/JazzerLifeContext.cs` 的 `Entity<Bill>` 設定，原本是 `HasNoKey()`，改為 `HasKey(e => e.BillId)` + 對應到欄位 `BillID`
- **對應 API**：`JazzerLifeApi/Endpoints/FinanceBillEndpoints.cs`
  - `GET /api/finance/bills`：回傳內容新增 `BillId`
  - `POST /api/finance/bills`：回傳內容新增 `billId`
  - `PUT /api/finance/bills/{billId}`：新增，編輯單一帳單（需 `UserId` 相符才能改）
  - `DELETE /api/finance/bills/{billId}`：新增，軟刪除單一帳單（`Activate` 設為 `"0"`，需 `UserId` 相符才能刪）
- **對應前端**：`finance.html`／`assets/js/finance.js`
  - `view-bill-management` 的「新增帳戶」按鈕（`id="btnAddTransaction"`，原本綁定到跟帳單無關的「新增交易」彈窗，且跟「每月支出」頁籤的按鈕共用同一個 id，只有先出現的那個能被抓到）改為專屬的「新增帳單」按鈕（`id="btnAddBill"`）
  - `bill-management` 表格新增「操作」欄（編輯／刪除按鈕），沿用專案管理列表同一套 pinned-right 按鈕欄位寫法

## 背景

帳單管理原本只有「新增」功能，沒有編輯、刪除。往下查資料庫結構才發現 `FIN.Bill` 資料表從一開始就沒有主鍵（EF 設定是 `HasNoKey()`），所以即使要做編輯/刪除功能，也無法精準指定「使用者點的到底是哪一列」——多筆帳單名稱、金額都相同時尤其會出錯。

因此這次先補上 `BillID`（`INT IDENTITY(1,1)`）當主鍵，`ALTER TABLE ADD` 一個 IDENTITY 欄位時 SQL Server 會自動幫既有資料列依序填上 1,2,3...，不需要額外搬資料，才能在上面疊編輯/刪除功能。

## 欄位新增

### FIN.Bill

| 欄位 | 型別 | 說明 |
|---|---|---|
| BillID | INT IDENTITY(1,1) NOT NULL，主鍵 | 帳單識別欄位，供編輯/刪除 API 精準指定單一筆資料 |

## API 端點異動

| 方法 | 路徑 | 說明 |
|---|---|---|
| GET | `/api/finance/bills` | 回傳內容新增 `BillId` 欄位 |
| POST | `/api/finance/bills` | 回傳內容新增 `billId`（新增後的識別碼） |
| PUT | `/api/finance/bills/{billId}` | 新增：編輯單一帳單（專案名稱/帳單名稱/頻率規則/金額/開始日/結束日/備註），需驗證 `UserId` 才能改 |
| DELETE | `/api/finance/bills/{billId}` | 新增：軟刪除單一帳單（`Activate = "0"`，保留歷史資料，不影響過去已展開的每月支出估算），需驗證 `UserId` 才能刪 |

## 部署前置作業

於 SSMS 對 JazzerLife 資料庫執行：

1. `scripts/sql/finance_bill_add_id_2026-07-31.sql`

執行前若 `FIN.Bill` 已經有資料，SQL Server 會自動依 `CreatedAt` 無關的內部順序（實體儲存順序）依序填入 BillID，不影響既有欄位內容；執行後才能部署新版本的 API（否則 EF 查詢 `BillId` 會因資料庫缺少該欄位而報錯）。
