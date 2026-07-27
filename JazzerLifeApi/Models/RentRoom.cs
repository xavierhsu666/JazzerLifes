using System;
using System.Collections.Generic;

namespace JazzerLifeApi.Models;

// 房間設定（Tab2）：房租/每度電費/彈性調整金額都是「目前設定值」，
// 每月產生帳單（RentRoomBill）時會把當下設定值寫死存成快照，不會被後續調整影響歷史月份
public partial class RentRoom
{
    public int RoomId { get; set; }

    public int PropertyId { get; set; }

    public string RoomAlias { get; set; } = null!;

    public decimal MonthlyRent { get; set; }

    public decimal ElectricityRate { get; set; }

    // 彈性調整金額：可正可負，正數＝加收（水費/清潔費等），負數＝折抵
    public decimal AdjustmentAmount { get; set; }

    public int SortOrder { get; set; }

    // 軟刪除／退租標記：停用後 Tab1 不再列出，但歷史帳單（RentRoomBill）不受影響
    public bool IsActive { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual RentProperty Property { get; set; } = null!;

    public virtual ICollection<RentRoomBill> RentRoomBills { get; set; } = new List<RentRoomBill>();
}
