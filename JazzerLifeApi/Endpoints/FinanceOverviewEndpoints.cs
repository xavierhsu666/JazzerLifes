using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using JazzerLifeApi.Models;

namespace JazzerLifeApi.Endpoints
{
    public static class FinanceOverviewEndpoints
    {
        public static void MapFinanceOverviewEndpoints(this WebApplication app)
        {
            app.MapGet("/api/finance/overview", async (ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                var accounts = await db.BankAccounts
                    .Where(a => a.UserId == userId && a.Activate == "1")
                    .Select(a => new { a.AccountBalance, a.CreatedAt })
                    .ToListAsync();

                var accountByMonth = accounts
                    .Where(a => a.CreatedAt != null)
                    .GroupBy(a => $"{a.CreatedAt!.Value.Year}-{a.CreatedAt.Value.Month:D2}")
                    .Select(g => new
                    {
                        YearMonth = g.Key,
                        NetAssets = g.Sum(x => x.AccountBalance ?? 0),
                        Debt = g.Where(x => (x.AccountBalance ?? 0) < 0).Sum(x => x.AccountBalance ?? 0),
                        Assets = g.Where(x => (x.AccountBalance ?? 0) > 0).Sum(x => x.AccountBalance ?? 0),
                    })
                    .ToList();

                var details = await db.Details
                    .Where(d => d.UserId == userId && d.Activate == "1" && d.Tag == null && !d.IsExcluded)
                    .Select(d => new { d.Amount, d.TransactionDate })
                    .ToListAsync();

                var detailByMonth = details
                    .GroupBy(d => $"{d.TransactionDate.Year}-{d.TransactionDate.Month:D2}")
                    .Select(g => new
                    {
                        YearMonth = g.Key,
                        Income = g.Where(x => x.Amount >= 0).Sum(x => x.Amount),
                        Expense = g.Where(x => x.Amount < 0).Sum(x => x.Amount) * -1,
                        Net = g.Sum(x => x.Amount),
                    })
                    .ToList();

                var result = new List<object>();
                foreach (var a in accountByMonth)
                {
                    result.Add(new { Type = "NetAssets", a.YearMonth, total = a.NetAssets });
                    result.Add(new { Type = "Debt", a.YearMonth, total = a.Debt });
                    result.Add(new { Type = "Assets", a.YearMonth, total = a.Assets });
                }
                foreach (var d in detailByMonth)
                {
                    result.Add(new { Type = "Income", d.YearMonth, total = d.Income });
                    result.Add(new { Type = "Expense", d.YearMonth, total = d.Expense });
                    result.Add(new { Type = "Net", d.YearMonth, total = d.Net });
                }

                var latestMonth = accounts
                    .Where(a => a.CreatedAt != null)
                    .Select(a => a.CreatedAt!.Value)
                    .DefaultIfEmpty(DateTime.MinValue)
                    .Max();
                var latestYearMonth = $"{latestMonth.Year}-{latestMonth.Month:D2}";

                var recentMonths = result
                    .Select(r => (string)r.GetType().GetProperty("YearMonth")!.GetValue(r)!)
                    .Distinct()
                    .Where(ym => ym != latestYearMonth)
                    .OrderByDescending(ym => ym)
                    .Take(14)
                    .ToHashSet();

                var filtered = result
                    .Where(r => recentMonths.Contains((string)r.GetType().GetProperty("YearMonth")!.GetValue(r)!))
                    .ToList();

                return Results.Ok(filtered);
            });
        }

        private static int? GetUserId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(idStr, out int id) ? id : null;
        }
    }
}
