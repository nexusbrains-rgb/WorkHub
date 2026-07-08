/**
 * WorkHub Service Worker
 * - HTMLはネットワーク優先（更新をすぐ反映）、圏外時はキャッシュで起動
 * - アイコン等の静的ファイルはキャッシュ優先
 * - GAS（script.google.com）への通信には一切関与しない
 */
const CACHE = "workhub-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./answer.html",
  "./favicon.png",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png",
  "./manifest.webmanifest"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // GAS等の外部通信はそのまま

  // HTML・ナビゲーションはネットワーク優先（失敗時のみキャッシュ）
  if (e.request.mode === "navigate" || url.pathname.endsWith(".html")) {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          const cp = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, cp));
          return r;
        })
        .catch(() => caches.match(e.request).then(m => m || caches.match("./index.html")))
    );
    return;
  }

  // アイコン・マニフェスト等はキャッシュ優先
  e.respondWith(
    caches.match(e.request).then(m => m || fetch(e.request).then(r => {
      const cp = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, cp));
      return r;
    }))
  );
});
