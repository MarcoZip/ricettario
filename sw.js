// Service worker: mette in cache l'app per l'uso offline e l'installazione.
// I dati (Firestore/TheMealDB) NON passano da qui: vanno sempre in rete / cache propria.

const CACHE = "ricettario-v9";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./js/app.js",
  "./js/ui.js",
  "./js/store.js",
  "./js/store-local.js",
  "./js/config.js",
  "./js/mealdb.js",
  "./js/sites.js",
  "./js/icons.js",
  "./js/icons-data.js",
  "./js/ingredients.js",
  "./js/import-recipe.js",
  "./js/image.js",
  "./js/ocr.js",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Solo le risorse della nostra app passano da qui.
  // Firebase, TheMealDB e le immagini esterne vanno direttamente in rete.
  if (url.origin !== self.location.origin) return;

  // Strategia "prima la rete": quando si è online si riceve sempre la versione
  // aggiornata (così config.js e il codice nuovo arrivano subito); offline si
  // ricade sulla copia in cache.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match("./index.html")))
  );
});
