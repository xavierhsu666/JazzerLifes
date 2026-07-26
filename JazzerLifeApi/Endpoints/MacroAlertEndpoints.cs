using System;
using System.Linq;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using JazzerLifeApi.Models;

namespace JazzerLifeApi.Endpoints
{
    public static class MacroAlertEndpoints
    {
        public record AlertRuleCreateRequest(string IndicatorCode, string Operator, decimal Threshold);
        public record AlertRuleUpdateRequest(string? Operator, decimal? Threshold, bool? IsActive);

        private static readonly string[] ValidOperators = { ">", ">=", "<", "<=" };

        public static void MapMacroAlertEndpoints(this WebApplication app)
        {
            // 示警規則清單
            app.MapGet("/api/macro/alert-rules", async (ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                try
                {
                    var rules = await db.EconAlertRules
                        .Include(r => r.Indicator)
                        .Where(r => r.UserId == userId)
                        .OrderByDescending(r => r.CreatedAt)
                        .Select(r => new
                        {
                            r.RuleId,
                            IndicatorCode = r.Indicator!.Code,
                            IndicatorName = r.Indicator.Name,
                            r.Operator,
                            r.Threshold,
                            r.IsActive,
                            r.LastTriggeredAt,
                        })
                        .ToListAsync();

                    return Results.Ok(rules);
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "查詢示警規則失敗", detail = ex.Message }, statusCode: 500);
                }
            });

            // 新增示警規則
            app.MapPost("/api/macro/alert-rules", async (ClaimsPrincipal user, JazzerLifeContext db, AlertRuleCreateRequest req) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                if (string.IsNullOrWhiteSpace(req.IndicatorCode))
                    return Results.BadRequest(new { message = "IndicatorCode 為必填" });

                if (!ValidOperators.Contains(req.Operator))
                    return Results.BadRequest(new { message = "Operator 僅接受 >、>=、<、<=" });

                try
                {
                    var indicator = await db.EconIndicators.FirstOrDefaultAsync(i => i.Code == req.IndicatorCode);
                    if (indicator == null)
                        return Results.BadRequest(new { message = "找不到指定指標" });

                    var rule = new EconAlertRule
                    {
                        UserId = userId.Value,
                        IndicatorId = indicator.IndicatorId,
                        Operator = req.Operator,
                        Threshold = req.Threshold,
                        IsActive = true,
                    };
                    db.EconAlertRules.Add(rule);
                    await db.SaveChangesAsync();

                    return Results.Ok(new { rule.RuleId, message = "示警規則已建立" });
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "建立示警規則失敗", detail = ex.Message }, statusCode: 500);
                }
            });

            // 更新示警規則（門檻/運算子/啟用狀態）
            app.MapPut("/api/macro/alert-rules/{id:int}", async (ClaimsPrincipal user, JazzerLifeContext db, int id, AlertRuleUpdateRequest req) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                if (req.Operator != null && !ValidOperators.Contains(req.Operator))
                    return Results.BadRequest(new { message = "Operator 僅接受 >、>=、<、<=" });

                try
                {
                    var rule = await db.EconAlertRules.FirstOrDefaultAsync(r => r.RuleId == id && r.UserId == userId);
                    if (rule == null)
                        return Results.NotFound(new { message = "找不到規則或無權限修改" });

                    if (req.Operator != null) rule.Operator = req.Operator;
                    if (req.Threshold.HasValue) rule.Threshold = req.Threshold.Value;
                    if (req.IsActive.HasValue) rule.IsActive = req.IsActive.Value;
                    rule.UpdatedAt = DateTime.Now;

                    await db.SaveChangesAsync();
                    return Results.Ok(new { message = "示警規則已更新" });
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "更新示警規則失敗", detail = ex.Message }, statusCode: 500);
                }
            });

            // 刪除示警規則
            app.MapDelete("/api/macro/alert-rules/{id:int}", async (ClaimsPrincipal user, JazzerLifeContext db, int id) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                try
                {
                    var rule = await db.EconAlertRules.FirstOrDefaultAsync(r => r.RuleId == id && r.UserId == userId);
                    if (rule == null)
                        return Results.NotFound(new { message = "找不到規則或無權限刪除" });

                    db.EconAlertRules.Remove(rule);
                    await db.SaveChangesAsync();
                    return Results.Ok(new { message = "示警規則已刪除" });
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "刪除示警規則失敗", detail = ex.Message }, statusCode: 500);
                }
            });

            // 示警觸發紀錄查詢
            app.MapGet("/api/macro/alerts", async (ClaimsPrincipal user, JazzerLifeContext db, bool? unreadOnly) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                try
                {
                    var query = db.EconAlertLogs
                        .Include(l => l.Rule)
                        .ThenInclude(r => r.Indicator)
                        .Where(l => l.Rule.UserId == userId);

                    if (unreadOnly == true)
                        query = query.Where(l => !l.IsRead);

                    var logs = await query
                        .OrderByDescending(l => l.TriggeredAt)
                        .Take(50)
                        .Select(l => new
                        {
                            l.LogId,
                            l.TriggeredAt,
                            l.Value,
                            l.Message,
                            l.IsRead,
                            IndicatorCode = l.Rule.Indicator!.Code,
                            IndicatorName = l.Rule.Indicator.Name,
                        })
                        .ToListAsync();

                    return Results.Ok(logs);
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "查詢示警紀錄失敗", detail = ex.Message }, statusCode: 500);
                }
            });

            // 標記單筆示警紀錄為已讀
            app.MapPost("/api/macro/alerts/{id:long}/mark-read", async (ClaimsPrincipal user, JazzerLifeContext db, long id) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                try
                {
                    var log = await db.EconAlertLogs
                        .Include(l => l.Rule)
                        .FirstOrDefaultAsync(l => l.LogId == id && l.Rule.UserId == userId);

                    if (log == null)
                        return Results.NotFound(new { message = "找不到紀錄或無權限修改" });

                    log.IsRead = true;
                    await db.SaveChangesAsync();
                    return Results.Ok(new { message = "已標記為已讀" });
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "更新示警紀錄失敗", detail = ex.Message }, statusCode: 500);
                }
            });
        }

        private static int? GetUserId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(idStr, out int id) ? id : null;
        }
    }
}
