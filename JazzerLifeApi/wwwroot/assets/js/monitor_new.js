
// ================================================================
// DATA STORE
// ================================================================
const CATEGORIES = [
    { id: 'employment', label: '就業', icon: 'users' },
    { id: 'inflation', label: '通膨', icon: 'flame' },
    { id: 'rates', label: '利率', icon: 'landmark' },
    { id: 'economy', label: '景氣', icon: 'trending-up' },
    { id: 'sentiment', label: '情緒', icon: 'heart-pulse' },
    { id: 'commodity', label: '商品', icon: 'gem' },
    { id: 'fx', label: '匯率', icon: 'repeat' },
    { id: 'equity', label: '股市', icon: 'bar-chart-3' },
];

function genSpark(base, n = 30, vol = 0.01) {
    const a = []; let v = base * (1 - vol * n / 2);
    for (let i = 0; i < n; i++) { v += base * vol * (Math.random() - .45); a.push(+v.toFixed(v >= 100 ? 0 : 2)) }
    a[n - 1] = base; return a;
}


const ALERT_RULES = [
    { id: 1, name: 'CPI 超標', level: 'L1', metric: 'cpi', cond: 'gt', threshold: 3.3, severity: 'danger', enabled: true, teams: true },
    { id: 2, name: 'VIX 暴漲', level: 'L2', metric: 'vix', cond: 'pct_up', threshold: 15, severity: 'danger', enabled: true, teams: true },
    { id: 3, name: '殖利率倒掛+VIX+PMI', level: 'L3', metric: 'us10y', cond: 'lt', threshold: 4.85, severity: 'danger', enabled: true, teams: true },
    { id: 4, name: '黃金突破 2330', level: 'L1', metric: 'gold', cond: 'gt', threshold: 2330, severity: 'warn', enabled: true, teams: false },
    { id: 5, name: '台幣貶破 32.5', level: 'L1', metric: 'usdtwd', cond: 'gt', threshold: 32.5, severity: 'warn', enabled: true, teams: true },
    { id: 6, name: 'PMI 跌破 50', level: 'L1', metric: 'pmimfg', cond: 'lt', threshold: 50, severity: 'danger', enabled: true, teams: true },
    { id: 7, name: 'S&P500 單週跌 3%', level: 'L2', metric: 'spx', cond: 'pct_down', threshold: 3, severity: 'danger', enabled: false, teams: true },
];

const ALERT_LOGS = [
    { ts: '2026-05-11 09:45', level: 'L3', msg: '組合警示：殖利率倒掛（10Y-2Y = -18bps）+ VIX > 15 + PMI < 50', severity: 'danger' },
    { ts: '2026-05-11 08:30', level: 'L1', msg: 'CPI YoY 3.5% 超過上限門檻 3.3%', severity: 'danger' },
    { ts: '2026-05-10 22:15', level: 'L2', msg: 'VIX 單週漲幅 +19.7% 超過閾值 15%', severity: 'warn' },
    { ts: '2026-05-10 16:00', level: 'L1', msg: '黃金突破 $2,330 創歷史新高', severity: 'success' },
    { ts: '2026-05-09 10:30', level: 'L2', msg: 'DXY 單週漲幅 +0.8%', severity: 'normal' },
    { ts: '2026-05-08 14:20', level: 'L3', msg: '組合警示：PMI < 50 + GDP 下滑至 1.6%', severity: 'warn' },
    { ts: '2026-05-07 09:00', level: 'L1', msg: 'US 10Y 殖利率升至 4.65%', severity: 'warn' },
    { ts: '2026-05-06 15:45', level: 'L1', msg: '台幣貶至 32.45', severity: 'warn' },
    { ts: '2026-05-05 11:30', level: 'L2', msg: '費半 SOX 單週漲幅 +3.3%', severity: 'success' },
];

const CALENDAR_EVENTS = [
    { date: '05/02', event: '🇺🇸 非農就業', expected: '240K', prior: '303K', actual: '175K', impact: 3, cat: 'employment', passed: true },
    { date: '05/10', event: '🇺🇸 密大消費者信心', expected: '76.0', prior: '77.2', actual: '67.4', impact: 2, cat: 'sentiment', passed: true },
    { date: '05/14', event: '🇺🇸 PPI (MoM)', expected: '0.3%', prior: '0.2%', actual: '—', impact: 2, cat: 'inflation', passed: false },
    { date: '05/15', event: '🇺🇸 CPI (YoY)', expected: '3.4%', prior: '3.5%', actual: '—', impact: 3, cat: 'inflation', passed: false },
    { date: '05/15', event: '🇺🇸 零售銷售 (MoM)', expected: '0.4%', prior: '0.7%', actual: '—', impact: 2, cat: 'economy', passed: false },
    { date: '05/16', event: '🇺🇸 初領失業金', expected: '220K', prior: '231K', actual: '—', impact: 2, cat: 'employment', passed: false },
    { date: '05/20', event: '🇹🇼 外銷訂單 (YoY)', expected: '8.2%', prior: '6.3%', actual: '—', impact: 1, cat: 'economy', passed: false },
    { date: '05/22', event: '🇺🇸 FOMC 會議紀要', expected: '—', prior: '—', actual: '—', impact: 3, cat: 'rates', passed: false },
    { date: '05/30', event: '🇺🇸 GDP (Q1 2nd)', expected: '1.3%', prior: '1.6%', actual: '—', impact: 3, cat: 'economy', passed: false },
    { date: '05/31', event: '🇺🇸 PCE (YoY)', expected: '2.7%', prior: '2.7%', actual: '—', impact: 3, cat: 'inflation', passed: false },
    { date: '06/07', event: '🇺🇸 非農就業', expected: '—', prior: '175K', actual: '—', impact: 3, cat: 'employment', passed: false },
    { date: '06/12', event: '🇺🇸 CPI (YoY)', expected: '—', prior: '—', actual: '—', impact: 3, cat: 'inflation', passed: false },
    { date: '06/12', event: '🇺🇸 FOMC 利率決議', expected: '5.25%', prior: '5.25%', actual: '—', impact: 3, cat: 'rates', passed: false },
    { date: '06/27', event: '🇺🇸 GDP (Q1 Final)', expected: '1.3%', prior: '1.6%', actual: '—', impact: 3, cat: 'economy', passed: false },
];

let PORTFOLIO = [
    { id: 1, name: '台股 ETF (0050)', target: 30, actual: 35, color: '#3B82F6' },
    { id: 2, name: '美股 ETF (VTI)', target: 25, actual: 28, color: '#8B5CF6' },
    { id: 3, name: '美債 ETF (TLT)', target: 15, actual: 10, color: '#06B6D4' },
    { id: 4, name: '黃金 (GLD)', target: 10, actual: 12, color: '#F59E0B' },
    { id: 5, name: '現金 (TWD)', target: 20, actual: 15, color: '#64748B' },
];

const SCENARIOS = [
    { name: '軟著陸 Soft Landing', pct: 30, color: '#10B981' },
    { name: '停滯性通膨 Stagflation', pct: 45, color: '#DC2626' },
    { name: '硬著陸 Hard Landing', pct: 20, color: '#F59E0B' },
    { name: '再通膨 Re-inflation', pct: 55, color: '#F97316' },
];

// ================================================================
// NAVIGATION
// ================================================================
let currentPage = 'dashboard';
document.querySelectorAll('.nav-link[data-page]').forEach(el => {
    el.addEventListener('click', () => {
        navigateTo(el.dataset.page);
        if (window.innerWidth < 1024) toggleSidebar();
    });
});
function navigateTo(page) {
    currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + page)?.classList.add('active');
    document.querySelectorAll('.nav-link[data-page]').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });
    const titles = { dashboard: '總覽儀錶板', metrics: '指標明細', regime: '情境分析', alerts: '警示管理', calendar: '財經事件日曆', portfolio: '資產配置管理', settings: '系統設定' };
    document.getElementById('pageTitle').textContent = titles[page] || '';
    // Lazy init charts
    if (page === 'regime') initRegimeCharts();
    if (page === 'alerts') renderAlertStats();
    if (page === 'portfolio') renderPortfolioFull();
}

// ================================================================
// SIDEBAR
// ================================================================
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
    document.getElementById('sidebarOverlay').classList.toggle('show');
}

// ================================================================
// HELPERS
// ================================================================
function formatVal(v, unit) {
    if (unit === '$') return '$' + v.toLocaleString();
    if (unit === '%') return v.toFixed(1) + '%';
    if (unit === 'K') return v + 'K';
    if (v >= 10000) return v.toLocaleString();
    if (Number.isInteger(v)) return v.toString();
    return v.toFixed(2);
}
function statusDot(s) { return s === 'danger' ? 'bg-danger' : s === 'warn' ? 'bg-warn' : s === 'success' ? 'bg-success' : 'bg-slate-500' }
function statusColor(s) { return s === 'danger' ? 'text-danger' : s === 'warn' ? 'text-warn' : s === 'success' ? 'text-success' : 'text-slate-400' }
function statusBg(s) { return s === 'danger' ? 'bg-danger/20 text-danger' : s === 'warn' ? 'bg-warn/20 text-warn' : s === 'success' ? 'bg-success/20 text-success' : 'bg-slate-600/30 text-slate-400' }
function sparkColor(s) { return s === 'danger' ? '#DC2626' : s === 'warn' ? '#F59E0B' : s === 'success' ? '#10B981' : '#64748B' }

// ================================================================
// KPI SUMMARY ROW (Dashboard top)
// ================================================================
function renderKpiRow() {
    const kpis = [
        { label: 'S&P 500', id: 'spx' }, { label: 'NASDAQ', id: 'nasdaq' }, { label: '台股', id: 'taiex' },
        { label: 'VIX', id: 'vix' }, { label: '黃金', id: 'gold' }, { label: 'USD/TWD', id: 'usdtwd' },
    ];
    document.getElementById('kpiRow').innerHTML = kpis.map(k => {
        const m = METRICS.find(x => x.id === k.id);
        const chg = m.value - m.prev; const pct = m.prev ? ((chg / Math.abs(m.prev)) * 100) : 0;
        const arrow = chg >= 0 ? '▲' : '▼';
        return `<div class="metric-card py-3 px-4 cursor-pointer" onclick="openMetricDetail('${m.id}')">
      <div class="glow"></div>
      <p class="text-[10px] text-slate-500 mb-1">${k.label}</p>
      <p class="font-mono text-lg font-bold">${formatVal(m.value, m.unit)}</p>
      <p class="font-mono text-xs ${statusColor(m.status)}">${arrow} ${Math.abs(pct).toFixed(2)}%</p>
    </div>`;
    }).join('');
}

// ================================================================
// SCENARIO LIST
// ================================================================
function renderScenarios() {
    document.getElementById('scenarioList').innerHTML = SCENARIOS.map(s => `
    <div class="flex items-center justify-between">
      <span class="text-sm">${s.name}</span>
      <div class="flex items-center gap-2">
        <div class="w-24 h-2 bg-slate-700 rounded-full overflow-hidden"><div class="h-full rounded-full" style="width:${s.pct}%;background:${s.color}"></div></div>
        <span class="font-mono text-xs text-slate-300 w-8 text-right">${s.pct}%</span>
      </div>
    </div>`).join('');
}

// ================================================================
// CATEGORY TABS
// ================================================================
let activeCat = 'all';
function renderCatTabs() {
    const c = document.getElementById('catTabs');
    let h = `<div class="tab-pill ${activeCat === 'all' ? 'active' : ''}" onclick="filterCat('all')">全部</div>`;
    CATEGORIES.forEach(cat => { h += `<div class="tab-pill ${activeCat === cat.id ? 'active' : ''}" onclick="filterCat('${cat.id}')">${cat.label}</div>` });
    c.innerHTML = h;
}
function filterCat(c) { activeCat = c; renderCatTabs(); renderMetrics() }

// ================================================================
// METRIC CARDS (Dashboard grid)
// ================================================================
const sparkCharts = {};
function renderMetrics() {
    const grid = document.getElementById('metricsGrid');
    const items = activeCat === 'all' ? METRICS : METRICS.filter(m => m.cat === activeCat);
    grid.innerHTML = items.map(m => {
        const chg = m.value - m.prev; const pct = m.prev ? ((chg / Math.abs(m.prev)) * 100) : 0;
        const arrow = chg >= 0 ? '▲' : '▼';
        const catLabel = CATEGORIES.find(c => c.id === m.cat)?.label || '';
        return `<div class="metric-card group cursor-pointer" onclick="openMetricDetail('${m.id}')">
      <div class="glow"></div>
      <div class="flex items-start justify-between mb-2">
        <div><p class="text-[10px] text-slate-500 uppercase tracking-wider">${catLabel}</p>
        <p class="text-sm font-medium text-slate-200">${m.name}</p></div>
        <span class="w-2.5 h-2.5 rounded-full ${statusDot(m.status)} mt-1 flex-shrink-0"></span>
      </div>
      <div class="flex items-end gap-2 mb-1">
        <span class="font-mono text-2xl font-bold text-white">${formatVal(m.value, m.unit)}</span>
        <span class="text-xs ${statusColor(m.status)} font-mono mb-0.5">${arrow} ${Math.abs(pct).toFixed(1)}%</span>
      </div>
      <p class="text-[11px] text-slate-500 mb-2">前值 <span class="font-mono">${formatVal(m.prev, m.unit)}</span></p>
      <canvas class="spark-canvas" id="spark-${m.id}"></canvas>
    </div>`;
    }).join('');
    items.forEach(m => drawSparkline(m));
}
function drawSparkline(m) {
    const el = document.getElementById('spark-' + m.id); if (!el) return;
    if (sparkCharts[m.id]) sparkCharts[m.id].destroy();
    const c = sparkColor(m.status);
    sparkCharts[m.id] = new Chart(el, { type: 'line', data: { labels: m.spark.map(() => ''), datasets: [{ data: m.spark, borderColor: c, borderWidth: 2, pointRadius: 0, tension: .4, fill: { target: 'origin', above: c + '18' } }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } }, animation: { duration: 400 } } });
}

// ================================================================
// METRICS TABLE (page-metrics)
// ================================================================
let sortCol = 'name', sortDir = 1;
function renderMetricsTable() {
    const catF = document.getElementById('metricCatFilter').value;
    const statF = document.getElementById('metricStatusFilter').value;
    let items = [...METRICS];
    if (catF !== 'all') items = items.filter(m => m.cat === catF);
    if (statF !== 'all') items = items.filter(m => m.status === statF);
    items.sort((a, b) => {
        if (sortCol === 'name') return sortDir * a.name.localeCompare(b.name, 'zh');
        if (sortCol === 'value') return sortDir * (a.value - b.value);
        if (sortCol === 'change') { const ca = (a.value - a.prev) / Math.abs(a.prev || 1), cb = (b.value - b.prev) / Math.abs(b.prev || 1); return sortDir * (ca - cb) }
        return 0;
    });
    const tb = document.getElementById('metricsTableBody');
    tb.innerHTML = items.map(m => {
        const chg = m.value - m.prev; const pct = m.prev ? ((chg / Math.abs(m.prev)) * 100) : 0;
        const arrow = chg >= 0 ? '▲' : '▼';
        const catLabel = CATEGORIES.find(c => c.id === m.cat)?.label || '';
        return `<tr class="border-b border-slate-700/40 hover:bg-slate-800/50 transition cursor-pointer" onclick="openMetricDetail('${m.id}')">
      <td class="py-3 px-3"><div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full ${statusDot(m.status)}"></span><span class="font-medium">${m.name}</span></div></td>
      <td class="py-3 px-3 text-xs text-slate-400">${catLabel}</td>
      <td class="py-3 px-3 text-right font-mono font-semibold">${formatVal(m.value, m.unit)}</td>
      <td class="py-3 px-3 text-right font-mono text-slate-400">${formatVal(m.prev, m.unit)}</td>
      <td class="py-3 px-3 text-right font-mono ${statusColor(m.status)}">${arrow} ${Math.abs(pct).toFixed(2)}%</td>
      <td class="py-3 px-3 text-center"><span class="text-[10px] px-2 py-0.5 rounded-full ${statusBg(m.status)}">${m.status === 'danger' ? '危險' : m.status === 'warn' ? '警告' : m.status === 'success' ? '正常' : '一般'}</span></td>
      <td class="py-3 px-3"><canvas class="spark-canvas" id="tblspark-${m.id}" style="height:28px!important"></canvas></td>
      <td class="py-3 px-3 text-center"><button class="text-primary-light hover:underline text-xs">詳細</button></td>
    </tr>`;
    }).join('');
    items.forEach(m => {
        const el = document.getElementById('tblspark-' + m.id); if (!el) return;
        new Chart(el, { type: 'line', data: { labels: m.spark.slice(-7).map(() => ''), datasets: [{ data: m.spark.slice(-7), borderColor: sparkColor(m.status), borderWidth: 1.5, pointRadius: 0, tension: .4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } }, animation: false } });
    });
}
function sortMetricsTable(col) { if (sortCol === col) sortDir *= -1; else { sortCol = col; sortDir = 1 } renderMetricsTable() }
function initMetricsPage() {
    const sel = document.getElementById('metricCatFilter');
    sel.innerHTML = '<option value="all">全部分類</option>' + CATEGORIES.map(c => `<option value="${c.id}">${c.label}</option>`).join('');
    renderMetricsTable();
}

// ================================================================
// METRIC DETAIL MODAL
// ================================================================
let modalChart = null;
function openMetricDetail(id) {
    const m = METRICS.find(x => x.id === id); if (!m) return;
    document.getElementById('modalMetricName').textContent = m.name + ' — ' + m.desc;
    const chg = m.value - m.prev; const pct = m.prev ? ((chg / Math.abs(m.prev)) * 100) : 0;
    document.getElementById('modalMetricKpis').innerHTML = `
    <div class="bg-slate-800 rounded-lg p-3 text-center"><p class="text-[10px] text-slate-500 mb-1">當前值</p><p class="font-mono text-xl font-bold">${formatVal(m.value, m.unit)}</p></div>
    <div class="bg-slate-800 rounded-lg p-3 text-center"><p class="text-[10px] text-slate-500 mb-1">變動</p><p class="font-mono text-xl font-bold ${statusColor(m.status)}">${(chg >= 0 ? '+' : '') + pct.toFixed(2)}%</p></div>
    <div class="bg-slate-800 rounded-lg p-3 text-center"><p class="text-[10px] text-slate-500 mb-1">資料來源</p><p class="text-xs text-slate-300">${m.src}</p></div>`;
    document.getElementById('modalMetricInfo').textContent = m.desc;
    // Chart
    const ctx = document.getElementById('modalDetailChart');
    if (modalChart) modalChart.destroy();
    const labels = m.spark.map((_, i) => 'D-' + (m.spark.length - 1 - i));
    const c = sparkColor(m.status);
    modalChart = new Chart(ctx, { type: 'line', data: { labels, datasets: [{ label: m.name, data: m.spark, borderColor: c, borderWidth: 2, pointRadius: 2, pointBackgroundColor: c, tension: .3, fill: { target: 'origin', above: c + '15' } }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1E293B', titleColor: '#E2E8F0', bodyColor: '#94A3B8', borderColor: '#334155', borderWidth: 1 } }, scales: { x: { ticks: { color: '#64748B', font: { size: 10 } }, grid: { color: '#1F293B' } }, y: { ticks: { color: '#64748B', font: { family: 'JetBrains Mono', size: 10 } }, grid: { color: '#1F293B' } } } } });
    openModal('metricDetailModal');
}

// ================================================================
// ALERT RULES
// ================================================================
function renderAlertRules() {
    const grid = document.getElementById('alertRulesGrid');
    grid.innerHTML = ALERT_RULES.map(r => {
        const m = METRICS.find(x => x.id === r.metric);
        const condMap = { gt: '>', lt: '<', gte: '≥', lte: '≤', pct_up: '漲幅% ≥', pct_down: '跌幅% ≥' };
        return `<div class="rule-card ${r.enabled ? '' : 'opacity-50'}">
      <div class="flex items-start justify-between mb-2">
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-mono px-2 py-0.5 rounded ${statusBg(r.severity)}">${r.level}</span>
          <span class="text-sm font-medium">${r.name}</span>
        </div>
        <div class="toggle ${r.enabled ? 'on' : ''}" style="transform:scale(.8)" onclick="event.stopPropagation();toggleRule(${r.id});this.classList.toggle('on')"></div>
      </div>
      <p class="text-xs text-slate-400 mb-2">${m ? m.name : r.metric} ${condMap[r.cond] || r.cond} <span class="font-mono text-slate-200">${r.threshold}</span></p>
      <div class="flex items-center gap-3 text-[11px] text-slate-500">
        ${r.teams ? '<span class="flex items-center gap-1"><i data-lucide="message-square" class="w-3 h-3"></i>Teams</span>' : ''}
        <span class="flex items-center gap-1"><i data-lucide="monitor" class="w-3 h-3"></i>Toast</span>
      </div>
      <div class="flex justify-end gap-2 mt-3">
        <button class="text-xs text-primary-light hover:underline" onclick="editAlertRule(${r.id})">編輯</button>
        <button class="text-xs text-danger hover:underline" onclick="deleteAlertRule(${r.id})">刪除</button>
      </div>
    </div>`;
    }).join('');
    lucide.createIcons();
}
function toggleRule(id) { const r = ALERT_RULES.find(x => x.id === id); if (r) r.enabled = !r.enabled }
function deleteAlertRule(id) {
    const idx = ALERT_RULES.findIndex(x => x.id === id);
    if (idx >= 0) { ALERT_RULES.splice(idx, 1); renderAlertRules(); showToast('success', '規則已刪除') }
}
function editAlertRule(id) {
    const r = ALERT_RULES.find(x => x.id === id); if (!r) return;
    document.getElementById('ruleNameInput').value = r.name;
    document.getElementById('ruleLevelInput').value = r.level;
    document.getElementById('ruleMetricInput').value = r.metric;
    document.getElementById('ruleCondInput').value = r.cond;
    document.getElementById('ruleThreshInput').value = r.threshold;
    document.getElementById('ruleSevInput').value = r.severity;
    openModal('alertRuleModal');
}
function openAlertRuleModal() {
    document.getElementById('ruleNameInput').value = '';
    document.getElementById('ruleThreshInput').value = '';
    // Populate metric select
    const sel = document.getElementById('ruleMetricInput');
    sel.innerHTML = METRICS.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
    openModal('alertRuleModal');
}
function saveAlertRule() {
    const name = document.getElementById('ruleNameInput').value || '新規則';
    const level = document.getElementById('ruleLevelInput').value;
    const metric = document.getElementById('ruleMetricInput').value;
    const cond = document.getElementById('ruleCondInput').value;
    const threshold = +document.getElementById('ruleThreshInput').value;
    const severity = document.getElementById('ruleSevInput').value;
    ALERT_RULES.push({ id: Date.now(), name, level, metric, cond, threshold, severity, enabled: true, teams: true });
    renderAlertRules(); closeModal('alertRuleModal'); showToast('success', '✅ 規則已新增：' + name);
}

// ================================================================
// ALERT LOG
// ================================================================
function renderAlertLog() {
    const c = document.getElementById('alertLog');
    c.innerHTML = ALERT_LOGS.map(a => {
        const icon = a.severity === 'danger' ? 'alert-triangle' : a.severity === 'warn' ? 'alert-circle' : a.severity === 'success' ? 'check-circle' : 'info';
        return `<div class="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-700/30 transition">
      <div class="mt-0.5"><i data-lucide="${icon}" class="w-4 h-4 ${statusColor(a.severity)}"></i></div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-[10px] font-mono px-2 py-0.5 rounded ${statusBg(a.severity)}">${a.level}</span>
          <span class="text-[11px] text-slate-500 font-mono">${a.ts}</span>
        </div>
        <p class="text-sm text-slate-300 leading-relaxed">${a.msg}</p>
      </div>
    </div>`;
    }).join('');
    lucide.createIcons();
}
function clearAlertLog() { ALERT_LOGS.length = 0; renderAlertLog(); showToast('success', '紀錄已清除') }
function switchAlertTab(tab, el) {
    ['rules', 'log', 'stats'].forEach(t => {
        document.getElementById('alertTab-' + t).style.display = t === tab ? 'block' : 'none';
    });
    el.parentElement.querySelectorAll('.tab-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    if (tab === 'log') renderAlertLog();
    if (tab === 'stats') renderAlertStats();
}

// ================================================================
// ALERT STATS CHARTS
// ================================================================
let alertTrendC = null, alertDistC = null;
function renderAlertStats() {
    // Trend
    const ctx1 = document.getElementById('alertTrendChart'); if (!ctx1) return;
    if (alertTrendC) alertTrendC.destroy();
    alertTrendC = new Chart(ctx1, {
        type: 'bar', data: {
            labels: ['05/05', '05/06', '05/07', '05/08', '05/09', '05/10', '05/11'], datasets: [
                { label: 'L1', data: [1, 0, 1, 0, 1, 1, 1], backgroundColor: '#F59E0B' },
                { label: 'L2', data: [0, 0, 0, 0, 1, 1, 0], backgroundColor: '#F97316' },
                { label: 'L3', data: [0, 0, 0, 1, 0, 0, 1], backgroundColor: '#DC2626' },
            ]
        }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94A3B8', font: { size: 11 } } } }, scales: { x: { stacked: true, ticks: { color: '#64748B' }, grid: { display: false } }, y: { stacked: true, ticks: { color: '#64748B', stepSize: 1 }, grid: { color: '#1F293B' } } } }
    });
    // Distribution
    const ctx2 = document.getElementById('alertDistChart'); if (!ctx2) return;
    if (alertDistC) alertDistC.destroy();
    alertDistC = new Chart(ctx2, { type: 'doughnut', data: { labels: ['L1 門檻', 'L2 變動率', 'L3 組合'], datasets: [{ data: [5, 3, 2], backgroundColor: ['#F59E0B', '#F97316', '#DC2626'], borderColor: '#1E293B', borderWidth: 3 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'bottom', labels: { color: '#94A3B8', font: { size: 11 }, padding: 12, usePointStyle: true } } } } });
}

// ================================================================
// CALENDAR
// ================================================================
let calMonth = 5, calYear = 2026;
const CAL_CATS = [{ id: 'all', label: '全部' }, { id: 'employment', label: '就業' }, { id: 'inflation', label: '通膨' }, { id: 'rates', label: '利率' }, { id: 'economy', label: '景氣' }, { id: 'sentiment', label: '情緒' }];
let calCatFilter = 'all';
function renderCalendar() {
    document.getElementById('calMonthLabel').textContent = `${calYear} 年 ${calMonth} 月`;
    // Filter tags
    document.getElementById('calFilterTags').innerHTML = CAL_CATS.map(c => `<div class="tab-pill ${calCatFilter === c.id ? 'active' : ''}" onclick="calCatFilter='${c.id}';renderCalendar()">${c.label}</div>`).join('');
    // Rows
    const mm = String(calMonth).padStart(2, '0');
    let evts = CALENDAR_EVENTS;
    if (calCatFilter !== 'all') evts = evts.filter(e => e.cat === calCatFilter);
    const monthEvts = evts.filter(e => e.date.startsWith(mm) || calMonth === 6 && e.date.startsWith('06'));
    document.getElementById('calendarBody').innerHTML = monthEvts.length ? monthEvts.map(e => {
        const dots = '🔴'.repeat(e.impact);
        const rowClass = e.passed ? 'opacity-60' : '';
        const actualColor = e.actual === '—' ? 'text-slate-500' : parseFloat(e.actual) > parseFloat(e.expected) ? 'text-danger' : 'text-success';
        return `<div class="cal-row ${rowClass}">
      <span class="font-mono text-primary-light">${e.date}</span>
      <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full ${e.impact >= 3 ? 'bg-danger' : e.impact >= 2 ? 'bg-warn' : 'bg-primary-light'}"></span>${e.event}${e.passed ? ' <span class="text-[10px] text-slate-500 ml-1">已公布</span>' : ''}</span>
      <span class="font-mono text-right text-slate-300">${e.expected}</span>
      <span class="font-mono text-right text-slate-400">${e.prior}</span>
      <span class="font-mono text-right ${actualColor}">${e.actual}</span>
      <span class="text-center text-[10px]">${dots}</span>
    </div>`;
    }).join('') : '<div class="py-8 text-center text-slate-500 text-sm">本月無相關事件</div>';
    lucide.createIcons();
}
function changeCalMonth(d) { calMonth += d; if (calMonth > 12) { calMonth = 1; calYear++ } if (calMonth < 1) { calMonth = 12; calYear-- } renderCalendar() }

// ================================================================
// PORTFOLIO
// ================================================================
let pfChartInst = null, pfBarInst = null;
function renderPortfolioFull() {
    // Doughnut
    const ctx = document.getElementById('portfolioChart');
    if (pfChartInst) pfChartInst.destroy();
    pfChartInst = new Chart(ctx, { type: 'doughnut', data: { labels: PORTFOLIO.map(p => p.name), datasets: [{ data: PORTFOLIO.map(p => p.actual), backgroundColor: PORTFOLIO.map(p => p.color), borderColor: '#1E293B', borderWidth: 3 }] }, options: { responsive: true, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { color: '#94A3B8', font: { size: 11 }, padding: 12, usePointStyle: true, pointStyleWidth: 8 } } } } });
    // Bar
    const ctx2 = document.getElementById('portfolioBarChart');
    if (pfBarInst) pfBarInst.destroy();
    pfBarInst = new Chart(ctx2, {
        type: 'bar', data: {
            labels: PORTFOLIO.map(p => p.name.split('(')[0].trim()), datasets: [
                { label: '目標', data: PORTFOLIO.map(p => p.target), backgroundColor: '#334155', borderRadius: 4 },
                { label: '實際', data: PORTFOLIO.map(p => p.actual), backgroundColor: PORTFOLIO.map(p => p.color), borderRadius: 4 },
            ]
        }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94A3B8', font: { size: 11 } } } }, scales: { x: { ticks: { color: '#64748B', font: { size: 10 } }, grid: { display: false } }, y: { ticks: { color: '#64748B', callback: v => v + '%' }, grid: { color: '#1F293B' } } } }
    });
    // Summary
    document.getElementById('portfolioSummary').innerHTML = PORTFOLIO.map(p => {
        const diff = p.actual - p.target; const ds = diff > 0 ? '+' + diff + '%' : diff + '%';
        const dc = Math.abs(diff) >= 5 ? 'text-danger' : Math.abs(diff) >= 3 ? 'text-warn' : 'text-slate-400';
        return `<div class="flex items-center gap-3">
      <span class="w-3 h-3 rounded-sm flex-shrink-0" style="background:${p.color}"></span>
      <span class="text-sm flex-1">${p.name}</span>
      <span class="font-mono text-xs text-slate-400 w-14 text-right">目標${p.target}%</span>
      <span class="font-mono text-xs text-white w-12 text-right">${p.actual}%</span>
      <span class="font-mono text-xs ${dc} w-10 text-right">${ds}</span>
    </div>`;
    }).join('');
    // Rebalance advice
    const adv = document.getElementById('rebalanceAdvice');
    const advices = PORTFOLIO.filter(p => Math.abs(p.actual - p.target) >= 3).map(p => {
        const diff = p.actual - p.target;
        return diff > 0 ? `<p class="text-warn">⚠ ${p.name} 超配 ${diff}%，建議減碼</p>`
            : `<p class="text-primary-light">💡 ${p.name} 低配 ${Math.abs(diff)}%，建議加碼</p>`;
    });
    adv.innerHTML = advices.length ? advices.join('') : '<p class="text-success">✅ 配置良好，無需調整</p>';
    // Table
    const tb = document.getElementById('portfolioTableBody');
    tb.innerHTML = PORTFOLIO.map(p => {
        const diff = p.actual - p.target; const ds = diff > 0 ? '+' + diff + '%' : diff + '%';
        const dc = Math.abs(diff) >= 5 ? 'text-danger' : Math.abs(diff) >= 3 ? 'text-warn' : 'text-slate-400';
        const badge = Math.abs(diff) >= 5 ? 'bg-danger/20 text-danger' : Math.abs(diff) >= 3 ? 'bg-warn/20 text-warn' : 'bg-success/20 text-success';
        const badgeText = Math.abs(diff) >= 5 ? '偏離過大' : Math.abs(diff) >= 3 ? '需關注' : '正常';
        return `<tr class="border-b border-slate-700/40 hover:bg-slate-800/50 transition">
      <td class="py-3 px-3"><div class="flex items-center gap-2"><span class="w-3 h-3 rounded-sm" style="background:${p.color}"></span>${p.name}</div></td>
      <td class="py-3 px-3 text-right font-mono">${p.target}%</td>
      <td class="py-3 px-3 text-right font-mono font-semibold">${p.actual}%</td>
      <td class="py-3 px-3 text-right font-mono ${dc}">${ds}</td>
      <td class="py-3 px-3 text-center"><span class="text-[10px] px-2 py-0.5 rounded-full ${badge}">${badgeText}</span></td>
      <td class="py-3 px-3 text-center">
        <button class="text-xs text-primary-light hover:underline mr-2" onclick="editPortfolioItem(${p.id})">編輯</button>
        <button class="text-xs text-danger hover:underline" onclick="deletePortfolioItem(${p.id})">刪除</button>
      </td>
    </tr>`;
    }).join('');
}
const COLORS = ['#3B82F6', '#8B5CF6', '#06B6D4', '#F59E0B', '#64748B', '#10B981', '#F97316', '#EC4899', '#14B8A6', '#A78BFA'];
function openPortfolioModal(item) {
    document.getElementById('assetNameInput').value = item ? item.name : '';
    document.getElementById('assetTargetInput').value = item ? item.target : '';
    document.getElementById('assetActualInput').value = item ? item.actual : '';
    document.getElementById('colorPicker').innerHTML = COLORS.map(c => `<div class="w-7 h-7 rounded-full cursor-pointer border-2 ${item && item.color === c ? 'border-white' : 'border-transparent'} hover:border-white transition" style="background:${c}" onclick="selectColor(this,'${c}')"></div>`).join('');
    openModal('portfolioModal');
}
let selectedColor = COLORS[0];
function selectColor(el, c) { selectedColor = c; el.parentElement.querySelectorAll('div').forEach(d => d.classList.remove('border-white')); el.classList.add('border-white') }
function savePortfolioItem() {
    const name = document.getElementById('assetNameInput').value || '新資產';
    const target = +document.getElementById('assetTargetInput').value || 0;
    const actual = +document.getElementById('assetActualInput').value || 0;
    PORTFOLIO.push({ id: Date.now(), name, target, actual, color: selectedColor });
    renderPortfolioFull(); closeModal('portfolioModal'); showToast('success', '✅ 已新增：' + name);
}
function editPortfolioItem(id) { const p = PORTFOLIO.find(x => x.id === id); if (p) { selectedColor = p.color; openPortfolioModal(p) } }
function deletePortfolioItem(id) {
    const idx = PORTFOLIO.findIndex(x => x.id === id);
    if (idx >= 0) { PORTFOLIO.splice(idx, 1); renderPortfolioFull(); showToast('success', '已刪除') }
}/**
 * 自動化判斷 Macro Regime、康波週期階段與風險溫度計
 * @param {Array} metricsList - 你的 METRICS 原始陣列
 * @returns {Object} 判定報告（含 1~100 風險分數）
 */
function autoAnalyzeKondratievWithRisk(metricsList) {
    // 1. 核心追蹤指標配置
    const configs = {
        gdp: { cat: 'growth', latest: 1.6, weight: 1.0, reverse: false },
        pmimfg: { cat: 'growth', latest: 49.2, weight: 1.5, reverse: false },
        nfp: { cat: 'growth', latest: 175, weight: 1.0, reverse: false },
        unemp: { cat: 'growth', latest: 3.9, weight: 1.0, reverse: true },
        cpi: { cat: 'inflation', latest: 3.5, weight: 1.5, reverse: false },
        pce: { cat: 'inflation', latest: 2.7, weight: 1.0, reverse: false },
        ppi: { cat: 'inflation', latest: 2.2, weight: 1.0, reverse: false }
    };

    let totalGrowthWeight = 0;
    let totalInflationWeight = 0;
    let growthRiskPoints = 0;
    let inflationRiskPoints = 0;

    let growthScore = 0;
    let inflationScore = 0;

    // 2. 跑迴圈計算基本得分與風險點數
    metricsList.forEach(metric => {
        const config = configs[metric.id];
        if (!config) return;

        const prev = metric.prev;
        const current = metric.value;

        let direction = current > prev ? 1 : (current < prev ? -1 : 0);
        if (config.reverse) direction *= -1;

        if (metric.id === 'pmimfg' && current < 50) {
            growthScore -= 0.5;
        }

        // 傳統多空方向得分
        if (config.cat === 'growth') {
            growthScore += direction * config.weight;
            totalGrowthWeight += config.weight;
            // 增長越下滑 (direction <= 0)，風險點數越高
            if (direction === -1) growthRiskPoints += config.weight;
            if (direction === 0) growthRiskPoints += config.weight * 0.5;
        } else if (config.cat === 'inflation') {
            inflationScore += direction * config.weight;
            totalInflationWeight += config.weight;
            // 通膨越上升 (direction >= 0)，風險點數越高
            if (direction === 1) inflationRiskPoints += config.weight;
            if (direction === 0) inflationRiskPoints += config.weight * 0.5;
        }
    });

    // 3. 計算 1 ~ 100 風險溫度計分數 (歸一化公式)
    // 基礎分 10 分（避開 0 分），剩餘 90 分由 Growth 與 Inflation 各佔 45 分
    const growthRiskRatio = growthRiskPoints / totalGrowthWeight;
    const inflationRiskRatio = inflationRiskPoints / totalInflationWeight;

    let riskScore = 10 + Math.round((growthRiskRatio * 45) + (inflationRiskRatio * 45));

    // 限制在 1 ~ 100 區間
    riskScore = Math.max(1, Math.min(100, riskScore));

    // 風險評級與建議
    let riskLevel = "";
    let actionAdvice = "";
    if (riskScore <= 35) {
        riskLevel = "低溫 (極度安全)";
        actionAdvice = "積極做多風險資產，槓桿可適度放大。";
    } else if (riskScore <= 60) {
        riskLevel = "常溫 (溫和風險)";
        actionAdvice = "聚焦強勢板塊，維持標準部位，注意個別資產防守位。";
    } else if (riskScore <= 80) {
        riskLevel = "高溫 (高風險警告)";
        actionAdvice = "縮減防守部位，提升現金或黃金配置，策略應偏向右側交易或防守。";
    } else {
        riskLevel = "狂熱/滯脹 (極高風險破表)";
        actionAdvice = "嚴格控管曝險，極度不適合左側抄底，資產以現金、公債與反向對沖為主。";
    }

    // 4. 根據得分矩陣判定象限
    let regime = "";
    let kondratievPhase = "";

    if (growthScore >= 0 && inflationScore < 0) {
        regime = "Goldilocks (金髮女孩經濟)";
        kondratievPhase = "繁榮期 (春季) - 核心階段";
    } else if (growthScore >= 0 && inflationScore >= 0) {
        regime = "Reflation (通膨擴張)";
        kondratievPhase = "繁榮期尾聲 ➔ 衰退期(夏季)過渡點";
    } else if (growthScore < 0 && inflationScore >= 0) {
        regime = "Stagflation (滯脹體制)";
        kondratievPhase = "衰退期 (夏季) - 中後期";
    } else {
        regime = "Deflationary Recession (通縮蕭條)";
        kondratievPhase = "蕭條期 (秋季) ➔ 回升期(冬季)";
    }

    return {
        macroRegime: regime,
        kondratievPhase: kondratievPhase,
        thermometer: {
            riskScore: riskScore,
            level: riskLevel,
            advice: actionAdvice
        },
        scores: {
            growthScore: Number(growthScore.toFixed(2)),
            inflationScore: Number(inflationScore.toFixed(2))
        }
    };
}/**
 * 結合 VIX 情緒修正的四大宏觀情境機率與風險溫度計演算法
 * @param {Array} metricsList - 你的 METRICS 原始陣列
 * @returns {Object} 包含風險溫度、動態座標與情境機率的完整報告
 */
function calculateMacroRegimeWithVix(metricsList) {
    // 1. 基礎指標配置
    const configs = {
        gdp: { cat: 'growth', latest: 1.6, weight: 1.0, reverse: false },
        pmimfg: { cat: 'growth', latest: 49.2, weight: 1.5, reverse: false },
        nfp: { cat: 'growth', latest: 175, weight: 1.0, reverse: false },
        unemp: { cat: 'growth', latest: 3.9, weight: 1.0, reverse: true },
        cpi: { cat: 'inflation', latest: 3.5, weight: 1.5, reverse: false },
        pce: { cat: 'inflation', latest: 2.7, weight: 1.0, reverse: false },
        ppi: { cat: 'inflation', latest: 2.2, weight: 1.0, reverse: false }
    };

    let growthScore = 0, inflationScore = 0;
    let maxGrowthPoss = 0, maxInflationPoss = 0;
    let growthRiskPoints = 0, inflationRiskPoints = 0;
    let totalGrowthWeight = 0, totalInflationWeight = 0;

    // 2. 提取 VIX 數值 (用於後續修正)
    const vixMetric = metricsList.find(m => m.id === 'vix');
    // 假設最新 VIX 值由 spark 帶入，此處以你的範例 15.8 為準
    const currentVix = vixMetric ? vixMetric.value : 15.8;
    const prevVix = vixMetric ? vixMetric.prev : 13.2;

    // 3. 計算基本總體經濟得分
    metricsList.forEach(metric => {
        const config = configs[metric.id];
        if (!config) return;

        const prev = metric.prev;
        const current = metric.value;

        let direction = current > prev ? 1 : (current < prev ? -1 : 0);
        if (config.reverse) direction *= -1;

        let extraPmi = 0;
        if (metric.id === 'pmimfg' && current < 50) extraPmi = -0.5;

        if (config.cat === 'growth') {
            growthScore += (direction * config.weight) + extraPmi;
            maxGrowthPoss += config.weight + Math.abs(extraPmi);
            totalGrowthWeight += config.weight;
            if (direction === -1) growthRiskPoints += config.weight;
            if (direction === 0) growthRiskPoints += config.weight * 0.5;
        } else if (config.cat === 'inflation') {
            inflationScore += direction * config.weight;
            maxInflationPoss += config.weight;
            totalInflationWeight += config.weight;
            if (direction === 1) inflationRiskPoints += config.weight;
            if (direction === 0) inflationRiskPoints += config.weight * 0.5;
        }
    });

    // 4. 數據映射至 [-1, 1] 原始空間座標
    let x = Math.max(-1, Math.min(1, growthScore / maxGrowthPoss));
    let y = Math.max(-1, Math.min(1, inflationScore / maxInflationPoss));

    // 5. 🔥 VIX 情緖修正機制 (Sentiment Overlay)
    // 歷史經驗：VIX 長期均值約在 18-20。低於 15 極度樂觀，超過 20 恐慌，超過 30 危機。
    // 計算 VIX 偏離度因子 (vixFactor)，範圍限制在 [-0.3, 0.3] 之間
    const vixBaseline = 18.0;
    let vixFactor = (currentVix - vixBaseline) / vixBaseline;
    vixFactor = Math.max(-0.3, Math.min(0.3, vixFactor));

    // 邏輯修正：當 VIX 偏高 (vixFactor > 0)，強行將經濟增長座標 X 往負值(衰退)拉低
    if (vixFactor > 0) {
        x = Math.max(-1, x - (vixFactor * 0.5)); // 市場恐慌加深衰退預期
    } else {
        x = Math.min(1, x - (vixFactor * 0.2));  // 市場樂觀微幅修正經濟樂觀度
    }

    // 6. 計算四情境中心點距離 (考慮 VIX 修正後的 x, y)
    const centers = {
        softLanding: { x: -0.1, y: -0.6 },
        stagflation: { x: -0.8, y: 0.8 },
        hardLanding: { x: -1.0, y: -0.5 },
        reInflation: { x: 0.6, y: 0.7 }
    };

    const sigma = 0.8;
    let rawWeights = {}, totalWeight = 0;

    for (const [key, center] of Object.entries(centers)) {
        const distanceSq = Math.pow(x - center.x, 2) + Math.pow(y - center.y, 2);
        const similarity = Math.exp(-distanceSq / (2 * Math.pow(sigma, 2)));
        rawWeights[key] = similarity;
        totalWeight += similarity;
    }

    const probabilities = {
        softLanding: Math.round((rawWeights.softLanding / totalWeight) * 100),
        stagflation: Math.round((rawWeights.stagflation / totalWeight) * 100),
        hardLanding: Math.round((rawWeights.hardLanding / totalWeight) * 100),
        reInflation: Math.round((rawWeights.reInflation / totalWeight) * 100)
    };

    const sum = probabilities.softLanding + probabilities.stagflation + probabilities.hardLanding + probabilities.reInflation;
    if (sum !== 100) probabilities.stagflation += (100 - sum);

    // 7. 風險溫度計計算 (同步融入 VIX 變動率)
    const growthRiskRatio = growthRiskPoints / totalGrowthWeight;
    const inflationRiskRatio = inflationRiskPoints / totalInflationWeight;

    // VIX 趨勢因子：VIX 走高(相較於上期)額外增加風險權重
    const vixTrendBonus = (currentVix > prevVix) ? 5 : 0;

    let riskScore = 10 + Math.round((growthRiskRatio * 40) + (inflationRiskRatio * 40) + (vixFactor * 30) + vixTrendBonus);
    riskScore = Math.max(1, Math.min(100, riskScore));

    SCENARIOS.forEach(s => {
        if (s.name === '軟著陸 Soft Landing') s.pct = probabilities.softLanding;
        else if (s.name === '停滯性通膨 Stagflation') s.pct = probabilities.stagflation;
        else if (s.name === '硬著陸 Hard Landing') s.pct = probabilities.hardLanding;
        else if (s.name === '再通膨 Re-inflation') s.pct = probabilities.reInflation;
    });
    renderScenarios();
    return {
        vixOverlay: { currentVix, vixFactor: Number(vixFactor.toFixed(2)) },
        coordinates: { adjustedX: Number(x.toFixed(2)), adjustedY: Number(y.toFixed(2)) },
        thermometer: { riskScore },
        scenarios: {
            softLanding: `${probabilities.softLanding}%`,
            stagflation: `${probabilities.stagflation}%`,
            hardLanding: `${probabilities.hardLanding}%`,
            reInflation: `${probabilities.reInflation}%`
        }
    };
}
// ================================================================
// REGIME PAGE CHARTS
// ================================================================
let regimeRadarC = null, regimeTimelineC = null;
function initRegimeCharts() {
    // Scatter (quadrant)
    const ctx = document.getElementById('regimeRadarChart'); if (!ctx) return;
    if (regimeRadarC) regimeRadarC.destroy();
    const quadData = [
        { x: 51.3, y: 3.5, label: '當前' },
        { x: 54, y: 2.1, label: '2023Q1' }, { x: 50, y: 3.0, label: '2023Q3' },
        { x: 47, y: 6.5, label: '2022Q2' }, { x: 55, y: 1.8, label: '2021Q4' },
    ];
    regimeRadarC = new Chart(ctx, {
        type: 'scatter', data: {
            datasets: [
                { label: '歷史', data: quadData.slice(1).map(d => ({ x: d.x, y: d.y })), backgroundColor: '#64748B', pointRadius: 5 },
                { label: '當前位置', data: [{ x: quadData[0].x, y: quadData[0].y }], backgroundColor: '#F59E0B', pointRadius: 10, pointStyle: 'star' },
            ]
        }, options: {
            responsive: true, maintainAspectRatio: false, plugins: {
                legend: { labels: { color: '#94A3B8', font: { size: 11 } } },
                tooltip: { callbacks: { label: ctx => `PMI: ${ctx.parsed.x}, CPI: ${ctx.parsed.y}%` } }
            }, scales: {
                x: { title: { display: true, text: 'PMI（景氣）', color: '#64748B' }, ticks: { color: '#64748B' }, grid: { color: '#1F293B' }, min: 44, max: 58 },
                y: { title: { display: true, text: 'CPI YoY（通膨）', color: '#64748B' }, ticks: { color: '#64748B', callback: v => v + '%' }, grid: { color: '#1F293B' }, min: 0, max: 8 }
            }
        }
    });
    // Add quadrant annotations via plugin (simple lines)
    // Timeline
    const ctx2 = document.getElementById('regimeTimelineChart'); if (!ctx2) return;
    if (regimeTimelineC) regimeTimelineC.destroy();
    const phases = ['復甦', '擴張', '過熱', '衰退', '復甦', '擴張', '過熱'];
    const phColors = ['#10B981', '#3B82F6', '#F59E0B', '#DC2626', '#10B981', '#3B82F6', '#F59E0B'];
    regimeTimelineC = new Chart(ctx2, { type: 'bar', data: { labels: ['2020', '2021H1', '2021H2', '2022', '2023H1', '2023H2', '2024-Now'], datasets: [{ label: '經濟階段', data: [1, 1, 1, 1, 1, 1, 1], backgroundColor: phColors, borderRadius: 6 }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => phases[ctx.dataIndex] } } }, scales: { x: { display: false }, y: { ticks: { color: '#94A3B8', font: { size: 11 } }, grid: { display: false } } } } });
    // Indicator matrix
    const matrix = document.getElementById('indicatorMatrix');
    const indicators = [
        { name: 'CPI', val: '3.5%', pct: 78, status: 'danger' }, { name: 'Core CPI', val: '3.8%', pct: 82, status: 'danger' },
        { name: 'Fed Rate', val: '5.33%', pct: 95, status: 'danger' }, { name: '10Y-2Y Spread', val: '-18bps', pct: 88, status: 'danger' },
        { name: 'PMI Mfg', val: '49.2', pct: 35, status: 'warn' }, { name: 'GDP', val: '1.6%', pct: 28, status: 'warn' },
        { name: 'VIX', val: '15.8', pct: 42, status: 'normal' }, { name: 'Unemployment', val: '3.9%', pct: 22, status: 'success' },
    ];
    matrix.innerHTML = indicators.map(i => `
    <div class="bg-slate-800 rounded-lg p-3">
      <div class="flex items-center justify-between mb-1">
        <span class="text-xs text-slate-400">${i.name}</span>
        <span class="w-2 h-2 rounded-full ${statusDot(i.status)}"></span>
      </div>
      <p class="font-mono text-lg font-bold mb-1">${i.val}</p>
      <div class="flex items-center gap-2">
        <div class="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div class="h-full rounded-full" style="width:${i.pct}%;background:${sparkColor(i.status)}"></div>
        </div>
        <span class="text-[10px] font-mono text-slate-500">${i.pct}th</span>
      </div>
      <p class="text-[10px] text-slate-500 mt-1">歷史分位</p>
    </div>`).join('');
}

// ================================================================
// GLOBAL SEARCH
// ================================================================
function onGlobalSearch(q) {
    if (!q) { if (currentPage !== 'metrics') { navigateTo('dashboard') } filterCat('all'); return }
    navigateTo('metrics');
    const lower = q.toLowerCase();
    const filtered = METRICS.filter(m => m.name.toLowerCase().includes(lower) || m.id.includes(lower) || m.cat.includes(lower));
    // Update table with filtered
    const tb = document.getElementById('metricsTableBody');
    tb.innerHTML = filtered.map(m => {
        const chg = m.value - m.prev; const pct = m.prev ? ((chg / Math.abs(m.prev)) * 100) : 0; const arrow = chg >= 0 ? '▲' : '▼';
        const catLabel = CATEGORIES.find(c => c.id === m.cat)?.label || '';
        return `<tr class="border-b border-slate-700/40 hover:bg-slate-800/50 transition cursor-pointer" onclick="openMetricDetail('${m.id}')">
      <td class="py-3 px-3 font-medium">${m.name}</td><td class="py-3 px-3 text-xs text-slate-400">${catLabel}</td>
      <td class="py-3 px-3 text-right font-mono font-semibold">${formatVal(m.value, m.unit)}</td>
      <td class="py-3 px-3 text-right font-mono text-slate-400">${formatVal(m.prev, m.unit)}</td>
      <td class="py-3 px-3 text-right font-mono ${statusColor(m.status)}">${arrow} ${Math.abs(pct).toFixed(2)}%</td>
      <td class="py-3 px-3 text-center"><span class="text-[10px] px-2 py-0.5 rounded-full ${statusBg(m.status)}">${m.status === 'danger' ? '危險' : m.status === 'warn' ? '警告' : '正常'}</span></td>
      <td class="py-3 px-3">—</td><td class="py-3 px-3 text-center"><button class="text-xs text-primary-light">詳細</button></td>
    </tr>`;
    }).join('');
}

// ================================================================
// TOAST
// ================================================================
function showToast(severity, msg) {
    const c = document.getElementById('toastContainer');
    const bg = severity === 'danger' ? 'bg-red-900/95 text-white border border-red-700' : severity === 'warn' ? 'bg-amber-900/95 text-amber-100 border border-amber-700' : 'bg-emerald-900/95 text-emerald-100 border border-emerald-700';
    const el = document.createElement('div'); el.className = `toast ${bg}`;
    el.innerHTML = `<i data-lucide="${severity === 'danger' ? 'alert-triangle' : severity === 'warn' ? 'alert-circle' : 'check-circle'}" class="w-4 h-4 flex-shrink-0 mt-0.5"></i><span class="text-sm leading-relaxed">${msg}</span>`;
    c.appendChild(el); lucide.createIcons();
    setTimeout(() => { el.style.animation = 'slideOut .3s ease-in forwards'; setTimeout(() => el.remove(), 300) }, 4500);
}

// ================================================================
// MODALS
// ================================================================
function openModal(id) { document.getElementById(id).classList.add('show') }
function closeModal(id) { document.getElementById(id).classList.remove('show') }

// ================================================================
// CLOCK & REFRESH
// ================================================================
let countdown = 30, refreshIv = 30;
function tickClock() { document.getElementById('clockDisplay').textContent = new Date().toLocaleTimeString('zh-TW', { hour12: false }) + ' GMT+8' }
function tickCountdown() {
    countdown--; if (countdown <= 0) { countdown = refreshIv; refreshAll() }
    document.getElementById('nextUpdate').textContent = countdown + 's';
}
function setRefreshInterval(v) { refreshIv = +v; countdown = refreshIv }
function refreshAll() {
    countdown = refreshIv;
    document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString('zh-TW', { hour12: false });
    // METRICS.forEach(m => {
    //     const j = (Math.random() - .5) * .01 * Math.abs(m.value);
    //     m.prev = m.value; m.value = +(m.value + j).toFixed(m.value >= 100 ? 0 : 2);
    //     m.spark.shift(); m.spark.push(m.value);
    // });
    updateMetricsFromFlask();
    // renderKpiRow(); renderMetrics();
    if (currentPage === 'metrics') renderMetricsTable();
    const icon = document.getElementById('refreshIcon');
    icon.style.transition = 'transform .6s'; icon.style.transform = 'rotate(360deg)';
    setTimeout(() => { icon.style.transition = 'none'; icon.style.transform = 'rotate(0)' }, 600);
}
function toggleFS() { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen() }
function togglePw(id) { const el = document.getElementById(id); el.type = el.type === 'password' ? 'text' : 'password' }

// ================================================================
// INIT
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
    updateMetricsFromFlask();
    // renderKpiRow();
    renderScenarios();
    renderCatTabs();
    // renderMetrics();
    initMetricsPage();
    renderAlertRules();
    renderAlertLog();
    renderCalendar();
    renderPortfolioFull();
    tickClock();
    setInterval(tickClock, 1000);
    setInterval(tickCountdown, 1000);
    lucide.createIcons();
    // Welcome toasts
    setTimeout(() => showToast('danger', '⚠️ L3 組合警示：殖利率倒掛 + VIX↑ + PMI < 50'), 1200);
    setTimeout(() => showToast('warn', '📈 CPI YoY 3.5% 超過門檻 3.3%'), 2800);
});