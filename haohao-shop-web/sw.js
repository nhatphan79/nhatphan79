// HaoHao Store app – lưu tạm để mở nhanh và xem được khi mạng yếu (20/10/2026)
const C = 'hh-app-v1';
const SHELL = ['/app', '/shop/logo.webp', '/shop/icon-192.png', '/shop/ngach-thoi-trang.webp', '/shop/ngach-me-be.webp', '/shop/ngach-gia-dung.webp', '/shop/ngach-xay-dung.webp', '/shop/ngach-qua-tang.webp'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  if (u.pathname === '/app' || u.pathname === '/store') {   // mạng trước, mất mạng thì dùng bản đã lưu
    e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
  } else if (/^\/shop\/.+\.(webp|png|svg|jpg)$/.test(u.pathname)) {   // chỉ lưu ảnh
    e.respondWith(caches.match(e.request).then(m => m || fetch(e.request)));
  }
});
