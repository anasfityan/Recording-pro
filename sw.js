/* SpeakPro SW v8 — force fresh cache every update */
const CACHE = 'speakpro-v8';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.svg', './icon-512.svg'];

self.addEventListener('install', e => {
  // Force immediate activation — don't wait for old tabs to close
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {})
  );
});

self.addEventListener('activate', e => {
  // Delete ALL old caches immediately
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => {
        console.log('[SW] Deleting old cache:', k);
        return caches.delete(k);
      }))
    ).then(() => self.clients.claim())  // Take control of all open tabs
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  
  // For HTML: always try network first, fall back to cache
  if (e.request.url.includes('index.html') || e.request.url.endsWith('/')) {
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return resp;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  
  // For other assets: cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
