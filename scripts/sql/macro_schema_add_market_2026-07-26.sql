-- ------------------------------------------------------------
-- 總經模組：新增市場資產指標（2026-07-26）
-- 用途：macro_schema.sql / macro_schema_add_indicators_2026-07-26.sql 已執行過的環境，
--       補上黃金、比特幣、SP500、費城半導體指數、台股加權指數。
-- 這 5 項一律歸類 Category = '市場'，MacroCompositeEndpoints.cs 已改為計算景氣溫度計綜合分數時
-- 排除此分類（市場資產走勢 ≠ 總體經濟健康度，避免污染溫度計分數），但仍會出現在指標矩陣與走勢圖。
-- 每個 Code 都用 IF NOT EXISTS 個別包住，可重複執行、也可只挑其中幾項先跑。
-- ------------------------------------------------------------

IF NOT EXISTS (SELECT 1 FROM MACRO.EconIndicator WHERE Code = 'US_SP500')
BEGIN
    INSERT INTO MACRO.EconIndicator (Code, Name, Country, Category, Unit, Source, SourceSeriesId, Frequency)
    VALUES ('US_SP500', N'S&P500指數', 'US', N'市場', N'點', 'FRED', 'SP500', 'Daily');
END
GO

IF NOT EXISTS (SELECT 1 FROM MACRO.EconIndicator WHERE Code = 'US_BTC')
BEGIN
    INSERT INTO MACRO.EconIndicator (Code, Name, Country, Category, Unit, Source, SourceSeriesId, Frequency)
    VALUES ('US_BTC', N'比特幣', 'US', N'市場', N'美元', 'FRED', 'CBBTCUSD', 'Daily');
END
GO

IF NOT EXISTS (SELECT 1 FROM MACRO.EconIndicator WHERE Code = 'US_GOLD')
BEGIN
    INSERT INTO MACRO.EconIndicator (Code, Name, Country, Category, Unit, Source, SourceSeriesId, Frequency)
    VALUES ('US_GOLD', N'黃金期貨', 'US', N'市場', N'美元/盎司', 'YAHOO', 'GC=F', 'Daily');
END
GO

IF NOT EXISTS (SELECT 1 FROM MACRO.EconIndicator WHERE Code = 'US_SOX')
BEGIN
    INSERT INTO MACRO.EconIndicator (Code, Name, Country, Category, Unit, Source, SourceSeriesId, Frequency)
    VALUES ('US_SOX', N'費城半導體指數', 'US', N'市場', N'點', 'YAHOO', '^SOX', 'Daily');
END
GO

IF NOT EXISTS (SELECT 1 FROM MACRO.EconIndicator WHERE Code = 'TW_TAIEX')
BEGIN
    INSERT INTO MACRO.EconIndicator (Code, Name, Country, Category, Unit, Source, SourceSeriesId, Frequency)
    VALUES ('TW_TAIEX', N'台股加權指數', 'TW', N'市場', N'點', 'YAHOO', '^TWII', 'Daily');
END
GO

-- 備註：
-- 1. US_SP500、US_BTC 走 FRED（fetch_fred.py 通用腳本，零程式碼變更），系列代碼需在正式同步前
--    人工用 appsettings.json 的 FredApiKey 驗證一次（尤其 CBBTCUSD 較新，建議先手動測試確認仍有效）。
-- 2. US_GOLD、US_SOX、TW_TAIEX 走 Yahoo Finance Chart API（新來源，Source='YAHOO'），
--    對應新腳本 fetch_yahoo.py，需先在測試機手動驗證連線可用後才建議啟用排程同步。
-- 3. 全部 5 項皆為 Daily 頻率，MacroIndicatorEndpoints.cs 的動態 takeCount 邏輯已支援。
