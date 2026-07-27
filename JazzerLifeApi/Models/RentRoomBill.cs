using System;
using System.Collections.Generic;

namespace JazzerLifeApi.Models;

// 月度帳單（Tab1）：每個房間每月一筆。UsageUnits/ElectricityFee/TotalAmount 由 API 算好寫入，
// 不是 SQL 計算欄位，保留手動覆蓋的彈性（例如電表換表歸零等特殊狀況）
public partial class RentRoomBill
{
    public int BillId { get; set; }

    public int RoomId { get; set; }

    // 存當月 1 號，例如 2026-07-01
    public DateOnly BillMonth { get; set; }

    public decimal PrevReading { get; set; }

    public decimal CurrentReading { get; set; }

    public decimal UsageUnits { get; set; }

    // 建立當月帳單時，寫死存入當時的房間設定值，之後調整 RentRoom 不影響這裡
    public decimal RentSnapshot { get; set; }

    public decimal RateSnapshot { get; set; }

    public decimal AdjustmentSnapshot { get; set; }

    // 公共電費分攤金額：跟 RentSnapshot/RateSnapshot/AdjustmentSnapshot 不同，這欄「不是」當月建立時鎖定的快照，
    // 而是每次儲存都可以彈性覆蓋的手動輸入值（畫面載入時會帶入試算建議值，詳見 RentMasterMeterEndpoints 的試算邏輯）
    public decimal PublicElectricityFee { get; set; }

    public decimal ElectricityFee { get; set; }

    public decimal TotalAmount { get; set; }

    public bool IsPaid { get; set; }

    public DateOnly? PaidDate { get; set; }

    public string? Note { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual RentRoom Room { get; set; } = null!;
}
