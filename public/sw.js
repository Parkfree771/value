// Service Worker placeholder
// This file prevents 404 errors from browser requests
// You can implement PWA features here in the future if needed

self.addEventListener('install', (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim clients to start controlling pages immediately
  event.waitUntil(self.clients.claim());
});

// Basic fetch handler - just pass through requests
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
