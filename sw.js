const CACHE_NAME = 'pwa-playground-v3';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js?v=5',
  './manifest.json',
  './icons/icon.svg'
];

// Install: cache app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first, fallback to network
self.addEventListener('fetch', event => {
  // Skip non-GET and cross-origin requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Don't cache non-ok or opaque responses for CDN resources
        if (!response || response.status !== 200) return response;

        // Cache same-origin responses
        const url = new URL(event.request.url);
        if (url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }

        return response;
      }).catch(() => {
        // Offline fallback for navigation
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// Listen for messages from the app
self.addEventListener('message', event => {
  if (event.data === 'GET_CACHE_CONTENTS') {
    caches.open(CACHE_NAME).then(cache =>
      cache.keys().then(requests => {
        const urls = requests.map(r => r.url);
        event.ports[0].postMessage(urls);
      })
    );
  }

  if (event.data === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(success => {
      event.ports[0].postMessage(success);
    });
  }
});
