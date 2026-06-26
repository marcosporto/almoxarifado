/* Service Worker — Almoxarifado UDESC
 * Cacheia o "app shell" para funcionamento offline.
 * Os dados do inventário NÃO passam por aqui: ficam no IndexedDB (ver index.html).
 */
const CACHE = 'almox-udesc-v26';
// A biblioteca do Google (accounts.google.com/gsi/client) NÃO entra aqui de propósito:
// o Google a serve de forma que quebraria o addAll(); e o login exige internet de qualquer
// modo. Depois de logado, o app funciona offline pela sessão guardada no IndexedDB.
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = e.request.url;

  // Nunca cacheia chamadas ao Apps Script (sempre rede; o app trata o offline)
  if (url.includes('script.google.com') || url.includes('script.googleusercontent.com')) {
    return; // deixa passar direto pra rede
  }

  // HTML (navegação): REDE PRIMEIRO → atualizações entram sozinhas quando online.
  // Cache só como reserva quando estiver offline.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Demais arquivos do shell: cache-first, com atualização em segundo plano
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request).then((res) => {
        if (res && res.status === 200 && e.request.method === 'GET') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
