-- ============================================================
-- 總體經濟溫度計模組（MACRO）資料表建置腳本
-- 路徑：scripts/sql/macro_schema.sql
-- 用途：新增 MACRO schema 與四張資料表，供 EconIndicatorEndpoints /
--       EconDataSyncRunner / Hangfire 排程使用
-- 執行方式：於 SQL Server Management Studio 對 JazzerLife 資料庫執行
-- 注意：本腳本僅新增物件，不會異動 CarMan / FIN / MEM 既有 schema
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'MACRO')
BEGIN
    EXEC('CREATE SCHEMA MACRO');
END
GO

-- ------------------------------------------------------------
-- 1. 指標定義表：紀錄每個總經指標的中繼資料
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EconIndicator' AND schema_id = SCHEMA_ID('MACRO'))
BEGIN
    CREATE TABLE MACRO.EconIndicator (
        IndicatorId      INT IDENTITY(1,1) PRIMARY KEY,
        Code             NVARCHAR(50)  NOT NULL,
        Name             NVARCHAR(100) NOT NULL,
        Country          NVARCHAR(10)  NOT NULL,       -- TW / US
        Category         NVARCHAR(50)  NULL,           -- 物價/就業/生產/景氣/利率/貿易
        Unit             NVARCHAR(20)  NULL,           -- %、指數、分、千人
        Source           NVARCHAR(50)  NOT NULL,       -- TW_GOV / FRED
        SourceSeriesId   NVARCHAR(50)  NULL,           -- FRED 指標代碼（台灣官方資料為 NULL）
        Frequency        NVARCHAR(20)  NOT NULL,       -- Monthly / Quarterly / Daily
        IsActive         BIT           NOT NULL CONSTRAINT DF_EconIndicator_IsActive DEFAULT (1),
        CreatedAt        DATETIME      NOT NULL CONSTRAINT DF_EconIndicator_CreatedAt DEFAULT (GETDATE()),
        UpdatedAt        DATETIME      NOT NULL CONSTRAINT DF_EconIndicator_UpdatedAt DEFAULT (GETDATE()),
        CONSTRAINT UQ_EconIndicator_Code UNIQUE (Code)
    );
END
GO

-- ------------------------------------------------------------
-- 2. 指標時序資料表：每個指標每期一筆數值
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EconIndicatorValue' AND schema_id = SCHEMA_ID('MACRO'))
BEGIN
    CREATE TABLE MACRO.EconIndicatorValue (
        ValueId       BIGINT IDENTITY(1,1) PRIMARY KEY,
        IndicatorId   INT           NOT NULL,
        PeriodDate    DATE          NOT NULL,          -- 該期別代表日（月頻取當月1日）
        Value         DECIMAL(18,4) NOT NULL,
        ReleaseDate   DATE          NULL,               -- 官方公告日期
        CreatedAt     DATETIME      NOT NULL CONSTRAINT DF_EconIndicatorValue_CreatedAt DEFAULT (GETDATE()),
        UpdatedAt     DATETIME      NOT NULL CONSTRAINT DF_EconIndicatorValue_UpdatedAt DEFAULT (GETDATE()),
        CONSTRAINT FK_EconIndicatorValue_Indicator FOREIGN KEY (IndicatorId)
            REFERENCES MACRO.EconIndicator (IndicatorId),
        CONSTRAINT UQ_EconIndicatorValue_IndicatorPeriod UNIQUE (IndicatorId, PeriodDate)
    );

    CREATE INDEX IX_EconIndicatorValue_IndicatorPeriod
        ON MACRO.EconIndicatorValue (IndicatorId, PeriodDate DESC);
END
GO

-- ------------------------------------------------------------
-- 3. 示警規則表：使用者自訂門檻（第一期即需要）
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EconAlertRule' AND schema_id = SCHEMA_ID('MACRO'))
BEGIN
    CREATE TABLE MACRO.EconAlertRule (
        RuleId          INT IDENTITY(1,1) PRIMARY KEY,
        UserId          INT           NOT NULL,
        IndicatorId     INT           NOT NULL,
        Operator        NVARCHAR(5)   NOT NULL,        -- >, >=, <, <=
        Threshold       DECIMAL(18,4) NOT NULL,
        IsActive        BIT           NOT NULL CONSTRAINT DF_EconAlertRule_IsActive DEFAULT (1),
        LastTriggeredAt DATETIME      NULL,
        CreatedAt       DATETIME      NOT NULL CONSTRAINT DF_EconAlertRule_CreatedAt DEFAULT (GETDATE()),
        UpdatedAt       DATETIME      NOT NULL CONSTRAINT DF_EconAlertRule_UpdatedAt DEFAULT (GETDATE()),
        CONSTRAINT FK_EconAlertRule_User FOREIGN KEY (UserId)
            REFERENCES MEM.Users (UserID),
        CONSTRAINT FK_EconAlertRule_Indicator FOREIGN KEY (IndicatorId)
            REFERENCES MACRO.EconIndicator (IndicatorId),
        CONSTRAINT CK_EconAlertRule_Operator CHECK (Operator IN ('>', '>=', '<', '<='))
    );

    CREATE INDEX IX_EconAlertRule_UserId ON MACRO.EconAlertRule (UserId);
END
GO

-- ------------------------------------------------------------
-- 4. 示警觸發紀錄表
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EconAlertLog' AND schema_id = SCHEMA_ID('MACRO'))
BEGIN
    CREATE TABLE MACRO.EconAlertLog (
        LogId        BIGINT IDENTITY(1,1) PRIMARY KEY,
        RuleId       INT           NOT NULL,
        TriggeredAt  DATETIME      NOT NULL CONSTRAINT DF_EconAlertLog_TriggeredAt DEFAULT (GETDATE()),
        Value        DECIMAL(18,4) NOT NULL,
        Message      NVARCHAR(255) NOT NULL,
        IsRead       BIT           NOT NULL CONSTRAINT DF_EconAlertLog_IsRead DEFAULT (0),
        CONSTRAINT FK_EconAlertLog_Rule FOREIGN KEY (RuleId)
            REFERENCES MACRO.EconAlertRule (RuleId)
    );

    CREATE INDEX IX_EconAlertLog_RuleId ON MACRO.EconAlertLog (RuleId);
END
GO

-- ------------------------------------------------------------
-- 5. 指標清單種子資料（台灣 7 項 + 美國 8 項）
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM MACRO.EconIndicator WHERE Code = 'TW_CPI_YOY')
BEGIN
    INSERT INTO MACRO.EconIndicator (Code, Name, Country, Category, Unit, Source, SourceSeriesId, Frequency) VALUES
    ('TW_CPI_YOY',          N'CPI年增率',           'TW', N'物價', '%',   'TW_GOV', NULL,               'Monthly'),
    ('TW_CORE_CPI_YOY',     N'核心CPI年增率',       'TW', N'物價', '%',   'TW_GOV', NULL,               'Monthly'),
    ('TW_UNEMPLOYMENT',     N'失業率',              'TW', N'就業', '%',   'TW_GOV', NULL,               'Monthly'),
    ('TW_PPI_YOY',          N'PPI年增率',           'TW', N'生產', '%',   'TW_GOV', NULL,               'Monthly'),
    ('TW_BUSINESS_SIGNAL',  N'景氣對策信號燈分數', 'TW', N'景氣', N'分', 'TW_GOV', NULL,               'Monthly'),
    ('TW_GDP_YOY',          N'GDP成長率',           'TW', N'景氣', '%',   'TW_GOV', NULL,               'Quarterly'),
    ('TW_EXPORT_ORDERS_YOY',N'外銷訂單年增率',      'TW', N'貿易', '%',   'TW_GOV', NULL,               'Monthly'),
    ('US_CPI',              'CPI',                   'US', N'物價', N'指數','FRED',   'CPIAUCSL',          'Monthly'),
    ('US_CORE_CPI',         N'核心CPI',              'US', N'物價', N'指數','FRED',   'CPILFESL',          'Monthly'),
    ('US_UNRATE',           N'失業率',               'US', N'就業', '%',   'FRED',   'UNRATE',            'Monthly'),
    ('US_PPI',              'PPI',                   'US', N'生產', N'指數','FRED',   'PPIACO',            'Monthly'),
    ('US_PAYEMS',           N'非農就業人數',         'US', N'就業', N'千人','FRED',   'PAYEMS',            'Monthly'),
    ('US_FEDFUNDS',         N'聯邦基金利率',         'US', N'利率', '%',   'FRED',   'FEDFUNDS',          'Monthly'),
    ('US_DGS10',            N'10年期公債殖利率',     'US', N'利率', '%',   'FRED',   'DGS10',             'Daily'),
    ('US_GDP_YOY',          N'GDP成長率',            'US', N'景氣', '%',   'FRED',   'A191RL1Q225SBEA',   'Quarterly');
END
GO
