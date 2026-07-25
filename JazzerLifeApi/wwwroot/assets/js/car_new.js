// ═══════════════════════════════════════════════════════════════
// 1. SEED DATA
// ═══════════════════════════════════════════════════════════════
const SEED = {
    activeVehicleId: 'v1',
    user: { name: 'Jia-Ze Hsu', email: 'demo@mycar.app', phone: '0912-345-678' },
    settings: { emailReminders: true, fuelPriceAlert: false },
    vehicles: [
        { id: 'v1', name: 'Toyota Corolla Cross 1.8 Hybrid', plate: 'MKA-3721', year: 2021, purchaseDate: '2021-03-15', mileage: 52340, engine: '1798cc', fuelType: '95 無鉛', color: '#3B82F6' },
        { id: 'v2', name: 'Mazda 3 2.0', plate: 'BGH-5529', year: 2019, purchaseDate: '2019-08-22', mileage: 78560, engine: '1998cc', fuelType: '95 無鉛', color: '#10B981' }
    ],
    fuelRecords: {
        v1: [
            { id: 'f1', date: '2026-05-08', mileage: 52340, liters: 35.2, price: 31.3, total: 1102, station: '中油 大雅站', full: true, kmL: 20.5 },
            { id: 'f2', date: '2026-04-25', mileage: 51620, liters: 33.8, price: 31.1, total: 1051, station: '中油 西屯站', full: true, kmL: 21.3 },
            { id: 'f3', date: '2026-04-11', mileage: 50890, liters: 36.1, price: 31.5, total: 1137, station: '台塑 文心站', full: true, kmL: 19.7 },
            { id: 'f4', date: '2026-03-28', mileage: 50180, liters: 34.5, price: 31.0, total: 1070, station: '中油 大雅站', full: true, kmL: 20.6 },
            { id: 'f5', date: '2026-03-14', mileage: 49470, liters: 35.8, price: 30.8, total: 1103, station: '中油 青海站', full: true, kmL: 19.8 },
            { id: 'f6', date: '2026-02-27', mileage: 48760, liters: 33.2, price: 30.5, total: 1013, station: '中油 西屯站', full: true, kmL: 21.4 },
            { id: 'f7', date: '2026-02-13', mileage: 48050, liters: 36.5, price: 30.2, total: 1102, station: '台塑 文心站', full: true, kmL: 19.5 },
            { id: 'f8', date: '2026-01-30', mileage: 47340, liters: 34.0, price: 29.8, total: 1013, station: '中油 大雅站', full: true, kmL: 20.9 },
            { id: 'f9', date: '2026-01-16', mileage: 46630, liters: 35.5, price: 29.5, total: 1047, station: '中油 青海站', full: true, kmL: 20.0 },
            { id: 'f10', date: '2026-01-02', mileage: 45930, liters: 33.8, price: 29.2, total: 987, station: '中油 西屯站', full: true, kmL: 20.7 }
        ],
        v2: [
            { id: 'f20', date: '2026-05-05', mileage: 78560, liters: 42.0, price: 31.3, total: 1315, station: '中油 北屯站', full: true, kmL: 13.8 },
            { id: 'f21', date: '2026-04-18', mileage: 77980, liters: 40.5, price: 31.1, total: 1260, station: '台塑 太原站', full: true, kmL: 14.3 },
            { id: 'f22', date: '2026-04-01', mileage: 77400, liters: 43.2, price: 31.5, total: 1361, station: '中油 北屯站', full: true, kmL: 13.4 },
            { id: 'f23', date: '2026-03-15', mileage: 76820, liters: 41.8, price: 31.0, total: 1296, station: '中油 文心站', full: true, kmL: 13.9 },
            { id: 'f24', date: '2026-02-28', mileage: 76240, liters: 44.0, price: 30.5, total: 1342, station: '台塑 太原站', full: true, kmL: 13.2 }
        ]
    },
    maintenance: {
        v1: [
            { id: 'm1', date: '2026-04-20', mileage: 51500, type: '保養', items: '機油更換、機油芯更換', shop: 'Toyota 台中服務廠', cost: 2800, note: '原廠 0W-20 機油' },
            { id: 'm2', date: '2026-01-15', mileage: 48200, type: '保養', items: '機油更換、冷氣濾芯更換', shop: 'Toyota 台中服務廠', cost: 3200, note: '冷氣濾芯活性碳型' },
            { id: 'm3', date: '2025-10-05', mileage: 44800, type: '維修', items: '前煞車來令片更換', shop: '小林煞車專門店', cost: 4500, note: '陶瓷煞車皮' },
            { id: 'm4', date: '2025-07-20', mileage: 41300, type: '保養', items: '機油更換、空氣濾芯、雨刷', shop: 'Toyota 台中服務廠', cost: 3800, note: '雨刷矽膠型 26+16' },
            { id: 'm5', date: '2025-04-10', mileage: 38000, type: '保養', items: '機油更換、輪胎調位', shop: 'Toyota 台中服務廠', cost: 2500, note: '四輪定位正常' },
            { id: 'm6', date: '2025-01-08', mileage: 34500, type: '維修', items: '電瓶更換', shop: '台中電池行', cost: 3500, note: 'Panasonic 60B24L' }
        ],
        v2: [
            { id: 'm20', date: '2026-03-10', mileage: 76500, type: '保養', items: '機油更換、空氣濾芯', shop: 'Mazda 台中服務廠', cost: 3500, note: '5W-30' },
            { id: 'm21', date: '2025-12-01', mileage: 73200, type: '保養', items: '機油更換', shop: 'Mazda 台中服務廠', cost: 2200, note: '' },
            { id: 'm22', date: '2025-08-15', mileage: 69000, type: '維修', items: '冷氣壓縮機維修', shop: '億大冷氣', cost: 8500, note: 'R134a 冷媒補充' }
        ]
    },
    parts: {
        v1: [
            { name: '機油', icon: 'droplet', lastKm: 51500, intervalKm: 5000 },
            { name: '機油芯', icon: 'filter', lastKm: 51500, intervalKm: 10000 },
            { name: '空氣濾芯', icon: 'wind', lastKm: 41300, intervalKm: 20000 },
            { name: '冷氣濾芯', icon: 'snowflake', lastKm: 48200, intervalKm: 15000 },
            { name: '輪胎', icon: 'circle-dot', lastKm: 30000, intervalKm: 40000 },
            { name: '煞車皮', icon: 'disc', lastKm: 44800, intervalKm: 30000 },
            { name: '煞車油', icon: 'flask-round', lastKm: 30000, intervalKm: 40000 },
            { name: '電瓶', icon: 'battery-medium', lastKm: 34500, intervalKm: null, note: '2025-01 更換，預計壽命 3 年' },
            { name: '火星塞', icon: 'zap', lastKm: 10000, intervalKm: 60000 },
            { name: '雨刷', icon: 'cloud-rain', lastKm: 41300, intervalKm: 10000 }
        ],
        v2: [
            { name: '機油', icon: 'droplet', lastKm: 76500, intervalKm: 5000 },
            { name: '機油芯', icon: 'filter', lastKm: 76500, intervalKm: 10000 },
            { name: '空氣濾芯', icon: 'wind', lastKm: 76500, intervalKm: 20000 },
            { name: '冷氣濾芯', icon: 'snowflake', lastKm: 69000, intervalKm: 15000 },
            { name: '輪胎', icon: 'circle-dot', lastKm: 60000, intervalKm: 40000 },
            { name: '煞車皮', icon: 'disc', lastKm: 55000, intervalKm: 30000 },
            { name: '煞車油', icon: 'flask-round', lastKm: 40000, intervalKm: 40000 },
            { name: '電瓶', icon: 'battery-medium', lastKm: 60000, intervalKm: null, note: '2024-06 更換，預計壽命 3 年' },
            { name: '火星塞', icon: 'zap', lastKm: 40000, intervalKm: 60000 },
            { name: '雨刷', icon: 'cloud-rain', lastKm: 73200, intervalKm: 10000 }
        ]
    },
    insurances: {
        v1: { mandatory: '2026-06-15', thirdParty: '2026-06-15', inspectionDate: '2026-09-15', licenseTaxPaid: true, fuelTaxPaid: false },
        v2: { mandatory: '2026-11-01', thirdParty: '2026-11-01', inspectionDate: '2026-08-22', licenseTaxPaid: true, fuelTaxPaid: false }
    },
    fuelPrices: {
        current: { '92': 29.8, '95': 31.3, '98': 33.3, diesel: 27.5 },
        changes: { '92': 0.3, '95': 0.3, '98': 0.4, diesel: -0.1 },
        trend: { labels: ["4/12", "4/14", "4/16", "4/18", "4/20", "4/22", "4/24", "4/26", "4/28", "4/30", "5/02", "5/04", "5/06", "5/08", "5/10", "5/11"], data: [30.5, 30.5, 30.5, 30.8, 30.8, 30.8, 31.0, 31.0, 31.0, 31.0, 31.0, 31.3, 31.3, 31.3, 31.3, 31.3] }
    }
};

// ═══════════════════════════════════════════════════════════════
// 2. STORE (localStorage-backed)
// ═══════════════════════════════════════════════════════════════
const Store = {
    KEY: 'mycar_v2',
    _d: null,
    load() { if (this._d) return this._d; try { const r = localStorage.getItem(this.KEY); this._d = r ? JSON.parse(r) : null; } catch (e) { this._d = null; } if (!this._d) this.reset(true); return this._d; },
    save() { localStorage.setItem(this.KEY, JSON.stringify(this._d)); },
    reset(silent) { this._d = JSON.parse(JSON.stringify(SEED)); this.save(); if (!silent) { Toast.show('所有資料已重置', 'success'); fullRender(); } },
    data() { return this.load(); },
    // Vehicle
    vehicles() { return this.data().vehicles; },
    activeVehicle() { const d = this.data(); return d.vehicles.find(v => v.id === d.activeVehicleId) || d.vehicles[0]; },
    setActive(id) { this.data().activeVehicleId = id; this.save(); },
    addVehicle(v) { v.id = 'v' + Date.now(); this.data().vehicles.push(v); this.data().fuelRecords[v.id] = []; this.data().maintenance[v.id] = []; this.data().parts[v.id] = JSON.parse(JSON.stringify(SEED.parts.v1)).map(p => { p.lastKm = v.mileage; return p; }); this.data().insurances[v.id] = { mandatory: '', thirdParty: '', inspectionDate: '', licenseTaxPaid: false, fuelTaxPaid: false }; this.save(); return v; },
    updateVehicle(id, upd) { const i = this.data().vehicles.findIndex(v => v.id === id); if (i >= 0) Object.assign(this.data().vehicles[i], upd); this.save(); },
    deleteVehicle(id) { const d = this.data(); d.vehicles = d.vehicles.filter(v => v.id !== id); delete d.fuelRecords[id]; delete d.maintenance[id]; delete d.parts[id]; delete d.insurances[id]; if (d.activeVehicleId === id && d.vehicles.length) d.activeVehicleId = d.vehicles[0].id; this.save(); },
    // Fuel
    fuelRecords(vid) { vid = vid || this.data().activeVehicleId; return this.data().fuelRecords[vid] || []; },
    addFuel(rec) { const vid = this.data().activeVehicleId; rec.id = 'f' + Date.now(); (this.data().fuelRecords[vid] = this.data().fuelRecords[vid] || []).unshift(rec); this.save(); },
    deleteFuel(fid) { const vid = this.data().activeVehicleId; const arr = this.data().fuelRecords[vid]; const i = arr.findIndex(r => r.id === fid); if (i >= 0) arr.splice(i, 1); this.save(); },
    // Maintenance
    maintRecords(vid) { vid = vid || this.data().activeVehicleId; return this.data().maintenance[vid] || []; },
    addMaint(rec) { const vid = this.data().activeVehicleId; rec.id = 'm' + Date.now(); (this.data().maintenance[vid] = this.data().maintenance[vid] || []).unshift(rec); this.save(); },
    deleteMaint(mid) { const vid = this.data().activeVehicleId; const arr = this.data().maintenance[vid]; const i = arr.findIndex(r => r.id === mid); if (i >= 0) arr.splice(i, 1); this.save(); },
    // Parts
    parts(vid) { vid = vid || this.data().activeVehicleId; return this.data().parts[vid] || []; },
    resetPart(idx) { const vid = this.data().activeVehicleId; const v = this.activeVehicle(); const p = this.data().parts[vid]; if (p[idx]) p[idx].lastKm = v.mileage; this.save(); },
    // Insurance
    insurance(vid) { vid = vid || this.data().activeVehicleId; return this.data().insurances[vid] || {}; },
    updateInsurance(vid, upd) { Object.assign(this.data().insurances[vid], upd); this.save(); },
    // Settings & User
    user() { return this.data().user; },
    settings() { return this.data().settings; },
    fuelPrices() { return this.data().fuelPrices; }
};

// ═══════════════════════════════════════════════════════════════
// 3. UTILITIES
// ═══════════════════════════════════════════════════════════════
const $ = id => document.getElementById(id);
const fmtN = n => n == null ? '—' : Number(n).toLocaleString();
const fmtD = d => d || '—';
const uid = () => 'id' + Date.now() + Math.random().toString(36).slice(2, 6);
const today = () => new Date().toISOString().slice(0, 10);
function daysBetween(d1, d2) { return Math.round((new Date(d2) - new Date(d1)) / 864e5); }
function calcPartPct(part, mileage) { if (!part.intervalKm) return null; const used = mileage - part.lastKm; return Math.round(((part.intervalKm - used) / part.intervalKm) * 100); }
function partStatus(pct) { if (pct === null) return { color: 'text-blue-400', bg: 'bg-blue-500', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: '依時間' }; if (pct <= 0) return { color: 'text-red-400', bg: 'bg-red-500', badge: 'bg-red-500/10 text-red-400 border-red-500/20', label: '已超期' }; if (pct <= 30) return { color: 'text-red-400', bg: 'bg-red-500', badge: 'bg-red-500/10 text-red-400 border-red-500/20', label: '急需更換' }; if (pct <= 50) return { color: 'text-amber-400', bg: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: '注意' }; return { color: 'text-emerald-400', bg: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: '良好' }; }
let _fuelSortAsc = false;

// ═══════════════════════════════════════════════════════════════
// 4. UI COMPONENTS
// ═══════════════════════════════════════════════════════════════
const Toast = {
    show(msg, type = 'info', duration = 3000) {
        const colors = { success: 'border-emerald-500 bg-emerald-500/10 text-emerald-300', error: 'border-red-500 bg-red-500/10 text-red-300', warning: 'border-amber-500 bg-amber-500/10 text-amber-300', info: 'border-blue-500 bg-blue-500/10 text-blue-300' };
        const icons = { success: 'check-circle', error: 'x-circle', warning: 'alert-triangle', info: 'info' };
        const el = document.createElement('div');
        el.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border ${colors[type] || colors.info} toast-enter`;
        el.innerHTML = `<i data-lucide="${icons[type] || icons.info}" class="w-5 h-5 shrink-0"></i><span class="text-sm">${msg}</span>`;
        $('toast-container').appendChild(el);
        lucide.createIcons({ nodes: [el] });
        setTimeout(() => { el.classList.add('toast-exit'); setTimeout(() => el.remove(), 300); }, duration);
    }
};

const Modal = {
    _onSubmit: null,
    open(title, bodyHtml, footerHtml, onSubmit) {
        $('modal-title').textContent = title;
        $('modal-body').innerHTML = bodyHtml;
        $('modal-footer').innerHTML = footerHtml || '';
        $('modal-overlay').classList.remove('hidden');
        this._onSubmit = onSubmit;
        lucide.createIcons({ nodes: [$('modal-box')] });
        const firstInput = $('modal-body').querySelector('input,select');
        if (firstInput) setTimeout(() => firstInput.focus(), 100);
    },
    close() { $('modal-overlay').classList.add('hidden'); this._onSubmit = null; },
    submit() { if (this._onSubmit) this._onSubmit(); }
};
document.addEventListener('keydown', e => { if (e.key === 'Escape') Modal.close(); });

function confirmDialog(title, msg, onConfirm) {
    Modal.open(title,
        `<p class="text-sm text-slate-300">${msg}</p>`,
        `<button onclick="Modal.close()" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-sm text-white rounded-lg">取消</button>
       <button id="confirm-ok-btn" class="px-4 py-2 bg-red-500 hover:bg-red-600 text-sm text-white rounded-lg font-medium">確認</button>`,
        null
    );
    $('confirm-ok-btn').onclick = () => { Modal.close(); onConfirm(); };
}

// ═══════════════════════════════════════════════════════════════
// 5. NAVIGATION
// ═══════════════════════════════════════════════════════════════
const PAGES = ['dashboard', 'vehicles', 'fuel', 'maintenance', 'parts', 'reminders', 'tco', 'fuel-prices', 'settings'];
let currentPage = 'dashboard';
const chartInstances = {};

function navigateTo(page) {
    currentPage = page;
    PAGES.forEach(p => {
        const el = $('page-' + p), nav = $('nav-' + p);
        if (el) el.classList.add('hidden');
        if (nav) nav.classList.remove('active');
    });
    const t = $('page-' + page), n = $('nav-' + page);
    if (t) { t.classList.remove('hidden'); }
    if (n) n.classList.add('active');
    closeSidebar();
    window.scrollTo({ top: 0 });
    renderPage(page);
}

function openSidebar() { $('sidebar').classList.remove('-translate-x-full'); $('sidebar-overlay').classList.remove('hidden'); }
function closeSidebar() { if (window.innerWidth < 768) { $('sidebar').classList.add('-translate-x-full'); $('sidebar-overlay').classList.add('hidden'); } }

function showQuickAdd() {
    const page = currentPage;
    if (page === 'fuel' || page === 'dashboard') Forms.fuelForm();
    else if (page === 'maintenance') Forms.maintForm();
    else if (page === 'vehicles') Forms.vehicleForm();
    else Forms.fuelForm();
}

// ═══════════════════════════════════════════════════════════════
// 6. RENDERERS
// ═══════════════════════════════════════════════════════════════

function renderVehicleSelector() {
    const vs = Store.vehicles(), active = Store.data().activeVehicleId;
    $('vehicleSelector').innerHTML = vs.map(v => `<option value="${v.id}" ${v.id === active ? 'selected' : ''}>${v.name}・${v.plate}</option>`).join('');
}

function handleVehicleSwitch(vid) {
    Store.setActive(vid);
    Object.keys(chartInstances).forEach(k => { chartInstances[k].destroy(); delete chartInstances[k]; });
    fullRender();
    const v = Store.activeVehicle();
    Toast.show(`已切換至 ${v.name}`, 'success');
}

// Generate dynamic reminders from data
function generateReminders() {
    const v = Store.activeVehicle(), parts = Store.parts(), ins = Store.insurance(), td = today();
    const rem = [];
    // Parts-based
    parts.forEach((p, i) => {
        const pct = calcPartPct(p, v.mileage);
        if (pct !== null) {
            if (pct <= 0) rem.push({ title: `${p.name}已超過建議更換里程`, detail: `超過 ${fmtN(Math.abs(v.mileage - p.lastKm - p.intervalKm))} km`, level: 'danger' });
            else if (pct <= 30) rem.push({ title: `${p.name}壽命偏低`, detail: `剩餘約 ${pct}%，建議安排更換`, level: 'warning' });
            else if (pct <= 50) rem.push({ title: `${p.name}壽命偏低`, detail: `剩餘約 ${pct}%，建議留意`, level: 'info' });
        }
    });
    // Insurance
    if (ins.mandatory) { const d = daysBetween(td, ins.mandatory); if (d < 0) rem.push({ title: '強制險已過期', detail: `${ins.mandatory}`, level: 'danger' }); else if (d <= 30) rem.push({ title: '強制險即將到期', detail: `${ins.mandatory}，剩餘 ${d} 天`, level: 'warning' }); else if (d <= 90) rem.push({ title: '強制險提醒', detail: `${ins.mandatory}，剩餘 ${d} 天`, level: 'info' }); else rem.push({ title: '強制險', detail: `${ins.mandatory}，剩餘 ${d} 天`, level: 'ok' }); }
    if (ins.thirdParty && ins.thirdParty !== ins.mandatory) { const d = daysBetween(td, ins.thirdParty); if (d < 0) rem.push({ title: '第三人責任險已過期', detail: `${ins.thirdParty}`, level: 'danger' }); else if (d <= 30) rem.push({ title: '第三人責任險即將到期', detail: `${ins.thirdParty}，剩餘 ${d} 天`, level: 'warning' }); else if (d <= 90) rem.push({ title: '第三人責任險提醒', detail: `${ins.thirdParty}，剩餘 ${d} 天`, level: 'info' }); }
    if (ins.inspectionDate) { const d = daysBetween(td, ins.inspectionDate); if (d < 0) rem.push({ title: '定期驗車已過期', detail: `${ins.inspectionDate}`, level: 'danger' }); else if (d <= 30) rem.push({ title: '定期驗車即將到期', detail: `${ins.inspectionDate}，剩餘 ${d} 天`, level: 'warning' }); else rem.push({ title: '定期驗車', detail: `${ins.inspectionDate}，剩餘 ${d} 天`, level: 'ok' }); }
    // Tax
    if (!ins.fuelTaxPaid) rem.push({ title: '燃料稅繳納', detail: '2026-07-01', level: 'info' });
    if (ins.licenseTaxPaid) rem.push({ title: '牌照稅', detail: '2026-04 已繳納 ✓', level: 'ok' });
    // Sort: danger > warning > info > ok
    const order = { danger: 0, warning: 1, info: 2, ok: 3 };
    rem.sort((a, b) => (order[a.level] || 9) - (order[b.level] || 9));
    return rem;
}

function statCard(label, value, color = 'text-white', sub = '') {
    return `<div class="card bg-surface-card rounded-xl border border-slate-700/50 p-4"><p class="text-[11px] text-slate-400 mb-1">${label}</p><p class="text-2xl font-bold ${color} font-num">${value}</p>${sub ? `<p class="text-[11px] text-slate-500 mt-1">${sub}</p>` : ''}</div>`;
}

// ── Dashboard ──
function renderDashboard() {
    const v = Store.activeVehicle(), recs = Store.fuelRecords(), maint = Store.maintRecords();
    const avgKmL = recs.length ? (recs.reduce((s, r) => s + r.kmL, 0) / recs.length).toFixed(1) : '—';
    const thisMonth = recs.filter(r => r.date.startsWith(today().slice(0, 7))).reduce((s, r) => s + r.total, 0) + maint.filter(r => r.date.startsWith(today().slice(0, 7))).reduce((s, r) => s + r.cost, 0);
    const reminders = generateReminders();
    const urgentCount = reminders.filter(r => r.level === 'danger' || r.level === 'warning').length;
    $('reminder-badge').textContent = urgentCount;
    $('reminder-badge').classList.toggle('hidden', urgentCount === 0);
    $('dash-update-time').textContent = '更新時間：' + new Date().toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    $('dash-subtitle').textContent = v.name + '・' + v.plate;
    $('dash-stats').innerHTML = statCard('目前里程', fmtN(v.mileage), 'text-white', 'km') + statCard('平均油耗', avgKmL, 'text-emerald-400', 'km/L') + statCard('本月花費', '$' + fmtN(thisMonth), 'text-amber-400', 'NT$') + statCard('待辦提醒', urgentCount, 'text-red-400', '項需處理');

    // Reminders widget (top 3)
    const top3 = reminders.filter(r => r.level !== 'ok').slice(0, 3);
    $('dash-reminders').innerHTML = top3.length ? top3.map(r => {
        const borderMap = { danger: 'border-red-500/20 bg-red-500/5', warning: 'border-amber-500/20 bg-amber-500/5', info: 'border-blue-500/20 bg-blue-500/5' };
        const dotMap = { danger: 'bg-red-500', warning: 'bg-amber-500', info: 'bg-blue-500' };
        const txtMap = { danger: 'text-red-400', warning: 'text-amber-400', info: 'text-blue-400' };
        return `<div class="flex items-start gap-3 p-2.5 ${borderMap[r.level]} border rounded-lg"><div class="w-2 h-2 rounded-full ${dotMap[r.level]} mt-1.5 shrink-0"></div><div><p class="text-sm text-white">${r.title}</p><p class="text-xs ${txtMap[r.level]} font-num">${r.detail}</p></div></div>`;
    }).join('') : '<p class="text-sm text-slate-500 text-center py-4">🎉 目前沒有待辦事項</p>';

    // Fuel price widget
    const fp = Store.fuelPrices().current;
    const vFuel = v.fuelType || '95 無鉛';
    $('dash-fuel-price-card').innerHTML = `
      <div class="flex items-center justify-between mb-4"><h3 class="text-sm font-semibold text-white flex items-center gap-2"><i data-lucide="fuel" class="w-4 h-4 text-blue-400"></i>即時油價</h3><span class="text-xs text-slate-500">中油</span></div>
      <div class="space-y-3">
        ${['92', '95', '98'].map(g => { const isActive = vFuel.includes(g); return `<div class="flex justify-between items-center ${isActive ? 'p-2 bg-blue-500/10 rounded-lg border border-blue-500/20' : ''}"><span class="text-sm ${isActive ? 'text-blue-300 font-medium' : 'text-slate-300'}">${g} 無鉛${isActive ? ' ★' : ''}</span><span class="font-num text-lg font-bold ${isActive ? 'text-blue-400' : 'text-white'}">${fp[g]}</span></div>`; }).join('')}
        <div class="flex justify-between items-center"><span class="text-sm text-slate-300">超級柴油</span><span class="font-num text-lg font-bold text-white">${fp.diesel}</span></div>
      </div>
      <p class="text-[10px] text-slate-500 mt-3">單位：NT$/公升　★ 您的車輛適用油品</p>`;

    // Parts mini
    renderPartsGrid('dashPartsGrid', true);
    lucide.createIcons();
}

// ── Vehicles ──
function renderVehicleCards() {
    const vs = Store.vehicles(), activeId = Store.data().activeVehicleId;
    if (!vs.length) { $('vehicleCards').innerHTML = '<div class="col-span-2 text-center py-16"><p class="text-slate-500 mb-4">尚未新增任何車輛</p><button onclick="Forms.vehicleForm()" class="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg">新增第一台車</button></div>'; return; }
    $('vehicleCards').innerHTML = vs.map((v, i) => {
        const gradients = ['from-blue-900/40', 'from-emerald-900/40', 'from-purple-900/40', 'from-amber-900/40'];
        const isActive = v.id === activeId;
        return `<div class="card bg-surface-card rounded-xl border ${isActive ? 'border-blue-500/40 ring-1 ring-blue-500/20' : 'border-slate-700/50'} overflow-hidden">
        ${isActive ? '<div class="bg-blue-500/10 text-blue-400 text-[10px] font-bold text-center py-1 tracking-wider">● 目前使用中</div>' : ''}
        <div class="h-36 bg-gradient-to-br ${gradients[i % 4]} to-slate-900 flex items-center justify-center">
          <div class="text-center"><div class="w-14 h-14 mx-auto mb-2 rounded-full bg-slate-800 flex items-center justify-center"><i data-lucide="car" class="w-7 h-7" style="color:${v.color}"></i></div><p class="font-bold text-white text-sm">${v.name}</p></div>
        </div>
        <div class="p-4 space-y-2.5">
          <div class="flex justify-between text-sm"><span class="text-slate-400">車牌</span><span class="font-num text-white font-medium">${v.plate}</span></div>
          <div class="flex justify-between text-sm"><span class="text-slate-400">年份</span><span class="font-num text-white">${v.year}</span></div>
          <div class="flex justify-between text-sm"><span class="text-slate-400">排氣量</span><span class="font-num text-white">${v.engine}</span></div>
          <div class="flex justify-between text-sm"><span class="text-slate-400">燃料</span><span class="text-white">${v.fuelType}</span></div>
          <div class="flex justify-between text-sm"><span class="text-slate-400">目前里程</span><span class="font-num text-white font-bold">${fmtN(v.mileage)} km</span></div>
          <div class="flex gap-2 mt-3">
            ${!isActive ? `<button onclick="handleVehicleSwitch('${v.id}')" class="flex-1 py-2 text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20">切換使用</button>` : ''}
            <button onclick="Forms.vehicleForm('${v.id}')" class="flex-1 py-2 text-xs font-medium bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600">編輯</button>
            <button onclick="deleteVehicle('${v.id}')" class="py-2 px-3 text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20">刪除</button>
          </div>
        </div>
      </div>`;
    }).join('');
    lucide.createIcons();
}

// ── Fuel Table ──
let _maintFilterType = 'all';
function renderFuelTable() {
    const v = Store.activeVehicle(), recs = Store.fuelRecords();
    const search = ($('fuel-search')?.value || '').toLowerCase();
    const filtered = recs.filter(r => !search || r.station.toLowerCase().includes(search));
    $('fuel-subtitle').textContent = v.name + '・' + v.plate;
    // Stats
    const totalFuel = recs.reduce((s, r) => s + r.total, 0);
    const avgKmL = recs.length ? (recs.reduce((s, r) => s + r.kmL, 0) / recs.length).toFixed(1) : '—';
    const costPerKm = recs.length && v.mileage > 0 ? (totalFuel / v.mileage * 2).toFixed(2) : '—'; // approximate
    $('fuel-stats').innerHTML = statCard('總加油次數', recs.length) + statCard('平均油耗', avgKmL, 'text-emerald-400', 'km/L') + statCard('總加油費用', '$' + fmtN(totalFuel), 'text-amber-400') + statCard('每公里油費', '$' + costPerKm);
    // Table
    $('fuelTableBody').innerHTML = filtered.map(r => {
        const c = r.kmL >= 20 ? 'text-emerald-400' : r.kmL >= 18 ? 'text-amber-400' : 'text-red-400';
        return `<tr class="hover:bg-slate-800/50"><td class="px-4 py-3 font-num text-sm text-slate-300">${r.date}</td><td class="px-4 py-3 font-num text-sm text-white text-right">${fmtN(r.mileage)}</td><td class="px-4 py-3 font-num text-sm text-white text-right">${r.liters}</td><td class="px-4 py-3 font-num text-sm text-white text-right">${r.price}</td><td class="px-4 py-3 font-num text-sm text-amber-400 text-right font-medium">$${fmtN(r.total)}</td><td class="px-4 py-3 text-sm text-slate-400 hidden md:table-cell">${r.station}</td><td class="px-4 py-3 text-center">${r.full ? '<span class="text-emerald-400">✓</span>' : '<span class="text-slate-600">—</span>'}</td><td class="px-4 py-3 font-num text-sm text-right font-bold ${c}">${r.kmL}</td><td class="px-4 py-3 text-center"><button onclick="deleteFuelRecord('${r.id}')" class="p-1 rounded hover:bg-red-500/20 text-slate-600 hover:text-red-400"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button></td></tr>`;
    }).join('') || '<tr><td colspan="9" class="text-center py-8 text-slate-500">尚無加油紀錄</td></tr>';
    lucide.createIcons();
}

function sortFuelTable(field) {
    _fuelSortAsc = !_fuelSortAsc;
    const recs = Store.fuelRecords();
    recs.sort((a, b) => _fuelSortAsc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));
    Store.save();
    renderFuelTable();
}

// ── Maintenance ──
function renderMaintenance() {
    const v = Store.activeVehicle(), recs = Store.maintRecords();
    $('maint-subtitle').textContent = v.name + '・' + v.plate;
    const filtered = _maintFilterType === 'all' ? recs : recs.filter(r => r.type === _maintFilterType);
    const totalCost = recs.reduce((s, r) => s + r.cost, 0);
    const maintCount = recs.filter(r => r.type === '保養').length;
    const repairCount = recs.filter(r => r.type === '維修').length;
    $('maint-stats').innerHTML = statCard('總維修次數', recs.length) + statCard('定期保養', maintCount, 'text-emerald-400') + statCard('故障維修', repairCount, 'text-red-400') + statCard('累計花費', '$' + fmtN(totalCost), 'text-amber-400');
    // Filter tabs
    const tabs = [{ k: 'all', l: '全部' }, { k: '保養', l: '定期保養' }, { k: '維修', l: '故障維修' }];
    $('maint-filter-tabs').innerHTML = tabs.map(t => {
        const active = _maintFilterType === t.k;
        return `<button onclick="_maintFilterType='${t.k}';renderMaintenance()" class="px-3 py-1.5 text-xs font-medium rounded-full ${active ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'}">${t.l}</button>`;
    }).join('');
    // Timeline
    if (!filtered.length) { $('maintenanceTimeline').innerHTML = ''; $('maint-empty').classList.remove('hidden'); lucide.createIcons(); return; }
    $('maint-empty').classList.add('hidden');
    $('maintenanceTimeline').innerHTML = filtered.map(m => {
        const isR = m.type === '維修', dot = isR ? 'bg-red-500' : 'bg-emerald-500', badge = isR ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        return `<div class="card bg-surface-card rounded-xl border border-slate-700/50 p-4 md:p-5 flex gap-4">
        <div class="flex flex-col items-center"><div class="w-3 h-3 rounded-full ${dot} shrink-0 mt-1"></div><div class="w-px flex-1 bg-slate-700 mt-1"></div></div>
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2 mb-2"><span class="font-num text-sm text-white font-medium">${m.date}</span><span class="text-xs px-2 py-0.5 rounded-full border ${badge}">${m.type}</span><span class="text-xs text-slate-500 font-num">${fmtN(m.mileage)} km</span>
            <button onclick="deleteMaintRecord('${m.id}')" class="ml-auto p-1 rounded hover:bg-red-500/20 text-slate-600 hover:text-red-400"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
          </div>
          <p class="text-sm text-white font-medium mb-1">${m.items}</p>
          <p class="text-xs text-slate-400 mb-2">${m.shop}${m.note ? ' — ' + m.note : ''}</p>
          <p class="text-sm font-bold text-amber-400 font-num">$${fmtN(m.cost)}</p>
        </div>
      </div>`;
    }).join('');
    lucide.createIcons();
}

// ── Parts ──
function renderPartsGrid(containerId, compact) {
    const v = Store.activeVehicle(), parts = Store.parts();
    if (!compact) $('parts-subtitle').textContent = v.name + '・' + v.plate + '　目前里程 ' + fmtN(v.mileage) + ' km';
    const el = $(containerId); if (!el) return;
    el.innerHTML = parts.map((p, i) => {
        const pct = calcPartPct(p, v.mileage); const displayPct = pct === null ? 50 : Math.max(0, Math.min(100, pct));
        const s = partStatus(pct);
        if (compact) return `<div class="flex items-center gap-3"><span class="text-xs text-slate-400 w-16 shrink-0 truncate">${p.name}</span><div class="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden"><div class="h-full ${s.bg} rounded-full progress-bar" style="width:${displayPct}%"></div></div><span class="font-num text-xs font-bold ${s.color} w-10 text-right">${pct === null ? '—' : pct + '%'}</span></div>`;
        const usedKm = p.intervalKm ? (v.mileage - p.lastKm) : null, remainKm = p.intervalKm ? (p.intervalKm - usedKm) : null;
        return `<div class="card bg-surface-card rounded-xl border border-slate-700/50 p-4">
        <div class="flex items-center justify-between mb-3"><div class="flex items-center gap-2"><i data-lucide="${p.icon}" class="w-4 h-4 ${s.color}"></i><span class="text-sm font-medium text-white">${p.name}</span></div><span class="text-xs px-2 py-0.5 rounded-full border ${s.badge}">${s.label}</span></div>
        <div class="h-3 bg-slate-700 rounded-full overflow-hidden mb-2"><div class="h-full ${s.bg} rounded-full progress-bar" style="width:${displayPct}%"></div></div>
        <div class="flex justify-between text-xs"><span class="text-slate-400">上次更換：${fmtN(p.lastKm)} km</span><span class="font-num font-bold ${s.color}">${pct === null ? '—' : pct + '%'}</span></div>
        ${p.intervalKm ? `<p class="text-xs text-slate-500 mt-1">週期 ${fmtN(p.intervalKm)} km｜${remainKm > 0 ? '剩餘 ' + fmtN(remainKm) + ' km' : '<span class="text-red-400">已超過 ' + fmtN(Math.abs(remainKm)) + ' km</span>'}</p>` : `<p class="text-xs text-slate-500 mt-1">${p.note || ''}</p>`}
        <button onclick="confirmResetPart(${i},'${p.name}')" class="mt-3 w-full py-1.5 text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors">✓ 已更換</button>
      </div>`;
    }).join('');
    lucide.createIcons();
}

// ── Reminders ──
function renderReminders() {
    const reminders = generateReminders();
    const groups = { danger: { label: '🔴 緊急（已超期/即將到期）', items: [] }, warning: { label: '🟡 注意（30 天內）', items: [] }, info: { label: '🔵 提醒（30～90 天）', items: [] }, ok: { label: '✅ 正常', items: [] } };
    reminders.forEach(r => groups[r.level].items.push(r));
    $('remindersContainer').innerHTML = Object.values(groups).filter(g => g.items.length).map(g => `
      <div><h3 class="text-sm font-semibold text-slate-300 mb-3">${g.label}</h3><div class="space-y-2">
        ${g.items.map(r => {
        const bm = { danger: 'border-red-500/30 bg-red-500/5', warning: 'border-amber-500/30 bg-amber-500/5', info: 'border-blue-500/30 bg-blue-500/5', ok: 'border-slate-700/50 bg-surface-card' }; const dm = { danger: 'bg-red-500', warning: 'bg-amber-500', info: 'bg-blue-500', ok: 'bg-emerald-500' };
        return `<div class="card rounded-xl border ${bm[r.level]} p-4 flex items-center gap-4"><div class="w-2.5 h-2.5 rounded-full shrink-0 ${dm[r.level]}"></div><div class="flex-1"><p class="text-sm text-white font-medium">${r.title}</p><p class="text-xs text-slate-400 mt-0.5">${r.detail}</p></div></div>`;
    }).join('')}
      </div></div>`).join('') || '<p class="text-center text-slate-500 py-16">🎉 目前沒有任何提醒</p>';
}

// ── TCO ──
function renderTCO() {
    const v = Store.activeVehicle(), fuel = Store.fuelRecords(), maint = Store.maintRecords();
    const months = v.purchaseDate ? Math.max(1, Math.round(daysBetween(v.purchaseDate, today()) / 30)) : 1;
    const totalFuel = fuel.reduce((s, r) => s + r.total, 0), totalMaint = maint.reduce((s, r) => s + r.cost, 0);
    const estInsurance = Math.round(months / 12) * 12000, estTax = Math.round(months / 12) * 11000;
    const totalCost = totalFuel + totalMaint + estInsurance + estTax;
    const costPerKm = v.mileage > 0 ? (totalCost / v.mileage).toFixed(2) : '—';
    const monthAvg = Math.round(totalCost / months);
    const yearAvg = monthAvg * 12;
    const yrs = Math.floor(months / 12), mos = months % 12;
    $('tco-subtitle').textContent = v.name + '・' + v.plate + '　持有 ' + yrs + ' 年 ' + mos + ' 個月';
    $('tco-stats').innerHTML = statCard('累計總花費', '$' + fmtN(totalCost)) + statCard('每公里成本', '$' + costPerKm, 'text-blue-400') + statCard('月均花費', '$' + fmtN(monthAvg), 'text-amber-400') + statCard('年度花費', '$' + fmtN(yearAvg), 'text-emerald-400');
}

// ── Fuel Prices ──
function renderFuelPrices() {
    const fp = Store.fuelPrices(), v = Store.activeVehicle(), vFuel = v.fuelType || '95 無鉛';
    const items = [{ k: '92', l: '92 無鉛' }, { k: '95', l: '95 無鉛' }, { k: '98', l: '98 無鉛' }, { k: 'diesel', l: '超級柴油' }];
    $('fuel-price-cards').innerHTML = items.map(it => {
        const isActive = vFuel.includes(it.k) || (it.k === 'diesel' && vFuel.includes('柴油'));
        const chg = fp.changes[it.k]; const chgHtml = chg > 0 ? `<p class="text-xs text-red-400 mt-1 font-num">▲ ${chg}</p>` : `<p class="text-xs text-emerald-400 mt-1 font-num">▼ ${Math.abs(chg)}</p>`;
        return `<div class="card bg-surface-card rounded-xl border ${isActive ? 'border-blue-500/30 ring-1 ring-blue-500/20' : 'border-slate-700/50'} p-4 text-center"><p class="text-xs ${isActive ? 'text-blue-400' : 'text-slate-400'} mb-2">${it.l}${isActive ? ' ★' : ''}</p><p class="text-3xl font-bold ${isActive ? 'text-blue-400' : 'text-white'} font-num">${fp.current[it.k]}</p>${chgHtml}</div>`;
    }).join('');
}

// ── Settings ──
function renderSettings() {
    const u = Store.user(), s = Store.settings();
    $('set-name').value = u.name; $('set-email').value = u.email; $('set-phone').value = u.phone;
    updateToggle('toggle-email', s.emailReminders); updateToggle('toggle-fuel', s.fuelPriceAlert);
}
function updateToggle(id, on) { const el = $(id); if (!el) return; el.style.background = on ? '#3B82F6' : '#475569'; el.querySelector('.toggle-knob').style.left = on ? 'calc(100% - 1.25rem - 2px)' : '2px'; }
function toggleSetting(key) { const s = Store.settings(); s[key] = !s[key]; Store.save(); renderSettings(); Toast.show('設定已更新', 'success'); }
function saveSettings() { const u = Store.user(); u.name = $('set-name').value; u.email = $('set-email').value; u.phone = $('set-phone').value; Store.save(); $('user-display-name').textContent = u.name; $('user-email-display').textContent = u.email; Toast.show('個人資料已儲存', 'success'); }
function confirmResetAll() { confirmDialog('確認重置', '確定要重置所有資料嗎？此操作無法復原。', () => { Store.reset(); }); }

// ═══════════════════════════════════════════════════════════════
// 7. CHARTS
// ═══════════════════════════════════════════════════════════════
Chart.defaults.color = '#94A3B8'; Chart.defaults.borderColor = 'rgba(148,163,184,0.1)';
Chart.defaults.font.family = "'JetBrains Mono','Noto Sans TC',sans-serif"; Chart.defaults.font.size = 11;

function destroyChart(id) { if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; } }

function buildCharts(page) {
    const v = Store.activeVehicle(), recs = Store.fuelRecords(), maint = Store.maintRecords();
    if ((page === 'dashboard' || page === 'all') && $('dashFuelChart')) {
        destroyChart('dashFuelChart');
        const d = recs.slice(0, 10).reverse();
        if (d.length) {
            const avg = d.length ? (d.reduce((s, r) => s + r.kmL, 0) / d.length).toFixed(1) : 0;
            chartInstances['dashFuelChart'] = new Chart($('dashFuelChart'), { type: 'line', data: { labels: d.map(r => r.date.slice(5)), datasets: [{ label: 'km/L', data: d.map(r => r.kmL), borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: .4, pointBackgroundColor: '#10B981', pointRadius: 4, pointHoverRadius: 6 }, { label: '平均', data: Array(d.length).fill(avg), borderColor: 'rgba(148,163,184,0.3)', borderDash: [5, 5], pointRadius: 0, fill: false }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => v + ' km/L' } } } } });
        }
        destroyChart('dashExpenseChart');
        // Monthly expense bar (last 5 months)
        const months = []; const now = new Date();
        for (let i = 4; i >= 0; i--) { const d2 = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push(d2.getFullYear() + '-' + String(d2.getMonth() + 1).padStart(2, '0')); }
        const fuelByM = months.map(m => recs.filter(r => r.date.startsWith(m)).reduce((s, r) => s + r.total, 0));
        const maintByM = months.map(m => maint.filter(r => r.date.startsWith(m)).reduce((s, r) => s + r.cost, 0));
        chartInstances['dashExpenseChart'] = new Chart($('dashExpenseChart'), { type: 'bar', data: { labels: months.map(m => { const [y, mo] = m.split('-'); return mo + '月'; }), datasets: [{ label: '油費', data: fuelByM, backgroundColor: '#3B82F6', borderRadius: 4 }, { label: '維修', data: maintByM, backgroundColor: '#F59E0B', borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 8 } } }, scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: v => '$' + v.toLocaleString() } } } } });
    }
    if ((page === 'fuel' || page === 'all') && $('fuelTrendChart')) {
        destroyChart('fuelTrendChart');
        const d = recs.slice().reverse();
        if (d.length) {
            const avg = (d.reduce((s, r) => s + r.kmL, 0) / d.length).toFixed(1);
            chartInstances['fuelTrendChart'] = new Chart($('fuelTrendChart'), { type: 'line', data: { labels: d.map(r => r.date), datasets: [{ label: 'km/L', data: d.map(r => r.kmL), borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.08)', fill: true, tension: .4, pointBackgroundColor: '#10B981', pointRadius: 5, pointHoverRadius: 7 }, { label: '歷史平均 (' + avg + ')', data: Array(d.length).fill(avg), borderColor: 'rgba(148,163,184,0.3)', borderDash: [5, 5], pointRadius: 0, fill: false }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } } }, scales: { y: { ticks: { callback: v => v + ' km/L' } } } } });
        }
    }
    if ((page === 'tco' || page === 'all') && $('tcoPieChart')) {
        destroyChart('tcoPieChart');
        const totalFuel = recs.reduce((s, r) => s + r.total, 0), totalMaint = maint.reduce((s, r) => s + r.cost, 0);
        const months2 = v.purchaseDate ? Math.max(1, Math.round(daysBetween(v.purchaseDate, today()) / 30)) : 1;
        const estIns = Math.round(months2 / 12) * 12000, estTax = Math.round(months2 / 12) * 11000;
        chartInstances['tcoPieChart'] = new Chart($('tcoPieChart'), { type: 'doughnut', data: { labels: ['油費', '維修保養', '保險', '規費'], datasets: [{ data: [totalFuel, totalMaint, estIns, estTax], backgroundColor: ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12, color: '#CBD5E1' } } } } });
        destroyChart('tcoBarChart');
        const months3 = []; const now2 = new Date();
        for (let i = 5; i >= 0; i--) { const d3 = new Date(now2.getFullYear(), now2.getMonth() - i, 1); months3.push(d3.getFullYear() + '-' + String(d3.getMonth() + 1).padStart(2, '0')); }
        const fuelM = months3.map(m => recs.filter(r => r.date.startsWith(m)).reduce((s, r) => s + r.total, 0));
        const maintM = months3.map(m => maint.filter(r => r.date.startsWith(m)).reduce((s, r) => s + r.cost, 0));
        chartInstances['tcoBarChart'] = new Chart($('tcoBarChart'), { type: 'bar', data: { labels: months3.map(m => m.slice(5) + '月'), datasets: [{ label: '油費', data: fuelM, backgroundColor: '#3B82F6', borderRadius: 4 }, { label: '維修', data: maintM, backgroundColor: '#F59E0B', borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 8 } } }, scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: v => '$' + v.toLocaleString() } } } } });
    }
    if ((page === 'fuel-prices' || page === 'all') && $('fuelPriceTrendChart')) {
        destroyChart('fuelPriceTrendChart');
        const fp = Store.fuelPrices().trend;
        chartInstances['fuelPriceTrendChart'] = new Chart($('fuelPriceTrendChart'), { type: 'line', data: { labels: fp.labels, datasets: [{ label: '95 無鉛 (NT$/L)', data: fp.data, borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.08)', fill: true, tension: .1, pointBackgroundColor: '#3B82F6', pointRadius: 3, stepped: 'before' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => '$' + v.toFixed(1) } } } } });
    }
}

// ═══════════════════════════════════════════════════════════════
// 8. FORMS (Modal-based CRUD)
// ═══════════════════════════════════════════════════════════════
const Forms = {
    vehicleForm(editId) {
        const existing = editId ? Store.vehicles().find(v => v.id === editId) : null;
        const title = existing ? '編輯車輛' : '新增車輛';
        const body = `<div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div><label class="block text-xs text-slate-400 mb-1">廠牌型號 *</label><input id="vf-name" class="input-field" placeholder="Toyota Corolla Cross" value="${existing ? existing.name : ''}"></div>
          <div><label class="block text-xs text-slate-400 mb-1">車牌 *</label><input id="vf-plate" class="input-field" placeholder="ABC-1234" value="${existing ? existing.plate : ''}"></div>
        </div>
        <div class="grid grid-cols-3 gap-4">
          <div><label class="block text-xs text-slate-400 mb-1">年份 *</label><input id="vf-year" type="number" class="input-field" placeholder="2021" value="${existing ? existing.year : ''}"></div>
          <div><label class="block text-xs text-slate-400 mb-1">排氣量</label><input id="vf-engine" class="input-field" placeholder="1798cc" value="${existing ? existing.engine : ''}"></div>
          <div><label class="block text-xs text-slate-400 mb-1">燃料類型</label><select id="vf-fuel" class="input-field"><option value="92 無鉛">92 無鉛</option><option value="95 無鉛" ${!existing || existing.fuelType === '95 無鉛' ? 'selected' : ''}>95 無鉛</option><option value="98 無鉛">98 無鉛</option><option value="超級柴油">超級柴油</option></select></div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div><label class="block text-xs text-slate-400 mb-1">購入日期</label><input id="vf-purchase" type="date" class="input-field" value="${existing ? existing.purchaseDate : ''}"></div>
          <div><label class="block text-xs text-slate-400 mb-1">目前里程 (km) *</label><input id="vf-mileage" type="number" class="input-field" placeholder="50000" value="${existing ? existing.mileage : ''}"></div>
        </div>
      </div>`;
        const footer = `<button onclick="Modal.close()" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-sm text-white rounded-lg">取消</button>
        <button onclick="Forms._submitVehicle('${editId || ''}')" class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-sm text-white rounded-lg font-medium">${existing ? '儲存變更' : '確認新增'}</button>`;
        Modal.open(title, body, footer);
    },
    _submitVehicle(editId) {
        const name = $('vf-name').value.trim(), plate = $('vf-plate').value.trim(), year = parseInt($('vf-year').value), mileage = parseInt($('vf-mileage').value);
        if (!name || !plate || !year || isNaN(mileage)) { Toast.show('請填寫必填欄位', 'error'); return; }
        const data = { name, plate, year, mileage, engine: $('vf-engine').value.trim(), fuelType: $('vf-fuel').value, purchaseDate: $('vf-purchase').value, color: ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'][Math.floor(Math.random() * 5)] };
        if (editId) { Store.updateVehicle(editId, data); Toast.show('車輛資料已更新', 'success'); }
        else { Store.addVehicle(data); Toast.show('車輛已新增', 'success'); }
        Modal.close(); fullRender();
    },

    fuelForm() {
        const v = Store.activeVehicle(), fp = Store.fuelPrices().current;
        const fuelKey = v.fuelType.includes('92') ? '92' : v.fuelType.includes('98') ? '98' : v.fuelType.includes('柴油') ? 'diesel' : '95';
        const defaultPrice = fp[fuelKey] || 31.3;
        const body = `<div class="space-y-4">
        <p class="text-xs text-slate-500">車輛：${v.name}（${v.plate}）</p>
        <div class="grid grid-cols-2 gap-4">
          <div><label class="block text-xs text-slate-400 mb-1">日期 *</label><input id="ff-date" type="date" class="input-field" value="${today()}"></div>
          <div><label class="block text-xs text-slate-400 mb-1">加油里程 (km) *</label><input id="ff-mileage" type="number" class="input-field" placeholder="${v.mileage}" oninput="Forms._calcFuel()"></div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div><label class="block text-xs text-slate-400 mb-1">加油公升 *</label><input id="ff-liters" type="number" step="0.1" class="input-field" placeholder="35.0" oninput="Forms._calcFuel()"></div>
          <div><label class="block text-xs text-slate-400 mb-1">單價 (NT$/L) *</label><input id="ff-price" type="number" step="0.1" class="input-field" value="${defaultPrice}" oninput="Forms._calcFuel()"></div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div><label class="block text-xs text-slate-400 mb-1">總金額</label><input id="ff-total" type="number" class="input-field bg-slate-800" readonly></div>
          <div><label class="block text-xs text-slate-400 mb-1">油耗 (km/L)</label><input id="ff-kml" type="text" class="input-field bg-slate-800" readonly></div>
        </div>
        <div><label class="block text-xs text-slate-400 mb-1">加油站</label><input id="ff-station" class="input-field" placeholder="中油 XX站"></div>
        <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" id="ff-full" checked class="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500"><span class="text-sm text-slate-300">加滿</span></label>
      </div>`;
        const footer = `<button onclick="Modal.close()" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-sm text-white rounded-lg">取消</button>
        <button onclick="Forms._submitFuel()" class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-sm text-white rounded-lg font-medium">確認新增</button>`;
        Modal.open('新增加油紀錄', body, footer);
    },
    _calcFuel() {
        const liters = parseFloat($('ff-liters')?.value), price = parseFloat($('ff-price')?.value), mileage = parseInt($('ff-mileage')?.value);
        if (liters && price) $('ff-total').value = Math.round(liters * price);
        const recs = Store.fuelRecords();
        if (mileage && liters && recs.length) { const lastM = recs[0].mileage; const diff = mileage - lastM; if (diff > 0) $('ff-kml').value = (diff / liters).toFixed(1); else $('ff-kml').value = '—'; }
    },
    _submitFuel() {
        const date = $('ff-date').value, mileage = parseInt($('ff-mileage').value), liters = parseFloat($('ff-liters').value), price = parseFloat($('ff-price').value);
        if (!date || !mileage || !liters || !price) { Toast.show('請填寫必填欄位', 'error'); return; }
        const total = Math.round(liters * price);
        const recs = Store.fuelRecords(); const lastM = recs.length ? recs[0].mileage : 0;
        const kmL = lastM > 0 && mileage > lastM ? parseFloat(((mileage - lastM) / liters).toFixed(1)) : parseFloat((mileage / liters * 0.4).toFixed(1)); // fallback
        Store.addFuel({ date, mileage, liters, price, total, station: $('ff-station').value.trim() || '未填', full: $('ff-full').checked, kmL });
        // Update vehicle mileage if higher
        const v = Store.activeVehicle(); if (mileage > v.mileage) { Store.updateVehicle(v.id, { mileage }); }
        Modal.close(); Toast.show('加油紀錄已新增', 'success'); fullRender();
    },

    maintForm() {
        const v = Store.activeVehicle();
        const body = `<div class="space-y-4">
        <p class="text-xs text-slate-500">車輛：${v.name}（${v.plate}）</p>
        <div class="grid grid-cols-2 gap-4">
          <div><label class="block text-xs text-slate-400 mb-1">日期 *</label><input id="mf-date" type="date" class="input-field" value="${today()}"></div>
          <div><label class="block text-xs text-slate-400 mb-1">里程 (km) *</label><input id="mf-mileage" type="number" class="input-field" placeholder="${v.mileage}"></div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div><label class="block text-xs text-slate-400 mb-1">類型 *</label><select id="mf-type" class="input-field"><option value="保養">定期保養</option><option value="維修">故障維修</option></select></div>
          <div><label class="block text-xs text-slate-400 mb-1">費用 (NT$) *</label><input id="mf-cost" type="number" class="input-field" placeholder="3000"></div>
        </div>
        <div><label class="block text-xs text-slate-400 mb-1">項目 *</label><input id="mf-items" class="input-field" placeholder="機油更換、機油芯更換"></div>
        <div><label class="block text-xs text-slate-400 mb-1">維修廠</label><input id="mf-shop" class="input-field" placeholder="Toyota 台中服務廠"></div>
        <div><label class="block text-xs text-slate-400 mb-1">備註</label><input id="mf-note" class="input-field" placeholder="選填"></div>
      </div>`;
        const footer = `<button onclick="Modal.close()" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-sm text-white rounded-lg">取消</button>
        <button onclick="Forms._submitMaint()" class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-sm text-white rounded-lg font-medium">確認新增</button>`;
        Modal.open('新增維修紀錄', body, footer);
    },
    _submitMaint() {
        const date = $('mf-date').value, mileage = parseInt($('mf-mileage').value), type = $('mf-type').value, cost = parseInt($('mf-cost').value), items = $('mf-items').value.trim();
        if (!date || !mileage || !cost || !items) { Toast.show('請填寫必填欄位', 'error'); return; }
        Store.addMaint({ date, mileage, type, items, cost, shop: $('mf-shop').value.trim() || '未填', note: $('mf-note').value.trim() });
        const v = Store.activeVehicle(); if (mileage > v.mileage) Store.updateVehicle(v.id, { mileage });
        Modal.close(); Toast.show('維修紀錄已新增', 'success'); fullRender();
    }
};

// ═══════════════════════════════════════════════════════════════
// 9. CRUD DELETE HANDLERS
// ═══════════════════════════════════════════════════════════════
function deleteVehicle(id) {
    if (Store.vehicles().length <= 1) { Toast.show('至少需保留一台車輛', 'warning'); return; }
    const v = Store.vehicles().find(x => x.id === id);
    confirmDialog('刪除車輛', `確定要刪除「${v.name}（${v.plate}）」及其所有紀錄嗎？`, () => { Store.deleteVehicle(id); Toast.show('車輛已刪除', 'success'); fullRender(); });
}
function deleteFuelRecord(fid) { confirmDialog('刪除紀錄', '確定要刪除這筆加油紀錄嗎？', () => { Store.deleteFuel(fid); Toast.show('紀錄已刪除', 'success'); renderPage('fuel'); buildCharts('fuel'); }); }
function deleteMaintRecord(mid) { confirmDialog('刪除紀錄', '確定要刪除這筆維修紀錄嗎？', () => { Store.deleteMaint(mid); Toast.show('紀錄已刪除', 'success'); renderPage('maintenance'); }); }
function confirmResetPart(idx, name) { confirmDialog('確認更換', `確認「${name}」已更換？將重置壽命至目前里程。`, () => { Store.resetPart(idx); Toast.show(`${name} 已重置`, 'success'); renderPage(currentPage); }); }

// ═══════════════════════════════════════════════════════════════
// 10. CSV EXPORT
// ═══════════════════════════════════════════════════════════════
function exportCSV(type) {
    let csv = '', filename = '';
    if (type === 'fuel') {
        const recs = Store.fuelRecords();
        csv = '日期,里程,公升,單價,金額,加油站,加滿,km/L\n' + recs.map(r => `${r.date},${r.mileage},${r.liters},${r.price},${r.total},${r.station},${r.full ? '是' : '否'},${r.kmL}`).join('\n');
        filename = 'fuel_records_' + today() + '.csv';
    } else {
        const recs = Store.maintRecords();
        csv = '日期,里程,類型,項目,維修廠,費用,備註\n' + recs.map(r => `${r.date},${r.mileage},${r.type},${r.items},${r.shop},${r.cost},${r.note || ''}`).join('\n');
        filename = 'maintenance_records_' + today() + '.csv';
    }
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    Toast.show('CSV 已匯出', 'success');
}

// ═══════════════════════════════════════════════════════════════
// 11. PAGE RENDER DISPATCHER + INIT
// ═══════════════════════════════════════════════════════════════
function renderPage(page) {
    if (page === 'dashboard') { renderDashboard(); buildCharts('dashboard'); }
    else if (page === 'vehicles') renderVehicleCards();
    else if (page === 'fuel') { renderFuelTable(); buildCharts('fuel'); }
    else if (page === 'maintenance') renderMaintenance();
    else if (page === 'parts') renderPartsGrid('partsGrid', false);
    else if (page === 'reminders') renderReminders();
    else if (page === 'tco') { renderTCO(); buildCharts('tco'); }
    else if (page === 'fuel-prices') { renderFuelPrices(); buildCharts('fuel-prices'); }
    else if (page === 'settings') renderSettings();
}

function fullRender() {
    renderVehicleSelector();
    renderPage(currentPage);
    // Update sidebar user info
    const u = Store.user();
    $('user-display-name').textContent = u.name;
    $('user-email-display').textContent = u.email;
    const reminders = generateReminders();
    const urgentCount = reminders.filter(r => r.level === 'danger' || r.level === 'warning').length;
    $('reminder-badge').textContent = urgentCount;
    $('reminder-badge').classList.toggle('hidden', urgentCount === 0);
}

document.addEventListener('DOMContentLoaded', () => {
    Store.load();
    lucide.createIcons();
    fullRender();
});