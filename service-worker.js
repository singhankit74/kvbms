// Service Worker for School Bus Meter Reading PWA
// Updated to use Network First strategy for better data freshness
const CACHE_NAME = 'school-bus-meter-v2'; // Increment version to force update
const STATIC_CACHE = 'static-v2';
const DYNAMIC_CACHE = 'dynamic-v2';

// Static assets that rarely change
const staticAssets = [
    '/',
    '/index.html',
    '/admin-dashboard.html',
    '/manager-dashboard.html',
    '/styles.css',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// Install event - cache static resources only
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing v2...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[Service Worker] Caching static assets');
                return cache.addAll(staticAssets);
            })
            .catch((error) => {
                console.error('[Service Worker] Cache failed:', error);
            })
    );
    self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating v2...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Delete old caches
                    if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim(); // Take control immediately
});

// Fetch event - Network First for JS/HTML, Cache First for static assets
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip Supabase API calls - always fetch fresh
    if (url.hostname.includes('supabase.co')) {
        return;
    }

    // Skip external resources
    if (!url.origin.includes(self.location.origin) &&
        !url.hostname.includes('googleapis.com') &&
        !url.hostname.includes('jsdelivr.net')) {
        return;
    }

    // Network First strategy for HTML and JS files (always get fresh data)
    if (request.url.endsWith('.html') ||
        request.url.endsWith('.js') ||
        request.url.includes('dashboard')) {

        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Clone and cache the fresh response
                    const responseClone = response.clone();
                    caches.open(DYNAMIC_CACHE).then((cache) => {
                        cache.put(request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // If network fails, try cache
                    return caches.match(request);
                })
        );
        return;
    }

    // Cache First strategy for static assets (CSS, images, fonts)
    if (request.url.endsWith('.css') ||
        request.url.endsWith('.png') ||
        request.url.endsWith('.jpg') ||
        request.url.endsWith('.svg') ||
        request.url.includes('/icons/')) {

        event.respondWith(
            caches.match(request)
                .then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    return fetch(request).then((response) => {
                        const responseClone = response.clone();
                        caches.open(STATIC_CACHE).then((cache) => {
                            cache.put(request, responseClone);
                        });
                        return response;
                    });
                })
        );
        return;
    }

    // Default: Network First for everything else
    event.respondWith(
        fetch(request)
            .then((response) => {
                return response;
            })
            .catch(() => {
                return caches.match(request);
            })
    );
});

// Message event - allow manual cache clearing
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => caches.delete(cacheName))
                );
            }).then(() => {
                console.log('[Service Worker] All caches cleared');
            })
        );
    }
});
