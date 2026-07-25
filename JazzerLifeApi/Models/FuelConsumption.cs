using System;
using System.Collections.Generic;

namespace JazzerLifeApi.Models;

public partial class FuelConsumption
{
    public int RecordId { get; set; }

    public int VehicleId { get; set; }

    public decimal OdometerReading { get; set; }

    public decimal FuelAmount { get; set; }

    public decimal FuelCost { get; set; }

    public decimal DistanceTravelled { get; set; }

    public decimal FuelEfficiency { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual Vehicle Vehicle { get; set; } = null!;
}
