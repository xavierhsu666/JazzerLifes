using System;
using System.Collections.Generic;

namespace JazzerLifeApi.Models;

public partial class Vehicle
{
    public int VehicleId { get; set; }

    public int UserId { get; set; }

    public string Make { get; set; } = null!;

    public string Model { get; set; } = null!;

    public int Year { get; set; }

    public string LicensePlate { get; set; } = null!;

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<FuelConsumption> FuelConsumptions { get; set; } = new List<FuelConsumption>();

    public virtual ICollection<PartsMaintenance> PartsMaintenances { get; set; } = new List<PartsMaintenance>();

    public virtual User User { get; set; } = null!;
}
