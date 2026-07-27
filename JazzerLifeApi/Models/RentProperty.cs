using System;
using System.Collections.Generic;

namespace JazzerLifeApi.Models;

// 出租物件：一組房間清單的容器，未來若有第二個出租地址可直接新增一筆，
// 資料庫結構不需異動（詳見 db_backup/rent_schema_backup_2026-07-27.md）
public partial class RentProperty
{
    public int PropertyId { get; set; }

    public int UserId { get; set; }

    public string PropertyName { get; set; } = null!;

    public string? Address { get; set; }

    public bool IsActive { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<RentRoom> RentRooms { get; set; } = new List<RentRoom>();
}
