// Vantro Flow Service Worker — Offline Support + Cache Strategy
const CACHE_NAME = 'vantro-v2';
const STATIC_ASSETS = ['/', '/dashboard', '/manifest.json', '/icon-192.png', '/icon-512.png'];

// Install: cache static shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for assets
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Skip non-GET and chrome-extension
  if (e.request.method !== 'GET' || url.protocol === 'chrome-extension:') return;

  // API calls: network-first, no cache
  if (url.hostname.includes('railway.app') || url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request).catch(() => new Response(JSON.stringify({ error: 'Offline' }), { headers: { 'Content-Type': 'application/json' } })));
    return;
  }

  // Static assets: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('/'));
    })
  );
});

// Push notifications
self.addEventListener('push', e => {
  const payload = e.data?.json() || {};
  const { title, body, data = {} } = payload;

  // Determine destination URL based on notification type
  let targetUrl = '/dashboard';
  if (data.type === 'payment_received') targetUrl = '/collections';
  if (data.type === 'morning_briefing') targetUrl = '/ai-chat';

  e.waitUntil(
    self.registration.showNotification(title || 'Vantro Flow', {
      body: body || 'You have a new update',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      tag: data.type || 'general',       // replaces old notif of same type
      renotify: data.type === 'payment_received', // payment alerts always ring
      data: { url: targetUrl, ...data },
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/dashboard';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
      // Focus existing window if open, else open new
      const existing = wins.find(w => w.url.includes(url));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
