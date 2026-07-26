using System;
using System.Collections.Generic;

namespace JazzerLifeApi.Models;

public partial class EconIndicator
{
    public int IndicatorId { get; set; }

    public string Code { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string Country { get; set; } = null!;

    public string? Category { get; set; }

    public string? Unit { get; set; }

    public string Source { get; set; } = null!;

    public string? SourceSeriesId { get; set; }

    public string Frequency { get; set; } = null!;

    public bool IsActive { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<EconAlertRule> EconAlertRules { get; set; } = new List<EconAlertRule>();

    public virtual ICollection<EconIndicatorValue> EconIndicatorValues { get; set; } = new List<EconIndicatorValue>();
}
