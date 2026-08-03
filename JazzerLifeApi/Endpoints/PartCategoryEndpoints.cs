using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using JazzerLifeApi.Models;

namespace JazzerLifeApi.Endpoints
{
    // 保養分類管理（例如：例行、保養、維修...）
    // 分類為「使用者層級」共用，不綁定特定車輛，理由同 MaintenanceCycles 的 VehicleId==null 通用設定邏輯：
    // 同一使用者名下多台車輛通常會用同一套分類（例如都有「例行」「保養」），不需要每台車各自維護一份。
    // 資料表 CarMan.PartCategories 已存在於資料庫並已 scaffold 成 PartCategory Model，本次不需新增 SQL 腳本。
    public static class PartCategoryEndpoints
    {
        public static void MapPartCategoryEndpoints(this WebApplication app)
        {
            // 查詢目前使用者的保養分類清單
            app.MapGet("/api/part-categories", async (ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                try
                {
                    var categories = await db.PartCategories
                        .Where(c => c.UserId == userId)
                        .OrderBy(c => c.CategoryName)
                        .Select(c => new { c.CategoryId, c.CategoryName })
                        .ToListAsync();

                    return Results.Ok(categories);
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "查詢分類失敗，請洽系統管理員", detail = ex.Message }, statusCode: 500);
                }
            });

            // 新增分類
            app.MapPost("/api/part-categories", async (PartCategoryRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                var name = (req.CategoryName ?? "").Trim();
                if (string.IsNullOrWhiteSpace(name))
                    return Results.BadRequest(new { message = "請輸入分類名稱" });
                if (name.Length > 100)
                    return Results.BadRequest(new { message = "分類名稱長度不可超過 100 個字" });

                try
                {
                    var exists = await db.PartCategories.AnyAsync(c => c.UserId == userId && c.CategoryName == name);
                    if (exists)
                        return Results.Json(new { message = "分類名稱已存在" }, statusCode: 409);

                    var category = new PartCategory
                    {
                        UserId = userId.Value,
                        CategoryName = name,
                        CreatedAt = DateTime.Now,
                        UpdatedAt = DateTime.Now,
                    };
                    db.PartCategories.Add(category);
                    await db.SaveChangesAsync();

                    return Results.Ok(new { message = "已新增分類", categoryId = category.CategoryId });
                }
                catch (DbUpdateException ex)
                {
                    // 常見情況：同名分類同時被兩個裝置新增撞到 UNIQUE/重複檢查的時間差
                    return Results.Json(new { message = "新增分類失敗，請重新整理後再試一次", detail = ex.InnerException?.Message ?? ex.Message }, statusCode: 409);
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "新增分類失敗，請洽系統管理員", detail = ex.Message }, statusCode: 500);
                }
            });

            // 修改分類名稱（僅限本人分類）
            app.MapPut("/api/part-categories/{categoryId:int}", async (int categoryId, PartCategoryRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                var name = (req.CategoryName ?? "").Trim();
                if (string.IsNullOrWhiteSpace(name))
                    return Results.BadRequest(new { message = "請輸入分類名稱" });
                if (name.Length > 100)
                    return Results.BadRequest(new { message = "分類名稱長度不可超過 100 個字" });

                try
                {
                    var category = await db.PartCategories.FirstOrDefaultAsync(c => c.CategoryId == categoryId && c.UserId == userId);
                    if (category == null)
                        return Results.Json(new { message = "找不到分類或無權限" }, statusCode: 403);

                    var dup = await db.PartCategories.AnyAsync(c => c.UserId == userId && c.CategoryName == name && c.CategoryId != categoryId);
                    if (dup)
                        return Results.Json(new { message = "分類名稱已存在" }, statusCode: 409);

                    category.CategoryName = name;
                    category.UpdatedAt = DateTime.Now;
                    await db.SaveChangesAsync();

                    return Results.Ok(new { message = "已更新分類" });
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "更新分類失敗，請洽系統管理員", detail = ex.Message }, statusCode: 500);
                }
            });

            // 刪除分類（僅限本人分類；使用中禁止刪除，避免既有保養紀錄的 CategoryID 變成無效外鍵/被資料庫拒絕）
            app.MapDelete("/api/part-categories/{categoryId:int}", async (int categoryId, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                try
                {
                    var category = await db.PartCategories.FirstOrDefaultAsync(c => c.CategoryId == categoryId && c.UserId == userId);
                    if (category == null)
                        return Results.Json(new { message = "找不到分類或無權限" }, statusCode: 403);

                    var inUse = await db.PartsMaintenances.AnyAsync(m => m.CategoryId == categoryId);
                    if (inUse)
                        return Results.Json(new { message = "此分類已有保養紀錄使用中，無法刪除" }, statusCode: 400);

                    db.PartCategories.Remove(category);
                    await db.SaveChangesAsync();

                    return Results.Ok(new { message = "已刪除分類" });
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "刪除分類失敗，請洽系統管理員", detail = ex.Message }, statusCode: 500);
                }
            });
        }

        private static int? GetUserId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(idStr, out int id) ? id : null;
        }
    }

    public record PartCategoryRequest(string CategoryName);
}
