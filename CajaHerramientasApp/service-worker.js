self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open('caja-herramientas').then(function(cache) {
      return cache.addAll([
        '/',
        '/cajadeherramientas.html',
        '/compras.html',
        '/diario.html',
        '/finanzas.html',
        '/gestoria.html',
        '/notas.html',
        '/proyectos.html'
      ]);
    })
  );
});

self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(response) {
      return response || fetch(e.request);
    })
  );
});