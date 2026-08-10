using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using JazzerLifeApi.Models;

namespace JazzerLifeApi.Endpoints
{
    public static class RentBillEndpoints
    {
        public static void MapRentBillEndpoints(this WebApplication app)
        {
            // Tab1：依「目前啟用中的房間清單」組出當月帳單畫面。
            // 若該房間當月尚未建立帳單，回傳一筆「草稿列」（PrevReading 自動帶入上月讀數，
            // 房租/電價/調整金額帶入房間目前設定值），前端可直接編輯後送出 POST 建立正式紀錄
            app.MapGet("/api/rent/bills", async (int propertyId, string month, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                if (!TryParseBillMonth(month, out var billMonth))
                    return Results.BadRequest(new { message = "月份格式錯誤，需為 yyyy-MM" });

                try
                {
                    var ownsProperty = await db.RentProperties.AnyAsync(p => p.PropertyId == propertyId && p.UserId == userId);
                    if (!ownsProperty) return Results.NotFound(new { message = "找不到該出租物件" });

                    var rooms = await db.RentRooms
                        .Where(r => r.PropertyId == propertyId && r.IsActive)
                        .OrderBy(r => r.SortOrder).ThenBy(r => r.RoomId)
                        .ToListAsync();

                    var roomIds = rooms.Select(r => r.RoomId).ToList();
                    // 一次撈出這些房間全部月份的帳單，在記憶體中找「當月既有紀錄」與「上一筆歷史讀數」，
                    // 避免對每個房間各自查詢資料庫（房間數量不多，這樣做足夠且比較簡單好懂）
                    var allBills = await db.RentRoomBills
                        .Where(b => roomIds.Contains(b.RoomId))
                        .ToListAsync();

                    // 公共電費不再於此自動帶入試算值。原本草稿列會塞一個「本月各房用電當 0」算出來的
                    // 試算結果，但公共電費本來就要等本月讀數填完才算得準，那個預設值幾乎必定是錯的，
                    // 使用者卻無從分辨它是暫時值。改成一律回 0 並由前端標示「待試算」，
                    // 實際數字要由使用者在電費計算頁按「帶入公共電費」才會填入。
                    var result = rooms.Select(r =>
                    {
                        var existing = allBills.FirstOrDefault(b => b.RoomId == r.RoomId && b.BillMonth == billMonth);
                        if (existing != null)
                        {
                            return new
                            {
                                BillId = (int?)existing.BillId,
                                r.RoomId,
                                r.RoomAlias,
                                r.SortOrder,
                                existing.PrevReading,
                                existing.CurrentReading,
                                existing.UsageUnits,
                                existing.RentSnapshot,
                                existing.RateSnapshot,
                                existing.AdjustmentSnapshot,
                                existing.PublicElectricityFee,
                                existing.ElectricityFee,
                                existing.TotalAmount,
                                existing.IsPaid,
                                existing.PaidDate,
                                existing.Note,
                                IsDraft = false,
                            };
                        }

                        // 找該房間在此月份之前最近一筆帳單的「本月讀數」，作為這個月的「上月讀數」；
                        // 若完全沒有歷史紀錄（房間第一次使用），期初讀數預設 0，需使用者自行填入實際電表讀數
                        var prevReading = allBills
                            .Where(b => b.RoomId == r.RoomId && b.BillMonth < billMonth)
                            .OrderByDescending(b => b.BillMonth)
                            .Select(b => (decimal?)b.CurrentReading)
                            .FirstOrDefault() ?? 0m;

                        return new
                        {
                            BillId = (int?)null,
                            r.RoomId,
                            r.RoomAlias,
                            r.SortOrder,
                            PrevReading = prevReading,
                            CurrentReading = prevReading, // 預設等於上月讀數，用電度數先顯示 0，待使用者填入實際讀數
                            UsageUnits = 0m,
                            RentSnapshot = r.MonthlyRent,
                            RateSnapshot = r.ElectricityRate,
                            AdjustmentSnapshot = r.AdjustmentAmount,
                            PublicElectricityFee = 0m,
                            ElectricityFee = 0m,
                            TotalAmount = r.MonthlyRent + r.AdjustmentAmount,
                            IsPaid = false,
                            PaidDate = (DateOnly?)null,
                            Note = (string?)null,
                            IsDraft = true,
                        };
                    }).ToList();

                    return Results.Ok(result);
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "查詢當月帳單失敗", detail = ex.Message }, statusCode: 500);
                }
            });

            // 批次儲存當月帳單。新建立的列會把房間目前設定值寫死存成快照；
            // 已存在的列只更新讀數/備註，快照金額（房租/電價/調整金額）維持建立當時的值不被覆蓋
            app.MapPost("/api/rent/bills", async (RentBillSaveRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                if (!TryParseBillMonth(req.BillMonth, out var billMonth))
                    return Results.BadRequest(new { message = "月份格式錯誤，需為 yyyy-MM" });

                if (req.Rows == null || req.Rows.Count == 0)
                    return Results.BadRequest(new { message = "沒有可儲存的資料列" });

                try
                {
                    var ownsProperty = await db.RentProperties.AnyAsync(p => p.PropertyId == req.PropertyId && p.UserId == userId);
                    if (!ownsProperty) return Results.NotFound(new { message = "找不到該出租物件" });

                    var roomIds = req.Rows.Select(r => r.RoomId).Distinct().ToList();
                    var rooms = await db.RentRooms
                        .Where(r => r.PropertyId == req.PropertyId && roomIds.Contains(r.RoomId))
                        .ToListAsync();

                    if (rooms.Count != roomIds.Count)
                        return Results.BadRequest(new { message = "資料列中含有不屬於此物件的房間" });

                    var existingBills = await db.RentRoomBills
                        .Where(b => roomIds.Contains(b.RoomId) && b.BillMonth == billMonth)
                        .ToListAsync();

                    foreach (var row in req.Rows)
                    {
                        var room = rooms.First(r => r.RoomId == row.RoomId);

                        // 每次儲存都重新查詢「上個月讀數」，避免補改以前月份資料後，這個月的期初讀數沒跟著更新
                        var prevReading = await db.RentRoomBills
                            .Where(b => b.RoomId == row.RoomId && b.BillMonth < billMonth)
                            .OrderByDescending(b => b.BillMonth)
                            .Select(b => (decimal?)b.CurrentReading)
                            .FirstOrDefaultAsync() ?? row.PrevReadingOverride ?? 0m;

                        var existing = existingBills.FirstOrDefault(b => b.RoomId == row.RoomId);
                        var usageUnits = row.CurrentReading - prevReading;

                        // 公共電費自 2026-08-10 起改為快照欄位，行為比照房租/電價/調整金額：
                        // 建立當下寫入，之後一般儲存不會再動它。請求中的 PublicElectricityFee 為 null
                        // 代表「維持資料庫既有值」，前端只有在使用者明確重新試算或手動修改該格時才會帶值。
                        // 這樣按「儲存本月帳單」就不會把先前試算或手動調整過的金額無聲蓋掉。
                        if (existing == null)
                        {
                            var rentSnapshot = room.MonthlyRent;
                            var rateSnapshot = room.ElectricityRate;
                            var adjustmentSnapshot = room.AdjustmentAmount;
                            var electricityFee = usageUnits * rateSnapshot;
                            var publicElectricityFee = row.PublicElectricityFee ?? 0m;

                            db.RentRoomBills.Add(new RentRoomBill
                            {
                                RoomId = row.RoomId,
                                BillMonth = billMonth,
                                PrevReading = prevReading,
                                CurrentReading = row.CurrentReading,
                                UsageUnits = usageUnits,
                                RentSnapshot = rentSnapshot,
                                RateSnapshot = rateSnapshot,
                                AdjustmentSnapshot = adjustmentSnapshot,
                                PublicElectricityFee = publicElectricityFee,
                                ElectricityFee = electricityFee,
                                TotalAmount = electricityFee + rentSnapshot + adjustmentSnapshot + publicElectricityFee,
                                IsPaid = false,
                                Note = string.IsNullOrWhiteSpace(row.Note) ? null : row.Note.Trim(),
                                CreatedAt = DateTime.Now,
                                UpdatedAt = DateTime.Now,
                            });
                        }
                        else
                        {
                            // 快照金額（RentSnapshot/RateSnapshot/AdjustmentSnapshot）維持原樣不變，
                            // 這是「當月建立時快照」設計的核心：之後調整房間設定不會動到已產生的歷史月份金額
                            existing.PrevReading = prevReading;
                            existing.CurrentReading = row.CurrentReading;
                            existing.UsageUnits = usageUnits;
                            // null = 維持既有的公共電費快照，只有明確帶值時才覆寫
                            if (row.PublicElectricityFee.HasValue)
                                existing.PublicElectricityFee = row.PublicElectricityFee.Value;
                            existing.ElectricityFee = usageUnits * existing.RateSnapshot;
                            existing.TotalAmount = existing.ElectricityFee + existing.RentSnapshot + existing.AdjustmentSnapshot + existing.PublicElectricityFee;
                            existing.Note = string.IsNullOrWhiteSpace(row.Note) ? null : row.Note.Trim();
                            existing.UpdatedAt = DateTime.Now;
                        }
                    }

                    await db.SaveChangesAsync();
                    return Results.Ok(new { message = "已儲存當月帳單" });
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "儲存當月帳單失敗", detail = ex.Message }, statusCode: 500);
                }
            });

            // 切換已收/未收款狀態
            app.MapPost("/api/rent/bills/{id:int}/toggle-paid", async (int id, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                try
                {
                    var bill = await db.RentRoomBills
                        .Include(b => b.Room)
                        .ThenInclude(r => r.Property)
                        .FirstOrDefaultAsync(b => b.BillId == id && b.Room.Property.UserId == userId);
                    if (bill == null) return Results.NotFound(new { message = "找不到該筆帳單" });

                    bill.IsPaid = !bill.IsPaid;
                    bill.PaidDate = bill.IsPaid ? DateOnly.FromDateTime(DateTime.Now) : null;
                    bill.UpdatedAt = DateTime.Now;
                    await db.SaveChangesAsync();

                    return Results.Ok(new { message = "已更新繳費狀態", isPaid = bill.IsPaid, paidDate = bill.PaidDate });
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "更新繳費狀態失敗", detail = ex.Message }, statusCode: 500);
                }
            });
        }

        private static bool TryParseBillMonth(string? month, out DateOnly billMonth)
        {
            billMonth = default;
            if (string.IsNullOrWhiteSpace(month)) return false;

            var parts = month.Split('-');
            if (parts.Length != 2) return false;
            if (!int.TryParse(parts[0], out var year) || !int.TryParse(parts[1], out var monthNum)) return false;
            if (monthNum < 1 || monthNum > 12) return false;

            try
            {
                billMonth = new DateOnly(year, monthNum, 1);
                return true;
            }
            catch
            {
                return false;
            }
        }

        private static int? GetUserId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(idStr, out int id) ? id : null;
        }
    }

    // PublicElectricityFee 為 null 代表「維持資料庫既有值」（公共電費是快照欄位，見上方儲存邏輯說明）
    public record RentBillRowRequest(int RoomId, decimal CurrentReading, decimal? PublicElectricityFee, decimal? PrevReadingOverride, string? Note);
    public record RentBillSaveRequest(int PropertyId, string BillMonth, List<RentBillRowRequest> Rows);
}
