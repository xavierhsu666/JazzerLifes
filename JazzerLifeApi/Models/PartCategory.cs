using System;
using System.Collections.Generic;

namespace JazzerLifeApi.Models;

public partial class PartCategory
{
    public int CategoryId { get; set; }

    public int UserId { get; set; }

    public string CategoryName { get; set; } = null!;

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<PartsMaintenance> PartsMaintenances { get; set; } = new List<PartsMaintenance>();

    public virtual User User { get; set; } = null!;
}
