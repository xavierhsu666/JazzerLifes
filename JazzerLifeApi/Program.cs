using JazzerLifeApi;
using JazzerLifeApi.Models;
using Microsoft.EntityFrameworkCore;
using Hangfire;
using JazzerLifeApi.Endpoints;
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
builder.Services.AddHangfireServer(); builder.Services.AddAuthentication(Microsoft.AspNetCore.Authentication.Cookies.CookieAuthenticationDefaults.AuthenticationScheme)
	.AddCookie(options =>
	{
		options.Cookie.Name = "JazzerLifeAuth";
		options.Cookie.HttpOnly = true;              // JS Ū����A�� XSS �Ѩ�
		options.Cookie.SecurePolicy = Microsoft.AspNetCore.Http.CookieSecurePolicy.Always; // �u���\ HTTPS �ǿ�
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
app.MapFinanceOverviewEndpoints();
app.MapFinanceUploadEndpoints();
app.MapFinanceDetailEndpoints();
app.MapFinanceProjectEndpoints();
app.MapFinanceProjectAssetEndpoints();
app.MapFinanceProjectCashflowEndpoints();
app.MapFinanceProjectExpectedEndpoints();
app.MapFinanceBillEndpoints();
app.MapFinanceAccountEndpoints();

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
app.MapReportEndpoints();
app.MapAuthEndpoints();
app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
