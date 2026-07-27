# RENT schema 結構備份（租屋處電費管理）

- **建立日期**：2026-07-27
- **異動類型**：新增（新建 RENT schema，共 3 張表，不影響既有資料表）
- **對應腳本**：`scripts/sql/rent_schema.sql`
- **對應 Model**：`JazzerLifeApi/Models/RentProperty.cs`、`RentRoom.cs`、`RentRoomBill.cs`
- **對應 DbContext 變更**：`JazzerLifeApi/Models/JazzerLifeContext.cs` 新增 `DbSet<RentProperty> RentProperties`、`DbSet<RentRoom> RentRooms`、`DbSet<RentRoomBill> RentRoomBills`，並在 `OnModelCreating` 新增對應設定
- **對應 API**：`RentPropertyEndpoints.cs` / `RentRoomEndpoints.cs` / `RentBillEndpoints.cs`
- **對應前端頁面**：新模組 `wwwroot/rent/rent.html` + `assets/js/rent.js`，Tab1「電費計算」／Tab2「房間設定」

## 功能說明

個人租屋處電費／房租管理工具。Tab2 設定每個房間的別名、房租、每度電費、彈性調整金額；Tab1 依房間設定
自動產生當月填寫欄位，填入電表讀數後計算當期應繳總額（電費＋房租＋調整金額），並可將表格複製成圖片
傳給房客對帳。

設計上採「當月建立時快照」：每次在 Tab1 產生某月帳單時，把當時房間設定的房租／電價／調整金額寫死存入
`RENT.RoomBill` 對應欄位，之後若在 Tab2 調整房間設定，不會影響已經產生的歷史月份金額，帳務可追溯。

目前設計為可支援多物件（`RENT.Property`），但暫無多物件的前端切換 UI，先預設使用者名下第一筆
（或唯一一筆）物件；若之後有第二個出租地址，只需在前端加上物件選擇器，資料庫結構不需異動。

## 資料表結構

### RENT.Property（出租物件）

| 欄位 | 型別 | 說明 |
|---|---|---|
| PropertyID | INT IDENTITY PK | |
| UserID | INT NOT NULL | 沒有額外 FK 約束（比照 FIN.AccountCategory 慣例），僅在應用層以 ClaimsPrincipal 過濾 |
| PropertyName | NVARCHAR(100) | 物件別名 |
| Address | NVARCHAR(200) NULL | 選填 |
| IsActive | BIT DEFAULT 1 | 停用不顯示，保留歷史 |
| CreatedAt / UpdatedAt | DATETIME DEFAULT GETDATE() | |

INDEX (UserID)

### RENT.Room（房間設定，對應 Tab2）

| 欄位 | 型別 | 說明 |
|---|---|---|
| RoomID | INT IDENTITY PK | |
| PropertyID | INT NOT NULL FK -> RENT.Property | |
| RoomAlias | NVARCHAR(50) | 房間別名 |
| MonthlyRent | DECIMAL(18,2) | 房租 |
| ElectricityRate | DECIMAL(18,4) | 每度電費（用 4 位小數容納細分費率） |
| AdjustmentAmount | DECIMAL(18,2) | 彈性調整金額預設值，可正可負（正＝加收，負＝折抵） |
| SortOrder | INT DEFAULT 0 | Tab1/Tab2 顯示排序 |
| IsActive | BIT DEFAULT 1 | 軟刪除／退租標記，停用後 Tab1 不再列出，但歷史帳單保留 |
| CreatedAt / UpdatedAt | DATETIME DEFAULT GETDATE() | |

INDEX (PropertyID)

### RENT.RoomBill（月度帳單，對應 Tab1，每房每月一筆）

| 欄位 | 型別 | 說明 |
|---|---|---|
| BillID | INT IDENTITY PK | |
| RoomID | INT NOT NULL FK -> RENT.Room | |
| BillMonth | DATE | 存當月 1 號，例如 2026-07-01 |
| PrevReading | DECIMAL(18,2) | 上月電表讀數，建立時自動帶入上月 CurrentReading |
| CurrentReading | DECIMAL(18,2) | 本月電表讀數 |
| UsageUnits | DECIMAL(18,2) | 用電度數，由 API 算好寫入（非 SQL 計算欄位），保留手動覆蓋彈性 |
| RentSnapshot | DECIMAL(18,2) | 建立當月帳單時的房租快照 |
| RateSnapshot | DECIMAL(18,4) | 建立當月帳單時的每度電費快照 |
| AdjustmentSnapshot | DECIMAL(18,2) | 建立當月帳單時的調整金額快照 |
| ElectricityFee | DECIMAL(18,2) | = UsageUnits × RateSnapshot |
| TotalAmount | DECIMAL(18,2) | = ElectricityFee + RentSnapshot + AdjustmentSnapshot |
| IsPaid | BIT DEFAULT 0 | 已收/未收 |
| PaidDate | DATE NULL | 收款日期 |
| Note | NVARCHAR(200) NULL | 備註 |
| CreatedAt / UpdatedAt | DATETIME DEFAULT GETDATE() | |

UNIQUE (RoomID, BillMonth)；INDEX (BillMonth)

## API 端點

| 方法 | 路徑 | 說明 |
|---|---|---|
| GET/POST/PUT | `/api/rent/properties` | 出租物件查詢/新增/更新 |
| GET/POST/PUT | `/api/rent/rooms` | 房間設定查詢（含停用篩選）/新增/更新（含停用退租） |
| GET | `/api/rent/bills` | 查詢某物件某月所有房間帳單（無資料的房間回傳前端可編輯的空白列） |
| POST | `/api/rent/bills` | 批次儲存當月帳單（依房間目前設定產生快照＋計算金額，UNIQUE 衝突則更新既有列） |
| POST | `/api/rent/bills/{id}/toggle-paid` | 切換已收/未收狀態 |

## 前端影響範圍

- 全新模組，不影響 car / finance / macro 既有頁面與計算邏輯。
- `wwwroot/rent/rent.html`：Tab1「電費計算」（月份選擇＋ag-Grid可編輯表格＋複製表格圖片按鈕）、
  Tab2「房間設定」（房間清單 CRUD）。
- 複製圖片使用 `html2canvas`（CDN 引入），對表格 DOM 節點擷取後透過 Clipboard API 寫入剪貼簿，
  不支援 Clipboard API 的瀏覽器 fallback 為直接下載 PNG。
