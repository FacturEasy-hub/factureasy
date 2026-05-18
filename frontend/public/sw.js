const CACHE = 'factureasy-v1';
const SHELL = ['/', '/index.html', '/offline.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  // API → Network-First
  if (/^\/(factures|finances|auth|stats|sirene|relances|admin)/.test(url.pathname)) {
    e.respondWith(
      fetch(e.request.clone()).then(r => {
        if (r.ok) {
          const rClone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, rClone));
        }
        return r;
      }).catch(() => caches.match(e.request).then(c =>
        c || new Response(JSON.stringify({error:'Hors ligne',offline:true}),
          {status:503, headers:{'Content-Type':'application/json'}})
      ))
    );
    return;
  }

  // Assets → Cache-First
  e.respondWith(
    caches.match(e.request).then(c => c || fetch(e.request).then(r => {
      if (r.ok) caches.open(CACHE).then(cache => cache.put(e.request, r.clone()));
      return r;
    }).catch(() => caches.match('/offline.html')))
  );
});