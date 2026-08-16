using System;
using System.Collections.Generic;

namespace JazzerLifeApi.Models;

// 自動分類規則的單一條件。同一條規則底下的多個條件一律以 AND 結合；
// 文字條件的 Value 可用逗號分隔多個值，同一個條件內視為 OR
// （例：描述 包含「星巴克,路易莎」＝ 描述含其中任一個就算命中）。
public partial class DetailAutoRuleCondition
{
    public int ConditionId { get; set; }

    public int RuleId { get; set; }

    // organizationName / accountName / category / tag / description / notes / amount
    public string Field { get; set; } = null!;

    // 文字：contains / notContains / equals / startsWith / isEmpty / isNotEmpty
    // 金額：gt / gte / lt / lte / between / isIncome / isExpense
    public string Operator { get; set; } = null!;

    public string? Value { get; set; }

    // 僅 between 使用
    public string? Value2 { get; set; }

    public int SortOrder { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual DetailAutoRule Rule { get; set; } = null!;
}
