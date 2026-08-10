# FIN schema 結構備份（專案：現金流是否計入上月實際資產）

- **建立日期**：2026-08-10
- **異動類型**：新增欄位（`FIN.Projects` 加一個 BIT 欄位，預設 0，不影響既有專案行為）
- **前置條件**：`FIN.Projects` 既有表（原始資料庫既有結構）
- **對應腳本**：`scripts/sql/finance_project_include_cashflow_2026-08-10.sql`
- **對應 Model**：`Project.cs` 新增 `IncludeCashflowInActualAsset`
- **對應 API**：`FinanceProjectEndpoints.cs`（列表計算、新增/修改專案）
- **對應前端頁面**：`finance.html` / `finance.js` / `finance.css`

## 改動原因

專案摘要列表的「上月實際資產」原本只加總「資產流」子系統綁定帳戶中、
帳戶分類被標成「資產」的餘額。但有些專案（例如房租收入型）的成果主要反映在現金流上，
不會進到綁定帳戶的餘額，導致達成率被低估。

## 資料表結構異動

### FIN.Projects（新增欄位）

| 欄位 | 型別 | 說明 |
|---|---|---|
| IncludeCashflowInActualAsset | BIT NOT NULL DEFAULT 0 | 是否把現金流命中明細的累計淨額計入「上月實際資產」 |

## 計算邏輯

```
上月實際資產 = Σ(資產流最新綁定月份中，帳戶分類為「資產」的帳戶餘額)
             + (若勾選) Σ(現金流命中明細中，交易日期 <= 最新綁定月份 的 Amount)
達成率 = 上月實際資產 ÷ 上月預期資產
```

累計範圍刻意只到「資產流最新綁定月份」的月底，與資產快照的時間點對齊；
晚於該月份的交易不計入，避免把未來的錢算進過去的快照。若該專案完全沒有資產綁定
（`latestBindingMonth` 為 null），則退回使用全期間累計淨額。

API 回傳同時新增 `IncludeCashflowInActualAsset`（供前端勾選框回填）與
`CashflowInActualAsset`（實際被加進去的金額，未勾選時為 0）。

## 前端影響範圍

- 專案詳情「基礎資訊」新增勾選框「將現金流計入專案列表的『上月實際資產』」，
  隨「儲存變更」一起送出（`PUT /api/finance/projects/{id}` 的 `includeCashflowInActualAsset`，
  傳 null 代表沿用既有設定）
- 專案列表的「上月實際資產」欄位，勾選的專案會標註「（含現金流）」，
  避免兩個口徑不同的專案在同一張表裡看起來一樣

---

# 同批次的其他前端改動（無資料庫異動）

## 資產綁定改為彈窗

`GET /api/finance/projects/{id}/assets` 回傳新增 `Category`（來自 `FIN.AccountCategory`）。

原本的資產綁定是一排 checkbox 直接鋪在頁面上，而且**每勾一下就立刻 PUT 存檔**，
使用者無法先看完整份清單再決定，也無法反悔。改為彈窗後：

- 表格欄位：勾選 / 資產分類 / 資產（銀行｜帳戶）/ 對應餘額，表頭有全選
- 分類會標色：「資產」為綠色、其他分類為灰色、未分類為橘色 —— 因為只有「資產」會計入上月實際資產
- 勾選只存在記憶體，按「套用至版本月份」（`PUT /assets`）或「套用到所有月份」
  （`POST /assets/apply-all-months`）才送出；按取消不會有任何請求
- 後端這兩支 API 沿用既有實作，未變更

`showModal()` 新增選填的第四個參數 `options`（`confirmText` / `wide` / `extraActions`），
不傳時行為與改動前完全相同；資產綁定需要兩個動作按鈕才加上這個機制。

## 專案收支對比圖表改為小多圖

原本所有專案共用一張圖、一條 y 軸的群組柱狀圖，專案之間金額級距差很多時
（實際資料：信貸投資案千萬級 vs 康樂萬級），小額專案的柱子會被壓成貼著 x 軸的細線。

改為每個專案一張小圖、各自一條 y 軸自動縮放（`renderProjectComparisonCharts`）。
代價是不同專案之間不能直接用柱子高度比大小，所以每張圖的標題列會標出自己的最大金額當尺度提示。
`_getChartParams_byViewId` 的 `project-management` 分支已不再被使用，但保留未刪，
避免影響其他共用該函式的圖表。
