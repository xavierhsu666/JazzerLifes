using System;
using System.Collections.Generic;

namespace JazzerLifeApi.Models;

// 主表（母表／台電帳單）電費紀錄：用來試算「公共電費」分攤金額。
// BillMonth 代表「主表這一期帳單對應的期間」，試算時是拿「電費月往前推 2 個月」的期間查這張表，
// 因為台電實際帳單通常有約 2 個月落差（詳見 db_backup/rent_schema_add_public_electricity_backup_2026-07-27.md）
public partial class RentMasterMeterReading
{
    public int MasterBillId { get; set; }

    public int PropertyId { get; set; }

    public DateOnly BillMonth { get; set; }

    public decimal TotalUsageUnits { get; set; }

    public decimal TotalAmount { get; set; }

    public string? Note { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual RentProperty Property { get; set; } = null!;
}
