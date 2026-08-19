using System;
using System.Collections.Generic;

namespace JazzerLifeApi.Models;

public partial class Stock
{
    public int UserId { get; set; }

    public string OrganizationName { get; set; } = null!;

    public string AccountName { get; set; } = null!;

    public string Code { get; set; } = null!;

    public int Unit { get; set; }

    public decimal MarketValue { get; set; }

    public decimal Cost { get; set; }

    public decimal UnRealizedBenefit { get; set; }

    public decimal UnRealizedBenefitRatio { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public string? Activate { get; set; }

    /// <summary>由哪一次集保 PDF 匯入寫入（FIN.StockPdfImport.ImportID）；CSV 匯入或舊資料為 null。</summary>
    public int? ImportId { get; set; }
}
