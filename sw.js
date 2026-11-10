// Offline support: the whole dictionary is ~20 KB, so we precache everything.
const VERSION = 'v1';
const CACHE = `garuda-dict-${VERSION}`;
const ASSETS = [
  './', 'index.html', 'css/style.css', 'js/app.js', 'js/search.js', 'js/indic.js',
  'data/entries.json', 'manifest.webmanifest', 'icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('garuda-dict-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Dictionary data: network first so new words arrive, cache when offline.
  if (url.origin === location.origin && url.pathname.endsWith('/data/entries.json')) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req)),
    );
    return;
  }

  // App shell + Google Fonts: cache first, fill cache on first use.
  if (url.origin === location.origin || url.host.endsWith('fonts.googleapis.com') || url.host.endsWith('fonts.gstatic.com')) {
    e.respondWith(
      caches.match(req, { ignoreSearch: url.origin === location.origin }).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok || res.type === 'opaque') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => (req.mode === 'navigate' ? caches.match('index.html') : undefined))),
    );
  }
});
