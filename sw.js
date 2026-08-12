'use strict';
/* ==========================================================================================
   SERVICE WORKER — Vegas Strip Blackjack
   ------------------------------------------------------------------------------------------
   Cache-first offline support: every file the game needs to run is precached on install, and
   every GET request is served from that cache first (falling back to the network only for
   anything not precached, e.g. during development). Bump CACHE_NAME whenever a precached file
   changes so clients pick up the new version instead of serving stale content forever.

   All paths here are relative to this file's own location (no leading "/"), so this works
   correctly whether the site is hosted at a domain root or under a sub-path, as on GitHub
   Pages (e.g. https://user.github.io/repo-name/) or a Netlify preview URL.
   ========================================================================================== */
const CACHE_NAME = 'blackjack-cache-v1';

const PRECACHE_URLS = [
  './blackjack.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return; // only GETs are cacheable

  event.respondWith((async () => {
    // Cache-first: exact match (URL + query string) wins immediately.
    let cached = await caches.match(request);
    if (cached) return cached;

    // A request that differs only by query string (e.g. a bookmarked link
    // with tracking params, or a cache-busting "?v=") shouldn't fall
    // through to the network just because of that — match ignoring search.
    cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;

    try {
      const response = await fetch(request);
      // Opportunistically cache any other same-origin file the game fetches
      // (e.g. if new assets are added later), so it's covered offline next
      // time too. Cross-origin / non-OK responses are passed through as-is.
      if (response && response.ok && response.type === 'basic'){
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
    } catch (err){
      // Truly offline and nothing matched above. For a page navigation,
      // fall back to the precached app shell so the game still opens even
      // if, say, it was launched with an unfamiliar query string; for any
      // other resource there's genuinely nothing left to serve, so return
      // an explicit Response rather than letting the promise reject (which
      // would surface as an uncaught "Failed to convert value to Response").
      if (request.mode === 'navigate'){
        const shell = await caches.match('./blackjack.html');
        if (shell) return shell;
      }
      return new Response('Offline and this resource was not cached.', {
        status: 503,
        statusText: 'Offline',
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  })());
});
