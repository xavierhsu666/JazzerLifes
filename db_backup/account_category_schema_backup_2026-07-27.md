# FIN.AccountCategory 結構備份

- **建立日期**：2026-07-27
- **異動類型**：新增（FIN schema 底下新增一張表，不影響既有資料表）
- **對應腳本**：`scripts/sql/account_category_schema.sql`
- **對應 Model**：`JazzerLifeApi/Models/AccountCategory.cs`
- **對應 DbContext 變更**：`JazzerLifeApi/Models/JazzerLifeContext.cs` 新增 `DbSet<AccountCategory> AccountCategories`，並在 `OnModelCreating` 新增對應設定
- **對應 API**：`JazzerLifeApi/Endpoints/FinanceAccountCategoryEndpoints.cs`
- **對應前端頁面**：`finance.html` / `finance.js` 的「設定 > 帳戶分類」頁籤

## 功能說明

讓使用者把「銀行 + 帳戶」對應到自訂分類（例如：手動新增 + 新豐 -> 資產）。分類名稱**沒有獨立主檔表**，
採「使用者用過什麼分類，之後就能在下拉選單被建議」的簡單做法：新分類第一次建立時直接寫進
`AccountCategory.Category` 欄位，之後 API 會查詢該使用者已經用過的所有 distinct 分類名稱做為建議清單。

一個「銀行 + 帳戶」目前只允許對應到一個分類（`UNIQUE (UserID, OrganizationName, AccountName)`）。

## 資料表結構

### FIN.AccountCategory（帳戶分類對應）

| 欄位 | 型別 | 說明 |
|---|---|---|
| AccountCategoryID | INT IDENTITY PK | |
| UserID | INT NOT NULL | 沒有額外的 FK 約束（比照 FIN.BankAccount 目前也沒有對 User 的 FK），僅在應用層以 ClaimsPrincipal 的使用者 ID 過濾 |
| OrganizationName | NVARCHAR(100) | 銀行/機構名稱，需與 FIN.BankAccount.OrganizationName 對應 |
| AccountName | NVARCHAR(100) | 帳戶名稱，需與 FIN.BankAccount.AccountName 對應 |
| Category | NVARCHAR(50) | 分類名稱（使用者自訂，無主檔） |
| CreatedAt / UpdatedAt | DATETIME DEFAULT GETDATE() | |

UNIQUE (UserID, OrganizationName, AccountName)；INDEX (UserID, Category)

## API 端點

| 方法 | 路徑 | 說明 |
|---|---|---|
| GET | `/api/finance/account-categories` | 列出使用者所有帳戶（來自 FIN.BankAccount 去重）與目前分類（若尚未設定則為 null） |
| GET | `/api/finance/account-categories/options` | 列出使用者已經用過的分類名稱（給前端下拉選單建議用） |
| PUT | `/api/finance/account-categories` | 新增/更新（或清除，當 Category 為空字串時）某個帳戶的分類 |

## 前端影響範圍

- 新增「設定」功能區底下第一個頁籤「帳戶分類」，可為每個帳戶指定/新增分類。
- 「總覽 > 資產」頁面新增「依分類資產分布」小表格：純前端把 `/api/finance/accounts`（最新月份餘額）
  與 `/api/finance/account-categories`（分類對應）在瀏覽器端 join 後分組加總顯示。

> **2026-08-19 更新**：原本「資產/負債/淨資產」是用帳戶餘額正負號判斷，與這裡的自訂分類互不相干；
> 現已改為**以本表的分類為準**（`FinanceOverviewEndpoints`）：分類名稱含「負債」計為負債、含「資產」
> 計為資產，其餘分類與未設定分類的帳戶都不計入，未計入的筆數與金額會回傳前端提示。
> 因此本表的分類設定直接影響總覽的資產統計，設定頁上也加了對應備註。
