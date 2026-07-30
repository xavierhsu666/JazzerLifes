using System;
using System.Collections.Generic;

namespace JazzerLifeApi.Models;

// 策略標籤主檔（下拉選單用）。比照 RENT.Room 的軟刪除慣例：
// IsActive=false 後下拉選單不再列出，但既有交易紀錄的關聯不受影響
public partial class StrategyTag
{
    public int StrategyTagId { get; set; }

    public int UserId { get; set; }

    public string Name { get; set; } = null!;

    public int SortOrder { get; set; }

    public bool IsActive { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<Trade> Trades { get; set; } = new List<Trade>();
}
