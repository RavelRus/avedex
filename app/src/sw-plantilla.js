// Service worker de AVEDEX. Lo genera vite.config.ts a partir de esta plantilla.
// Guarda la app completa para que abra sin conexión. No guarda la base de datos (vive en OPFS).

const VERSION = '__VERSION__';
const CACHE = `avedex-app-${VERSION}`;
const ARCHIVOS = "__ARCHIVOS__";

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ARCHIVOS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((c) => c.startsWith('avedex-app-') && c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET') return;
  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin) return;
  // La base de referencia y su manifiesto van siempre a la red.
  if (url.pathname.endsWith('.sqlite') || url.pathname === '/referencia.json') return;

  evento.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const clave = peticion.mode === 'navigate' ? '/' : url.pathname;
      const guardado = await cache.match(clave);
      if (guardado) return guardado;
      return fetch(peticion);
    }),
  );
});
