-- ============================================================
-- 租屋處電費管理 - 新增「公共電費」欄位與主表電費紀錄
-- 路徑：scripts/sql/rent_schema_add_public_electricity_2026-07-27.sql
-- 用途：
--   1. RENT.RoomBill 新增 PublicElectricityFee 欄位：每房每月可彈性輸入的公共電費分攤金額
--      （非「當月建立時快照」欄位，每次儲存都會直接覆蓋，供使用者手動調整）
--   2. 新增 RENT.MasterMeterReading：記錄主表（母表／台電帳單）每期的總用電度數與總金額，
--      供公共電費試算使用（試算方式：電費月往前推兩個月的主表總用電 - 該期間所有房間用電度數 = 公共部分）
-- 執行方式：於 SQL Server Management Studio 對 JazzerLife 資料庫執行
-- 前置條件：需已執行過 scripts/sql/rent_schema.sql（RENT schema 與既有三張表）
-- 注意：本腳本可重複執行，已存在的欄位/表格不會重複新增
-- ============================================================

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('RENT.RoomBill') AND name = 'PublicElectricityFee'
)
BEGIN
    ALTER TABLE RENT.RoomBill
        ADD PublicElectricityFee DECIMAL(18,2) NOT NULL CONSTRAINT DF_RentRoomBill_PublicElectricityFee DEFAULT (0);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'MasterMeterReading' AND schema_id = SCHEMA_ID('RENT'))
BEGIN
    CREATE TABLE RENT.MasterMeterReading (
        MasterBillID     INT IDENTITY(1,1) PRIMARY KEY,
        PropertyID       INT           NOT NULL,
        -- 此欄位代表「主表這一期帳單對應的期間」，不是台電實際開帳單的月份；
        -- 試算時是拿「電費月往前推兩個月」的期間去查這張表
        BillMonth        DATE          NOT NULL,
        TotalUsageUnits  DECIMAL(18,2) NOT NULL CONSTRAINT DF_RentMasterMeterReading_TotalUsageUnits DEFAULT (0),
        TotalAmount      DECIMAL(18,2) NOT NULL CONSTRAINT DF_RentMasterMeterReading_TotalAmount DEFAULT (0),
        Note             NVARCHAR(200) NULL,
        CreatedAt        DATETIME      NOT NULL CONSTRAINT DF_RentMasterMeterReading_CreatedAt DEFAULT (GETDATE()),
        UpdatedAt        DATETIME      NOT NULL CONSTRAINT DF_RentMasterMeterReading_UpdatedAt DEFAULT (GETDATE()),
        CONSTRAINT FK_RentMasterMeterReading_Property FOREIGN KEY (PropertyID) REFERENCES RENT.Property (PropertyID),
        CONSTRAINT UQ_RentMasterMeterReading_PropertyMonth UNIQUE (PropertyID, BillMonth)
    );
END
GO
