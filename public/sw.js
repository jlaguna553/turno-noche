/**
 * Service worker de TURNO NOCHE.
 *
 * Todo se resuelve relativo al scope del SW, de modo que la misma build
 * funciona en la raiz de un dominio y en /turno-noche/ de GitHub Pages.
 * Shell precacheado + cache-first para assets con hash: tras la primera
 * visita el juego arranca sin red.
 */
const CACHE = 'turno-noche-v2';
// Sustituido en build por vite.config.ts con los assets con hash.
const BUILD_ASSETS = __BUILD_ASSETS__;
const scope = self.registration.scope;
const asset = (path) => new URL(path, scope).href;
const SHELL = [
  asset('./'),
  asset('index.html'),
  asset('manifest.webmanifest'),
  asset('icons/icon-192.png'),
  asset('icons/icon-512.png'),
  asset('icons/maskable-512.png'),
  ...BUILD_ASSETS.map((path) => asset(path)),
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(asset('index.html'), copy));
          return response;
        })
        .catch(() => caches.match(asset('index.html'), { ignoreVary: true }).then((hit) => hit || caches.match(asset('./'), { ignoreVary: true }))),
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreVary: true, ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
