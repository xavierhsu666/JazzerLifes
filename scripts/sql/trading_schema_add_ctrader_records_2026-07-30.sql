-- ============================================================
-- TRADING.Trade 異動：支援 cTrader「Records」匯出格式
-- 路徑：scripts/sql/trading_schema_add_ctrader_records_2026-07-30.sql
-- 背景：cTrader 除了「Position History List」（無價格，靠 Position 編號配對兩列），
--       還有另一種「Records」匯出（.xlsx，單一工作表 "Records"），一列就是一筆完整的
--       已平倉交易，直接含建倉價/平倉價格/淨值，但沒有「進場時間」（只有平倉時間），
--       也沒有 Position/訂單編號可當防重複的天然鍵
-- 異動內容：
--   1) EntryTime 欄位改為允許 NULL（原本 NOT NULL），因為此格式匯入當下無法得知進場時間，
--      需等後續 TradingView 訂單資料比對回填，找不到就保持空白
--   2) 新增 Source='ICMarketsRecords' 專用的 Filtered Unique Index，
--      以「商品+平倉時間(含毫秒)+數量+損益」當天然鍵防止重複匯入（此格式沒有 Position 編號可用）
-- 執行方式：於 SQL Server Management Studio 對 JazzerLife 資料庫執行（需先執行過 trading_schema.sql）
-- ============================================================

IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'TRADING' AND TABLE_NAME = 'Trade' AND COLUMN_NAME = 'EntryTime' AND IS_NULLABLE = 'NO'
)
BEGIN
    ALTER TABLE TRADING.Trade ALTER COLUMN EntryTime DATETIME NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'UQ_Trade_ICMarketsRecords_NaturalKey' AND object_id = OBJECT_ID('TRADING.Trade')
)
BEGIN
    CREATE UNIQUE INDEX UQ_Trade_ICMarketsRecords_NaturalKey
        ON TRADING.Trade (UserID, Source, Symbol, ExitTime, Volume, Profit)
        WHERE Source = 'ICMarketsRecords';
END
GO
