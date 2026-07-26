using System.Collections.Generic;
using System.Linq;

namespace JazzerLifeApi.Endpoints
{
    /// <summary>
    /// 總經模組共用：將 0-100 分數轉換為燈號（藍/綠/黃紅/紅），供指標矩陣與綜合分數共用同一套規則。
    /// </summary>
    public static class MacroSignalHelper
    {
        public record SignalResult(string Color, string Label);

        public static SignalResult GetSignal(double score)
        {
            if (score < 25) return new SignalResult("blue", "藍燈");
            if (score < 50) return new SignalResult("green", "綠燈");
            if (score < 75) return new SignalResult("amber", "黃紅燈");
            return new SignalResult("red", "紅燈");
        }

        /// <summary>計算 latestValue 在歷史數列中的百分位（0-100）。歷史筆數不足時回傳 null。</summary>
        public static double? CalculatePercentile(IReadOnlyList<decimal> history, decimal latestValue)
        {
            if (history == null || history.Count < 3)
                return null;

            var countLessOrEqual = history.Count(v => v <= latestValue);
            return (double)countLessOrEqual / history.Count * 100.0;
        }
    }
}
