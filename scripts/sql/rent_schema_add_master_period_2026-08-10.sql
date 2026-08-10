-- ============================================================
-- 租屋處電費管理 - 主表電費紀錄改為「明確的起訖月份區間」
-- 路徑：scripts/sql/rent_schema_add_master_period_2026-08-10.sql
-- 用途：
--   RENT.MasterMeterReading 新增 StartMonth / EndMonth 兩個欄位，把原本
--   「一筆主表紀錄隱含涵蓋兩個月（電費月 + 上個月）」的約定，改成資料庫裡明確記錄的區間。
--
--   改動原因：原設計只存單一 BillMonth，試算時寫死拿「BillMonth + 上個月」兩個月的
--   房間用電去跟主表總用電比較。這造成三個問題：
--     1. 使用者在畫面上只能填一個月份，得自己記得「要填雙月期間的後面那個月」，填錯不會有警告
--     2. 若相鄰兩個月都各登記了一筆主表紀錄，中間重疊的那個月會被計算兩次
--     3. 台電哪一期改成單月抄表或跨三個月時，這套隱含規則就默默算錯
--
--   改成明確區間後，試算變成「主表總度數 − 區間內所有月份、所有房間的用電加總」，
--   並且公共電費一律落在 EndMonth（區間結束月）那個月的房客帳單上。
--
-- 執行方式：於 SQL Server Management Studio 對 JazzerLife 資料庫執行
-- 前置條件：需已執行過 scripts/sql/rent_schema.sql 與
--           scripts/sql/rent_schema_add_public_electricity_2026-07-27.sql
-- 注意：本腳本可重複執行，已存在的欄位／索引不會重複建立
--
-- 相容性說明：
--   BillMonth 欄位保留不動（值等同 EndMonth），避免動到既有欄位與既有查詢。
--   既有資料列會依原本的雙月假設回填：EndMonth = BillMonth、StartMonth = BillMonth 的上個月。
--   （撰寫本腳本時正式資料庫的 MasterMeterReading 為空表，回填邏輯是為了其他已有資料的環境保留。）
-- ============================================================

-- 1. 新增 StartMonth / EndMonth 欄位（先建成可為 NULL，回填後再改成 NOT NULL）
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('RENT.MasterMeterReading') AND name = 'StartMonth'
)
BEGIN
    ALTER TABLE RENT.MasterMeterReading ADD StartMonth DATE NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('RENT.MasterMeterReading') AND name = 'EndMonth'
)
BEGIN
    ALTER TABLE RENT.MasterMeterReading ADD EndMonth DATE NULL;
END
GO

-- 2. 回填既有資料：沿用原本「一筆涵蓋兩個月」的假設
UPDATE RENT.MasterMeterReading
SET EndMonth   = BillMonth,
    StartMonth = DATEADD(MONTH, -1, BillMonth)
WHERE StartMonth IS NULL OR EndMonth IS NULL;
GO

-- 3. 回填完成後改為 NOT NULL（表為空或已全部回填時才會成功）
IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('RENT.MasterMeterReading') AND name = 'StartMonth' AND is_nullable = 1
)
BEGIN
    ALTER TABLE RENT.MasterMeterReading ALTER COLUMN StartMonth DATE NOT NULL;
END
GO

IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('RENT.MasterMeterReading') AND name = 'EndMonth' AND is_nullable = 1
)
BEGIN
    ALTER TABLE RENT.MasterMeterReading ALTER COLUMN EndMonth DATE NOT NULL;
END
GO

-- 4. 唯一鍵改掛在 EndMonth（結算月）上：同一個物件、同一個結算月只會有一筆主表紀錄。
--    區間「重疊」的檢查無法只靠唯一索引表達，改由 API 於儲存時檢查（RentMasterMeterEndpoints）。
IF EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UQ_RentMasterMeterReading_PropertyMonth'
      AND object_id = OBJECT_ID('RENT.MasterMeterReading')
)
BEGIN
    DROP INDEX UQ_RentMasterMeterReading_PropertyMonth ON RENT.MasterMeterReading;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UQ_RentMasterMeterReading_PropertyEndMonth'
      AND object_id = OBJECT_ID('RENT.MasterMeterReading')
)
BEGIN
    CREATE UNIQUE INDEX UQ_RentMasterMeterReading_PropertyEndMonth
        ON RENT.MasterMeterReading (PropertyID, EndMonth);
END
GO

-- 5. 起訖順序防呆：結束月不可早於起始月
IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = 'CK_RentMasterMeterReading_Period'
      AND parent_object_id = OBJECT_ID('RENT.MasterMeterReading')
)
BEGIN
    ALTER TABLE RENT.MasterMeterReading
        ADD CONSTRAINT CK_RentMasterMeterReading_Period CHECK (EndMonth >= StartMonth);
END
GO
