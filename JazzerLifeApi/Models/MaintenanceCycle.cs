using System;
using System.Collections.Generic;

namespace JazzerLifeApi.Models;

public partial class MaintenanceCycle
{
    public int CycleId { get; set; }

    public int UserId { get; set; }

    public string PartName { get; set; } = null!;

    public int? TimeCycle { get; set; }

    public decimal? MileageCycle { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public int? VehicleId { get; set; }

    public virtual User User { get; set; } = null!;
}
