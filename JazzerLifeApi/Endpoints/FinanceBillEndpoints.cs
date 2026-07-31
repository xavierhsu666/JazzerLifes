using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using JazzerLifeApi.Models;

namespace JazzerLifeApi.Endpoints
{
    public static class FinanceBillEndpoints
    {
        public static void MapFinanceBillEndpoints(this WebApplication app)
        {
            // 查詢帳單清單
            app.MapGet("/api/finance/bills", async (ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var bills = await db.Bills
                    .Where(b => b.UserId == userId && b.Activate == "1")
                    .OrderByDescending(b => b.CreatedAt)
                    .Select(b => new
                    {
                        b.BillId,
                        b.BillProjectId,
                        b.BillName,
                        b.Frequency,
                        b.BillStartTime,
                        b.BillEndTime,
                        b.BillAmount,
                        b.Note
                    })
                    .ToListAsync();

                return Results.Ok(bills);
            });

            // 新增帳單
            app.MapPost("/api/finance/bills", async (BillCreateRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                if (string.IsNullOrWhiteSpace(req.BillName) || string.IsNullOrWhiteSpace(req.Frequency))
                    return Results.BadRequest(new { message = "請填寫帳單名稱與頻率規則" });

                var bill = new Bill
                {
                    UserId = userId.Value,
                    BillProjectId = req.BillProjectId,
                    BillName = req.BillName,
                    Frequency = req.Frequency,
                    BillStartTime = req.BillStartTime ?? DateTime.Now,
                    BillEndTime = req.BillEndTime,
                    BillAmount = req.BillAmount,
                    Note = req.Note,
                    Activate = "1",
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now,
                };
                db.Bills.Add(bill);
                await db.SaveChangesAsync();

                return Results.Ok(new { message = "已新增帳單", billId = bill.BillId });
            });

            // 編輯帳單
            app.MapPut("/api/finance/bills/{billId:int}", async (int billId, BillCreateRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                if (string.IsNullOrWhiteSpace(req.BillName) || string.IsNullOrWhiteSpace(req.Frequency))
                    return Results.BadRequest(new { message = "請填寫帳單名稱與頻率規則" });

                // 需同時確認 UserId 相符，避免跨帳號用猜測的 billId 改到別人的帳單
                var bill = await db.Bills.FirstOrDefaultAsync(b => b.BillId == billId && b.UserId == userId && b.Activate == "1");
                if (bill == null) return Results.Json(new { message = "找不到帳單或無權限" }, statusCode: 403);

                bill.BillProjectId = req.BillProjectId;
                bill.BillName = req.BillName;
                bill.Frequency = req.Frequency;
                bill.BillStartTime = req.BillStartTime ?? bill.BillStartTime;
                bill.BillEndTime = req.BillEndTime;
                bill.BillAmount = req.BillAmount;
                bill.Note = req.Note;
                bill.UpdatedAt = DateTime.Now;

                await db.SaveChangesAsync();
                return Results.Ok(new { message = "已更新帳單" });
            });

            // 刪除帳單（軟刪除，沿用專案管理同一套 Activate 欄位慣例，保留歷史資料不影響已展開的每月支出估算記錄）
            app.MapDelete("/api/finance/bills/{billId:int}", async (int billId, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var bill = await db.Bills.FirstOrDefaultAsync(b => b.BillId == billId && b.UserId == userId && b.Activate == "1");
                if (bill == null) return Results.Json(new { message = "找不到帳單或無權限" }, statusCode: 403);

                bill.Activate = "0";
                bill.UpdatedAt = DateTime.Now;
                await db.SaveChangesAsync();

                return Results.Ok(new { message = "已刪除帳單" });
            });
        }

        private static int? GetUserId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(idStr, out int id) ? id : null;
        }
    }

    public record BillCreateRequest(string? BillProjectId, string BillName, string Frequency, decimal BillAmount, DateTime? BillStartTime, DateTime? BillEndTime, string? Note);
}
