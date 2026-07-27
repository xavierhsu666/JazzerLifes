using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using JazzerLifeApi.Models;

namespace JazzerLifeApi.Endpoints
{
    public static class RentMasterMeterEndpoints
    {
        public static void MapRentMasterMeterEndpoints(this WebApplication app)
        {
            // 查詢某物件所有主表（母表／台電帳單）電費紀錄
            app.MapGet("/api/rent/master-meter", async (int propertyId, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                try
                {
                    var ownsProperty = await db.RentProperties.AnyAsync(p => p.PropertyId == propertyId && p.UserId == userId);
                    if (!ownsProperty) return Results.NotFound(new { message = "找不到該出租物件" });

                    var records = await db.RentMasterMeterReadings
                        .Where(m => m.PropertyId == propertyId)
                        .OrderByDescending(m => m.BillMonth)
                        .Select(m => new
                        {
                            m.MasterBillId,
                            m.PropertyId,
                            BillMonth = m.BillMonth.ToString("yyyy-MM"),
                            m.TotalUsageUnits,
                            m.TotalAmount,
                            m.Note
                        })
                        .ToListAsync();

                    return Results.Ok(records);
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "查詢主表電費紀錄失敗", detail = ex.Message }, statusCode: 500);
                }
            });

            // 新增/更新主表電費紀錄（依 PropertyId + BillMonth upsert）
            app.MapPost("/api/rent/master-meter", async (RentMasterMeterUpsertRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                if (!TryParseBillMonth(req.BillMonth, out var billMonth))
                    return Results.BadRequest(new { message = "月份格式錯誤，需為 yyyy-MM" });
                if (req.TotalUsageUnits < 0 || req.TotalAmount < 0)
                    return Results.BadRequest(new { message = "總用電度數與總金額不可為負數" });

                try
                {
                    var ownsProperty = await db.RentProperties.AnyAsync(p => p.PropertyId == req.PropertyId && p.UserId == userId);
                    if (!ownsProperty) return Results.NotFound(new { message = "找不到該出租物件" });

                    var existing = await db.RentMasterMeterReadings
                        .FirstOrDefaultAsync(m => m.PropertyId == req.PropertyId && m.BillMonth == billMonth);

                    if (existing == null)
                    {
                        db.RentMasterMeterReadings.Add(new RentMasterMeterReading
                        {
                            PropertyId = req.PropertyId,
                            BillMonth = billMonth,
                            TotalUsageUnits = req.TotalUsageUnits,
                            TotalAmount = req.TotalAmount,
                            Note = string.IsNullOrWhiteSpace(req.Note) ? null : req.Note.Trim(),
                            CreatedAt = DateTime.Now,
                            UpdatedAt = DateTime.Now,
                        });
                    }
                    else
                    {
                        existing.TotalUsageUnits = req.TotalUsageUnits;
                        existing.TotalAmount = req.TotalAmount;
                        existing.Note = string.IsNullOrWhiteSpace(req.Note) ? null : req.Note.Trim();
                        existing.UpdatedAt = DateTime.Now;
                    }

                    await db.SaveChangesAsync();
                    return Results.Ok(new { message = "已儲存主表電費紀錄" });
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "儲存主表電費紀錄失敗", detail = ex.Message }, statusCode: 500);
                }
            });

            // 刪除主表電費紀錄
            app.MapDelete("/api/rent/master-meter/{id:int}", async (int id, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                try
                {
                    var record = await db.RentMasterMeterReadings
                        .Include(m => m.Property)
                        .FirstOrDefaultAsync(m => m.MasterBillId == id && m.Property.UserId == userId);
                    if (record == null) return Results.NotFound(new { message = "找不到該筆主表電費紀錄" });

                    db.RentMasterMeterReadings.Remove(record);
                    await db.SaveChangesAsync();

                    return Results.Ok(new { message = "已刪除主表電費紀錄" });
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "刪除主表電費紀錄失敗", detail = ex.Message }, statusCode: 500);
                }
            });

            // 試算某電費月的公共電費建議金額（供「公共電費」頁籤顯示試算明細用）。
            // currentMonthUsage 選填：前端若已經在畫面上輸入了本月讀數（尚未儲存），可把即時加總傳進來，
            // 試算會優先採用這個即時值，而不是資料庫裡（可能還沒存檔、或還沒有）的本月帳單資料
            app.MapGet("/api/rent/public-electricity-estimate", async (int propertyId, string month, decimal? currentMonthUsage, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                if (!TryParseBillMonth(month, out var billMonth))
                    return Results.BadRequest(new { message = "月份格式錯誤，需為 yyyy-MM" });

                try
                {
                    var ownsProperty = await db.RentProperties.AnyAsync(p => p.PropertyId == propertyId && p.UserId == userId);
                    if (!ownsProperty) return Results.NotFound(new { message = "找不到該出租物件" });

                    var estimate = await ComputeEstimateAsync(db, propertyId, billMonth, currentMonthUsage);
                    return Results.Ok(estimate);
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "試算公共電費失敗", detail = ex.Message }, statusCode: 500);
                }
            });
        }

        /// <summary>
        /// 試算公共電費：主表（母表）通常兩個月才抄一次表，所以「電費月」這筆主表紀錄的總用電度數，
        /// 實際涵蓋的是「這個月＋上個月」兩個月的用電，要拿這兩個月所有房間分表用電度數加總去比較才公平。
        /// 算法：(電費月各房用電加總 + 上個月各房用電加總) 與主表總用電度數的差額 = 公共部分度數，
        /// 度數平均分配給目前啟用中的每個房間，再用「各房間自己設定的每度電費」分別換算成金額
        /// （每間房約定的電價可能不同，不能用主表帳單的整體均價一概而論）。
        /// 上個月或電費月當月若查無房間帳單資料，一律當 0 計算，不會擋住試算。
        /// 供 RentBillEndpoints（GET /api/rent/bills 草稿列預設值）與本檔案的試算端點共用。
        /// </summary>
        public static async Task<PublicElectricityEstimateResult> ComputeEstimateAsync(JazzerLifeContext db, int propertyId, DateOnly targetBillMonth, decimal? currentMonthUsageOverride = null)
        {
            var master = await db.RentMasterMeterReadings
                .FirstOrDefaultAsync(m => m.PropertyId == propertyId && m.BillMonth == targetBillMonth);

            var activeRooms = await db.RentRooms
                .Where(r => r.PropertyId == propertyId && r.IsActive)
                .OrderBy(r => r.SortOrder).ThenBy(r => r.RoomId)
                .Select(r => new { r.RoomId, r.RoomAlias, r.ElectricityRate })
                .ToListAsync();

            if (master == null || activeRooms.Count == 0)
            {
                var reason = master == null
                    ? "尚無 " + targetBillMonth.ToString("yyyy-MM") + " 的主表電費紀錄，請先在下方新增"
                    : "目前沒有啟用中的房間";

                return new PublicElectricityEstimateResult(
                    HasData: false,
                    MasterTotalUsageUnits: 0m,
                    PrevMonthRoomUsage: 0m,
                    CurrentMonthRoomUsage: 0m,
                    CombinedRoomUsage: 0m,
                    ExcessUsage: 0m,
                    PerRoomUsageShare: 0m,
                    ActiveRoomCount: activeRooms.Count,
                    RoomBreakdown: new List<PublicElectricityRoomEstimate>(),
                    Message: reason
                );
            }

            var prevMonth = targetBillMonth.AddMonths(-1);
            // 上個月沒有房間帳單資料（例如剛開始使用本功能）就當 0，不擋住試算
            var prevMonthRoomUsage = await db.RentRoomBills
                .Where(b => b.BillMonth == prevMonth && b.Room.PropertyId == propertyId)
                .Select(b => (decimal?)b.UsageUnits)
                .SumAsync() ?? 0m;

            // 電費月當月若前端有傳即時加總（畫面上還沒存檔的本月讀數）就優先用它，
            // 沒有傳的話（例如剛載入 Tab1 時的預設值）就退回資料庫已存的本月資料，一樣沒有就當 0
            var currentMonthRoomUsage = currentMonthUsageOverride ?? (
                await db.RentRoomBills
                    .Where(b => b.BillMonth == targetBillMonth && b.Room.PropertyId == propertyId)
                    .Select(b => (decimal?)b.UsageUnits)
                    .SumAsync() ?? 0m
            );

            var combinedRoomUsage = currentMonthRoomUsage + prevMonthRoomUsage;
            var excessUsage = master.TotalUsageUnits - combinedRoomUsage;
            // 度數平均分配給每個目前啟用中的房間（只算度數，不管金額）
            var perRoomUsageShare = excessUsage / activeRooms.Count;

            var breakdown = activeRooms.Select(r => new PublicElectricityRoomEstimate(
                r.RoomId,
                r.RoomAlias,
                r.ElectricityRate,
                perRoomUsageShare,
                // 再用「這間房自己的每度電費」換算成金額，每間房電價不同，算出來的公共電費也可能不同
                Math.Round(perRoomUsageShare * r.ElectricityRate, 0)
            )).ToList();

            return new PublicElectricityEstimateResult(
                HasData: true,
                MasterTotalUsageUnits: master.TotalUsageUnits,
                PrevMonthRoomUsage: prevMonthRoomUsage,
                CurrentMonthRoomUsage: currentMonthRoomUsage,
                CombinedRoomUsage: combinedRoomUsage,
                ExcessUsage: excessUsage,
                PerRoomUsageShare: perRoomUsageShare,
                ActiveRoomCount: activeRooms.Count,
                RoomBreakdown: breakdown,
                Message: null
            );
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

    public record RentMasterMeterUpsertRequest(int PropertyId, string BillMonth, decimal TotalUsageUnits, decimal TotalAmount, string? Note);

    // 單一房間的公共電費試算結果：UsageShare 是分配到的公共度數（每房相同），
    // PublicElectricityFee 是用該房間自己的電價換算後的金額（每房可能不同）
    public record PublicElectricityRoomEstimate(
        int RoomId,
        string RoomAlias,
        decimal ElectricityRate,
        decimal UsageShare,
        decimal PublicElectricityFee
    );

    public record PublicElectricityEstimateResult(
        bool HasData,
        decimal MasterTotalUsageUnits,
        decimal PrevMonthRoomUsage,
        decimal CurrentMonthRoomUsage,
        decimal CombinedRoomUsage,
        decimal ExcessUsage,
        decimal PerRoomUsageShare,
        int ActiveRoomCount,
        List<PublicElectricityRoomEstimate> RoomBreakdown,
        string? Message
    );
}
