/**
 * JazzerLife Trading（交易紀錄與覆盤分析）前端邏輯
 * 比照 rent.js 的輕量寫法：jQuery + 簡單 DOM 操作，不使用完整 class 架構、不使用 ag-Grid
 * （交易筆數對個人交易日誌來說不會太多，一般 <table> 已足夠，也比較好客製標籤/心得的行內編輯欄位）
 */

var TradingApp = {
    state: {
        strategyTags: [],
        trades: [],
        dateFrom: null,
        dateTo: null,
    },

    init: function () {
        var self = this;
        $.get("/api/auth/me")
            .done(function (data) {
                $("#sidebarUserName").text(data.account || "已登入");
                self.bindNav();
                self.bindTopFilter();
                self.bindOverview();
                self.bindTradesView();
                self.bindTagsView();
                self.loadStrategyTags(function () {
                    self.loadOverview();
                });
            })
            .fail(function () {
                window.location.assign("/signin.html#trading/trading");
            });
    },

    /** ==================== 側邊欄/底部導覽列 ==================== */
    bindNav: function () {
        var self = this;

        $("#sidebarToggle, #floatingMenuBtn").on("click", function () {
            $("#sidebar").toggleClass("active");
            $("#floatingMenuBtn").toggleClass("active");
        });

        $(document).on("click", function (e) {
            var $sidebar = $("#sidebar");
            if (!$sidebar.hasClass("active")) return;
            var clickedInsideSidebar = $sidebar.is(e.target) || $sidebar.has(e.target).length > 0;
            var clickedToggle = $("#sidebarToggle").is(e.target) || $("#sidebarToggle").has(e.target).length > 0;
            var clickedFloating = $("#floatingMenuBtn").is(e.target) || $("#floatingMenuBtn").has(e.target).length > 0;
            if (!clickedInsideSidebar && !clickedToggle && !clickedFloating) {
                $sidebar.removeClass("active");
                $("#floatingMenuBtn").removeClass("active");
            }
        });

        $(".nav-item, .app-bottom-nav-item").on("click", function () {
            var feature = $(this).data("feature");
            if (!feature) return;
            self.switchFeature(feature);
            $("#sidebar").removeClass("active");
            $("#floatingMenuBtn").removeClass("active");
        });
    },

    switchFeature: function (feature) {
        $(".nav-item").removeClass("active");
        $(".nav-item[data-feature='" + feature + "']").addClass("active");
        $(".app-bottom-nav-item").removeClass("active");
        $(".app-bottom-nav-item[data-feature='" + feature + "']").addClass("active");

        $(".content-view").addClass("hidden");
        $("#view-" + feature).removeClass("hidden");

        if (feature === "overview") this.loadOverview();
        else if (feature === "trades") this.loadTrades();
        else if (feature === "tags") this.loadTags();
    },

    /** ==================== 上方日期區間篩選（套用於總覽與交易明細） ==================== */
    bindTopFilter: function () {
        var self = this;
        $("#btnApplyDateFilter").on("click", function () {
            self.state.dateFrom = $("#dateFromInput").val() || null;
            self.state.dateTo = $("#dateToInput").val() || null;
            var current = $(".content-view:not(.hidden)").data("view");
            self.switchFeature(current || "overview");
        });
    },

    dateRangeParams: function () {
        var params = {};
        if (this.state.dateFrom) params.dateFrom = this.state.dateFrom;
        if (this.state.dateTo) params.dateTo = this.state.dateTo;
        return params;
    },

    /** ==================== 策略標籤（共用：下拉選單資料） ==================== */
    loadStrategyTags: function (callback) {
        var self = this;
        $.get("/api/trading/strategy-tags")
            .done(function (tags) {
                self.state.strategyTags = tags || [];
                self.renderStrategyTagDropdowns();
                if (callback) callback();
            })
            .fail(function (xhr) {
                if (xhr.status === 401) {
                    window.location.assign("/signin.html#trading/trading");
                    return;
                }
                if (callback) callback();
            });
    },

    renderStrategyTagDropdowns: function () {
        var self = this;
        var options = self.state.strategyTags.map(function (t) {
            return '<option value="' + t.StrategyTagId + '">' + self.escapeHtml(t.Name) + '</option>';
        }).join("");

        $("#newTradeStrategyTag").html('<option value="">（未標記）</option>' + options);
        $("#filterStrategyTag").html('<option value="">全部</option>' + options);
    },

    /** ==================== Tab1：總覽 ==================== */
    bindOverview: function () {
        var self = this;
        $("#btnReloadOverview").on("click", function () { self.loadOverview(); });
    },

    loadOverview: function () {
        var self = this;
        var params = self.dateRangeParams();

        $.get("/api/trading/analysis/summary", params).done(function (summary) {
            self.renderKpiCards(summary);
        });

        $.get("/api/trading/analysis/equity-curve", params).done(function (points) {
            self.renderEquityChart(points || []);
        });

        $.get("/api/trading/analysis/by-symbol", params).done(function (rows) {
            self.renderSymbolChart(rows || []);
        });

        $.get("/api/trading/analysis/by-tag", params).done(function (rows) {
            self.renderTagStatsTable(rows || []);
        });

        $.get("/api/trading/analysis/by-exit-reason", params).done(function (rows) {
            self.renderExitReasonStatsTable(rows || []);
        });

        $.get("/api/trading/analysis/cost-summary", params).done(function (data) {
            self.renderCostSummary(data || {});
        });
    },

    renderKpiCards: function (s) {
        var self = this;
        $("#kpiTotalTrades").text(s.TotalTrades);
        $("#kpiTotalProfit").text(self.fmtMoney(s.TotalProfit)).attr("class", "kpi-value " + (s.TotalProfit > 0 ? "positive" : s.TotalProfit < 0 ? "negative" : ""));
        $("#kpiWinRate").text(s.WinRate != null ? s.WinRate + "%" : "-");
        $("#kpiProfitFactor").text(s.ProfitFactor != null ? s.ProfitFactor : "∞");
        $("#kpiWinLossRatio").text(s.AverageWinLossRatio != null ? s.AverageWinLossRatio : "-");
        $("#kpiHoldingTime").text(s.AverageHoldingMinutes != null ? self.fmtDuration(s.AverageHoldingMinutes) : "-");
    },

    renderEquityChart: function (points) {
        var data = points.map(function (p) {
            return [new Date(p.ExitTime).getTime(), p.CumulativeProfit];
        });
        var accent = "#00bcd4";

        Highcharts.chart("equityChart", {
            chart: { type: "areaspline", backgroundColor: "transparent", height: 320, style: { fontFamily: "inherit" }, animation: { duration: 400 } },
            title: { text: null },
            xAxis: {
                type: "datetime",
                lineColor: "rgba(255,255,255,0.12)", tickColor: "rgba(255,255,255,0.12)",
                labels: { style: { color: "#b0b0b0", fontSize: "0.75rem" } },
            },
            yAxis: {
                title: { text: null },
                gridLineColor: "rgba(255,255,255,0.08)", gridLineDashStyle: "Dash",
                labels: { style: { color: "#b0b0b0", fontSize: "0.75rem" } },
            },
            tooltip: {
                backgroundColor: "#1a1a1a", borderColor: accent, borderRadius: 8,
                style: { color: "#ffffff" }, xDateFormat: "%Y-%m-%d %H:%M",
            },
            plotOptions: {
                areaspline: {
                    fillColor: {
                        linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                        stops: [
                            [0, Highcharts.color(accent).setOpacity(0.35).get("rgba")],
                            [1, Highcharts.color(accent).setOpacity(0).get("rgba")],
                        ],
                    },
                    lineWidth: 2.5,
                    marker: { enabled: false, radius: 3, states: { hover: { enabled: true, radius: 5 } } },
                    states: { hover: { lineWidth: 3 } },
                },
            },
            series: [{ name: "累積損益", data: data, color: accent }],
            credits: { enabled: false },
            legend: { enabled: false },
        });
    },

    renderSymbolChart: function (rows) {
        var categories = rows.map(function (r) { return r.Symbol; });
        var data = rows.map(function (r) { return r.TotalProfit; });

        Highcharts.chart("symbolChart", {
            chart: { type: "column", backgroundColor: "transparent", height: 320, style: { fontFamily: "inherit" } },
            title: { text: null },
            xAxis: { categories: categories, labels: { style: { color: "#b0b0b0", fontSize: "0.75rem" } }, lineColor: "rgba(255,255,255,0.12)" },
            yAxis: {
                title: { text: null },
                gridLineColor: "rgba(255,255,255,0.08)", gridLineDashStyle: "Dash",
                labels: { style: { color: "#b0b0b0", fontSize: "0.75rem" } },
            },
            tooltip: { backgroundColor: "#1a1a1a", style: { color: "#ffffff" } },
            plotOptions: {
                column: { color: "#4caf50", negativeColor: "#f44336", borderWidth: 0, borderRadius: 3 },
            },
            series: [{ name: "總損益", data: data }],
            credits: { enabled: false },
            legend: { enabled: false },
        });
    },

    renderTagStatsTable: function (rows) {
        var self = this;
        if (rows.length === 0) {
            $("#tagStatsTableBody").html('<tr><td colspan="4" style="text-align:center;color:var(--color-text-secondary);">尚無資料</td></tr>');
            return;
        }
        var html = rows.map(function (r) {
            var cls = r.TotalProfit > 0 ? "profit-positive" : r.TotalProfit < 0 ? "profit-negative" : "";
            return "<tr><td>" + self.escapeHtml(r.StrategyTagName) + "</td><td>" + r.TradeCount + "</td><td class=\"" + cls + "\">" + self.fmtMoney(r.TotalProfit) + "</td><td>" + r.WinRate + "%</td></tr>";
        }).join("");
        $("#tagStatsTableBody").html(html);
    },

    renderExitReasonStatsTable: function (rows) {
        var self = this;
        if (rows.length === 0) {
            $("#exitReasonStatsTableBody").html('<tr><td colspan="4" style="text-align:center;color:var(--color-text-secondary);">尚無資料</td></tr>');
            return;
        }
        var html = rows.map(function (r) {
            var cls = r.TotalProfit > 0 ? "profit-positive" : r.TotalProfit < 0 ? "profit-negative" : "";
            return "<tr><td>" + self.escapeHtml(r.ExitReasonLabel) + "</td><td>" + r.TradeCount + "</td><td class=\"" + cls + "\">" + self.fmtMoney(r.TotalProfit) + "</td><td>" + r.WinRate + "%</td></tr>";
        }).join("");
        $("#exitReasonStatsTableBody").html(html);
    },

    renderCostSummary: function (data) {
        var self = this;
        $("#kpiGrossProfit").text(data.TotalGrossProfit != null ? self.fmtMoney(data.TotalGrossProfit) : "-");
        $("#kpiNetProfit").text(data.TotalNetProfit != null ? self.fmtMoney(data.TotalNetProfit) : "-");
        $("#kpiImpliedCost").text(data.TotalImpliedCost != null ? self.fmtMoney(data.TotalImpliedCost) : "-");
        $("#kpiAvgSlippage").text(data.AverageSlippage != null ? data.AverageSlippage : "-");
        $("#costAnalysisNote").text(data.MultiplierNote || "");
    },

    /** ==================== Tab2：交易明細 ==================== */
    bindTradesView: function () {
        var self = this;

        $("#btnReloadTrades").on("click", function () { self.loadTrades(); });
        $("#btnApplyTradeFilter").on("click", function () { self.loadTrades(); });

        $("#btnShowImportPanel").on("click", function () { $("#importPanel").toggleClass("hidden"); });
        $("#btnShowAddTradeForm").on("click", function () { $("#addTradeForm").toggleClass("hidden"); });
        $("#btnCancelAddTrade").on("click", function () { $("#addTradeForm").addClass("hidden"); });

        $("#addTradeForm").on("submit", function (e) {
            e.preventDefault();
            self.submitManualTrade();
        });

        $("#btnUploadCtraderRecords").on("click", function () { self.uploadCtraderRecordsFile(); });
        $("#btnUploadTv").on("click", function () { self.uploadTradingViewFile(); });
    },

    loadTrades: function () {
        var self = this;
        var params = self.dateRangeParams();
        var symbol = $("#filterSymbol").val().trim();
        var source = $("#filterSource").val();
        var strategyTagId = $("#filterStrategyTag").val();
        var needsReviewOnly = $("#filterNeedsReview").is(":checked");

        if (symbol) params.symbol = symbol;
        if (source) params.source = source;
        if (strategyTagId) params.strategyTagId = strategyTagId;
        if (needsReviewOnly) params.needsReviewOnly = true;

        $("#tradeTableBody").html('<tr><td colspan="14" style="text-align:center;color:var(--color-text-secondary);">載入中...</td></tr>');

        $.get("/api/trading/trades", params)
            .done(function (trades) {
                self.state.trades = trades || [];
                self.renderTradeTable();
            })
            .fail(function (xhr) {
                if (xhr.status === 401) {
                    window.location.assign("/signin.html#trading/trading");
                    return;
                }
                $("#tradeTableBody").html('<tr><td colspan="14" style="text-align:center;color:var(--color-text-secondary);">載入失敗，請稍後重試</td></tr>');
            });
    },

    renderTradeTable: function () {
        var self = this;
        var trades = self.state.trades;

        if (trades.length === 0) {
            $("#tradeTableBody").html('<tr><td colspan="14" style="text-align:center;color:var(--color-text-secondary);">尚無交易紀錄，請匯入資料或手動新增</td></tr>');
            return;
        }

        var tagOptions = self.state.strategyTags.map(function (t) {
            return '<option value="' + t.StrategyTagId + '">' + self.escapeHtml(t.Name) + '</option>';
        }).join("");

        var html = trades.map(function (t) {
            var profitCls = t.Profit > 0 ? "profit-positive" : t.Profit < 0 ? "profit-negative" : "";
            var reviewBadge = t.NeedsReview ? '<span class="needs-review-badge">需檢查</span>' : "";
            var tagSelect = '<select class="trade-tag-select">' +
                '<option value="">（未標記）</option>' + tagOptions + '</select>';
            var exitReasonSelect = '<select class="trade-exitreason-select">' +
                '<option value="">未知</option>' +
                '<option value="StopLoss">停損</option>' +
                '<option value="TakeProfit">停利</option>' +
                '<option value="Market">手動</option>' +
                '</select>';

            return '<tr data-trade-id="' + t.TradeId + '">' +
                "<td>" + self.escapeHtml(t.Symbol) + reviewBadge + "</td>" +
                "<td>" + (t.Direction === "Buy" ? "做多" : "做空") + "</td>" +
                "<td>" + self.fmtNum(t.Volume) + "</td>" +
                "<td>" + (t.EntryTime ? self.fmtDateTime(t.EntryTime) : "未知") + "</td>" +
                "<td>" + (t.ExitTime ? self.fmtDateTime(t.ExitTime) : "未平倉") + "</td>" +
                "<td>" + (t.EntryPrice != null ? t.EntryPrice : "-") + "</td>" +
                "<td>" + (t.ExitPrice != null ? t.ExitPrice : "-") + "</td>" +
                '<td class="' + profitCls + '">' + self.fmtMoney(t.Profit) + "</td>" +
                "<td>" + exitReasonSelect + "</td>" +
                "<td>" + (t.ExitSlippage != null ? t.ExitSlippage : "-") + "</td>" +
                "<td>" + t.Source + "</td>" +
                "<td>" + tagSelect + "</td>" +
                '<td><input type="text" class="trade-note-input" value="' + self.escapeHtml(t.Note || "") + '" placeholder="心得" /></td>' +
                '<td class="action-col"><div class="row-actions">' +
                '<button type="button" class="btn-secondary btn-save-trade">儲存</button>' +
                '<button type="button" class="btn-danger btn-delete-trade">刪除</button>' +
                "</div></td>" +
                "</tr>";
        }).join("");

        $("#tradeTableBody").html(html);

        $("#tradeTableBody tr").each(function () {
            var $tr = $(this);
            var tradeId = Number($tr.data("trade-id"));
            var trade = trades.find(function (t) { return t.TradeId === tradeId; });
            if (trade) {
                $tr.find(".trade-tag-select").val(trade.StrategyTagId || "");
                $tr.find(".trade-exitreason-select").val(trade.ExitReason || "");
            }

            $tr.find(".btn-save-trade").on("click", function () { self.saveTradeRow(tradeId, $tr, trade); });
            $tr.find(".btn-delete-trade").on("click", function () { self.deleteTrade(tradeId); });
        });
    },

    saveTradeRow: function (tradeId, $tr, trade) {
        var self = this;
        var strategyTagId = $tr.find(".trade-tag-select").val();
        var exitReason = $tr.find(".trade-exitreason-select").val();
        var note = $tr.find(".trade-note-input").val();

        $.ajax({
            url: "/api/trading/trades/" + tradeId,
            method: "PUT",
            contentType: "application/json",
            data: JSON.stringify({
                Symbol: trade.Symbol,
                Direction: trade.Direction,
                Volume: trade.Volume,
                EntryTime: trade.EntryTime,
                ExitTime: trade.ExitTime,
                EntryPrice: trade.EntryPrice,
                ExitPrice: trade.ExitPrice,
                Profit: trade.Profit,
                StrategyTagId: strategyTagId ? Number(strategyTagId) : null,
                Note: note || null,
                ExitReason: exitReason || null,
                NeedsReview: false, // 使用者手動存檔即代表已確認過這筆交易，清掉待檢查標記
            }),
        }).done(function () {
            self.loadTrades();
        }).fail(function (xhr) {
            alert("更新交易失敗：" + (xhr.responseJSON?.message || xhr.statusText));
        });
    },

    deleteTrade: function (tradeId) {
        var self = this;
        if (!confirm("確定要刪除這筆交易紀錄嗎？")) return;
        $.ajax({ url: "/api/trading/trades/" + tradeId, method: "DELETE" })
            .done(function () { self.loadTrades(); })
            .fail(function (xhr) { alert("刪除失敗：" + (xhr.responseJSON?.message || xhr.statusText)); });
    },

    submitManualTrade: function () {
        var self = this;
        var symbol = $("#newTradeSymbol").val().trim();
        var direction = $("#newTradeDirection").val();
        var volume = parseFloat($("#newTradeVolume").val());
        var entryTime = $("#newTradeEntryTime").val();
        var exitTime = $("#newTradeExitTime").val() || null;
        var entryPrice = $("#newTradeEntryPrice").val() ? parseFloat($("#newTradeEntryPrice").val()) : null;
        var exitPrice = $("#newTradeExitPrice").val() ? parseFloat($("#newTradeExitPrice").val()) : null;
        var profit = parseFloat($("#newTradeProfit").val());
        var strategyTagId = $("#newTradeStrategyTag").val();
        var note = $("#newTradeNote").val();
        var exitReason = $("#newTradeExitReason").val();

        if (!symbol || isNaN(volume) || !entryTime || isNaN(profit)) {
            alert("請完整填寫商品、數量、進場時間與損益");
            return;
        }

        $.ajax({
            url: "/api/trading/trades",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({
                Symbol: symbol, Direction: direction, Volume: volume,
                EntryTime: entryTime, ExitTime: exitTime,
                EntryPrice: entryPrice, ExitPrice: exitPrice, Profit: profit,
                StrategyTagId: strategyTagId ? Number(strategyTagId) : null,
                Note: note || null,
                ExitReason: exitReason || null,
            }),
        }).done(function () {
            $("#addTradeForm")[0].reset();
            $("#addTradeForm").addClass("hidden");
            self.loadTrades();
        }).fail(function (xhr) {
            alert("新增交易失敗：" + (xhr.responseJSON?.message || xhr.statusText));
        });
    },

    uploadCtraderRecordsFile: function () {
        var self = this;
        var fileInput = document.getElementById("ctraderRecordsFileInput");
        if (!fileInput.files.length) { alert("請先選擇檔案"); return; }

        var tz = parseInt($("#ctraderRecordsTzInput").val(), 10);
        if (isNaN(tz)) tz = 8;
        var formData = new FormData();
        formData.append("file", fileInput.files[0]);

        var $result = $("#ctraderRecordsImportResult").removeClass("is-error").text("匯入中...");
        var $btn = $("#btnUploadCtraderRecords");
        $btn.prop("disabled", true);

        $.ajax({
            url: "/api/trading/import/ctrader-records?timezoneOffsetHours=" + tz,
            method: "POST",
            data: formData,
            contentType: false,
            processData: false,
        }).done(function (res) {
            $result.text(res.message);
            fileInput.value = "";
            self.loadTrades();
        }).fail(function (xhr) {
            $result.addClass("is-error").text("匯入失敗：" + (xhr.responseJSON?.message || xhr.statusText));
        }).always(function () {
            $btn.prop("disabled", false);
        });
    },

    uploadTradingViewFile: function () {
        var self = this;
        var fileInput = document.getElementById("tvFileInput");
        if (!fileInput.files.length) { alert("請先選擇檔案"); return; }

        var tolerance = parseInt($("#tvToleranceInput").val(), 10) || 10;
        var formData = new FormData();
        formData.append("file", fileInput.files[0]);

        var $result = $("#tvImportResult").removeClass("is-error").text("處理中...");
        var $btn = $("#btnUploadTv");
        $btn.prop("disabled", true);

        $.ajax({
            url: "/api/trading/import/tradingview-orders?toleranceMinutes=" + tolerance,
            method: "POST",
            data: formData,
            contentType: false,
            processData: false,
        }).done(function (res) {
            $result.text(res.message);
            fileInput.value = "";
            self.loadTrades();
        }).fail(function (xhr) {
            $result.addClass("is-error").text("處理失敗：" + (xhr.responseJSON?.message || xhr.statusText));
        }).always(function () {
            $btn.prop("disabled", false);
        });
    },

    /** ==================== Tab3：策略標籤管理 ==================== */
    bindTagsView: function () {
        var self = this;
        self.state.showInactiveTags = false;

        $("#btnReloadTags").on("click", function () { self.loadTags(); });
        $("#btnToggleShowInactiveTags").on("click", function () {
            self.state.showInactiveTags = !self.state.showInactiveTags;
            $(this).text(self.state.showInactiveTags ? "只顯示啟用中標籤" : "顯示已停用標籤");
            self.loadTags();
        });

        $("#addTagForm").on("submit", function (e) {
            e.preventDefault();
            var name = $("#newTagName").val().trim();
            var sort = parseInt($("#newTagSort").val(), 10) || 0;
            if (!name) { alert("請輸入標籤名稱"); return; }

            $.ajax({
                url: "/api/trading/strategy-tags",
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify({ Name: name, SortOrder: sort }),
            }).done(function () {
                $("#addTagForm")[0].reset();
                $("#newTagSort").val("0");
                self.loadTags();
                self.loadStrategyTags();
            }).fail(function (xhr) {
                alert("新增標籤失敗：" + (xhr.responseJSON?.message || xhr.statusText));
            });
        });
    },

    loadTags: function () {
        var self = this;
        $("#tagTableBody").html('<tr><td colspan="4" style="text-align:center;color:var(--color-text-secondary);">載入中...</td></tr>');

        $.get("/api/trading/strategy-tags", { includeInactive: self.state.showInactiveTags })
            .done(function (tags) {
                self.renderTagTable(tags || []);
            })
            .fail(function (xhr) {
                if (xhr.status === 401) {
                    window.location.assign("/signin.html#trading/trading");
                    return;
                }
                $("#tagTableBody").html('<tr><td colspan="4" style="text-align:center;color:var(--color-text-secondary);">載入失敗，請稍後重試</td></tr>');
            });
    },

    renderTagTable: function (tags) {
        var self = this;
        if (tags.length === 0) {
            $("#tagTableBody").html('<tr><td colspan="4" style="text-align:center;color:var(--color-text-secondary);">尚無標籤，請用上方表單新增</td></tr>');
            return;
        }

        var html = tags.map(function (t) {
            var rowClass = t.IsActive ? "" : " inactive-row";
            return '<tr class="tag-table-row' + rowClass + '" data-tag-id="' + t.StrategyTagId + '">' +
                '<td><input type="text" class="tag-name-input" value="' + self.escapeHtml(t.Name) + '" /></td>' +
                '<td><input type="number" class="tag-sort-input" value="' + t.SortOrder + '" style="width:70px;" /></td>' +
                "<td>" + (t.IsActive ? "啟用中" : "已停用") + "</td>" +
                '<td class="action-col"><div class="row-actions">' +
                '<button type="button" class="btn-secondary btn-save-tag">儲存</button>' +
                '<button type="button" class="btn-danger btn-toggle-tag">' + (t.IsActive ? "停用" : "啟用") + "</button>" +
                "</div></td></tr>";
        }).join("");
        $("#tagTableBody").html(html);

        $("#tagTableBody tr").each(function () {
            var $tr = $(this);
            var tagId = Number($tr.data("tag-id"));
            var tag = tags.find(function (t) { return t.StrategyTagId === tagId; });

            $tr.find(".btn-save-tag").on("click", function () { self.saveTag(tagId, $tr, tag.IsActive); });
            $tr.find(".btn-toggle-tag").on("click", function () {
                var msg = tag.IsActive ? "確定要停用這個標籤嗎？（既有交易紀錄的標籤不受影響）" : "確定要重新啟用這個標籤嗎？";
                if (!confirm(msg)) return;
                self.saveTag(tagId, $tr, !tag.IsActive);
            });
        });
    },

    saveTag: function (tagId, $tr, isActive) {
        var self = this;
        var name = $tr.find(".tag-name-input").val().trim();
        var sort = parseInt($tr.find(".tag-sort-input").val(), 10) || 0;
        if (!name) { alert("請輸入標籤名稱"); return; }

        $.ajax({
            url: "/api/trading/strategy-tags/" + tagId,
            method: "PUT",
            contentType: "application/json",
            data: JSON.stringify({ Name: name, SortOrder: sort, IsActive: isActive }),
        }).done(function () {
            self.loadTags();
            self.loadStrategyTags();
        }).fail(function (xhr) {
            alert("更新標籤失敗：" + (xhr.responseJSON?.message || xhr.statusText));
        });
    },

    /** ==================== 格式化工具 ==================== */
    fmtNum: function (v) {
        var n = Number(v);
        if (isNaN(n)) return v;
        return n.toLocaleString("zh-TW", { maximumFractionDigits: 4 });
    },

    fmtMoney: function (v) {
        var n = Number(v);
        if (isNaN(n)) return v;
        return n.toLocaleString("zh-TW", { maximumFractionDigits: 2 });
    },

    fmtDateTime: function (v) {
        var d = new Date(v);
        if (isNaN(d.getTime())) return v;
        var y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
        var h = String(d.getHours()).padStart(2, "0"), min = String(d.getMinutes()).padStart(2, "0");
        return y + "-" + m + "-" + day + " " + h + ":" + min;
    },

    // 平均持倉時間（分鐘）轉成「X天Y小時」或「X小時Y分」較好讀的顯示格式
    fmtDuration: function (minutes) {
        var totalMin = Math.round(minutes);
        var days = Math.floor(totalMin / 1440);
        var hours = Math.floor((totalMin % 1440) / 60);
        var mins = totalMin % 60;
        if (days > 0) return days + "天" + hours + "時";
        if (hours > 0) return hours + "時" + mins + "分";
        return mins + "分";
    },

    escapeHtml: function (str) {
        return String(str == null ? "" : str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    },
};

$(document).ready(function () {
    TradingApp.init();
});
