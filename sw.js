/* =========================================================================
   PLANET OF THE FURIOUS — service worker
   - Todos os arquivos do jogo são guardados juntos em um cache por versão.
     O jogo sempre recebe arquivos da MESMA versão (nunca mistura game.js
     novo com cars.js antigo).
   - Ao publicar: aumente VERSION. A versão nova assume e a página mostra
     "Nova versão instalada — Atualizar".
   - Fontes do Google ficam num cache próprio (stale-while-revalidate).
   ========================================================================= */
const VERSION = 'potf-v2.0.0';
const FONT_CACHE = 'potf-fonts';
const SHELL = [
  './', './index.html', './style.css', './cars.js', './audio.js', './game.js', './meta.js', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      // cache: 'reload' ignora o cache HTTP — garante arquivos realmente novos
      .then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== FONT_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONT_CACHE).then(async (c) => {
      const hit = await c.match(req);
      const net = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return;

  // Navegação (abrir o app): sempre o index.html da versão atual
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('./index.html', { cacheName: VERSION }).then((hit) => hit || fetch(req)));
    return;
  }
  // Arquivos do jogo: só do cache desta versão; o que faltar vem da rede
  e.respondWith(
    caches.open(VERSION).then(async (c) => {
      const hit = await c.match(req, { ignoreSearch: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    })
  );
});
