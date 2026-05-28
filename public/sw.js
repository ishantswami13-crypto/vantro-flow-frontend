// Vantro Flow Service Worker - Offline Support + Cache Strategy
const CACHE_NAME = "vantro-v3";
const STATIC_ASSETS = ["/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(STATIC_ASSETS.map((asset) => cache.add(asset).catch(() => undefined)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== "GET" || url.protocol === "chrome-extension:") return;

  if (event.request.mode === "navigate" || event.request.destination === "document") {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response("You are offline. Please reconnect and refresh Vantro.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        })
      )
    );
    return;
  }

  if (url.hostname.includes("railway.app") || url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: "Offline" }), {
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    return;
  }

  if (url.hostname.includes("fonts.googleapis.com") || url.hostname.includes("fonts.gstatic.com")) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response.ok && event.request.destination !== "") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch((err) => {
          // If we fail to fetch a non-navigational asset, don't return index.html (caches.match("/"))
          // Return nothing or let the browser handle the failure.
          return undefined;
        });
    })
  );
});

self.addEventListener("push", (event) => {
  const payload = event.data?.json() || {};
  const { title, body, data = {} } = payload;

  let targetUrl = "/dashboard";
  if (data.type === "payment_received") targetUrl = "/collections";
  if (data.type === "morning_briefing") targetUrl = "/ai-chat";

  event.waitUntil(
    self.registration.showNotification(title || "Vantro Flow", {
      body: body || "You have a new update",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [200, 100, 200],
      tag: data.type || "general",
      renotify: data.type === "payment_received",
      data: { url: targetUrl, ...data },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((windowClient) => windowClient.url.includes(url));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
