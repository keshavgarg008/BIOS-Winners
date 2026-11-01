/* JeevanSetu service worker
 * - Pre-caches the app shell so every page opens with no internet
 * - Pages: network first (fresh when online), cached copy when offline
 * - Local CSS/JS/images: serve cached copy instantly, refresh in background
 * - Firebase SDK files from gstatic.com: cached after first load (versioned URLs)
 * - Firestore data itself is NOT handled here; the Firestore SDK keeps its own
 *   offline cache and queues writes (persistentLocalCache in each page).
 *
 * Bump VERSION whenever you change any page, so devices fetch the new files.
 */
const VERSION = "v3";
const SHELL_CACHE = "jeevansetu-shell-" + VERSION;
const RUNTIME_CACHE = "jeevansetu-runtime-" + VERSION;

// Edit this list to match your real file names.
const SHELL_FILES = [
  "./",
  "./index.html",
  "./offline.html",
  "./manifest.webmanifest",
  "./pwa.js",
  "./style.css",
  "./settings.js",
  "./store.js",
  "./app.js",
  "./schedule.js",
  "./healthworker.html",
  "./school.html",
  "./parent.html",
  "./doctor.html",
  "./update-vaccinations.html",
  "./class-performance.html",
  "./child-reports.html",
  "./doctor-notes.html",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

// Firebase SDK entry points used by the pages (cached so the app can start offline)
const FIREBASE_FILES = [
  "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js",
  "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js"
];

self.addEventListener("install", function (event) {
  event.waitUntil((async function () {
    const shell = await caches.open(SHELL_CACHE);
    // Add files one by one so a missing file does not break the whole install
    await Promise.all(SHELL_FILES.map(function (url) {
      return shell.add(new Request(url, { cache: "reload" })).catch(function (e) {
        console.warn("[sw] could not pre-cache", url, e && e.message);
      });
    }));
    const runtime = await caches.open(RUNTIME_CACHE);
    await Promise.all(FIREBASE_FILES.map(function (url) {
      return runtime.add(new Request(url, { mode: "cors" })).catch(function () {});
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", function (event) {
  event.waitUntil((async function () {
    const keep = [SHELL_CACHE, RUNTIME_CACHE];
    const names = await caches.keys();
    await Promise.all(names.filter(function (n) {
      return n.indexOf("jeevansetu-") === 0 && keep.indexOf(n) === -1;
    }).map(function (n) { return caches.delete(n); }));
    await self.clients.claim();
  })());
});

self.addEventListener("message", function (event) {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function timeout(ms) {
  return new Promise(function (_, reject) { setTimeout(function () { reject(new Error("timeout")); }, ms); });
}

// Pages: try the network briefly, otherwise use the cached copy
async function handleNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const fresh = await Promise.race([fetch(request), timeout(4000)]);
    if (fresh && fresh.ok) {
      cache.put(request, fresh.clone());
      return fresh;
    }
    throw new Error("bad response");
  } catch (e) {
    const cached = (await cache.match(request, { ignoreSearch: true })) ||
                   (await caches.match(request, { ignoreSearch: true }));
    if (cached) return cached;
    const offline = await cache.match("./offline.html");
    return offline || new Response("You are offline.", { status: 503, headers: { "Content-Type": "text/plain" } });
  }
}

// Static files: cached copy now, refresh in the background
async function staleWhileRevalidate(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });
  const network = fetch(request).then(function (res) {
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  }).catch(function () { return null; });
  return cached || (await network) || Response.error();
}

// Firebase SDK files: versioned URLs never change, so cache first
async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res && (res.ok || res.type === "opaque")) cache.put(request, res.clone());
  return res;
}

self.addEventListener("fetch", function (event) {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Firebase SDK scripts
  if (url.hostname === "www.gstatic.com" && url.pathname.indexOf("/firebasejs/") === 0) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Everything else on other origins (Firestore API, fonts, etc.): leave to the browser / SDK
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});