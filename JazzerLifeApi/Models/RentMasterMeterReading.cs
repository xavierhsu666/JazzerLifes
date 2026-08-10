using System;
using System.Collections.Generic;

namespace JazzerLifeApi.Models;

// 主表（母表／台電帳單）電費紀錄：用來試算「公共電費」分攤金額。
// StartMonth ~ EndMonth 是這一期主表帳單實際涵蓋的月份區間（2026-08-10 起改為明確記錄，
// 不再依賴原本「一筆隱含涵蓋兩個月」的約定），公共電費一律落在 EndMonth 那個月的房客帳單上。
// BillMonth 為相容既有欄位而保留，值等同 EndMonth。
public partial class RentMasterMeterReading
{
    public int MasterBillId { get; set; }

    public int PropertyId { get; set; }

    public DateOnly BillMonth { get; set; }

    public DateOnly StartMonth { get; set; }

    public DateOnly EndMonth { get; set; }

    public decimal TotalUsageUnits { get; set; }

    public decimal TotalAmount { get; set; }

    public string? Note { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual RentProperty Property { get; set; } = null!;
}
