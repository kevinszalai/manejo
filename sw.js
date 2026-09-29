// Service worker de "Parte de accidente".
// Objetivo único: que la app (y las fuentes/librerías que usa) queden guardadas
// en el celular la primera vez que se abre con señal, para poder usarla después
// sin conexión. No intercepta nada que no sea de esta app ni manda datos a ningún lado.

const CACHE_NAME = 'parte-accidente-v1';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;

  const url = new URL(req.url);
  const isNavigation = req.mode === 'navigate';
  const isSameOrigin = url.origin === self.location.origin;

  if(isNavigation || isSameOrigin){
    // La página en sí: primero red (para traer cambios si hay señal),
    // y si falla, lo último que quedó guardado.
    event.respondWith(
      fetch(req).then(res => {
        if(res && res.ok){
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  // Fuentes y librerías externas (Google Fonts, cdnjs): primero lo guardado,
  // que es instantáneo y funciona sin señal, y de paso lo actualiza en segundo plano.
  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        if(res && res.ok){
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
