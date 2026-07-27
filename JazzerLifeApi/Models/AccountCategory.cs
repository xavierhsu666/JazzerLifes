using System;
using System.Collections.Generic;

namespace JazzerLifeApi.Models;

// 使用者自訂的「帳戶分類」：把 銀行+帳戶 對應到一個分類名稱（例如 手動新增+新豐 -> 資產）
// 分類名稱本身沒有另外一張主檔表，採「使用者用過什麼分類，就能在下拉選單被建議」的簡單做法，
// 不需要額外維護一份分類主檔（詳見 db_backup/account_category_schema_backup_2026-07-27.md）
public partial class AccountCategory
{
    public int AccountCategoryId { get; set; }

    public int UserId { get; set; }

    public string OrganizationName { get; set; } = null!;

    public string AccountName { get; set; } = null!;

    public string Category { get; set; } = null!;

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
