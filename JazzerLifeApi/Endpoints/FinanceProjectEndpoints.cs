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

                var projectIds = projects.Select(p => p.ProjectId).ToList();

                // 摘要列表「達成率」改成用「預期資產變化」子系統的推算值 vs「資產流」子系統的實際綁定資產來比較，
                // 不再用「預算 vs 淨收支」；以下批次撈出兩邊子系統的資料，避免在迴圈裡逐專案查詢資料庫(N+1)
                var expectedDrafts = await db.ProjectExpectedDrafts
                    .Include(d => d.ProjectExpectedRows)
                    .Where(d => projectIds.Contains(d.ProjectId))
                    .ToListAsync();

                var assetBindings = await db.ProjectAssetBindings
                    .Where(b => b.Activate && projectIds.Contains(b.ProjectId))
                    .ToListAsync();

                var bankAccounts = await db.BankAccounts
                    .Where(a => a.UserId == userId && a.Activate == "1" && a.CreatedAt != null)
                    .ToListAsync();

                // 「上月實際資產」只加總「設定 > 帳戶分類」裡標成「資產」的帳戶，負債類別的帳戶不計入，
                // 跟總覽頁用餘額正負號判斷資產/負債是兩套獨立邏輯（沿用 FinanceAccountCategoryEndpoints 的分類設定）
                var accountCategories = await db.AccountCategories
                    .Where(c => c.UserId == userId)
                    .ToListAsync();
                var accountCategoryMap = accountCategories
                    .ToDictionary(c => (c.OrganizationName, c.AccountName), c => c.Category);

                // 「專案層面排除」：跟 FinanceProjectCashflowEndpoints 的命中明細/月度趨勢共用同一份排除清單，
                // 這裡也要扣掉，摘要列表的淨收支才會跟專案詳情頁的命中金額一致
                var cashflowExclusions = await db.ProjectCashflowExclusions
                    .Where(e => projectIds.Contains(e.ProjectId))
                    .ToListAsync();
                var excludedDetailIdsByProject = cashflowExclusions
                    .GroupBy(e => e.ProjectId)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.DetailId).ToHashSet());

                var result = projects.Select(p =>
                {
                    var excludedDetailIds = excludedDetailIdsByProject.TryGetValue(p.ProjectId, out var ex) ? ex : new HashSet<int>();
                    var keywords = (p.KeyWord ?? "").Split(new[] { ',', ' ' }, StringSplitOptions.RemoveEmptyEntries);
                    var matched = keywords.Length == 0
                        ? new List<Detail>()
                        : details.Where(d =>
                            !excludedDetailIds.Contains(d.DetailId) &&
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

                    // 上個月預期資產：取「該專案資料實際存在的最新月份」，不強制對齊日曆月，
                    // 避免使用者資料還沒建到當月時，卡片顯示 0 造成誤解
                    decimal prevMonthExpectedAsset = 0;
                    var draft = expectedDrafts.FirstOrDefault(d => d.ProjectId == p.ProjectId);
                    if (draft != null && draft.ProjectExpectedRows.Any())
                    {
                        var rows = draft.ProjectExpectedRows.OrderBy(r => r.Month).ToList();
                        var computedRows = FinanceProjectExpectedEndpoints.ComputeRows(draft.BaseAsset, rows);
                        prevMonthExpectedAsset = computedRows.Last().ClosingAsset;
                    }

                    // 上個月實際資產：取該專案「資產流」綁定中實際存在資料的最新月份，
                    // 只加總「帳戶分類」設成「資產」的帳戶餘額，負債類別的帳戶不計入
                    decimal prevMonthActualAsset = 0;
                    var projectBindings = assetBindings.Where(b => b.ProjectId == p.ProjectId).ToList();
                    var latestBindingMonth = projectBindings
                        .Select(b => b.SnapshotMonth)
                        .OrderByDescending(m => m)
                        .FirstOrDefault();
                    if (latestBindingMonth != null)
                    {
                        prevMonthActualAsset = projectBindings
                            .Where(b => b.SnapshotMonth == latestBindingMonth
                                && accountCategoryMap.TryGetValue((b.OrganizationName, b.AccountName), out var boundCategory)
                                && boundCategory == "資產")
                            .Sum(b => bankAccounts.FirstOrDefault(a =>
                                a.OrganizationName == b.OrganizationName &&
                                a.AccountName == b.AccountName &&
                                a.CreatedAt!.Value.Year + "-" + a.CreatedAt.Value.Month.ToString("D2") == latestBindingMonth)
                                ?.AccountBalance ?? 0);
                    }

                    var ratio = prevMonthExpectedAsset != 0 ? (double)(prevMonthActualAsset / prevMonthExpectedAsset) : 0;

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
                        PrevMonthExpectedAsset = prevMonthExpectedAsset,
                        PrevMonthActualAsset = prevMonthActualAsset,
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
