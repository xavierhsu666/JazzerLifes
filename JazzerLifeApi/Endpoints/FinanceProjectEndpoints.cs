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

                // 撈取條件要跟 FinanceProjectCashflowEndpoints 的 cashflow-matches / cashflow-monthly 完全一致
                // (不預先濾掉 IsExcluded)，摘要列表的命中金額才會跟專案詳情頁的現金流分頁 100% 對得起來；
                // IsExcluded 是「總覽/明細」等一般財務報表用的全域排除旗標，跟「這筆交易算不算進某個專案」是兩件事，
                // 專案層面要不要排除，改用下面的 ProjectCashflowExclusions(excludedDetailIdsByProject) 判斷
                var details = await db.Details
                    .Where(d => d.UserId == userId && d.Activate == "1")
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

                // 修正 bug：摘要列表(此 API，也是「專案收支對比」圖表的資料來源)原本用 p.KeyWord
                // (建立專案時填的舊版單一關鍵字欄位，未填就預設等於專案名稱)去比對交易明細，
                // 但使用者實際在「專案詳情 > 現金流」分頁設定的規則是存在 ProjectCashflowRules 這張表，
                // 兩邊關鍵字來源不一致，導致「現金流」分頁明明有命中很多筆，摘要圖表卻算出 0
                // (例如專案名稱「信貸投資案」不會出現在任何一筆交易的描述/類別/帳戶文字裡，KeyWord 比對永遠槓龜)。
                // 這裡改成跟 FinanceProjectCashflowEndpoints 的 cashflow-matches / cashflow-monthly 用同一份
                // ProjectCashflowRules 關鍵字(批次查詢避免 N+1)，摘要列表才會跟現金流分頁的命中金額真正一致。
                var cashflowRules = await db.ProjectCashflowRules
                    .Where(r => projectIds.Contains(r.ProjectId) && r.Activate)
                    .ToListAsync();
                var keywordsByProject = cashflowRules
                    .GroupBy(r => r.ProjectId)
                    .ToDictionary(g => g.Key, g => g.Select(r => r.Keyword).ToList());

                var result = projects.Select(p =>
                {
                    var excludedDetailIds = excludedDetailIdsByProject.TryGetValue(p.ProjectId, out var ex) ? ex : new HashSet<int>();
                    var keywords = keywordsByProject.TryGetValue(p.ProjectId, out var kw) ? kw : new List<string>();
                    var matched = keywords.Count == 0
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

                    // 專案可勾選「把現金流一併計入上月實際資產」（例如房租收入型專案，成果反映在現金流
                    // 而不是綁定帳戶的餘額上）。累計範圍只到「資產流最新綁定月份」的月底，跟資產快照的
                    // 時間點對齊；晚於該月份的交易不計入，才不會把未來的錢算進過去的快照
                    decimal cashflowIncludedInActualAsset = 0;
                    if (p.IncludeCashflowInActualAsset)
                    {
                        cashflowIncludedInActualAsset = latestBindingMonth != null
                            ? matched.Where(d => MonthKey(d.TransactionDate).CompareTo(latestBindingMonth) <= 0).Sum(d => d.Amount)
                            : net;
                        prevMonthActualAsset += cashflowIncludedInActualAsset;
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
                        p.IncludeCashflowInActualAsset,
                        // 實際被加進「上月實際資產」的現金流金額，供前端顯示來源說明用（未勾選時為 0）
                        CashflowInActualAsset = cashflowIncludedInActualAsset,
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
                    IncludeCashflowInActualAsset = req.IncludeCashflowInActualAsset ?? false,
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
                if (req.IncludeCashflowInActualAsset.HasValue) project.IncludeCashflowInActualAsset = req.IncludeCashflowInActualAsset.Value;
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

        // 交易日期轉成 "yyyy-MM"，好跟資產綁定用的 SnapshotMonth 字串直接比大小
        private static string MonthKey(DateOnly date) => date.Year + "-" + date.Month.ToString("D2");
    }

    public record ProjectCreateRequest(
        string Name,
        string? Keyword,
        decimal Budget,
        string? Status,
        DateTime? StartDate,
        DateTime? EndDate,
        // 選填：null 代表沿用專案目前的設定（新增專案時等同 false）
        bool? IncludeCashflowInActualAsset);
}
