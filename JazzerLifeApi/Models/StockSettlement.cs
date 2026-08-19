using System;

namespace JazzerLifeApi.Models;

/// <summary>
/// 每月股票庫存結算紀錄（FIN.StockSettlement）。
/// (UserID, YearMonth) 唯一，同月重複結算會被資料庫層擋下；重新結算是先刪舊紀錄再寫一筆新的。
/// </summary>
public partial class StockSettlement
{
    public int SettlementId { get; set; }

    public int UserId { get; set; }

    public string YearMonth { get; set; } = null!;

    public string OrganizationName { get; set; } = null!;

    public string AccountName { get; set; } = null!;

    public int ImportCount { get; set; }

    public int StockCount { get; set; }

    public decimal TotalMarketValue { get; set; }

    public decimal TotalCost { get; set; }

    /// <summary>寫進 FIN.BankAccount 的 CreatedAt，決定這筆帳戶落在哪個月。</summary>
    public DateTime SnapshotDate { get; set; }

    public DateTime SettledAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}
