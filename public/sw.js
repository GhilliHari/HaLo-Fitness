const CACHE_NAME = 'halo-fitness-v22';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css?v=2',
  '/js/app.js?v=22',
  '/js/data.js?v=22',
  '/js/translations.js?v=22',
  '/js/muscleMap.js?v=22',
  '/js/foodParser.js?v=22',
  '/js/tracker.js?v=22',
  '/js/pedometer.js?v=22',
  '/js/connectedServices.js?v=22'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).catch(() => {})
  );
});

self.addEventListener('fetch', e => {
  // Never intercept non-GET requests (POST/PUT/DELETE) or live API calls
  if (e.request.method !== 'GET' || e.request.url.includes('/api/')) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, responseToCache).catch(() => {});
          });
        }
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});
