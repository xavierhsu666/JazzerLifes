using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using JazzerLifeApi.Models;

namespace JazzerLifeApi.Endpoints
{
    // 交易明細查詢/手動新增/編輯（含標籤、心得）/刪除。
    // 匯入功能（cTrader/TradingView）獨立在 TradeImportEndpoints.cs
    public static class TradeEndpoints
    {
        public static void MapTradeEndpoints(this WebApplication app)
        {
            // 查詢交易明細，支援商品/來源/策略標籤/日期區間/僅顯示待確認 等篩選
            app.MapGet("/api/trading/trades", async (
                string? symbol, string? source, int? strategyTagId,
                DateTime? dateFrom, DateTime? dateTo, bool? needsReviewOnly,
                ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                try
                {
                    var query = db.Trades.Where(t => t.UserId == userId);

                    if (!string.IsNullOrWhiteSpace(symbol))
                        query = query.Where(t => t.Symbol == symbol);
                    if (!string.IsNullOrWhiteSpace(source))
                        query = query.Where(t => t.Source == source);
                    if (strategyTagId.HasValue)
                        query = query.Where(t => t.StrategyTagId == strategyTagId);
                    // EntryTime 可能是 NULL（cTrader Records 匯入格式沒有進場時間），
                    // 日期篩選與排序都退回用 ExitTime 當備援基準，避免這些交易直接從列表消失
                    if (dateFrom.HasValue)
                        query = query.Where(t => (t.EntryTime ?? t.ExitTime) >= dateFrom);
                    if (dateTo.HasValue)
                        query = query.Where(t => (t.EntryTime ?? t.ExitTime) <= dateTo);
                    if (needsReviewOnly == true)
                        query = query.Where(t => t.NeedsReview);

                    // 先把符合條件的實體撈出來（含 StrategyTag 導覽屬性），毛損益/隱含成本要查商品乘數對照表，
                    // 這段邏輯無法翻譯成 SQL，改在記憶體中計算；個人交易日誌資料量小，效能無虞
                    var tradeEntities = await query
                        .Include(t => t.StrategyTag)
                        .OrderByDescending(t => t.EntryTime ?? t.ExitTime)
                        .ToListAsync();

                    var trades = tradeEntities.Select(t => new
                    {
                        t.TradeId,
                        t.Symbol,
                        t.Direction,
                        t.Volume,
                        t.EntryTime,
                        t.ExitTime,
                        t.EntryPrice,
                        t.ExitPrice,
                        t.Profit,
                        t.Source,
                        t.BrokerPositionId,
                        t.StrategyTagId,
                        StrategyTagName = t.StrategyTag?.Name,
                        t.Note,
                        t.ExitReason,
                        t.ExitSlippage,
                        t.NeedsReview,
                        // 持倉分鐘數：進場/平倉時間都要有值才能算，缺任一個都回傳 null（前端顯示「-」）
                        HoldingMinutes = (t.EntryTime != null && t.ExitTime != null)
                            ? (int?)(t.ExitTime.Value - t.EntryTime.Value).TotalMinutes
                            : null,
                        // 毛損益/隱含成本：見 TradeCostCalculator 註解，僅供參考，商品乘數只驗證過 BTCUSD
                        GrossProfit = TradeCostCalculator.ComputeGrossProfit(t.Symbol, t.Direction, t.Volume, t.EntryPrice, t.ExitPrice),
                        ImpliedCost = TradeCostCalculator.ComputeGrossProfit(t.Symbol, t.Direction, t.Volume, t.EntryPrice, t.ExitPrice) is decimal gross
                            ? gross - t.Profit
                            : (decimal?)null,
                    }).ToList();

                    return Results.Ok(trades);
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "查詢交易明細失敗", detail = ex.Message }, statusCode: 500);
                }
            });

            // 手動新增一筆交易（Source 固定為 Manual，不會跟匯入資料的防重複邏輯衝突）
            app.MapPost("/api/trading/trades", async (TradeManualCreateRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                // 手動新增一定要求填進場時間，不像匯入資料可能因報表格式限制而缺值
                var validationError = ValidateManualTrade(req.Symbol, req.Direction, req.Volume, req.EntryTime, req.ExitTime, requireEntryTime: true);
                if (validationError != null) return Results.BadRequest(new { message = validationError });
                if (!IsValidExitReason(req.ExitReason)) return Results.BadRequest(new { message = "出場方式僅能為 StopLoss/TakeProfit/Market 或留空" });

                try
                {
                    if (req.StrategyTagId.HasValue)
                    {
                        var tagExists = await db.StrategyTags.AnyAsync(t => t.StrategyTagId == req.StrategyTagId && t.UserId == userId);
                        if (!tagExists) return Results.BadRequest(new { message = "策略標籤不存在" });
                    }

                    var trade = new Trade
                    {
                        UserId = userId.Value,
                        Symbol = req.Symbol.Trim().ToUpperInvariant(),
                        Direction = req.Direction,
                        Volume = req.Volume,
                        EntryTime = req.EntryTime,
                        ExitTime = req.ExitTime,
                        EntryPrice = req.EntryPrice,
                        ExitPrice = req.ExitPrice,
                        Profit = req.Profit,
                        Source = "Manual",
                        BrokerPositionId = null,
                        StrategyTagId = req.StrategyTagId,
                        Note = string.IsNullOrWhiteSpace(req.Note) ? null : req.Note.Trim(),
                        ExitReason = req.ExitReason,
                        // 手動輸入沒有訂單資料可算滑價，一律留空
                        ExitSlippage = null,
                        NeedsReview = false,
                        CreatedAt = DateTime.Now,
                        UpdatedAt = DateTime.Now,
                    };
                    db.Trades.Add(trade);
                    await db.SaveChangesAsync();

                    return Results.Ok(new { message = "已新增交易", tradeId = trade.TradeId });
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "新增交易失敗", detail = ex.Message }, statusCode: 500);
                }
            });

            // 更新交易（標籤/心得為主要用途，也開放編輯其他欄位以便手動修正匯入資料的誤差）
            app.MapPut("/api/trading/trades/{id:int}", async (int id, TradeUpdateRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                // 編輯時允許 EntryTime 留空：cTrader Records 匯入的交易可能還沒比對到進場時間，
                // 使用者可能只是想先補標籤/心得，不該強迫她/他先編出一個不確定的進場時間才能存檔
                var validationError = ValidateManualTrade(req.Symbol, req.Direction, req.Volume, req.EntryTime, req.ExitTime, requireEntryTime: false);
                if (validationError != null) return Results.BadRequest(new { message = validationError });
                if (!IsValidExitReason(req.ExitReason)) return Results.BadRequest(new { message = "出場方式僅能為 StopLoss/TakeProfit/Market 或留空" });

                try
                {
                    var trade = await db.Trades.FirstOrDefaultAsync(t => t.TradeId == id && t.UserId == userId);
                    if (trade == null) return Results.NotFound(new { message = "找不到該筆交易" });

                    if (req.StrategyTagId.HasValue)
                    {
                        var tagExists = await db.StrategyTags.AnyAsync(t => t.StrategyTagId == req.StrategyTagId && t.UserId == userId);
                        if (!tagExists) return Results.BadRequest(new { message = "策略標籤不存在" });
                    }

                    trade.Symbol = req.Symbol.Trim().ToUpperInvariant();
                    trade.Direction = req.Direction;
                    trade.Volume = req.Volume;
                    trade.EntryTime = req.EntryTime;
                    trade.ExitTime = req.ExitTime;
                    trade.EntryPrice = req.EntryPrice;
                    trade.ExitPrice = req.ExitPrice;
                    trade.Profit = req.Profit;
                    trade.StrategyTagId = req.StrategyTagId;
                    trade.Note = string.IsNullOrWhiteSpace(req.Note) ? null : req.Note.Trim();
                    // 出場方式開放手動修正（例如比對錯誤，或這筆本來就是手動輸入沒有訂單資料可比對）；
                    // ExitSlippage 是純粹由訂單資料算出來的衍生值，這裡不提供編輯欄位，維持原值不動
                    trade.ExitReason = req.ExitReason;
                    // 使用者手動確認過的交易，清掉「需人工檢查」標記
                    trade.NeedsReview = req.NeedsReview;
                    trade.UpdatedAt = DateTime.Now;
                    await db.SaveChangesAsync();

                    return Results.Ok(new { message = "已更新交易" });
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "更新交易失敗", detail = ex.Message }, statusCode: 500);
                }
            });

            // 刪除交易
            app.MapDelete("/api/trading/trades/{id:int}", async (int id, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                try
                {
                    var trade = await db.Trades.FirstOrDefaultAsync(t => t.TradeId == id && t.UserId == userId);
                    if (trade == null) return Results.NotFound(new { message = "找不到該筆交易" });

                    db.Trades.Remove(trade);
                    await db.SaveChangesAsync();

                    return Results.Ok(new { message = "已刪除交易" });
                }
                catch (Exception ex)
                {
                    return Results.Json(new { message = "刪除交易失敗", detail = ex.Message }, statusCode: 500);
                }
            });
        }

        private static string? ValidateManualTrade(string? symbol, string? direction, decimal volume, DateTime? entryTime, DateTime? exitTime, bool requireEntryTime)
        {
            if (string.IsNullOrWhiteSpace(symbol)) return "請輸入商品代碼";
            if (direction != "Buy" && direction != "Sell") return "方向僅能為 Buy 或 Sell";
            if (volume <= 0) return "數量必須大於 0";
            if (requireEntryTime && entryTime == null) return "請輸入進場時間";
            if (entryTime.HasValue && exitTime.HasValue && exitTime < entryTime) return "出場時間不可早於進場時間";
            return null;
        }

        private static bool IsValidExitReason(string? exitReason) =>
            exitReason == null || exitReason is "StopLoss" or "TakeProfit" or "Market";

        private static int? GetUserId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(idStr, out int id) ? id : null;
        }
    }

    public record TradeManualCreateRequest(
        string Symbol, string Direction, decimal Volume,
        DateTime EntryTime, DateTime? ExitTime,
        decimal? EntryPrice, decimal? ExitPrice, decimal Profit,
        int? StrategyTagId, string? Note, string? ExitReason);

    // EntryTime 允許 NULL：編輯 cTrader Records 匯入但尚未比對到進場時間的交易時，
    // 不強迫使用者先填一個不確定的進場時間才能存檔（例如只是想補標籤/心得）
    public record TradeUpdateRequest(
        string Symbol, string Direction, decimal Volume,
        DateTime? EntryTime, DateTime? ExitTime,
        decimal? EntryPrice, decimal? ExitPrice, decimal Profit,
        int? StrategyTagId, string? Note, bool NeedsReview, string? ExitReason);

    /// <summary>
    /// 用進出場價格反推「毛損益」（不含手續費/庫存費等成本的價差損益），跟實際淨損益比較可以看出隱含成本。
    /// 目前只有 BTCUSD 用實際成交資料驗證過乘數為 1（價差 x 數量完全等於淨損益，代表這筆交易手續費
    /// 幾乎是 0）。其餘商品尚未驗證，先預設也是 1，可能不準確，之後有更多商品的完整進出場價資料再擴充。
    /// TradeEndpoints.cs 與 TradeAnalysisEndpoints.cs 共用，故獨立成 internal 類別
    /// </summary>
    internal static class TradeCostCalculator
    {
        private static readonly Dictionary<string, decimal> ContractMultipliers = new(StringComparer.OrdinalIgnoreCase)
        {
            ["BTCUSD"] = 1m,
        };

        public static decimal GetMultiplier(string symbol) =>
            ContractMultipliers.TryGetValue(symbol, out var m) ? m : 1m;

        public static decimal? ComputeGrossProfit(string symbol, string direction, decimal volume, decimal? entryPrice, decimal? exitPrice)
        {
            if (!entryPrice.HasValue || !exitPrice.HasValue) return null;
            var multiplier = GetMultiplier(symbol);
            var priceDiff = direction == "Buy" ? (exitPrice.Value - entryPrice.Value) : (entryPrice.Value - exitPrice.Value);
            return priceDiff * volume * multiplier;
        }
    }
}
