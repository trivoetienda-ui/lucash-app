const CACHE_NAME = 'lucash-v7';
const ASSETS = [
    './index.html',
    './style.css',
    './app.js',
    './financial-logic.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// Install: Cache essential assets with graceful failure
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

// Fetch: Network-First with Cache Fallback (Safer for production)
self.addEventListener('fetch', event => {
    // Skip external requests (CDNs, Supabase) - Let browser handle them normally
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        fetch(event.request)
            .then(response => {
                const resClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, resClone);
                });
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
