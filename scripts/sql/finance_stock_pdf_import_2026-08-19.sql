/*
    集保存摺 PDF 月結流程用資料表
    建立日期：2026-08-19

    情境：每月結帳時上傳多份股票庫存 PDF（每家券商一份），全部辨識完成後按「結算」，
          把當月所有庫存合併成一筆 FIN.BankAccount（集保／集保庫存）供資產管理使用。

    兩張新表：
      FIN.StockPdfImport  — 每次 PDF 匯入的紀錄，用來防止重複上傳、支援刪除／取代單一份 PDF
      FIN.StockSettlement — 每月結算紀錄，(UserID, YearMonth) 唯一，用來防止同月重複結算

    另外在 FIN.Stock 增加 ImportID 欄位，讓每筆庫存知道自己是哪一次匯入寫進來的，
    才有辦法只刪除／取代其中一份 PDF 的資料（FIN.Stock 本身沒有主鍵）。

    本腳本可重複執行。
*/

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'FIN')
    EXEC('CREATE SCHEMA FIN');
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'StockSettlement' AND schema_id = SCHEMA_ID('FIN'))
BEGIN
    CREATE TABLE FIN.StockSettlement
    (
        SettlementID     INT IDENTITY(1,1) NOT NULL,
        UserID           INT               NOT NULL,
        YearMonth        CHAR(7)           NOT NULL,  -- 例：2026-08
        OrganizationName NVARCHAR(100)     NOT NULL,
        AccountName      NVARCHAR(100)     NOT NULL,
        ImportCount      INT               NOT NULL CONSTRAINT DF_StockSettlement_ImportCount DEFAULT (0),
        StockCount       INT               NOT NULL CONSTRAINT DF_StockSettlement_StockCount DEFAULT (0),
        TotalMarketValue DECIMAL(18,2)     NOT NULL CONSTRAINT DF_StockSettlement_TotalMarketValue DEFAULT (0),
        TotalCost        DECIMAL(18,2)     NOT NULL CONSTRAINT DF_StockSettlement_TotalCost DEFAULT (0),
        SnapshotDate     DATETIME          NOT NULL,  -- 寫進 BankAccount 的 CreatedAt，決定帳戶落在哪個月
        SettledAt        DATETIME          NOT NULL CONSTRAINT DF_StockSettlement_SettledAt DEFAULT (GETDATE()),
        UpdatedAt        DATETIME          NOT NULL CONSTRAINT DF_StockSettlement_UpdatedAt DEFAULT (GETDATE()),
        CONSTRAINT PK_StockSettlement PRIMARY KEY CLUSTERED (SettlementID),
        CONSTRAINT UQ_StockSettlement_UserMonth UNIQUE (UserID, YearMonth)   -- 同月只會有一筆，重複結算由此擋下
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'StockPdfImport' AND schema_id = SCHEMA_ID('FIN'))
BEGIN
    CREATE TABLE FIN.StockPdfImport
    (
        ImportID         INT IDENTITY(1,1) NOT NULL,
        UserID           INT               NOT NULL,
        YearMonth        CHAR(7)           NOT NULL,
        FileName         NVARCHAR(260)     NOT NULL,
        FileHash         CHAR(64)          NOT NULL,  -- 檔案位元組的 SHA256，完全相同的檔案直接擋掉
        ContentHash      CHAR(64)          NOT NULL,  -- 辨識結果（代號:股數 排序後）的 SHA256，換檔名或重新下載也抓得到
        SourceKey        NVARCHAR(100)     NULL,      -- 從 PDF 內文抓到的券商／帳號，用來判斷是不是同一份的更新版
        OrganizationName NVARCHAR(100)     NOT NULL,
        AccountName      NVARCHAR(100)     NOT NULL,
        SnapshotDate     DATETIME          NOT NULL,
        StockCount       INT               NOT NULL CONSTRAINT DF_StockPdfImport_StockCount DEFAULT (0),
        TotalMarketValue DECIMAL(18,2)     NOT NULL CONSTRAINT DF_StockPdfImport_TotalMarketValue DEFAULT (0),
        TotalCost        DECIMAL(18,2)     NOT NULL CONSTRAINT DF_StockPdfImport_TotalCost DEFAULT (0),
        SettlementID     INT               NULL,      -- 已被納入哪一次結算；NULL 表示尚未結算
        CreatedAt        DATETIME          NOT NULL CONSTRAINT DF_StockPdfImport_CreatedAt DEFAULT (GETDATE()),
        UpdatedAt        DATETIME          NOT NULL CONSTRAINT DF_StockPdfImport_UpdatedAt DEFAULT (GETDATE()),
        CONSTRAINT PK_StockPdfImport PRIMARY KEY CLUSTERED (ImportID),
        CONSTRAINT UQ_StockPdfImport_UserFile UNIQUE (UserID, FileHash)      -- 同一個檔案不會被匯入兩次
    );

    CREATE INDEX IX_StockPdfImport_UserMonth ON FIN.StockPdfImport (UserID, YearMonth);
END
GO

-- FIN.Stock 增加 ImportID，用來對應是哪一次 PDF 匯入寫入的資料（舊資料為 NULL，不受影響）
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('FIN.Stock') AND name = 'ImportID')
BEGIN
    ALTER TABLE FIN.Stock ADD ImportID INT NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Stock_ImportID' AND object_id = OBJECT_ID('FIN.Stock'))
BEGIN
    CREATE INDEX IX_Stock_ImportID ON FIN.Stock (ImportID);
END
GO
