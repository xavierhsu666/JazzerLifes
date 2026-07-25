using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using JazzerLifeApi.Models;

namespace JazzerLifeApi.Endpoints
{
    public static class FinanceProjectCashflowEndpoints
    {
        public static void MapFinanceProjectCashflowEndpoints(this WebApplication app)
        {
            // 查詢目前的關鍵字規則
            app.MapGet("/api/finance/projects/{projectId:int}/cashflow-rules", async (int projectId, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var project = await db.Projects.FirstOrDefaultAsync(p => p.ProjectId == projectId && p.UserId == userId);
                if (project == null) return Results.Json(new { message = "找不到專案" }, statusCode: 403);

                var rules = await db.ProjectCashflowRules
                    .Where(r => r.ProjectId == projectId && r.Activate)
                    .Select(r => new { r.RuleId, r.Keyword })
                    .ToListAsync();

                return Results.Ok(rules);
            });

            // 整批取代關鍵字規則
            app.MapPut("/api/finance/projects/{projectId:int}/cashflow-rules", async (int projectId, CashflowRulesRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var project = await db.Projects.FirstOrDefaultAsync(p => p.ProjectId == projectId && p.UserId == userId);
                if (project == null) return Results.Json(new { message = "找不到專案" }, statusCode: 403);

                var existing = await db.ProjectCashflowRules.Where(r => r.ProjectId == projectId).ToListAsync();
                db.ProjectCashflowRules.RemoveRange(existing);

                foreach (var kw in req.Keywords.Where(k => !string.IsNullOrWhiteSpace(k)))
                {
                    db.ProjectCashflowRules.Add(new ProjectCashflowRule
                    {
                        ProjectId = projectId,
                        Keyword = kw.Trim(),
                        Activate = true,
                        CreatedAt = DateTime.Now,
                        UpdatedAt = DateTime.Now,
                    });
                }
                await db.SaveChangesAsync();

                return Results.Ok(new { message = "已更新關鍵字規則" });
            });

            // 查詢命中的交易明細(可指定月份，或不指定=全部月份)
            app.MapGet("/api/finance/projects/{projectId:int}/cashflow-matches", async (int projectId, string? month, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var project = await db.Projects.FirstOrDefaultAsync(p => p.ProjectId == projectId && p.UserId == userId);
                if (project == null) return Results.Json(new { message = "找不到專案" }, statusCode: 403);

                var keywords = await db.ProjectCashflowRules
                    .Where(r => r.ProjectId == projectId && r.Activate)
                    .Select(r => r.Keyword)
                    .ToListAsync();

                if (keywords.Count == 0)
                    return Results.Ok(new { matched = new List<object>(), hitCount = 0, hitAmount = 0m, missCount = 0 });

                var allDetails = await db.Details
                    .Where(d => d.UserId == userId && d.Activate == "1" && !d.IsExcluded)
                    .ToListAsync();

                var scopeDetails = string.IsNullOrWhiteSpace(month)
                    ? allDetails
                    : allDetails.Where(d => d.TransactionDate.Year + "-" + d.TransactionDate.Month.ToString("D2") == month).ToList();

                var matched = scopeDetails.Where(d =>
                    keywords.Any(k =>
                        (d.Description ?? "").Contains(k) ||
                        d.Category.Contains(k) ||
                        d.AccountName.Contains(k) ||
                        d.OrganizationName.Contains(k) ||
                        (d.Tag ?? "").Contains(k) ||
                        (d.Notes ?? "").Contains(k)))
                    .OrderByDescending(d => d.TransactionDate)
                    .Select(d => new
                    {
                        YearMonth = d.TransactionDate.Year + "-" + d.TransactionDate.Month.ToString("D2"),
                        d.TransactionDate,
                        d.Category,
                        d.AccountName,
                        d.Description,
                        d.Amount
                    })
                    .ToList();

                var hitAmount = matched.Sum(m => m.Amount);
                var missCount = Math.Max(0, scopeDetails.Count - matched.Count);

                return Results.Ok(new { matched, hitCount = matched.Count, hitAmount, missCount });
            });

            // 每月實際收支彙總(供現金流趨勢圖)
            app.MapGet("/api/finance/projects/{projectId:int}/cashflow-monthly", async (int projectId, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var project = await db.Projects.FirstOrDefaultAsync(p => p.ProjectId == projectId && p.UserId == userId);
                if (project == null) return Results.Json(new { message = "找不到專案" }, statusCode: 403);

                var keywords = await db.ProjectCashflowRules
                    .Where(r => r.ProjectId == projectId && r.Activate)
                    .Select(r => r.Keyword)
                    .ToListAsync();

                if (keywords.Count == 0)
                    return Results.Ok(new List<object>());

                var allDetails = await db.Details
                    .Where(d => d.UserId == userId && d.Activate == "1" && !d.IsExcluded)
                    .ToListAsync();

                var matched = allDetails.Where(d =>
                    keywords.Any(k =>
                        (d.Description ?? "").Contains(k) ||
                        d.Category.Contains(k) ||
                        d.AccountName.Contains(k) ||
                        d.OrganizationName.Contains(k) ||
                        (d.Tag ?? "").Contains(k) ||
                        (d.Notes ?? "").Contains(k)))
                    .ToList();

                var monthly = matched
                    .GroupBy(d => d.TransactionDate.Year + "-" + d.TransactionDate.Month.ToString("D2"))
                    .Select(g => new
                    {
                        Month = g.Key,
                        Income = g.Where(x => x.Amount >= 0).Sum(x => x.Amount),
                        Expense = Math.Abs(g.Where(x => x.Amount < 0).Sum(x => x.Amount)),
                        Net = g.Sum(x => x.Amount)
                    })
                    .OrderBy(x => x.Month)
                    .ToList();

                return Results.Ok(monthly);
            });
        }

        private static int? GetUserId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(idStr, out int id) ? id : null;
        }
    }

    public record CashflowRulesRequest(List<string> Keywords);
}
