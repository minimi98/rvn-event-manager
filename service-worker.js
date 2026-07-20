const CACHE = "rvn-v10-12-storelinks";
const CORE = [
  "./",
  "./index.html",
  "./css/style.css?v=10.12",
  "./js/app.js?v=10.12",
  "./js/views.js?v=10.12",
  "./js/state.js?v=10.12",
  "./js/utils.js?v=10.12",
  "./js/firebase.js?v=10.12",
  "./firebase-config.js?v=10.12",
  "./assets/logo.png",
  "./assets/logo.jpg",
  "./assets/beach-poster.png",
  "./strecken/strecken_kleine_runde.gpx",
  "./strecken/strecken_grosse_runde.gpx"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (!["http:", "https:"].includes(url.protocol)) return;
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy));
      }
      return response;
    }).catch(async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === "navigate") return caches.match("./index.html");
      return Response.error();
    })
  );
});
