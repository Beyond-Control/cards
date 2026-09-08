// Service worker: l'app deve aprirsi anche senza rete, perché il momento
// in cui serve è la cassa del supermercato, dove il telefono non prende.

const VERSION = 'tessere-v5';
const SHELL = [
  './',
  'index.html',
  'app.css',
  'app.js',
  'store.js',
  'codes.js',
  'catalog.js',
  'manifest.webmanifest',
  'vendor/bwip-js.min.js',
  'vendor/zxing.min.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // I font di Google: prima la cache, poi la rete. Senza rete si usa
  // il ripiego di sistema, che è previsto dal foglio di stile.
  if (url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com')) {
    e.respondWith(
      caches.match(req).then((hit) =>
        hit || fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        }).catch(() => hit)
      )
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Navigazioni: cache dell'index, così l'app parte offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match('index.html').then((hit) => hit || fetch(req))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((hit) =>
      hit || fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
    )
  );
});
