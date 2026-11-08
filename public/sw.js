// Minimal service worker: offline shell + Web Push reminders. Never caches API
// responses or user content (they may contain private data).
const SHELL = "aos-shell-v1";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(["/offline.html", "/icon.svg"])));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== SHELL).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", (e) => {
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match("/offline.html")));
  }
});
self.addEventListener("push", (e) => {
  let data = { title: "Aesthetic OS", body: "A post is ready to go out.", url: "/calendar" };
  try { data = { ...data, ...e.data.json() }; } catch {}
  e.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: "/icon-192.png", badge: "/icon-192.png", data: { url: data.url } }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || "/home", self.location.origin);
  if (url.origin !== self.location.origin) return;
  e.waitUntil(self.clients.openWindow(url.href));
});
