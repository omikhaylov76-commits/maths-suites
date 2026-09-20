/* Service worker — hors-ligne + rappels locaux */

const CACHE = "suites-v1";
const FICHIERS = ["./", "./index.html", "./manifest.json",
                  "./i/icon-192.png", "./i/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* réseau d'abord, cache en secours : l'appli reste à jour mais marche hors ligne */
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then(r => {
        const copie = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copie)).catch(() => {});
        return r;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match("./index.html")))
  );
});

/* ── rappel programmé par la page elle-même ── */
self.addEventListener("message", e => {
  const d = e.data || {};
  if (d.type === "rappel") {
    self.registration.showNotification(d.titre || "Les suites", {
      body: d.corps || "C'est l'heure de ta séance.",
      icon: "./i/icon-192.png",
      badge: "./i/icon-192.png",
      tag: "seance",
      renotify: true,
      requireInteraction: false,
      data: { url: "./" }
    });
  }
});

/* ── push venu du serveur ── */
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = {}; }
  e.waitUntil(
    self.registration.showNotification(d.titre || "Les suites", {
      body: d.corps || "Dix minutes aujourd'hui ?",
      icon: "./i/icon-192.png",
      badge: "./i/icon-192.png",
      tag: "seance",
      renotify: true,
      data: { url: d.url || "./" }
    })
  );
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const cible = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
      for (const c of cs) {
        if ("focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(cible);
    })
  );
});
