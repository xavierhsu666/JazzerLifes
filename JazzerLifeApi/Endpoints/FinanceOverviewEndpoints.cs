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

                // 資產／負債改以「設定 → 帳戶分類」的分類判定，不再用餘額正負號。
                // 規則：分類名稱含「負債」→ 負債；含「資產」→ 資產；其餘分類與未分類的帳戶都不計入，
                // 未計入的筆數會回傳給前端提示，避免漏設分類時數字默默變少卻看不出來。
                var accounts = await db.BankAccounts
                    .Where(a => a.UserId == userId && a.Activate == "1")
                    .Select(a => new { a.OrganizationName, a.AccountName, a.AccountBalance, a.CreatedAt })
                    .ToListAsync();

                var categories = await db.AccountCategories
                    .Where(c => c.UserId == userId)
                    .Select(c => new { c.OrganizationName, c.AccountName, c.Category })
                    .ToListAsync();

                // 帳戶分類的自然鍵是「機構 + 帳戶」，先做成字典再逐月比對
                var categoryMap = categories
                    .GroupBy(c => (c.OrganizationName, c.AccountName))
                    .ToDictionary(g => g.Key, g => g.First().Category);

                var accountByMonth = accounts
                    .Where(a => a.CreatedAt != null)
                    .Select(a => new
                    {
                        YearMonth = $"{a.CreatedAt!.Value.Year}-{a.CreatedAt.Value.Month:D2}",
                        Balance = a.AccountBalance ?? 0,
                        Kind = ClassifyAccount(categoryMap, a.OrganizationName, a.AccountName)
                    })
                    .GroupBy(a => a.YearMonth)
                    .Select(g => new
                    {
                        YearMonth = g.Key,
                        Assets = g.Where(x => x.Kind == AccountKind.Asset).Sum(x => x.Balance),
                        // 負債沿用「圖表上是負值」的既有語意；來源餘額可能被登記成正數（欠款）或負數，
                        // 一律取絕對值再轉負，避免同一種負債因登記方式不同而相互抵消
                        Debt = -g.Where(x => x.Kind == AccountKind.Liability).Sum(x => Math.Abs(x.Balance)),
                        UnclassifiedCount = g.Count(x => x.Kind == AccountKind.None),
                        UnclassifiedAmount = g.Where(x => x.Kind == AccountKind.None).Sum(x => x.Balance),
                        ExcludedCount = g.Count(x => x.Kind == AccountKind.Excluded),
                        ExcludedAmount = g.Where(x => x.Kind == AccountKind.Excluded).Sum(x => x.Balance),
                    })
                    .Select(x => new
                    {
                        x.YearMonth,
                        x.Assets,
                        x.Debt,
                        NetAssets = x.Assets + x.Debt,   // Debt 已是負值，相加即為淨資產
                        x.UnclassifiedCount,
                        x.UnclassifiedAmount,
                        x.ExcludedCount,
                        x.ExcludedAmount,
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
                    result.Add(new { Type = "UnclassifiedCount", a.YearMonth, total = (decimal)a.UnclassifiedCount });
                    result.Add(new { Type = "UnclassifiedAmount", a.YearMonth, total = a.UnclassifiedAmount });
                    result.Add(new { Type = "ExcludedCount", a.YearMonth, total = (decimal)a.ExcludedCount });
                    result.Add(new { Type = "ExcludedAmount", a.YearMonth, total = a.ExcludedAmount });
                }
                foreach (var d in detailByMonth)
                {
                    result.Add(new { Type = "Income", d.YearMonth, total = d.Income });
                    result.Add(new { Type = "Expense", d.YearMonth, total = d.Expense });
                    result.Add(new { Type = "Net", d.YearMonth, total = d.Net });
                }

                var recentMonths = result
                    .Select(r => (string)r.GetType().GetProperty("YearMonth")!.GetValue(r)!)
                    .Distinct()
                    .OrderByDescending(ym => ym)
                    .Take(14)
                    .ToHashSet();

                var filtered = result
                    .Where(r => recentMonths.Contains((string)r.GetType().GetProperty("YearMonth")!.GetValue(r)!))
                    .OrderBy(r => (string)r.GetType().GetProperty("YearMonth")!.GetValue(r)!)
                    .ToList();

                return Results.Ok(filtered);
            });

            // 診斷用：列出指定月份「沒有被計入資產/負債統計」的帳戶，含它們目前的分類名稱。
            // 前端提示只講筆數的話，看不出來到底是漏設分類，還是分類名稱不符合判定規則。
            app.MapGet("/api/finance/overview/uncounted", async (string? month, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                var accounts = await db.BankAccounts
                    .Where(a => a.UserId == userId && a.Activate == "1" && a.CreatedAt != null)
                    .Select(a => new { a.OrganizationName, a.AccountName, a.AccountBalance, a.CreatedAt })
                    .ToListAsync();

                var categories = await db.AccountCategories
                    .Where(c => c.UserId == userId)
                    .Select(c => new { c.OrganizationName, c.AccountName, c.Category })
                    .ToListAsync();

                var categoryMap = categories
                    .GroupBy(c => (c.OrganizationName, c.AccountName))
                    .ToDictionary(g => g.Key, g => g.First().Category);

                var withMonth = accounts
                    .Select(a => new
                    {
                        YearMonth = $"{a.CreatedAt!.Value.Year}-{a.CreatedAt.Value.Month:D2}",
                        a.OrganizationName,
                        a.AccountName,
                        Balance = a.AccountBalance ?? 0
                    })
                    .ToList();

                // 沒指定月份就用最新有資料的月份，跟總覽卡片看的是同一個月
                var yearMonth = string.IsNullOrWhiteSpace(month)
                    ? withMonth.Select(x => x.YearMonth).OrderByDescending(x => x).FirstOrDefault()
                    : month;

                var uncounted = withMonth
                    .Where(a => a.YearMonth == yearMonth)
                    .Select(a => new
                    {
                        a.OrganizationName,
                        a.AccountName,
                        a.Balance,
                        Kind = ClassifyAccount(categoryMap, a.OrganizationName, a.AccountName),
                        Category = categoryMap.TryGetValue((a.OrganizationName, a.AccountName), out var c) ? c : null
                    })
                    .Where(a => a.Kind == AccountKind.None || a.Kind == AccountKind.Excluded)
                    .Select(a => new
                    {
                        a.OrganizationName,
                        a.AccountName,
                        a.Balance,
                        a.Category,
                        Kind = a.Kind == AccountKind.Excluded ? "excluded" : "unclassified"
                    })
                    .OrderByDescending(a => Math.Abs(a.Balance))
                    .ToList();

                return Results.Ok(new
                {
                    yearMonth,
                    count = uncounted.Count(x => x.Kind == "unclassified"),
                    totalBalance = uncounted.Where(x => x.Kind == "unclassified").Sum(x => x.Balance),
                    excludedCount = uncounted.Count(x => x.Kind == "excluded"),
                    excludedBalance = uncounted.Where(x => x.Kind == "excluded").Sum(x => x.Balance),
                    // 依分類名稱歸納，一眼看出是「完全沒設分類」還是「分類名稱不含資產/負債」
                    byCategory = uncounted
                        .Where(x => x.Kind == "unclassified")
                        .GroupBy(x => string.IsNullOrWhiteSpace(x.Category) ? "（未設定分類）" : x.Category!)
                        .Select(g => new { category = g.Key, count = g.Count(), total = g.Sum(x => x.Balance) })
                        .OrderByDescending(g => g.count)
                        .ToList(),
                    accounts = uncounted
                });
            });
        }

        private enum AccountKind { Asset, Liability, Excluded, None }

        private static readonly string[] ExcludeKeywords = { "忽視", "忽略", "不計入", "排除" };

        /// <summary>
        /// 依帳戶分類判斷這個帳戶算資產、負債、刻意忽視，還是無法判定。
        /// 用「包含」而非完全相等，是為了讓「流動資產」「信用卡負債」這類自訂名稱也能歸到正確的一邊；
        /// 先判忽視再判負債再判資產，避免「資產負債整合帳戶」這種同時含兩個詞的名稱被誤判成資產。
        ///
        /// Excluded 與 None 的差別在「要不要警告」：分類名稱是忽視/忽略/不計入/排除，代表使用者
        /// 本來就不想把它算進資產（例如已被集保庫存取代的舊帳），這種不該每次都跳提示；
        /// 只有完全沒設分類、或分類名稱看不出是資產還是負債的，才需要提醒去補設定。
        /// </summary>
        private static AccountKind ClassifyAccount(
            Dictionary<(string, string), string> categoryMap, string organizationName, string accountName)
        {
            if (!categoryMap.TryGetValue((organizationName, accountName), out var category) || string.IsNullOrWhiteSpace(category))
                return AccountKind.None;

            if (ExcludeKeywords.Any(k => category.Contains(k))) return AccountKind.Excluded;
            if (category.Contains("負債")) return AccountKind.Liability;
            if (category.Contains("資產")) return AccountKind.Asset;
            return AccountKind.None;
        }

        private static int? GetUserId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(idStr, out int id) ? id : null;
        }
    }
}
