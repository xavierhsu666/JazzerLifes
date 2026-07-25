// ---- 小工具：使用 UTC 避免時區影響 ----
function makeUTCDate(y, m /*0-11*/, d) {
    return new Date(Date.UTC(y, m, d));
}
function addDaysUTC(date, days) {
    const d = new Date(date.getTime());
    d.setUTCDate(d.getUTCDate() + days);
    return d;
}
function sameOrAfterUTC(a, b) {
    return a.getTime() >= b.getTime();
}
function sameOrBeforeUTC(a, b) {
    return a.getTime() <= b.getTime();
}
function getWeekdayUTC(date) {
    // JS: 0=Sunday ... 6=Saturday
    return date.getUTCDay();
}

// ---- 解析 frequency 字串成物件 ----
// 例如 "{type:'weekly',interval:'1',weekday:'1'}" -> { type:'weekly', interval:1, weekday:1 }
function parseFrequency(freqStr) {
    if (typeof freqStr === "object" && freqStr) {
        // 若你未來改成物件就直接用
        const out = { ...freqStr };
        if (out.interval != null) out.interval = Number(out.interval);
        if (out.weekday != null) out.weekday = Number(out.weekday);
        if (out.date != null) out.date = Number(out.date);
        if (out.month != null) out.month = Number(out.month);
        return out;
    }
    if (typeof freqStr !== "string") return null;
    // 簡易解析（假設輸入是乾淨的字串）
    const cleaned = freqStr
        .trim()
        .replace(/^{|}$/g, "")
        .split(",")
        .map((s) => s.trim());

    const obj = {};
    for (const part of cleaned) {
        const [k, v] = part.split(":").map((s) => s.trim());
        // 去掉包住的引號
        const val = v.replace(/^'|"|`/, "").replace(/'|"|`$/, "");
        // 轉數字（能轉就轉）
        if (["interval", "weekday", "date", "month"].includes(k)) {
            obj[k] = Number(val);
        } else {
            obj[k] = val;
        }
    }
    return obj;
}

// ---- 找到某週規則的第一個發生日（>= anchorStart） ----
function firstWeeklyOnOrAfter(anchorStart, targetWeekday /*1=Mon..7=Sun*/) {
    // JS: 0=Sun..6=Sat，題目 weekday=1=Mon，因此需轉換
    const jsTarget = targetWeekday % 7; // 1->1(Mon) ... 7->0(Sun)
    const adjustedJsTarget = jsTarget === 0 ? 0 : jsTarget; // 7->0(日)
    // 將 weekday=1(Mon) 映射為 JS 的 1
    // 但上面處理 7->0；其餘 1..6 -> 1..6

    const startW = getWeekdayUTC(anchorStart); // 0..6
    // 計算距離目標星期幾還差幾天
    let delta = adjustedJsTarget - startW;
    if (delta < 0) delta += 7;
    return addDaysUTC(anchorStart, delta);
}

// ---- 產生一筆 weekly 規則在某年內的所有發生日 ----
function generateWeeklyOccurrencesInYear(freq, year, startDateUTC) {
    const intervalWeeks = Math.max(1, Number(freq.interval || 1));
    const weekday = Number(freq.weekday); // 1=Mon..7=Sun（題目定義）
    if (!(weekday >= 1 && weekday <= 7)) return [];

    const yearStart = makeUTCDate(year, 0, 1);
    const yearEnd = makeUTCDate(year, 11, 31);
    const windowStart = sameOrAfterUTC(startDateUTC, yearStart) ? startDateUTC : yearStart;

    let first = firstWeeklyOnOrAfter(windowStart, weekday);
    if (!sameOrBeforeUTC(first, yearEnd)) return [];

    const stepDays = 7 * intervalWeeks;
    const occ = [];
    for (let d = first; sameOrBeforeUTC(d, yearEnd); d = addDaysUTC(d, stepDays)) {
        occ.push(d);
    }
    return occ;
}

// ---- 產生 monthly 規則在某年內的所有發生日 ----
function generateMonthlyOccurrencesInYear(freq, year, startDateUTC) {
    const intervalMonths = Math.max(1, Number(freq.interval || 1));
    const day = Math.max(1, Number(freq.date || 1)); // 每月幾號
    const yearStart = makeUTCDate(year, 0, 1);
    const yearEnd = makeUTCDate(year, 11, 31);

    const anchor = sameOrAfterUTC(startDateUTC, yearStart) ? startDateUTC : yearStart;

    // 從 anchor 起算，找到第一個 >= anchor 且位於指定 day 的月份
    let m = anchor.getUTCMonth();
    let y = anchor.getUTCFullYear();
    let firstCandidate = makeUTCDate(y, m, day);

    if (sameOrBeforeUTC(firstCandidate, yearEnd) && sameOrAfterUTC(firstCandidate, anchor)) {
        // ok
    } else {
        // 跳到下一個間隔
        m += intervalMonths;
        y += Math.floor(m / 12);
        m = m % 12;
        firstCandidate = makeUTCDate(y, m, day);
    }

    const occ = [];
    for (let yy = firstCandidate.getUTCFullYear(), mm = firstCandidate.getUTCMonth(); yy === year && sameOrBeforeUTC(makeUTCDate(yy, mm, day), yearEnd);) {
        const d = makeUTCDate(yy, mm, day);
        if (sameOrAfterUTC(d, anchor)) {
            occ.push(d);
        }
        mm += intervalMonths;
        yy += Math.floor(mm / 12);
        mm = mm % 12;
        if (yy > year) break;
    }
    return occ;
}

// ---- 產生 yearly 規則在某年內的所有發生日 ----
function generateYearlyOccurrencesInYear(freq, year, startDateUTC) {
    const month = Number(freq.month); // 1..12
    const day = Math.max(1, Number(freq.date || 1));
    const intervalYears = Math.max(1, Number(freq.interval || 1));

    if (!(month >= 1 && month <= 12)) return [];

    const candidate = makeUTCDate(year, month - 1, day);
    // console.log(candidate, startDateUTC);
    if (!sameOrAfterUTC(candidate, startDateUTC)) {
        // 若該年的指定日還早於 startDate，就不計
        return [];
    }
    // intervalYears 只在跨多年的計算有用；本函式限定單一年份，因此只要符合就加入
    return [candidate];
}

// ---- 主函式：計算每月合計 ----
function computeMonthlyForecast(bills, year) {
    const monthlyTotals = Array(12).fill(0);
    const breakdown = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1, // 1..12
        items: [], // 每筆品項在該月的合計（便於檢視）
    }));

    for (const bill of bills) {
        const freq = parseFrequency(bill.Frequency);

        if (!freq || !freq.type) continue;

        const startDateUTC = new Date(`${bill.BillStartTime}`); // 以 UTC 解析 ISO 起始日
        let occurrences = [];

        if (freq.type === "weekly") {
            occurrences = generateWeeklyOccurrencesInYear(freq, year, startDateUTC);
        } else if (freq.type === "monthly") {
            occurrences = generateMonthlyOccurrencesInYear(freq, year, startDateUTC);
        } else if (freq.type === "yearly") {
            occurrences = generateYearlyOccurrencesInYear(freq, year, startDateUTC);
        } else {
            // 其他型別可自行擴充
            continue;
        }

        // 將每次發生記入對應月份
        for (const d of occurrences) {
            const m = d.getUTCMonth(); // 0..11
            monthlyTotals[m] += bill.BillAmount;
        }

        // 也做拆解（每月各品項）方便你檢視
        // 先彙總該品項在各月的數量
        const perMonthCount = Array(12).fill(0);
        for (const d of occurrences) {
            perMonthCount[d.getUTCMonth()] += 1;
        }
        perMonthCount.forEach((count, m) => {
            if (count > 0) {
                breakdown[m].items.push({
                    billProject: bill.BillProjectId,
                    name: bill.BillName,
                    count,
                    amountEach: bill.BillAmount,
                    subtotal: bill.BillAmount * count,
                });
            }
        });
    }

    const grandTotal = monthlyTotals.reduce((a, b) => a + b, 0);
    // pivot by month
    const pivot = monthlyTotals.map((total, i) => ({ month: i + 1, total }));
    return { monthlyTotals, grandTotal, breakdown, pivot };
}
