using System;
using System.Collections.Generic;

namespace JazzerLifeApi.Models;

public partial class Bill
{
    public int UserId { get; set; }

    public string? BillProjectId { get; set; }

    public string BillName { get; set; } = null!;

    public string Frequency { get; set; } = null!;

    public DateTime? BillStartTime { get; set; }

    public DateTime? BillEndTime { get; set; }

    public decimal BillAmount { get; set; }

    public string? Note { get; set; }

    public string Activate { get; set; } = null!;

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
