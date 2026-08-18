'use strict';
/* ==========================================================================================
   SERVICE WORKER — Vegas Strip Blackjack
   ------------------------------------------------------------------------------------------
   Every file the game needs to run is precached on install. The main HTML shell is served
   stale-while-revalidate (instant from cache, refreshed from the network in the background)
   so an already-installed player gets the CURRENT cached version immediately but the cache is
   updated for next time without ever blocking on the network; icons/manifest rarely change,
   so they stay cache-first for max offline speed. Bump CACHE_NAME whenever a precached file
   changes — the old cache is deleted on activate so stale versions don't pile up.

   All paths here are relative to this file's own location (no leading "/"), so this works
   correctly whether the site is hosted at a domain root or under a sub-path, as on GitHub
   Pages (e.g. https://user.github.io/repo-name/) or a Netlify preview URL.
   ========================================================================================== */
const CACHE_NAME = 'blackjack-cache-v2';

const PRECACHE_URLS = [
  './blackjack.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png'
];

// The main app shell — served stale-while-revalidate below, never plain cache-first, so a
// newer deploy is picked up on the NEXT load instead of persisting forever.
const NAV_URLS = ['./blackjack.html', './index.html'];
function isNavRequest(request){
  if (request.mode === 'navigate') return true;
  const path = new URL(request.url).pathname;
  return NAV_URLS.some((u) => path.endsWith(u.replace('./', '/')));
}

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

// Lets the page ask a waiting worker to activate immediately (see the
// 'updatefound' handling in blackjack.html) instead of only activating once
// every open tab/instance running the OLD worker has fully closed.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// Cache-first for a given request: exact match wins, then a search-agnostic
// match, then the network (opportunistically caching whatever it returns).
async function cacheFirst(request){
  let cached = await caches.match(request);
  if (cached) return cached;

  // A request that differs only by query string (e.g. a bookmarked link
  // with tracking params, or a cache-busting "?v=") shouldn't fall through
  // to the network just because of that — match ignoring search.
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
    return offlineFallback(request);
  }
}

// Stale-while-revalidate for the main HTML shell: return the cached copy
// immediately (if any) without waiting on the network, but always kick off
// a background fetch that updates the cache — so the version served THIS
// time may be a load behind, but the NEXT load already has the latest.
async function staleWhileRevalidate(request){
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });

  const revalidate = fetch(request).then((response) => {
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  if (cached) {
    // Don't await it — let the refresh happen in the background so the
    // cached response returns instantly.
    revalidate;
    return cached;
  }
  // Nothing cached yet (very first load) — the network response IS the
  // only thing we can serve, so this one has to wait on it.
  const fresh = await revalidate;
  if (fresh) return fresh;
  return offlineFallback(request);
}

async function offlineFallback(request){
  // Truly offline and nothing matched above. For a page navigation, fall
  // back to the precached app shell so the game still opens even if, say,
  // it was launched with an unfamiliar query string; for any other
  // resource there's genuinely nothing left to serve, so return an
  // explicit Response rather than letting the promise reject (which would
  // surface as an uncaught "Failed to convert value to Response").
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

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return; // only GETs are cacheable

  event.respondWith(
    isNavRequest(request) ? staleWhileRevalidate(request) : cacheFirst(request)
  );
});
