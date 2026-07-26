-- ------------------------------------------------------------
-- 總經模組：新增美國指標（2026-07-26）
-- 用途：macro_schema.sql 已執行過的環境，補上新選的 4 項美國指標種子資料。
-- 每個 Code 都用 IF NOT EXISTS 個別包住，可重複執行、也可只挑其中幾項先跑。
-- ------------------------------------------------------------

IF NOT EXISTS (SELECT 1 FROM MACRO.EconIndicator WHERE Code = 'US_T10Y2Y')
BEGIN
    INSERT INTO MACRO.EconIndicator (Code, Name, Country, Category, Unit, Source, SourceSeriesId, Frequency)
    VALUES ('US_T10Y2Y', N'10年期減2年期公債利差', 'US', N'利率', '%', 'FRED', 'T10Y2Y', 'Daily');
END
GO

IF NOT EXISTS (SELECT 1 FROM MACRO.EconIndicator WHERE Code = 'US_VIX')
BEGIN
    INSERT INTO MACRO.EconIndicator (Code, Name, Country, Category, Unit, Source, SourceSeriesId, Frequency)
    VALUES ('US_VIX', N'VIX恐慌指數', 'US', N'市場', N'指數', 'FRED', 'VIXCLS', 'Daily');
END
GO

IF NOT EXISTS (SELECT 1 FROM MACRO.EconIndicator WHERE Code = 'US_CORE_PCE')
BEGIN
    INSERT INTO MACRO.EconIndicator (Code, Name, Country, Category, Unit, Source, SourceSeriesId, Frequency)
    VALUES ('US_CORE_PCE', N'核心PCE物價指數', 'US', N'物價', N'指數', 'FRED', 'PCEPILFE', 'Monthly');
END
GO

IF NOT EXISTS (SELECT 1 FROM MACRO.EconIndicator WHERE Code = 'US_UMCSENT')
BEGIN
    INSERT INTO MACRO.EconIndicator (Code, Name, Country, Category, Unit, Source, SourceSeriesId, Frequency)
    VALUES ('US_UMCSENT', N'消費者信心指數', 'US', N'景氣', N'指數', 'FRED', 'UMCSENT', 'Monthly');
END
GO

-- 備註：
-- 1. US_CORE_PCE 沿用 US_CPI/US_CORE_CPI 的既有慣例，儲存 FRED 原始指數水準（非年增率），
--    年增率由 MacroIndicatorEndpoints.cs 的 YoY 計算邏輯自動比對去年同期算出，不需額外處理。
-- 2. US_T10Y2Y、US_VIX 為日頻資料，MacroIndicatorEndpoints.cs 已依 Frequency 動態抓取
--    足夠筆數（Daily 400 筆）計算年增率／百分位燈號，不需再調整程式碼。
-- 3. 這 4 項皆為 FRED 資料源，PythonRunner 呼叫的 fetch_fred.py 為通用腳本，
--    只要 EconIndicator 有對應的 SourceSeriesId 就會自動一併抓取，不需改程式碼。
