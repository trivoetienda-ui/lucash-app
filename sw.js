const CACHE_NAME = 'lucash-v12';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './financial-logic.js',
    './services/database-service.js',
    './services/auth-service.js',
    './ui/render-service.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    './LuCash.png'
];

const EXTERNAL_CDNS = [
    'https://cdn.jsdelivr.net',
    'https://cdnjs.cloudflare.com',
    'https://unpkg.com',
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com'
];

// Install: Cache essential assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return Promise.allSettled(ASSETS.map(url => {
                return cache.add(url).catch(err => console.error('Failed to cache:', url, err));
            }));
        })
    );
    self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch Strategy
self.addEventListener('fetch', event => {
    const url = event.request.url;
    const isExternal = EXTERNAL_CDNS.some(cdn => url.startsWith(cdn));
    const isInternal = url.startsWith(self.location.origin);

    if (!isInternal && !isExternal) return;

    // Supabase API requests should NEVER be cached here
    if (url.includes('.supabase.co')) return;

    event.respondWith(
        caches.match(event.request).then(response => {
            if (response && isExternal) return response; // Cache-First for CDNs

            return fetch(event.request).then(networkResponse => {
                if (!networkResponse || networkResponse.status !== 200) return networkResponse;

                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseClone);
                });
                return networkResponse;
            }).catch(() => response); // Fallback to cache if offline
        })
    );
});
