using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using JazzerLifeApi.Models;

namespace JazzerLifeApi.Endpoints
{
    public static class MaintenanceEndpoints
    {
        public static void MapMaintenanceEndpoints(this WebApplication app)
        {
            // 查詢指定車輛的保養紀錄
            app.MapGet("/api/vehicles/{vehicleId:int}/maintenance", async (int vehicleId, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                var ownsVehicle = await db.Vehicles.AnyAsync(v => v.VehicleId == vehicleId && v.UserId == userId);
                if (!ownsVehicle)
                    return Results.Json(new { message = "找不到車輛或無權限" }, statusCode: 403);

                var records = await db.PartsMaintenances
                    .Where(m => m.VehicleId == vehicleId)
                    .OrderByDescending(m => m.MaintenanceDate)
                    .Select(m => new
                    {
                        m.MaintenanceId,
                        m.PartName,
                        m.MaintenanceDate,
                        m.Cost,
                        m.OdometerReading,
                        Store = m.Store ?? "",
                        Notes = m.Notes ?? ""
                    })
                    .ToListAsync();

                return Results.Ok(records);
            });

            // 查詢此車輛曾用過的零件名稱清單(供表單自動完成用)
            app.MapGet("/api/vehicles/{vehicleId:int}/maintenance/part-names", async (int vehicleId, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                var ownsVehicle = await db.Vehicles.AnyAsync(v => v.VehicleId == vehicleId && v.UserId == userId);
                if (!ownsVehicle)
                    return Results.Json(new { message = "找不到車輛或無權限" }, statusCode: 403);

                var parts = await db.MaintenanceCycles
                    .Where(c => c.UserId == userId && (c.VehicleId == vehicleId || c.VehicleId == null))
                    .Select(c => c.PartName)
                    .Distinct()
                    .ToListAsync();

                return Results.Ok(parts);
            });

            // 新增保養紀錄
            app.MapPost("/api/vehicles/{vehicleId:int}/maintenance", async (int vehicleId, MaintenanceRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                var ownsVehicle = await db.Vehicles.AnyAsync(v => v.VehicleId == vehicleId && v.UserId == userId);
                if (!ownsVehicle)
                    return Results.Json(new { message = "找不到車輛或無權限" }, statusCode: 403);

                if (string.IsNullOrWhiteSpace(req.PartName) || req.MaintenanceDate == default)
                    return Results.BadRequest(new { message = "請填寫日期與零件" });

                var record = new PartsMaintenance
                {
                    VehicleId = vehicleId,
                    PartName = req.PartName,
                    MaintenanceDate = req.MaintenanceDate,
                    Cost = req.Cost,
                    OdometerReading = req.OdometerReading,
                    Store = req.Store,
                    Notes = req.Notes,
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now
                };
                db.PartsMaintenances.Add(record);
                await db.SaveChangesAsync();

                return Results.Ok(new { message = "已新增保養紀錄", maintenanceId = record.MaintenanceId });
            });

            // 刪除保養紀錄
            app.MapDelete("/api/maintenance/{maintenanceId:int}", async (int maintenanceId, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                var record = await db.PartsMaintenances
                    .Include(m => m.Vehicle)
                    .FirstOrDefaultAsync(m => m.MaintenanceId == maintenanceId);

                if (record == null || record.Vehicle.UserId != userId)
                    return Results.Json(new { message = "找不到紀錄或無權限" }, statusCode: 403);

                db.PartsMaintenances.Remove(record);
                await db.SaveChangesAsync();

                return Results.Ok(new { message = "已刪除保養紀錄" });
            });
        }

        private static int? GetUserId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(idStr, out int id) ? id : null;
        }
    }

    public record MaintenanceRequest(string PartName, DateOnly MaintenanceDate, decimal Cost, decimal? OdometerReading, string? Store, string? Notes);
}
