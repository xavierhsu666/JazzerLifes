using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using JazzerLifeApi.Models;

namespace JazzerLifeApi.Endpoints
{
    public static class FinanceDetailEndpoints
    {
        public static void MapFinanceDetailEndpoints(this WebApplication app)
        {
            // 查詢明細(依 sign: all/income/expense，可選關鍵字/月份/是否顯示已排除)
            app.MapGet("/api/finance/details", async (
                string sign, string? keyword, string? month, bool showExcluded,
                ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                var query = db.Details.Where(d => d.UserId == userId && d.Activate == "1" && d.IsExcluded == showExcluded);

                if (sign == "income")
                    query = query.Where(d => d.Amount >= 0);
                else if (sign == "expense")
                    query = query.Where(d => d.Amount < 0);

                if (!string.IsNullOrWhiteSpace(month))
                {
                    if (DateOnly.TryParse(month + "-01", out var monthStart))
                    {
                        var monthEnd = monthStart.AddMonths(1);
                        query = query.Where(d => d.TransactionDate >= monthStart && d.TransactionDate < monthEnd);
                    }
                }

                if (!string.IsNullOrWhiteSpace(keyword))
                {
                    var kw = keyword.Trim();
                    query = query.Where(d =>
                        (d.Description != null && d.Description.Contains(kw)) ||
                        d.Category.Contains(kw) ||
                        d.AccountName.Contains(kw) ||
                        d.OrganizationName.Contains(kw) ||
                        (d.Tag != null && d.Tag.Contains(kw)) ||
                        (d.Notes != null && d.Notes.Contains(kw)));
                }

                var rows = await query
                    .OrderByDescending(d => d.TransactionDate)
                    .Select(d => new
                    {
                        d.DetailId,
                        YearMonth = d.TransactionDate.Year + "-" + d.TransactionDate.Month.ToString("D2"),
                        d.TransactionDate,
                        d.Category,
                        d.OrganizationName,
                        d.AccountName,
                        d.Description,
                        d.Amount,
                        d.Tag,
                        d.Notes,
                        d.IsExcluded
                    })
                    .ToListAsync();

                return Results.Ok(rows);
            });

            // 批次更新編輯過的明細
            app.MapPut("/api/finance/details/batch", async (List<DetailUpdateRequest> updates, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                int updated = 0;
                foreach (var u in updates)
                {
                    var record = await db.Details.FirstOrDefaultAsync(d => d.DetailId == u.DetailId && d.UserId == userId);
                    if (record == null) continue;

                    record.Category = u.Category ?? record.Category;
                    record.Description = u.Description;
                    record.Amount = u.Amount ?? record.Amount;
                    record.Tag = u.Tag;
                    record.Notes = u.Notes;
                    record.UpdatedAt = DateTime.Now;
                    updated++;
                }
                await db.SaveChangesAsync();

                return Results.Ok(new { message = $"已更新 {updated} 筆", updatedCount = updated });
            });

            // 切換排除狀態
            app.MapPost("/api/finance/details/{detailId:int}/toggle-exclude", async (int detailId, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                var record = await db.Details.FirstOrDefaultAsync(d => d.DetailId == detailId && d.UserId == userId);
                if (record == null)
                    return Results.Json(new { message = "找不到明細" }, statusCode: 404);

                record.IsExcluded = !record.IsExcluded;
                record.UpdatedAt = DateTime.Now;
                await db.SaveChangesAsync();

                return Results.Ok(new { message = record.IsExcluded ? "已排除" : "已取消排除", isExcluded = record.IsExcluded });
            });

            // 分類分析(收入/支出 x 月/年粒度)
            app.MapGet("/api/finance/category-analysis", async (
                string mode, string granularity, string? start, string? end,
                ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                var query = db.Details.Where(d => d.UserId == userId && d.Activate == "1" && !d.IsExcluded);
                query = mode == "income" ? query.Where(d => d.Amount >= 0) : query.Where(d => d.Amount < 0);

                var rows = await query
                    .Select(d => new { d.Category, d.Amount, d.TransactionDate })
                    .ToListAsync();

                var withPeriod = rows.Select(r => new
                {
                    Period = granularity == "year"
                        ? r.TransactionDate.Year.ToString()
                        : r.TransactionDate.Year + "-" + r.TransactionDate.Month.ToString("D2"),
                    Category = string.IsNullOrWhiteSpace(r.Category) ? "未分類" : r.Category,
                    Amount = Math.Abs(r.Amount)
                }).ToList();

                if (!string.IsNullOrWhiteSpace(start) && !string.IsNullOrWhiteSpace(end))
                {
                    var lo = string.CompareOrdinal(start, end) <= 0 ? start : end;
                    var hi = string.CompareOrdinal(start, end) <= 0 ? end : start;
                    withPeriod = withPeriod.Where(r => string.CompareOrdinal(r.Period, lo) >= 0 && string.CompareOrdinal(r.Period, hi) <= 0).ToList();
                }

                var grouped = withPeriod
                    .GroupBy(r => new { r.Period, r.Category })
                    .Select(g => new { g.Key.Period, g.Key.Category, Total = g.Sum(x => x.Amount) })
                    .ToList();

                return Results.Ok(grouped);
            });
        }

        private static int? GetUserId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(idStr, out int id) ? id : null;
        }
    }

    public record DetailUpdateRequest(int DetailId, string? Category, string? Description, decimal? Amount, string? Tag, string? Notes);
}
