-- ============================================================
-- 新增 FIN.DetailAutoRule / FIN.DetailAutoRuleCondition 資料表
-- 路徑：scripts/sql/finance_detail_auto_rule_2026-08-17.sql
-- 用途：財務明細的「自動分類規則」——依機構名稱／帳戶名稱／分類／標籤／描述／備註／金額
--       等條件比對交易明細，命中後自動設定 分類(Category)、標籤(Tag)、備註(Notes)、
--       排除旗標(IsExcluded)。每條規則可單獨啟用/停用、編輯、刪除、單獨執行，
--       也可整批執行；明細上傳時會對本次新增的明細自動套用一次。
-- 執行方式：於 SQL Server Management Studio 對 JazzerLife 資料庫執行
-- 注意：本腳本僅新增 FIN schema 底下的兩張新表，不會異動既有資料表
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'DetailAutoRule' AND schema_id = SCHEMA_ID('FIN'))
BEGIN
    CREATE TABLE FIN.DetailAutoRule (
        RuleID              INT IDENTITY(1,1) PRIMARY KEY,
        UserID              INT            NOT NULL,
        RuleName            NVARCHAR(100)  NOT NULL,
        -- 執行順序：數字小的先跑。多條規則命中同一筆明細時「依序全部套用，後者覆蓋前者」，
        -- 所以順序決定同一個欄位最後由誰決定
        Priority            INT            NOT NULL CONSTRAINT DF_DetailAutoRule_Priority DEFAULT (0),
        -- 規則開關（使用者可單獨關閉某條規則，但保留設定不刪除）
        IsEnabled           BIT            NOT NULL CONSTRAINT DF_DetailAutoRule_IsEnabled DEFAULT (1),

        -- ---------- 動作區：欄位為 NULL 代表這條規則不碰這個欄位 ----------
        -- Mode：'overwrite'（一律覆寫）／'fillEmpty'（僅在原值為空時填入）／'append'（附加，僅 Tag/Notes 適用）
        -- 長度刻意對齊 FIN.Detail 的目標欄位（Category 50 / Tag 50 / Notes 255），
        -- 避免規則存得下、套用時卻寫不進明細而被截斷
        ActionCategory      NVARCHAR(50)   NULL,
        ActionCategoryMode  NVARCHAR(20)   NULL,
        ActionTag           NVARCHAR(50)   NULL,
        ActionTagMode       NVARCHAR(20)   NULL,
        ActionNotes         NVARCHAR(255)  NULL,
        ActionNotesMode     NVARCHAR(20)   NULL,
        -- NULL = 不動排除旗標；1 = 設為排除；0 = 設為不排除
        ActionIsExcluded    BIT            NULL,
        -- NULL = 不動；0 = 把明細停用（等同舊 SP 的 set Activate=0，軟刪除，所有查詢都不會再撈到）；1 = 還原啟用
        ActionActivate      BIT            NULL,

        -- 軟刪除旗標（比照 FIN.Projects / FIN.Bill 的慣例，刪除不真的移除資料列）
        Activate            BIT            NOT NULL CONSTRAINT DF_DetailAutoRule_Activate DEFAULT (1),
        LastRunAt           DATETIME       NULL,
        CreatedAt           DATETIME       NOT NULL CONSTRAINT DF_DetailAutoRule_CreatedAt DEFAULT (GETDATE()),
        UpdatedAt           DATETIME       NOT NULL CONSTRAINT DF_DetailAutoRule_UpdatedAt DEFAULT (GETDATE())
    );

    CREATE INDEX IX_DetailAutoRule_UserId
        ON FIN.DetailAutoRule (UserID, Activate, Priority);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'DetailAutoRuleCondition' AND schema_id = SCHEMA_ID('FIN'))
BEGIN
    CREATE TABLE FIN.DetailAutoRuleCondition (
        ConditionID INT IDENTITY(1,1) PRIMARY KEY,
        RuleID      INT            NOT NULL,
        -- 比對欄位：organizationName / accountName / category / tag / description / notes / amount
        Field       NVARCHAR(30)   NOT NULL,
        -- 文字運算子：contains / notContains / equals / startsWith / isEmpty / isNotEmpty
        -- 金額運算子：gt / gte / lt / lte / between / isIncome / isExpense
        Operator    NVARCHAR(20)   NOT NULL,
        -- 文字欄位可用逗號分隔多個值，同一個條件內視為 OR（例：「星巴克,路易莎」）
        Value       NVARCHAR(500)  NULL,
        -- between 用的第二個值；其他運算子不使用
        Value2      NVARCHAR(100)  NULL,
        SortOrder   INT            NOT NULL CONSTRAINT DF_DetailAutoRuleCondition_SortOrder DEFAULT (0),
        CreatedAt   DATETIME       NOT NULL CONSTRAINT DF_DetailAutoRuleCondition_CreatedAt DEFAULT (GETDATE()),
        CONSTRAINT FK_DetailAutoRuleCondition_Rule FOREIGN KEY (RuleID)
            REFERENCES FIN.DetailAutoRule (RuleID) ON DELETE CASCADE
    );

    CREATE INDEX IX_DetailAutoRuleCondition_RuleId
        ON FIN.DetailAutoRuleCondition (RuleID);
END
GO

-- 補件：ActionActivate 是本腳本第一版之後才加的欄位。
-- 若你已經執行過舊版腳本（表已存在但沒有這個欄位），這段會把欄位補上；全新建立則不會有動作
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'DetailAutoRule' AND schema_id = SCHEMA_ID('FIN'))
   AND NOT EXISTS (SELECT 1 FROM sys.columns
                   WHERE object_id = OBJECT_ID('FIN.DetailAutoRule') AND name = 'ActionActivate')
BEGIN
    ALTER TABLE FIN.DetailAutoRule ADD ActionActivate BIT NULL;
END
GO
