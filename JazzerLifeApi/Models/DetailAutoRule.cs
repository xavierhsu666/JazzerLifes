using System;
using System.Collections.Generic;

namespace JazzerLifeApi.Models;

// 財務明細的「自動分類規則」：依機構/帳戶/分類/標籤/描述/備註/金額等條件比對交易明細，
// 命中後自動設定分類、標籤、備註或排除旗標。每條規則可單獨啟停、編輯、刪除、執行。
// 跟 ProjectCashflowRule（專案現金流的單一關鍵字比對）是兩套獨立機制：
// 這裡是「改寫明細本身的欄位」，那裡是「只決定某筆明細算不算進某個專案」。
public partial class DetailAutoRule
{
    public int RuleId { get; set; }

    public int UserId { get; set; }

    public string RuleName { get; set; } = null!;

    // 執行順序，數字小的先跑；同一個欄位被多條規則命中時「後跑的贏」
    public int Priority { get; set; }

    // 規則開關（停用後保留設定，只是執行時跳過）
    public bool IsEnabled { get; set; }

    // 以下動作欄位為 null 代表這條規則不碰該欄位。
    // Mode：overwrite（一律覆寫）/ fillEmpty（僅原值為空時填入）/ append（附加，僅 Tag、Notes 適用）
    public string? ActionCategory { get; set; }

    public string? ActionCategoryMode { get; set; }

    public string? ActionTag { get; set; }

    public string? ActionTagMode { get; set; }

    public string? ActionNotes { get; set; }

    public string? ActionNotesMode { get; set; }

    // null = 不動排除旗標；true = 設為排除；false = 設為不排除
    public bool? ActionIsExcluded { get; set; }

    // null = 不動；false = 把明細停用（Detail.Activate = "0"，軟刪除，所有查詢都撈不到，
    // 等同舊 SP 的 set Activate=0，用於重複扣款、帳戶互轉這種根本不該存在於帳上的列）；
    // true = 還原啟用。跟 ActionIsExcluded 的差別：排除只是不計入報表，明細本身還看得到
    public bool? ActionActivate { get; set; }

    // 軟刪除旗標，比照 Projects/Bill 的慣例
    public bool Activate { get; set; }

    public DateTime? LastRunAt { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<DetailAutoRuleCondition> Conditions { get; set; } = new List<DetailAutoRuleCondition>();
}
