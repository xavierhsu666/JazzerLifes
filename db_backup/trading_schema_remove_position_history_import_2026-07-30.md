# TRADING 模組異動備份（移除 cTrader Position History List 匯入）

- **建立日期**：2026-07-30
- **異動類型**：移除功能（前端+後端），不涉及資料庫結構異動，既有資料不受影響
- **原因**：cTrader「Records」匯出格式（`Source='ICMarketsRecords'`）資料品質更好（含進出場價格），
  已完全取代「Position History List」（`Source='ICMarkets'`，需配對兩列、無進出場價格），使用者確認
  不再需要這個匯入來源

## 異動內容

- 移除 `TradeImportEndpoints.cs` 的 `POST /api/trading/import/ctrader` 端點與其解析邏輯（`CTraderRow` 類別一併移除）
- 移除 `trading.html` 的「匯入 cTrader Position History List（.xlsx）」上傳區塊
- 移除 `trading.js` 的 `uploadCtraderFile()` 函式與對應按鈕綁定

## 不受影響的部分

- **資料庫結構不變**：`TRADING.Trade` 表沒有欄位異動，`Source='ICMarkets'` 相關的
  `BrokerPositionId` 防重複索引（`UQ_Trade_User_Source_BrokerPositionId`）繼續保留，因為它同時也
  服務其他來源（雖然目前只有 ICMarkets 用到 BrokerPositionId）
- **既有資料不變**：先前用 Position History List 匯入的 `Source='ICMarkets'` 舊資料（測試帳戶資料）
  仍保留在資料庫，只是無法再用這個管道匯入「新」資料。前端交易明細的來源篩選下拉選單仍保留
  「ICMarkets Position History」選項，方便查看/篩選這批舊資料
- **手動輸入、cTrader Records 匯入、TradingView 補值匯入**：三者皆不受影響

## 部署前置作業

無需執行新的 SQL 腳本，純程式碼變更，`dotnet publish` 後即生效。
