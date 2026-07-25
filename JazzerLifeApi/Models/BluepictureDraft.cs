using System;
using System.Collections.Generic;

namespace JazzerLifeApi.Models;

public partial class BluepictureDraft
{
    public int DraftId { get; set; }

    public int UserId { get; set; }

    public string Type { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string BTimeBase { get; set; } = null!;

    public string BStart { get; set; } = null!;

    public string BEnd { get; set; } = null!;

    public decimal? InitCapital { get; set; }

    public decimal? MonthlyInput { get; set; }

    public decimal? RewardRatio { get; set; }

    public decimal? InflationRatio { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public string? Activate { get; set; }
}
