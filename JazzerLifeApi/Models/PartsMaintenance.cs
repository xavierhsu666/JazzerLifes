using System;
using System.Collections.Generic;

namespace JazzerLifeApi.Models;

public partial class PartsMaintenance
{
    public int MaintenanceId { get; set; }

    public int VehicleId { get; set; }

    public string PartName { get; set; } = null!;

    public DateOnly MaintenanceDate { get; set; }

    public decimal Cost { get; set; }

    public string? Notes { get; set; }

    public int? CategoryId { get; set; }

    public decimal? OdometerReading { get; set; }

    public string? Description { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public string? Store { get; set; }

    public virtual PartCategory? Category { get; set; }

    public virtual Vehicle Vehicle { get; set; } = null!;
}
