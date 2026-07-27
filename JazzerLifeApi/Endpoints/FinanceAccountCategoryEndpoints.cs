using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using JazzerLifeApi.Models;

namespace JazzerLifeApi.Endpoints
{
    // 「設定 > 帳戶分類」：讓使用者把 銀行+帳戶 對應到自訂分類（例如：手動新增+新豐 -> 資產）
    // 分類名稱沒有獨立主檔，直接沿用使用者用過的 distinct 值當作下拉選單建議（見 db_backup/account_category_schema_backup_2026-07-27.md）
    public static class FinanceAccountCategoryEndpoints
    {
        public static void MapFinanceAccountCategoryEndpoints(this WebApplication app)
        {
            // 列出使用者所有帳戶（去重）與目前分類（尚未設定則為 null）
            app.MapGet("/api/finance/account-categories", async (ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                try
                {
                    var accounts = await db.BankAccounts
                        .Where(a => a.UserId == userId && a.Activate == "1")
                        .Select(a => new { a.OrganizationName, a.AccountName })
                        .Distinct()
                        .ToListAsync();

                    var categories = await db.AccountCategories
                        .Where(c => c.UserId == userId)
                        .ToListAsync();

                    var categoryMap = categories.ToDictionary(c => (c.OrganizationName, c.AccountName), c => c.Category);

                    var result = accounts
                        .Select(a => new
                        {
                            a.OrganizationName,
                            a.AccountName,
                            Category = categoryMap.TryGetValue((a.OrganizationName, a.AccountName), out var cat) ? cat : null,
                        })
                        .OrderBy(a => a.OrganizationName)
                        .ThenBy(a => a.AccountName)
                        .ToList();

                    return Results.Ok(result);
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "查詢帳戶分類失敗，請洽系統管理員", detail = ex.Message }, statusCode: 500);
                }
            });

            // 列出使用者已經用過的分類名稱（下拉選單建議用）
            app.MapGet("/api/finance/account-categories/options", async (ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                try
                {
                    var options = await db.AccountCategories
                        .Where(c => c.UserId == userId)
                        .Select(c => c.Category)
                        .Distinct()
                        .OrderBy(c => c)
                        .ToListAsync();

                    return Results.Ok(options);
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "查詢分類選項失敗，請洽系統管理員", detail = ex.Message }, statusCode: 500);
                }
            });

            // 新增/更新某個帳戶的分類；Category 為空字串時視為清除分類
            app.MapPut("/api/finance/account-categories", async (AccountCategoryUpdateRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                if (string.IsNullOrWhiteSpace(req.OrganizationName) || string.IsNullOrWhiteSpace(req.AccountName))
                    return Results.Json(new { message = "銀行/帳戶不可為空" }, statusCode: 400);

                var organizationName = req.OrganizationName.Trim();
                var accountName = req.AccountName.Trim();
                var category = req.Category?.Trim() ?? "";

                if (category.Length > 50)
                    return Results.Json(new { message = "分類名稱長度不可超過 50 個字" }, statusCode: 400);

                try
                {
                    var record = await db.AccountCategories.FirstOrDefaultAsync(c =>
                        c.UserId == userId && c.OrganizationName == organizationName && c.AccountName == accountName);

                    if (string.IsNullOrEmpty(category))
                    {
                        // 分類清空：如果原本就沒有設定，直接回傳成功；有的話就刪除該筆對應
                        if (record != null)
                        {
                            db.AccountCategories.Remove(record);
                            await db.SaveChangesAsync();
                        }
                        return Results.Ok(new { message = "已清除分類", category = (string?)null });
                    }

                    if (record == null)
                    {
                        record = new AccountCategory
                        {
                            UserId = userId.Value,
                            OrganizationName = organizationName,
                            AccountName = accountName,
                            Category = category,
                            CreatedAt = DateTime.Now,
                            UpdatedAt = DateTime.Now,
                        };
                        db.AccountCategories.Add(record);
                    }
                    else
                    {
                        record.Category = category;
                        record.UpdatedAt = DateTime.Now;
                    }

                    await db.SaveChangesAsync();
                    return Results.Ok(new { message = "已更新分類", category });
                }
                catch (DbUpdateException ex)
                {
                    // 常見情況：UNIQUE 約束衝突（理論上先查再寫不太會撞到，但多裝置同時操作時仍可能發生）
                    return Results.Json(new { message = "更新分類失敗，請重新整理後再試一次", detail = ex.InnerException?.Message ?? ex.Message }, statusCode: 409);
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "更新分類失敗，請洽系統管理員", detail = ex.Message }, statusCode: 500);
                }
            });
        }

        private static int? GetUserId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(idStr, out int id) ? id : null;
        }
    }

    public record AccountCategoryUpdateRequest(string OrganizationName, string AccountName, string? Category);
}
