self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('newyou-v1').then((cache) => {
      return cache.addAll([
        '/icon.svg',
        '/apple-icon.png',
        '/placeholder-logo.png',
      ]).then(() => self.skipWaiting());
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== 'newyou-v1').map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const isNavigation = event.request.mode === 'navigate';
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response && response.status === 200) {
        const clone = response.clone();
        caches.open('newyou-v1').then((cache) => {
          cache.put(event.request, clone);
        });
      }
      return response;
    }).catch(() => {
      if (isNavigation) {
        return new Response('Offline', { status: 503 });
      }
      return caches.match(event.request);
    })
  );
});
