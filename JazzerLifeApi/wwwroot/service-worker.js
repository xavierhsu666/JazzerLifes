/**
 * JazzerLife 共用 Service Worker（car / finance / macro 共用同一支，作用範圍為整個網站根目錄）
 *
 * 策略：「Network Falling Back to Cache」
 * - 只攔截同網域（same-origin）的 GET 請求，外部 CDN（jQuery/Highcharts/Bootstrap 等）一律放行不快取，
 *   避免版本或授權問題，也避免 install 階段因單一資源失敗而整個安裝失敗。
 * - /api/ 開頭的請求一律直接打網路、絕不快取，避免離線時看到過期的財務/總經資料造成誤判。
 * - 其餘同網域請求（HTML/CSS/JS/圖片）：先嘗試打網路拿最新版本，成功則同時寫回快取；
 *   若離線或網路失敗，才退而使用快取內容，讓頁面離線時至少還能開啟（不保證資料最新）。
 *
 * 更新快取版本：修改 CACHE_VERSION 即可讓舊快取在 activate 階段被清除，強迫使用者拿到新版靜態檔案。
 */

const CACHE_VERSION = "v1";
const CACHE_NAME = `jazzerlife-shell-${CACHE_VERSION}`;

self.addEventListener("install", (event) => {
    // 不做強制 precache 清單（car/finance 頁面外部相依複雜，precache 任一資源失敗會導致整個安裝失敗），
    // 改採 fetch 時動態寫入快取，第一次造訪即開始累積離線可用內容。
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key.startsWith("jazzerlife-shell-") && key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const request = event.request;

    // 只處理同網域的 GET 請求，其餘（POST/PUT/DELETE、外部 CDN）一律放行不攔截
    if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
        return;
    }

    const url = new URL(request.url);

    // API 資料一律走網路，不快取、不做離線回退，避免顯示過期的財務/總經數字
    if (url.pathname.startsWith("/api/")) {
        return;
    }

    event.respondWith(
        fetch(request)
            .then((networkResponse) => {
                // 只快取成功的回應，且需 clone 一份（Response body 只能被讀取一次）
                if (networkResponse && networkResponse.ok) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                }
                return networkResponse;
            })
            .catch(() =>
                caches.match(request).then((cachedResponse) => {
                    return cachedResponse || Promise.reject("offline-and-not-cached");
                })
            )
    );
});
