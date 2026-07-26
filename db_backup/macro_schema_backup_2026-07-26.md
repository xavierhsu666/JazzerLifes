# MACRO Schema 結構備份

- **建立日期**：2026-07-26
- **異動類型**：新增（不影響 CarMan / FIN / MEM 既有 schema）
- **對應腳本**：`scripts/sql/macro_schema.sql`
- **對應 Model**：`JazzerLifeApi/Models/EconIndicator.cs`、`EconIndicatorValue.cs`、`EconAlertRule.cs`、`EconAlertLog.cs`
- **對應 DbContext 變更**：`JazzerLifeApi/Models/JazzerLifeContext.cs` 新增 4 個 DbSet 與 OnModelCreating 設定

## 資料表結構

### MACRO.EconIndicator（指標定義）

| 欄位 | 型別 | 說明 |
|---|---|---|
| IndicatorId | INT IDENTITY PK | |
| Code | NVARCHAR(50) UNIQUE | 指標代碼，如 TW_CPI_YOY |
| Name | NVARCHAR(100) | 指標名稱 |
| Country | NVARCHAR(10) | TW / US |
| Category | NVARCHAR(50) NULL | 物價/就業/生產/景氣/利率/貿易 |
| Unit | NVARCHAR(20) NULL | %、指數、分、千人 |
| Source | NVARCHAR(50) | TW_GOV / FRED |
| SourceSeriesId | NVARCHAR(50) NULL | FRED 指標代碼 |
| Frequency | NVARCHAR(20) | Monthly / Quarterly / Daily |
| IsActive | BIT DEFAULT 1 | |
| CreatedAt / UpdatedAt | DATETIME DEFAULT GETDATE() | |

### MACRO.EconIndicatorValue（指標時序資料）

| 欄位 | 型別 | 說明 |
|---|---|---|
| ValueId | BIGINT IDENTITY PK | |
| IndicatorId | INT FK -> EconIndicator | |
| PeriodDate | DATE | 該期別代表日 |
| Value | DECIMAL(18,4) | |
| ReleaseDate | DATE NULL | 官方公告日期 |
| CreatedAt / UpdatedAt | DATETIME DEFAULT GETDATE() | |

UNIQUE (IndicatorId, PeriodDate)；INDEX (IndicatorId, PeriodDate DESC)

### MACRO.EconAlertRule（示警規則）

| 欄位 | 型別 | 說明 |
|---|---|---|
| RuleId | INT IDENTITY PK | |
| UserId | INT FK -> MEM.Users | |
| IndicatorId | INT FK -> EconIndicator | |
| Operator | NVARCHAR(5) CHECK IN ('>','>=','<','<=') | |
| Threshold | DECIMAL(18,4) | |
| IsActive | BIT DEFAULT 1 | |
| LastTriggeredAt | DATETIME NULL | |
| CreatedAt / UpdatedAt | DATETIME DEFAULT GETDATE() | |

### MACRO.EconAlertLog（示警觸發紀錄）

| 欄位 | 型別 | 說明 |
|---|---|---|
| LogId | BIGINT IDENTITY PK | |
| RuleId | INT FK -> EconAlertRule | |
| TriggeredAt | DATETIME DEFAULT GETDATE() | |
| Value | DECIMAL(18,4) | |
| Message | NVARCHAR(255) | |
| IsRead | BIT DEFAULT 0 | |

## 種子資料

台灣 7 項（CPI年增率、核心CPI年增率、失業率、PPI年增率、景氣對策信號燈分數、GDP成長率、外銷訂單年增率）+ 美國 8 項（CPI、核心CPI、失業率、PPI、非農就業人數、聯邦基金利率、10年期公債殖利率、GDP成長率），詳見 `scripts/sql/macro_schema.sql` 第 5 節。

## 回滾方式

若需撤銷本次異動，依序執行：

```sql
DROP TABLE MACRO.EconAlertLog;
DROP TABLE MACRO.EconAlertRule;
DROP TABLE MACRO.EconIndicatorValue;
DROP TABLE MACRO.EconIndicator;
DROP SCHEMA MACRO;
```

並將 `JazzerLifeContext.cs`、`User.cs` 中對應的 DbSet / 屬性 / 檔案移除。
