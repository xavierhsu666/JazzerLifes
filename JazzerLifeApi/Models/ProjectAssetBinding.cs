using System;
using System.Collections.Generic;

namespace JazzerLifeApi.Models;

public partial class ProjectAssetBinding
{
    public int BindingId { get; set; }

    public int ProjectId { get; set; }

    public string SnapshotMonth { get; set; } = null!;

    public string OrganizationName { get; set; } = null!;

    public string AccountName { get; set; } = null!;

    public bool Activate { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual Project Project { get; set; } = null!;
}
