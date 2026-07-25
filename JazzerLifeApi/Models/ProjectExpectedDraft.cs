using System;
using System.Collections.Generic;

namespace JazzerLifeApi.Models;

public partial class ProjectExpectedDraft
{
    public int DraftId { get; set; }

    public int ProjectId { get; set; }

    public string? BaseMonth { get; set; }

    public decimal BaseAsset { get; set; }

    public decimal AnnualInflowRate { get; set; }

    public decimal AnnualOutflowRate { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual Project Project { get; set; } = null!;

    public virtual ICollection<ProjectExpectedRow> ProjectExpectedRows { get; set; } = new List<ProjectExpectedRow>();
}
