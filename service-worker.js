// Service Worker for School Bus Meter Reading PWA
const CACHE_NAME = 'school-bus-meter-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/admin-dashboard.html',
    '/manager-dashboard.html',
    '/styles.css',
    '/app.js',
    '/auth.js',
    '/utils.js',
    '/admin-dashboard.js',
    '/manager-dashboard.js',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching app shell');
                return cache.addAll(urlsToCache);
            })
            .catch((error) => {
                console.error('[Service Worker] Cache failed:', error);
            })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin) &&
        !event.request.url.includes('supabase.co') &&
        !event.request.url.includes('googleapis.com') &&
        !event.request.url.includes('jsdelivr.net') &&
        !event.request.url.includes('sheetjs.com')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                // Clone the request
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then((response) => {
                    // Check if valid response
                    if (!response || response.status !== 200 || response.type === 'error') {
                        return response;
                    }

                    // Clone the response
                    const responseToCache = response.clone();

                    // Cache the fetched response for future use
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            // Only cache GET requests
                            if (event.request.method === 'GET') {
                                cache.put(event.request, responseToCache);
                            }
                        });

                    return response;
                }).catch((error) => {
                    console.error('[Service Worker] Fetch failed:', error);

                    // Return offline page if available
                    return caches.match('/index.html');
                });
            })
    );
});

// Background sync for offline data submission (future enhancement)
self.addEventListener('sync', (event) => {
    console.log('[Service Worker] Background sync:', event.tag);

    if (event.tag === 'sync-meter-readings') {
        event.waitUntil(syncMeterReadings());
    }
});

async function syncMeterReadings() {
    // This would sync any offline-created meter readings
    // Implementation depends on your offline storage strategy
    console.log('[Service Worker] Syncing meter readings...');
}

// Push notification support (future enhancement)
self.addEventListener('push', (event) => {
    console.log('[Service Worker] Push received');

    const options = {
        body: event.data ? event.data.text() : 'New notification',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        }
    };

    event.waitUntil(
        self.registration.showNotification('School Bus Meter', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification clicked');
    event.notification.close();

    event.waitUntil(
        clients.openWindow('/')
    );
});
