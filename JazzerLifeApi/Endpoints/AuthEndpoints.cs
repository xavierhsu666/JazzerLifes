using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using System.Security.Claims;
using JazzerLifeApi.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

namespace JazzerLifeApi.Endpoints
{
	public static class AuthEndpoints
	{
		public static void MapAuthEndpoints(this WebApplication app)
		{
			app.MapPost("/api/auth/login", async (LoginRequest req, JazzerLifeContext db, HttpContext http) =>
			{
				if (string.IsNullOrWhiteSpace(req.Account) || string.IsNullOrWhiteSpace(req.Password))
					return Results.BadRequest(new { message = "帳號或密碼不可為空" });

				var user = await db.Users.FirstOrDefaultAsync(u => u.UserName == req.Account);

				if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
					return Results.Json(new { message = "帳號或密碼錯誤" }, statusCode: 401);

				var claims = new List<Claim>
				{
					new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
					new Claim(ClaimTypes.Name, user.UserName)
				};
				var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
				var principal = new ClaimsPrincipal(identity);

				await http.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);

				return Results.Ok(new { message = "登入成功", userId = user.UserId, account = user.UserName });
			});

			app.MapPost("/api/auth/logout", async (HttpContext http) =>
			{
				await http.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
				return Results.Ok(new { message = "已登出" });
			});

			app.MapGet("/api/auth/me", (ClaimsPrincipal user) =>
			{
				if (!user.Identity?.IsAuthenticated ?? true)
					return Results.Json(new { message = "未登入" }, statusCode: 401);

				return Results.Ok(new
				{
					userId = user.FindFirstValue(ClaimTypes.NameIdentifier),
					account = user.FindFirstValue(ClaimTypes.Name)
				});
			});
		}
	}

	public record LoginRequest(string Account, string Password);
}