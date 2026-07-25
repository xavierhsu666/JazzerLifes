// 配置要監控的標的
const CRYPTO_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
const FOREX_BASE = 'USD';
const WORKER_URL = 'https://fred-proxy.wryi636.workers.dev'; // 替換成你的 Worker 網址
const FINNHUB_KEY = 'd80blmpr01qq9ln39ep0d80blmpr01qq9ln39epg'; // 去 Finnhub 官網秒申請
const FINMIND_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoid3J5aTYzNiIsImVtYWlsIjoid3J5aTYzNkBnbWFpbC5jb20iLCJ0b2tlbl92ZXJzaW9uIjowfQ.OZOEYR2QT8qaRHjiPKUgB-t5rQmcLis-TeXSgSYg-xI';

async function getTaiwanStockData() {
    try {
        // 取得今日日期
        const todays = new Date();
        const today = new Date(todays.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // 1. 抓取加權指數 (TAIEX) 最新價格
        // 注意：FinMind 免費版數據通常延遲 15 分鐘或為盤後
        const res = await fetch(`https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=MSCI&start_date=${today}&token=${FINMIND_TOKEN}`);
        const data = await res.json();

        let html = '';
        if (data.data && data.data.length > 0) {
            const latest = data.data[data.data.length - 1];
            html += `
                <div class="stat-item">
                    <span>加權指數 (TAIEX)</span>
                    <span class="value">${latest.close}</span>
                </div>`;
        }

        // 2. 抓取三大法人買賣超 (這是台股最重要的邏輯指標)
        const instRes = await fetch(`https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockInstitutionalInvestorsBuySell&data_id=TAIEX&start_date=${today}&token=${FINMIND_TOKEN}`);
        const instData = await instRes.json();

        if (instData.data && instData.data.length > 0) {
            const netBuy = instData.data.reduce((acc, curr) => acc + curr.buy - curr.sell, 0);
            const isBull = netBuy > 0;
            html += `
                <div class="stat-item">
                    <span>三大法人合計</span>
                    <span class="${isBull ? 'up' : 'down'}">${(netBuy / 100000000).toFixed(2)} 億</span>
                </div>`;
        }

        document.getElementById('tw-stock-body').innerHTML = html || '盤後數據整理中...';
    } catch (e) {
        console.error("TW Stock Error", e);
    }
}
async function getEconomicCalendar() {
    try {
        // 設定查詢日期範圍（例如未來 7 天）
        const today = new Date();
        const from = new Date(today.getTime()).toISOString().split('T')[0];
        const to = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const res = await fetch(`https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${FINNHUB_KEY}`);
        const data = await res.json();

        // 過濾出高影響力 (Impact: high) 的美國指標
        const highImpactUS = data.economicCalendar.filter(event =>
            event.country === 'US' && event.impact === 'high'
        );
        console.log(highImpactUS);

        let html = '';
        highImpactUS.forEach(event => {
            html += `
                <div class="stat-item" style="border-bottom: 1px solid #444; padding: 10px 0;">
                    <div style="font-size: 0.8em; color: #888;">${event.time}</div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>${event.event}</span>
                        <span class="value" style="color: var(--accent-color);">
                            Act: ${event.actual || '--'} / Est: ${event.estimate || '--'}
                        </span>
                    </div>
                </div>`;
        });
        document.getElementById('calendar-body').innerHTML = html;
    } catch (e) {
        console.error("Finnhub Calendar Error", e);
    }
}
async function getTreasuryYield() {
    const API_KEY = '4a3343a73f244480aa963aa0d1f65b93'; // 去 twelvedata.com 免費申請
    try {
        // TNX 是 10 年美債殖利率的標準代碼 (數值需除以 10)
        const res = await fetch(`https://api.twelvedata.com/price?symbol=TNX&apikey=${API_KEY}`);
        const data = await res.json();

        if (data.price) {
            const yieldVal = (parseFloat(data.price) / 10).toFixed(2);
            document.getElementById('us10y-value').innerHTML = `${yieldVal}%`;
        }
    } catch (e) {
        console.error("Twelve Data Error", e);
    }
}
async function getMarketNews() {
    try {
        // 抓取全市場最新重大新聞
        const res = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_KEY}`);
        const news = await res.json();

        let html = '';
        // 僅顯示前 5 則最重要的
        news.slice(0, 5).forEach(item => {
            html += `
                <div class="news-item" style="margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px;">
                <a href="${item.url}" target="_blank" style="color: var(--accent-color); font-weight: bold;">${item.source}</a>    
                <small style="color: var(--accent-color);">${new Date(item.datetime * 1000).toLocaleTimeString()}</small>
                    <div style="font-size: 0.9em;">${item.headline}</div>
                </div>`;
        });
        document.getElementById('news-body').innerHTML = html;
    } catch (e) {
        console.error("News API Error", e);
    }
}
async function updateDashboard() {
    // 1. Binance Crypto API (無需 Key)
    try {
        const cryptoRes = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${JSON.stringify(CRYPTO_SYMBOLS)}`);
        const cryptoData = await cryptoRes.json();

        let html = '';
        cryptoData.forEach(item => {
            const isUp = parseFloat(item.priceChangePercent) >= 0;
            html += `
                <tr>
                    <td>${item.symbol.replace('USDT', '')}</td>
                    <td class="value">$${parseFloat(item.lastPrice).toLocaleString()}</td>
                    <td class="${isUp ? 'up' : 'down'}">${isUp ? '+' : ''}${item.priceChangePercent}%</td>
                </tr>`;
        });
        document.getElementById('crypto-body').innerHTML = html;
    } catch (e) { console.error("Crypto API Error", e); }

    // 2. ExchangeRate-API (匯率)
    // 註：這是一個公開免 Key 的 Demo 版本，生產環境建議申請免費 API Key
    try {
        const forexRes = await fetch(`https://open.er-api.com/v6/latest/${FOREX_BASE}`);
        const forexData = await forexRes.json();
        const targets = ['TWD', 'JPY', 'EUR'];

        let html = '';
        targets.forEach(t => {
            html += `
                <tr>
                    <td>${FOREX_BASE} / ${t}</td>
                    <td class="value">${forexData.rates[t].toFixed(2)}</td>
                </tr>`;
        });
        document.getElementById('forex-body').innerHTML = html;
    } catch (e) { console.error("Forex API Error", e); }
    await getMarketNews(); // 加入總經數據抓取
    await getEconomicCalendar(); // 加入總經數據抓取
    await getTaiwanStockData(); // 加入總經數據抓取
    await getTreasuryYield(); // 加入總經數據抓取
    // 更新時間
    document.getElementById('last-update').innerText = `Last Update: ${new Date().toLocaleTimeString()}`;
}

// 初始執行與自動輪詢 (每 30 秒更新一次)
updateDashboard();
setInterval(updateDashboard, 30000);