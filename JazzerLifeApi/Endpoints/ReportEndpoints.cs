using Microsoft.AspNetCore.Builder;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using System.Linq;
using System;

namespace JazzerLifeApi.Endpoints
{
	public static class ReportEndpoints
	{
		public static void MapReportEndpoints(this WebApplication app)
		{
			app.MapPost("/api/reports/query", async (ReportQueryRequest req, IConfiguration config) =>
			{
				if (!SqlGuard.IsSafeSelectOnly(req.Sql))
					return Results.BadRequest("僅允許單一 SELECT 查詢");

				var connStr = config.GetConnectionString("JazzerLife");
				await using var conn = new SqlConnection(connStr);
				await using var cmd = new SqlCommand($"SELECT TOP 5000 * FROM ({req.Sql}) AS sub", conn)
				{
					CommandTimeout = 30
				};

				await conn.OpenAsync();
				await using var reader = await cmd.ExecuteReaderAsync();
				var results = new List<Dictionary<string, object>>();
				while (await reader.ReadAsync())
				{
					var row = new Dictionary<string, object>();
					for (int i = 0; i < reader.FieldCount; i++)
						row[reader.GetName(i)] = reader.GetValue(i);
					results.Add(row);
				}

				Console.WriteLine($"[{DateTime.Now}] Report query executed: {req.Sql}");
				return Results.Ok(results);
			});
		}
	}

	public record ReportQueryRequest(string Sql);

	public static class SqlGuard
	{
		private static readonly string[] Blocklist =
		{
			"INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE",
			"EXEC", "EXECUTE", "GRANT", "REVOKE", "MERGE", "CREATE",
			"SP_", "XP_", "--", "/*", ";"
		};

		public static bool IsSafeSelectOnly(string sql)
		{
			var trimmed = sql.Trim();
			if (!trimmed.StartsWith("SELECT", StringComparison.OrdinalIgnoreCase))
				return false;

			var upper = trimmed.ToUpperInvariant();
			return !Blocklist.Any(word => upper.Contains(word));
		}
	}
}