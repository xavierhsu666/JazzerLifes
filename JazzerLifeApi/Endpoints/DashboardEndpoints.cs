using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using JazzerLifeApi.Models;
using Microsoft.AspNetCore.Builder;

namespace JazzerLifeApi.Endpoints
{
	public static class DashboardEndpoints
	{
		public static void MapDashboardEndpoints(this WebApplication app)
		{
			app.MapGet("/api/dashboard/{vehicleId:int}", async (int vehicleId, ClaimsPrincipal user, JazzerLifeContext db) =>
			{
				var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
				if (userIdStr == null || !int.TryParse(userIdStr, out int userId))
					return Results.Json(new { message = "未登入" }, statusCode: 401);

				// 確認這台車真的屬於目前登入的使用者，防止跨帳號查詢
				var vehicle = await db.Vehicles.FirstOrDefaultAsync(v => v.VehicleId == vehicleId && v.UserId == userId);
				if (vehicle == null)
					return Results.Json(new { message = "找不到車輛或無權限存取" }, statusCode: 403);

				var fuel = await db.FuelConsumptions
					.Where(f => f.VehicleId == vehicleId)
					.OrderBy(f => f.CreatedAt)
					.Select(f => new
					{
						f.OdometerReading,
						f.FuelAmount,
						f.FuelCost,
						f.DistanceTravelled,
						f.FuelEfficiency,
						RecordDate = f.CreatedAt
					})
					.ToListAsync();

				var maint = await db.PartsMaintenances
					.Where(m => m.VehicleId == vehicleId)
					.OrderBy(m => m.MaintenanceDate)
					.Select(m => new
					{
						m.PartName,
						m.MaintenanceDate,
						m.Cost,
						m.OdometerReading,
						CategoryName = m.Category != null ? m.Category.CategoryName : "未分類",
						m.Store
					})
					.ToListAsync();

				var cycles = await db.MaintenanceCycles
					.Where(c => c.UserId == userId && (c.VehicleId == vehicleId || c.VehicleId == null))
					.Select(c => new { c.PartName, c.TimeCycle, c.MileageCycle })
					.ToListAsync();

				return Results.Ok(new { fuel, maintenance = maint, cycles });
			});
		}
	}
}