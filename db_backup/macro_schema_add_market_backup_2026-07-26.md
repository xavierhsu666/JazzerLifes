# MACRO.EconIndicator 新增市場資產指標 備份

- **建立日期**：2026-07-26
- **異動類型**：新增資料（僅 INSERT，不動資料表結構）
- **對應腳本**：`scripts/sql/macro_schema_add_market_2026-07-26.sql`
- **前置條件**：`MACRO` schema 需已由 `macro_schema.sql` 建立

## 新增內容

新增 5 項市場資產指標，Category 統一為「市場」：

| Code | Name | Country | Category | Unit | Source | SourceSeriesId | Frequency |
|---|---|---|---|---|---|---|---|
| US_SP500 | S&P500指數 | US | 市場 | 點 | FRED | SP500 | Daily |
| US_BTC | 比特幣 | US | 市場 | 美元 | FRED | CBBTCUSD | Daily |
| US_GOLD | 黃金期貨 | US | 市場 | 美元/盎司 | YAHOO | GC=F | Daily |
| US_SOX | 費城半導體指數 | US | 市場 | 點 | YAHOO | ^SOX | Daily |
| TW_TAIEX | 台股加權指數 | TW | 市場 | 點 | YAHOO | ^TWII | Daily |

## 相依程式碼異動（一併記錄）

- `MacroCompositeEndpoints.cs`：計算景氣溫度計綜合分數時排除 `Category = '市場'`，避免資產市場走勢污染總體經濟健康度判讀。此分類指標仍會出現在 `/api/macro/indicators` 指標矩陣與 `/series` 走勢圖。
- `EconDataSyncRunner.cs`：新增 `SyncYahooAsync()`，呼叫新腳本 `scripts/fetch_yahoo.py`（Yahoo Finance Chart API，來源標記為 `Source = 'YAHOO'`）。
- `MacroIndicatorEndpoints.cs`：新增 Daily 頻率的動態抓取筆數（400 筆），確保這 5 項日頻資料能正確計算年增率與百分位燈號。

## 已知風險

Yahoo Finance Chart API 為非官方公開端點，無 Key、無官方 SLA，`US_GOLD`／`US_SOX`／`TW_TAIEX` 三項資料來源穩定性未知。已於測試機（KAZUO）驗證連線正常（2026-07-26），正式機部署前需另外驗證一次。

## 回滾方式

```sql
DELETE FROM MACRO.EconIndicatorValue WHERE IndicatorId IN (
    SELECT IndicatorId FROM MACRO.EconIndicator
    WHERE Code IN ('US_SP500', 'US_BTC', 'US_GOLD', 'US_SOX', 'TW_TAIEX')
);
DELETE FROM MACRO.EconIndicator WHERE Code IN ('US_SP500', 'US_BTC', 'US_GOLD', 'US_SOX', 'TW_TAIEX');
```
