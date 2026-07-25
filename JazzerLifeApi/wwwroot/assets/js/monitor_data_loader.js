// 配置要監控的標的
const CRYPTO_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
const FOREX_BASE = 'USD';
const WORKER_URL = 'https://fred-proxy.wryi636.workers.dev'; // 替換成你的 Worker 網址
const FINNHUB_KEY = 'd80blmpr01qq9ln39ep0d80blmpr01qq9ln39epg'; // 去 Finnhub 官網秒申請
const FINMIND_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoid3J5aTYzNiIsImVtYWlsIjoid3J5aTYzNkBnbWFpbC5jb20iLCJ0b2tlbl92ZXJzaW9uIjowfQ.OZOEYR2QT8qaRHjiPKUgB-t5rQmcLis-TeXSgSYg-xI';

const METRICS = [
    { id: 'nfp', cat: 'employment', name: '非農就業', unit: 'K', value: -1, prev: 303, spark: genSpark(175, 30, 0.02), status: 'warn', desc: '美國每月新增非農業就業人數（千人）', src: 'FRED: PAYEMS' },
    { id: 'unemp', cat: 'employment', name: '失業率', unit: '%', value: -1, prev: 3.8, spark: genSpark(3.9, 30, 0.005), status: 'warn', desc: '美國失業率', src: 'FRED: UNRATE' },
    { id: 'claims', cat: 'employment', name: '初領失業金', unit: 'K', value: -1, prev: 228, spark: genSpark(231, 30, 0.01), status: 'normal', desc: '每週初次申請失業救濟金人數', src: 'FRED: ICSA' },
    { id: 'cpi', cat: 'inflation', name: 'CPI (YoY)', unit: '%', value: -1, prev: 3.2, spark: genSpark(3.5, 30, 0.008), status: 'danger', desc: '消費者物價指數年增率', src: 'FRED: CPIAUCSL' },
    { id: 'corecpi', cat: 'inflation', name: 'Core CPI (YoY)', unit: '%', value: -1, prev: 3.8, spark: genSpark(3.8, 30, 0.005), status: 'danger', desc: '排除食品與能源的核心CPI', src: 'FRED: CPILFESL' },
    { id: 'ppi', cat: 'inflation', name: 'PPI (YoY)', unit: '%', value: -1, prev: 1.6, spark: genSpark(2.2, 30, 0.01), status: 'warn', desc: '生產者物價指數年增率', src: 'FRED: PPIACO' },
    { id: 'pce', cat: 'inflation', name: 'PCE (YoY)', unit: '%', value: -1, prev: 2.5, spark: genSpark(2.7, 30, 0.006), status: 'warn', desc: '個人消費支出物價指數（Fed 偏好指標）', src: 'FRED: PCEPI' },
    { id: 'ffr', cat: 'rates', name: 'Fed Funds Rate', unit: '%', value: -1, prev: 5.33, spark: genSpark(5.33, 30, 0.001), status: 'danger', desc: '聯邦基金利率', src: 'FRED: FEDFUNDS' },
    { id: 'us2y', cat: 'rates', name: 'US 2Y 殖利率', unit: '%', value: -1, prev: 4.71, spark: genSpark(4.83, 30, 0.008), status: 'warn', desc: '美國 2 年期公債殖利率', src: 'FRED: DGS2' },
    { id: 'us10y', cat: 'rates', name: 'US 10Y 殖利率', unit: '%', value: -1, prev: 4.52, spark: genSpark(4.65, 30, 0.008), status: 'warn', desc: '美國 10 年期公債殖利率', src: 'FRED: DGS10' },
    { id: 'us30y', cat: 'rates', name: 'US 30Y 殖利率', unit: '%', value: -1, prev: 4.65, spark: genSpark(4.78, 30, 0.006), status: 'normal', desc: '美國 30 年期公債殖利率', src: 'FRED: DGS30' },
    { id: 'gdp', cat: 'economy', name: 'GDP (QoQ)', unit: '%', value: -1, prev: 3.4, spark: genSpark(1.6, 30, 0.02), status: 'warn', desc: '美國實質 GDP 季增年率', src: 'FRED: GDP' },
    { id: 'pmimfg', cat: 'economy', name: 'PMI 製造業', unit: '', value: -1, prev: 50.3, spark: genSpark(49.2, 30, 0.008), status: 'danger', desc: 'ISM 製造業採購經理人指數（50 為榮枯線）', src: 'Yahoo Finance' },
    { id: 'pmisvc', cat: 'economy', name: 'PMI 服務業', unit: '', value: -1, prev: 51.7, spark: genSpark(51.3, 30, 0.006), status: 'normal', desc: 'ISM 服務業採購經理人指數', src: 'Yahoo Finance' },
    { id: 'vix', cat: 'sentiment', name: 'VIX 恐慌指數', unit: '', value: -1, prev: 13.2, spark: genSpark(15.8, 30, 0.025), status: 'warn', desc: 'CBOE 波動率指數，衡量市場恐慌程度', src: 'Yahoo Finance' },
    { id: 'wti', cat: 'commodity', name: 'WTI 原油', unit: '$', value: -1, prev: 83.1, spark: genSpark(78.2, 30, 0.012), status: 'normal', desc: '西德州中級原油期貨價格', src: 'Yahoo Finance' },
    { id: 'gold', cat: 'commodity', name: '黃金', unit: '$', value: -1, prev: 2286, spark: genSpark(2338, 30, 0.006), status: 'success', desc: '黃金現貨價格 (USD/oz)', src: 'Yahoo Finance' },
    { id: 'copper', cat: 'commodity', name: '銅', unit: '$', value: -1, prev: 4.35, spark: genSpark(4.62, 30, 0.01), status: 'success', desc: '銅期貨價格 (USD/lb)', src: 'Yahoo Finance' },
    { id: 'dxy', cat: 'fx', name: '美元指數 DXY', unit: '', value: -1, prev: 104.5, spark: genSpark(105.3, 30, 0.004), status: 'warn', desc: '美元對一籃子貨幣的加權指數', src: 'Yahoo Finance' },
    { id: 'usdtwd', cat: 'fx', name: 'USD/TWD', unit: '', value: -1, prev: 32.10, spark: genSpark(32.45, 30, 0.004), status: 'warn', desc: '美金兌台幣匯率', src: 'Yahoo Finance' },
    { id: 'taiex', cat: 'equity', name: '台股加權指數', unit: '', value: -1, prev: 20310, spark: genSpark(20815, 30, 0.008), status: 'success', desc: '台灣加權股價指數', src: 'Yahoo Finance' },
    { id: 'spx', cat: 'equity', name: 'S&P 500', unit: '', value: -1, prev: 5128, spark: genSpark(5222, 30, 0.006), status: 'success', desc: '標普 500 指數', src: 'Yahoo Finance' },
    { id: 'nasdaq', cat: 'equity', name: 'NASDAQ', unit: '', value: -1, prev: 16156, spark: genSpark(16388, 30, 0.008), status: 'success', desc: '那斯達克綜合指數', src: 'Yahoo Finance' },
    { id: 'sox', cat: 'equity', name: '費半 SOX', unit: '', value: -1, prev: 4760, spark: genSpark(4918, 30, 0.01), status: 'success', desc: '費城半導體指數', src: 'Yahoo Finance' },
];

function genSpark(base, n = 30, vol = 0.01) {
    const a = []; let v = base * (1 - vol * n / 2);
    for (let i = 0; i < n; i++) { v += base * vol * (Math.random() - .45); a.push(+v.toFixed(v >= 100 ? 0 : 2)) }
    a[n - 1] = base; return a;
}
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
        // console.log(highImpactUS);

        // let html = '';
        // highImpactUS.forEach(event => {
        //     html += `
        //         <div class="stat-item" style="border-bottom: 1px solid #444; padding: 10px 0;">
        //             <div style="font-size: 0.8em; color: #888;">${event.time}</div>
        //             <div style="display: flex; justify-content: space-between;">
        //                 <span>${event.event}</span>
        //                 <span class="value" style="color: var(--accent-color);">
        //                     Act: ${event.actual || '--'} / Est: ${event.estimate || '--'}
        //                 </span>
        //             </div>
        //         </div>`;
        // });
        // document.getElementById('calendar-body').innerHTML = html;
        return highImpactUS
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

        // let html = '';
        // // 僅顯示前 5 則最重要的
        // news.slice(0, 5).forEach(item => {
        //     html += `
        //         <div class="news-item" style="margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px;">
        //         <a href="${item.url}" target="_blank" style="color: var(--accent-color); font-weight: bold;">${item.source}</a>    
        //         <small style="color: var(--accent-color);">${new Date(item.datetime * 1000).toLocaleTimeString()}</small>
        //             <div style="font-size: 0.9em;">${item.headline}</div>
        //         </div>`;
        // });
        // document.getElementById('news-body').innerHTML = html;

        return news
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
const FRED_MAPPING = {
    'nfp': 'PAYEMS',
    'unemp': 'UNRATE',
    'cpi': 'CPIAUCSL',
    'ffr': 'FEDFUNDS'
};
var me = []

/**
 * 從 Flask Server 更新 METRICS 數據
 */
function updateMetricsFromFlask() {
    const FLASK_URL_FRED = "http://jzshome.ddns.net:5000/api/fred/";
    const FLASK_URL_YAHOO = "http://jzshome.ddns.net:5000/api/history/";

    // 使用 $.map 處理異步請求陣列
    const requests = METRICS.filter(m => m.src && (m.src.includes('FRED:') || m.src.includes('Yahoo Finance')))
        .map(metric => {
            if (metric.src.includes('Yahoo Finance')) {
                var symbol = metric.id;
                if (symbol === 'vix') symbol = '^VIX';
                if (symbol === 'dxy') symbol = 'DX-Y.NYB';
                if (symbol === 'usdtwd') symbol = 'USDTWD=X';
                if (symbol === 'spx') symbol = '^GSPC';
                if (symbol === 'nasdaq') symbol = '^IXIC';
                if (symbol === 'sox') symbol = '^SOX';
                if (symbol === 'copper') symbol = 'HG=F';
                if (symbol === 'taiex') symbol = '^TWII';
                if (symbol === 'gold') symbol = 'GC=F';
                if (symbol === 'copper') symbol = 'HG=F';
                if (symbol === 'pmimfg') symbol = 'CNM';
                if (symbol === 'pmisvc') symbol = 'CNS';

                return $.getJSON(`${FLASK_URL_YAHOO}${symbol}`)
                    .done(data => {
                        data = data.data
                        if (data && data.length >= 2) {

                            const latest = data[data.length - 1];
                            const prev = data[data.length - 2];
                            if (latest.Close !== undefined && prev.Close !== undefined) {
                                metric.value = parseFloat(latest.Close);
                                metric.prev = parseFloat(prev.Close);
                                if (typeof genSpark === 'function') {
                                    metric.spark = data.map(x => x.Close);
                                }
                            }

                        }
                    })
            } else if (metric.src.includes('FRED:')) {
                const seriesId = metric.src.split('FRED: ')[1];
                return $.getJSON(`${FLASK_URL_FRED}${seriesId}`)
                    .done(data => {
                        if (data.observations && data.observations.length >= 2) {
                            // console.log(data);

                            const [latest, prev] = data.observations;

                            if (latest.value !== "." && prev.value !== ".") {
                                metric.value = parseFloat(latest.value);
                                metric.prev = parseFloat(prev.value);

                                if (typeof genSpark === 'function') {
                                    metric.spark = data.observations.map(x => x.value);
                                }

                                // renderMetrics();
                            }
                        }
                    })
                    .fail(err => console.error(`Failed: ${metric.name}`, err));
            }


        });

    $.when(...requests).done(() => {
        renderMetrics();
        renderKpiRow();
        var kondratievAnalysis = autoAnalyzeKondratievWithRisk(METRICS);
        renderMarcoRegime(kondratievAnalysis);
        renderRiskScore(kondratievAnalysis);
        var macroRegimeAnalysis = calculateMacroRegimeWithVix(METRICS);
        console.log(macroRegimeAnalysis);
        console.log("Dashboard Refresh Complete.");
        if (typeof renderDashboard === 'function') renderDashboard();
    });
}
function renderMarcoRegime(kondratievAnalysis) {
    const regimeText = document.getElementById('regimeText');
    const regimeDesc = document.getElementById('regimeDesc');
    if (regimeText) {
        regimeText.innerText = kondratievAnalysis.macroRegime;
    }
    if (regimeDesc) {
        regimeDesc.innerText = kondratievAnalysis.analysis;
    }
}
function renderMarcoRegime(kondratievAnalysis) {
    const regimeText = document.getElementById('regimeText');
    const regimeDesc = document.getElementById('regimeDesc');
    if (regimeText) {
        regimeText.innerText = kondratievAnalysis.macroRegime;
    }
    if (regimeDesc) {
        regimeDesc.innerText = kondratievAnalysis.thermometer.advice;
    }
}
function renderRiskScore(kondratievAnalysis) {
    const riskScore = document.getElementById('riskScore');
    const thermoBar = document.getElementById('thermoBar');
    const score = kondratievAnalysis.thermometer.riskScore;
    if (thermoBar) {
        thermoBar.style.width = `${score}%`;
    }
    if (riskScore) {
        riskScore.innerText = score;
    }
}