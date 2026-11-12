/* LCDPro service worker — scope is the folder it lives in (/lcdpro/). */
const CACHE = 'lcdpro-v1';
const CORE = [
  './',
  'index.html',
  'lcdpro.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'apple-touch-icon.png',
  'favicon-32.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.all(CORE.map(u => cache.add(new Request(u, { cache: 'reload' })).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('lcdpro-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(new URL('./', self.location).pathname)) return;

  const isPage = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  if (isPage) {
    // Network-first so updates show quickly; fall back to cache offline.
    event.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('index.html', copy)); }
        return res;
      }).catch(() => caches.match('index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // Everything else: cache-first, refresh in background.
  event.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req).then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
