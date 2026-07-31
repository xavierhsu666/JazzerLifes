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

            // 查詢命中的交易明細(可指定月份，或不指定=全部月份；showExcluded=true 時才會列出「專案層面排除」的列)
            app.MapGet("/api/finance/projects/{projectId:int}/cashflow-matches", async (int projectId, string? month, bool showExcluded, ClaimsPrincipal user, JazzerLifeContext db) =>
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

                // 規則命中明細不排除 IsExcluded=1 的交易：IsExcluded 是「總覽/明細」等一般財務報表的排除旗標，
                // 跟專案管理要不要把某筆交易算進本專案是兩件事，不應共用同一個欄位判斷。
                var allDetails = await db.Details
                    .Where(d => d.UserId == userId && d.Activate == "1")
                    .ToListAsync();

                var scopeDetails = string.IsNullOrWhiteSpace(month)
                    ? allDetails
                    : allDetails.Where(d => d.TransactionDate.Year + "-" + d.TransactionDate.Month.ToString("D2") == month).ToList();

                // 「專案層面排除」：使用者針對這個專案手動排除的個別明細（跟關鍵字規則命中與否無關），
                // 只影響這個專案的統計，不影響其他專案或一般財務報表
                var excludedDetailIds = await db.ProjectCashflowExclusions
                    .Where(e => e.ProjectId == projectId)
                    .Select(e => e.DetailId)
                    .ToListAsync();
                var excludedSet = excludedDetailIds.ToHashSet();

                var allMatched = scopeDetails.Where(d =>
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
                        d.DetailId,
                        YearMonth = d.TransactionDate.Year + "-" + d.TransactionDate.Month.ToString("D2"),
                        d.TransactionDate,
                        d.Category,
                        d.AccountName,
                        d.Description,
                        d.Amount,
                        IsProjectExcluded = excludedSet.Contains(d.DetailId)
                    })
                    .ToList();

                // 命中金額/命中筆數只算「沒有被本專案排除」的部分，這才是真正算進這個專案的數字；
                // 未命中筆數則是看關鍵字規則有沒有命中，跟是否被專案排除無關（排除的列仍然算「有命中規則」）
                var countedMatched = allMatched.Where(m => !m.IsProjectExcluded).ToList();
                var hitAmount = countedMatched.Sum(m => m.Amount);
                var missCount = Math.Max(0, scopeDetails.Count - allMatched.Count);

                // 預設不列出已排除的列（比照一般明細頁「顯示已排除」的慣例），showExcluded=true 才會連排除的列一起回傳並標示 IsProjectExcluded
                var matched = showExcluded ? allMatched : allMatched.Where(m => !m.IsProjectExcluded).ToList();

                return Results.Ok(new { matched, hitCount = countedMatched.Count, hitAmount, missCount });
            });

            // 切換「專案層面排除」：命中規則的某筆明細，使用者判斷不該算進這個專案時單獨排除，
            // 只影響 (projectId, detailId) 這個組合，不影響其他專案，也不會動到 Detail.IsExcluded
            app.MapPost("/api/finance/projects/{projectId:int}/cashflow-matches/{detailId:int}/toggle-exclude", async (int projectId, int detailId, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var project = await db.Projects.FirstOrDefaultAsync(p => p.ProjectId == projectId && p.UserId == userId);
                if (project == null) return Results.Json(new { message = "找不到專案" }, statusCode: 403);

                // 需確認這筆明細確實屬於目前登入的使用者，避免猜測 detailId 去操作到別人的資料
                var detailExists = await db.Details.AnyAsync(d => d.DetailId == detailId && d.UserId == userId);
                if (!detailExists) return Results.Json(new { message = "找不到明細" }, statusCode: 404);

                var existing = await db.ProjectCashflowExclusions
                    .FirstOrDefaultAsync(e => e.ProjectId == projectId && e.DetailId == detailId);

                bool isExcluded;
                if (existing == null)
                {
                    db.ProjectCashflowExclusions.Add(new ProjectCashflowExclusion
                    {
                        ProjectId = projectId,
                        DetailId = detailId,
                        CreatedAt = DateTime.Now,
                    });
                    isExcluded = true;
                }
                else
                {
                    db.ProjectCashflowExclusions.Remove(existing);
                    isExcluded = false;
                }
                await db.SaveChangesAsync();

                return Results.Ok(new { message = isExcluded ? "已從本專案排除" : "已取消排除", isExcluded });
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

                // 同上：與「命中明細」查詢維持一致，不再以 IsExcluded 篩選，避免月度趨勢圖跟明細清單的合計對不起來
                var allDetails = await db.Details
                    .Where(d => d.UserId == userId && d.Activate == "1")
                    .ToListAsync();

                // 月度趨勢圖也要扣掉「專案層面排除」的明細，才會跟命中明細清單的命中金額一致
                var excludedDetailIds = await db.ProjectCashflowExclusions
                    .Where(e => e.ProjectId == projectId)
                    .Select(e => e.DetailId)
                    .ToListAsync();
                var excludedSet = excludedDetailIds.ToHashSet();

                var matched = allDetails.Where(d =>
                    !excludedSet.Contains(d.DetailId) &&
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
