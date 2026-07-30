-- ============================================================
-- 交易紀錄（TRADING schema）資料表建置腳本
-- 路徑：scripts/sql/trading_schema.sql
-- 用途：新增「交易紀錄與覆盤分析」功能模組，共 2 張表：
--       TRADING.StrategyTag（策略標籤主檔）/ TRADING.Trade（交易主表）
--       供 TradeEndpoints / StrategyTagEndpoints / TradeImportEndpoints / TradeAnalysisEndpoints
--       及前端 trading.html 使用
-- 執行方式：於 SQL Server Management Studio 對 JazzerLife 資料庫執行
-- 注意：本腳本僅新增 TRADING schema 底下的兩張新表，不會異動既有資料表
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'TRADING')
BEGIN
    EXEC('CREATE SCHEMA TRADING');
END
GO

-- 策略標籤主檔（下拉選單用，比照 RENT.Room 的軟刪除慣例：停用不顯示但保留歷史交易的關聯）
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'StrategyTag' AND schema_id = SCHEMA_ID('TRADING'))
BEGIN
    CREATE TABLE TRADING.StrategyTag (
        StrategyTagID INT IDENTITY(1,1) PRIMARY KEY,
        UserID        INT           NOT NULL,
        Name          NVARCHAR(50)  NOT NULL,
        SortOrder     INT           NOT NULL CONSTRAINT DF_StrategyTag_SortOrder DEFAULT (0),
        IsActive      BIT           NOT NULL CONSTRAINT DF_StrategyTag_IsActive DEFAULT (1),
        CreatedAt     DATETIME      NOT NULL CONSTRAINT DF_StrategyTag_CreatedAt DEFAULT (GETDATE()),
        UpdatedAt     DATETIME      NOT NULL CONSTRAINT DF_StrategyTag_UpdatedAt DEFAULT (GETDATE())
    );

    -- 同一使用者底下標籤名稱不可重複，避免下拉選單出現重複選項
    CREATE UNIQUE INDEX UQ_StrategyTag_UserName ON TRADING.StrategyTag (UserID, Name);
END
GO

-- 交易主表：一筆代表一次完整的進場+出場（已配對好的交易），而非原始的逐筆訂單列
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Trade' AND schema_id = SCHEMA_ID('TRADING'))
BEGIN
    CREATE TABLE TRADING.Trade (
        TradeID          INT IDENTITY(1,1) PRIMARY KEY,
        UserID           INT            NOT NULL,
        Symbol           NVARCHAR(20)   NOT NULL,
        -- 方向：Buy(做多) / Sell(做空)，依開倉當下的買賣別決定，不是平倉那筆的方向
        Direction        NVARCHAR(10)   NOT NULL,
        Volume           DECIMAL(18,4)  NOT NULL CONSTRAINT DF_Trade_Volume DEFAULT (0),
        EntryTime        DATETIME       NOT NULL,
        -- 允許為 NULL：保留未來「未平倉部位」也能先建檔的彈性，目前 v1 匯入僅處理已平倉交易
        ExitTime         DATETIME       NULL,
        -- cTrader Position History List 報表本身不含價格（Open Price 恒為 0），
        -- 故此兩欄允許 NULL；有搭配 TradingView 訂單資料且時間對得上時才會補上實際成交價
        EntryPrice       DECIMAL(18,6)  NULL,
        ExitPrice        DECIMAL(18,6)  NULL,
        -- 損益金額，直接採用來源報表提供的淨值（假設已含手續費/庫存費，不再另外拆分成本欄位）
        Profit           DECIMAL(18,2)  NOT NULL CONSTRAINT DF_Trade_Profit DEFAULT (0),
        -- 資料來源：ICMarkets（cTrader Position History）/ TradingView / Manual（手動輸入）
        Source           NVARCHAR(20)   NOT NULL,
        -- 來源報表的部位編號（如 cTrader Position 欄位），僅用於同來源重複匯入時比對防呆，
        -- 不同來源之間的編號不保證可互相對應（cTrader Position ID 與 TradingView 訂單 ID 是不同的流水號）
        BrokerPositionId NVARCHAR(50)   NULL,
        StrategyTagID    INT            NULL,
        -- 進出場理由／事後檢討心得，手動輸入與匯入資料都可事後補寫
        Note             NVARCHAR(1000) NULL,
        -- 匯入時若同一部位編號出現超過 2 筆訂單列（例如加碼/減碼），無法簡單配對成單筆交易，
        -- 先照商品+時間先後配對出一筆估計值，並標記需要人工檢查，不擋住整批匯入
        NeedsReview      BIT            NOT NULL CONSTRAINT DF_Trade_NeedsReview DEFAULT (0),
        CreatedAt        DATETIME       NOT NULL CONSTRAINT DF_Trade_CreatedAt DEFAULT (GETDATE()),
        UpdatedAt        DATETIME       NOT NULL CONSTRAINT DF_Trade_UpdatedAt DEFAULT (GETDATE()),
        CONSTRAINT FK_Trade_StrategyTag FOREIGN KEY (StrategyTagID) REFERENCES TRADING.StrategyTag (StrategyTagID)
    );

    CREATE INDEX IX_Trade_UserID_EntryTime ON TRADING.Trade (UserID, EntryTime);
    CREATE INDEX IX_Trade_UserID_Symbol ON TRADING.Trade (UserID, Symbol);

    -- 防止同一份 cTrader/TradingView 報表被重複匯入造成重複交易紀錄：
    -- 用 Filtered Unique Index（只約束 BrokerPositionId 有值的列），手動輸入（Manual，恒為 NULL）不受影響
    CREATE UNIQUE INDEX UQ_Trade_User_Source_BrokerPositionId
        ON TRADING.Trade (UserID, Source, BrokerPositionId)
        WHERE BrokerPositionId IS NOT NULL;
END
GO
