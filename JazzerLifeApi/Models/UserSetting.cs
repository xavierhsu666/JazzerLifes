using System;

namespace JazzerLifeApi.Models;

/// <summary>
/// 使用者層級的鍵值設定（FIN.UserSetting）。
/// 密碼類設定的 SettingValue 存的是 Data Protection 加密後的密文，IsEncrypted = true。
/// </summary>
public partial class UserSetting
{
    public int SettingId { get; set; }

    public int UserId { get; set; }

    public string SettingKey { get; set; } = null!;

    public string? SettingValue { get; set; }

    public bool IsEncrypted { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}
