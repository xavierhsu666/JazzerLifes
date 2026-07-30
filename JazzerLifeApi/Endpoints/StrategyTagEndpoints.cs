using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using JazzerLifeApi.Models;

namespace JazzerLifeApi.Endpoints
{
    // 策略標籤 CRUD（交易明細頁的標籤下拉選單資料來源）
    public static class StrategyTagEndpoints
    {
        public static void MapStrategyTagEndpoints(this WebApplication app)
        {
            // 查詢目前使用者的策略標籤清單。includeInactive=true 時連已停用的標籤也一併回傳
            // （用於已套用該標籤的舊交易紀錄仍能正確顯示標籤名稱）
            app.MapGet("/api/trading/strategy-tags", async (bool? includeInactive, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                try
                {
                    var query = db.StrategyTags.Where(t => t.UserId == userId);
                    if (includeInactive != true) query = query.Where(t => t.IsActive);

                    var tags = await query
                        .OrderBy(t => t.SortOrder).ThenBy(t => t.StrategyTagId)
                        .Select(t => new { t.StrategyTagId, t.Name, t.SortOrder, t.IsActive })
                        .ToListAsync();

                    return Results.Ok(tags);
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "查詢策略標籤失敗", detail = ex.Message }, statusCode: 500);
                }
            });

            // 新增策略標籤
            app.MapPost("/api/trading/strategy-tags", async (StrategyTagCreateRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                if (string.IsNullOrWhiteSpace(req.Name))
                    return Results.BadRequest(new { message = "請輸入標籤名稱" });

                try
                {
                    var name = req.Name.Trim();
                    var duplicate = await db.StrategyTags.AnyAsync(t => t.UserId == userId && t.Name == name);
                    if (duplicate) return Results.BadRequest(new { message = "已存在相同名稱的標籤" });

                    var tag = new StrategyTag
                    {
                        UserId = userId.Value,
                        Name = name,
                        SortOrder = req.SortOrder,
                        IsActive = true,
                        CreatedAt = DateTime.Now,
                        UpdatedAt = DateTime.Now,
                    };
                    db.StrategyTags.Add(tag);
                    await db.SaveChangesAsync();

                    return Results.Ok(new { message = "已新增標籤", strategyTagId = tag.StrategyTagId });
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "新增標籤失敗", detail = ex.Message }, statusCode: 500);
                }
            });

            // 更新標籤（含停用：停用後下拉選單不再列出，但既有交易紀錄的關聯不受影響）
            app.MapPut("/api/trading/strategy-tags/{id:int}", async (int id, StrategyTagUpdateRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                if (string.IsNullOrWhiteSpace(req.Name))
                    return Results.BadRequest(new { message = "請輸入標籤名稱" });

                try
                {
                    var tag = await db.StrategyTags.FirstOrDefaultAsync(t => t.StrategyTagId == id && t.UserId == userId);
                    if (tag == null) return Results.NotFound(new { message = "找不到該標籤" });

                    var name = req.Name.Trim();
                    var duplicate = await db.StrategyTags.AnyAsync(t => t.UserId == userId && t.Name == name && t.StrategyTagId != id);
                    if (duplicate) return Results.BadRequest(new { message = "已存在相同名稱的標籤" });

                    tag.Name = name;
                    tag.SortOrder = req.SortOrder;
                    tag.IsActive = req.IsActive;
                    tag.UpdatedAt = DateTime.Now;
                    await db.SaveChangesAsync();

                    return Results.Ok(new { message = "已更新標籤" });
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "更新標籤失敗", detail = ex.Message }, statusCode: 500);
                }
            });

            // 刪除標籤：若已有交易紀錄使用該標籤則拒絕刪除（改請使用者用「停用」即可，避免歷史紀錄的標籤關聯憑空消失）
            app.MapDelete("/api/trading/strategy-tags/{id:int}", async (int id, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                try
                {
                    var tag = await db.StrategyTags.FirstOrDefaultAsync(t => t.StrategyTagId == id && t.UserId == userId);
                    if (tag == null) return Results.NotFound(new { message = "找不到該標籤" });

                    var inUse = await db.Trades.AnyAsync(t => t.StrategyTagId == id);
                    if (inUse) return Results.BadRequest(new { message = "已有交易紀錄使用此標籤，請改用「停用」而非刪除" });

                    db.StrategyTags.Remove(tag);
                    await db.SaveChangesAsync();

                    return Results.Ok(new { message = "已刪除標籤" });
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "刪除標籤失敗", detail = ex.Message }, statusCode: 500);
                }
            });
        }

        private static int? GetUserId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(idStr, out int id) ? id : null;
        }
    }

    public record StrategyTagCreateRequest(string Name, int SortOrder);
    public record StrategyTagUpdateRequest(string Name, int SortOrder, bool IsActive);
}
