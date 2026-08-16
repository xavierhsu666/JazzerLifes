# FIN.DetailAutoRule / FIN.DetailAutoRuleCondition 結構備份（明細自動分類規則）

- **建立日期**：2026-08-17
- **異動類型**：新增兩張資料表，不影響既有資料表
- **對應腳本**：`scripts/sql/finance_detail_auto_rule_2026-08-17.sql`
- **對應 Model**：`JazzerLifeApi/Models/DetailAutoRule.cs`（新增）、`JazzerLifeApi/Models/DetailAutoRuleCondition.cs`（新增）
- **對應 DbContext**：`JazzerLifeApi/Models/JazzerLifeContext.cs` 新增 `DbSet<DetailAutoRule>`、`DbSet<DetailAutoRuleCondition>` 與兩個 `Entity<>` 設定
- **對應 API**：
  - `JazzerLifeApi/Endpoints/FinanceAutoRuleEndpoints.cs`（新增）
  - `JazzerLifeApi/Endpoints/FinanceAutoRuleEngine.cs`（新增，比對／套用邏輯）
  - `JazzerLifeApi/Endpoints/FinanceUploadEndpoints.cs`：`POST /api/finance/upload-details` 在寫入明細後自動套用一次全部啟用中的規則
  - `JazzerLifeApi/Program.cs` 註冊 `app.MapFinanceAutoRuleEndpoints()`
- **對應前端**：`finance.html`／`assets/js/finance.js`／`assets/css/finance.css`
  - 「設定」功能新增頁籤「自動分類規則」（`view-auto-rule`）
  - 規則卡片列表 `#autoRuleList`，每張卡片有「上移／下移／停用／執行／編輯／刪除」
  - 新增/編輯彈窗有條件建構器與**即時預覽**（輸入停止 300ms 後打 `preview` API）
  - CSS 前綴一律用 `.ar-`

## 背景

原本明細的分類、標籤、備註只能上傳後逐筆手動編輯，同樣的店家每個月都要重打一次。這裡新增一套規則引擎：使用者設定條件，系統自動改寫明細欄位。

跟既有的 `FIN.ProjectCashflowRule` 是兩套獨立機制，不共用：
- `ProjectCashflowRule`：單一關鍵字，只決定「某筆明細算不算進某個專案」，**不改動明細本身**
- `DetailAutoRule`：多條件組合，**直接改寫明細的 Category／Tag／Notes／IsExcluded**

## 資料表新增

### FIN.DetailAutoRule

| 欄位 | 型別 | 說明 |
|---|---|---|
| RuleID | INT IDENTITY(1,1)，主鍵 | 識別欄位 |
| UserID | INT NOT NULL | 規則擁有者 |
| RuleName | NVARCHAR(100) NOT NULL | 規則名稱 |
| Priority | INT NOT NULL，預設 0 | 執行順序，數字小的先跑 |
| IsEnabled | BIT NOT NULL，預設 1 | 規則開關（停用保留設定） |
| ActionCategory | NVARCHAR(50) NULL | 命中後要設定的分類；NULL = 不碰這個欄位 |
| ActionCategoryMode | NVARCHAR(20) NULL | `overwrite`／`fillEmpty` |
| ActionTag | NVARCHAR(50) NULL | 命中後要設定的標籤 |
| ActionTagMode | NVARCHAR(20) NULL | `overwrite`／`fillEmpty`／`append` |
| ActionNotes | NVARCHAR(255) NULL | 命中後要設定的備註 |
| ActionNotesMode | NVARCHAR(20) NULL | `overwrite`／`fillEmpty`／`append` |
| ActionIsExcluded | BIT NULL | NULL = 不動排除旗標；1 = 設為排除；0 = 設為不排除 |
| ActionActivate | BIT NULL | NULL = 不動；0 = 停用明細（`Detail.Activate = '0'`，軟刪除，所有查詢都撈不到，等同舊 SP 的 `set Activate=0`）；1 = 還原啟用 |
| Activate | BIT NOT NULL，預設 1 | 軟刪除旗標 |
| LastRunAt | DATETIME NULL | 最後執行時間 |
| CreatedAt / UpdatedAt | DATETIME，預設 GETDATE() | |

`IX_DetailAutoRule_UserId (UserID, Activate, Priority)`：規則列表與執行都以這三個欄位取用。

動作欄位長度刻意對齊 `FIN.Detail` 的目標欄位（Category 50／Tag 50／Notes 255），避免規則存得下、套用時卻寫不進明細。

### FIN.DetailAutoRuleCondition

| 欄位 | 型別 | 說明 |
|---|---|---|
| ConditionID | INT IDENTITY(1,1)，主鍵 | 識別欄位 |
| RuleID | INT NOT NULL，FK → FIN.DetailAutoRule（ON DELETE CASCADE） | 所屬規則 |
| Field | NVARCHAR(30) NOT NULL | `organizationName`／`accountName`／`category`／`tag`／`description`／`notes`／`amount` |
| Operator | NVARCHAR(20) NOT NULL | 文字：`contains`／`notContains`／`equals`／`startsWith`／`isEmpty`／`isNotEmpty`；金額：`gt`／`gte`／`lt`／`lte`／`between`／`isIncome`／`isExpense` |
| Value | NVARCHAR(500) NULL | 比對值；文字條件可用半形逗號分隔多值 |
| Value2 | NVARCHAR(100) NULL | 僅 `between` 使用（上限） |
| SortOrder | INT NOT NULL，預設 0 | 條件在規則內的顯示順序 |
| CreatedAt | DATETIME，預設 GETDATE() | |

## 比對與套用語意（`FinanceAutoRuleEngine`）

1. **條件之間一律 AND**，同一條件的 `Value` 用逗號分隔多值時視為 OR。
   例外：`notContains` 是否定條件，多值時要「每個值都不包含」才算命中。
2. **沒有任何條件的規則一律不命中**，且 API 拒絕儲存——否則一條空規則會把全部明細改掉。
3. **金額一律以絕對值比較**。支出在 `FIN.Detail` 是負數，使用者講「金額大於 1000」指的是「花超過 1000」，用原始負數比會完全違反直覺。`isIncome`／`isExpense` 則沿用明細頁定義（>= 0 為收入）。
4. **多條規則命中同一筆明細時，依 Priority 由小到大全部套用，後者覆蓋前者**。所以不同規則管不同欄位可以疊加，管同一個欄位則順序在後的贏。
5. **`fillEmpty` 模式只在原值為空白時填入**，用來保護手動改過的資料。
6. **`append` 模式（僅 Tag／Notes）以逗號串接**，已存在相同值不重複附加，附加後超過欄位長度則維持原值不動——重跑同一條規則是冪等的。
7. **執行結果的「命中筆數」是規則命中次數總和**（同一筆被兩條規則命中算兩次），**「異動筆數」以 DetailID 去重**且只算真的有欄位被改動的。
8. **規則依序套用時，後面的規則看到的是前面規則改過之後的明細**（`RunRules` 的雙層迴圈直接就地改物件）。這讓「標籤 為空白」條件可以完全取代舊 SP 的 `Tag is null` 守門寫法——排在前面的規則先填上標籤，後面條件較寬的規則就自動不再命中同一筆。
9. **比對範圍是該使用者的全部明細，不以 `Activate` 或 `IsExcluded` 篩選**（`LoadRuleScopeDetailsAsync`）。理由：規則本身可能就是要設定這兩個旗標，先篩掉就永遠無法命中要還原的列；這也跟舊 SP 直接對整張表下 UPDATE 一致。預覽回傳的 `IsInactive` 讓前端把已停用的列標示出來。

### 排除 vs 停用

| | `IsExcluded`（排除） | `Activate`（停用） |
|---|---|---|
| 語意 | 不計入報表統計 | 軟刪除 |
| 明細頁 | 切「顯示已排除」還看得到 | 所有查詢都撈不到 |
| 適用 | 一次性大額支出、不想污染趨勢的項目 | 重複扣款、帳戶互轉等根本不該出現在帳上的列 |

## API 端點異動

| 方法 | 路徑 | 說明 |
|---|---|---|
| GET | `/api/finance/auto-rules` | 查詢全部規則（含條件），依 Priority 排序 |
| POST | `/api/finance/auto-rules` | 新增規則，Priority 自動排在最後 |
| PUT | `/api/finance/auto-rules/{ruleId}` | 編輯規則（條件整批取代） |
| DELETE | `/api/finance/auto-rules/{ruleId}` | 軟刪除（`Activate = 0`）；**不會回溯撤銷**先前已套用到明細的值 |
| POST | `/api/finance/auto-rules/{ruleId}/toggle` | 單獨開啟／關閉規則 |
| PUT | `/api/finance/auto-rules/reorder` | 整批更新執行順序（傳排好的 `ruleIds` 陣列） |
| POST | `/api/finance/auto-rules/preview` | **即時預覽**：吃「尚未存檔」的條件定義，回傳目前會命中的明細（最多 300 筆，另回 `totalCount`／`truncated`） |
| POST | `/api/finance/auto-rules/{ruleId}/run` | 執行單一規則（對全部明細） |
| POST | `/api/finance/auto-rules/run-all` | 依序執行全部啟用中的規則 |
| POST | `/api/finance/upload-details` | 既有端點；寫入明細後對**本次新增**的明細自動套用一次全部啟用中的規則，回應新增 `autoRuleCount`／`autoRuleMatched`／`autoRuleChanged`／`autoRuleError` |

預覽與執行的比對範圍都是「該使用者所有 `Activate = '1'` 的明細，**含已排除的**」——因為規則本身就可能是用來把明細標成排除、或把先前誤排除的取消排除。

上傳流程只對本次新增的明細套用（不動既有明細）；既有明細要重跑請到規則頁按「執行全部規則」。規則套用失敗不會讓整包上傳失敗（明細已經寫進資料庫了），改以 `autoRuleError` 回報。

## 部署前置作業

於 SSMS 對 JazzerLife 資料庫執行：

1. `scripts/sql/finance_detail_auto_rule_2026-08-17.sql`（建表；若已執行過舊版，腳本尾端的 `ALTER TABLE ... ADD ActionActivate` 會自動補上後來新增的欄位）
2. `scripts/sql/finance_detail_auto_rule_seed_from_sp_2026-08-17.sql`（選用）：把舊的 `FIN.ins_Detail_Tag_With_Rule` 預存程序轉成 12 條預設規則。腳本可重複執行，已存在同名規則會略過。

### 舊 SP 未能轉換的部分

`FIN.ins_Detail_Tag_With_Rule` 有三段無法用宣告式規則表達，種子腳本沒有納入：

| SP 段落 | 原因 | 建議 |
|---|---|---|
| 抽籤沒抽到（`#map_lottery_1~3`） | 需要把「抽籤預扣」與「抽籤退款」依金額（扣款金額 − 20）配對，再用 `ROW_NUMBER()` 取第二筆。這是跨資料列的關聯運算，規則引擎是逐筆比對，做不到 | 保留這段 SP 單獨執行，或日後做成獨立的專用功能 |
| 帳戶指派（`update BankAccount set Tag = '#專案名'`） | 目標是 `FIN.BankAccount` 不是 `FIN.Detail`，且 `BankAccount.Tag` 在現行程式碼中**沒有任何地方讀取**（是舊 asmx 架構的遺留欄位） | 已被「專案管理 › 資產流 › 綁定資產帳戶」彈窗（`FIN.ProjectAssetBinding`）取代，不需要再維護 |
| 停用帳戶（`update BankAccount set Activate=0`，台新銀行/信用貸款、未命名帳戶） | 同上，目標是帳戶資料表 | 保留在 SP，或於「存款帳戶」頁面手動處理 |

執行前若呼叫任何 `/api/finance/auto-rules*` 端點，會因為 EF 查詢不到 `FIN.DetailAutoRule` 資料表而報錯；上傳明細也會在自動套用階段丟出例外（該例外已被攔截，明細仍會寫入，只是回應帶 `autoRuleError`）。請先執行腳本再部署新版 API。
