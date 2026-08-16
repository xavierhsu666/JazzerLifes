using JazzerLifeApi.Models;

namespace JazzerLifeApi.Endpoints
{
    /// <summary>
    /// 自動分類規則的比對與套用邏輯。抽成獨立類別的原因是有三個呼叫點必須用同一套判斷：
    /// 規則編輯畫面的「即時預覽」、規則的「單條/全部執行」、以及「明細上傳後自動套用」。
    /// 這裡只處理記憶體中的物件，不碰 DbContext，方便預覽時直接餵未存檔的規則定義。
    /// </summary>
    public static class FinanceAutoRuleEngine
    {
        // 動作的處理方式
        public const string ModeOverwrite = "overwrite";   // 一律覆寫
        public const string ModeFillEmpty = "fillEmpty";   // 僅在原值為空時填入
        public const string ModeAppend = "append";         // 附加在原值後面（僅 Tag / Notes 適用）

        // 多值分隔符：文字條件的 Value 以及 Tag 的附加模式都用它
        private const char ValueSeparator = ',';

        // 目標欄位長度上限，對齊 FIN.Detail 的欄位定義，避免寫入時被資料庫截斷或報錯
        private const int MaxCategoryLength = 50;
        private const int MaxTagLength = 50;
        private const int MaxNotesLength = 255;

        /// <summary>
        /// 判斷單筆明細是否符合「所有」條件。條件之間一律 AND；
        /// 文字條件的 Value 用逗號分隔多值時，同一個條件內視為 OR。
        /// 沒有任何條件的規則一律視為不命中，避免使用者不小心存了一條空規則就把全部明細改掉。
        /// </summary>
        public static bool Matches(Detail detail, IReadOnlyList<RuleConditionInput> conditions)
        {
            if (conditions == null || conditions.Count == 0)
                return false;

            return conditions.All(c => MatchesCondition(detail, c));
        }

        private static bool MatchesCondition(Detail detail, RuleConditionInput condition)
        {
            var field = (condition.Field ?? "").Trim();
            var op = (condition.Operator ?? "").Trim();

            if (string.Equals(field, "amount", StringComparison.OrdinalIgnoreCase))
                return MatchesAmount(detail.Amount, op, condition.Value, condition.Value2);

            var target = field.ToLowerInvariant() switch
            {
                "organizationname" => detail.OrganizationName ?? "",
                "accountname" => detail.AccountName ?? "",
                "category" => detail.Category ?? "",
                "tag" => detail.Tag ?? "",
                "description" => detail.Description ?? "",
                "notes" => detail.Notes ?? "",
                _ => null,
            };

            // 未知欄位視為不命中，而不是命中，避免規則寫錯時大範圍改到明細
            if (target == null)
                return false;

            if (op == "isEmpty")
                return string.IsNullOrWhiteSpace(target);
            if (op == "isNotEmpty")
                return !string.IsNullOrWhiteSpace(target);

            var values = SplitValues(condition.Value);
            if (values.Count == 0)
                return false;

            return op switch
            {
                // 逗號分隔的多值在同一條件內是 OR
                "contains" => values.Any(v => target.Contains(v, StringComparison.OrdinalIgnoreCase)),
                "equals" => values.Any(v => string.Equals(target, v, StringComparison.OrdinalIgnoreCase)),
                "startsWith" => values.Any(v => target.StartsWith(v, StringComparison.OrdinalIgnoreCase)),
                // notContains 是否定條件，語意上要「每個值都不包含」才算命中（All 而非 Any）
                "notContains" => values.All(v => !target.Contains(v, StringComparison.OrdinalIgnoreCase)),
                _ => false,
            };
        }

        private static bool MatchesAmount(decimal amount, string op, string? value, string? value2)
        {
            // 收入/支出沿用明細頁的定義：金額 >= 0 為收入，< 0 為支出
            if (op == "isIncome") return amount >= 0;
            if (op == "isExpense") return amount < 0;

            // 金額比較一律用絕對值：支出在資料庫是負數，但使用者講「金額大於 1000」
            // 指的是「花超過 1000」而不是「大於 -1000」，用原始負數比會完全違反直覺
            var abs = Math.Abs(amount);

            if (op == "between")
            {
                if (!decimal.TryParse(value, out var lo) || !decimal.TryParse(value2, out var hi))
                    return false;
                if (lo > hi) (lo, hi) = (hi, lo);
                return abs >= lo && abs <= hi;
            }

            if (!decimal.TryParse(value, out var num))
                return false;

            return op switch
            {
                "gt" => abs > num,
                "gte" => abs >= num,
                "lt" => abs < num,
                "lte" => abs <= num,
                _ => false,
            };
        }

        private static List<string> SplitValues(string? raw) =>
            (raw ?? "")
                .Split(ValueSeparator, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .ToList();

        /// <summary>
        /// 把規則的動作套用到明細上。回傳是否真的改動了任何欄位——
        /// 沒改動就不算「影響筆數」，也不用更新 UpdatedAt，重跑同一條規則才會是冪等的。
        /// </summary>
        public static bool Apply(Detail detail, RuleActionInput action)
        {
            bool changed = false;

            if (!string.IsNullOrWhiteSpace(action.Category))
            {
                var next = ApplyText(detail.Category, action.Category.Trim(), action.CategoryMode, MaxCategoryLength, allowAppend: false);
                if (next != detail.Category)
                {
                    detail.Category = next ?? "";
                    changed = true;
                }
            }

            if (!string.IsNullOrWhiteSpace(action.Tag))
            {
                var next = ApplyText(detail.Tag, action.Tag.Trim(), action.TagMode, MaxTagLength, allowAppend: true);
                if (next != detail.Tag)
                {
                    detail.Tag = next;
                    changed = true;
                }
            }

            if (!string.IsNullOrWhiteSpace(action.Notes))
            {
                var next = ApplyText(detail.Notes, action.Notes.Trim(), action.NotesMode, MaxNotesLength, allowAppend: true);
                if (next != detail.Notes)
                {
                    detail.Notes = next;
                    changed = true;
                }
            }

            if (action.IsExcluded.HasValue && detail.IsExcluded != action.IsExcluded.Value)
            {
                detail.IsExcluded = action.IsExcluded.Value;
                changed = true;
            }

            // Detail.Activate 在資料庫是字串 "1"/"0"（沿用舊架構的欄位型別），不是 bit
            if (action.Activate.HasValue)
            {
                var next = action.Activate.Value ? "1" : "0";
                if (detail.Activate != next)
                {
                    detail.Activate = next;
                    changed = true;
                }
            }

            if (changed)
                detail.UpdatedAt = DateTime.Now;

            return changed;
        }

        private static string? ApplyText(string? current, string incoming, string? mode, int maxLength, bool allowAppend)
        {
            var normalizedMode = string.IsNullOrWhiteSpace(mode) ? ModeOverwrite : mode.Trim();

            if (normalizedMode == ModeFillEmpty)
                return string.IsNullOrWhiteSpace(current) ? Truncate(incoming, maxLength) : current;

            if (normalizedMode == ModeAppend && allowAppend)
            {
                if (string.IsNullOrWhiteSpace(current))
                    return Truncate(incoming, maxLength);

                // 已經有同樣的值就不重複附加，否則每執行一次就會多黏一份
                var parts = current.Split(ValueSeparator, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
                if (parts.Any(p => string.Equals(p, incoming, StringComparison.OrdinalIgnoreCase)))
                    return current;

                parts.Add(incoming);
                var merged = string.Join(ValueSeparator, parts);
                // 附加後超過欄位長度就維持原值不動，寧可少做也不要把既有內容截斷掉
                return merged.Length > maxLength ? current : merged;
            }

            return Truncate(incoming, maxLength);
        }

        private static string Truncate(string value, int maxLength) =>
            value.Length <= maxLength ? value : value[..maxLength];
    }

    // 預覽時規則還沒存檔，所以比對/套用的輸入用獨立的 record 而不是 EF 實體
    public record RuleConditionInput(string Field, string Operator, string? Value, string? Value2);

    public record RuleActionInput(
        string? Category, string? CategoryMode,
        string? Tag, string? TagMode,
        string? Notes, string? NotesMode,
        bool? IsExcluded,
        bool? Activate);

    public static class RuleMappingExtensions
    {
        public static List<RuleConditionInput> ToConditionInputs(this DetailAutoRule rule) =>
            rule.Conditions
                .OrderBy(c => c.SortOrder)
                .Select(c => new RuleConditionInput(c.Field, c.Operator, c.Value, c.Value2))
                .ToList();

        public static RuleActionInput ToActionInput(this DetailAutoRule rule) =>
            new(rule.ActionCategory, rule.ActionCategoryMode,
                rule.ActionTag, rule.ActionTagMode,
                rule.ActionNotes, rule.ActionNotesMode,
                rule.ActionIsExcluded, rule.ActionActivate);
    }
}
