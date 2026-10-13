// Guarda solo los archivos de la app para que abra al instante. Tus datos nunca se guardan aquí.
// Abre con lo guardado en el teléfono y, por detrás, descarga la versión nueva para la próxima vez.
const CACHE = "seguimiento-v8";
const ARCHIVOS = ["./", "index.html", "styles.css", "app.js", "config.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // lo de Google va directo a la red
  if (url.pathname.endsWith("/apps-script/Code.gs")) return; // siempre la versión más nueva
  e.respondWith(
    caches.open(CACHE).then((c) =>
      c.match(e.request, { ignoreSearch: true }).then((guardado) => {
        const red = fetch(e.request)
          .then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; })
          .catch(() => guardado);
        if (guardado) { e.waitUntil(red); return guardado; }
        return red;
      })
    )
  );
});
