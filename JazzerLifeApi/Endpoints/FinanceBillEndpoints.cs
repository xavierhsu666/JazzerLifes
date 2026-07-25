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

                return Results.Ok(new { message = "已新增帳單" });
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
