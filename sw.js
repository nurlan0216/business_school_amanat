/* Business School Amanat — Service Worker v2.0 */
const CACHE_NAME = 'bs-amanat-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Кэшируем статику, игнорируем ошибки отдельных файлов
      return Promise.allSettled(
        STATIC_ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('Cache add failed:', url, err))
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Не перехватываем запросы к Google Sheets, Apps Script, YouTube
  const skipDomains = [
    'docs.google.com', 'script.google.com', 'fonts.googleapis.com',
    'fonts.gstatic.com', 'youtube.com', 'youtu.be', 'ytimg.com',
    'www.youtube.com', 'img.youtube.com', 'api.ipify.org',
    'vk.com', 'vkvideo.ru', 'vimeo.com', 'cloudflarestream.com'
  ];
  if (skipDomains.some(d => url.hostname.includes(d))) {
    return; // браузер обрабатывает сам
  }

  // Cache First для наших статических файлов
  const isOurStatic = url.origin === self.location.origin &&
    (STATIC_ASSETS.includes(url.pathname) || url.pathname.match(/\.(css|js|json|woff2?|ttf|svg|png|jpg|ico)$/));

  if (isOurStatic) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(resp => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, clone));
          }
          return resp;
        }).catch(() => cached || new Response('Offline', { status: 503 }));
      })
    );
    return;
  }

  // Network First для всего остального (с фоллбэком на кэш)
  event.respondWith(
    fetch(req).then(resp => {
      // Кэшируем успешные GET ответы
      if (req.method === 'GET' && resp && resp.status === 200) {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, clone)).catch(() => {});
      }
      return resp;
    }).catch(() => caches.match(req))
  );
});
