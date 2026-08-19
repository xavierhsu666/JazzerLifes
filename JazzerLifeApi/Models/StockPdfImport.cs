using System;

namespace JazzerLifeApi.Models;

/// <summary>
/// 一次集保存摺 PDF 匯入的紀錄（FIN.StockPdfImport）。
/// 用來擋重複上傳，以及支援「刪除／取代其中一份 PDF」——因為 FIN.Stock 沒有主鍵，
/// 只能靠 ImportID 反查那次匯入寫了哪些庫存。
/// </summary>
public partial class StockPdfImport
{
    public int ImportId { get; set; }

    public int UserId { get; set; }

    public string YearMonth { get; set; } = null!;

    public string FileName { get; set; } = null!;

    /// <summary>檔案位元組的 SHA256：完全相同的檔案直接視為重複上傳。</summary>
    public string FileHash { get; set; } = null!;

    /// <summary>辨識結果（代號:股數 排序後）的 SHA256：換檔名或重新下載同一份資料也抓得到。</summary>
    public string ContentHash { get; set; } = null!;

    /// <summary>從 PDF 內文抓到的券商／帳號，判斷是不是同一來源的更新版。</summary>
    public string? SourceKey { get; set; }

    public string OrganizationName { get; set; } = null!;

    public string AccountName { get; set; } = null!;

    public DateTime SnapshotDate { get; set; }

    public int StockCount { get; set; }

    public decimal TotalMarketValue { get; set; }

    public decimal TotalCost { get; set; }

    /// <summary>已被納入哪一次結算；null 表示尚未結算。</summary>
    public int? SettlementId { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}
