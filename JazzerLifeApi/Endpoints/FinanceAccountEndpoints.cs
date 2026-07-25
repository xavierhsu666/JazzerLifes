using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using JazzerLifeApi.Models;

namespace JazzerLifeApi.Endpoints
{
    public static class FinanceAccountEndpoints
    {
        public static void MapFinanceAccountEndpoints(this WebApplication app)
        {
            // 查詢所有可選的版本月份
            app.MapGet("/api/finance/accounts/months", async (ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var accounts = await db.BankAccounts
                    .Where(a => a.UserId == userId && a.Activate == "1" && a.CreatedAt != null)
                    .Select(a => a.CreatedAt)
                    .ToListAsync();

                var months = accounts
                    .Select(c => c!.Value.Year + "-" + c.Value.Month.ToString("D2"))
                    .Distinct()
                    .OrderByDescending(m => m)
                    .ToList();

                return Results.Ok(months);
            });

            // 查詢指定月份的帳戶清單
            app.MapGet("/api/finance/accounts", async (string? month, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var query = db.BankAccounts.Where(a => a.UserId == userId && a.Activate == "1" && a.AccountBalance != 0);
                var accounts = await query.ToListAsync();

                var result = accounts
                    .Where(a => a.CreatedAt != null)
                    .Where(a => string.IsNullOrWhiteSpace(month) || (a.CreatedAt!.Value.Year + "-" + a.CreatedAt.Value.Month.ToString("D2")) == month)
                    .Select(a => new
                    {
                        YearMonth = a.CreatedAt!.Value.Year + "-" + a.CreatedAt.Value.Month.ToString("D2"),
                        a.OrganizationName,
                        a.AccountName,
                        a.Currency,
                        a.AccountBalance
                    })
                    .OrderByDescending(a => a.AccountBalance)
                    .ToList();

                return Results.Ok(result);
            });

            // 修改帳戶結餘(以自然鍵定位：銀行+帳戶+幣別+月份)
            app.MapPut("/api/finance/accounts/balance", async (AccountBalanceUpdateRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                if (!DateTime.TryParse(req.Month + "-01", out var monthStart))
                    return Results.BadRequest(new { message = "月份格式錯誤" });
                var monthEnd = monthStart.AddMonths(1);

                var currencyParam = req.Currency ?? (object)DBNull.Value;

                var rows = await db.Database.ExecuteSqlInterpolatedAsync($@"
                    UPDATE FIN.BankAccount
                    SET AccountBalance = {req.NewBalance}, UpdatedAt = {DateTime.Now}
                    WHERE UserID = {userId.Value}
                      AND OrganizationName = {req.OrganizationName}
                      AND AccountName = {req.AccountName}
                      AND (Currency = {currencyParam} OR (Currency IS NULL AND {currencyParam} IS NULL))
                      AND CreatedAt >= {monthStart} AND CreatedAt < {monthEnd}");

                if (rows == 0)
                    return Results.Json(new { message = "找不到符合的帳戶紀錄" }, statusCode: 404);

                return Results.Ok(new { message = "已更新結餘" });
            });
        }

        private static int? GetUserId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(idStr, out int id) ? id : null;
        }
    }

    public record AccountBalanceUpdateRequest(string OrganizationName, string AccountName, string? Currency, string Month, decimal NewBalance);
}
