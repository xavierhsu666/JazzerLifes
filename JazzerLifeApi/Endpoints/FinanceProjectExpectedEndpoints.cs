using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using JazzerLifeApi.Models;

namespace JazzerLifeApi.Endpoints
{
    public static class FinanceProjectExpectedEndpoints
    {
        public static void MapFinanceProjectExpectedEndpoints(this WebApplication app)
        {
            // 查詢預期資產草稿(若不存在則回傳空)
            app.MapGet("/api/finance/projects/{projectId:int}/expected", async (int projectId, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var project = await db.Projects.FirstOrDefaultAsync(p => p.ProjectId == projectId && p.UserId == userId);
                if (project == null) return Results.Json(new { message = "找不到專案" }, statusCode: 403);

                var draft = await db.ProjectExpectedDrafts
                    .Include(d => d.ProjectExpectedRows)
                    .FirstOrDefaultAsync(d => d.ProjectId == projectId);

                if (draft == null)
                {
                    return Results.Ok(new
                    {
                        exists = false,
                        baseAsset = project.BillBudget,
                        annualInflowRate = 0m,
                        annualOutflowRate = 0m,
                        rows = new List<object>()
                    });
                }

                var rows = draft.ProjectExpectedRows.OrderBy(r => r.Month).ToList();
                var computed = ComputeRows(draft.BaseAsset, rows);

                return Results.Ok(new
                {
                    exists = true,
                    baseAsset = draft.BaseAsset,
                    annualInflowRate = draft.AnnualInflowRate,
                    annualOutflowRate = draft.AnnualOutflowRate,
                    rows = computed
                });
            });

            // 依年化%數產生草稿(期初資產固定 = 專案預算)
            app.MapPost("/api/finance/projects/{projectId:int}/expected/generate", async (int projectId, GenerateExpectedRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var project = await db.Projects.FirstOrDefaultAsync(p => p.ProjectId == projectId && p.UserId == userId);
                if (project == null) return Results.Json(new { message = "找不到專案" }, statusCode: 403);

                if (project.BillStartTime == null || project.BillEndTime == null)
                    return Results.BadRequest(new { message = "專案需先設定開始/結束日期才能產生預期草稿" });

                var months = GetMonthRange(project.BillStartTime.Value, project.BillEndTime.Value);
                var baseAsset = project.BillBudget; // 核心：期初資產 = 建立專案時設定的預算

                var draft = await db.ProjectExpectedDrafts
                    .Include(d => d.ProjectExpectedRows)
                    .FirstOrDefaultAsync(d => d.ProjectId == projectId);

                if (draft == null)
                {
                    draft = new ProjectExpectedDraft
                    {
                        ProjectId = projectId,
                        BaseMonth = months.FirstOrDefault() ?? "",
                        BaseAsset = baseAsset,
                        AnnualInflowRate = req.AnnualInflowRate,
                        AnnualOutflowRate = req.AnnualOutflowRate,
                        CreatedAt = DateTime.Now,
                        UpdatedAt = DateTime.Now,
                    };
                    db.ProjectExpectedDrafts.Add(draft);
                    await db.SaveChangesAsync(); // 先存檔取得 DraftId
                }
                else
                {
                    draft.BaseAsset = baseAsset;
                    draft.AnnualInflowRate = req.AnnualInflowRate;
                    draft.AnnualOutflowRate = req.AnnualOutflowRate;
                    draft.UpdatedAt = DateTime.Now;
                    db.ProjectExpectedRows.RemoveRange(draft.ProjectExpectedRows);
                }

                decimal monthlyInflowRate = req.AnnualInflowRate / 100m / 12m;
                decimal monthlyOutflowRate = req.AnnualOutflowRate / 100m / 12m;
                decimal openingAsset = baseAsset;

                foreach (var month in months)
                {
                    var inflow = openingAsset * monthlyInflowRate;
                    var outflow = openingAsset * monthlyOutflowRate;
                    db.ProjectExpectedRows.Add(new ProjectExpectedRow
                    {
                        DraftId = draft.DraftId,
                        Month = month,
                        Inflow = inflow,
                        Outflow = outflow,
                        ManualFlow = 0,
                        CreatedAt = DateTime.Now,
                        UpdatedAt = DateTime.Now,
                    });
                    openingAsset = openingAsset + inflow - outflow;
                }

                await db.SaveChangesAsync();

                return Results.Ok(new { message = "已產生預期資產草稿", baseAsset, monthCount = months.Count });
            });

            // 手動編輯單一月份(流入/流出/手動調整)
            app.MapPut("/api/finance/projects/{projectId:int}/expected/rows/{month}", async (int projectId, string month, ExpectedRowUpdateRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var project = await db.Projects.FirstOrDefaultAsync(p => p.ProjectId == projectId && p.UserId == userId);
                if (project == null) return Results.Json(new { message = "找不到專案" }, statusCode: 403);

                var draft = await db.ProjectExpectedDrafts.FirstOrDefaultAsync(d => d.ProjectId == projectId);
                if (draft == null) return Results.Json(new { message = "尚未產生預期草稿" }, statusCode: 404);

                var row = await db.ProjectExpectedRows.FirstOrDefaultAsync(r => r.DraftId == draft.DraftId && r.Month == month);
                if (row == null) return Results.Json(new { message = "找不到該月份資料" }, statusCode: 404);

                if (req.Inflow.HasValue) row.Inflow = Math.Max(0, req.Inflow.Value);
                if (req.Outflow.HasValue) row.Outflow = Math.Max(0, req.Outflow.Value);
                if (req.ManualFlow.HasValue) row.ManualFlow = req.ManualFlow.Value;
                row.UpdatedAt = DateTime.Now;

                await db.SaveChangesAsync();
                return Results.Ok(new { message = "已更新" });
            });
        }

        private static List<ExpectedRowResult> ComputeRows(decimal baseAsset, List<ProjectExpectedRow> rows)
        {
            var result = new List<ExpectedRowResult>();
            decimal opening = baseAsset;
            foreach (var r in rows)
            {
                var netChange = r.Inflow - r.Outflow + r.ManualFlow;
                var closing = opening + netChange;
                result.Add(new ExpectedRowResult(r.Month, opening, r.Inflow, r.Outflow, r.ManualFlow, netChange, closing));
                opening = closing;
            }
            return result;
        }

        private static List<string> GetMonthRange(DateTime start, DateTime end)
        {
            var months = new List<string>();
            var cur = new DateTime(start.Year, start.Month, 1);
            var last = new DateTime(end.Year, end.Month, 1);
            while (cur <= last)
            {
                months.Add(cur.Year + "-" + cur.Month.ToString("D2"));
                cur = cur.AddMonths(1);
            }
            return months;
        }

        private static int? GetUserId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(idStr, out int id) ? id : null;
        }
    }

    public record GenerateExpectedRequest(decimal AnnualInflowRate, decimal AnnualOutflowRate);
    public record ExpectedRowUpdateRequest(decimal? Inflow, decimal? Outflow, decimal? ManualFlow);
    public record ExpectedRowResult(string Month, decimal OpeningAsset, decimal Inflow, decimal Outflow, decimal ManualFlow, decimal NetChange, decimal ClosingAsset);
}
