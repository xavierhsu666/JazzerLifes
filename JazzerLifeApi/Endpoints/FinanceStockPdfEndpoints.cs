using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Security.Claims;
using System.Text.RegularExpressions;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;
using JazzerLifeApi.Models;

namespace JazzerLifeApi.Endpoints
{
    /// <summary>
    /// 台股集保（TDCC）庫存 PDF 辨識。
    ///
    /// 兩支端點：
    ///   preview — 只辨識、不寫入，回傳解析結果（Rows）與原始文字行（Lines），版面對不上時可據此調規則。
    ///   import  — 辨識後寫入 FIN.Stock，並留一筆 FIN.StockPdfImport 匯入紀錄（防重複上傳用）。
    ///   imports — 查當月已上傳清單與結算狀態。
    ///   settle  — 當月結算：把當月所有庫存合併成一筆 FIN.BankAccount（集保／集保庫存）。
    /// PDF 密碼可由呼叫端傳入，沒傳就改用「設定 → 一般設定」存下來的密碼（FIN.UserSetting，加密儲存）。
    /// </summary>
    public static class FinanceStockPdfEndpoints
    {
        private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 與 FinanceUploadEndpoints 一致

        // 同一行的判定容忍值（PDF 座標單位 pt）。表格列高約 10~14pt，
        // 取 3pt 可容忍同列文字基線的微小落差，又不會把上下兩列黏成一行。
        private const double LineTolerance = 3.0;

        // 股票代號：台股 4 碼為主，ETF／權證可能到 6 碼且帶英文（如 00919、2330、00631L）
        private static readonly Regex CodeRegex = new(@"^[0-9]{4,6}[A-Z]{0,2}$", RegexOptions.Compiled);
        private static readonly Regex NumberRegex = new(@"^-?[0-9][0-9,]*(\.[0-9]+)?$", RegexOptions.Compiled);
        private static readonly Regex CjkRegex = new(@"[一-鿿]", RegexOptions.Compiled);
        // 收盤價日期（例：2026/01/06），用來當作快照日期的預設值，免得使用者還要自己對日期
        // 從 PDF 內文抓「帳號」與券商名稱，當作這份存摺的來源識別（使用者不必自己填欄位）
        private static readonly Regex AccountNoRegex = new(@"帳[  ]*號[:：]?\s*([0-9A-Za-z\-]{5,20})", RegexOptions.Compiled);
        private static readonly Regex BrokerRegex = new(@"[\u4e00-\u9fff]{2,10}(證券|銀行|投信|期貨)", RegexOptions.Compiled);
        private static readonly Regex DateRegex = new(@"(20[0-9]{2})[/-]([0-9]{1,2})[/-]([0-9]{1,2})", RegexOptions.Compiled);

        public static void MapFinanceStockPdfEndpoints(this WebApplication app)
        {
            // 辨識預覽：不寫入資料庫，供上傳前確認辨識結果
            app.MapPost("/api/finance/stock-pdf/preview", async (
                HttpRequest request,
                ClaimsPrincipal user,
                JazzerLifeContext db,
                IDataProtectionProvider protectionProvider,
                ILogger<Program> logger) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                var (bytes, file, error) = await ReadPdfAsync(request);
                if (error != null) return error;

                var password = await ResolvePasswordAsync(request, userId.Value, db, protectionProvider, logger);

                try
                {
                    return Results.Ok(Parse(bytes!, file!.FileName, password));
                }
                catch (Exception ex)
                {
                    return HandleParseError(ex, file!.FileName, logger);
                }
            }).DisableAntiforgery();

            // 辨識並寫入 FIN.Stock，同時留一筆匯入紀錄
            app.MapPost("/api/finance/stock-pdf/import", async (
                HttpRequest request,
                ClaimsPrincipal user,
                JazzerLifeContext db,
                IDataProtectionProvider protectionProvider,
                ILogger<Program> logger) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                var (bytes, file, error) = await ReadPdfAsync(request);
                if (error != null) return error;

                var form = await request.ReadFormAsync();
                var password = await ResolvePasswordAsync(request, userId.Value, db, protectionProvider, logger);

                PdfPreviewResult parsed;
                try
                {
                    parsed = Parse(bytes!, file!.FileName, password);
                }
                catch (Exception ex)
                {
                    return HandleParseError(ex, file!.FileName, logger);
                }

                if (parsed.Rows.Count == 0)
                    return Results.BadRequest(new { message = "沒有辨識到任何庫存資料，未寫入", warnings = parsed.Warnings });

                // 快照日期優先序：前端指定 > PDF 上的收盤價日期 > 今天
                if (!DateTime.TryParse(form["snapshotDate"], out var snapshotDate))
                    snapshotDate = parsed.DetectedDate ?? DateTime.Today;
                snapshotDate = snapshotDate.Date;
                var yearMonth = snapshotDate.ToString("yyyy-MM");

                // 機構／帳戶：優先用前端填的，沒填就用 PDF 內文抓到的券商，再沒有才用「集保」
                var organizationName = form["organizationName"].ToString();
                if (string.IsNullOrWhiteSpace(organizationName))
                    organizationName = parsed.DetectedOrganization ?? "集保";
                var accountName = form["accountName"].ToString();
                if (string.IsNullOrWhiteSpace(accountName))
                    accountName = parsed.DetectedSource ?? "集保庫存";

                var fileHash = Sha256(bytes!);
                // 內容雜湊只取「代號:股數」：同一份資料重新下載，檔案位元組會因產製時間而不同，但內容一樣
                var contentHash = Sha256(Encoding.UTF8.GetBytes(string.Join("|",
                    parsed.Rows.Select(r => r.Code + ":" + (r.Unit ?? 0)).OrderBy(x => x, StringComparer.Ordinal))));

                int.TryParse(form["replaceImportId"], out var replaceImportId);

                // ── 防呆一：完全相同的檔案（不分月份）已經匯入過
                var sameFile = await db.StockPdfImports
                    .FirstOrDefaultAsync(i => i.UserId == userId && i.FileHash == fileHash);
                if (sameFile != null && sameFile.ImportId != replaceImportId)
                {
                    return Results.Json(new
                    {
                        code = "DUPLICATE_FILE",
                        message = $"這份檔案在 {sameFile.YearMonth} 已經上傳過了（{sameFile.FileName}），沒有重複寫入。",
                        importId = sameFile.ImportId,
                        yearMonth = sameFile.YearMonth
                    }, statusCode: 409);
                }

                var monthImports = await db.StockPdfImports
                    .Where(i => i.UserId == userId && i.YearMonth == yearMonth)
                    .ToListAsync();

                // ── 防呆二：同月已有一筆內容完全一樣的（換檔名或重新下載）
                var sameContent = monthImports.FirstOrDefault(i => i.ContentHash == contentHash && i.ImportId != replaceImportId);
                if (sameContent != null)
                {
                    return Results.Json(new
                    {
                        code = "DUPLICATE_CONTENT",
                        message = $"{yearMonth} 已經有一筆內容完全相同的匯入（{sameContent.FileName}），沒有重複寫入。",
                        importId = sameContent.ImportId
                    }, statusCode: 409);
                }

                // ── 防呆三：同月、同一個來源（帳號／券商相同，或持股高度重疊）→ 視為同一份的更新版，
                //            回 409 讓前端跳確認，使用者按確認後帶 replaceImportId 重送，才會取代舊的
                if (replaceImportId == 0 && monthImports.Count > 0)
                {
                    var candidate = !string.IsNullOrEmpty(parsed.DetectedSource)
                        ? monthImports.FirstOrDefault(i => i.SourceKey == parsed.DetectedSource)
                        : null;

                    if (candidate == null)
                    {
                        // 抓不到帳號時的退路：比對持股代號重疊率。同一家券商的存摺兩次匯出，
                        // 持股清單通常高度重疊；不同券商則很少會超過六成。
                        var newCodes = parsed.Rows.Select(r => r.Code).Distinct().ToHashSet();
                        foreach (var imp in monthImports)
                        {
                            var oldCodes = await db.Stocks
                                .Where(x => x.ImportId == imp.ImportId)
                                .Select(x => x.Code)
                                .Distinct()
                                .ToListAsync();
                            if (oldCodes.Count == 0) continue;

                            var overlap = oldCodes.Count(c => newCodes.Contains(c)) / (double)Math.Max(oldCodes.Count, newCodes.Count);
                            if (overlap >= 0.6)
                            {
                                candidate = imp;
                                break;
                            }
                        }
                    }

                    if (candidate != null)
                    {
                        return Results.Json(new
                        {
                            code = "SAME_SOURCE",
                            message = $"{yearMonth} 已經上傳過同一來源的存摺（{candidate.FileName}，{candidate.StockCount} 筆／市值 {candidate.TotalMarketValue:N0}）。要用這份新的取代它嗎？",
                            importId = candidate.ImportId,
                            fileName = candidate.FileName,
                            stockCount = candidate.StockCount,
                            totalMarketValue = candidate.TotalMarketValue
                        }, statusCode: 409);
                    }
                }

                // 取代舊的：先把舊匯入的庫存與紀錄清掉（FIN.Stock 靠 ImportID 反查）
                var replaced = 0;
                if (replaceImportId > 0)
                {
                    var old = await db.StockPdfImports
                        .FirstOrDefaultAsync(i => i.ImportId == replaceImportId && i.UserId == userId);
                    if (old != null)
                    {
                        replaced = await db.Database.ExecuteSqlInterpolatedAsync(
                            $"DELETE FROM FIN.Stock WHERE ImportID = {old.ImportId}");
                        db.StockPdfImports.Remove(old);
                        await db.SaveChangesAsync();
                    }
                }

                // 同代號沿用最近一次的成本：集保沒有成本資料（它只做保管，買進均價在券商端），
                // 若直接寫 0 會讓未實現損益整個歸零，所以拿同使用者同代號最新一筆的 Cost 接續使用。
                var previousCosts = await db.Stocks
                    .AsNoTracking()
                    .Where(x => x.UserId == userId && x.Cost > 0)
                    .OrderByDescending(x => x.CreatedAt)
                    .Select(x => new { x.Code, x.Cost })
                    .ToListAsync();
                var costByCode = previousCosts
                    .GroupBy(x => x.Code)
                    .ToDictionary(g => g.Key, g => g.First().Cost);

                var now = DateTime.Now;
                var import = new StockPdfImport
                {
                    UserId = userId.Value,
                    YearMonth = yearMonth,
                    FileName = file!.FileName,
                    FileHash = fileHash,
                    ContentHash = contentHash,
                    SourceKey = parsed.DetectedSource,
                    OrganizationName = organizationName,
                    AccountName = accountName,
                    SnapshotDate = snapshotDate,
                    StockCount = parsed.Rows.Count,
                    CreatedAt = now,
                    UpdatedAt = now
                };
                db.StockPdfImports.Add(import);
                await db.SaveChangesAsync(); // 先存一次拿 ImportID，庫存列才有東西可掛

                decimal totalMarketValue = 0, totalCost = 0;
                var carriedCost = 0;

                foreach (var row in parsed.Rows)
                {
                    var unit = (int)Math.Round(row.Unit ?? 0);
                    var marketValue = row.MarketValue ?? 0;
                    var cost = row.Cost ?? 0;
                    if (cost == 0 && costByCode.TryGetValue(row.Code, out var prevCost))
                    {
                        cost = prevCost;
                        carriedCost++;
                    }

                    var benefit = cost > 0 ? marketValue - cost : 0m;
                    // UnRealizedBenefitRatio 是 decimal(5,2)，最大 999.99，極端值先夾住避免寫入時溢位
                    var ratio = cost > 0 ? Math.Round(benefit / cost * 100m, 2) : 0m;
                    ratio = Math.Clamp(ratio, -999.99m, 999.99m);

                    totalMarketValue += marketValue;
                    totalCost += cost;

                    // FIN.Stock 在 EF 設定為 HasNoKey（無主鍵），keyless 型別無法被 EF 追蹤新增，
                    // 因此比照 BankAccount 的做法直接下參數化 INSERT
                    await db.Database.ExecuteSqlInterpolatedAsync($@"
INSERT INTO FIN.Stock
    (UserID, OrganizationName, AccountName, Code, Unit, MarketValue, Cost, UnRealizedBenefit, UnRealizedBenefitRatio, CreatedAt, UpdatedAt, Activate, ImportID)
VALUES
    ({userId.Value}, {organizationName}, {accountName}, {row.Code}, {unit}, {marketValue}, {cost}, {benefit}, {ratio}, {snapshotDate}, {now}, '1', {import.ImportId})");
                }

                import.TotalMarketValue = totalMarketValue;
                import.TotalCost = totalCost;
                import.UpdatedAt = DateTime.Now;
                await db.SaveChangesAsync();

                // 當月若已經結算過，這次上傳等於改了結算來源，提醒使用者重新結算
                var settlement = await db.StockSettlements
                    .FirstOrDefaultAsync(x => x.UserId == userId && x.YearMonth == yearMonth);

                var message = $"已寫入 {parsed.Rows.Count} 筆庫存（{yearMonth}，市值 {totalMarketValue:N0}）";
                if (replaced > 0) message += $"，取代舊資料 {replaced} 筆";
                if (carriedCost > 0) message += $"，其中 {carriedCost} 筆沿用先前成本";

                return Results.Ok(new
                {
                    message,
                    importId = import.ImportId,
                    yearMonth,
                    snapshotDate = snapshotDate.ToString("yyyy-MM-dd"),
                    organizationName,
                    accountName,
                    sourceKey = parsed.DetectedSource,
                    stockCount = parsed.Rows.Count,
                    totalMarketValue,
                    carriedCost,
                    replaced,
                    needsResettle = settlement != null,
                    rows = parsed.Rows,
                    warnings = parsed.Warnings
                });
            }).DisableAntiforgery();

            // 當月已上傳清單 + 結算狀態
            app.MapGet("/api/finance/stock-pdf/imports", async (string? month, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var yearMonth = string.IsNullOrWhiteSpace(month) ? DateTime.Today.ToString("yyyy-MM") : month;

                var imports = await db.StockPdfImports
                    .AsNoTracking()
                    .Where(i => i.UserId == userId && i.YearMonth == yearMonth)
                    .OrderBy(i => i.ImportId)
                    .ToListAsync();

                var settlement = await db.StockSettlements
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.UserId == userId && x.YearMonth == yearMonth);

                // 已結算後又新增／刪除過匯入，就要提醒重新結算
                var needsResettle = settlement != null &&
                    (imports.Count != settlement.ImportCount || imports.Any(i => i.SettlementId != settlement.SettlementId));

                return Results.Ok(new
                {
                    yearMonth,
                    imports = imports.Select(i => new
                    {
                        i.ImportId,
                        i.FileName,
                        i.OrganizationName,
                        i.AccountName,
                        i.SourceKey,
                        SnapshotDate = i.SnapshotDate.ToString("yyyy-MM-dd"),
                        i.StockCount,
                        i.TotalMarketValue,
                        i.SettlementId,
                        CreatedAt = i.CreatedAt.ToString("yyyy-MM-dd HH:mm")
                    }),
                    totalMarketValue = imports.Sum(i => i.TotalMarketValue),
                    settlement,
                    needsResettle
                });
            });

            // 刪除某一次匯入（連同它寫入的庫存）
            app.MapDelete("/api/finance/stock-pdf/imports/{importId:int}", async (int importId, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var import = await db.StockPdfImports.FirstOrDefaultAsync(i => i.ImportId == importId && i.UserId == userId);
                if (import == null) return Results.Json(new { message = "找不到該筆匯入紀錄" }, statusCode: 404);

                var deleted = await db.Database.ExecuteSqlInterpolatedAsync(
                    $"DELETE FROM FIN.Stock WHERE ImportID = {import.ImportId}");
                var wasSettled = import.SettlementId != null;
                var yearMonth = import.YearMonth;

                db.StockPdfImports.Remove(import);
                await db.SaveChangesAsync();

                return Results.Ok(new
                {
                    message = $"已刪除匯入紀錄與庫存 {deleted} 筆" + (wasSettled ? "，該月已結算過，請重新結算" : ""),
                    yearMonth,
                    needsResettle = wasSettled
                });
            });

            // 當月結算：把當月所有匯入的庫存合併成一筆 FIN.BankAccount
            app.MapPost("/api/finance/stock-pdf/settle", async (
                SettleRequest body, ClaimsPrincipal user, JazzerLifeContext db, ILogger<Program> logger) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var yearMonth = string.IsNullOrWhiteSpace(body.Month) ? DateTime.Today.ToString("yyyy-MM") : body.Month!;
                if (!DateTime.TryParse(yearMonth + "-01", out _))
                    return Results.BadRequest(new { message = "月份格式錯誤，請用 yyyy-MM" });

                var organizationName = string.IsNullOrWhiteSpace(body.OrganizationName) ? "集保" : body.OrganizationName!;
                var accountName = string.IsNullOrWhiteSpace(body.AccountName) ? "集保庫存" : body.AccountName!;

                var imports = await db.StockPdfImports
                    .Where(i => i.UserId == userId && i.YearMonth == yearMonth)
                    .ToListAsync();
                if (imports.Count == 0)
                    return Results.BadRequest(new { message = $"{yearMonth} 沒有任何已上傳的庫存資料，無法結算" });

                var existing = await db.StockSettlements
                    .FirstOrDefaultAsync(x => x.UserId == userId && x.YearMonth == yearMonth);

                // 防呆：同月重複結算預設擋下，要覆蓋必須明確帶 force（前端的「重新結算」）
                if (existing != null && !body.Force)
                {
                    return Results.Json(new
                    {
                        code = "ALREADY_SETTLED",
                        message = $"{yearMonth} 已經結算過（市值 {existing.TotalMarketValue:N0}，結算於 {existing.SettledAt:yyyy-MM-dd HH:mm}）。要以目前的庫存重新結算嗎？",
                        settlement = existing
                    }, statusCode: 409);
                }

                var importIds = imports.Select(i => i.ImportId).ToList();
                var stocks = await db.Stocks
                    .AsNoTracking()
                    .Where(s => s.ImportId != null && importIds.Contains(s.ImportId.Value))
                    .ToListAsync();

                var totalMarketValue = stocks.Sum(s => s.MarketValue);
                var totalCost = stocks.Sum(s => s.Cost);
                // 帳戶落在哪個月由 CreatedAt 決定，取當月最後一份存摺的快照日
                var snapshotDate = imports.Max(i => i.SnapshotDate);

                var monthStart = DateTime.Parse(yearMonth + "-01");
                var monthEnd = monthStart.AddMonths(1);

                // 重新結算：先把同月同名的帳戶清掉再寫，避免帳戶總覽出現兩筆集保庫存
                var removedAccounts = await db.Database.ExecuteSqlInterpolatedAsync($@"
DELETE FROM FIN.BankAccount
WHERE UserID = {userId.Value}
  AND OrganizationName = {organizationName}
  AND AccountName = {accountName}
  AND CreatedAt >= {monthStart} AND CreatedAt < {monthEnd}");

                var now = DateTime.Now;
                if (existing != null)
                {
                    db.StockSettlements.Remove(existing);
                    await db.SaveChangesAsync();
                }

                var settlement = new StockSettlement
                {
                    UserId = userId.Value,
                    YearMonth = yearMonth,
                    OrganizationName = organizationName,
                    AccountName = accountName,
                    ImportCount = imports.Count,
                    StockCount = stocks.Count,
                    TotalMarketValue = totalMarketValue,
                    TotalCost = totalCost,
                    SnapshotDate = snapshotDate,
                    SettledAt = now,
                    UpdatedAt = now
                };
                db.StockSettlements.Add(settlement);
                await db.SaveChangesAsync();

                foreach (var imp in imports)
                {
                    imp.SettlementId = settlement.SettlementId;
                    imp.UpdatedAt = now;
                }
                await db.SaveChangesAsync();

                // FIN.BankAccount 同樣是 keyless，比照既有 CSV 上傳用參數化 INSERT
                await db.Database.ExecuteSqlInterpolatedAsync($@"
INSERT INTO FIN.BankAccount
    (UserID, OrganizationName, AccountName, Currency, CreditLimit, AccountBalance, AvailableCredit, CreatedAt, UpdatedAt, Activate)
VALUES
    ({userId.Value}, {organizationName}, {accountName}, 'TWD', NULL, {totalMarketValue}, NULL, {snapshotDate}, {now}, '1')");

                var message = $"{yearMonth} 結算完成：{imports.Count} 份存摺、{stocks.Count} 檔庫存，總市值 {totalMarketValue:N0}，已寫入帳戶「{accountName}」";
                if (removedAccounts > 0) message += $"（覆蓋原本的 {removedAccounts} 筆）";

                return Results.Ok(new { message, settlement, totalMarketValue, stockCount = stocks.Count, importCount = imports.Count });
            });
        }

        /// <summary>共用的上傳檔案檢查：回傳位元組內容，檢查不過時直接給現成的錯誤結果。</summary>
        private static async Task<(byte[]? Bytes, IFormFile? File, IResult? Error)> ReadPdfAsync(HttpRequest request)
        {
            if (!request.HasFormContentType)
                return (null, null, Results.BadRequest(new { message = "請使用表單格式上傳" }));

            var form = await request.ReadFormAsync();
            var file = form.Files.FirstOrDefault();
            if (file == null)
                return (null, null, Results.BadRequest(new { message = "沒有選擇檔案" }));
            if (file.Length > MaxFileSizeBytes)
                return (null, null, Results.BadRequest(new { message = $"檔案超過大小限制（{MaxFileSizeBytes / 1024 / 1024}MB）" }));
            if (!file.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
                return (null, null, Results.BadRequest(new { message = "只接受 PDF 檔" }));

            // PdfPig 需要可隨機存取的資料來源，HTTP 上傳的 Stream 不保證可 Seek，先整份讀進記憶體
            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);
            return (ms.ToArray(), file, null);
        }

        /// <summary>表單有帶密碼就用表單的，沒帶才回頭讀「一般設定」裡存的密碼。</summary>
        private static async Task<string?> ResolvePasswordAsync(
            HttpRequest request, int userId, JazzerLifeContext db, IDataProtectionProvider protectionProvider, ILogger logger)
        {
            var form = await request.ReadFormAsync();
            var password = form["password"].ToString();
            if (!string.IsNullOrEmpty(password)) return password;

            return await FinanceSettingEndpoints.GetTdccPasswordAsync(userId, db, protectionProvider, logger);
        }

        private static IResult HandleParseError(Exception ex, string fileName, ILogger logger)
        {
            logger.LogError(ex, "集保 PDF 解析失敗：{FileName}", fileName);
            // 密碼錯誤時 PdfPig 丟 PdfDocumentEncryptedException，訊息是英文，這裡補中文提示
            var hint = ex.GetType().Name.Contains("Encrypted", StringComparison.OrdinalIgnoreCase)
                ? "PDF 有加密且密碼不正確，請確認「設定 → 一般設定」的集保 PDF 密碼，或直接在下方輸入。"
                : "PDF 解析失敗，可能是檔案損毀或非標準格式。";
            return Results.BadRequest(new { message = hint, detail = ex.Message });
        }

        private static string Sha256(byte[] data) => Convert.ToHexString(SHA256.HashData(data)).ToLowerInvariant();

        public record SettleRequest(string? Month, string? OrganizationName, string? AccountName, bool Force);

        private static int? GetUserId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(idStr, out int id) ? id : null;
        }

        private static PdfPreviewResult Parse(byte[] bytes, string fileName, string? password)
        {
            var options = new ParsingOptions { UseLenientParsing = true };
            if (!string.IsNullOrEmpty(password))
                options.Password = password;

            using var doc = PdfDocument.Open(bytes, options);

            var lines = new List<PdfLine>();
            var rows = new List<StockPdfRow>();
            var warnings = new List<string>();
            var totalChars = 0;
            DateTime? detectedDate = null;
            string? detectedAccountNo = null;
            string? detectedBroker = null;

            foreach (var page in doc.GetPages())
            {
                var pageLines = ExtractLines(page);
                totalChars += pageLines.Sum(l => l.Words.Sum(w => w.Text.Length));

                // 欄位標題列：抓到就用 X 座標對齊分欄，抓不到再退回「依序猜測」
                var columns = DetectColumns(pageLines);

                foreach (var line in pageLines)
                {
                    var text = string.Join(" ", line.Words.Select(w => w.Text));
                    lines.Add(new PdfLine(page.Number, Math.Round(line.Y, 1), text));

                    var row = TryParseRow(page.Number, line, text, columns);
                    if (row != null) rows.Add(row);

                    if (detectedAccountNo == null)
                    {
                        // 文字被 PdfPig 切成 Word 後會用空白接起來，這裡直接對整行做比對
                        var accMatch = AccountNoRegex.Match(text.Replace(" ", ""));
                        if (accMatch.Success) detectedAccountNo = accMatch.Groups[1].Value;
                    }
                    if (detectedBroker == null)
                    {
                        var brokerMatch = BrokerRegex.Match(text.Replace(" ", ""));
                        if (brokerMatch.Success) detectedBroker = brokerMatch.Value;
                    }

                    // 取整份 PDF 中最新的日期當快照日：集保表上的收盤價日期就是這份庫存的基準日
                    var dateMatch = DateRegex.Match(text);
                    if (dateMatch.Success
                        && DateTime.TryParse($"{dateMatch.Groups[1].Value}-{dateMatch.Groups[2].Value}-{dateMatch.Groups[3].Value}", out var d)
                        && (detectedDate == null || d > detectedDate))
                    {
                        detectedDate = d;
                    }
                }

                if (columns.Count == 0)
                    warnings.Add($"第 {page.Number} 頁沒有辨識到表格標題列，該頁改用欄位順序推測，數值可能對錯欄。");
            }

            if (totalChars == 0)
                warnings.Add("這份 PDF 沒有文字圖層（可能是掃描或截圖轉檔），純文字解析無法處理，需要改走 OCR。");
            if (rows.Count == 0 && totalChars > 0)
                warnings.Add("有讀到文字但沒有辨識出任何股票列，請把下方原始文字複製給開發者調整解析規則。");

            // 來源識別優先用帳號（同一家券商可能有多個帳戶），沒有才退回券商名稱
            var detectedSource = detectedAccountNo != null
                ? (detectedBroker != null ? detectedBroker + "-" + detectedAccountNo : detectedAccountNo)
                : detectedBroker;

            return new PdfPreviewResult(fileName, doc.NumberOfPages, totalChars, detectedDate,
                detectedSource, detectedBroker, rows, lines, warnings);
        }

        /// <summary>把 PdfPig 抽出的 Word 依基線 Y 分群成「行」，同一行再依 X 由左到右排序。</summary>
        private static List<RawLine> ExtractLines(Page page)
        {
            var groups = new List<RawLine>();

            foreach (var word in page.GetWords())
            {
                if (string.IsNullOrWhiteSpace(word.Text)) continue;
                var y = word.BoundingBox.Bottom;
                var group = groups.FirstOrDefault(g => Math.Abs(g.Y - y) <= LineTolerance);
                if (group == null)
                {
                    group = new RawLine { Y = y };
                    groups.Add(group);
                }
                group.Words.Add(word);
            }

            foreach (var g in groups)
                g.Words.Sort((a, b) => a.BoundingBox.Left.CompareTo(b.BoundingBox.Left));

            // PDF 座標原點在左下，Y 由大到小才是由上而下的閱讀順序
            return groups.OrderByDescending(g => g.Y).ToList();
        }

        private static readonly (string Field, string[] Keywords)[] ColumnKeywords =
        {
            ("Code",        new[] { "股票代號", "證券代號", "股票代碼", "證券代碼", "代號", "代碼" }),
            ("Name",        new[] { "股票名稱", "證券名稱", "商品名稱", "名稱" }),
            ("Unit",        new[] { "庫存股數", "持有股數", "集保庫存", "股數", "庫存", "餘額", "單位數" }),
            ("Price",       new[] { "收盤價", "參考價", "市價", "單價" }),
            ("MarketValue", new[] { "參考市值", "市值", "總市值" }),
            ("Cost",        new[] { "投資成本", "成本" }),
        };

        /// <summary>找出標題列，回傳「欄位 → 標題文字的 X 中心點」，供資料列用最近距離對欄。</summary>
        private static Dictionary<string, double> DetectColumns(List<RawLine> lines)
        {
            var best = new Dictionary<string, double>();

            foreach (var line in lines)
            {
                var found = new Dictionary<string, double>();
                foreach (var word in line.Words)
                {
                    var t = word.Text.Trim();
                    foreach (var (field, keywords) in ColumnKeywords)
                    {
                        if (found.ContainsKey(field)) continue;
                        // 標題可能是完整的「庫存股數」，也可能被切成「庫存」「股數」兩個 Word，兩邊互相 Contains 才抓得到
                        var hit = keywords.Any(k => t.Contains(k) || (t.Length >= 2 && k.Contains(t)));
                        if (hit) found[field] = (word.BoundingBox.Left + word.BoundingBox.Right) / 2;
                    }
                }

                // 至少要有（代號或名稱）+ 股數，才算真的表頭，避免內文句子被誤判
                var looksLikeHeader = (found.ContainsKey("Code") || found.ContainsKey("Name")) && found.ContainsKey("Unit");
                if (looksLikeHeader && found.Count > best.Count)
                    best = found;
            }

            return best;
        }

        private static StockPdfRow? TryParseRow(int pageNumber, RawLine line, string text, Dictionary<string, double> columns)
        {
            var words = line.Words;
            var codeIndex = words.FindIndex(w => CodeRegex.IsMatch(w.Text.Trim()));
            if (codeIndex < 0) return null;

            var code = words[codeIndex].Text.Trim();

            // 名稱：代號後面到第一個數字之前的所有文字
            var nameParts = new List<string>();
            for (var i = codeIndex + 1; i < words.Count; i++)
            {
                var t = words[i].Text.Trim();
                if (NumberRegex.IsMatch(t)) break;
                nameParts.Add(t);
            }
            var name = string.Concat(nameParts);

            // 沒有中文名稱的多半不是庫存列（頁碼、日期、帳號等），略過以免噪音蓋掉真正的資料
            if (!CjkRegex.IsMatch(name)) return null;

            decimal? unit = null, price = null, marketValue = null, cost = null;

            if (columns.Count > 0)
            {
                // 有表頭：每個數字找 X 距離最近的欄位，避免不同版面欄位順序不同而錯位
                foreach (var w in words.Skip(codeIndex + 1))
                {
                    var t = w.Text.Trim();
                    if (!NumberRegex.IsMatch(t)) continue;
                    var center = (w.BoundingBox.Left + w.BoundingBox.Right) / 2;

                    var field = columns
                        .Where(c => c.Key == "Unit" || c.Key == "Price" || c.Key == "MarketValue" || c.Key == "Cost")
                        .OrderBy(c => Math.Abs(c.Value - center))
                        .Select(c => c.Key)
                        .FirstOrDefault();

                    var value = ParseNumber(t);
                    if (field == "Unit") unit ??= value;
                    else if (field == "Price") price ??= value;
                    else if (field == "MarketValue") marketValue ??= value;
                    else if (field == "Cost") cost ??= value;
                }
            }
            else
            {
                // 沒表頭：只能依序猜（股數 → 價 → 市值 → 成本），所以回傳 Source=guess，前端會標示「推測」
                var numbers = words.Skip(codeIndex + 1)
                    .Select(w => w.Text.Trim())
                    .Where(t => NumberRegex.IsMatch(t))
                    .Select(ParseNumber)
                    .ToList();
                if (numbers.Count > 0) unit = numbers[0];
                if (numbers.Count > 1) price = numbers[1];
                if (numbers.Count > 2) marketValue = numbers[2];
                if (numbers.Count > 3) cost = numbers[3];
            }

            if (unit == null) return null;

            return new StockPdfRow(pageNumber, code, name, unit, price, marketValue, cost, text,
                columns.Count > 0 ? "column" : "guess");
        }

        private static decimal ParseNumber(string text)
        {
            return decimal.TryParse(text.Replace(",", ""), NumberStyles.Any, CultureInfo.InvariantCulture, out var v) ? v : 0m;
        }

        private sealed class RawLine
        {
            public double Y { get; set; }
            public List<Word> Words { get; } = new();
        }

        public record PdfLine(int PageNumber, double Y, string Text);

        public record StockPdfRow(
            int PageNumber,
            string Code,
            string Name,
            decimal? Unit,
            decimal? Price,
            decimal? MarketValue,
            decimal? Cost,
            string RawLine,
            string Source);

        public record PdfPreviewResult(
            string FileName,
            int PageCount,
            int TextCharCount,
            DateTime? DetectedDate,
            string? DetectedSource,
            string? DetectedOrganization,
            List<StockPdfRow> Rows,
            List<PdfLine> Lines,
            List<string> Warnings);
    }
}
