using System;
using System.Collections.Generic;

namespace JazzerLifeApi.Models;

public partial class ProjectExpectedRow
{
    public int RowId { get; set; }

    public int DraftId { get; set; }

    public string Month { get; set; } = null!;

    public decimal Inflow { get; set; }

    public decimal Outflow { get; set; }

    public decimal ManualFlow { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ProjectExpectedDraft Draft { get; set; } = null!;
}
