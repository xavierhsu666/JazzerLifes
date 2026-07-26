using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using JazzerLifeApi.Models;

namespace JazzerLifeApi.Endpoints
{
    public static class MacroCompositeEndpoints
    {
        public static void MapMacroCompositeEndpoints(this WebApplication app)
        {
            // 綜合溫度計分數：該國所有啟用指標的百分位平均，換算為 0-100 分與燈號
            app.MapGet("/api/macro/composite-score", async (ClaimsPrincipal user, JazzerLifeContext db, string? country) =>
            {
                if (user.Identity?.IsAuthenticated != true)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                if (string.IsNullOrWhiteSpace(country))
                    return Results.BadRequest(new { message = "country 為必填參數（TW 或 US）" });

                try
                {
                    // 「市場」分類（股市/黃金/加密貨幣等資產價格）走勢反映市場情緒而非總體經濟基本面，
                    // 若併入景氣溫度計綜合分數會失去代表性，故計算時排除，僅在指標矩陣/走勢圖顯示。
                    var indicators = await db.EconIndicators
                        .Where(i => i.IsActive && i.Country == country && i.Category != "市場")
                        .ToListAsync();

                    if (indicators.Count == 0)
                        return Results.Ok(new { Country = country, Score = (double?)null, SignalColor = "gray", SignalLabel = "尚無指標", AsOfPeriod = (DateOnly?)null, Breakdown = Array.Empty<object>() });

                    var breakdown = new List<object>();
                    var percentiles = new List<double>();
                    DateOnly? maxPeriod = null;

                    foreach (var indicator in indicators)
                    {
                        var values = await db.EconIndicatorValues
                            .Where(v => v.IndicatorId == indicator.IndicatorId)
                            .OrderByDescending(v => v.PeriodDate)
                            .Take(60)
                            .ToListAsync();

                        if (values.Count == 0)
                        {
                            breakdown.Add(new { indicator.Code, indicator.Name, Percentile = (double?)null, SignalColor = "gray" });
                            continue;
                        }

                        var latest = values[0];
                        if (maxPeriod == null || latest.PeriodDate > maxPeriod)
                            maxPeriod = latest.PeriodDate;

                        var percentile = MacroSignalHelper.CalculatePercentile(values.Select(v => v.Value).ToList(), latest.Value);
                        var signal = MacroSignalHelper.GetSignal(percentile ?? 50);

                        breakdown.Add(new
                        {
                            indicator.Code,
                            indicator.Name,
                            Percentile = percentile,
                            SignalColor = percentile.HasValue ? signal.Color : "gray",
                        });

                        if (percentile.HasValue)
                            percentiles.Add(percentile.Value);
                    }

                    double? score = percentiles.Count > 0 ? percentiles.Average() : null;
                    var overallSignal = MacroSignalHelper.GetSignal(score ?? 50);

                    return Results.Ok(new
                    {
                        Country = country,
                        Score = score.HasValue ? Math.Round(score.Value, 1) : (double?)null,
                        SignalColor = score.HasValue ? overallSignal.Color : "gray",
                        SignalLabel = score.HasValue ? overallSignal.Label : "資料不足",
                        AsOfPeriod = maxPeriod,
                        Breakdown = breakdown,
                    });
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "計算綜合分數失敗", detail = ex.Message }, statusCode: 500);
                }
            });
        }
    }
}
