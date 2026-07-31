# FIN.ProjectCashflowExclusion 結構備份（專案層面現金流排除）

- **建立日期**：2026-07-31
- **異動類型**：新增資料表，不影響既有資料表
- **對應腳本**：`scripts/sql/finance_project_cashflow_exclusion_2026-07-31.sql`
- **對應 Model**：`JazzerLifeApi/Models/ProjectCashflowExclusion.cs`（新增）、`JazzerLifeApi/Models/Project.cs`（新增 `ProjectCashflowExclusions` 導覽集合）
- **對應 DbContext**：`JazzerLifeApi/Models/JazzerLifeContext.cs` 新增 `DbSet<ProjectCashflowExclusion>` 與 `Entity<ProjectCashflowExclusion>` 設定
- **對應 API**：`JazzerLifeApi/Endpoints/FinanceProjectCashflowEndpoints.cs`
  - `GET /api/finance/projects/{projectId}/cashflow-matches`：新增 `showExcluded` 參數（預設不帶已排除列），回傳內容新增 `DetailId`、`IsProjectExcluded`
  - `POST /api/finance/projects/{projectId}/cashflow-matches/{detailId}/toggle-exclude`：新增，切換單一明細在這個專案的排除狀態
  - `GET /api/finance/projects/{projectId}/cashflow-monthly`：月度趨勢彙總同步扣除已排除明細
  - `JazzerLifeApi/Endpoints/FinanceProjectEndpoints.cs` 的 `GET /api/finance/projects`：摘要列表的收入/支出/淨收支同步扣除已排除明細
- **對應前端**：`finance.html`／`assets/js/finance.js`
  - 專案詳情「現金流」頁籤新增「顯示已排除」切換按鈕（`id="pdCashflowShowExcluded"`）
  - `pdCashflowGrid` 新增「本專案排除」操作欄（排除／取消排除按鈕），沿用一般明細頁排除按鈕同一套寫法（`_excludeCellRenderer`／`toggleDetailExcluded` 的姊妹版）

## 背景

專案管理「現金流」子系統用關鍵字規則比對交易明細，但規則是粗顆粒度的字串比對，難免會誤命中不該算進這個專案的交易。原本只有全域的 `Detail.IsExcluded`（總覽/明細頁用的排除旗標），如果拿來排除某筆命中明細，會連帶影響總覽、分類分析等所有其他報表，語意不對。

因此新增一張獨立的關聯表，只記錄「(專案, 明細)」這個組合被排除，不影響 `Detail.IsExcluded`、不影響其他專案。

## 資料表新增

### FIN.ProjectCashflowExclusion

| 欄位 | 型別 | 說明 |
|---|---|---|
| ExclusionID | INT IDENTITY(1,1)，主鍵 | 識別欄位 |
| ProjectID | INT NOT NULL，FK → FIN.Projects | 被排除的專案 |
| DetailID | INT NOT NULL，FK → FIN.Detail | 被排除的明細 |
| CreatedAt | DATETIME，預設 GETDATE() | 排除時間 |

`UNIQUE (ProjectID, DetailID)`：同一筆明細在同一個專案只會有一筆排除紀錄（切換時用新增/刪除，不是更新旗標）。

## API 端點異動

| 方法 | 路徑 | 說明 |
|---|---|---|
| GET | `/api/finance/projects/{projectId}/cashflow-matches` | 新增查詢參數 `showExcluded`（預設 false，不列出已排除列）；回傳的每筆明細新增 `DetailId`、`IsProjectExcluded`；`hitCount`/`hitAmount` 只計入未排除的部分，`missCount` 仍以「有沒有命中關鍵字規則」為準（跟排除與否無關） |
| POST | `/api/finance/projects/{projectId}/cashflow-matches/{detailId}/toggle-exclude` | 新增：切換單一明細在這個專案的排除狀態（新增/刪除一筆 `ProjectCashflowExclusion`），需驗證明細確實屬於目前登入的使用者 |
| GET | `/api/finance/projects/{projectId}/cashflow-monthly` | 月度彙總同步扣除已排除明細，才會跟命中明細清單的合計一致 |
| GET | `/api/finance/projects` | 摘要列表的 `Income`/`Expense`/`Net` 同步扣除各專案自己的已排除明細 |

## 部署前置作業

於 SSMS 對 JazzerLife 資料庫執行：

1. `scripts/sql/finance_project_cashflow_exclusion_2026-07-31.sql`

執行前若呼叫 `cashflow-matches`／`cashflow-monthly`／`GET /api/finance/projects` 會因為 EF 查詢不到 `FIN.ProjectCashflowExclusion` 資料表而報錯，需先執行腳本再部署新版 API。
