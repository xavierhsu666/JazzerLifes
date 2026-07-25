using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using JazzerLifeApi.Models;
using Microsoft.AspNetCore.Builder;

namespace JazzerLifeApi.Endpoints
{
	public static class VehicleEndpoints
	{
		public static void MapVehicleEndpoints(this WebApplication app)
		{
			// 琩高ヘ玡祅ㄏノ┮Τó进
			app.MapGet("/api/my-vehicles", async (ClaimsPrincipal user, JazzerLifeContext db) =>
			{
				var userId = GetUserId(user);
				if (userId == null)
					return Results.Json(new { message = "ゼ祅" }, statusCode: 401);

				var vehicles = await db.Vehicles
					.Where(v => v.UserId == userId)
					.Select(v => new
					{
						v.VehicleId,
						v.Make,
						v.Model,
						v.Year,
						v.LicensePlate
					})
					.ToListAsync();

				return Results.Ok(vehicles);
			});

			// 穝糤ó进
			app.MapPost("/api/vehicles", async (VehicleRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
			{
				var userId = GetUserId(user);
				if (userId == null)
					return Results.Json(new { message = "ゼ祅" }, statusCode: 401);

				var vehicle = new Vehicle
				{
					UserId = userId.Value,
					Make = req.Make,
					Model = req.Model,
					Year = req.Year,
					LicensePlate = req.LicensePlate,
					CreatedAt = DateTime.Now,
					UpdatedAt = DateTime.Now
				};
				db.Vehicles.Add(vehicle);
				await db.SaveChangesAsync();

				return Results.Ok(new { message = "穝糤Θ", vehicleId = vehicle.VehicleId });
			});

			// эó进(度セ局Τó进)
			app.MapPut("/api/vehicles/{vehicleId:int}", async (int vehicleId, VehicleRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
			{
				var userId = GetUserId(user);
				if (userId == null)
					return Results.Json(new { message = "ゼ祅" }, statusCode: 401);

				var vehicle = await db.Vehicles.FirstOrDefaultAsync(v => v.VehicleId == vehicleId && v.UserId == userId);
				if (vehicle == null)
					return Results.Json(new { message = "тぃó进┪礚舦" }, statusCode: 403);

				vehicle.Make = req.Make;
				vehicle.Model = req.Model;
				vehicle.Year = req.Year;
				vehicle.LicensePlate = req.LicensePlate;
				vehicle.UpdatedAt = DateTime.Now;
				await db.SaveChangesAsync();

				return Results.Ok(new { message = "穝Θ" });
			});

			// 埃ó进(度セ局Τó进)
			app.MapDelete("/api/vehicles/{vehicleId:int}", async (int vehicleId, ClaimsPrincipal user, JazzerLifeContext db) =>
			{
				var userId = GetUserId(user);
				if (userId == null)
					return Results.Json(new { message = "ゼ祅" }, statusCode: 401);

				var vehicle = await db.Vehicles.FirstOrDefaultAsync(v => v.VehicleId == vehicleId && v.UserId == userId);
				if (vehicle == null)
					return Results.Json(new { message = "тぃó进┪礚舦" }, statusCode: 403);

				db.Vehicles.Remove(vehicle);
				await db.SaveChangesAsync();

				return Results.Ok(new { message = "埃Θ" });
			});
		}

		private static int? GetUserId(ClaimsPrincipal user)
		{
			var idStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
			return int.TryParse(idStr, out int id) ? id : null;
		}
	}

	public record VehicleRequest(string Make, string Model, int Year, string LicensePlate);
}