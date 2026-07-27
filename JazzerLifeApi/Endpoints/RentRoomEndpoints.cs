using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using JazzerLifeApi.Models;

namespace JazzerLifeApi.Endpoints
{
    public static class RentRoomEndpoints
    {
        public static void MapRentRoomEndpoints(this WebApplication app)
        {
            // 查詢某物件底下的房間設定（Tab2）。includeInactive=true 時連已退租/停用的房間也一併回傳
            app.MapGet("/api/rent/rooms", async (int propertyId, bool? includeInactive, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                try
                {
                    // 先確認該物件確實屬於目前登入的使用者，避免跨帳號存取
                    var ownsProperty = await db.RentProperties.AnyAsync(p => p.PropertyId == propertyId && p.UserId == userId);
                    if (!ownsProperty) return Results.NotFound(new { message = "找不到該出租物件" });

                    var query = db.RentRooms.Where(r => r.PropertyId == propertyId);
                    if (includeInactive != true) query = query.Where(r => r.IsActive);

                    var rooms = await query
                        .OrderBy(r => r.SortOrder).ThenBy(r => r.RoomId)
                        .Select(r => new
                        {
                            r.RoomId,
                            r.PropertyId,
                            r.RoomAlias,
                            r.MonthlyRent,
                            r.ElectricityRate,
                            r.AdjustmentAmount,
                            r.SortOrder,
                            r.IsActive
                        })
                        .ToListAsync();

                    return Results.Ok(rooms);
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "查詢房間設定失敗", detail = ex.Message }, statusCode: 500);
                }
            });

            // 新增房間
            app.MapPost("/api/rent/rooms", async (RentRoomCreateRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                if (string.IsNullOrWhiteSpace(req.RoomAlias))
                    return Results.BadRequest(new { message = "請輸入房間別名" });
                if (req.MonthlyRent < 0 || req.ElectricityRate < 0)
                    return Results.BadRequest(new { message = "房租與每度電費不可為負數" });

                try
                {
                    var ownsProperty = await db.RentProperties.AnyAsync(p => p.PropertyId == req.PropertyId && p.UserId == userId);
                    if (!ownsProperty) return Results.NotFound(new { message = "找不到該出租物件" });

                    var room = new RentRoom
                    {
                        PropertyId = req.PropertyId,
                        RoomAlias = req.RoomAlias.Trim(),
                        MonthlyRent = req.MonthlyRent,
                        ElectricityRate = req.ElectricityRate,
                        AdjustmentAmount = req.AdjustmentAmount,
                        SortOrder = req.SortOrder,
                        IsActive = true,
                        CreatedAt = DateTime.Now,
                        UpdatedAt = DateTime.Now,
                    };
                    db.RentRooms.Add(room);
                    await db.SaveChangesAsync();

                    return Results.Ok(new { message = "已新增房間", roomId = room.RoomId });
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "新增房間失敗", detail = ex.Message }, statusCode: 500);
                }
            });

            // 更新房間設定（含停用/退租：IsActive=false 屬於軟刪除，歷史帳單不受影響）
            app.MapPut("/api/rent/rooms/{id:int}", async (int id, RentRoomUpdateRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                if (string.IsNullOrWhiteSpace(req.RoomAlias))
                    return Results.BadRequest(new { message = "請輸入房間別名" });
                if (req.MonthlyRent < 0 || req.ElectricityRate < 0)
                    return Results.BadRequest(new { message = "房租與每度電費不可為負數" });

                try
                {
                    // 透過 Room -> Property 兩層確認資源屬於目前登入的使用者
                    var room = await db.RentRooms
                        .Include(r => r.Property)
                        .FirstOrDefaultAsync(r => r.RoomId == id && r.Property.UserId == userId);
                    if (room == null) return Results.NotFound(new { message = "找不到該房間" });

                    room.RoomAlias = req.RoomAlias.Trim();
                    room.MonthlyRent = req.MonthlyRent;
                    room.ElectricityRate = req.ElectricityRate;
                    room.AdjustmentAmount = req.AdjustmentAmount;
                    room.SortOrder = req.SortOrder;
                    room.IsActive = req.IsActive;
                    room.UpdatedAt = DateTime.Now;
                    await db.SaveChangesAsync();

                    return Results.Ok(new { message = "已更新房間設定" });
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "更新房間設定失敗", detail = ex.Message }, statusCode: 500);
                }
            });
        }

        private static int? GetUserId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(idStr, out int id) ? id : null;
        }
    }

    public record RentRoomCreateRequest(int PropertyId, string RoomAlias, decimal MonthlyRent, decimal ElectricityRate, decimal AdjustmentAmount, int SortOrder);
    public record RentRoomUpdateRequest(string RoomAlias, decimal MonthlyRent, decimal ElectricityRate, decimal AdjustmentAmount, int SortOrder, bool IsActive);
}
