using JazzerLifeApi;
using JazzerLifeApi.Models;
using Microsoft.EntityFrameworkCore;
using Hangfire;
using JazzerLifeApi.Endpoints;
using System.Security.Claims;
var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.ConfigureHttpJsonOptions(options =>
{
	options.SerializerOptions.PropertyNamingPolicy = null; // ���� camelCase�A���� C# ��l�ݩʦW��(PascalCase)
});
builder.Services.AddSwaggerGen();
builder.Services.AddDbContext<JazzerLifeContext>(options =>
	options.UseSqlServer(builder.Configuration.GetConnectionString("JazzerLife")));
builder.Services.AddHangfire(config => config
	.UseSqlServerStorage(builder.Configuration.GetConnectionString("JazzerLife")));
builder.Services.AddHangfireServer();
builder.Services.AddScoped<EconDataSyncRunner>();
builder.Services.AddAuthentication(Microsoft.AspNetCore.Authentication.Cookies.CookieAuthenticationDefaults.AuthenticationScheme)
	.AddCookie(options =>
	{
		options.Cookie.Name = "JazzerLifeAuth";
		options.Cookie.HttpOnly = true;              // 前端 JS 讀不到，防 XSS 竊取
		// 預設只允許 HTTPS 才會傳送 Cookie（Secure）；測試機沒有 HTTPS，
		// 可在 appsettings.json 加上 "Auth": { "RequireHttpsCookie": false } 改成 HTTP 也能傳送
		var requireHttpsCookie = builder.Configuration.GetValue<bool>("Auth:RequireHttpsCookie", true);
		options.Cookie.SecurePolicy = requireHttpsCookie
			? Microsoft.AspNetCore.Http.CookieSecurePolicy.Always
			: Microsoft.AspNetCore.Http.CookieSecurePolicy.SameAsRequest;
		options.Cookie.SameSite = SameSiteMode.Lax;
		options.ExpireTimeSpan = TimeSpan.FromHours(8);
		options.SlidingExpiration = true;
		options.LoginPath = "/signin.html";
		options.Events.OnRedirectToLogin = context =>
		{
			context.Response.StatusCode = 401; // API �I�s�ɦ^ 401�A�Ӥ��O������}(���O�������s���Ϊ�)
			return Task.CompletedTask;
		};
	});

builder.Services.AddAuthorization();
var app = builder.Build();

// Python 腳本資料夾路徑：正式機/測試機結構相同（<前綴>\JazzerLifes\scripts\），只有前綴不同，
// 從各機器自行維護的 appsettings.json 讀取 ScriptsRoot，未設定則退回舊有正式機路徑。
// PythonExePath 為選填：若該機器不用 venv，可直接指定系統 python.exe 路徑覆寫。
PythonRunner.Configure(app.Configuration["ScriptsRoot"], app.Configuration["PythonExePath"]);

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseStaticFiles();
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapDashboardEndpoints(); 
app.MapVehicleEndpoints();
app.MapMaintenanceEndpoints();
app.MapFuelEndpoints();
app.MapCycleEndpoints();
app.MapPartCategoryEndpoints();
app.MapFinanceOverviewEndpoints();
app.MapFinanceUploadEndpoints();
app.MapFinanceDetailEndpoints();
app.MapFinanceProjectEndpoints();
app.MapFinanceProjectAssetEndpoints();
app.MapFinanceProjectCashflowEndpoints();
app.MapFinanceProjectExpectedEndpoints();
app.MapFinanceBillEndpoints();
app.MapFinanceAccountEndpoints();
app.MapFinanceAccountCategoryEndpoints();
app.MapMacroIndicatorEndpoints();
app.MapMacroCompositeEndpoints();
app.MapMacroAlertEndpoints();
app.MapRentPropertyEndpoints();
app.MapRentRoomEndpoints();
app.MapRentBillEndpoints();
app.MapRentMasterMeterEndpoints();
app.MapTradeEndpoints();
app.MapStrategyTagEndpoints();
app.MapTradeImportEndpoints();
app.MapTradeAnalysisEndpoints();

var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};
app.MapGet("/weatherforecast", () =>
{
    var forecast =  Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    return forecast;
})
.WithName("GetWeatherForecast")
.WithOpenApi();

app.MapGet("/test-db", async (JazzerLifeContext db) =>
{
	var count = await db.Vehicles.CountAsync();
	return Results.Ok(new { VehicleCount = count });
});
app.MapGet("/api/vehicles", async (JazzerLifeContext db) =>
{
	var vehicles = await db.Vehicles.ToListAsync();
	return Results.Ok(vehicles);
});
app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
	Authorization = new[] { new HangfireAuthFilter() }
}); 
app.MapPost("/api/tasks/run-python", (string? note) =>
{
	var jobId = Guid.NewGuid().ToString();
	BackgroundJob.Enqueue(() => PythonRunner.RunTestTask(jobId));
	return Results.Ok(new { message = "���Ȥw�ƤJ��C", jobId });
});

// 總經指標資料同步：每日排程 + 手動觸發（供測試/立即更新使用）
RecurringJob.AddOrUpdate<EconDataSyncRunner>(
	"macro-daily-sync",
	job => job.SyncAllAsync(),
	Cron.Daily(6));

app.MapPost("/api/tasks/run-macro-sync", (ClaimsPrincipal user) =>
{
	if (user.Identity?.IsAuthenticated != true)
		return Results.Json(new { message = "未登入" }, statusCode: 401);

	var jobId = BackgroundJob.Enqueue<EconDataSyncRunner>(job => job.SyncAllAsync());
	return Results.Ok(new { message = "總經資料同步任務已排入佇列", jobId });
});

app.MapReportEndpoints();
app.MapAuthEndpoints();
app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
