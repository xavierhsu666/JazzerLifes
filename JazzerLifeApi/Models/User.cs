using System;
using System.Collections.Generic;

namespace JazzerLifeApi.Models;

public partial class User
{
    public int UserId { get; set; }

    public string UserName { get; set; } = null!;

    public string Email { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    public string? PhoneNumber { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public DateTime? Birthday { get; set; }

    public virtual ICollection<MaintenanceCycle> MaintenanceCycles { get; set; } = new List<MaintenanceCycle>();

    public virtual ICollection<MaintenanceShop> MaintenanceShops { get; set; } = new List<MaintenanceShop>();

    public virtual ICollection<PartCategory> PartCategories { get; set; } = new List<PartCategory>();

    public virtual ICollection<Vehicle> Vehicles { get; set; } = new List<Vehicle>();
}
