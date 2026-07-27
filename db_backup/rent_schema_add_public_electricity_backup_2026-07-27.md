# RENT schema 結構備份（新增：公共電費）

- **建立日期**：2026-07-27
- **異動類型**：新增（`RENT.RoomBill` 加一個欄位 + 新增 `RENT.MasterMeterReading` 一張表，不影響既有資料）
- **前置條件**：需已執行過 `scripts/sql/rent_schema.sql`
- **對應腳本**：`scripts/sql/rent_schema_add_public_electricity_2026-07-27.sql`
- **對應 Model**：`RentRoomBill.cs`（新增 `PublicElectricityFee`）、新增 `RentMasterMeterReading.cs`
- **對應 DbContext 變更**：`JazzerLifeContext.cs` 新增 `DbSet<RentMasterMeterReading> RentMasterMeterReadings`，
  `RentRoomBill` 的 `OnModelCreating` 設定新增 `PublicElectricityFee` 欄位對應
- **對應 API**：新增 `RentMasterMeterEndpoints.cs`；`RentBillEndpoints.cs` 的 GET/POST `/api/rent/bills` 一併調整
- **對應前端頁面**：`rent.html` / `rent.js` 新增「公共電費」頁籤，Tab1 帳單表格新增「公共電費」欄位，
  新增「複製電費圖片」按鈕

## 功能說明

背景：房間各自有分表（子表）計算個別用電，但主表（母表／台電帳單）的總用電量通常會比所有房間分表加總多一些
（公共走廊燈、抽水馬達等），這部分「公共電費」需要由房東手動分攤給各房間。

台電帳單通常有約 2 個月的落差，所以試算邏輯是：「電費月」往前推 2 個月，用那個期間的主表總用電度數，
減去該期間所有房間分表用電度數加總，得到公共部分的度數，乘上主表當期的平均電價（`TotalAmount / TotalUsageUnits`）
得到公共電費總金額，再除以「目前啟用中的房間數」平均分攤，算出建議的每房公共電費金額。

`PublicElectricityFee` **不是**「當月建立時快照」欄位（跟房租/電價/調整金額不同），而是每月都可以彈性覆蓋的
手動輸入金額：畫面載入時會帶入試算建議值（若該月帳單尚未建立），使用者仍可自行調整後再儲存，儲存時一律以
使用者畫面上的值為準（不會被試算結果覆蓋）。

`RENT.RoomBill.TotalAmount` 計算公式更新為：
`TotalAmount = ElectricityFee + RentSnapshot + AdjustmentSnapshot + PublicElectricityFee`

## 資料表結構異動

### RENT.RoomBill（新增欄位）

| 欄位 | 型別 | 說明 |
|---|---|---|
| PublicElectricityFee | DECIMAL(18,2) DEFAULT 0 | 公共電費分攤金額，每月可彈性覆蓋，不鎖定 |

### RENT.MasterMeterReading（新表，主表/母表電費紀錄）

| 欄位 | 型別 | 說明 |
|---|---|---|
| MasterBillID | INT IDENTITY PK | |
| PropertyID | INT NOT NULL FK -> RENT.Property | |
| BillMonth | DATE | 主表這一期帳單對應的期間（試算時用「電費月往前推 2 個月」去查這裡） |
| TotalUsageUnits | DECIMAL(18,2) | 主表（台電帳單）該期總用電度數 |
| TotalAmount | DECIMAL(18,2) | 主表該期總電費金額 |
| Note | NVARCHAR(200) NULL | 備註 |
| CreatedAt / UpdatedAt | DATETIME DEFAULT GETDATE() | |

UNIQUE (PropertyID, BillMonth)

## API 端點（新增/異動）

| 方法 | 路徑 | 說明 |
|---|---|---|
| GET | `/api/rent/master-meter` | 查詢某物件所有主表電費紀錄 |
| POST | `/api/rent/master-meter` | 新增/更新（依 PropertyId+BillMonth upsert）主表電費紀錄 |
| DELETE | `/api/rent/master-meter/{id}` | 刪除主表電費紀錄 |
| GET | `/api/rent/public-electricity-estimate` | 試算某電費月的公共電費建議金額（含試算明細） |
| GET | `/api/rent/bills`（異動） | 回傳每列多一個 `PublicElectricityFee`；草稿列（尚未建立帳單）會自動帶入試算建議值 |
| POST | `/api/rent/bills`（異動） | 儲存時一併寫入 `PublicElectricityFee`（每次都以請求內容為準，不鎖定） |

## 前端影響範圍

- Tab1「電費計算」表格新增「公共電費」欄位（可編輯 input），計入應繳合計；新增「複製電費圖片」按鈕，
  只擷取房間/讀數/用電度數/電費/公共電費相關欄位（不含房租/調整金額/應繳合計/繳費狀態/備註）。
- 新增側邊欄頁籤「公共電費」：管理主表電費紀錄（新增/刪除），並顯示目前電費月對應期間的試算明細，
  提供「套用到電費計算表」按鈕把試算金額寫回 Tab1 各房間的公共電費輸入框（仍需手動按「儲存本月帳單」才會存檔）。
