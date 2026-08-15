// 旧 Gatsby サイト (gatsby-plugin-offline) の Service Worker を解除する移行用 Worker。
// 新サイトは Service Worker を使わないため、登録済み SW を無効化し、
// 旧キャッシュを削除して self を unregister する。
// すべてのユーザーが解除された後は、このファイルと
// src/scripts/unregister-sw.ts を削除してよい。
self.addEventListener("install", () => {
  self.skipWaiting();
  caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
  self.registration.unregister();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});
