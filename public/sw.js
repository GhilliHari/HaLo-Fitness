const CACHE_NAME = 'halo-fitness-v20';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js?v=20',
  '/js/data.js?v=20',
  '/js/translations.js?v=20',
  '/js/muscleMap.js?v=20',
  '/js/foodParser.js?v=20',
  '/js/tracker.js?v=20',
  '/js/pedometer.js?v=20',
  '/js/connectedServices.js?v=20'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request)
      .then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, responseToCache);
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
