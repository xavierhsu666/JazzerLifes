using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using JazzerLifeApi.Models;

namespace JazzerLifeApi.Endpoints
{
    public static class MacroIndicatorEndpoints
    {
        public static void MapMacroIndicatorEndpoints(this WebApplication app)
        {
            // 指標矩陣：清單 + 最新值 + 年增/年減 + 個別燈號
            app.MapGet("/api/macro/indicators", async (ClaimsPrincipal user, JazzerLifeContext db, string? country) =>
            {
                if (!IsLoggedIn(user))
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                try
                {
                    var query = db.EconIndicators.Where(i => i.IsActive);
                    if (!string.IsNullOrWhiteSpace(country))
                        query = query.Where(i => i.Country == country);

                    var indicators = await query.OrderBy(i => i.Country).ThenBy(i => i.Category).ToListAsync();

                    var result = new List<object>();
                    foreach (var indicator in indicators)
                    {
                        // 依資料頻率決定抓取筆數：日頻資料（如美債殖利率）60 筆只涵蓋 2~3 個月，
                        // 算年增率時永遠抓不到一年前的對照值，需拉更多筆數才能涵蓋滿一年以上。
                        var takeCount = indicator.Frequency switch
                        {
                            "Daily" => 400,   // 約涵蓋 1.5 年交易日
                            "Weekly" => 90,   // 約涵蓋 1.5 年
                            "Quarterly" => 24, // 約涵蓋 6 年
                            _ => 60,          // Monthly 預設，約涵蓋 5 年
                        };

                        var values = await db.EconIndicatorValues
                            .Where(v => v.IndicatorId == indicator.IndicatorId)
                            .OrderByDescending(v => v.PeriodDate)
                            .Take(takeCount)
                            .ToListAsync();

                        if (values.Count == 0)
                        {
                            result.Add(new
                            {
                                indicator.Code,
                                indicator.Name,
                                indicator.Country,
                                indicator.Category,
                                indicator.Unit,
                                LatestValue = (decimal?)null,
                                LatestPeriodDate = (DateOnly?)null,
                                YoyChangePercent = (double?)null,
                                SignalColor = "gray",
                                SignalLabel = "尚無資料",
                            });
                            continue;
                        }

                        var latest = values[0];
                        var yearAgoTarget = latest.PeriodDate.AddYears(-1);
                        var yearAgoValue = values
                            .Where(v => v.PeriodDate <= yearAgoTarget.AddMonths(1) && v.PeriodDate >= yearAgoTarget.AddMonths(-1))
                            .OrderBy(v => Math.Abs((v.PeriodDate.ToDateTime(TimeOnly.MinValue) - yearAgoTarget.ToDateTime(TimeOnly.MinValue)).TotalDays))
                            .FirstOrDefault();

                        double? yoyChange = null;
                        if (yearAgoValue != null && yearAgoValue.Value != 0)
                            yoyChange = (double)((latest.Value - yearAgoValue.Value) / yearAgoValue.Value * 100m);

                        var percentile = MacroSignalHelper.CalculatePercentile(
                            values.Select(v => v.Value).ToList(), latest.Value);
                        var signal = MacroSignalHelper.GetSignal(percentile ?? 50);

                        result.Add(new
                        {
                            indicator.Code,
                            indicator.Name,
                            indicator.Country,
                            indicator.Category,
                            indicator.Unit,
                            LatestValue = latest.Value,
                            LatestPeriodDate = latest.PeriodDate,
                            YoyChangePercent = yoyChange,
                            SignalColor = percentile.HasValue ? signal.Color : "gray",
                            SignalLabel = percentile.HasValue ? signal.Label : "資料不足",
                        });
                    }

                    return Results.Ok(result);
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "查詢指標清單失敗", detail = ex.Message }, statusCode: 500);
                }
            });

            // 單一指標歷史走勢
            app.MapGet("/api/macro/indicators/{code}/series", async (ClaimsPrincipal user, JazzerLifeContext db, string code, int? months) =>
            {
                if (!IsLoggedIn(user))
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                if (string.IsNullOrWhiteSpace(code))
                    return Results.BadRequest(new { message = "指標代碼不可為空" });

                try
                {
                    var indicator = await db.EconIndicators.FirstOrDefaultAsync(i => i.Code == code);
                    if (indicator == null)
                        return Results.NotFound(new { message = "找不到指定指標" });

                    var take = (months.HasValue && months.Value > 0 && months.Value <= 240) ? months.Value : 60;

                    var points = await db.EconIndicatorValues
                        .Where(v => v.IndicatorId == indicator.IndicatorId)
                        .OrderByDescending(v => v.PeriodDate)
                        .Take(take)
                        .OrderBy(v => v.PeriodDate)
                        .Select(v => new { v.PeriodDate, v.Value })
                        .ToListAsync();

                    return Results.Ok(new
                    {
                        indicator.Code,
                        indicator.Name,
                        indicator.Unit,
                        indicator.Country,
                        indicator.Category,
                        Points = points,
                    });
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "查詢指標時序失敗", detail = ex.Message }, statusCode: 500);
                }
            });
        }

        private static bool IsLoggedIn(ClaimsPrincipal user) => user.Identity?.IsAuthenticated == true;
    }
}
