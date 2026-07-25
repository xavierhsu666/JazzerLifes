using System;
using System.Collections.Generic;

namespace JazzerLifeApi.Models;

public partial class Detail
{
    public int DetailId { get; set; }

    public int UserId { get; set; }

    public string OrganizationName { get; set; } = null!;

    public string AccountName { get; set; } = null!;

    public string Category { get; set; } = null!;

    public string? Description { get; set; }

    public string Currency { get; set; } = null!;

    public decimal Amount { get; set; }

    public DateOnly TransactionDate { get; set; }

    public DateOnly PostingDate { get; set; }

    public string? Tag { get; set; }

    public string? Notes { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public string? Activate { get; set; }

    public bool IsExcluded { get; set; }
}
