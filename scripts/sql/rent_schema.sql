-- ============================================================
-- 租屋處電費管理（RENT schema）資料表建置腳本
-- 路徑：scripts/sql/rent_schema.sql
-- 用途：新增「租屋處電費計算」功能模組，共 3 張表：
--       RENT.Property（出租物件）/ RENT.Room（房間設定）/ RENT.RoomBill（月度帳單）
--       供 RentPropertyEndpoints / RentRoomEndpoints / RentBillEndpoints 及前端 rent.html 使用
-- 執行方式：於 SQL Server Management Studio 對 JazzerLife 資料庫執行
-- 注意：本腳本僅新增 RENT schema 底下的三張新表，不會異動既有資料表
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'RENT')
BEGIN
    EXEC('CREATE SCHEMA RENT');
END
GO

-- 出租物件（一組房間清單的容器，未來可支援多個出租地址）
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Property' AND schema_id = SCHEMA_ID('RENT'))
BEGIN
    CREATE TABLE RENT.Property (
        PropertyID   INT IDENTITY(1,1) PRIMARY KEY,
        UserID       INT           NOT NULL,
        PropertyName NVARCHAR(100) NOT NULL,
        Address      NVARCHAR(200) NULL,
        IsActive     BIT           NOT NULL CONSTRAINT DF_RentProperty_IsActive DEFAULT (1),
        CreatedAt    DATETIME      NOT NULL CONSTRAINT DF_RentProperty_CreatedAt DEFAULT (GETDATE()),
        UpdatedAt    DATETIME      NOT NULL CONSTRAINT DF_RentProperty_UpdatedAt DEFAULT (GETDATE())
    );

    CREATE INDEX IX_RentProperty_UserID ON RENT.Property (UserID);
END
GO

-- 房間設定（Tab2：房間數／別名／房租／每度電費／彈性調整金額）
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Room' AND schema_id = SCHEMA_ID('RENT'))
BEGIN
    CREATE TABLE RENT.Room (
        RoomID           INT IDENTITY(1,1) PRIMARY KEY,
        PropertyID       INT            NOT NULL,
        RoomAlias        NVARCHAR(50)   NOT NULL,
        MonthlyRent      DECIMAL(18,2)  NOT NULL CONSTRAINT DF_RentRoom_MonthlyRent DEFAULT (0),
        -- 每度電費用 DECIMAL(18,4)：部分電價（如台電累進費率換算後）會有到小數點後 2~4 位的單價
        ElectricityRate  DECIMAL(18,4)  NOT NULL CONSTRAINT DF_RentRoom_ElectricityRate DEFAULT (0),
        -- 彈性調整金額：可正可負，正數代表加收（如水費/清潔費），負數代表折抵，作為每月帳單的預設值
        AdjustmentAmount DECIMAL(18,2)  NOT NULL CONSTRAINT DF_RentRoom_AdjustmentAmount DEFAULT (0),
        SortOrder        INT            NOT NULL CONSTRAINT DF_RentRoom_SortOrder DEFAULT (0),
        -- 軟刪除／退租標記：停用後 Tab1 不再列出，但保留歷史帳單紀錄不受影響
        IsActive         BIT            NOT NULL CONSTRAINT DF_RentRoom_IsActive DEFAULT (1),
        CreatedAt        DATETIME       NOT NULL CONSTRAINT DF_RentRoom_CreatedAt DEFAULT (GETDATE()),
        UpdatedAt        DATETIME       NOT NULL CONSTRAINT DF_RentRoom_UpdatedAt DEFAULT (GETDATE()),
        CONSTRAINT FK_RentRoom_Property FOREIGN KEY (PropertyID) REFERENCES RENT.Property (PropertyID)
    );

    CREATE INDEX IX_RentRoom_PropertyID ON RENT.Room (PropertyID);
END
GO

-- 月度帳單（Tab1：每房每月一筆，建立當下把房租/電價/調整金額寫死存入快照，
-- 之後調整房間設定不會影響已產生的歷史月份金額）
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'RoomBill' AND schema_id = SCHEMA_ID('RENT'))
BEGIN
    CREATE TABLE RENT.RoomBill (
        BillID             INT IDENTITY(1,1) PRIMARY KEY,
        RoomID             INT            NOT NULL,
        BillMonth          DATE           NOT NULL,  -- 存當月 1 號，例如 2026-07-01
        PrevReading        DECIMAL(18,2)  NOT NULL CONSTRAINT DF_RentRoomBill_PrevReading DEFAULT (0),
        CurrentReading     DECIMAL(18,2)  NOT NULL CONSTRAINT DF_RentRoomBill_CurrentReading DEFAULT (0),
        -- 用電度數：由 API 計算 (CurrentReading - PrevReading) 後寫入，非 SQL 計算欄位，
        -- 保留手動覆蓋的彈性（例如電表換表歸零等特殊狀況）
        UsageUnits         DECIMAL(18,2)  NOT NULL CONSTRAINT DF_RentRoomBill_UsageUnits DEFAULT (0),
        RentSnapshot       DECIMAL(18,2)  NOT NULL CONSTRAINT DF_RentRoomBill_RentSnapshot DEFAULT (0),
        RateSnapshot       DECIMAL(18,4)  NOT NULL CONSTRAINT DF_RentRoomBill_RateSnapshot DEFAULT (0),
        AdjustmentSnapshot DECIMAL(18,2)  NOT NULL CONSTRAINT DF_RentRoomBill_AdjustmentSnapshot DEFAULT (0),
        ElectricityFee     DECIMAL(18,2)  NOT NULL CONSTRAINT DF_RentRoomBill_ElectricityFee DEFAULT (0),
        TotalAmount        DECIMAL(18,2)  NOT NULL CONSTRAINT DF_RentRoomBill_TotalAmount DEFAULT (0),
        IsPaid             BIT            NOT NULL CONSTRAINT DF_RentRoomBill_IsPaid DEFAULT (0),
        PaidDate           DATE           NULL,
        Note               NVARCHAR(200)  NULL,
        CreatedAt          DATETIME       NOT NULL CONSTRAINT DF_RentRoomBill_CreatedAt DEFAULT (GETDATE()),
        UpdatedAt          DATETIME       NOT NULL CONSTRAINT DF_RentRoomBill_UpdatedAt DEFAULT (GETDATE()),
        CONSTRAINT FK_RentRoomBill_Room FOREIGN KEY (RoomID) REFERENCES RENT.Room (RoomID),
        CONSTRAINT UQ_RentRoomBill_RoomMonth UNIQUE (RoomID, BillMonth)
    );

    CREATE INDEX IX_RentRoomBill_BillMonth ON RENT.RoomBill (BillMonth);
END
GO
