// ScamShield AI Service Worker — offline app shell, network-only API
const CACHE = 'scamshield-v3';
const SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/theme.js',
  '/i18n.js',
  '/toast.js',
  '/modal.js',
  '/intro.js',
  '/settings.js',
  '/protection.js',
  '/lib/ai/threat-engine.js',
  '/lib/sentinel/sentinel-engine.js',
  '/lang-packs.js',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Never cache the analysis API — verdicts must always be fresh
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;

  // Cross-origin assets (fonts, OCR/QR CDNs) pass straight through to the browser cache
  if (url.origin !== location.origin) return;

  // Network-first with cache fallback: fresh content when online, full shell when offline
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        if (resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return resp;
      })
      .catch(() =>
        caches.match(e.request, { ignoreSearch: true }).then((cached) => cached || caches.match('/index.html'))
      )
  );
});
