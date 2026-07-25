using System;
using System.Collections.Generic;

namespace JazzerLifeApi.Models;

public partial class BankAccount
{
    public int UserId { get; set; }

    public string OrganizationName { get; set; } = null!;

    public string AccountName { get; set; } = null!;

    public string? Currency { get; set; }

    public decimal? CreditLimit { get; set; }

    public decimal? AccountBalance { get; set; }

    public decimal? AvailableCredit { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public string? Activate { get; set; }

    public string? Tag { get; set; }
}
