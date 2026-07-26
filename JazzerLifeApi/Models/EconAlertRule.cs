using System;
using System.Collections.Generic;

namespace JazzerLifeApi.Models;

public partial class EconAlertRule
{
    public int RuleId { get; set; }

    public int UserId { get; set; }

    public int IndicatorId { get; set; }

    public string Operator { get; set; } = null!;

    public decimal Threshold { get; set; }

    public bool IsActive { get; set; }

    public DateTime? LastTriggeredAt { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual EconIndicator Indicator { get; set; } = null!;

    public virtual User User { get; set; } = null!;

    public virtual ICollection<EconAlertLog> EconAlertLogs { get; set; } = new List<EconAlertLog>();
}
