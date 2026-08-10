using System;
using System.Collections.Generic;

namespace JazzerLifeApi.Models;

public partial class Project
{
    public int ProjectId { get; set; }

    public int UserId { get; set; }

    public string? BillProjectId { get; set; }

    public string KeyWord { get; set; } = null!;

    public DateTime? BillStartTime { get; set; }

    public DateTime? BillEndTime { get; set; }

    public decimal BillBudget { get; set; }

    public string? Note { get; set; }

    public string Activate { get; set; } = null!;

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public string Status { get; set; } = null!;

    public string? TagPrefix { get; set; }

    // 摘要列表的「上月實際資產」是否要把現金流命中明細的累計淨額一併加進去。
    // 預設 false：只算資產流綁定帳戶中分類為「資產」的餘額（原本的行為）
    public bool IncludeCashflowInActualAsset { get; set; }

    public virtual ICollection<ProjectAssetBinding> ProjectAssetBindings { get; set; } = new List<ProjectAssetBinding>();

    public virtual ICollection<ProjectCashflowRule> ProjectCashflowRules { get; set; } = new List<ProjectCashflowRule>();

    public virtual ICollection<ProjectCashflowExclusion> ProjectCashflowExclusions { get; set; } = new List<ProjectCashflowExclusion>();

    public virtual ProjectExpectedDraft? ProjectExpectedDraft { get; set; }
}
