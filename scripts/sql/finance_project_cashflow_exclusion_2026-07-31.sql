-- ============================================================
-- 新增 FIN.ProjectCashflowExclusion 資料表
-- 路徑：scripts/sql/finance_project_cashflow_exclusion_2026-07-31.sql
-- 用途：專案管理「現金流」規則命中明細，需要「專案層面的排除」——
--       某筆交易被關鍵字規則命中，但使用者判斷這筆不該算進「這個專案」的現金流時，
--       只把它從這個專案排除，不影響其他專案、也不影響總覽/明細等一般財務報表
--       （不可跟 FIN.Detail.IsExcluded 共用，那是全域排除旗標，語意不同）
-- 執行方式：於 SQL Server Management Studio 對 JazzerLife 資料庫執行
-- 注意：本腳本僅新增 FIN schema 底下的一張新表，不會異動既有資料表
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ProjectCashflowExclusion' AND schema_id = SCHEMA_ID('FIN'))
BEGIN
    CREATE TABLE FIN.ProjectCashflowExclusion (
        ExclusionID INT IDENTITY(1,1) PRIMARY KEY,
        ProjectID   INT      NOT NULL,
        DetailID    INT      NOT NULL,
        CreatedAt   DATETIME NOT NULL CONSTRAINT DF_ProjectCashflowExclusion_CreatedAt DEFAULT (GETDATE()),
        CONSTRAINT UQ_ProjectCashflowExclusion_ProjectDetail UNIQUE (ProjectID, DetailID),
        CONSTRAINT FK_ProjectCashflowExclusion_Project FOREIGN KEY (ProjectID) REFERENCES FIN.Projects (ProjectID),
        CONSTRAINT FK_ProjectCashflowExclusion_Detail FOREIGN KEY (DetailID) REFERENCES FIN.Detail (DetailID)
    );

    CREATE INDEX IX_ProjectCashflowExclusion_ProjectId
        ON FIN.ProjectCashflowExclusion (ProjectID);
END
GO
