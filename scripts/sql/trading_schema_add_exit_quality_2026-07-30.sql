-- ============================================================
-- TRADING.Trade 異動：新增出場方式分類與滑價欄位
-- 路徑：scripts/sql/trading_schema_add_exit_quality_2026-07-30.sql
-- 背景：cTrader Records + TradingView 訂單兩份資料合併後，可以額外算出：
--   1) 這筆交易是被「停損/停利/手動平倉」出場的（依 TradingView 訂單的「種類」欄位判斷）
--   2) 滑價：停損/停利觸發價 vs 實際成交價的落差
-- 執行方式：於 SQL Server Management Studio 對 JazzerLife 資料庫執行
--          （需先執行過 trading_schema.sql 與 trading_schema_add_ctrader_records_2026-07-30.sql）
-- ============================================================

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'TRADING' AND TABLE_NAME = 'Trade' AND COLUMN_NAME = 'ExitReason'
)
BEGIN
    -- "StopLoss" / "TakeProfit" / "Market"（手動或市價平倉）/ NULL（尚未比對出來、或無法判斷）
    ALTER TABLE TRADING.Trade ADD ExitReason NVARCHAR(20) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'TRADING' AND TABLE_NAME = 'Trade' AND COLUMN_NAME = 'ExitSlippage'
)
BEGIN
    -- 正值＝滑價對你不利（實際成交比預期價格差），負值＝有利滑價；只有 ExitReason 為
    -- StopLoss/TakeProfit（有明確的觸發價可比較）時才會有值，Market 出場沒有「預期價格」可比較
    ALTER TABLE TRADING.Trade ADD ExitSlippage DECIMAL(18,6) NULL;
END
GO
