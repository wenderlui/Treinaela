// Treina Ela · © 2026 WR Lui. Todos os direitos reservados.
const C="treina-ela-2.2.1";
const ARQ=["./","index.html","manifest.json","firebase-config.js","privacidade.html","termos.html","legal.css","icons/icon-180.png","icons/icon-192.png","icons/icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(ARQ)));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;
  if(new URL(e.request.url).origin!==location.origin)return;
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp))}return r})
  .catch(()=>caches.match(e.request).then(r=>r||caches.match("index.html"))))});
