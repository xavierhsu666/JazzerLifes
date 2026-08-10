using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using JazzerLifeApi.Models;

namespace JazzerLifeApi.Endpoints
{
    public static class FinanceProjectAssetEndpoints
    {
        public static void MapFinanceProjectAssetEndpoints(this WebApplication app)
        {
            // 查詢某月可綁定的帳戶清單 + 目前勾選狀態
            app.MapGet("/api/finance/projects/{projectId:int}/assets", async (int projectId, string month, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var project = await db.Projects.FirstOrDefaultAsync(p => p.ProjectId == projectId && p.UserId == userId);
                if (project == null) return Results.Json(new { message = "找不到專案" }, statusCode: 403);

                var accounts = await db.BankAccounts
                    .Where(a => a.UserId == userId && a.Activate == "1" && a.CreatedAt != null)
                    .ToListAsync();
                var accountsThisMonth = accounts
                    .Where(a => a.CreatedAt!.Value.Year + "-" + a.CreatedAt.Value.Month.ToString("D2") == month)
                    .ToList();

                var bound = await db.ProjectAssetBindings
                    .Where(b => b.ProjectId == projectId && b.SnapshotMonth == month && b.Activate)
                    .Select(b => new { b.OrganizationName, b.AccountName })
                    .ToListAsync();
                var boundKeys = bound.Select(b => b.OrganizationName + "｜" + b.AccountName).ToHashSet();

                // 帳戶分類（設定 > 帳戶分類）供綁定 modal 的表格顯示與分組用；
                // 摘要列表的「上月實際資產」也是依這個分類決定哪些帳戶要計入（只算「資產」），
                // 所以在勾選當下就看得到分類，才不會綁了一堆負債帳戶卻不知道它們不列入計算
                var accountCategories = await db.AccountCategories
                    .Where(c => c.UserId == userId)
                    .ToListAsync();
                var categoryMap = accountCategories
                    .ToDictionary(c => (c.OrganizationName, c.AccountName), c => c.Category);

                var result = accountsThisMonth.Select(a => new
                {
                    a.OrganizationName,
                    a.AccountName,
                    a.AccountBalance,
                    Category = categoryMap.TryGetValue((a.OrganizationName, a.AccountName), out var cat) ? cat : null,
                    IsBound = boundKeys.Contains(a.OrganizationName + "｜" + a.AccountName)
                });

                return Results.Ok(result);
            });

            // 更新某月的資產綁定(整批取代)
            app.MapPut("/api/finance/projects/{projectId:int}/assets", async (int projectId, AssetBindingRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var project = await db.Projects.FirstOrDefaultAsync(p => p.ProjectId == projectId && p.UserId == userId);
                if (project == null) return Results.Json(new { message = "找不到專案" }, statusCode: 403);

                var existing = await db.ProjectAssetBindings
                    .Where(b => b.ProjectId == projectId && b.SnapshotMonth == req.Month)
                    .ToListAsync();
                db.ProjectAssetBindings.RemoveRange(existing);

                foreach (var acc in req.Accounts)
                {
                    db.ProjectAssetBindings.Add(new ProjectAssetBinding
                    {
                        ProjectId = projectId,
                        SnapshotMonth = req.Month,
                        OrganizationName = acc.OrganizationName,
                        AccountName = acc.AccountName,
                        Activate = true,
                        CreatedAt = DateTime.Now,
                        UpdatedAt = DateTime.Now,
                    });
                }
                await db.SaveChangesAsync();

                return Results.Ok(new { message = "已更新資產綁定" });
            });

            // 套用目前月份的勾選到所有月份
            app.MapPost("/api/finance/projects/{projectId:int}/assets/apply-all-months", async (int projectId, AssetApplyAllRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var project = await db.Projects.FirstOrDefaultAsync(p => p.ProjectId == projectId && p.UserId == userId);
                if (project == null) return Results.Json(new { message = "找不到專案" }, statusCode: 403);

                var accounts = await db.BankAccounts
                    .Where(a => a.UserId == userId && a.Activate == "1" && a.CreatedAt != null)
                    .ToListAsync();
                var months = accounts
                    .Select(a => a.CreatedAt!.Value.Year + "-" + a.CreatedAt.Value.Month.ToString("D2"))
                    .Distinct()
                    .ToList();

                foreach (var month in months)
                {
                    var monthAccountKeys = accounts
                        .Where(a => a.CreatedAt!.Value.Year + "-" + a.CreatedAt.Value.Month.ToString("D2") == month)
                        .Select(a => a.OrganizationName + "｜" + a.AccountName)
                        .ToHashSet();

                    var existing = await db.ProjectAssetBindings
                        .Where(b => b.ProjectId == projectId && b.SnapshotMonth == month)
                        .ToListAsync();
                    db.ProjectAssetBindings.RemoveRange(existing);

                    foreach (var acc in req.Accounts.Where(a => monthAccountKeys.Contains(a.OrganizationName + "｜" + a.AccountName)))
                    {
                        db.ProjectAssetBindings.Add(new ProjectAssetBinding
                        {
                            ProjectId = projectId,
                            SnapshotMonth = month,
                            OrganizationName = acc.OrganizationName,
                            AccountName = acc.AccountName,
                            Activate = true,
                            CreatedAt = DateTime.Now,
                            UpdatedAt = DateTime.Now,
                        });
                    }
                }
                await db.SaveChangesAsync();

                return Results.Ok(new { message = $"已套用到 {months.Count} 個月份" });
            });

            // 清除所有月份的資產綁定
            app.MapDelete("/api/finance/projects/{projectId:int}/assets", async (int projectId, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var project = await db.Projects.FirstOrDefaultAsync(p => p.ProjectId == projectId && p.UserId == userId);
                if (project == null) return Results.Json(new { message = "找不到專案" }, statusCode: 403);

                var existing = await db.ProjectAssetBindings.Where(b => b.ProjectId == projectId).ToListAsync();
                db.ProjectAssetBindings.RemoveRange(existing);
                await db.SaveChangesAsync();

                return Results.Ok(new { message = "已清除所有月份綁定" });
            });

            // 淨資產趨勢(逐月加總已綁定帳戶餘額)
            app.MapGet("/api/finance/projects/{projectId:int}/assets/trend", async (int projectId, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var project = await db.Projects.FirstOrDefaultAsync(p => p.ProjectId == projectId && p.UserId == userId);
                if (project == null) return Results.Json(new { message = "找不到專案" }, statusCode: 403);

                var bindings = await db.ProjectAssetBindings
                    .Where(b => b.ProjectId == projectId && b.Activate)
                    .ToListAsync();

                var accounts = await db.BankAccounts
                    .Where(a => a.UserId == userId && a.Activate == "1" && a.CreatedAt != null)
                    .ToListAsync();

                var trend = bindings
                    .GroupBy(b => b.SnapshotMonth)
                    .Select(g =>
                    {
                        var total = g.Sum(b =>
                            accounts.FirstOrDefault(a =>
                                a.OrganizationName == b.OrganizationName &&
                                a.AccountName == b.AccountName &&
                                a.CreatedAt!.Value.Year + "-" + a.CreatedAt.Value.Month.ToString("D2") == g.Key)
                            ?.AccountBalance ?? 0);
                        return new { Month = g.Key, NetAsset = total };
                    })
                    .OrderBy(x => x.Month)
                    .ToList();

                return Results.Ok(trend);
            });
        }

        private static int? GetUserId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(idStr, out int id) ? id : null;
        }
    }

    public record AssetAccountRef(string OrganizationName, string AccountName);
    public record AssetBindingRequest(string Month, List<AssetAccountRef> Accounts);
    public record AssetApplyAllRequest(List<AssetAccountRef> Accounts);
}
