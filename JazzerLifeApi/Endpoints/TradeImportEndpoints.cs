using Microsoft.EntityFrameworkCore;
using ClosedXML.Excel;
using CsvHelper;
using CsvHelper.Configuration;
using System.Globalization;
using System.Security.Claims;
using JazzerLifeApi.Models;

namespace JazzerLifeApi.Endpoints
{
    // 交易資料匯入：
    // 1) cTrader Records（.xlsx）：主要匯入來源，一列就是一筆完整的已平倉交易，含進出場價格與損益，
    //    但沒有 Position 編號、也沒有進場時間
    //    （原本還有一個 cTrader Position History List 匯入，因為資料品質較差、且已被 Records 取代，
    //    2026-07-30 應使用者要求移除；先前用該格式匯入的 Source='ICMarkets' 舊資料仍保留在資料庫，
    //    只是不再開放新的匯入入口）
    // 2) TradingView 訂單匯出（.csv，「歷史訂單-全部」或「訂單-全部」皆可）：次要的補值來源，
    //    不會新增交易，只用「商品＋方向＋數量＋時間相近」去比對已匯入的交易，補進場時間/進出場價格，
    //    並依訂單「種類」（市場/停損/停利）判斷出場方式、計算滑價
    //
    // 時區注意：cTrader Records 的時間欄位是 UTC，但 TradingView 訂單匯出的「更新時間」是帳戶
    // 顯示時區（實測台灣帳戶為 UTC+8：同一筆訂單換算後分秒完全對得上）。TradingView 比對邏輯
    // （FindMatch/FindOpeningOrderBeforeExit）沒有另外做時區換算、直接拿字面時間比對，所以 cTrader
    // 匯入時就要先用 timezoneOffsetHours 把 UTC 轉成同一時區，否則兩份資料的時間軸對不起來，
    // 比對永遠找不到任何一筆（這正是「上傳的檔案應該對得上，匯入後卻比對不到」的根本原因）
    public static class TradeImportEndpoints
    {
        private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10MB，比照 FinanceUploadEndpoints 慣例

        public static void MapTradeImportEndpoints(this WebApplication app)
        {
            // cTrader「Records」匯出（.xlsx，工作表名稱固定為 "Records"）：一列就是一筆完整的已平倉交易，
            // 直接含建倉價/平倉價格/淨值，但沒有 Position 編號、也沒有進場時間（只有平倉時間），
            // 因此用 Source='ICMarketsRecords' 標記，防重複改用天然鍵（見下方 existingKeys）
            // timezoneOffsetHours：這份報表的「平仓时间」是 UTC（實測跟 TradingView 訂單時間換算後
            // 分秒完全對得上，差正好 8 小時），需要換算成帳戶顯示時區，否則等一下用 TradingView 訂單
            // 回填進場時間時，時間軸對不起來會完全比對不到（見檔頭註解）
            app.MapPost("/api/trading/import/ctrader-records", async (HttpRequest request, int? timezoneOffsetHours, ClaimsPrincipal user, JazzerLifeContext db, ILogger<Program> logger) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                if (!request.HasFormContentType)
                    return Results.BadRequest(new { message = "請使用表單格式上傳" });

                var form = await request.ReadFormAsync();
                var file = form.Files.GetFile("file");
                if (file == null || file.Length == 0)
                    return Results.BadRequest(new { message = "請選擇檔案" });
                if (file.Length > MaxFileSizeBytes)
                    return Results.BadRequest(new { message = $"檔案超過大小限制（{MaxFileSizeBytes / 1024 / 1024}MB）" });

                var tzOffset = timezoneOffsetHours ?? 8;

                try
                {
                    using var stream = file.OpenReadStream();
                    using var workbook = new XLWorkbook(stream);

                    // 找出標頭列（第一欄內容為 "交易品种"），不假設固定在哪一個工作表/列，比較不怕報表版型微調
                    IXLRow? headerRow = null;
                    foreach (var ws in workbook.Worksheets)
                    {
                        headerRow = ws.RowsUsed().FirstOrDefault(r => r.Cell(1).GetString().Trim() == "交易品种");
                        if (headerRow != null) break;
                    }
                    if (headerRow == null)
                        return Results.BadRequest(new { message = "找不到標頭列，請確認是否為 cTrader Records 匯出檔" });

                    var sheet = headerRow.Worksheet;
                    var headers = headerRow.CellsUsed().Select(c => c.GetString().Trim()).ToList();
                    int ColIndex(string name) => headers.IndexOf(name) + 1;

                    int colSymbol = ColIndex("交易品种");
                    int colDirection = ColIndex("开仓方向");
                    int colExitTime = ColIndex("平仓时间");
                    int colEntryPrice = ColIndex("建仓价");
                    int colExitPrice = ColIndex("平仓价格");
                    int colVolume = ColIndex("平仓量");
                    int colVolumeAlt = ColIndex("平仓交易量"); // 樣本中兩欄數值相同，"平仓量" 缺值時退回用這欄
                    int colProfit = ColIndex("净值($)");

                    if (colSymbol == 0 || colDirection == 0 || colExitTime == 0 || colEntryPrice == 0 || colExitPrice == 0 || colProfit == 0)
                        return Results.BadRequest(new { message = "報表欄位不完整，缺少必要欄位（交易品种/开仓方向/平仓时间/建仓价/平仓价格/净值($)）" });

                    var rows = new List<CTraderRecordRow>();
                    foreach (var row in sheet.RowsUsed().Skip(headerRow.RowNumber()))
                    {
                        var symbolCell = row.Cell(colSymbol).GetString().Trim();
                        if (string.IsNullOrWhiteSpace(symbolCell)) continue;

                        var directionRaw = row.Cell(colDirection).GetString().Trim();
                        var direction = directionRaw == "买入" ? "Buy" : directionRaw == "卖出" ? "Sell" : null;
                        if (direction == null) continue; // 無法辨識的開倉方向，跳過避免寫入錯誤資料

                        if (!TryParseCTraderRecordsDateTime(row.Cell(colExitTime).GetString(), out var exitTime))
                            continue;

                        var volume = row.Cell(colVolume).GetValue<decimal?>()
                            ?? (colVolumeAlt > 0 ? row.Cell(colVolumeAlt).GetValue<decimal?>() : null)
                            ?? 0m;

                        rows.Add(new CTraderRecordRow
                        {
                            Symbol = symbolCell,
                            Direction = direction,
                            ExitTime = exitTime.AddHours(tzOffset), // UTC -> 帳戶顯示時區，跟 TradingView 訂單時間對齊
                            EntryPrice = row.Cell(colEntryPrice).GetValue<decimal?>() ?? 0m,
                            ExitPrice = row.Cell(colExitPrice).GetValue<decimal?>() ?? 0m,
                            Volume = volume,
                            Profit = row.Cell(colProfit).GetValue<decimal?>() ?? 0m,
                        });
                    }

                    if (rows.Count == 0)
                        return Results.BadRequest(new { message = "檔案中沒有可解析的交易列" });

                    // 這個格式沒有 Position 編號，防重複改用「商品+平倉時間+數量+損益」天然鍵比對既有紀錄
                    var existing = await db.Trades
                        .Where(t => t.UserId == userId && t.Source == "ICMarketsRecords")
                        .Select(t => new { t.Symbol, t.ExitTime, t.Volume, t.Profit })
                        .ToListAsync();
                    var existingKeys = existing
                        .Select(e => (e.Symbol, e.ExitTime, e.Volume, e.Profit))
                        .ToHashSet();

                    int inserted = 0, skippedDuplicate = 0;
                    var newTrades = new List<Trade>();

                    foreach (var r in rows)
                    {
                        var key = (r.Symbol, (DateTime?)r.ExitTime, r.Volume, r.Profit);
                        if (existingKeys.Contains(key))
                        {
                            skippedDuplicate++;
                            continue;
                        }

                        newTrades.Add(new Trade
                        {
                            UserId = userId.Value,
                            Symbol = r.Symbol,
                            Direction = r.Direction,
                            Volume = r.Volume,
                            EntryTime = null, // 這份報表沒有進場時間，需搭配 TradingView 訂單資料比對回填
                            ExitTime = r.ExitTime,
                            EntryPrice = r.EntryPrice,
                            ExitPrice = r.ExitPrice,
                            Profit = r.Profit,
                            Source = "ICMarketsRecords",
                            BrokerPositionId = null,
                            StrategyTagId = null,
                            Note = null,
                            NeedsReview = false,
                            CreatedAt = DateTime.Now,
                            UpdatedAt = DateTime.Now,
                        });
                        inserted++;
                    }

                    db.Trades.AddRange(newTrades);
                    await db.SaveChangesAsync();

                    return Results.Ok(new
                    {
                        message = $"已匯入 {inserted} 筆交易（略過重複 {skippedDuplicate} 筆）。此格式沒有進場時間，可再上傳 TradingView 訂單匯出來補齊",
                        inserted,
                        skippedDuplicate
                    });
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "cTrader Records import failed (userId={UserId})", userId);
                    return Results.Json(new { message = "解析 cTrader Records 檔案失敗，請確認檔案格式是否正確", detail = ex.Message }, statusCode: 500);
                }
            });

            // TradingView 訂單匯出（CSV）：只補價格，不新增交易。tolerance 為比對時間容許誤差（分鐘），預設 10 分鐘
            app.MapPost("/api/trading/import/tradingview-orders", async (HttpRequest request, int? toleranceMinutes, ClaimsPrincipal user, JazzerLifeContext db, ILogger<Program> logger) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                if (!request.HasFormContentType)
                    return Results.BadRequest(new { message = "請使用表單格式上傳" });

                var form = await request.ReadFormAsync();
                var file = form.Files.GetFile("file");
                if (file == null || file.Length == 0)
                    return Results.BadRequest(new { message = "請選擇檔案" });
                if (file.Length > MaxFileSizeBytes)
                    return Results.BadRequest(new { message = $"檔案超過大小限制（{MaxFileSizeBytes / 1024 / 1024}MB）" });

                var tolerance = TimeSpan.FromMinutes(toleranceMinutes is > 0 ? toleranceMinutes.Value : 10);

                try
                {
                    var orders = new List<TradingViewOrder>();
                    using (var reader = new StreamReader(file.OpenReadStream()))
                    using (var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
                    {
                        HeaderValidated = null,
                        MissingFieldFound = null,
                    }))
                    {
                        csv.Read();
                        csv.ReadHeader();
                        var headers = csv.HeaderRecord ?? Array.Empty<string>();

                        var requiredCols = new[] { "商品", "買/賣", "數量", "成交均價", "狀態", "更新時間" };
                        if (requiredCols.Any(c => !headers.Contains(c)))
                            return Results.BadRequest(new { message = "檔案欄位不完整，請確認是否為 TradingView 的「歷史訂單-全部」或「訂單-全部」匯出檔" });

                        while (csv.Read())
                        {
                            var status = Get(csv, headers, "狀態");
                            if (status != "已成交") continue; // 只採用實際成交的訂單，取消/待成交的不列入比對

                            var directionRaw = Get(csv, headers, "買/賣");
                            var direction = directionRaw == "買入" ? "Buy" : directionRaw == "賣出" ? "Sell" : null;
                            if (direction == null) continue;

                            if (!DateTime.TryParse(Get(csv, headers, "更新時間"), out var updateTime)) continue;
                            var fillPriceStr = Get(csv, headers, "成交均價");
                            if (!decimal.TryParse(fillPriceStr, out var fillPrice) || fillPrice <= 0) continue;

                            // 種類：市場/停損/停利，用來判斷這筆交易是怎麼出場的、以及算滑價要拿哪個價格當基準
                            var typeRaw = Get(csv, headers, "種類");
                            var orderType = typeRaw == "停損" ? "StopLoss" : typeRaw == "停利" ? "TakeProfit" : typeRaw == "市場" ? "Market" : null;

                            orders.Add(new TradingViewOrder
                            {
                                Symbol = (Get(csv, headers, "商品") ?? "").Trim(),
                                Direction = direction,
                                Volume = decimal.TryParse(Get(csv, headers, "數量"), out var vol) ? vol : 0m,
                                FillPrice = fillPrice,
                                Time = updateTime,
                                OrderType = orderType,
                                LimitPrice = decimal.TryParse(Get(csv, headers, "限價"), out var limitPrice) ? limitPrice : null,
                                StopPrice = decimal.TryParse(Get(csv, headers, "停損價"), out var stopPrice) ? stopPrice : null,
                            });
                        }
                    }

                    if (orders.Count == 0)
                        return Results.Ok(new { message = "檔案中沒有可用的已成交訂單（可能全部是取消/待成交，或欄位無法解析）", entryPriceFilled = 0, exitPriceFilled = 0 });

                    // 只針對「還缺進場時間／價格／出場方式」的交易嘗試補值，避免覆蓋掉使用者已手動確認過的資料
                    var candidateTrades = await db.Trades
                        .Where(t => t.UserId == userId && (t.EntryTime == null || t.EntryPrice == null || t.ExitPrice == null || t.ExitReason == null))
                        .ToListAsync();

                    int entryTimeFilled = 0, entryFilled = 0, exitFilled = 0, exitReasonFilled = 0, slippageFilled = 0;

                    foreach (var trade in candidateTrades)
                    {
                        // 第一步：進場時間缺值（cTrader Records 格式沒有進場時間）——
                        // 沒有已知的進場時間可以「±容許誤差」去比對，改用「平倉時間之前，
                        // 商品/開倉方向/數量都吻合的訂單中，時間最接近平倉時間的一筆」當進場時間的最佳猜測。
                        // 找到的話順便把成交均價也當進場價（反正 EntryPrice 通常也還是空的）
                        if (trade.EntryTime == null && trade.ExitTime.HasValue)
                        {
                            var openingMatch = FindOpeningOrderBeforeExit(orders, trade.Symbol, trade.Direction, trade.Volume, trade.ExitTime.Value);
                            if (openingMatch != null)
                            {
                                trade.EntryTime = openingMatch.Time;
                                entryTimeFilled++;
                                if (trade.EntryPrice == null)
                                {
                                    trade.EntryPrice = openingMatch.FillPrice;
                                    entryFilled++;
                                }
                            }
                        }

                        // 第二步：進場時間已知（原本就有，或剛在第一步補上）但進場價還缺，用 ±容許誤差比對
                        if (trade.EntryPrice == null && trade.EntryTime.HasValue)
                        {
                            var match = FindMatch(orders, trade.Symbol, trade.Direction, trade.Volume, trade.EntryTime.Value, tolerance);
                            if (match != null)
                            {
                                trade.EntryPrice = match.FillPrice;
                                entryFilled++;
                            }
                        }

                        // 第三步：找平倉那筆訂單（平倉方向跟開倉方向相反）。cTrader Records 匯入的交易
                        // 通常已經有 ExitPrice（cTrader 報表自己就有），這裡不管 ExitPrice 有沒有值都要找，
                        // 才能額外拿到「種類」（判斷出場方式）跟停損價/限價（算滑價）；只有 ExitPrice
                        // 本身缺值時才會覆蓋，已有值的不動
                        if (trade.ExitTime.HasValue && (trade.ExitPrice == null || trade.ExitReason == null))
                        {
                            var closingDirection = trade.Direction == "Buy" ? "Sell" : "Buy";
                            var match = FindMatch(orders, trade.Symbol, closingDirection, trade.Volume, trade.ExitTime.Value, tolerance);
                            if (match != null)
                            {
                                if (trade.ExitPrice == null)
                                {
                                    trade.ExitPrice = match.FillPrice;
                                    exitFilled++;
                                }

                                if (trade.ExitReason == null && match.OrderType != null)
                                {
                                    trade.ExitReason = match.OrderType;
                                    exitReasonFilled++;

                                    // 滑價只在停損/停利（有明確觸發價可比較）時才算得出來，市價平倉沒有「預期價格」可比
                                    decimal? intendedPrice = match.OrderType == "StopLoss" ? match.StopPrice
                                        : match.OrderType == "TakeProfit" ? match.LimitPrice
                                        : null;
                                    if (intendedPrice.HasValue)
                                    {
                                        trade.ExitSlippage = ComputeSlippage(closingDirection, intendedPrice.Value, match.FillPrice);
                                        slippageFilled++;
                                    }
                                }
                            }
                        }

                        if (trade.EntryTime != null || trade.EntryPrice != null || trade.ExitPrice != null || trade.ExitReason != null)
                            trade.UpdatedAt = DateTime.Now;
                    }

                    await db.SaveChangesAsync();

                    return Results.Ok(new
                    {
                        message = $"已比對 {orders.Count} 筆成交訂單，補上進場時間 {entryTimeFilled} 筆、進場價 {entryFilled} 筆、出場價 {exitFilled} 筆、出場方式 {exitReasonFilled} 筆、滑價 {slippageFilled} 筆",
                        entryTimeFilled,
                        entryPriceFilled = entryFilled,
                        exitPriceFilled = exitFilled,
                        exitReasonFilled,
                        slippageFilled
                    });
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "TradingView order import failed (userId={UserId})", userId);
                    return Results.Json(new { message = "解析 TradingView 訂單檔案失敗，請確認格式是否正確", detail = ex.Message }, statusCode: 500);
                }
            });
        }

        /// <summary>
        /// 在候選訂單中找出「商品相同、方向相同、數量相同（誤差在 0.0001 手內）、
        /// 時間落在目標時間 ± tolerance 內」且時間最接近的一筆
        /// </summary>
        private static TradingViewOrder? FindMatch(List<TradingViewOrder> orders, string symbol, string direction, decimal volume, DateTime targetTime, TimeSpan tolerance)
        {
            return orders
                .Where(o => o.Symbol.Equals(symbol, StringComparison.OrdinalIgnoreCase)
                    && o.Direction == direction
                    && Math.Abs(o.Volume - volume) < 0.0001m
                    && Math.Abs((o.Time - targetTime).TotalMinutes) <= tolerance.TotalMinutes)
                .OrderBy(o => Math.Abs((o.Time - targetTime).TotalMinutes))
                .FirstOrDefault();
        }

        /// <summary>
        /// 進場時間未知時的最佳猜測：在「平倉時間之前」的訂單中，找商品/方向(開倉)/數量都吻合、
        /// 時間最接近平倉時間的一筆，當作開倉那筆訂單。沒有 ± 容許誤差的窗口可用（持倉多久本來就不知道），
        /// 只能靠「最接近平倉時間的前一筆」這個假設；小規模個人帳戶重疊持倉的機率低，此假設可接受
        /// </summary>
        private static TradingViewOrder? FindOpeningOrderBeforeExit(List<TradingViewOrder> orders, string symbol, string direction, decimal volume, DateTime exitTime)
        {
            return orders
                .Where(o => o.Symbol.Equals(symbol, StringComparison.OrdinalIgnoreCase)
                    && o.Direction == direction
                    && Math.Abs(o.Volume - volume) < 0.0001m
                    && o.Time < exitTime)
                .OrderByDescending(o => o.Time)
                .FirstOrDefault();
        }

        /// <summary>
        /// cTrader Records 的平倉時間格式為 "30/07/2026 11:17:13.283"（日/月/年，含毫秒），
        /// 用 DateTime.TryParse 在某些文化設定下可能誤判成月/日，先用明確格式嘗試，失敗才退回一般解析
        /// </summary>
        private static bool TryParseCTraderRecordsDateTime(string? raw, out DateTime result)
        {
            result = default;
            if (string.IsNullOrWhiteSpace(raw)) return false;

            string[] formats = { "dd/MM/yyyy HH:mm:ss.fff", "dd/MM/yyyy HH:mm:ss", "d/M/yyyy HH:mm:ss.fff", "d/M/yyyy HH:mm:ss" };
            if (DateTime.TryParseExact(raw.Trim(), formats, CultureInfo.InvariantCulture, DateTimeStyles.None, out result))
                return true;

            return DateTime.TryParse(raw, CultureInfo.InvariantCulture, DateTimeStyles.None, out result);
        }

        /// <summary>
        /// 滑價 = 實際成交價偏離「原本設定的觸發價」多少，正值代表對使用者不利。
        /// 平倉方向是 Buy（買回平空單）時，成交價比觸發價高＝多付錢＝不利；
        /// 平倉方向是 Sell（賣出平多單）時，成交價比觸發價低＝少收錢＝不利，所以正負號要依平倉方向調整
        /// </summary>
        private static decimal ComputeSlippage(string closingDirection, decimal intendedPrice, decimal actualFillPrice)
        {
            return closingDirection == "Buy" ? actualFillPrice - intendedPrice : intendedPrice - actualFillPrice;
        }

        private static string? Get(CsvReader csv, string[] headers, string header)
        {
            if (!headers.Contains(header)) return null;
            try { return csv.GetField(header); } catch { return null; }
        }

        private static int? GetUserId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(idStr, out int id) ? id : null;
        }

        private class TradingViewOrder
        {
            public string Symbol { get; set; } = "";
            public string Direction { get; set; } = "";
            public decimal Volume { get; set; }
            public decimal FillPrice { get; set; }
            public DateTime Time { get; set; }
            // "StopLoss" / "TakeProfit" / "Market" / null（無法辨識的種類文字）
            public string? OrderType { get; set; }
            public decimal? LimitPrice { get; set; }
            public decimal? StopPrice { get; set; }
        }

        private class CTraderRecordRow
        {
            public string Symbol { get; set; } = "";
            public string Direction { get; set; } = "";
            public DateTime ExitTime { get; set; }
            public decimal EntryPrice { get; set; }
            public decimal ExitPrice { get; set; }
            public decimal Volume { get; set; }
            public decimal Profit { get; set; }
        }
    }
}
