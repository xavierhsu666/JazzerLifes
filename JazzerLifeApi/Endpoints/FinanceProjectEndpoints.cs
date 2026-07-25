using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using JazzerLifeApi.Models;

namespace JazzerLifeApi.Endpoints
{
    public static class FinanceProjectEndpoints
    {
        public static void MapFinanceProjectEndpoints(this WebApplication app)
        {
            // 查詢專案列表(含收支統計、達成率)
            app.MapGet("/api/finance/projects", async (ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                var projects = await db.Projects
                    .Where(p => p.UserId == userId && p.Activate == "1")
                    .OrderByDescending(p => p.CreatedAt)
                    .ToListAsync();

                var details = await db.Details
                    .Where(d => d.UserId == userId && d.Activate == "1" && !d.IsExcluded)
                    .ToListAsync();

                var result = projects.Select(p =>
                {
                    var keywords = (p.KeyWord ?? "").Split(new[] { ',', ' ' }, StringSplitOptions.RemoveEmptyEntries);
                    var matched = keywords.Length == 0
                        ? new List<Detail>()
                        : details.Where(d =>
                            keywords.Any(k =>
                                (d.Description ?? "").Contains(k) ||
                                d.Category.Contains(k) ||
                                d.AccountName.Contains(k) ||
                                d.OrganizationName.Contains(k) ||
                                (d.Tag ?? "").Contains(k) ||
                                (d.Notes ?? "").Contains(k)))
                          .ToList();

                    var income = matched.Where(d => d.Amount >= 0).Sum(d => d.Amount);
                    var expense = Math.Abs(matched.Where(d => d.Amount < 0).Sum(d => d.Amount));
                    var net = matched.Sum(d => d.Amount);
                    var ratio = p.BillBudget != 0 ? (double)(net / p.BillBudget) : 0;

                    return new
                    {
                        p.ProjectId,
                        p.BillProjectId,
                        p.KeyWord,
                        p.BillBudget,
                        p.Status,
                        BillStartTime = p.BillStartTime,
                        BillEndTime = p.BillEndTime,
                        Income = income,
                        Expense = expense,
                        Net = net,
                        FullfillRatio = ratio
                    };
                }).ToList();

                return Results.Ok(result);
            });

            // 新增專案
            app.MapPost("/api/finance/projects", async (ProjectCreateRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                if (string.IsNullOrWhiteSpace(req.Name))
                    return Results.BadRequest(new { message = "請填入專案名稱" });

                var keyword = string.IsNullOrWhiteSpace(req.Keyword) ? req.Name : req.Keyword;
                var tagPrefix = "#" + keyword.Split(',', ' ')[0];

                var project = new Project
                {
                    UserId = userId.Value,
                    BillProjectId = req.Name,
                    KeyWord = keyword,
                    BillStartTime = req.StartDate ?? DateTime.Now,
                    BillEndTime = req.EndDate ?? DateTime.Now,
                    BillBudget = req.Budget,
                    Status = req.Status ?? "進行中",
                    TagPrefix = tagPrefix,
                    Activate = "1",
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now,
                };
                db.Projects.Add(project);
                await db.SaveChangesAsync();

                return Results.Ok(new { message = "專案已建立", projectId = project.ProjectId });
            });

            // 修改專案基本資訊
            app.MapPut("/api/finance/projects/{projectId:int}", async (int projectId, ProjectCreateRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                var project = await db.Projects.FirstOrDefaultAsync(p => p.ProjectId == projectId && p.UserId == userId);
                if (project == null)
                    return Results.Json(new { message = "找不到專案或無權限" }, statusCode: 403);

                project.BillProjectId = req.Name;
                project.KeyWord = string.IsNullOrWhiteSpace(req.Keyword) ? req.Name : req.Keyword;
                project.BillBudget = req.Budget;
                project.Status = req.Status ?? project.Status;
                if (req.StartDate.HasValue) project.BillStartTime = req.StartDate;
                if (req.EndDate.HasValue) project.BillEndTime = req.EndDate;
                project.UpdatedAt = DateTime.Now;

                await db.SaveChangesAsync();
                return Results.Ok(new { message = "已更新專案" });
            });

            // 刪除專案(軟刪除)
            app.MapDelete("/api/finance/projects/{projectId:int}", async (int projectId, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                var project = await db.Projects.FirstOrDefaultAsync(p => p.ProjectId == projectId && p.UserId == userId);
                if (project == null)
                    return Results.Json(new { message = "找不到專案或無權限" }, statusCode: 403);

                project.Activate = "0";
                project.UpdatedAt = DateTime.Now;
                await db.SaveChangesAsync();

                return Results.Ok(new { message = "已刪除專案" });
            });
        }

        private static int? GetUserId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(idStr, out int id) ? id : null;
        }
    }

    public record ProjectCreateRequest(string Name, string? Keyword, decimal Budget, string? Status, DateTime? StartDate, DateTime? EndDate);
}
