using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using JazzerLifeApi.Models;

namespace JazzerLifeApi.Endpoints
{
    /// <summary>
    /// Finance 一般設定（FIN.UserSetting）。
    ///
    /// 目前只有「集保存摺 PDF 開啟密碼」。這是敏感資料（通常是身分證字號），因此：
    ///   1. 存進資料庫前先用 ASP.NET Core Data Protection 加密，DB 內看到的是密文。
    ///   2. API 永遠不回傳密碼本身，只回傳 HasPassword 布林值，避免 XSS 或誤把明文帶到前端。
    /// 注意：Data Protection 金鑰若遺失（例如換機器、金鑰資料夾被清掉），舊密文就解不開，
    ///       此時 API 會回報需要重新設定密碼，而不是丟例外。
    /// </summary>
    public static class FinanceSettingEndpoints
    {
        public const string TdccPasswordKey = "tdcc.pdf.password";
        private const string ProtectorPurpose = "JazzerLife.Finance.UserSetting";

        public static void MapFinanceSettingEndpoints(this WebApplication app)
        {
            // 取得設定狀態（不含密碼明文）
            app.MapGet("/api/finance/settings", async (ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var tdcc = await db.UserSettings
                    .FirstOrDefaultAsync(s => s.UserId == userId && s.SettingKey == TdccPasswordKey);

                return Results.Ok(new
                {
                    TdccPasswordSaved = !string.IsNullOrEmpty(tdcc?.SettingValue),
                    TdccPasswordUpdatedAt = tdcc?.UpdatedAt
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
    }
}
