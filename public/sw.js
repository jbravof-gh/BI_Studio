// Dexie Canvas Studio - Service Worker (Cache-First Offline Strategy)
const CACHE_NAME = 'dexie-canvas-studio-v5';
const DB_SNAPSHOT_CACHE_NAME = 'dexie-db-snapshots-v1';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.svg',
  '/icon-512.svg',
  '/icon-maskable.svg',
  '/vendor/pdf.min.js',
  '/vendor/pdf.worker.min.js'
];

// Install: Cache all core assets immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        await cache.addAll(PRECACHE_ASSETS);
      } catch (err) {
        console.warn('[PWA] Pre-cache initial warning:', err);
      }
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up old caches and claim all clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== DB_SNAPSHOT_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: CACHE-FIRST Strategy for production assets, bypassing Vite dev & API requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // IMPORTANT: Never intercept Vite dev server modules, HMR, source files, or backend APIs
  if (
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('node_modules') ||
    url.pathname.includes('hot-update') ||
    url.search.includes('import') ||
    url.search.includes('t=')
  ) {
    // Bypass Service Worker completely; fetch directly from network
    return;
  }

  // Handle cached DB snapshots virtual endpoint
  if (url.pathname.startsWith('/api/db-cache/')) {
    event.respondWith(
      caches.open(DB_SNAPSHOT_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        return fetch(event.request).catch(() => new Response(JSON.stringify({ status: 'offline' }), {
          headers: { 'Content-Type': 'application/json' }
        }));
      })
    );
    return;
  }

  // Navigation requests (Pages, SPA routes, query params like /?action=new, /?action=db, /?pwa=1)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request).then((cachedPage) => {
        // Cache-First: If the exact page is in cache, return immediately
        if (cachedPage) {
          // Revalidate in background to keep cache fresh
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const contentType = networkResponse.headers.get('content-type') || '';
                if (contentType.includes('text/html')) {
                  const clone = networkResponse.clone();
                  caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
              }
            })
            .catch(() => {});
          return cachedPage;
        }

        // Check fallback /index.html in cache (Cache-First SPA)
        return caches.match('/index.html').then((cachedIndex) => {
          if (cachedIndex) {
            // Background fetch & cache
            fetch(event.request)
              .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                  const contentType = networkResponse.headers.get('content-type') || '';
                  if (contentType.includes('text/html')) {
                    const clone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                      cache.put(event.request, clone);
                      cache.put('/index.html', clone.clone());
                    });
                  }
                }
              })
              .catch(() => {});
            return cachedIndex;
          }

          // If not in cache at all, fetch from network and store in cache
          return fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const contentType = networkResponse.headers.get('content-type') || '';
                if (contentType.includes('text/html')) {
                  const clone = networkResponse.clone();
                  caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, clone);
                    cache.put('/index.html', clone.clone());
                  });
                }
              }
              return networkResponse;
            })
            .catch(async () => {
              const fallback = await caches.match('/index.html');
              if (fallback) return fallback;
              return new Response('Dexie Canvas Studio - Offline', {
                headers: { 'Content-Type': 'text/html' }
              });
            });
        });
      })
    );
    return;
  }

  // Assets (JS bundles, CSS, images, icons, fonts)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 1. If found in cache, return immediately
      if (cachedResponse) {
        // Background network revalidation
        fetch(event.request)
          .then((networkResponse) => {
            if (
              networkResponse &&
              networkResponse.status === 200 &&
              (url.origin === location.origin || url.hostname.includes('fonts') || url.hostname.includes('cdn'))
            ) {
              const contentType = networkResponse.headers.get('content-type') || '';
              // Guard: Never cache HTML error pages for JS/CSS assets
              if (!contentType.includes('text/html')) {
                const copy = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, copy);
                });
              }
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      // 2. If not in cache, fetch from network
      return fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (url.origin === location.origin || url.hostname.includes('fonts') || url.hostname.includes('cdn') || url.pathname.endsWith('.svg') || url.pathname.endsWith('.png') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))
          ) {
            const contentType = networkResponse.headers.get('content-type') || '';
            // Guard: Never cache HTML error pages for non-HTML resources
            if (!contentType.includes('text/html')) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, copy);
              });
            }
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and request is an image/icon, try fallback
          if (event.request.destination === 'image') {
            return caches.match('/favicon.svg');
          }
          return cachedResponse || new Response('', { status: 404 });
        });
    })
  );
});

// Message listener for dynamic caching & database sync
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Pre-cache list of URLs requested by the client app
  if (event.data.type === 'CACHE_URLS' && Array.isArray(event.data.urls)) {
    caches.open(CACHE_NAME).then((cache) => {
      cache.addAll(event.data.urls).catch((e) => console.warn('[PWA SW] Cache URLs error:', e));
    });
  }

  // Cache database JSON snapshot for instant offline recovery
  if (event.data.type === 'CACHE_DB_SNAPSHOT' && event.data.dbName && event.data.snapshot) {
    const dbName = event.data.dbName;
    const response = new Response(JSON.stringify(event.data.snapshot), {
      headers: { 'Content-Type': 'application/json' }
    });
    caches.open(DB_SNAPSHOT_CACHE_NAME).then((cache) => {
      cache.put(`/api/db-cache/${encodeURIComponent(dbName)}`, response);
    });
  }
});
