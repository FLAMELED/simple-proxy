// Funciona sin señal: guarda la app (HTML, módulos, estilos, fuentes e ilustraciones)
// la primera vez que se abre. Los datos del plan ya viven en localStorage.
// La consulta de precios (/api/) nunca se guarda: sin red falla de forma visible.
const CACHE = 'mercadito-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', 'index.html', 'src/ui/app.js', 'src/ui/styles.css'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

// Primero la red (para no quedarse con una versión vieja); si no hay señal, lo guardado.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/api/')) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((hit) => hit ?? Response.error())),
  );
});
