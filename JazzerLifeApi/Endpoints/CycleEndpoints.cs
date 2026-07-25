using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using JazzerLifeApi.Models;

namespace JazzerLifeApi.Endpoints
{
    public static class CycleEndpoints
    {
        public static void MapCycleEndpoints(this WebApplication app)
        {
            // 查詢指定車輛的保養週期設定(含 UserID 通用設定)
            app.MapGet("/api/vehicles/{vehicleId:int}/cycles", async (int vehicleId, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                var ownsVehicle = await db.Vehicles.AnyAsync(v => v.VehicleId == vehicleId && v.UserId == userId);
                if (!ownsVehicle)
                    return Results.Json(new { message = "找不到車輛或無權限" }, statusCode: 403);

                var cycles = await db.MaintenanceCycles
                    .Where(c => c.UserId == userId && (c.VehicleId == vehicleId || c.VehicleId == null))
                    .OrderBy(c => c.PartName)
                    .Select(c => new { c.CycleId, c.PartName, c.MileageCycle, c.TimeCycle })
                    .ToListAsync();

                // 每個零件最後一次保養的日期與里程(供前端算「剩多久到期」)
                var lastMaint = await db.PartsMaintenances
                    .Where(m => m.VehicleId == vehicleId)
                    .GroupBy(m => m.PartName)
                    .Select(g => new
                    {
                        PartName = g.Key,
                        LastDate = g.Max(x => x.MaintenanceDate),
                        LastOdo = g.Max(x => x.OdometerReading)
                    })
                    .ToListAsync();

                return Results.Ok(new { cycles, lastMaintenance = lastMaint });
            });

            // 新增保養週期
            app.MapPost("/api/vehicles/{vehicleId:int}/cycles", async (int vehicleId, CycleRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                var ownsVehicle = await db.Vehicles.AnyAsync(v => v.VehicleId == vehicleId && v.UserId == userId);
                if (!ownsVehicle)
                    return Results.Json(new { message = "找不到車輛或無權限" }, statusCode: 403);

                if (string.IsNullOrWhiteSpace(req.PartName) || (req.MileageCycle <= 0 && req.TimeCycle <= 0))
                    return Results.BadRequest(new { message = "請填寫零件名稱，且里程或時間週期至少一項" });

                var cycle = new MaintenanceCycle
                {
                    UserId = userId.Value,
                    VehicleId = vehicleId,
                    PartName = req.PartName,
                    MileageCycle = req.MileageCycle,
                    TimeCycle = req.TimeCycle,
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now
                };
                db.MaintenanceCycles.Add(cycle);
                await db.SaveChangesAsync();

                return Results.Ok(new { message = "已新增週期", cycleId = cycle.CycleId });
            });

            // 修改保養週期(僅限本人設定)
            app.MapPut("/api/cycles/{cycleId:int}", async (int cycleId, CycleRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                var cycle = await db.MaintenanceCycles.FirstOrDefaultAsync(c => c.CycleId == cycleId && c.UserId == userId);
                if (cycle == null)
                    return Results.Json(new { message = "找不到週期或無權限" }, statusCode: 403);

                cycle.PartName = req.PartName;
                cycle.MileageCycle = req.MileageCycle;
                cycle.TimeCycle = req.TimeCycle;
                cycle.UpdatedAt = DateTime.Now;
                await db.SaveChangesAsync();

                return Results.Ok(new { message = "已更新週期" });
            });

            // 刪除保養週期(僅限本人設定)
            app.MapDelete("/api/cycles/{cycleId:int}", async (int cycleId, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                var cycle = await db.MaintenanceCycles.FirstOrDefaultAsync(c => c.CycleId == cycleId && c.UserId == userId);
                if (cycle == null)
                    return Results.Json(new { message = "找不到週期或無權限" }, statusCode: 403);

                db.MaintenanceCycles.Remove(cycle);
                await db.SaveChangesAsync();

                return Results.Ok(new { message = "已刪除週期" });
            });

            // 依歷史保養紀錄推薦週期(取代舊版的 #rec_pm_cycle 暫存表邏輯)
            app.MapGet("/api/vehicles/{vehicleId:int}/cycles/recommend", async (int vehicleId, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                var ownsVehicle = await db.Vehicles.AnyAsync(v => v.VehicleId == vehicleId && v.UserId == userId);
                if (!ownsVehicle)
                    return Results.Json(new { message = "找不到車輛或無權限" }, statusCode: 403);

                var records = await db.PartsMaintenances
                    .Where(m => m.VehicleId == vehicleId && m.OdometerReading != null)
                    .Select(m => new { m.PartName, m.Cost, m.OdometerReading, m.MaintenanceDate })
                    .ToListAsync();

                var recommendations = records
                    .GroupBy(r => r.PartName)
                    .Where(g => g.Count() > 1)
                    .Select(g =>
                    {
                        var maxOdo = g.Max(x => x.OdometerReading) ?? 0;
                        var minOdo = g.Min(x => x.OdometerReading) ?? 0;
                        var maxDate = g.Max(x => x.MaintenanceDate);
                        var minDate = g.Min(x => x.MaintenanceDate);
                        var count = g.Count();
                        var avgOdo = count > 0 ? (int)((maxOdo - minOdo) / count) : 0;
                        var avgDate = count > 0 ? Math.Abs(maxDate.DayNumber - minDate.DayNumber) / count : 0;

                        return new
                        {
                            PartName = g.Key,
                            AvgCost = g.Average(x => x.Cost),
                            AvgOdo = avgOdo,
                            AvgDate = avgDate,
                            CntPart = count
                        };
                    })
                    .Where(r => r.AvgOdo > 0)
                    .ToList();

                return Results.Ok(recommendations);
            });
        }

        private static int? GetUserId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(idStr, out int id) ? id : null;
        }
    }

    public record CycleRequest(string PartName, decimal? MileageCycle, int? TimeCycle);
}
