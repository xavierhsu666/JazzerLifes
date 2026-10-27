/**
 * 信用貸款試算模組（Finance → 試算）
 *
 * 信貸看的是「認列收入 × DBR 22 倍」這條天花板，跟房貸的成數／月付負擔是兩回事，所以這裡的主軸是：
 *   1. 可貸上限：年收入加上股票、活存折算進來的認列收入，乘以 DBR 倍數，再扣掉已有的無擔保負債。
 *   2. 方案比較：同一筆金額在不同利率／年限下的月付與總利息（年限利率不影響額度，只影響還款壓力）。
 *   3. 攤還與提前還款：含提前清償違約金，算出真正省下多少。
 *
 * 認列規則依使用者的實際情況設定：股票與活存各自的認列金額 = min(該資產金額, 年收入 × 認列成數)，
 * 預設認列成數 30%，所以資產再多也只認到年收入的三成，兩項合計最多把認列收入拉到年收入的 1.6 倍。
 *
 * 全部在前端計算、不打 API；輸入值存在 localStorage，換頁或下次開啟不用重打。金額一律用「元」。
 */
(function (global) {
    "use strict";

    var STORAGE_KEY = "jzFinanceLoanSim_v2";

    var DEFAULTS = {
        annualIncome: 1200000,  // 年收入（元）
        stockValue: 0,          // 股票市值（元）
        savingsValue: 0,        // 活存餘額（元）
        assetRecogPct: 30,      // 股票／活存各自的認列上限＝年收入的百分之多少
        dbrMultiple: 22,        // DBR 倍數（金管會自律規範為 22 倍）
        rate: 3.5,              // 年利率（%）
        years: 7,               // 貸款年限（年）
        existingDebt: 0,        // 已有無擔保負債餘額（元）＝已經吃掉的 DBR 額度
        existingMonthly: 0,     // 已有貸款每月還款（元），只影響月付負擔率
        loanOverride: "",       // 自訂試算金額（元），空白＝用可貸上限
        extraMonthly: 0,        // 每月額外還本（元）
        lumpAmount: 0,          // 一次性提前還本（元）
        lumpMonth: 12,          // 一次性還本發生在第幾期
        penaltyPct: 0,          // 提前清償違約金（%，以提前償還的本金計）
        showAllMonths: false,   // 每期明細是否全部展開
    };

    // 月付金敏感度矩陣的座標軸：年限固定，利率以目前利率為中心左右各 1%
    var SENS_YEARS = [3, 5, 7];
    var SENS_RATE_OFFSETS = [-1, -0.5, 0, 0.5, 1];

    var state = {
        inputs: Object.assign({}, DEFAULTS),
        scenarios: [],
    };

    /* ---------------------------------------------------------------- 工具 */

    function num(v, fallback) {
        var n = typeof v === "number" ? v : parseFloat(String(v == null ? "" : v).replace(/,/g, ""));
        return isFinite(n) ? n : (fallback || 0);
    }

    function fmtNT(v) {
        if (!isFinite(v)) return "—";
        return "NT$ " + Math.round(v).toLocaleString("en-US");
    }

    function fmtWan(v) {
        if (!isFinite(v)) return "—";
        return (v / 10000).toLocaleString("en-US", { maximumFractionDigits: 1 }) + " 萬";
    }

    function fmtPct(v, digits) {
        if (!isFinite(v)) return "—";
        return v.toFixed(digits == null ? 1 : digits) + "%";
    }

    function esc(s) {
        return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
        });
    }

    /* ------------------------------------------------------------ 核心計算 */

    /** 本息均攤的每月應繳金額 */
    function monthlyPayment(principal, monthlyRate, months) {
        if (months <= 0 || principal <= 0) return 0;
        if (monthlyRate <= 0) return principal / months;
        return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
    }

    /**
     * 信貸可貸上限。
     *
     * 認列收入：年收入本身全額認列；股票與活存各自認列 min(資產金額, 年收入 × 認列成數)，
     * 也就是資產再多也只能補到年收入的三成，兩項各算一次。
     *
     * DBR 22 倍管的是「無擔保負債總餘額 ÷ 認列月收入」，所以已有的信貸、卡循餘額要先扣掉，
     * 扣完剩下的才是這次還能借的空間。年限與利率不影響這條上限，只影響月付與總利息。
     */
    function computeCredit(inp) {
        var annual = Math.max(0, inp.annualIncome);
        var recogCap = annual * (inp.assetRecogPct / 100);
        var stockRecog = Math.min(Math.max(0, inp.stockValue), recogCap);
        var savingsRecog = Math.min(Math.max(0, inp.savingsValue), recogCap);

        var recogAnnual = annual + stockRecog + savingsRecog;
        var recogMonthly = recogAnnual / 12;

        var dbrCap = recogMonthly * inp.dbrMultiple;
        var available = Math.max(0, dbrCap - Math.max(0, inp.existingDebt));

        var loan = (inp.loanOverride === "" || inp.loanOverride == null)
            ? available
            : Math.max(0, num(inp.loanOverride));

        var i = inp.rate / 100 / 12;
        var n = Math.max(1, Math.round(inp.years * 12));
        var pay = monthlyPayment(loan, i, n);
        var totalInterest = Math.max(0, pay * n - loan);

        return {
            i: i, n: n,
            annual: annual,
            recogCap: recogCap,
            stockRecog: stockRecog,
            savingsRecog: savingsRecog,
            stockUnused: Math.max(0, recogCap - stockRecog),
            savingsUnused: Math.max(0, recogCap - savingsRecog),
            recogAnnual: recogAnnual,
            recogMonthly: recogMonthly,
            dbrCap: dbrCap,
            existingDebt: Math.max(0, inp.existingDebt),
            available: available,
            loan: loan,
            pay: pay,
            totalInterest: totalInterest,
            totalPaid: loan + totalInterest,
            // 借完之後的 DBR 倍數，超過 22 就是送件會被打回來的狀態
            dbrAfter: recogMonthly > 0 ? (Math.max(0, inp.existingDebt) + loan) / recogMonthly : 0,
            burdenRatio: recogMonthly > 0 ? ((pay + Math.max(0, inp.existingMonthly)) / recogMonthly) * 100 : 0,
        };
    }

    /**
     * 產生攤還表。extraMonthly／lumpAmount 是額外還本，銀行一般不會因此重算月付，
     * 效果反映在「提早還完」；penaltyPct 是提前清償違約金，按提前償還的本金收取。
     */
    function buildSchedule(loan, i, n, extraMonthly, lumpAmount, lumpMonth, penaltyPct) {
        var rows = [];
        var balance = loan;
        var basePay = monthlyPayment(loan, i, n);
        var totalInterest = 0;
        var totalExtra = 0;

        for (var m = 1; m <= n && balance > 0.5; m++) {
            var interest = balance * i;
            var principal = basePay - interest;
            if (principal < 0) principal = 0;

            var extra = Math.max(0, extraMonthly);
            if (lumpAmount > 0 && m === Math.round(lumpMonth)) extra += lumpAmount;
            if (extra > balance - principal) extra = Math.max(0, balance - principal);

            principal += extra;
            if (principal > balance) {
                extra = Math.max(0, extra - (principal - balance));
                principal = balance;
            }

            balance -= principal;
            totalInterest += interest;
            totalExtra += extra;
            rows.push({
                m: m,
                pay: interest + principal,
                interest: interest,
                principal: principal,
                extra: extra,
                balance: balance,
            });
        }

        return {
            rows: rows,
            totalInterest: totalInterest,
            totalExtra: totalExtra,
            penalty: totalExtra * (Math.max(0, penaltyPct) / 100),
            months: rows.length,
        };
    }

    function yearlySummary(rows) {
        var map = [];
        rows.forEach(function (r) {
            var y = Math.ceil(r.m / 12);
            if (!map[y]) map[y] = { year: y, pay: 0, interest: 0, principal: 0, balance: 0 };
            map[y].pay += r.pay;
            map[y].interest += r.interest;
            map[y].principal += r.principal;
            map[y].balance = r.balance;
        });
        return map.filter(Boolean);
    }

    /**
     * 「怎麼借更多」的量化建議：每一招都把模型重跑一次，比較可貸上限差多少。
     * 信貸的額度只跟認列收入與已有負債有關，所以能動的就是補財力證明、提高收入、先清掉舊負債。
     */
    function buildAdvice(inp) {
        var baseInp = Object.assign({}, inp, { loanOverride: "" });
        var m = computeCredit(baseInp);
        var base = m.available;
        var items = [];

        function add(label, patch, note) {
            var next = computeCredit(Object.assign({}, baseInp, patch));
            items.push({ label: label, delta: next.available - base, value: next.available, note: note });
        }

        if (m.stockUnused > 0) {
            add("股票財力補到認列上限（再提出 " + fmtNT(m.stockUnused) + "）",
                { stockValue: m.recogCap },
                "股票最多認到年收入的 " + inp.assetRecogPct + "%，也就是 " + fmtNT(m.recogCap));
        }
        if (m.savingsUnused > 0) {
            add("活存財力補到認列上限（再提出 " + fmtNT(m.savingsUnused) + "）",
                { savingsValue: m.recogCap },
                "送件前讓存款在帳上放滿三個月，數字才認得過去");
        }
        if (inp.existingDebt > 0) {
            add("先結清現有無擔保負債 " + fmtNT(inp.existingDebt),
                { existingDebt: 0 },
                "DBR 看的是餘額，清掉多少額度就直接放出來多少");
        }
        add("年收入提高 10%（獎金、兼職所得併入認列）",
            { annualIncome: Math.round(inp.annualIncome * 1.1) },
            "認列收入變高，連帶把股票與活存的認列上限一起墊高");

        return {
            base: base,
            items: items.filter(function (t) { return t.delta > 1; }).sort(function (a, b) { return b.delta - a.delta; }),
        };
    }

    /**
     * 年限 × 利率的月付金矩陣。
     * 信貸額度由 DBR 決定、跟年限利率無關，所以這張表比的是「同一筆金額的還款壓力與總利息」。
     */
    function buildSensitivity(inp) {
        var baseInp = Object.assign({}, inp, { loanOverride: "" });
        var loan = computeCredit(baseInp).loan;
        var rates = SENS_RATE_OFFSETS.map(function (o) { return Math.max(0.1, +(inp.rate + o).toFixed(2)); });
        var best = Infinity;
        var grid = SENS_YEARS.map(function (y) {
            var cells = rates.map(function (r) {
                var i = r / 100 / 12;
                var n = y * 12;
                var pay = monthlyPayment(loan, i, n);
                if (pay > 0 && pay < best) best = pay;
                return { pay: pay, interest: Math.max(0, pay * n - loan) };
            });
            return { years: y, cells: cells };
        });
        return { loan: loan, rates: rates, grid: grid, best: best };
    }

    /* ---------------------------------------------------------- 狀態存取 */

    function defaultScenarios() {
        var inp = state.inputs;
        var loan = Math.round(computeCredit(Object.assign({}, inp, { loanOverride: "" })).available);
        return [
            { name: "基準（目前條件）", loan: loan, rate: inp.rate, years: inp.years },
            { name: "縮短到 3 年", loan: loan, rate: inp.rate, years: 3 },
            { name: "利率高 1%", loan: loan, rate: inp.rate + 1, years: inp.years },
        ];
    }

    function load() {
        try {
            var raw = global.localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var saved = JSON.parse(raw);
                state.inputs = Object.assign({}, DEFAULTS, saved.inputs || {});
                state.scenarios = Array.isArray(saved.scenarios) ? saved.scenarios : [];
            }
        } catch (e) {
            // localStorage 被停用或資料壞掉就回到預設值，不影響頁面運作
        }
        if (!state.scenarios.length) state.scenarios = defaultScenarios();
    }

    function save() {
        try {
            global.localStorage.setItem(STORAGE_KEY, JSON.stringify({ inputs: state.inputs, scenarios: state.scenarios }));
        } catch (e) {
            // 同上，存不進去就算了，不要擋住試算
        }
    }

    global.FinanceLoan = {
        STORAGE_KEY: STORAGE_KEY,
        DEFAULTS: DEFAULTS,
        state: state,
        load: load,
        save: save,
        defaultScenarios: defaultScenarios,
        num: num, fmtNT: fmtNT, fmtWan: fmtWan, fmtPct: fmtPct, esc: esc,
        monthlyPayment: monthlyPayment,
        computeCredit: computeCredit,
        buildSchedule: buildSchedule,
        yearlySummary: yearlySummary,
        buildAdvice: buildAdvice,
        buildSensitivity: buildSensitivity,
    };
})(window);
