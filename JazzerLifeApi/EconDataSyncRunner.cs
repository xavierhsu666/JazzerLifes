using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using JazzerLifeApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace JazzerLifeApi
{
    /// <summary>
    /// 總經指標資料同步：呼叫 Python 腳本擷取 FRED / 台灣官方開放資料，寫入 MACRO.EconIndicatorValue。
    /// 供 Hangfire 排程（RecurringJob）與手動觸發 endpoint 呼叫，注入為 Scoped 服務。
    /// </summary>
    public class EconDataSyncRunner
    {
        private const int PythonTimeoutMs = 60000;

        private readonly JazzerLifeContext _db;
        private readonly IConfiguration _config;
        private readonly ILogger<EconDataSyncRunner> _logger;

        public EconDataSyncRunner(JazzerLifeContext db, IConfiguration config, ILogger<EconDataSyncRunner> logger)
        {
            _db = db;
            _config = config;
            _logger = logger;
        }

        private record FetchResultDto(
            [property: JsonPropertyName("code")] string Code,
            [property: JsonPropertyName("periodDate")] string PeriodDate,
            [property: JsonPropertyName("value")] decimal Value,
            [property: JsonPropertyName("releaseDate")] string? ReleaseDate
        );

        /// <summary>
        /// Hangfire 排程與手動觸發共用的進入點：依序同步 FRED、台灣官方資料，單一來源失敗不影響另一來源。
        ///
        /// 每個步驟仍然各自接住例外（一個來源掛掉不該讓其他來源不同步），但**全部跑完後會把收集到的例外丟出去**。
        /// 原本是只記 log 不往上丟，Hangfire 收不到例外就一律把 job 標成 Succeeded、也不會重試，
        /// 於是「四個來源全失敗」和「四個來源全成功」在 Dashboard 上長得一模一樣；IIS 底下又看不到 Console log，
        /// 實務上等於完全無法察覺同步失敗。現在有任何步驟失敗就讓 job 標 Failed，重試與通知才有依據。
        /// </summary>
        public async Task SyncAllAsync()
        {
            var failures = new List<Exception>();

            async Task RunStepAsync(string stepName, Func<Task> step)
            {
                try
                {
                    await step();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "{Step}發生未預期例外", stepName);
                    failures.Add(new InvalidOperationException($"{stepName}失敗：{ex.Message}", ex));
                }
            }

            await RunStepAsync("FRED 指標同步", SyncFredAsync);
            await RunStepAsync("台灣官方指標同步", SyncTwGovAsync);
            await RunStepAsync("Yahoo Finance 市場指標同步", SyncYahooAsync);
            await RunStepAsync("示警規則評估", EvaluateAlertRulesAsync);

            if (failures.Count > 0)
                throw new AggregateException($"總經資料同步有 {failures.Count} 個步驟失敗", failures);
        }

        /// <summary>資料同步完成後比對使用者自訂門檻，觸發者寫入 EconAlertLog。同一規則同日最多觸發一次，避免灌爆通知。</summary>
        public async Task EvaluateAlertRulesAsync()
        {
            var rules = await _db.EconAlertRules
                .Include(r => r.Indicator)
                .Where(r => r.IsActive)
                .ToListAsync();

            if (rules.Count == 0)
                return;

            int triggeredCount = 0;
            var today = DateTime.Now.Date;

            foreach (var rule in rules)
            {
                try
                {
                    if (rule.LastTriggeredAt.HasValue && rule.LastTriggeredAt.Value.Date >= today)
                        continue; // 同日已觸發過，略過

                    var latest = await _db.EconIndicatorValues
                        .Where(v => v.IndicatorId == rule.IndicatorId)
                        .OrderByDescending(v => v.PeriodDate)
                        .FirstOrDefaultAsync();

                    if (latest == null)
                        continue;

                    bool isTriggered = rule.Operator switch
                    {
                        ">" => latest.Value > rule.Threshold,
                        ">=" => latest.Value >= rule.Threshold,
                        "<" => latest.Value < rule.Threshold,
                        "<=" => latest.Value <= rule.Threshold,
                        _ => false,
                    };

                    if (!isTriggered)
                        continue;

                    var indicatorName = rule.Indicator?.Name ?? rule.IndicatorId.ToString();
                    _db.EconAlertLogs.Add(new EconAlertLog
                    {
                        RuleId = rule.RuleId,
                        TriggeredAt = DateTime.Now,
                        Value = latest.Value,
                        Message = $"{indicatorName} 最新值 {latest.Value} {rule.Operator} {rule.Threshold}",
                        IsRead = false,
                    });
                    rule.LastTriggeredAt = DateTime.Now;
                    triggeredCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "評估示警規則 {RuleId} 時發生例外", rule.RuleId);
                }
            }

            if (triggeredCount > 0)
                await _db.SaveChangesAsync();

            _logger.LogInformation("示警規則評估完成：共觸發 {Count} 筆", triggeredCount);
        }

        public async Task SyncFredAsync()
        {
            var apiKey = _config["FredApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                _logger.LogWarning("appsettings.json 未設定 FredApiKey，略過 FRED 同步");
                return;
            }

            var indicators = await _db.EconIndicators
                .Where(i => i.Source == "FRED" && i.IsActive && i.SourceSeriesId != null)
                .Select(i => new { i.Code, i.SourceSeriesId })
                .ToListAsync();

            if (indicators.Count == 0)
            {
                _logger.LogInformation("沒有啟用中的 FRED 指標，略過同步");
                return;
            }

            var argsJson = JsonSerializer.Serialize(indicators.Select(i => new { code = i.Code, seriesId = i.SourceSeriesId }));

            string output;
            try
            {
                output = PythonRunner.RunScript("fetch_fred.py", new[] { apiKey, argsJson }, PythonTimeoutMs);
            }
            catch (Exception ex)
            {
                // 往上丟給 SyncAllAsync 收集：Process.Start 因權限問題瞬間失敗時，
                // 原本只記 log 就 return，job 照樣被標成 Succeeded，失敗完全看不出來。
                _logger.LogError(ex, "fetch_fred.py 執行失敗");
                throw;
            }

            await UpsertValuesAsync(ParseFetchResults(output, "fetch_fred.py"));
        }

        public async Task SyncTwGovAsync()
        {
            var codes = await _db.EconIndicators
                .Where(i => i.Source == "TW_GOV" && i.IsActive)
                .Select(i => i.Code)
                .ToListAsync();

            if (codes.Count == 0)
            {
                _logger.LogInformation("沒有啟用中的台灣官方指標，略過同步");
                return;
            }

            var argsJson = JsonSerializer.Serialize(codes);

            string output;
            try
            {
                output = PythonRunner.RunScript("fetch_tw_gov.py", new[] { argsJson }, PythonTimeoutMs);
            }
            catch (Exception ex)
            {
                // 往上丟給 SyncAllAsync 收集：Process.Start 因權限問題瞬間失敗時，
                // 原本只記 log 就 return，job 照樣被標成 Succeeded，失敗完全看不出來。
                _logger.LogError(ex, "fetch_tw_gov.py 執行失敗");
                throw;
            }

            await UpsertValuesAsync(ParseFetchResults(output, "fetch_tw_gov.py"));
        }

        /// <summary>市場資產指標（黃金/費半/台股等）：來源 Yahoo Finance Chart API，無需 API Key，非官方 SLA，
        /// 單一symbol失敗不影響其他，fetch_yahoo.py 內已處理逾時與連線例外。</summary>
        public async Task SyncYahooAsync()
        {
            var indicators = await _db.EconIndicators
                .Where(i => i.Source == "YAHOO" && i.IsActive && i.SourceSeriesId != null)
                .Select(i => new { i.Code, i.SourceSeriesId })
                .ToListAsync();

            if (indicators.Count == 0)
            {
                _logger.LogInformation("沒有啟用中的 Yahoo Finance 指標，略過同步");
                return;
            }

            var argsJson = JsonSerializer.Serialize(indicators.Select(i => new { code = i.Code, symbol = i.SourceSeriesId }));

            string output;
            try
            {
                output = PythonRunner.RunScript("fetch_yahoo.py", new[] { argsJson }, PythonTimeoutMs);
            }
            catch (Exception ex)
            {
                // 往上丟給 SyncAllAsync 收集：Process.Start 因權限問題瞬間失敗時，
                // 原本只記 log 就 return，job 照樣被標成 Succeeded，失敗完全看不出來。
                _logger.LogError(ex, "fetch_yahoo.py 執行失敗");
                throw;
            }

            await UpsertValuesAsync(ParseFetchResults(output, "fetch_yahoo.py"));
        }

        private List<FetchResultDto> ParseFetchResults(string output, string scriptName)
        {
            if (string.IsNullOrWhiteSpace(output))
                return new List<FetchResultDto>();

            try
            {
                return JsonSerializer.Deserialize<List<FetchResultDto>>(output) ?? new List<FetchResultDto>();
            }
            catch (JsonException ex)
            {
                // 同理：腳本回傳爛資料時只記 log 會讓這次同步「靜悄悄地什麼都沒做」，往上丟才會標 Failed。
                _logger.LogError(ex, "{Script} 回傳內容不是合法 JSON，原始輸出：{Output}", scriptName, output);
                throw;
            }
        }

        private async Task UpsertValuesAsync(List<FetchResultDto> results)
        {
            if (results.Count == 0)
                return;

            var codes = results.Select(r => r.Code).Distinct().ToList();
            var indicatorsByCode = await _db.EconIndicators
                .Where(i => codes.Contains(i.Code))
                .ToDictionaryAsync(i => i.Code);

            int inserted = 0, updated = 0, skipped = 0;

            foreach (var r in results)
            {
                try
                {
                    if (!indicatorsByCode.TryGetValue(r.Code, out var indicator))
                    {
                        _logger.LogWarning("找不到指標定義：{Code}，略過該筆資料", r.Code);
                        skipped++;
                        continue;
                    }

                    if (!DateOnly.TryParse(r.PeriodDate, out var periodDate))
                    {
                        _logger.LogWarning("指標 {Code} 的 periodDate 格式異常：{PeriodDate}，略過該筆資料", r.Code, r.PeriodDate);
                        skipped++;
                        continue;
                    }

                    DateOnly? releaseDate = null;
                    if (!string.IsNullOrWhiteSpace(r.ReleaseDate) && DateOnly.TryParse(r.ReleaseDate, out var parsedReleaseDate))
                        releaseDate = parsedReleaseDate;

                    var existing = await _db.EconIndicatorValues
                        .FirstOrDefaultAsync(v => v.IndicatorId == indicator.IndicatorId && v.PeriodDate == periodDate);

                    if (existing == null)
                    {
                        _db.EconIndicatorValues.Add(new EconIndicatorValue
                        {
                            IndicatorId = indicator.IndicatorId,
                            PeriodDate = periodDate,
                            Value = r.Value,
                            ReleaseDate = releaseDate,
                        });
                        inserted++;
                    }
                    else if (existing.Value != r.Value)
                    {
                        existing.Value = r.Value;
                        existing.ReleaseDate = releaseDate ?? existing.ReleaseDate;
                        existing.UpdatedAt = DateTime.Now;
                        updated++;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "寫入指標 {Code} 資料時發生例外", r.Code);
                    skipped++;
                }
            }

            await _db.SaveChangesAsync();
            _logger.LogInformation("總經資料同步完成：新增 {Inserted} 筆、更新 {Updated} 筆、略過 {Skipped} 筆", inserted, updated, skipped);
        }
    }
}
