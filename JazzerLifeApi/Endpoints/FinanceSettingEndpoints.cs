using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using JazzerLifeApi.Models;

namespace JazzerLifeApi.Endpoints
{
    /// <summary>
    /// Finance 一般設定（FIN.UserSetting）。
    ///
    /// 目前有「集保存摺 PDF 開啟密碼」與「每月結帳日」。密碼是敏感資料（通常是身分證字號），因此：
    ///   1. 存進資料庫前先用 ASP.NET Core Data Protection 加密，DB 內看到的是密文。
    ///   2. API 永遠不回傳密碼本身，只回傳 HasPassword 布林值，避免 XSS 或誤把明文帶到前端。
    /// 注意：Data Protection 金鑰若遺失（例如換機器、金鑰資料夾被清掉），舊密文就解不開，
    ///       此時 API 會回報需要重新設定密碼，而不是丟例外。
    /// </summary>
    public static class FinanceSettingEndpoints
    {
        public const string TdccPasswordKey = "tdcc.pdf.password";
        public const string ClosingDayKey = "finance.closing.day";   // 每月結帳日（1~31）
        private const string ProtectorPurpose = "JazzerLife.Finance.UserSetting";

        public static void MapFinanceSettingEndpoints(this WebApplication app)
        {
            // 取得設定狀態（不含密碼明文）
            app.MapGet("/api/finance/settings", async (ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var settings = await db.UserSettings
                    .AsNoTracking()
                    .Where(s => s.UserId == userId)
                    .ToListAsync();

                var tdcc = settings.FirstOrDefault(s => s.SettingKey == TdccPasswordKey);
                var closingDay = settings.FirstOrDefault(s => s.SettingKey == ClosingDayKey);

                return Results.Ok(new
                {
                    TdccPasswordSaved = !string.IsNullOrEmpty(tdcc?.SettingValue),
                    TdccPasswordUpdatedAt = tdcc?.UpdatedAt,
                    // 沒設定就回 null，前端顯示「尚未設定」而不是假裝有預設值
                    ClosingDay = int.TryParse(closingDay?.SettingValue, out var d) ? d : (int?)null
                });
            });

            // 儲存／清除集保 PDF 密碼
            app.MapPut("/api/finance/settings/tdcc-password", async (
                TdccPasswordRequest body,
                ClaimsPrincipal user,
                JazzerLifeContext db,
                IDataProtectionProvider protectionProvider) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var setting = await db.UserSettings
                    .FirstOrDefaultAsync(s => s.UserId == userId && s.SettingKey == TdccPasswordKey);

                // 傳空字串代表「清除已儲存的密碼」
                if (string.IsNullOrEmpty(body.Password))
                {
                    if (setting != null)
                    {
                        db.UserSettings.Remove(setting);
                        await db.SaveChangesAsync();
                    }
                    return Results.Ok(new { message = "已清除儲存的密碼", TdccPasswordSaved = false });
                }

                var cipher = protectionProvider.CreateProtector(ProtectorPurpose).Protect(body.Password);
                var now = DateTime.Now;

                if (setting == null)
                {
                    db.UserSettings.Add(new UserSetting
                    {
                        UserId = userId.Value,
                        SettingKey = TdccPasswordKey,
                        SettingValue = cipher,
                        IsEncrypted = true,
                        CreatedAt = now,
                        UpdatedAt = now
                    });
                }
                else
                {
                    setting.SettingValue = cipher;
                    setting.IsEncrypted = true;
                    setting.UpdatedAt = now;
                }

                await db.SaveChangesAsync();
                return Results.Ok(new { message = "密碼已儲存", TdccPasswordSaved = true });
            });

            // 儲存／清除每月結帳日
            app.MapPut("/api/finance/settings/closing-day", async (
                ClosingDayRequest body, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var setting = await db.UserSettings
                    .FirstOrDefaultAsync(s => s.UserId == userId && s.SettingKey == ClosingDayKey);

                // 傳 null 代表清除設定
                if (body.Day == null)
                {
                    if (setting != null)
                    {
                        db.UserSettings.Remove(setting);
                        await db.SaveChangesAsync();
                    }
                    return Results.Ok(new { message = "已清除結帳日設定", ClosingDay = (int?)null });
                }

                // 只收 1~28：29~31 在部分月份不存在，提醒日會整個月不觸發
                if (body.Day < 1 || body.Day > 28)
                    return Results.BadRequest(new { message = "結帳日請設定 1~28 之間（29 之後的日期在二月會不存在）" });

                var now = DateTime.Now;
                if (setting == null)
                {
                    db.UserSettings.Add(new UserSetting
                    {
                        UserId = userId.Value,
                        SettingKey = ClosingDayKey,
                        SettingValue = body.Day.Value.ToString(),
                        IsEncrypted = false,
                        CreatedAt = now,
                        UpdatedAt = now
                    });
                }
                else
                {
                    setting.SettingValue = body.Day.Value.ToString();
                    setting.IsEncrypted = false;
                    setting.UpdatedAt = now;
                }

                await db.SaveChangesAsync();
                return Results.Ok(new { message = $"結帳日已設定為每月 {body.Day} 日", ClosingDay = body.Day });
            });

            // 每月結帳檢查清單：麻布資料是否已上傳、集保存摺是否已上傳並完成結算
            app.MapGet("/api/finance/monthly-checklist", async (string? month, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var yearMonth = string.IsNullOrWhiteSpace(month) ? DateTime.Today.ToString("yyyy-MM") : month;
                if (!DateTime.TryParse(yearMonth + "-01", out var monthStart))
                    return Results.BadRequest(new { message = "月份格式錯誤，請用 yyyy-MM" });
                var monthEnd = monthStart.AddMonths(1);

                // 麻布 CSV 上傳時，明細與帳戶餘額的 CreatedAt 都會寫成使用者選的快照日，
                // 因此用「該月有沒有這些資料」來判斷當月資料是否已匯入
                var detailCount = await db.Details
                    .CountAsync(d => d.UserId == userId && d.Activate == "1"
                        && d.CreatedAt >= monthStart && d.CreatedAt < monthEnd);

                var settlementAccounts = await db.StockSettlements
                    .Where(x => x.UserId == userId)
                    .Select(x => new { x.OrganizationName, x.AccountName })
                    .Distinct()
                    .ToListAsync();

                var accounts = await db.BankAccounts
                    .Where(a => a.UserId == userId && a.Activate == "1"
                        && a.CreatedAt >= monthStart && a.CreatedAt < monthEnd)
                    .Select(a => new { a.OrganizationName, a.AccountName })
                    .ToListAsync();

                // 集保結算自己也會寫一筆 BankAccount，扣掉它才是真正來自麻布 CSV 的帳戶餘額
                var accountCount = accounts.Count(a =>
                    !settlementAccounts.Any(s => s.OrganizationName == a.OrganizationName && s.AccountName == a.AccountName));

                var imports = await db.StockPdfImports
                    .Where(i => i.UserId == userId && i.YearMonth == yearMonth)
                    .Select(i => new { i.ImportId, i.SettlementId, i.TotalMarketValue })
                    .ToListAsync();

                var settlement = await db.StockSettlements
                    .FirstOrDefaultAsync(x => x.UserId == userId && x.YearMonth == yearMonth);

                // 結算後又上傳／刪除過存摺，等於結算結果已過期，視同尚未完成
                var needsResettle = settlement != null &&
                    (imports.Count != settlement.ImportCount || imports.Any(i => i.SettlementId != settlement.SettlementId));

                var closingDaySetting = await db.UserSettings
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.UserId == userId && s.SettingKey == ClosingDayKey);
                var closingDay = int.TryParse(closingDaySetting?.SettingValue, out var cd) ? cd : (int?)null;

                int? daysUntilClosing = null;
                if (closingDay != null)
                {
                    var closingDate = new DateTime(monthStart.Year, monthStart.Month, Math.Min(closingDay.Value, DateTime.DaysInMonth(monthStart.Year, monthStart.Month)));
                    daysUntilClosing = (int)(closingDate.Date - DateTime.Today).TotalDays; // 負數代表已過結帳日
                }

                return Results.Ok(new
                {
                    yearMonth,
                    closingDay,
                    daysUntilClosing,
                    items = new object[]
                    {
                        new
                        {
                            key = "detail",
                            label = "麻布資料已上傳（收支明細）",
                            done = detailCount > 0,
                            detail = detailCount > 0 ? $"{detailCount} 筆明細" : "本月尚未匯入明細"
                        },
                        new
                        {
                            key = "account",
                            label = "麻布資料已上傳（帳戶餘額）",
                            done = accountCount > 0,
                            detail = accountCount > 0 ? $"{accountCount} 個帳戶" : "本月尚未匯入帳戶餘額"
                        },
                        new
                        {
                            key = "tdccImport",
                            label = "集保存摺已上傳",
                            done = imports.Count > 0,
                            detail = imports.Count > 0 ? $"{imports.Count} 份、市值 {imports.Sum(i => i.TotalMarketValue):N0}" : "本月尚未上傳存摺"
                        },
                        new
                        {
                            key = "tdccSettle",
                            label = "集保存摺已結算",
                            done = settlement != null && !needsResettle,
                            detail = settlement == null
                                ? "尚未結算"
                                : (needsResettle ? "結算後庫存有異動，請重新結算" : $"已結算，市值 {settlement.TotalMarketValue:N0}")
                        }
                    }
                });
            });
        }

        /// <summary>
        /// 讀出已儲存的集保 PDF 密碼明文，供上傳／辨識時使用。
        /// 解密失敗（金鑰換過）時回 null，讓呼叫端當成「沒設定密碼」處理即可。
        /// </summary>
        public static async Task<string?> GetTdccPasswordAsync(
            int userId, JazzerLifeContext db, IDataProtectionProvider protectionProvider, ILogger? logger = null)
        {
            var setting = await db.UserSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.UserId == userId && s.SettingKey == TdccPasswordKey);

            if (string.IsNullOrEmpty(setting?.SettingValue)) return null;
            if (!setting.IsEncrypted) return setting.SettingValue;

            try
            {
                return protectionProvider.CreateProtector(ProtectorPurpose).Unprotect(setting.SettingValue);
            }
            catch (Exception ex)
            {
                logger?.LogWarning(ex, "集保 PDF 密碼解密失敗（Data Protection 金鑰可能已更換），userId={UserId}", userId);
                return null;
            }
        }

        private static int? GetUserId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(idStr, out int id) ? id : null;
        }

        public record TdccPasswordRequest(string? Password);

        public record ClosingDayRequest(int? Day);
    }
}
