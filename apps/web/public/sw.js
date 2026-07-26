/*
 * Service worker BAYT — démarrage hors-ligne de la coquille d'app.
 *
 * Stratégies :
 * - assets statiques immuables (`/_next/static/…`, icônes) → cache-first ;
 * - navigations (pages) → network-first, repli sur la page en cache puis sur la
 *   coquille d'accueil : l'app peut démarrer hors-ligne, le JS lit ensuite la
 *   file de révision depuis IndexedDB ;
 * - API (`/api/…`) → réseau seul (l'app gère le hors-ligne via IndexedDB, pas le
 *   service worker : on ne met JAMAIS en cache des données FSRS critiques ici).
 *
 * v1 : offline pour la révision. Les autres écrans nécessitent le réseau.
 */
const CACHE = 'bayt-shell-v1';

self.addEventListener('install', (event) => {
  // Prend la main sans attendre la fermeture des anciens onglets.
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icon') ||
    url.pathname.startsWith('/apple-touch-icon') ||
    url.pathname === '/manifest.webmanifest'
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Même origine uniquement ; l'API n'est jamais mise en cache par le SW.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }
  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Hors-ligne : la page visitée, sinon la coquille d'accueil.
    const cached = (await cache.match(request)) ?? (await cache.match('/'));
    if (cached) {
      return cached;
    }
    return new Response('Hors-ligne', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}
