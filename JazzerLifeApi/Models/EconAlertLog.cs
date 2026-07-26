using System;
using System.Collections.Generic;

namespace JazzerLifeApi.Models;

public partial class EconAlertLog
{
    public long LogId { get; set; }

    public int RuleId { get; set; }

    public DateTime TriggeredAt { get; set; }

    public decimal Value { get; set; }

    public string Message { get; set; } = null!;

    public bool IsRead { get; set; }

    public virtual EconAlertRule Rule { get; set; } = null!;
}
