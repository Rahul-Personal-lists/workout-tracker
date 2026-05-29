// Minimal service worker — installable PWA criterion + cached shell.
// HTML is network-first: an online open always fetches the current deploy,
// so navigations never render stale shell HTML that references purged
// /_next/static chunk hashes (which would 404 and break client-side links).
// Cache is the offline fallback only. Hashed Next.js static assets are
// cache-first since their URLs are immutable.
//
// Auth paths (/login, /api/auth/*) bypass the SW entirely so cookies and
// redirects always reach the network. HTML responses are only cached when
// the final URL matches the request URL — prevents an unauthenticated
// fetch (which middleware redirects to /login) from poisoning a page's
// cache key with login HTML.
const VERSION = "v4";
const SHELL_CACHE = `shell-${VERSION}`;
const STATIC_CACHE = `static-${VERSION}`;
const SHELL_FILES = [
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

function sameUrlAs(res, req) {
  try {
    return new URL(res.url).pathname === new URL(req.url).pathname;
  } catch {
    return false;
  }
}

function networkFirst(req, cacheName) {
  return caches.open(cacheName).then((cache) =>
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && !res.redirected && sameUrlAs(res, req)) {
          cache.put(req, res.clone());
        }
        return res;
      })
      .catch(() => cache.match(req).then((cached) => cached || Response.error()))
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

  // Auth flows must hit the network so cookies/redirects aren't intercepted.
  if (url.pathname === "/login" || url.pathname.startsWith("/api/auth/")) return;

  if (req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirst(req, SHELL_CACHE));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
  }
});
