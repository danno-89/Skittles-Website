const CACHE_NAME = 'skittles-app-cache-v9';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/main-page.css',
  '/SSC%20Logo.png',
  '/header.html',
  '/navigation.html',
  '/footer.html',
  '/main.js',
  '/auth-manager.js',
  '/firebase.config.js',
  '/countdown.js',
  '/countdown.css'
];

// Install Event: Cache essential files
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching all vital assets');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch Event: Stale-while-revalidate strategy
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip cross-origin requests, like Firebase auth/firestore calls unless they are static assets we cached
  if (!event.request.url.startsWith(self.location.origin) && !event.request.url.includes("gstatic")) {
     return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return cached response immediately if available
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // Update cache with new response
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(error => {
            console.warn('[Service Worker] Fetch failed, returning offline text/html or generic error:', error);
            // We must return a Response object to avoid "TypeError: Failed to convert value to 'Response'"
            return new Response('Offline or Network Error', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({ 'Content-Type': 'text/plain' })
            });
        });

        // Resolve with cached response if found, otherwise wait for network fetch
        return cachedResponse || fetchPromise;
      })
  );
});

// Activate Event: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});
