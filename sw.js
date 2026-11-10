// Offline support. The whole app is small, so everything is precached on install.
// Our own files are network-first: online you always get the latest version,
// offline you get the cached copy. Fonts are cache-first (they never change).
const VERSION = 'v17';
const CACHE = `garuda-dict-${VERSION}`;
const ASSETS = [
  './', 'index.html', 'css/style.css', 'js/app.js', 'js/search.js', 'js/indic.js', 'js/card.js',
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

  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(async () => (await caches.match(req, { ignoreSearch: true }))
        ?? (req.mode === 'navigate' ? caches.match('index.html') : undefined)),
    );
    return;
  }

  if (url.host.endsWith('fonts.googleapis.com') || url.host.endsWith('fonts.gstatic.com')) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })),
    );
  }
});
