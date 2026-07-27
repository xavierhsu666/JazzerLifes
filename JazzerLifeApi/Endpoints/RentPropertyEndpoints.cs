using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using JazzerLifeApi.Models;

namespace JazzerLifeApi.Endpoints
{
    public static class RentPropertyEndpoints
    {
        public static void MapRentPropertyEndpoints(this WebApplication app)
        {
            // 查詢使用者名下所有出租物件（含停用），前端目前只會用第一筆/唯一一筆，
            // 但先回傳完整清單以便未來擴充多物件切換 UI
            app.MapGet("/api/rent/properties", async (ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                try
                {
                    var properties = await db.RentProperties
                        .Where(p => p.UserId == userId)
                        .OrderBy(p => p.PropertyId)
                        .Select(p => new
                        {
                            p.PropertyId,
                            p.PropertyName,
                            p.Address,
                            p.IsActive
                        })
                        .ToListAsync();

                    return Results.Ok(properties);
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "查詢出租物件失敗", detail = ex.Message }, statusCode: 500);
                }
            });

            // 新增出租物件
            app.MapPost("/api/rent/properties", async (RentPropertyCreateRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                if (string.IsNullOrWhiteSpace(req.PropertyName))
                    return Results.BadRequest(new { message = "請輸入物件名稱" });

                try
                {
                    var property = new RentProperty
                    {
                        UserId = userId.Value,
                        PropertyName = req.PropertyName.Trim(),
                        Address = string.IsNullOrWhiteSpace(req.Address) ? null : req.Address.Trim(),
                        IsActive = true,
                        CreatedAt = DateTime.Now,
                        UpdatedAt = DateTime.Now,
                    };
                    db.RentProperties.Add(property);
                    await db.SaveChangesAsync();

                    return Results.Ok(new { message = "已新增出租物件", propertyId = property.PropertyId });
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "新增出租物件失敗", detail = ex.Message }, statusCode: 500);
                }
            });

            // 更新出租物件（含停用）
            app.MapPut("/api/rent/properties/{id:int}", async (int id, RentPropertyUpdateRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                if (string.IsNullOrWhiteSpace(req.PropertyName))
                    return Results.BadRequest(new { message = "請輸入物件名稱" });

                try
                {
                    var property = await db.RentProperties.FirstOrDefaultAsync(p => p.PropertyId == id && p.UserId == userId);
                    if (property == null) return Results.NotFound(new { message = "找不到該出租物件" });

                    property.PropertyName = req.PropertyName.Trim();
                    property.Address = string.IsNullOrWhiteSpace(req.Address) ? null : req.Address.Trim();
                    property.IsActive = req.IsActive;
                    property.UpdatedAt = DateTime.Now;
                    await db.SaveChangesAsync();

                    return Results.Ok(new { message = "已更新出租物件" });
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "更新出租物件失敗", detail = ex.Message }, statusCode: 500);
                }
            });
        }

        private static int? GetUserId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(idStr, out int id) ? id : null;
        }
    }

    public record RentPropertyCreateRequest(string PropertyName, string? Address);
    public record RentPropertyUpdateRequest(string PropertyName, string? Address, bool IsActive);
}
