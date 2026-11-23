// Fonte : fonctionnement hors ligne et ouverture instantanée.
// L'app est servie depuis la copie du téléphone. Chaque déploiement change ce fichier (version ci-dessous) :
// le navigateur le remarque en arrière-plan, télécharge la nouvelle version, puis la page propose de recharger.
const VERSION = "51856125c4";
const CACHE = "fonte-app-" + VERSION;
const CORE = ["./", "index.html", "manifest.webmanifest", "apple-touch-icon.png", "icon-192.png", "icon-512.png"];
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", e => {
  // cache: "reload" contourne le cache HTTP du navigateur pour avoir vraiment la nouvelle version
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(CORE.map(u => fetch(new Request(u, { cache: "reload" })).then(r => { if (!r.ok) throw new Error(u); return c.put(u, r); }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("fonte-") && k !== CACHE && k !== "fonte-polices").map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Polices : depuis le cache d'abord, elles ne changent jamais.
  if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith(caches.open("fonte-polices").then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === "opaque") c.put(req, res.clone());
      return res;
    }));
    return;
  }
  if (url.origin !== location.origin) return;

  // Fichiers de l'app : copie du téléphone d'abord (instantané), réseau seulement si elle manque.
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req, { ignoreSearch: true }) || (req.mode === "navigate" ? (await c.match("./") || await c.match("index.html")) : null);
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok) c.put(req, res.clone());
    return res;
  })());
});
