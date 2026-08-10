# RENT schema 結構備份（主表電費紀錄改為明確的起訖月份區間）

- **建立日期**：2026-08-10
- **異動類型**：新增欄位 + 唯一索引置換（`RENT.MasterMeterReading`），既有資料以原雙月假設自動回填
- **前置條件**：需已執行過 `scripts/sql/rent_schema.sql` 與 `scripts/sql/rent_schema_add_public_electricity_2026-07-27.sql`
- **對應腳本**：`scripts/sql/rent_schema_add_master_period_2026-08-10.sql`
- **搭配資料修正腳本**：`scripts/sql/rent_fix_initial_readings_2026-08-10.sql`（見文末）
- **對應 Model**：`RentMasterMeterReading.cs` 新增 `StartMonth`／`EndMonth`
- **對應 DbContext 變更**：`JazzerLifeContext.cs` 的 `RentMasterMeterReading` 唯一索引改為
  `(PropertyId, EndMonth)` / `UQ_RentMasterMeterReading_PropertyEndMonth`
- **對應 API**：`RentMasterMeterEndpoints.cs`（upsert 改用起訖月 + 區間重疊檢查、`ComputeEstimateAsync` 重寫）、
  `RentBillEndpoints.cs`（草稿列不再自動帶入試算值、公共電費改為快照）
- **對應前端頁面**：`rent.html` / `rent.js` / `rent.css`

## 改動原因

原設計一筆主表紀錄只存單一 `BillMonth`，試算時寫死拿「該月 + 上個月」兩個月的房間用電去跟主表總用電比較。
「一筆涵蓋兩個月」這個約定只存在於程式碼裡，不在資料裡，造成三個問題：

1. 使用者在畫面上只能填一個月份，得自己記得要填雙月期間的**後面**那個月，填錯不會有任何警告
2. 相鄰兩個月若各登記一筆主表紀錄，中間重疊的那個月會被計算兩次
3. 台電哪一期改成單月抄表或跨三個月，這套隱含規則就默默算錯

改成把區間存進資料庫後，試算變成「主表總度數 − 區間內所有月份、所有房間的用電加總」，
並由 API 在儲存時擋掉區間重疊。

## 抄表日期的處理原則

房間分表固定每月 15 日抄表，台電主表的抄表日期不會與之對齊。經確認**不做日期層級的對齊或比例換算**，
期間一律以「月」為單位，日期落差視為可接受誤差。因此公共度數算出負數時不視為錯誤，
一律以 0 計（不倒扣房客）並在畫面提示，只有負得離譜（超過主表總度數）才提示可能是期間或讀數填錯。

## 資料表結構異動

### RENT.MasterMeterReading（新增欄位）

| 欄位 | 型別 | 說明 |
|---|---|---|
| StartMonth | DATE NOT NULL | 這一期主表帳單涵蓋的起始月（存當月 1 號） |
| EndMonth | DATE NOT NULL | 涵蓋的結束月，同時是**公共電費落帳的月份** |

- `BillMonth` 欄位保留不動，值由 API 同步為 `EndMonth`，僅為相容既有欄位與查詢
- 既有資料回填規則：`EndMonth = BillMonth`、`StartMonth = BillMonth 的上個月`
- 唯一索引：移除 `UQ_RentMasterMeterReading_PropertyMonth (PropertyID, BillMonth)`，
  改為 `UQ_RentMasterMeterReading_PropertyEndMonth (PropertyID, EndMonth)`
- 新增檢查條件 `CK_RentMasterMeterReading_Period`：`EndMonth >= StartMonth`
- 區間「重疊」無法只靠唯一索引表達，由 `RentMasterMeterEndpoints` 於 upsert 時檢查並回 400

## 公共電費試算邏輯（現行版本）

```
公共度數 = 主表總用電度數 − Σ(StartMonth..EndMonth 區間內所有月份、所有房間的 UsageUnits)
          （負數一律以 0 計）
每房分配度數 = 公共度數 ÷ 目前啟用中的房間數
每房公共電費 = round(每房分配度數 × 該房間自己的 ElectricityRate)
```

- 分母採「目前啟用中的房間數」（`RENT.Room.IsActive`），已退租房間在區間內的用電仍會被扣除，只是不分攤公共部分
- 主表的 `TotalAmount` **不進入計算**，僅在畫面上供對照平均電價。
  這是刻意的取捨：使用者選擇維持「度數平均分攤 × 各房約定電價」，
  代價是分攤總額與台電實際帳單金額會有落差（各房電價與實際均價的差額由房東吸收或多收）
- 電費計算頁畫面上尚未存檔的本月讀數，會以 `currentMonthUsage` 參數傳入並取代該月的資料庫值

## PublicElectricityFee 改為快照欄位

`RENT.RoomBill.PublicElectricityFee` 的行為自本次起改為比照房租／電價／調整金額的快照設計
（原本是每次儲存都直接覆蓋）：

- `POST /api/rent/bills` 請求中的 `PublicElectricityFee` 改為**可為 null**，null 代表「維持資料庫既有值」
- 前端只有在使用者明確重新試算或解鎖手動修改該格時才會帶值送出
- 目的：避免按「儲存本月帳單」或重新試算時，把先前已確認的金額無聲蓋掉

（此為程式行為變更，**資料表結構未變動**。）

## API 端點異動

| 方法 | 路徑 | 異動內容 |
|---|---|---|
| GET | `/api/rent/master-meter` | 回傳多 `StartMonth`／`EndMonth`，排序改依 `EndMonth` |
| POST | `/api/rent/master-meter` | 請求改收 `StartMonth`／`EndMonth`（取代 `BillMonth`）；新增區間重疊檢查 |
| GET | `/api/rent/public-electricity-estimate` | 改用 `EndMonth` 尋找主表紀錄；回傳新增 `StartMonth`／`EndMonth`／`MasterTotalAmount`／`MonthlyBreakdown`（逐月各房用電）／`RawExcessUsage`／`IsNegativeExcess`；移除 `PrevMonthRoomUsage`／`CurrentMonthRoomUsage` |
| GET | `/api/rent/bills` | 草稿列**不再**自動帶入公共電費試算值，一律回 0（由前端顯示「待試算」） |
| POST | `/api/rent/bills` | `PublicElectricityFee` 改為可為 null（維持既有快照） |

## 前端影響範圍

- Tab1「電費計算」新增流程列（① 填本月讀數 → ② 帶入公共電費 → ③ 儲存），顯示該月主表是否已登記；
  未登記時「帶入公共電費」停用並提供前往登記的連結（不再靜默把整欄填 0）
- Tab1 公共電費欄位：草稿列顯示「待試算」，已存檔的列預設鎖定，需按鎖頭解鎖才能手動修改
- Tab3「公共電費」表單改為期間起始月／結束月兩個欄位（填起始月會自動帶出下一個月當結束月）；
  移除「套用到電費計算表」按鈕，套用入口統一收在 Tab1；試算面板新增逐月用電明細與負數提示

---

# 附：期初讀數資料修正（rent_fix_initial_readings_2026-08-10.sql）

房間第一次建立帳單時沒有上月讀數可承接（預設 0），使用者填入電表當下的累積讀數後，
`UsageUnits` 會變成整顆電表的累積讀數而非當月用電量。正式資料庫的 2026-05 即為此種期初列：
四間房合計 110,148 度、電費算出 10~19 萬元，四列皆為未收款、並非真實收取的帳單。

這批資料會讓「區間內各房用電加總」暴增、公共度數變成大幅負數，使試算失效，因此需要修正：

```
判定條件：PrevReading = 0 AND CurrentReading > 0 AND UsageUnits > 0
修正內容：PrevReading = CurrentReading、UsageUnits = 0、ElectricityFee = 0、
          TotalAmount = RentSnapshot + AdjustmentSnapshot + PublicElectricityFee
```

`CurrentReading`（初始電表讀數）刻意保留不動，那是唯一記錄「這顆電表從哪裡起算」的地方。
腳本可重複執行，第二次執行時已無符合條件的資料列。
