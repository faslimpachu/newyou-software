self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('newyou-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/register',
        '/patients',
        '/visits',
        '/billing',
        '/follow-ups',
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
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open('newyou-v1').then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
