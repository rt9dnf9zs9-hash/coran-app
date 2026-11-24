// Service worker : application utilisable hors ligne (parcours gratuit embarqué).
const VERSION = 'v1';
const SHELL = `shell-${VERSION}`;
const AUDIO = 'audio-public-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest', './icon.svg'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => ![SHELL, AUDIO].includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Audios publics : cache d'abord (ils ne changent pas).
  if (url.pathname.includes('/storage/v1/object/public/audio-public/')) {
    e.respondWith(caches.open(AUDIO).then(async (c) => (await c.match(req)) || fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; })));
    return;
  }
  // Jamais de cache pour l'API, l'authentification et les contenus Premium.
  if (url.origin !== self.location.origin) return;
  // Pages : réseau d'abord, cache en secours (hors ligne).
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { caches.open(SHELL).then((c) => c.put('./index.html', r.clone())); return r; }).catch(() => caches.match('./index.html')));
    return;
  }
  // Fichiers de l'application (noms versionnés) : cache d'abord.
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok) caches.open(SHELL).then((c) => c.put(req, r.clone())); return r; })));
});
