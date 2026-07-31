using System;
using System.Collections.Generic;

namespace JazzerLifeApi.Models;

public partial class Bill
{
    // 新增識別欄位：FIN.Bill 原本沒有主鍵，無法精準指定「編輯/刪除哪一筆」帳單，
    // 需搭配 scripts/sql/finance_bill_add_id_2026-07-31.sql 先在資料庫加上 IDENTITY 欄位後才能使用
    public int BillId { get; set; }

    public int UserId { get; set; }

    public string? BillProjectId { get; set; }

    public string BillName { get; set; } = null!;

    public string Frequency { get; set; } = null!;

    public DateTime? BillStartTime { get; set; }

    public DateTime? BillEndTime { get; set; }

    public decimal BillAmount { get; set; }

    public string? Note { get; set; }

    public string Activate { get; set; } = null!;

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
