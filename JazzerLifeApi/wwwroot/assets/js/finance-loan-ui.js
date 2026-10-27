/**
 * 信貸試算的畫面層（計算邏輯都在 finance-loan.js，這裡只負責讀表單、算完塞回 DOM）
 *
 * finance.js 的 switchView() 進到 loan-* 這三個 view 時會呼叫 FinanceLoanUI.initView(viewId)，
 * 事件只綁一次（bound 旗標），之後輸入值一改就立刻重算，不需要按「計算」。
 */
(function (global) {
    "use strict";

    var L = global.FinanceLoan;
    var bound = {};
    var loaded = false;
    var charts = {};

    // 條件輸入欄位 → state.inputs 的鍵；全部都是數字欄位，統一走 L.num()
    var FIELDS = {
        loanAnnualIncome: "annualIncome",
        loanStockValue: "stockValue",
        loanSavingsValue: "savingsValue",
        loanAssetRecogPct: "assetRecogPct",
        loanDbrMultiple: "dbrMultiple",
        loanRate: "rate",
        loanYears: "years",
        loanExistingDebt: "existingDebt",
        loanExistingMonthly: "existingMonthly",
    };

    var SCHED_FIELDS = {
        loanExtraMonthly: "extraMonthly",
        loanLumpAmount: "lumpAmount",
        loanLumpMonth: "lumpMonth",
        loanPenaltyPct: "penaltyPct",
    };

    function $id(id) {
        return document.getElementById(id);
    }

    function setText(id, text) {
        var el = $id(id);
        if (el) el.textContent = text;
    }

    function setHtml(id, html) {
        var el = $id(id);
        if (el) el.innerHTML = html;
    }

    /* ------------------------------------------------------- 表單 ←→ 狀態 */

    function writeCapacityForm() {
        var inp = L.state.inputs;
        Object.keys(FIELDS).forEach(function (id) {
            var el = $id(id);
            if (el) el.value = inp[FIELDS[id]];
        });
        var override = $id("loanAmountOverride");
        if (override) override.value = inp.loanOverride;
    }

    function readCapacityForm() {
        var inp = L.state.inputs;
        Object.keys(FIELDS).forEach(function (id) {
            var el = $id(id);
            if (el) inp[FIELDS[id]] = L.num(el.value, 0);
        });
        var override = $id("loanAmountOverride");
        // 自訂金額留空代表「就用可貸上限」，所以空字串要原樣保留，不能轉成 0
        if (override) inp.loanOverride = override.value.trim() === "" ? "" : L.num(override.value, 0);
        L.save();
    }

    function writeScheduleForm() {
        var inp = L.state.inputs;
        Object.keys(SCHED_FIELDS).forEach(function (id) {
            var el = $id(id);
            if (el) el.value = inp[SCHED_FIELDS[id]];
        });
    }

    function readScheduleForm() {
        var inp = L.state.inputs;
        Object.keys(SCHED_FIELDS).forEach(function (id) {
            var el = $id(id);
            if (el) inp[SCHED_FIELDS[id]] = L.num(el.value, 0);
        });
        L.save();
    }

    /* ----------------------------------------------------------- 可貸上限 */

    function renderCapacity() {
        var inp = L.state.inputs;
        var m = L.computeCredit(inp);

        setText("loanSumAvailable", L.fmtNT(m.available));
        setText("loanSumAvailableSub", L.fmtWan(m.available) + "（DBR 上限扣掉已有負債）");
        setText("loanSumDbrCap", L.fmtNT(m.dbrCap));
        setText("loanSumDbrCapSub", "認列月收入 " + L.fmtNT(m.recogMonthly) + " × " + inp.dbrMultiple + " 倍");
        setText("loanSumPay", L.fmtNT(m.pay));
        setText("loanSumPaySub", inp.years + " 年 " + L.fmtPct(inp.rate, 2) + "，本息均攤");
        setText("loanSumInterest", L.fmtNT(m.totalInterest));
        setText("loanSumInterestSub", "本息總支出 " + L.fmtNT(m.totalPaid));

        // 認列收入的組成：年收入全額，股票與活存各自受「年收入 × 認列成數」的天花板限制
        var recogRows = [
            { name: "年收入", raw: m.annual, recog: m.annual, cap: null },
            { name: "股票市值", raw: inp.stockValue, recog: m.stockRecog, cap: m.recogCap },
            { name: "活存餘額", raw: inp.savingsValue, recog: m.savingsRecog, cap: m.recogCap },
        ];

        setHtml("loanRecogTable",
            "<table class=\"loan-table\"><thead><tr><th>項目</th><th class=\"num\">提出金額</th><th class=\"num\">認列上限</th><th class=\"num\">實際認列</th><th>狀態</th></tr></thead><tbody>" +
            recogRows.map(function (r) {
                var full = r.cap != null && r.recog >= r.cap - 1;
                return "<tr>" +
                    "<td>" + L.esc(r.name) + "</td>" +
                    "<td class=\"num\">" + L.fmtNT(r.raw) + "</td>" +
                    "<td class=\"num\">" + (r.cap == null ? "全額認列" : L.fmtNT(r.cap)) + "</td>" +
                    "<td class=\"num\">" + L.fmtNT(r.recog) + "</td>" +
                    "<td>" + (r.cap == null
                        ? ""
                        : (full
                            ? "<span class=\"loan-badge ok\">已認滿</span>"
                            : "<span class=\"loan-badge warn\">還差 " + L.fmtNT(r.cap - r.recog) + "</span>")) +
                    "</td>" +
                    "</tr>";
            }).join("") +
            "<tr class=\"is-binding\"><td><strong>認列年收入</strong></td><td class=\"num\"></td><td class=\"num\"></td>" +
            "<td class=\"num\"><strong>" + L.fmtNT(m.recogAnnual) + "</strong></td><td></td></tr>" +
            "</tbody></table>");

        setHtml("loanDbrTable",
            "<table class=\"loan-table\"><thead><tr><th>項目</th><th class=\"num\">金額</th><th>說明</th></tr></thead><tbody>" +
            "<tr><td>認列月收入</td><td class=\"num\">" + L.fmtNT(m.recogMonthly) + "</td>" +
            "<td class=\"loan-formula\">認列年收入 " + L.fmtNT(m.recogAnnual) + " ÷ 12</td></tr>" +
            "<tr><td>DBR " + inp.dbrMultiple + " 倍上限</td><td class=\"num\">" + L.fmtNT(m.dbrCap) + "</td>" +
            "<td class=\"loan-formula\">無擔保負債總餘額的天花板</td></tr>" +
            "<tr><td>已有無擔保負債</td><td class=\"num\">− " + L.fmtNT(m.existingDebt) + "</td>" +
            "<td class=\"loan-formula\">信貸、卡循、現金卡的剩餘本金</td></tr>" +
            "<tr class=\"is-binding\"><td><strong>還可以借</strong></td><td class=\"num\"><strong>" + L.fmtNT(m.available) + "</strong></td>" +
            "<td class=\"loan-formula\">" + (m.available > 0 ? "送件金額超過這個數字就會被 DBR 擋下來" : "額度已經用滿，要先清掉舊負債才有空間") + "</td></tr>" +
            "</tbody></table>");

        setHtml("loanLoanInfo",
            "<div class=\"pd-stats\">" +
            "<span class=\"pd-chip\">試算金額 " + L.fmtNT(m.loan) + "</span>" +
            "<span class=\"pd-chip\">借完後 DBR " + m.dbrAfter.toFixed(1) + " 倍</span>" +
            "<span class=\"pd-chip\">月付佔認列月收入 " + L.fmtPct(m.burdenRatio) + "</span>" +
            "</div>");

        var advice = L.buildAdvice(inp);
        setHtml("loanAdvice", advice.items.length
            ? "<table class=\"loan-table\"><thead><tr><th>做法</th><th class=\"num\">可貸上限</th><th class=\"num\">增加</th><th>備註</th></tr></thead><tbody>" +
              advice.items.map(function (t) {
                  return "<tr>" +
                      "<td>" + L.esc(t.label) + "</td>" +
                      "<td class=\"num\">" + L.fmtNT(t.value) + "</td>" +
                      "<td class=\"num pos\">+" + L.fmtNT(t.delta) + "</td>" +
                      "<td class=\"loan-formula\">" + L.esc(t.note) + "</td>" +
                      "</tr>";
              }).join("") + "</tbody></table>"
            : "<p class=\"pd-muted\">股票與活存都已認到上限、也沒有舊負債可以清，目前額度就是認列收入能撐到的極限了。</p>");

        renderSensitivity(inp);
    }

    function renderSensitivity(inp) {
        var s = L.buildSensitivity(inp);
        var html = "<p class=\"pd-muted\">以試算金額 " + L.fmtNT(s.loan) + " 計算，上排是月付、下排是總利息。</p>" +
            "<table class=\"loan-table loan-matrix\"><thead><tr><th>年限 ＼ 利率</th>" +
            s.rates.map(function (r) { return "<th class=\"num\">" + r.toFixed(2) + "%</th>"; }).join("") +
            "</tr></thead><tbody>";
        s.grid.forEach(function (row) {
            html += "<tr><th>" + row.years + " 年</th>" +
                row.cells.map(function (c) {
                    var isBest = isFinite(s.best) && c.pay > 0 && c.pay <= s.best + 1;
                    return "<td class=\"num" + (isBest ? " is-best" : "") + "\">" + L.fmtNT(c.pay) +
                        "<br /><span class=\"loan-sub\">利息 " + L.fmtNT(c.interest) + "</span></td>";
                }).join("") + "</tr>";
        });
        html += "</tbody></table>";
        setHtml("loanSensitivity", html);
    }

    function bindCapacity() {
        if (bound.capacity) return;
        bound.capacity = true;

        Object.keys(FIELDS).concat(["loanAmountOverride"]).forEach(function (id) {
            var el = $id(id);
            if (!el) return;
            el.addEventListener("input", function () {
                readCapacityForm();
                renderCapacity();
            });
            el.addEventListener("change", function () {
                readCapacityForm();
                renderCapacity();
            });
        });

        var applyMax = $id("loanApplyMax");
        if (applyMax) {
            applyMax.addEventListener("click", function () {
                var m = L.computeCredit(Object.assign({}, L.state.inputs, { loanOverride: "" }));
                L.state.inputs.loanOverride = Math.floor(m.available);
                L.save();
                writeCapacityForm();
                renderCapacity();
            });
        }

        var clearOverride = $id("loanClearOverride");
        if (clearOverride) {
            clearOverride.addEventListener("click", function () {
                L.state.inputs.loanOverride = "";
                L.save();
                writeCapacityForm();
                renderCapacity();
            });
        }

        var reset = $id("loanResetInputs");
        if (reset) {
            reset.addEventListener("click", function () {
                if (!confirm("確定要把所有試算條件回復成預設值嗎？")) return;
                L.state.inputs = Object.assign({}, L.DEFAULTS);
                L.state.scenarios = L.defaultScenarios();
                L.save();
                writeCapacityForm();
                renderCapacity();
            });
        }
    }

    /* ----------------------------------------------------------- 方案比較 */

    function scenarioMetrics(sc) {
        var i = L.num(sc.rate) / 100 / 12;
        var n = Math.max(1, Math.round(L.num(sc.years) * 12));
        var loan = Math.max(0, L.num(sc.loan));
        var pay = L.monthlyPayment(loan, i, n);
        var totalInterest = Math.max(0, pay * n - loan);
        return { loan: loan, pay: pay, totalInterest: totalInterest, totalPaid: loan + totalInterest, months: n };
    }

    function compareTableHtml(metrics) {
        var scs = L.state.scenarios;
        if (!scs.length) return "<p class=\"pd-muted\">還沒有方案，按「新增方案」開始比較。</p>";

        var minPay = Math.min.apply(null, metrics.map(function (x) { return x.pay; }));
        var minInterest = Math.min.apply(null, metrics.map(function (x) { return x.totalInterest; }));

        return "<table class=\"loan-table\"><thead><tr><th>方案</th><th class=\"num\">金額</th><th class=\"num\">利率</th>" +
            "<th class=\"num\">年限</th><th class=\"num\">月付</th><th class=\"num\">總利息</th><th class=\"num\">本息總支出</th></tr></thead><tbody>" +
            scs.map(function (sc, idx) {
                var x = metrics[idx];
                return "<tr>" +
                    "<td>" + L.esc(sc.name) + "</td>" +
                    "<td class=\"num\">" + L.fmtNT(x.loan) + "</td>" +
                    "<td class=\"num\">" + L.fmtPct(L.num(sc.rate), 2) + "</td>" +
                    "<td class=\"num\">" + L.num(sc.years) + " 年</td>" +
                    "<td class=\"num" + (x.pay <= minPay + 1 ? " is-best" : "") + "\">" + L.fmtNT(x.pay) + "</td>" +
                    "<td class=\"num" + (x.totalInterest <= minInterest + 1 ? " is-best" : "") + "\">" + L.fmtNT(x.totalInterest) + "</td>" +
                    "<td class=\"num\">" + L.fmtNT(x.totalPaid) + "</td>" +
                    "</tr>";
            }).join("") + "</tbody></table>";
    }

    function renderCompare() {
        var scs = L.state.scenarios;

        // 欄位名稱在桌機版由上方標題列負責，手機版標題列會收起來，所以每格都帶一個自己的小標
        function cell(label, key, value, type, step) {
            return "<label class=\"loan-scenario-cell\">" +
                "<span>" + label + "</span>" +
                "<input type=\"" + type + "\" data-k=\"" + key + "\" value=\"" + L.esc(value) + "\"" +
                (step ? " step=\"" + step + "\"" : "") + " placeholder=\"" + label + "\" />" +
                "</label>";
        }

        setHtml("loanScenarioRows", scs.map(function (sc, idx) {
            return "<div class=\"loan-scenario-row\" data-idx=\"" + idx + "\">" +
                cell("方案名稱", "name", sc.name, "text") +
                cell("金額（元）", "loan", sc.loan, "number", "10000") +
                cell("利率（%）", "rate", sc.rate, "number", "0.05") +
                cell("年限", "years", sc.years, "number", "1") +
                "<button class=\"btn-danger loan-scenario-del\" type=\"button\">刪除</button>" +
                "</div>";
        }).join(""));

        var metrics = scs.map(scenarioMetrics);
        setHtml("loanCompareTable", compareTableHtml(metrics));
        renderCompareChart(scs, metrics);
    }

    function renderCompareChart(scs, metrics) {
        var el = $id("loanCompareChart");
        if (!el || typeof global.Highcharts === "undefined" || !scs.length) return;

        charts.compare = global.Highcharts.chart("loanCompareChart", {
            chart: { type: "column", backgroundColor: "transparent", style: { fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" } },
            title: { text: "月付金 vs 總利息", style: { color: "#ffffff" } },
            credits: { enabled: false },
            xAxis: {
                categories: scs.map(function (s) { return s.name; }),
                gridLineColor: "#424242",
                lineColor: "#757575",
                tickColor: "#757575",
                labels: { style: { color: "#b0b0b0" } },
            },
            yAxis: [
                {
                    title: { text: "月付金 (NT$)", style: { color: "#b0b0b0" } },
                    gridLineColor: "#424242",
                    labels: { style: { color: "#b0b0b0" } },
                },
                {
                    title: { text: "總利息 (NT$)", style: { color: "#b0b0b0" } },
                    gridLineColor: "#424242",
                    labels: { style: { color: "#b0b0b0" } },
                    opposite: true,
                },
            ],
            legend: { itemStyle: { color: "#b0b0b0" }, itemHoverStyle: { color: "#ffffff" } },
            tooltip: {
                backgroundColor: "#2a2a2a",
                borderColor: "#757575",
                style: { color: "#ffffff" },
                shared: true,
                outside: true,
                valuePrefix: "NT$ ",
            },
            plotOptions: { column: { borderWidth: 0 } },
            series: [
                { name: "月付", data: metrics.map(function (x) { return Math.round(x.pay); }), color: "#00bcd4" },
                { name: "總利息", data: metrics.map(function (x) { return Math.round(x.totalInterest); }), color: "#ff9800", yAxis: 1 },
            ],
        });
    }

    function bindCompare() {
        if (bound.compare) return;
        bound.compare = true;

        var wrap = $id("loanScenarioRows");
        if (wrap) {
            // 方案列是動態產生的，用事件委派避免每次重畫都要重綁
            wrap.addEventListener("input", function (e) {
                var row = e.target.closest(".loan-scenario-row");
                if (!row) return;
                var idx = Number(row.dataset.idx);
                var key = e.target.dataset.k;
                if (!key || !L.state.scenarios[idx]) return;
                L.state.scenarios[idx][key] = key === "name" ? e.target.value : L.num(e.target.value, 0);
                L.save();
                // 只重算表格與圖，不重畫輸入列，否則游標會跳掉
                var metrics = L.state.scenarios.map(scenarioMetrics);
                setHtml("loanCompareTable", compareTableHtml(metrics));
                renderCompareChart(L.state.scenarios, metrics);
            });
            wrap.addEventListener("click", function (e) {
                if (!e.target.classList.contains("loan-scenario-del")) return;
                var row = e.target.closest(".loan-scenario-row");
                L.state.scenarios.splice(Number(row.dataset.idx), 1);
                L.save();
                renderCompare();
            });
        }

        var add = $id("loanAddScenario");
        if (add) {
            add.addEventListener("click", function () {
                var inp = L.state.inputs;
                var m = L.computeCredit(inp);
                L.state.scenarios.push({
                    name: "方案 " + (L.state.scenarios.length + 1),
                    loan: Math.round(m.loan),
                    rate: inp.rate,
                    years: inp.years,
                });
                L.save();
                renderCompare();
            });
        }

        var reset = $id("loanResetScenarios");
        if (reset) {
            reset.addEventListener("click", function () {
                L.state.scenarios = L.defaultScenarios();
                L.save();
                renderCompare();
            });
        }
    }

    /* ------------------------------------------------------ 攤還／提前還款 */

    function renderSchedule() {
        var inp = L.state.inputs;
        var m = L.computeCredit(inp);

        var base = L.buildSchedule(m.loan, m.i, m.n, 0, 0, 0, 0);
        var actual = L.buildSchedule(m.loan, m.i, m.n, inp.extraMonthly, inp.lumpAmount, inp.lumpMonth, inp.penaltyPct);
        var savedInterest = base.totalInterest - actual.totalInterest;
        var net = savedInterest - actual.penalty;
        var shorter = base.months - actual.months;

        setText("loanSchedLoan", L.fmtNT(m.loan));
        setText("loanSchedBaseInterest", L.fmtNT(base.totalInterest));
        setText("loanSchedNewInterest", L.fmtNT(actual.totalInterest));
        setText("loanSchedNewInterestSub", actual.penalty > 0 ? "違約金 " + L.fmtNT(actual.penalty) : "無違約金");
        setText("loanSchedSaved", L.fmtNT(net));
        setText("loanSchedSavedSub", shorter > 0
            ? "省利息 " + L.fmtNT(savedInterest) + "，提早 " + shorter + " 期（約 " + (shorter / 12).toFixed(1) + " 年）還完"
            : "沒有提前還款");

        var years = L.yearlySummary(actual.rows);
        setHtml("loanScheduleYearly",
            "<table class=\"loan-table\"><thead><tr><th>第 N 年</th><th class=\"num\">年繳本息</th><th class=\"num\">其中利息</th><th class=\"num\">其中本金</th><th class=\"num\">年末餘額</th></tr></thead><tbody>" +
            years.map(function (y) {
                return "<tr>" +
                    "<td>" + y.year + "</td>" +
                    "<td class=\"num\">" + L.fmtNT(y.pay) + "</td>" +
                    "<td class=\"num\">" + L.fmtNT(y.interest) + "</td>" +
                    "<td class=\"num\">" + L.fmtNT(y.principal) + "</td>" +
                    "<td class=\"num\">" + L.fmtNT(y.balance) + "</td>" +
                    "</tr>";
            }).join("") + "</tbody></table>");

        // 每期明細預設只給前 36 期，想看全部再展開
        var limit = inp.showAllMonths ? actual.rows.length : Math.min(36, actual.rows.length);
        setHtml("loanScheduleMonthly",
            "<table class=\"loan-table\"><thead><tr><th>期數</th><th class=\"num\">月付</th><th class=\"num\">利息</th><th class=\"num\">本金</th><th class=\"num\">額外還本</th><th class=\"num\">剩餘本金</th></tr></thead><tbody>" +
            actual.rows.slice(0, limit).map(function (r) {
                return "<tr>" +
                    "<td>" + r.m + "</td>" +
                    "<td class=\"num\">" + L.fmtNT(r.pay) + "</td>" +
                    "<td class=\"num\">" + L.fmtNT(r.interest) + "</td>" +
                    "<td class=\"num\">" + L.fmtNT(r.principal - r.extra) + "</td>" +
                    "<td class=\"num\">" + (r.extra > 0 ? L.fmtNT(r.extra) : "—") + "</td>" +
                    "<td class=\"num\">" + L.fmtNT(r.balance) + "</td>" +
                    "</tr>";
            }).join("") + "</tbody></table>");

        var toggle = $id("loanShowAllMonths");
        if (toggle) {
            toggle.textContent = inp.showAllMonths
                ? "只顯示前 36 期"
                : "顯示全部 " + actual.rows.length + " 期";
        }
    }

    function bindSchedule() {
        if (bound.schedule) return;
        bound.schedule = true;

        Object.keys(SCHED_FIELDS).forEach(function (id) {
            var el = $id(id);
            if (!el) return;
            el.addEventListener("input", function () {
                readScheduleForm();
                renderSchedule();
            });
        });

        var toggle = $id("loanShowAllMonths");
        if (toggle) {
            toggle.addEventListener("click", function () {
                L.state.inputs.showAllMonths = !L.state.inputs.showAllMonths;
                L.save();
                renderSchedule();
            });
        }
    }

    /* -------------------------------------------------------------- 入口 */

    function initView(viewId) {
        if (!loaded) {
            L.load();
            loaded = true;
        }

        switch (viewId) {
            case "loan-capacity":
                bindCapacity();
                writeCapacityForm();
                renderCapacity();
                break;
            case "loan-compare":
                bindCompare();
                renderCompare();
                break;
            case "loan-schedule":
                bindSchedule();
                writeScheduleForm();
                renderSchedule();
                break;
            default:
                break;
        }
    }

    global.FinanceLoanUI = { initView: initView };
})(window);
