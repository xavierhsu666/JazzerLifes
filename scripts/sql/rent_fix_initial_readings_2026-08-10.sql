-- ============================================================
-- 租屋處電費管理 - 修正「期初建檔列」被當成用電量的資料
-- 路徑：scripts/sql/rent_fix_initial_readings_2026-08-10.sql
-- 用途：
--   房間第一次建立帳單時，上月讀數沒有歷史可查、預設為 0，使用者填入電表當下的
--   累積讀數後，UsageUnits 就變成「整顆電表的累積讀數」而不是當月用電量。
--   正式資料庫的 2026-05 就是這種期初列，四間房合計 110,148 度、電費算出 10~19 萬元
--   （四列皆為未收款，並非真實收取的帳單）。
--
--   這批資料會嚴重污染公共電費試算：只要主表期間涵蓋到該月份，
--   「區間內各房用電加總」就會暴增，公共度數變成大幅負數，試算直接失效。
--
--   本腳本把期初列的用電量與電費歸零，但保留 CurrentReading（初始電表讀數）不動，
--   因為那是唯一記錄「這顆電表從哪裡起算」的地方，之後月份的 PrevReading 由此而來。
--
-- 執行方式：於 SQL Server Management Studio 對 JazzerLife 資料庫執行
-- 注意：本腳本可重複執行（第二次執行時已無符合條件的資料列，影響 0 筆）
--
-- 判定條件：PrevReading = 0 且 CurrentReading > 0 且 UsageUnits > 0
--   → 只會命中「沒有上月讀數可承接、直接填入累積讀數」的期初列，
--     正常月份的帳單（PrevReading 必為上個月的 CurrentReading）不會被誤傷。
-- ============================================================

-- 1. 先確認會被影響的資料列（建議先單獨執行這段，確認清單無誤再往下）
SELECT b.BillID,
       r.RoomAlias,
       CONVERT(char(7), b.BillMonth, 126) AS BillMonth,
       b.PrevReading,
       b.CurrentReading,
       b.UsageUnits      AS UsageUnits_目前,
       b.ElectricityFee  AS ElectricityFee_目前,
       b.TotalAmount     AS TotalAmount_目前,
       b.RentSnapshot + b.AdjustmentSnapshot + b.PublicElectricityFee AS TotalAmount_修正後,
       b.IsPaid
FROM RENT.RoomBill b
JOIN RENT.Room r ON r.RoomID = b.RoomID
WHERE b.PrevReading = 0
  AND b.CurrentReading > 0
  AND b.UsageUnits > 0
ORDER BY b.BillMonth, r.SortOrder, r.RoomID;
GO

-- 2. 實際修正：
--    PrevReading 補成與 CurrentReading 相同（代表「這個月是期初，沒有用電量」），
--    UsageUnits 與 ElectricityFee 歸 0，TotalAmount 重算為 房租 + 調整金額 + 公共電費。
UPDATE b
SET b.PrevReading    = b.CurrentReading,
    b.UsageUnits     = 0,
    b.ElectricityFee = 0,
    b.TotalAmount    = b.RentSnapshot + b.AdjustmentSnapshot + b.PublicElectricityFee,
    b.UpdatedAt      = GETDATE()
FROM RENT.RoomBill b
WHERE b.PrevReading = 0
  AND b.CurrentReading > 0
  AND b.UsageUnits > 0;
GO

-- 3. 修正後複查：這段應該回傳 0 筆
SELECT COUNT(*) AS 仍為期初列的筆數
FROM RENT.RoomBill
WHERE PrevReading = 0 AND CurrentReading > 0 AND UsageUnits > 0;
GO
