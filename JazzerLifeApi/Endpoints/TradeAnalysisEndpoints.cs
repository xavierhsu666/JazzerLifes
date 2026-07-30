using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using JazzerLifeApi.Models;

namespace JazzerLifeApi.Endpoints
{
    // 覆盤分析：績效指標、依商品分類統計、資金曲線、依策略標籤統計。
    // 統計基準一律只採計「已平倉」交易（ExitTime 有值），未平倉部位不列入績效計算
    public static class TradeAnalysisEndpoints
    {
        public static void MapTradeAnalysisEndpoints(this WebApplication app)
        {
            // 整體績效指標：勝率、獲利因子、平均賺賠比、總損益、平均持倉時間等
            app.MapGet("/api/trading/analysis/summary", async (DateTime? dateFrom, DateTime? dateTo, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                try
                {
                    var trades = await GetClosedTrades(db, userId.Value, dateFrom, dateTo).ToListAsync();

                    if (trades.Count == 0)
                    {
                        return Results.Ok(new
                        {
                            TotalTrades = 0,
                            WinCount = 0,
                            LossCount = 0,
                            WinRate = (decimal?)null,
                            TotalProfit = 0m,
                            ProfitFactor = (decimal?)null,
                            AverageWin = (decimal?)null,
                            AverageLoss = (decimal?)null,
                            AverageWinLossRatio = (decimal?)null,
                            AverageHoldingMinutes = (double?)null,
                            NeedsReviewCount = 0,
                        });
                    }

                    var wins = trades.Where(t => t.Profit > 0).ToList();
                    var losses = trades.Where(t => t.Profit < 0).ToList();
                    var totalWin = wins.Sum(t => t.Profit);
                    var totalLossAbs = Math.Abs(losses.Sum(t => t.Profit));
                    // cTrader Records 匯入的交易可能還沒比對到進場時間（EntryTime 為 NULL），
                    // 平均持倉時間只能用「進場時間也有值」的交易計算，避免整體漏算或丟例外
                    var tradesWithEntryTime = trades.Where(t => t.EntryTime != null).ToList();

                    return Results.Ok(new
                    {
                        TotalTrades = trades.Count,
                        WinCount = wins.Count,
                        LossCount = losses.Count,
                        WinRate = Math.Round((decimal)wins.Count / trades.Count * 100, 2),
                        TotalProfit = trades.Sum(t => t.Profit),
                        // 獲利因子 = 總獲利 / 總虧損絕對值；沒有任何虧損時無法計算比值，回傳 null 讓前端顯示「∞」或「-」
                        ProfitFactor = totalLossAbs > 0 ? Math.Round(totalWin / totalLossAbs, 2) : (decimal?)null,
                        AverageWin = wins.Count > 0 ? Math.Round(totalWin / wins.Count, 2) : (decimal?)null,
                        AverageLoss = losses.Count > 0 ? Math.Round(totalLossAbs / losses.Count, 2) : (decimal?)null,
                        AverageWinLossRatio = (wins.Count > 0 && losses.Count > 0 && totalLossAbs > 0)
                            ? Math.Round((totalWin / wins.Count) / (totalLossAbs / losses.Count), 2)
                            : (decimal?)null,
                        AverageHoldingMinutes = tradesWithEntryTime.Count > 0
                            ? tradesWithEntryTime.Average(t => (t.ExitTime!.Value - t.EntryTime!.Value).TotalMinutes)
                            : (double?)null,
                        NeedsReviewCount = trades.Count(t => t.NeedsReview),
                    });
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "查詢績效指標失敗", detail = ex.Message }, statusCode: 500);
                }
            });

            // 依商品分類統計：每個商品的交易筆數/總損益/勝率，供覆盤時看「哪個商品賺、哪個商品賠」
            app.MapGet("/api/trading/analysis/by-symbol", async (DateTime? dateFrom, DateTime? dateTo, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                try
                {
                    var trades = await GetClosedTrades(db, userId.Value, dateFrom, dateTo).ToListAsync();

                    var result = trades
                        .GroupBy(t => t.Symbol)
                        .Select(g => new
                        {
                            Symbol = g.Key,
                            TradeCount = g.Count(),
                            TotalProfit = g.Sum(t => t.Profit),
                            WinRate = Math.Round((decimal)g.Count(t => t.Profit > 0) / g.Count() * 100, 2),
                        })
                        .OrderByDescending(r => r.TotalProfit)
                        .ToList();

                    return Results.Ok(result);
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "查詢商品分類統計失敗", detail = ex.Message }, statusCode: 500);
                }
            });

            // 資金曲線：依平倉時間排序的累積損益序列
            app.MapGet("/api/trading/analysis/equity-curve", async (DateTime? dateFrom, DateTime? dateTo, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                try
                {
                    var trades = await GetClosedTrades(db, userId.Value, dateFrom, dateTo)
                        .OrderBy(t => t.ExitTime)
                        .Select(t => new { t.ExitTime, t.Profit })
                        .ToListAsync();

                    decimal cumulative = 0;
                    var points = trades.Select(t =>
                    {
                        cumulative += t.Profit;
                        return new { ExitTime = t.ExitTime, Profit = t.Profit, CumulativeProfit = cumulative };
                    }).ToList();

                    return Results.Ok(points);
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "查詢資金曲線失敗", detail = ex.Message }, statusCode: 500);
                }
            });

            // 依策略標籤統計：沒有標記標籤的交易歸類為「未標記」，方便比較不同策略的實際績效
            app.MapGet("/api/trading/analysis/by-tag", async (DateTime? dateFrom, DateTime? dateTo, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                try
                {
                    var trades = await GetClosedTrades(db, userId.Value, dateFrom, dateTo)
                        .Select(t => new { t.StrategyTagId, TagName = t.StrategyTag != null ? t.StrategyTag.Name : null, t.Profit })
                        .ToListAsync();

                    var result = trades
                        .GroupBy(t => new { t.StrategyTagId, t.TagName })
                        .Select(g => new
                        {
                            StrategyTagId = g.Key.StrategyTagId,
                            StrategyTagName = g.Key.TagName ?? "未標記",
                            TradeCount = g.Count(),
                            TotalProfit = g.Sum(t => t.Profit),
                            WinRate = Math.Round((decimal)g.Count(t => t.Profit > 0) / g.Count() * 100, 2),
                        })
                        .OrderByDescending(r => r.TotalProfit)
                        .ToList();

                    return Results.Ok(result);
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "查詢策略標籤統計失敗", detail = ex.Message }, statusCode: 500);
                }
            });

            // 依出場方式統計：停損/停利/手動(市價)/未知，比較各自的損益分布與勝率，
            // ExitReason 由 TradeImportEndpoints.cs 的 TradingView 訂單比對回填，尚未比對出來的歸類為「未知」
            app.MapGet("/api/trading/analysis/by-exit-reason", async (DateTime? dateFrom, DateTime? dateTo, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                try
                {
                    var trades = await GetClosedTrades(db, userId.Value, dateFrom, dateTo)
                        .Select(t => new { t.ExitReason, t.Profit })
                        .ToListAsync();

                    var result = trades
                        .GroupBy(t => t.ExitReason)
                        .Select(g => new
                        {
                            ExitReason = g.Key,
                            ExitReasonLabel = ExitReasonLabel(g.Key),
                            TradeCount = g.Count(),
                            TotalProfit = g.Sum(t => t.Profit),
                            WinRate = Math.Round((decimal)g.Count(t => t.Profit > 0) / g.Count() * 100, 2),
                        })
                        .OrderByDescending(r => r.TotalProfit)
                        .ToList();

                    return Results.Ok(result);
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "查詢出場方式統計失敗", detail = ex.Message }, statusCode: 500);
                }
            });

            // 隱含成本分析：用進出場價格+方向反推毛損益，跟實際淨損益比較，看手續費/庫存費等成本吃掉多少獲利；
            // 同時回傳平均滑價（只統計 ExitReason 為停損/停利、有計算出 ExitSlippage 的交易）
            app.MapGet("/api/trading/analysis/cost-summary", async (DateTime? dateFrom, DateTime? dateTo, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                try
                {
                    var trades = await GetClosedTrades(db, userId.Value, dateFrom, dateTo)
                        .Select(t => new { t.Symbol, t.Direction, t.Volume, t.EntryPrice, t.ExitPrice, t.Profit, t.ExitSlippage })
                        .ToListAsync();

                    var withPrice = trades
                        .Select(t => new
                        {
                            t.Profit,
                            GrossProfit = TradeCostCalculator.ComputeGrossProfit(t.Symbol, t.Direction, t.Volume, t.EntryPrice, t.ExitPrice)
                        })
                        .Where(t => t.GrossProfit != null)
                        .ToList();

                    var slippageSamples = trades.Where(t => t.ExitSlippage != null).ToList();

                    var totalGross = withPrice.Sum(t => t.GrossProfit!.Value);
                    var totalNet = withPrice.Sum(t => t.Profit);

                    return Results.Ok(new
                    {
                        TradesWithPriceCount = withPrice.Count,
                        TotalGrossProfit = withPrice.Count > 0 ? totalGross : (decimal?)null,
                        TotalNetProfit = withPrice.Count > 0 ? totalNet : (decimal?)null,
                        TotalImpliedCost = withPrice.Count > 0 ? totalGross - totalNet : (decimal?)null,
                        AverageSlippage = slippageSamples.Count > 0 ? Math.Round(slippageSamples.Average(t => t.ExitSlippage!.Value), 4) : (decimal?)null,
                        SlippageSampleCount = slippageSamples.Count,
                        MultiplierNote = "毛損益的商品乘數目前只用 BTCUSD 驗證過為 1，其餘商品預設也是 1，可能不準確，僅供參考",
                    });
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "查詢隱含成本分析失敗", detail = ex.Message }, statusCode: 500);
                }
            });
        }

        private static string ExitReasonLabel(string? exitReason) => exitReason switch
        {
            "StopLoss" => "停損",
            "TakeProfit" => "停利",
            "Market" => "手動/市價",
            _ => "未知",
        };

        private static IQueryable<Trade> GetClosedTrades(JazzerLifeContext db, int userId, DateTime? dateFrom, DateTime? dateTo)
        {
            var query = db.Trades.Where(t => t.UserId == userId && t.ExitTime != null);
            // EntryTime 可能是 NULL（cTrader Records 匯入格式沒有進場時間），日期篩選退回用 ExitTime 當備援基準
            if (dateFrom.HasValue) query = query.Where(t => (t.EntryTime ?? t.ExitTime) >= dateFrom);
            if (dateTo.HasValue) query = query.Where(t => (t.EntryTime ?? t.ExitTime) <= dateTo);
            return query;
        }

        private static int? GetUserId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(idStr, out int id) ? id : null;
        }
    }
}
