// Lovwane Studio — service worker
// Pages : réseau d'abord (les mises à jour s'affichent tout de suite), cache seulement hors connexion.
// Autres fichiers : réponse immédiate depuis le cache, puis mise à jour en arrière-plan.
// Changez ce numéro à chaque modification de ce fichier.
const CACHE = "lovwane-studio-v3";
const FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.all(FILES.map(f => cache.add(f).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const estPage = req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith(".html");

  if (estPage) {
    // Réseau d'abord
    event.respondWith(
      fetch(req, { cache: "no-store" })
        .then(rep => {
          if (rep.ok) { const copie = rep.clone(); caches.open(CACHE).then(c => c.put(req, copie)); }
          return rep;
        })
        .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  // Cache d'abord, mise à jour en arrière-plan
  event.respondWith(
    caches.match(req).then(enCache => {
      const reseau = fetch(req).then(rep => {
        if (rep.ok) { const copie = rep.clone(); caches.open(CACHE).then(c => c.put(req, copie)); }
        return rep;
      }).catch(() => enCache);
      return enCache || reseau;
    })
  );
});
