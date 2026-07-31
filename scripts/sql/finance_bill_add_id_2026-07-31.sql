-- ============================================================
-- FIN.Bill 異動：新增 BillID 識別欄位（IDENTITY 主鍵）
-- 路徑：scripts/sql/finance_bill_add_id_2026-07-31.sql
-- 背景：帳單管理原本只有「新增」功能，FIN.Bill 資料表也一直是 HasNoKey()（無主鍵），
--       導致「編輯單一帳單」「刪除單一帳單」都無法精準指定是哪一筆資料列。
--       這次補上 BillID IDENTITY 欄位並設為主鍵，供 FinanceBillEndpoints 的
--       PUT /api/finance/bills/{billId}、DELETE /api/finance/bills/{billId} 使用。
-- 執行方式：於 SQL Server Management Studio 對 JazzerLife 資料庫執行
-- 注意：
--   1) ALTER TABLE ADD 一個 IDENTITY 欄位時，SQL Server 會自動幫既有資料列依序補上
--      1,2,3...的值，不需要額外的資料搬移步驟。
--   2) 本腳本可重複執行（皆有 IF NOT EXISTS 防呆），不會對已經跑過的環境重複套用。
-- ============================================================

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'FIN' AND TABLE_NAME = 'Bill' AND COLUMN_NAME = 'BillID'
)
BEGIN
    ALTER TABLE FIN.Bill ADD BillID INT IDENTITY(1,1) NOT NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.key_constraints
    WHERE name = 'PK_Bill_BillID' AND parent_object_id = OBJECT_ID('FIN.Bill')
)
BEGIN
    ALTER TABLE FIN.Bill ADD CONSTRAINT PK_Bill_BillID PRIMARY KEY (BillID);
END
GO
