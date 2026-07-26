# MACRO.EconIndicator 新增指標 備份

- **建立日期**：2026-07-26
- **異動類型**：新增資料（僅 INSERT，不動資料表結構）
- **對應腳本**：`scripts/sql/macro_schema_add_indicators_2026-07-26.sql`
- **前置條件**：`MACRO` schema 需已由 `macro_schema.sql` 建立

## 新增內容

在既有 15 項種子指標（台灣 7 項 + 美國 8 項）之外，新增 4 項美國指標：

| Code | Name | Country | Category | Unit | Source | SourceSeriesId | Frequency |
|---|---|---|---|---|---|---|---|
| US_T10Y2Y | 10年期減2年期公債利差 | US | 利率 | % | FRED | T10Y2Y | Daily |
| US_VIX | VIX恐慌指數 | US | 市場 | 指數 | FRED | VIXCLS | Daily |
| US_CORE_PCE | 核心PCE物價指數 | US | 物價 | 指數 | FRED | PCEPILFE | Monthly |
| US_UMCSENT | 消費者信心指數 | US | 景氣 | 指數 | FRED | UMCSENT | Monthly |

- `US_CORE_PCE` 沿用 `US_CPI`/`US_CORE_CPI` 慣例，儲存 FRED 原始指數水準；年增率由 API 層（`MacroIndicatorEndpoints.cs`）自動計算，不需額外處理。
- `US_T10Y2Y`、`US_VIX` 為日頻（Daily）資料，`MacroIndicatorEndpoints.cs` 已於 2026-07-26 改為依 `Frequency` 動態抓取歷史筆數（Daily 400 筆），可正常計算年增率／百分位燈號。
- 皆為 FRED 來源，`fetch_fred.py` 為通用腳本，新增後自動一併抓取，**無程式碼變更**。

## 回滾方式

```sql
DELETE FROM MACRO.EconIndicator WHERE Code IN ('US_T10Y2Y', 'US_VIX', 'US_CORE_PCE', 'US_UMCSENT');
```

> 若這些指標已經有 `EconIndicatorValue` 時序資料，需先刪除對應的 Value 列（`WHERE IndicatorId IN (...)`）再刪除 Indicator，避免外鍵限制擋下刪除。
