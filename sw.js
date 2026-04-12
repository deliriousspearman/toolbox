const CACHE_VERSION = "v1";
const CACHE_NAME = "tools-" + CACHE_VERSION;

const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/theme.css",
  "/style.css",
  "/images/favicon.svg",
  "/404.html",
  "/tools/process-wordle/",
  "/tools/process-wordle/index.html",
  "/tools/process-wordle/style.css",
  "/tools/process-wordle/app.js",
  "/tools/process-wordle/words.js",
  "/tools/cron-time/",
  "/tools/cron-time/index.html",
  "/tools/cron-time/style.css",
  "/tools/cron-time/app.js",
  "/tools/md-to-html/",
  "/tools/md-to-html/index.html",
  "/tools/md-to-html/style.css",
  "/tools/md-to-html/app.js",
  "/tools/shell-explain/",
  "/tools/shell-explain/index.html",
  "/tools/shell-explain/style.css",
  "/tools/shell-explain/app.js",
  "/tools/codename-gen/",
  "/tools/codename-gen/index.html",
  "/tools/codename-gen/style.css",
  "/tools/codename-gen/app.js",
  "/tools/codename-gen/wordlist.json",
  "/tools/word-of-the-day/",
  "/tools/word-of-the-day/index.html",
  "/tools/word-of-the-day/style.css",
  "/tools/word-of-the-day/app.js",
  "/tools/word-of-the-day/words.json",
];

// ── Install: precache all static assets ────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ──────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("tools-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: cache-first for static, network-first for API
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Let PHP API calls always go to network
  if (url.pathname.endsWith(".php")) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Serve from cache, update in background (stale-while-revalidate)
        event.waitUntil(
          fetch(event.request).then((response) => {
            if (response.ok) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, response);
              });
            }
          }).catch(() => {})
        );
        return cached;
      }

      // Not in cache: fetch from network, cache the result
      return fetch(event.request).then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
