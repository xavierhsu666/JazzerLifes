using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using JazzerLifeApi.Models;

namespace JazzerLifeApi.Endpoints
{
    public static class FuelEndpoints
    {
        public static void MapFuelEndpoints(this WebApplication app)
        {
            // 查詢指定車輛的油耗紀錄(僅限本人車輛)
            app.MapGet("/api/vehicles/{vehicleId:int}/fuel", async (int vehicleId, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                var ownsVehicle = await db.Vehicles.AnyAsync(v => v.VehicleId == vehicleId && v.UserId == userId);
                if (!ownsVehicle)
                    return Results.Json(new { message = "找不到車輛或無權限" }, statusCode: 403);

                var records = await db.FuelConsumptions
                    .Where(f => f.VehicleId == vehicleId)
                    .OrderBy(f => f.CreatedAt)
                    .Select(f => new
                    {
                        f.RecordId,
                        f.VehicleId,
                        f.OdometerReading,
                        f.FuelAmount,
                        f.FuelCost,
                        f.DistanceTravelled,
                        f.FuelEfficiency,
                        RecordDate = f.CreatedAt
                    })
                    .ToListAsync();

                return Results.Ok(records);
            });

            // 新增油耗紀錄(僅限本人車輛)
            app.MapPost("/api/vehicles/{vehicleId:int}/fuel", async (int vehicleId, FuelRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                var ownsVehicle = await db.Vehicles.AnyAsync(v => v.VehicleId == vehicleId && v.UserId == userId);
                if (!ownsVehicle)
                    return Results.Json(new { message = "找不到車輛或無權限" }, statusCode: 403);

                if (req.OdometerReading <= 0 || req.FuelAmount <= 0)
                    return Results.BadRequest(new { message = "里程數與加油量必須大於 0" });

                var lastRecord = await db.FuelConsumptions
                    .Where(f => f.VehicleId == vehicleId)
                    .OrderByDescending(f => f.CreatedAt)
                    .FirstOrDefaultAsync();

                decimal lastOdo = lastRecord?.OdometerReading ?? 0;
                decimal distance = req.OdometerReading - lastOdo;
                decimal efficiency = req.FuelAmount > 0 ? Math.Round(distance / req.FuelAmount, 2) : 0;

                var record = new FuelConsumption
                {
                    VehicleId = vehicleId,
                    OdometerReading = req.OdometerReading,
                    FuelAmount = req.FuelAmount,
                    FuelCost = req.FuelCost,
                    DistanceTravelled = distance,
                    FuelEfficiency = efficiency,
                    CreatedAt = req.Date ?? DateTime.Now,
                    UpdatedAt = req.Date ?? DateTime.Now
                };
                db.FuelConsumptions.Add(record);
                await db.SaveChangesAsync();

                return Results.Ok(new { message = "新增成功", recordId = record.RecordId });
            });

            // 查詢目前車輛最新里程(供表單預填、Dashboard 使用)
            app.MapGet("/api/vehicles/{vehicleId:int}/latest-odometer", async (int vehicleId, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                var ownsVehicle = await db.Vehicles.AnyAsync(v => v.VehicleId == vehicleId && v.UserId == userId);
                if (!ownsVehicle)
                    return Results.Json(new { message = "找不到車輛或無權限" }, statusCode: 403);

                var maxFuelOdo = await db.FuelConsumptions
                    .Where(f => f.VehicleId == vehicleId)
                    .Select(f => (decimal?)f.OdometerReading)
                    .MaxAsync() ?? 0;

                var maxMaintOdo = await db.PartsMaintenances
                    .Where(m => m.VehicleId == vehicleId)
                    .Select(m => m.OdometerReading)
                    .MaxAsync() ?? 0;

                return Results.Ok(new { maxOdo = Math.Max(maxFuelOdo, maxMaintOdo) });
            });
        }

        private static int? GetUserId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(idStr, out int id) ? id : null;
        }
    }

    public record FuelRequest(decimal OdometerReading, decimal FuelAmount, decimal FuelCost, DateTime? Date);
}
