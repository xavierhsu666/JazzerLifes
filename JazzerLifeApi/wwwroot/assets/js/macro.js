/**
 * JazzerLife Macro（總體經濟溫度計）前端邏輯
 * 比照 car.js 的輕量寫法：jQuery + 簡單 DOM 操作，不使用完整 class 架構
 */

var MacroApp = {
    countries: ["TW", "US"],
    countryLabel: { TW: "台灣", US: "美國" },
    selectedSeriesCode: null,
    indicatorsCache: [],
    seriesChart: null,

    // 分類顯示順序與配色（指標矩陣分組標題、走勢圖線條顏色共用）
    categoryOrder: ["景氣", "物價", "就業", "生產", "利率", "貿易", "市場"],
    categoryColor: {
        "景氣": "#9c27b0",
        "物價": "#ff9800",
        "就業": "#4caf50",
        "生產": "#00bcd4",
        "利率": "#378ADD",
        "貿易": "#BA7517",
        "市場": "#E24B4A",
    },
    defaultCategory: "其他",

    init: function () {
        var self = this;
        $.get("/api/auth/me")
            .done(function (data) {
                $("#sidebarUserName").text(data.account || "已登入");
                self.bindNav();
                self.bindOverview();
                self.bindAlerts();
                self.loadOverview();
            })
            .fail(function () {
                window.location.assign("/signin.html#macro/macro");
            });
    },

    /** 側邊欄/底部導覽列切換（總覽 / 示警規則） */
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

        if (feature === "alerts") {
            this.loadAlertRules();
            this.loadAlertLogs();
        }
    },

    /** ==================== 總覽頁 ==================== */
    bindOverview: function () {
        var self = this;
        $("#btnRefreshOverview").on("click", function () { self.loadOverview(); });
        $("#btnRunSync").on("click", function () {
            $("#btnRunSync").prop("disabled", true).text("同步中...");
            $.post("/api/tasks/run-macro-sync")
                .done(function () {
                    alert("已排入同步任務，Hangfire 背景執行中，稍後重新整理查看結果。");
                })
                .fail(function (xhr) {
                    alert("觸發同步失敗：" + (xhr.responseJSON?.message || xhr.statusText));
                })
                .always(function () {
                    $("#btnRunSync").prop("disabled", false).text("立即同步資料");
                });
        });
    },

    loadOverview: function () {
        var self = this;
        self.renderThermoLoading();

        $.when(
            $.get("/api/macro/composite-score", { country: "TW" }),
            $.get("/api/macro/composite-score", { country: "US" }),
            $.get("/api/macro/indicators")
        ).done(function (twRes, usRes, indicatorsRes) {
            self.renderThermo([twRes[0], usRes[0]]);
            self.indicatorsCache = indicatorsRes[0] || [];
            self.renderIndicatorGrid(self.indicatorsCache);
            self.renderSeriesSelector(self.indicatorsCache);

            if (self.indicatorsCache.length > 0 && !self.selectedSeriesCode) {
                self.selectedSeriesCode = self.indicatorsCache[0].Code;
            }
            if (self.selectedSeriesCode) {
                self.loadSeries(self.selectedSeriesCode);
            }
        }).fail(function (xhr) {
            if (xhr.status === 401) {
                window.location.assign("/signin.html#macro/macro");
                return;
            }
            $("#thermoGrid").html('<p style="color:var(--color-text-secondary)">總覽資料載入失敗，請稍後重試。</p>');
        });
    },

    renderThermoLoading: function () {
        $("#thermoGrid").html('<p style="color:var(--color-text-secondary)">載入中...</p>');
    },

    renderThermo: function (scores) {
        var self = this;
        var html = "";
        scores.forEach(function (s) {
            var score = s.Score != null ? s.Score : 0;
            var badge = s.SignalColor || "gray";
            var label = s.SignalLabel || "資料不足";
            var asOf = s.AsOfPeriod ? "資料期別：" + s.AsOfPeriod : "尚無資料";

            html += '<div class="thermo-card">' +
                '<div class="thermo-label">' + self.countryLabel[s.Country] + '景氣溫度計</div>' +
                '<div class="thermo-score-row">' +
                '<span class="thermo-score">' + (s.Score != null ? s.Score : "-") + '</span>' +
                '<span class="thermo-badge badge-' + badge + '">' + label + '</span>' +
                '</div>' +
                '<div class="thermo-bar">' +
                '<div class="thermo-bar-seg signal-blue"></div>' +
                '<div class="thermo-bar-seg signal-green"></div>' +
                '<div class="thermo-bar-seg signal-amber"></div>' +
                '<div class="thermo-bar-seg signal-red"></div>' +
                '<div class="thermo-marker" style="left:calc(' + score + '% - 1px)"></div>' +
                '</div>' +
                '<div class="thermo-asof">' + asOf + '</div>' +
                '</div>';
        });
        $("#thermoGrid").html(html);
    },

    /** 依 Category 分組，維持 categoryOrder 順序，未知分類統一歸到 defaultCategory 放最後 */
    groupByCategory: function (indicators) {
        var self = this;
        var groups = {};
        (indicators || []).forEach(function (i) {
            var cat = i.Category || self.defaultCategory;
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(i);
        });
        var orderedKeys = self.categoryOrder.filter(function (c) { return groups[c]; });
        Object.keys(groups).forEach(function (c) {
            if (orderedKeys.indexOf(c) === -1) orderedKeys.push(c);
        });
        return orderedKeys.map(function (c) { return { category: c, items: groups[c] }; });
    },

    renderIndicatorGrid: function (indicators) {
        var self = this;
        if (!indicators || indicators.length === 0) {
            $("#indicatorGrid").html('<p style="color:var(--color-text-secondary)">尚無指標資料，請先執行資料同步。</p>');
            return;
        }
        var groups = self.groupByCategory(indicators);
        var html = "";
        groups.forEach(function (g) {
            var accent = self.categoryColor[g.category] || "var(--color-accent-blue)";
            html += '<div class="indicator-group">' +
                '<div class="indicator-group-header" style="border-left-color:' + accent + '">' +
                '<span class="indicator-group-title">' + g.category + '</span>' +
                '<span class="indicator-group-count">' + g.items.length + ' 項</span>' +
                '</div>' +
                '<div class="indicator-grid">';

            g.items.forEach(function (i) {
                var value = i.LatestValue != null ? self.formatNumber(i.LatestValue) : "--";
                var change = i.YoyChangePercent;
                var changeClass = change == null ? "" : (change >= 0 ? "positive" : "negative");
                var changeText = change == null ? "年增率資料不足" : (change >= 0 ? "▲ " : "▼ ") + Math.abs(change).toFixed(1) + "%";
                var selected = (i.Code === self.selectedSeriesCode) ? " selected" : "";

                html += '<div class="indicator-card' + selected + '" data-code="' + i.Code + '">' +
                    '<div class="indicator-card-header">' +
                    '<span class="indicator-card-name">' + i.Name + '</span>' +
                    '<span class="indicator-dot signal-' + (i.SignalColor || "gray") + '"></span>' +
                    '</div>' +
                    '<div class="indicator-card-value">' + value + (i.Unit ? ' <small style="font-size:0.7rem;color:var(--color-text-secondary)">' + i.Unit + '</small>' : '') + '</div>' +
                    '<div class="indicator-card-change ' + changeClass + '">' + changeText + '</div>' +
                    '</div>';
            });

            html += '</div></div>';
        });
        $("#indicatorGrid").html(html);

        $("#indicatorGrid .indicator-card").on("click", function () {
            var code = $(this).data("code");
            self.selectedSeriesCode = code;
            $("#indicatorGrid .indicator-card").removeClass("selected");
            $(this).addClass("selected");
            self.loadSeries(code);
            self.syncSeriesSelector();
        });
    },

    /** 走勢圖指標選擇：改用依分類分組的下拉選單，取代舊版只顯示前 8 筆的 pill 列，可容納所有指標且手機好操作 */
    renderSeriesSelector: function (indicators) {
        var self = this;
        if (!indicators || indicators.length === 0) {
            $("#seriesSelect").empty();
            return;
        }
        var groups = self.groupByCategory(indicators);
        var html = "";
        groups.forEach(function (g) {
            html += '<optgroup label="' + g.category + '">';
            g.items.forEach(function (i) {
                var sel = (i.Code === self.selectedSeriesCode) ? " selected" : "";
                html += '<option value="' + i.Code + '"' + sel + '>[' + self.countryLabel[i.Country] + '] ' + i.Name + '</option>';
            });
            html += '</optgroup>';
        });
        $("#seriesSelect").html(html);

        $("#seriesSelect").off("change").on("change", function () {
            var code = $(this).val();
            self.selectedSeriesCode = code;
            self.loadSeries(code);
            $("#indicatorGrid .indicator-card").removeClass("selected");
            $("#indicatorGrid .indicator-card[data-code='" + code + "']").addClass("selected");
        });
    },

    /** 從指標卡片點擊切換時，同步更新下拉選單的選取狀態，不用重繪整個選單 */
    syncSeriesSelector: function () {
        $("#seriesSelect").val(this.selectedSeriesCode);
    },

    loadSeries: function (code) {
        var self = this;
        $.get("/api/macro/indicators/" + encodeURIComponent(code) + "/series", { months: 36 })
            .done(function (data) {
                self.renderSeriesChart(data);
            })
            .fail(function () {
                $("#seriesChart").html('<p style="color:var(--color-text-secondary)">走勢資料載入失敗</p>');
            });
    },

    renderSeriesChart: function (data) {
        var self = this;
        var points = (data.Points || []).map(function (p) {
            var d = new Date(p.PeriodDate);
            return [Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()), p.Value];
        });
        var accent = self.categoryColor[data.Category] || "#00bcd4";

        this.seriesChart = Highcharts.chart("seriesChart", {
            chart: {
                type: "areaspline",
                backgroundColor: "transparent",
                height: 340,
                style: { fontFamily: "inherit" },
                animation: { duration: 400 },
            },
            title: { text: null },
            xAxis: {
                type: "datetime",
                lineColor: "rgba(255,255,255,0.12)",
                tickColor: "rgba(255,255,255,0.12)",
                labels: { style: { color: "#b0b0b0", fontSize: "0.75rem" } },
            },
            yAxis: {
                title: { text: data.Unit || "", style: { color: "#b0b0b0" } },
                gridLineColor: "rgba(255,255,255,0.08)",
                gridLineDashStyle: "Dash",
                labels: { style: { color: "#b0b0b0", fontSize: "0.75rem" } },
            },
            tooltip: {
                backgroundColor: "#1a1a1a",
                borderColor: accent,
                borderRadius: 8,
                style: { color: "#ffffff" },
                shared: true,
                valueSuffix: data.Unit ? " " + data.Unit : "",
                xDateFormat: "%Y-%m-%d",
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
                    marker: {
                        enabled: false,
                        radius: 3,
                        states: { hover: { enabled: true, radius: 5 } },
                    },
                    states: { hover: { lineWidth: 3 } },
                },
            },
            series: [{ name: data.Name, data: points, color: accent }],
            credits: { enabled: false },
            legend: { enabled: false },
        });
    },

    /** ==================== 示警規則頁 ==================== */
    bindAlerts: function () {
        var self = this;
        $("#alertRuleForm").on("submit", function (e) {
            e.preventDefault();
            var code = $("#alertIndicatorSelect").val();
            var operator = $("#alertOperatorSelect").val();
            var threshold = parseFloat($("#alertThresholdInput").val());

            if (!code || !operator || isNaN(threshold)) {
                alert("請完整填寫指標、條件與門檻值");
                return;
            }

            $.ajax({
                url: "/api/macro/alert-rules",
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify({ IndicatorCode: code, Operator: operator, Threshold: threshold }),
            }).done(function () {
                $("#alertThresholdInput").val("");
                self.loadAlertRules();
            }).fail(function (xhr) {
                alert("新增規則失敗：" + (xhr.responseJSON?.message || xhr.statusText));
            });
        });

        self.populateIndicatorSelect();
    },

    populateIndicatorSelect: function () {
        $.get("/api/macro/indicators").done(function (indicators) {
            var html = "";
            (indicators || []).forEach(function (i) {
                html += '<option value="' + i.Code + '">[' + i.Country + '] ' + i.Name + '</option>';
            });
            $("#alertIndicatorSelect").html(html);
        });
    },

    loadAlertRules: function () {
        var self = this;
        $.get("/api/macro/alert-rules").done(function (rules) {
            if (!rules || rules.length === 0) {
                $("#alertRuleList").html('<p style="color:var(--color-text-secondary)">尚未設定任何示警規則</p>');
                return;
            }
            var html = "";
            rules.forEach(function (r) {
                html += '<div class="alert-rule-row" data-id="' + r.RuleId + '">' +
                    '<div class="alert-rule-desc">' +
                    '<span>' + r.IndicatorName + ' ' + r.Operator + ' ' + r.Threshold + '</span>' +
                    (r.IsActive ? '' : '<span style="color:var(--color-text-secondary);font-size:0.75rem;">(已停用)</span>') +
                    '</div>' +
                    '<div class="alert-rule-actions">' +
                    '<button type="button" class="btn-secondary btn-toggle-rule">' + (r.IsActive ? "停用" : "啟用") + '</button>' +
                    '<button type="button" class="btn-danger btn-delete-rule">刪除</button>' +
                    '</div>' +
                    '</div>';
            });
            $("#alertRuleList").html(html);

            $("#alertRuleList .btn-toggle-rule").on("click", function () {
                var id = $(this).closest(".alert-rule-row").data("id");
                var rule = rules.find(function (r) { return r.RuleId === id; });
                $.ajax({
                    url: "/api/macro/alert-rules/" + id,
                    method: "PUT",
                    contentType: "application/json",
                    data: JSON.stringify({ IsActive: !rule.IsActive }),
                }).done(function () { self.loadAlertRules(); });
            });

            $("#alertRuleList .btn-delete-rule").on("click", function () {
                if (!confirm("確定要刪除這個示警規則嗎？")) return;
                var id = $(this).closest(".alert-rule-row").data("id");
                $.ajax({ url: "/api/macro/alert-rules/" + id, method: "DELETE" })
                    .done(function () { self.loadAlertRules(); });
            });
        });
    },

    loadAlertLogs: function () {
        $.get("/api/macro/alerts").done(function (logs) {
            if (!logs || logs.length === 0) {
                $("#alertLogContainer").html('<p style="color:var(--color-text-secondary)">尚無觸發紀錄</p>');
                return;
            }
            var html = "";
            logs.forEach(function (l) {
                var unreadClass = l.IsRead ? "" : "unread";
                html += '<div class="alert-log-row ' + unreadClass + '" data-id="' + l.LogId + '">' +
                    '<div>' +
                    '<div class="alert-log-msg">' + l.Message + '</div>' +
                    '<div class="alert-log-time">' + new Date(l.TriggeredAt).toLocaleString("zh-TW") + '</div>' +
                    '</div>' +
                    (l.IsRead ? '' : '<button type="button" class="btn-secondary btn-mark-read">標記已讀</button>') +
                    '</div>';
            });
            $("#alertLogContainer").html(html);

            $("#alertLogContainer .btn-mark-read").on("click", function () {
                var id = $(this).closest(".alert-log-row").data("id");
                $.post("/api/macro/alerts/" + id + "/mark-read").done(function () {
                    $('.alert-log-row[data-id="' + id + '"]').removeClass("unread").find(".btn-mark-read").remove();
                });
            });
        });
    },

    formatNumber: function (v) {
        var n = Number(v);
        if (isNaN(n)) return v;
        return n.toLocaleString("zh-TW", { maximumFractionDigits: 2 });
    },
};

$(document).ready(function () {
    MacroApp.init();
});
