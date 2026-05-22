// Minimal service worker — installable PWA criterion + cached shell.
// SWR for HTML so repeat opens render from cache while a background fetch
// refreshes the entry for next time. Hashed Next.js static assets are
// cache-first since their URLs are immutable.
const VERSION = "v2";
const SHELL_CACHE = `shell-${VERSION}`;
const STATIC_CACHE = `static-${VERSION}`;
const SHELL_FILES = [
  "/today",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(SHELL_FILES).catch(() => {})
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(
            (k) =>
              (k.startsWith("shell-") || k.startsWith("static-")) &&
              k !== SHELL_CACHE &&
              k !== STATIC_CACHE,
          )
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

function staleWhileRevalidate(event, req, cacheName, offlineFallback) {
  return caches.open(cacheName).then((cache) =>
    cache.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((res) => {
        if (res && res.status === 200) {
          cache.put(req, res.clone());
        }
        return res;
      });
      if (cached) {
        // Keep the SW alive until the background refresh finishes so the
        // next navigation hits a fresh cache entry.
        event.waitUntil(fetchPromise.catch(() => {}));
        return cached;
      }
      return fetchPromise.catch(() =>
        offlineFallback ? caches.match(offlineFallback) : Response.error()
      );
    })
  );
}

function cacheFirst(req, cacheName) {
  return caches.open(cacheName).then((cache) =>
    cache.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200) {
          cache.put(req, res.clone());
        }
        return res;
      });
    })
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(staleWhileRevalidate(event, req, SHELL_CACHE, "/today"));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
  }
});
