// const CACHE_NAME = "ledger-cache-v1";
// const urlsToCache = [
//   "/",
//   "/index.html",
//   "/style.css",
//   "/script.js",
//   "/manifest.json",
//   "/logo.png",
//   "/utilitys.js",
//   "/docs.html"
//   // Add other assets here (images, fonts, etc.)
// ];

// self.addEventListener("install", (event) => {
//   event.waitUntil(
//     caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
//   );
// });

// self.addEventListener("fetch", (event) => {
//   event.respondWith(
//     caches.match(event.request).then((response) =>
//       response ? response : fetch(event.request)
//     )
//   );
// });


