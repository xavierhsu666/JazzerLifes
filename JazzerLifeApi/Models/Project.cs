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

    public virtual ICollection<ProjectAssetBinding> ProjectAssetBindings { get; set; } = new List<ProjectAssetBinding>();

    public virtual ICollection<ProjectCashflowRule> ProjectCashflowRules { get; set; } = new List<ProjectCashflowRule>();

    public virtual ICollection<ProjectCashflowExclusion> ProjectCashflowExclusions { get; set; } = new List<ProjectCashflowExclusion>();

    public virtual ProjectExpectedDraft? ProjectExpectedDraft { get; set; }
}
