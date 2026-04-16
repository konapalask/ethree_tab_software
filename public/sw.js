// Service Worker for E3 POS PWA
const CACHE_NAME = 'e3-pos-v1';

self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activated');
});

self.addEventListener('fetch', (event) => {
    // Basic fetch listener required for PWA installability
    event.respondWith(fetch(event.request).catch(() => {
        return new Response('Offline');
    }));
});
