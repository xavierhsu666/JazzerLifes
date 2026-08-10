-- ============================================================
-- 財務專案 - 新增「現金流是否計入上月實際資產」設定
-- 路徑：scripts/sql/finance_project_include_cashflow_2026-08-10.sql
-- 用途：
--   FIN.Projects 新增 IncludeCashflowInActualAsset 欄位，供專案詳情頁的「基礎資訊」勾選。
--
--   背景：專案摘要列表的「上月實際資產」目前只加總「資產流」子系統綁定帳戶中，
--   帳戶分類被標成「資產」的餘額。但有些專案（例如房租收入型）的成果主要反映在現金流上，
--   不會進到綁定帳戶的餘額裡，導致達成率被低估。勾選本設定後，會把該專案現金流
--   命中明細的累計淨額一併加進「上月實際資產」。
--
--   累計範圍：只加總「交易日期 <= 資產流最新綁定月份的月底」的命中明細，
--   與資產快照的時間點對齊；晚於該月份的交易不計入（避免把未來的錢算進過去的快照）。
--
-- 執行方式：於 SQL Server Management Studio 對 JazzerLife 資料庫執行
-- 注意：本腳本可重複執行，已存在的欄位不會重複新增
-- 預設值：0（不計入），維持既有專案的行為不變
-- ============================================================

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('FIN.Projects') AND name = 'IncludeCashflowInActualAsset'
)
BEGIN
    ALTER TABLE FIN.Projects
        ADD IncludeCashflowInActualAsset BIT NOT NULL
            CONSTRAINT DF_Projects_IncludeCashflowInActualAsset DEFAULT (0);
END
GO
