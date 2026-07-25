using System;
using System.Collections.Generic;

namespace JazzerLifeApi.Models;

public partial class ProjectCashflowRule
{
    public int RuleId { get; set; }

    public int ProjectId { get; set; }

    public string Keyword { get; set; } = null!;

    public bool Activate { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual Project Project { get; set; } = null!;
}
