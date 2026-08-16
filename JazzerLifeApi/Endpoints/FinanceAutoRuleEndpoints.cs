using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using JazzerLifeApi.Models;

namespace JazzerLifeApi.Endpoints
{
    /// <summary>
    /// 財務明細「自動分類規則」的管理與執行。
    /// 比對/套用的判斷邏輯集中在 <see cref="FinanceAutoRuleEngine"/>，
    /// 這裡只負責權限、資料存取與 HTTP 介面。
    /// </summary>
    public static class FinanceAutoRuleEndpoints
    {
        // 預覽時最多回傳幾列明細。命中總數另外用 totalCount 回報，
        // 避免規則寫得太寬時把幾萬筆明細整包丟回前端
        private const int PreviewLimit = 300;

        public static void MapFinanceAutoRuleEndpoints(this WebApplication app)
        {
            // 查詢全部規則（含條件），依執行順序排序
            app.MapGet("/api/finance/auto-rules", async (ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var rules = await db.DetailAutoRules
                    .Include(r => r.Conditions)
                    .Where(r => r.UserId == userId && r.Activate)
                    .OrderBy(r => r.Priority).ThenBy(r => r.RuleId)
                    .ToListAsync();

                return Results.Ok(rules.Select(ToDto).ToList());
            });

            // 新增規則
            app.MapPost("/api/finance/auto-rules", async (AutoRuleRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var invalid = Validate(req);
                if (invalid != null) return Results.BadRequest(new { message = invalid });

                // 新規則預設排在最後面（順序決定同欄位衝突時誰的值最後生效）
                var maxPriority = await db.DetailAutoRules
                    .Where(r => r.UserId == userId && r.Activate)
                    .Select(r => (int?)r.Priority)
                    .MaxAsync() ?? -1;

                var rule = new DetailAutoRule
                {
                    UserId = userId.Value,
                    RuleName = req.RuleName.Trim(),
                    Priority = maxPriority + 1,
                    IsEnabled = req.IsEnabled ?? true,
                    Activate = true,
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now,
                };
                ApplyActionFields(rule, req);
                ApplyConditions(rule, req);

                db.DetailAutoRules.Add(rule);
                await db.SaveChangesAsync();

                return Results.Ok(new { message = "已新增規則", ruleId = rule.RuleId });
            });

            // 編輯規則（條件整批取代）
            app.MapPut("/api/finance/auto-rules/{ruleId:int}", async (int ruleId, AutoRuleRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var invalid = Validate(req);
                if (invalid != null) return Results.BadRequest(new { message = invalid });

                var rule = await db.DetailAutoRules
                    .Include(r => r.Conditions)
                    .FirstOrDefaultAsync(r => r.RuleId == ruleId && r.UserId == userId && r.Activate);
                if (rule == null) return Results.Json(new { message = "找不到規則" }, statusCode: 404);

                rule.RuleName = req.RuleName.Trim();
                if (req.IsEnabled.HasValue) rule.IsEnabled = req.IsEnabled.Value;
                rule.UpdatedAt = DateTime.Now;
                ApplyActionFields(rule, req);

                db.DetailAutoRuleConditions.RemoveRange(rule.Conditions);
                rule.Conditions.Clear();
                ApplyConditions(rule, req);

                await db.SaveChangesAsync();
                return Results.Ok(new { message = "已更新規則" });
            });

            // 刪除規則（軟刪除，比照專案/帳單的慣例）
            app.MapDelete("/api/finance/auto-rules/{ruleId:int}", async (int ruleId, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var rule = await db.DetailAutoRules.FirstOrDefaultAsync(r => r.RuleId == ruleId && r.UserId == userId && r.Activate);
                if (rule == null) return Results.Json(new { message = "找不到規則" }, statusCode: 404);

                rule.Activate = false;
                rule.UpdatedAt = DateTime.Now;
                await db.SaveChangesAsync();

                // 刪除規則不會回溯撤銷它先前已經套用到明細上的分類/標籤，
                // 那些值已經是明細本身的資料，要改請直接編輯明細
                return Results.Ok(new { message = "已刪除規則（不影響先前已套用的明細）" });
            });

            // 單獨開啟/關閉規則
            app.MapPost("/api/finance/auto-rules/{ruleId:int}/toggle", async (int ruleId, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var rule = await db.DetailAutoRules.FirstOrDefaultAsync(r => r.RuleId == ruleId && r.UserId == userId && r.Activate);
                if (rule == null) return Results.Json(new { message = "找不到規則" }, statusCode: 404);

                rule.IsEnabled = !rule.IsEnabled;
                rule.UpdatedAt = DateTime.Now;
                await db.SaveChangesAsync();

                return Results.Ok(new { message = rule.IsEnabled ? "已啟用" : "已停用", isEnabled = rule.IsEnabled });
            });

            // 調整執行順序（前端傳排好的 ruleId 陣列）
            app.MapPut("/api/finance/auto-rules/reorder", async (ReorderRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var rules = await db.DetailAutoRules.Where(r => r.UserId == userId && r.Activate).ToListAsync();
                for (int i = 0; i < req.RuleIds.Count; i++)
                {
                    var rule = rules.FirstOrDefault(r => r.RuleId == req.RuleIds[i]);
                    if (rule == null) continue;
                    rule.Priority = i;
                    rule.UpdatedAt = DateTime.Now;
                }
                await db.SaveChangesAsync();

                return Results.Ok(new { message = "已更新執行順序" });
            });

            // 即時預覽：吃「還沒存檔」的規則定義，回傳目前會命中的明細。
            // 新增/編輯規則的畫面就是靠這支在使用者每次改條件時重打一次。
            app.MapPost("/api/finance/auto-rules/preview", async (AutoRulePreviewRequest req, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var conditions = (req.Conditions ?? new List<AutoRuleConditionRequest>())
                    .Select(c => new RuleConditionInput(c.Field, c.Operator, c.Value, c.Value2))
                    .ToList();

                if (conditions.Count == 0)
                    return Results.Ok(new { matched = new List<object>(), totalCount = 0, truncated = false });

                var details = await LoadRuleScopeDetailsAsync(db, userId.Value);

                var matched = details
                    .Where(d => FinanceAutoRuleEngine.Matches(d, conditions))
                    .OrderByDescending(d => d.TransactionDate)
                    .ToList();

                var rows = matched.Take(PreviewLimit).Select(d => new
                {
                    d.DetailId,
                    YearMonth = d.TransactionDate.Year + "-" + d.TransactionDate.Month.ToString("D2"),
                    d.TransactionDate,
                    d.OrganizationName,
                    d.AccountName,
                    d.Category,
                    d.Description,
                    d.Amount,
                    d.Tag,
                    d.Notes,
                    d.IsExcluded,
                    // 比對範圍含已停用（軟刪除）的明細，前端要能把這些列標示出來，
                    // 否則使用者會以為預覽裡多出來的筆數是還在帳上的資料
                    IsInactive = d.Activate != "1"
                }).ToList();

                return Results.Ok(new
                {
                    matched = rows,
                    totalCount = matched.Count,
                    truncated = matched.Count > PreviewLimit
                });
            });

            // 執行單一規則
            app.MapPost("/api/finance/auto-rules/{ruleId:int}/run", async (int ruleId, ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var rule = await db.DetailAutoRules
                    .Include(r => r.Conditions)
                    .FirstOrDefaultAsync(r => r.RuleId == ruleId && r.UserId == userId && r.Activate);
                if (rule == null) return Results.Json(new { message = "找不到規則" }, statusCode: 404);

                var details = await LoadRuleScopeDetailsAsync(db, userId.Value);
                var result = RunRules(new[] { rule }, details);

                rule.LastRunAt = DateTime.Now;
                await db.SaveChangesAsync();

                return Results.Ok(new
                {
                    message = $"「{rule.RuleName}」命中 {result.MatchedCount} 筆，實際異動 {result.ChangedCount} 筆",
                    matchedCount = result.MatchedCount,
                    changedCount = result.ChangedCount
                });
            });

            // 執行全部啟用中的規則（依執行順序）
            app.MapPost("/api/finance/auto-rules/run-all", async (ClaimsPrincipal user, JazzerLifeContext db) =>
            {
                var userId = GetUserId(user);
                if (userId == null) return Results.Json(new { message = "未登入" }, statusCode: 401);

                var rules = await db.DetailAutoRules
                    .Include(r => r.Conditions)
                    .Where(r => r.UserId == userId && r.Activate && r.IsEnabled)
                    .OrderBy(r => r.Priority).ThenBy(r => r.RuleId)
                    .ToListAsync();

                if (rules.Count == 0)
                    return Results.Ok(new { message = "目前沒有啟用中的規則", matchedCount = 0, changedCount = 0, ruleCount = 0 });

                var details = await LoadRuleScopeDetailsAsync(db, userId.Value);
                var result = RunRules(rules, details);

                var now = DateTime.Now;
                foreach (var rule in rules) rule.LastRunAt = now;
                await db.SaveChangesAsync();

                return Results.Ok(new
                {
                    message = $"{rules.Count} 條規則共命中 {result.MatchedCount} 筆，實際異動 {result.ChangedCount} 筆",
                    matchedCount = result.MatchedCount,
                    changedCount = result.ChangedCount,
                    ruleCount = rules.Count
                });
            });
        }

        /// <summary>
        /// 依序把規則套用到明細集合上（呼叫端負責 SaveChanges）。
        /// 「依優先順序全部套用、後者覆蓋前者」的語意就在這個雙層迴圈：
        /// 外層依序跑規則，內層跑明細，所以順序在後的規則會蓋掉前面規則寫的同一個欄位。
        /// 上傳流程也共用這個方法，只是傳進來的是本次新增的明細。
        /// </summary>
        public static AutoRuleRunResult RunRules(IEnumerable<DetailAutoRule> rules, IEnumerable<Detail> details)
        {
            var detailList = details as IList<Detail> ?? details.ToList();
            int matchedCount = 0;
            var changedDetailIds = new HashSet<int>();

            foreach (var rule in rules)
            {
                var conditions = rule.ToConditionInputs();
                if (conditions.Count == 0) continue;
                var action = rule.ToActionInput();

                foreach (var detail in detailList)
                {
                    if (!FinanceAutoRuleEngine.Matches(detail, conditions)) continue;

                    matchedCount++;
                    if (FinanceAutoRuleEngine.Apply(detail, action))
                        changedDetailIds.Add(detail.DetailId);
                }
            }

            // 異動筆數用明細去重：同一筆被多條規則改到只算一筆，
            // 命中筆數則是規則命中的次數總和（同一筆被兩條規則命中就算兩次）
            return new AutoRuleRunResult(matchedCount, changedDetailIds.Count);
        }

        /// <summary>
        /// 規則的比對範圍：該使用者的**全部**明細，不以 Activate 或 IsExcluded 篩選。
        /// 理由有二：
        /// 1. 規則本身就可能是用來設定這兩個旗標（把明細標成排除／停用，或把先前誤設的還原），
        ///    先篩掉就永遠不可能命中要還原的那些列；
        /// 2. 這也跟舊的 FIN.ins_Detail_Tag_With_Rule 預存程序一致——它的 WHERE 條件同樣沒有
        ///    過濾 Activate，是直接對整張表操作。
        /// </summary>
        private static Task<List<Detail>> LoadRuleScopeDetailsAsync(JazzerLifeContext db, int userId) =>
            db.Details.Where(d => d.UserId == userId).ToListAsync();

        private static string? Validate(AutoRuleRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.RuleName))
                return "請輸入規則名稱";

            var conditions = req.Conditions ?? new List<AutoRuleConditionRequest>();
            if (conditions.Count == 0)
                return "請至少設定一個條件（沒有條件的規則會命中全部明細，不允許儲存）";

            foreach (var c in conditions)
            {
                if (string.IsNullOrWhiteSpace(c.Field) || string.IsNullOrWhiteSpace(c.Operator))
                    return "條件的欄位與運算子不可空白";

                // isEmpty / isNotEmpty / isIncome / isExpense 這幾個運算子本來就不需要值
                var valueless = c.Operator is "isEmpty" or "isNotEmpty" or "isIncome" or "isExpense";
                if (!valueless && string.IsNullOrWhiteSpace(c.Value))
                    return "條件的比對值不可空白";

                if (c.Operator == "between" && string.IsNullOrWhiteSpace(c.Value2))
                    return "「介於」條件需要填入上下限兩個數值";
            }

            var hasAction = !string.IsNullOrWhiteSpace(req.ActionCategory)
                || !string.IsNullOrWhiteSpace(req.ActionTag)
                || !string.IsNullOrWhiteSpace(req.ActionNotes)
                || req.ActionIsExcluded.HasValue
                || req.ActionActivate.HasValue;
            if (!hasAction)
                return "請至少設定一個動作（分類／標籤／備註／排除／停用）";

            return null;
        }

        private static void ApplyActionFields(DetailAutoRule rule, AutoRuleRequest req)
        {
            rule.ActionCategory = Trim(req.ActionCategory);
            rule.ActionCategoryMode = rule.ActionCategory == null ? null : NormalizeMode(req.ActionCategoryMode, allowAppend: false);
            rule.ActionTag = Trim(req.ActionTag);
            rule.ActionTagMode = rule.ActionTag == null ? null : NormalizeMode(req.ActionTagMode, allowAppend: true);
            rule.ActionNotes = Trim(req.ActionNotes);
            rule.ActionNotesMode = rule.ActionNotes == null ? null : NormalizeMode(req.ActionNotesMode, allowAppend: true);
            rule.ActionIsExcluded = req.ActionIsExcluded;
            rule.ActionActivate = req.ActionActivate;
        }

        private static void ApplyConditions(DetailAutoRule rule, AutoRuleRequest req)
        {
            var conditions = req.Conditions ?? new List<AutoRuleConditionRequest>();
            for (int i = 0; i < conditions.Count; i++)
            {
                rule.Conditions.Add(new DetailAutoRuleCondition
                {
                    Field = conditions[i].Field.Trim(),
                    Operator = conditions[i].Operator.Trim(),
                    Value = Trim(conditions[i].Value),
                    Value2 = Trim(conditions[i].Value2),
                    SortOrder = i,
                    CreatedAt = DateTime.Now,
                });
            }
        }

        private static string NormalizeMode(string? mode, bool allowAppend)
        {
            var m = (mode ?? "").Trim();
            if (m == FinanceAutoRuleEngine.ModeFillEmpty) return m;
            if (m == FinanceAutoRuleEngine.ModeAppend && allowAppend) return m;
            return FinanceAutoRuleEngine.ModeOverwrite;
        }

        private static string? Trim(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

        private static object ToDto(DetailAutoRule r) => new
        {
            r.RuleId,
            r.RuleName,
            r.Priority,
            r.IsEnabled,
            r.ActionCategory,
            r.ActionCategoryMode,
            r.ActionTag,
            r.ActionTagMode,
            r.ActionNotes,
            r.ActionNotesMode,
            r.ActionIsExcluded,
            r.ActionActivate,
            r.LastRunAt,
            Conditions = r.Conditions
                .OrderBy(c => c.SortOrder)
                .Select(c => new { c.ConditionId, c.Field, c.Operator, c.Value, c.Value2, c.SortOrder })
                .ToList()
        };

        private static int? GetUserId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(idStr, out int id) ? id : null;
        }
    }

    public record AutoRuleConditionRequest(string Field, string Operator, string? Value, string? Value2);

    public record AutoRuleRequest(
        string RuleName,
        bool? IsEnabled,
        List<AutoRuleConditionRequest>? Conditions,
        string? ActionCategory, string? ActionCategoryMode,
        string? ActionTag, string? ActionTagMode,
        string? ActionNotes, string? ActionNotesMode,
        bool? ActionIsExcluded,
        bool? ActionActivate);

    public record AutoRulePreviewRequest(List<AutoRuleConditionRequest>? Conditions);

    public record ReorderRequest(List<int> RuleIds);

    public record AutoRuleRunResult(int MatchedCount, int ChangedCount);
}
