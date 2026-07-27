-- ============================================================
-- 帳戶分類（FIN.AccountCategory）資料表建置腳本
-- 路徑：scripts/sql/account_category_schema.sql
-- 用途：讓使用者把「銀行+帳戶」對應到自訂分類（例如：手動新增+新豐 -> 資產），
--       供 FinanceAccountCategoryEndpoints 及前端「設定 > 帳戶分類」頁面使用
-- 執行方式：於 SQL Server Management Studio 對 JazzerLife 資料庫執行
-- 注意：本腳本僅新增 FIN schema 底下的一張新表，不會異動既有資料表
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'AccountCategory' AND schema_id = SCHEMA_ID('FIN'))
BEGIN
    CREATE TABLE FIN.AccountCategory (
        AccountCategoryID INT IDENTITY(1,1) PRIMARY KEY,
        UserID            INT           NOT NULL,
        OrganizationName  NVARCHAR(100) NOT NULL,
        AccountName       NVARCHAR(100) NOT NULL,
        Category          NVARCHAR(50)  NOT NULL,       -- 分類名稱，無獨立主檔，由使用者自訂/沿用之前用過的名稱
        CreatedAt         DATETIME      NOT NULL CONSTRAINT DF_AccountCategory_CreatedAt DEFAULT (GETDATE()),
        UpdatedAt         DATETIME      NOT NULL CONSTRAINT DF_AccountCategory_UpdatedAt DEFAULT (GETDATE()),
        CONSTRAINT UQ_AccountCategory_UserOrgAccount UNIQUE (UserID, OrganizationName, AccountName)
    );

    CREATE INDEX IX_AccountCategory_UserCategory
        ON FIN.AccountCategory (UserID, Category);
END
GO
