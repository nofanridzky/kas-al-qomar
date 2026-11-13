// Service worker: menyimpan tampilan aplikasi agar bisa dibuka saat offline.
// Data Sheets disimpan oleh js/data.js (localStorage), bukan di sini.
const VERSI = "kas-al-qomar-v4";
const FILE = ["./", "index.html", "config.js", "css/app.css", "js/icons.js", "js/data.js", "js/app.js",
  "data/contoh.js", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSI).then(c => c.addAll(FILE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSI).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// file aplikasi: coba jaringan dulu (agar perubahan langsung terlihat), lalu cache
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request.url, { cache: "no-cache" }).then(r => {
      const salin = r.clone();
      caches.open(VERSI).then(c => c.put(e.request, salin));
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match("index.html")))
  );
});
