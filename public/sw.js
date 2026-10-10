// SERVICE WORKER — yalnızca Web Push bildirimleri (önbellek yok; site her zaman ağdan gelir).
// Sunucu (api/_lib/push.js) şifreli JSON yollar: {baslik, metin, url, etiket}.
// Ayrıntı: docs/sohbet.md → "Push bildirimleri".

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let y = {};
  try { y = e.data ? e.data.json() : {}; } catch (_) { y = { metin: e.data && e.data.text() }; }
  e.waitUntil((async () => {
    // Sayfa zaten açık ve görünürse bildirim gösterme: sayfa kendi rozetini/bildirimini gösterir
    const pencereler = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (pencereler.some((c) => c.visibilityState === 'visible')) return;
    await self.registration.showNotification(y.baslik || 'Abdurrahman Oğulları', {
      body: y.metin || '',
      tag: y.etiket || 'soyevrenim',        // aynı etiket: yeni mesaj eskisinin yerine geçer
      renotify: true,
      icon: '/simge-192.png',
      badge: '/simge-192.png',
      data: { url: y.url || '/' },
    });
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const hedef = new URL((e.notification.data && e.notification.data.url) || '/', self.location.origin).href;
  e.waitUntil((async () => {
    const pencereler = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of pencereler) {
      if (new URL(c.url).origin === self.location.origin) { await c.focus(); c.postMessage({ tur: 'sohbet-ac' }); return; }
    }
    await self.clients.openWindow(hedef);
  })());
});
