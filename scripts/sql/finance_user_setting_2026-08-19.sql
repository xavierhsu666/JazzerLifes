/*
    FIN.UserSetting：使用者層級的鍵值設定表
    建立日期：2026-08-19
    用途：存放不值得為它單開一張表的個人化設定。
          第一個使用者是「集保存摺 PDF 開啟密碼」（tdcc.pdf.password），
          避免每次上傳集保 PDF 都要手動輸入密碼。

    安全性：密碼類的值一律由後端用 ASP.NET Core Data Protection 加密後才寫入
            SettingValue（欄位存的是密文，不是明文），API 也不會把值回傳給前端，
            只回傳「是否已設定」。詳見 Endpoints/FinanceSettingEndpoints.cs。

    本腳本可重複執行。
*/

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'FIN')
    EXEC('CREATE SCHEMA FIN');
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'UserSetting' AND schema_id = SCHEMA_ID('FIN'))
BEGIN
    CREATE TABLE FIN.UserSetting
    (
        SettingID    INT IDENTITY(1,1) NOT NULL,
        UserID       INT               NOT NULL,
        SettingKey   NVARCHAR(100)     NOT NULL,
        SettingValue NVARCHAR(MAX)     NULL,
        IsEncrypted  BIT               NOT NULL CONSTRAINT DF_UserSetting_IsEncrypted DEFAULT (0),
        CreatedAt    DATETIME          NOT NULL CONSTRAINT DF_UserSetting_CreatedAt DEFAULT (GETDATE()),
        UpdatedAt    DATETIME          NOT NULL CONSTRAINT DF_UserSetting_UpdatedAt DEFAULT (GETDATE()),
        CONSTRAINT PK_UserSetting PRIMARY KEY CLUSTERED (SettingID),
        CONSTRAINT UQ_UserSetting_UserKey UNIQUE (UserID, SettingKey)
    );
END
GO
