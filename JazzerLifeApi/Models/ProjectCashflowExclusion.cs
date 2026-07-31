using System;
using System.Collections.Generic;

namespace JazzerLifeApi.Models;

// 專案管理「現金流」命中明細的「專案層面排除」：某筆交易被關鍵字規則命中，
// 但使用者判斷不該算進這個專案時使用；只影響單一 (ProjectId, DetailId) 組合，
// 不影響其他專案，也跟 Detail.IsExcluded（全域排除旗標）是兩套獨立邏輯
public partial class ProjectCashflowExclusion
{
    public int ExclusionId { get; set; }

    public int ProjectId { get; set; }

    public int DetailId { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Project Project { get; set; } = null!;
}
