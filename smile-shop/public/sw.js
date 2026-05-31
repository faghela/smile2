const CACHE_NAME = 'smile-shop-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/track.html',
  '/offline.html',
  '/css/style.css',
  '/css/admin.css',
  '/js/features/globals.js',
  '/js/features/ui.js',
  '/js/features/search.js',
  '/js/features/products.js',
  '/js/features/cart.js',
  '/js/features/checkout.js',
  '/js/features/wishlist.js',
  '/js/features/track.js',
  '/js/main.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/config.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Ignore API calls and non-GET requests
  if (e.request.url.includes('/api/') || e.request.method !== 'GET') {
    return;
  }

  // Network-First Strategy for HTML Navigation Requests
  const isHtmlRequest = e.request.mode === 'navigate' || 
                        e.request.url.endsWith('.html') || 
                        e.request.url === self.location.origin + '/';

  if (isHtmlRequest) {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(e.request).then((cachedResponse) => {
            return cachedResponse || caches.match('/offline.html');
          });
        })
    );
  } else {
    // Cache-First with Background Sync Strategy for Static Assets (stale-while-revalidate)
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Revalidate cache in background
          fetch(e.request).then((response) => {
            if (response.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(e.request, response));
            }
          }).catch(() => {/* Ignore background fetch errors */});
          
          return cachedResponse;
        }

        return fetch(e.request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return response;
        });
      })
    );
  }
});

