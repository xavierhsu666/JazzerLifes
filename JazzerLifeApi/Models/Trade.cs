using System;
using System.Collections.Generic;

namespace JazzerLifeApi.Models;

// 交易紀錄主表：一筆代表一次已配對好的完整進場+出場交易，不是原始的逐筆訂單列。
// EntryPrice/ExitPrice 允許 NULL：cTrader Records 匯入當下可能還沒有搭配 TradingView
// 訂單資料比對，需等時間對得上時才會補上
public partial class Trade
{
    public int TradeId { get; set; }

    public int UserId { get; set; }

    public string Symbol { get; set; } = null!;

    // "Buy"(做多) 或 "Sell"(做空)，依開倉當下的買賣別決定
    public string Direction { get; set; } = null!;

    public decimal Volume { get; set; }

    // 允許 NULL：cTrader「Records」匯出格式只有平倉時間、沒有進場時間，
    // 匯入當下先留空，之後有搭配 TradingView 訂單資料且時間對得上時才會回填
    public DateTime? EntryTime { get; set; }

    public DateTime? ExitTime { get; set; }

    public decimal? EntryPrice { get; set; }

    public decimal? ExitPrice { get; set; }

    // 損益金額，直接採用來源報表的淨值（假設已含手續費/庫存費）
    public decimal Profit { get; set; }

    // "ICMarkets" / "TradingView" / "Manual"
    public string Source { get; set; } = null!;

    // 來源報表的部位編號，僅用於同來源重複匯入時比對防呆
    public string? BrokerPositionId { get; set; }

    public int? StrategyTagId { get; set; }

    // 進出場理由／事後檢討心得
    public string? Note { get; set; }

    // "StopLoss" / "TakeProfit" / "Market"（手動或市價平倉）/ NULL（尚未比對出來或無法判斷）；
    // 由 TradingView 訂單匯入比對平倉訂單的「種類」欄位回填，也開放手動編輯/修正
    public string? ExitReason { get; set; }

    // 滑價：停損/停利觸發價 vs 實際成交價的差，正值代表對你不利。只有 ExitReason 為
    // StopLoss/TakeProfit 時才有意義（Market 出場沒有「預期價格」可比較），由匯入邏輯自動計算，
    // 不開放手動編輯
    public decimal? ExitSlippage { get; set; }

    // 匯入時同一部位編號筆數超過 2（加碼/減碼等）無法簡單配對，標記需人工檢查
    public bool NeedsReview { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual StrategyTag? StrategyTag { get; set; }
}
