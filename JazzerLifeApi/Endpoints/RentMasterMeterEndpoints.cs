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
                        .OrderByDescending(m => m.EndMonth)
                        .Select(m => new
                        {
                            m.MasterBillId,
                            m.PropertyId,
                            BillMonth = m.BillMonth.ToString("yyyy-MM"),
                            StartMonth = m.StartMonth.ToString("yyyy-MM"),
                            EndMonth = m.EndMonth.ToString("yyyy-MM"),
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

            // 新增/更新主表電費紀錄（依 PropertyId + EndMonth upsert）
            app.MapPost("/api/rent/master-meter", async (RentMasterMeterUpsertRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                if (!TryParseBillMonth(req.StartMonth, out var startMonth))
                    return Results.BadRequest(new { message = "起始月份格式錯誤，需為 yyyy-MM" });
                if (!TryParseBillMonth(req.EndMonth, out var endMonth))
                    return Results.BadRequest(new { message = "結束月份格式錯誤，需為 yyyy-MM" });
                if (endMonth < startMonth)
                    return Results.BadRequest(new { message = "結束月份不可早於起始月份" });
                if (req.TotalUsageUnits < 0 || req.TotalAmount < 0)
                    return Results.BadRequest(new { message = "總用電度數與總金額不可為負數" });

                try
                {
                    var ownsProperty = await db.RentProperties.AnyAsync(p => p.PropertyId == req.PropertyId && p.UserId == userId);
                    if (!ownsProperty) return Results.NotFound(new { message = "找不到該出租物件" });

                    var existing = await db.RentMasterMeterReadings
                        .FirstOrDefaultAsync(m => m.PropertyId == req.PropertyId && m.EndMonth == endMonth);

                    // 區間重疊檢查：同一個物件的兩筆主表紀錄若期間相交，中間重疊的月份會被計算兩次
                    // （這正是舊設計「一筆隱含涵蓋兩個月」時，相鄰月份各登記一筆就會踩到的坑）
                    var overlapping = await db.RentMasterMeterReadings
                        .Where(m => m.PropertyId == req.PropertyId
                                    && (existing == null || m.MasterBillId != existing.MasterBillId)
                                    && m.StartMonth <= endMonth
                                    && m.EndMonth >= startMonth)
                        .Select(m => new { m.StartMonth, m.EndMonth })
                        .FirstOrDefaultAsync();

                    if (overlapping != null)
                    {
                        return Results.BadRequest(new
                        {
                            message = "此期間與既有的主表紀錄（" + overlapping.StartMonth.ToString("yyyy-MM") +
                                      " ~ " + overlapping.EndMonth.ToString("yyyy-MM") + "）重疊，重疊月份的用電會被重複計算，請先調整期間"
                        });
                    }

                    if (existing == null)
                    {
                        db.RentMasterMeterReadings.Add(new RentMasterMeterReading
                        {
                            PropertyId = req.PropertyId,
                            // BillMonth 為相容既有欄位而保留，值一律同步為結算月（EndMonth）
                            BillMonth = endMonth,
                            StartMonth = startMonth,
                            EndMonth = endMonth,
                            TotalUsageUnits = req.TotalUsageUnits,
                            TotalAmount = req.TotalAmount,
                            Note = string.IsNullOrWhiteSpace(req.Note) ? null : req.Note.Trim(),
                            CreatedAt = DateTime.Now,
                            UpdatedAt = DateTime.Now,
                        });
                    }
                    else
                    {
                        existing.BillMonth = endMonth;
                        existing.StartMonth = startMonth;
                        existing.EndMonth = endMonth;
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
        /// 試算公共電費。
        ///
        /// 主表（母表／台電帳單）通常兩個月才抄一次表，且抄表日與房間分表的抄表日（每月 15 號）
        /// 不會完全對齊。這裡不做日期層級的對齊或比例換算——期間一律以「月」為單位，
        /// 日期落差視為可接受的誤差（使用者已確認「差不多就好」）。
        ///
        /// 算法：主表總用電度數 − (StartMonth ~ EndMonth 區間內所有月份、所有房間的用電加總) = 公共部分度數，
        /// 度數平均分配給目前啟用中的每個房間，再用「各房間自己設定的每度電費」分別換算成金額
        /// （每間房約定的電價可能不同，不能用主表帳單的整體均價一概而論）。
        ///
        /// 公共電費一律落在 EndMonth（區間結算月）那個月的房客帳單上，區間內其他月份為 0。
        /// 區間內某個月若查無房間帳單資料，該月一律當 0 計算、不擋住試算，但會在逐月明細中標示出來。
        /// </summary>
        /// <param name="targetBillMonth">要試算的電費月，會去找 EndMonth 等於這個月份的主表紀錄</param>
        /// <param name="currentMonthUsageOverride">
        /// 電費計算頁畫面上尚未存檔的本月各房用電加總。有傳時會取代資料庫裡 targetBillMonth 該月的值，
        /// 因為公共電費本來就要等本月讀數填完才算得準。
        /// </param>
        public static async Task<PublicElectricityEstimateResult> ComputeEstimateAsync(JazzerLifeContext db, int propertyId, DateOnly targetBillMonth, decimal? currentMonthUsageOverride = null)
        {
            var master = await db.RentMasterMeterReadings
                .FirstOrDefaultAsync(m => m.PropertyId == propertyId && m.EndMonth == targetBillMonth);

            var activeRooms = await db.RentRooms
                .Where(r => r.PropertyId == propertyId && r.IsActive)
                .OrderBy(r => r.SortOrder).ThenBy(r => r.RoomId)
                .Select(r => new { r.RoomId, r.RoomAlias, r.ElectricityRate })
                .ToListAsync();

            if (master == null || activeRooms.Count == 0)
            {
                var reason = master == null
                    ? "尚無結算月為 " + targetBillMonth.ToString("yyyy-MM") + " 的主表電費紀錄，請先到「公共電費」頁籤登記"
                    : "目前沒有啟用中的房間";

                return new PublicElectricityEstimateResult(
                    HasData: false,
                    StartMonth: null,
                    EndMonth: null,
                    MasterTotalUsageUnits: 0m,
                    MasterTotalAmount: 0m,
                    MonthlyBreakdown: new List<PublicElectricityMonthUsage>(),
                    CombinedRoomUsage: 0m,
                    RawExcessUsage: 0m,
                    ExcessUsage: 0m,
                    PerRoomUsageShare: 0m,
                    ActiveRoomCount: activeRooms.Count,
                    RoomBreakdown: new List<PublicElectricityRoomEstimate>(),
                    IsNegativeExcess: false,
                    Message: reason
                );
            }

            // 展開區間內的每一個月，逐月列出各房用電加總，讓使用者看得出哪個月沒有帳單資料
            var months = new List<DateOnly>();
            for (var m = master.StartMonth; m <= master.EndMonth; m = m.AddMonths(1))
                months.Add(m);

            var usageByMonth = await db.RentRoomBills
                .Where(b => b.Room.PropertyId == propertyId && b.BillMonth >= master.StartMonth && b.BillMonth <= master.EndMonth)
                .GroupBy(b => b.BillMonth)
                .Select(g => new { Month = g.Key, Usage = g.Sum(x => x.UsageUnits), BillCount = g.Count() })
                .ToListAsync();

            var monthlyBreakdown = months.Select(m =>
            {
                var stored = usageByMonth.FirstOrDefault(x => x.Month == m);
                var isTargetMonth = m == targetBillMonth;

                // 正在編輯的那個月優先採用畫面上的即時加總（可能還沒存檔）
                var usage = isTargetMonth && currentMonthUsageOverride.HasValue
                    ? currentMonthUsageOverride.Value
                    : stored?.Usage ?? 0m;

                return new PublicElectricityMonthUsage(
                    Month: m.ToString("yyyy-MM"),
                    RoomUsage: usage,
                    BillCount: stored?.BillCount ?? 0,
                    IsTargetMonth: isTargetMonth,
                    IsLive: isTargetMonth && currentMonthUsageOverride.HasValue
                );
            }).ToList();

            var combinedRoomUsage = monthlyBreakdown.Sum(x => x.RoomUsage);
            var rawExcessUsage = master.TotalUsageUnits - combinedRoomUsage;

            // 主表抄表期間與房間抄表日（15 號）本來就對不齊，出現小額負數屬正常誤差，
            // 硬擋反而卡住作業。負數一律以 0 計，不要算出負的公共電費去倒扣房客，
            // 但仍把原始數字回傳給前端照實顯示，讓使用者自行判斷是誤差還是填錯。
            var isNegativeExcess = rawExcessUsage < 0;
            var excessUsage = isNegativeExcess ? 0m : rawExcessUsage;
            var perRoomUsageShare = excessUsage / activeRooms.Count;

            var breakdown = activeRooms.Select(r => new PublicElectricityRoomEstimate(
                r.RoomId,
                r.RoomAlias,
                r.ElectricityRate,
                perRoomUsageShare,
                // 再用「這間房自己的每度電費」換算成金額，每間房電價不同，算出來的公共電費也可能不同
                Math.Round(perRoomUsageShare * r.ElectricityRate, 0)
            )).ToList();

            string? message = null;
            if (isNegativeExcess)
            {
                // 負得離譜（超過主表總度數）多半不是誤差，而是期間或讀數填錯，訊息要講得更明確
                message = master.TotalUsageUnits > 0 && -rawExcessUsage > master.TotalUsageUnits
                    ? "區間內各房用電加總（" + combinedRoomUsage.ToString("0.##") + " 度）遠大於主表總用電（" +
                      master.TotalUsageUnits.ToString("0.##") + " 度），請確認主表期間與各月讀數是否填錯，本次公共電費以 0 計"
                    : "區間內各房用電加總略大於主表總用電，可能是抄表日期落差造成的誤差，本次公共電費以 0 計";
            }

            return new PublicElectricityEstimateResult(
                HasData: true,
                StartMonth: master.StartMonth.ToString("yyyy-MM"),
                EndMonth: master.EndMonth.ToString("yyyy-MM"),
                MasterTotalUsageUnits: master.TotalUsageUnits,
                MasterTotalAmount: master.TotalAmount,
                MonthlyBreakdown: monthlyBreakdown,
                CombinedRoomUsage: combinedRoomUsage,
                RawExcessUsage: rawExcessUsage,
                ExcessUsage: excessUsage,
                PerRoomUsageShare: perRoomUsageShare,
                ActiveRoomCount: activeRooms.Count,
                RoomBreakdown: breakdown,
                IsNegativeExcess: isNegativeExcess,
                Message: message
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

    public record RentMasterMeterUpsertRequest(int PropertyId, string StartMonth, string EndMonth, decimal TotalUsageUnits, decimal TotalAmount, string? Note);

    // 單一房間的公共電費試算結果：UsageShare 是分配到的公共度數（每房相同），
    // PublicElectricityFee 是用該房間自己的電價換算後的金額（每房可能不同）
    public record PublicElectricityRoomEstimate(
        int RoomId,
        string RoomAlias,
        decimal ElectricityRate,
        decimal UsageShare,
        decimal PublicElectricityFee
    );

    // 主表期間內單一月份的各房用電加總。BillCount = 0 代表該月完全沒有帳單資料（以 0 度計入）；
    // IsLive 代表這個數字來自電費計算頁畫面上尚未存檔的即時輸入值
    public record PublicElectricityMonthUsage(
        string Month,
        decimal RoomUsage,
        int BillCount,
        bool IsTargetMonth,
        bool IsLive
    );

    public record PublicElectricityEstimateResult(
        bool HasData,
        string? StartMonth,
        string? EndMonth,
        decimal MasterTotalUsageUnits,
        decimal MasterTotalAmount,
        List<PublicElectricityMonthUsage> MonthlyBreakdown,
        decimal CombinedRoomUsage,
        // RawExcessUsage 是未經處理的差額（可能為負），ExcessUsage 是實際拿去分攤的（負數已歸 0）
        decimal RawExcessUsage,
        decimal ExcessUsage,
        decimal PerRoomUsageShare,
        int ActiveRoomCount,
        List<PublicElectricityRoomEstimate> RoomBreakdown,
        bool IsNegativeExcess,
        string? Message
    );
}
