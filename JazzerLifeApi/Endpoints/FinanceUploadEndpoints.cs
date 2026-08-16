using Microsoft.EntityFrameworkCore;
using CsvHelper;
using CsvHelper.Configuration;
using System.Globalization;
using System.Security.Claims;
using JazzerLifeApi.Models;

namespace JazzerLifeApi.Endpoints
{
    public static class FinanceUploadEndpoints
    {
        private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10MB，需與前端 finance.js 的限制一致
        private const int MaxFileCount = 20;

        public static void MapFinanceUploadEndpoints(this WebApplication app)
        {
            app.MapPost("/api/finance/upload-details", async (HttpRequest request, ClaimsPrincipal user, JazzerLifeContext db, ILogger<Program> logger) =>
            {
                var userId = GetUserId(user);
                if (userId == null)
                    return Results.Json(new { message = "未登入" }, statusCode: 401);

                if (!request.HasFormContentType)
                    return Results.BadRequest(new { message = "請使用表單格式上傳" });

                var form = await request.ReadFormAsync();
                var files = form.Files;
                if (files.Count == 0)
                    return Results.BadRequest(new { message = "沒有選擇檔案" });

                if (files.Count > MaxFileCount)
                    return Results.BadRequest(new { message = $"檔案數量超過上限（最多 {MaxFileCount} 個）" });

                var oversized = files.Where(f => f.Length > MaxFileSizeBytes).Select(f => f.FileName).ToList();
                if (oversized.Count > 0)
                    return Results.BadRequest(new { message = $"以下檔案超過大小限制（{MaxFileSizeBytes / 1024 / 1024}MB）：{string.Join("、", oversized)}" });

                if (!DateTime.TryParse(form["snapshotDate"], out var snapshotDate))
                    return Results.BadRequest(new { message = "請選擇有效的快照日期" });

                int detailCount = 0, accountCount = 0, stockCount = 0;
                var errors = new List<string>();
                var skipped = new List<string>();
                // 本次新增的明細，等存檔後拿來套用「自動分類規則」。
                // 只套用在新明細上（不動既有明細），既有明細要重跑請到規則頁按「全部執行」
                var newDetails = new List<Detail>();

                foreach (var file in files)
                {
                    try
                    {
                        using var reader = new StreamReader(file.OpenReadStream());
                        using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
                        {
                            HeaderValidated = null,
                            MissingFieldFound = null,
                        });

                        csv.Read();
                        csv.ReadHeader();
                        var headers = csv.HeaderRecord ?? Array.Empty<string>();

                        // 依欄位特徵自動判斷檔案類型
                        if (headers.Contains("消費日") || headers.Contains("入帳日"))
                        {
                            var rows = new List<Detail>();
                            while (csv.Read())
                            {
                                rows.Add(new Detail
                                {
                                    UserId = userId.Value,
                                    OrganizationName = Get(csv, headers, "機構名稱") ?? "",
                                    AccountName = Get(csv, headers, "帳戶名稱") ?? "",
                                    Category = Get(csv, headers, "分類") ?? "",
                                    Description = Get(csv, headers, "明細描述"),
                                    Currency = Get(csv, headers, "幣別") ?? "TWD",
                                    Amount = ParseDecimal(Get(csv, headers, "金額")),
                                    TransactionDate = ParseDateOnly(Get(csv, headers, "消費日"), snapshotDate),
                                    PostingDate = ParseDateOnly(Get(csv, headers, "入帳日"), snapshotDate),
                                    Tag = Get(csv, headers, "標籤"),
                                    Notes = Get(csv, headers, "備註"),
                                    CreatedAt = snapshotDate,
                                    UpdatedAt = DateTime.Now,
                                    Activate = "1",
                                    IsExcluded = false,
                                });
                            }
                            db.Details.AddRange(rows);
                            newDetails.AddRange(rows);
                            detailCount += rows.Count;
                        }
						else if (headers.Contains("帳戶金額"))
						{
							while (csv.Read())
							{
								var organizationName = Get(csv, headers, "機構名稱") ?? "";
								var accountName = Get(csv, headers, "帳戶名稱") ?? "未命名帳戶";
								var currency = Get(csv, headers, "幣別");
								var creditLimit = ParseDecimalNullable(Get(csv, headers, "信用額度"));
								var accountBalance = ParseDecimalNullable(Get(csv, headers, "帳戶金額"));
								var availableCredit = ParseDecimalNullable(Get(csv, headers, "可用額度"));

								await db.Database.ExecuteSqlInterpolatedAsync($@"
            INSERT INTO FIN.BankAccount
                (UserID, OrganizationName, AccountName, Currency, CreditLimit, AccountBalance, AvailableCredit, CreatedAt, UpdatedAt, Activate)
            VALUES
                ({userId.Value}, {organizationName}, {accountName}, {currency}, {creditLimit}, {accountBalance}, {availableCredit}, {snapshotDate}, {DateTime.Now}, '1')");

								accountCount++;
							}
						}
						else if (headers.Contains("證券代號") || headers.Contains("持有單位"))
                        {
                            var rows = new List<Stock>();
                            while (csv.Read())
                            {
                                rows.Add(new Stock
                                {
                                    UserId = userId.Value,
                                    OrganizationName = Get(csv, headers, "機構名稱") ?? "",
                                    AccountName = Get(csv, headers, "帳戶名稱") ?? "",
                                    Code = Get(csv, headers, "證券代號") ?? "",
                                    Unit = (int)ParseDecimal(Get(csv, headers, "持有單位")),
                                    MarketValue = ParseDecimal(Get(csv, headers, "市值")),
                                    Cost = ParseDecimal(Get(csv, headers, "持有成本")),
                                    UnRealizedBenefit = ParseDecimal(Get(csv, headers, "未實現損益")),
                                    UnRealizedBenefitRatio = ParseDecimal(Get(csv, headers, "未實現損益報酬率")),
                                    CreatedAt = snapshotDate,
                                    UpdatedAt = DateTime.Now,
                                    Activate = "1",
                                });
                            }
                            db.Stocks.AddRange(rows);
                            stockCount += rows.Count;
                        }
                        else
                        {
                            skipped.Add(file.FileName + "（無法辨識檔案類型）");
                        }
                    }
                    catch (Exception ex)
                    {
                        logger.LogError(ex, "Finance upload failed for file {FileName} (userId={UserId})", file.FileName, userId);
                        errors.Add($"{file.FileName}: 檔案處理失敗，請確認格式是否正確");
                    }
                }

                await db.SaveChangesAsync();

                // 明細寫入後自動套用一次「自動分類規則」。這裡刻意排在 SaveChanges 之後，
                // 是為了讓新明細已經拿到 DetailID（規則執行結果的異動筆數要以 DetailID 去重）。
                // 規則本身出錯不應該讓整包上傳失敗——明細已經進資料庫了，改回報成訊息就好。
                int autoRuleMatched = 0, autoRuleChanged = 0, autoRuleCount = 0;
                string? autoRuleError = null;
                if (newDetails.Count > 0)
                {
                    try
                    {
                        var rules = await db.DetailAutoRules
                            .Include(r => r.Conditions)
                            .Where(r => r.UserId == userId && r.Activate && r.IsEnabled)
                            .OrderBy(r => r.Priority).ThenBy(r => r.RuleId)
                            .ToListAsync();

                        if (rules.Count > 0)
                        {
                            var result = FinanceAutoRuleEndpoints.RunRules(rules, newDetails);
                            autoRuleMatched = result.MatchedCount;
                            autoRuleChanged = result.ChangedCount;
                            autoRuleCount = rules.Count;

                            var now = DateTime.Now;
                            foreach (var rule in rules) rule.LastRunAt = now;
                            await db.SaveChangesAsync();
                        }
                    }
                    catch (Exception ex)
                    {
                        logger.LogError(ex, "Auto rule apply failed after upload (userId={UserId})", userId);
                        autoRuleError = "自動分類規則套用失敗，明細已寫入，請到「設定 → 自動分類規則」手動執行";
                    }
                }

                var message = $"明細 {detailCount} 筆、帳戶 {accountCount} 筆、庫存 {stockCount} 筆已寫入";
                if (autoRuleCount > 0)
                    message += $"；自動分類規則 {autoRuleCount} 條命中 {autoRuleMatched} 筆、異動 {autoRuleChanged} 筆";

                return Results.Ok(new
                {
                    message,
                    detailCount,
                    accountCount,
                    stockCount,
                    autoRuleCount,
                    autoRuleMatched,
                    autoRuleChanged,
                    autoRuleError,
                    skipped = skipped.Count > 0 ? skipped : null,
                    errors = errors.Count > 0 ? errors : null
                });
            });
        }

        private static string? Get(CsvReader csv, string[] headers, string header)
        {
            if (!headers.Contains(header)) return null;
            try { return csv.GetField(header); } catch { return null; }
        }

        private static decimal ParseDecimal(string? s) =>
            decimal.TryParse(s, out var v) ? v : 0;

        private static decimal? ParseDecimalNullable(string? s) =>
            decimal.TryParse(s, out var v) ? v : null;

        private static DateOnly ParseDateOnly(string? s, DateTime fallback) =>
            DateOnly.TryParse(s, out var d) ? d : DateOnly.FromDateTime(fallback);

        private static int? GetUserId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(idStr, out int id) ? id : null;
        }
    }
}
