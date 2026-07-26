using System;
using System.Collections.Generic;

namespace JazzerLifeApi.Models;

public partial class EconIndicatorValue
{
    public long ValueId { get; set; }

    public int IndicatorId { get; set; }

    public DateOnly PeriodDate { get; set; }

    public decimal Value { get; set; }

    public DateOnly? ReleaseDate { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual EconIndicator Indicator { get; set; } = null!;
}
