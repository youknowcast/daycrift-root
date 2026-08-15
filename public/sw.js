// 旧 Gatsby サイト (gatsby-plugin-offline) の Service Worker を解除する移行用 Worker。
// 新サイトは Service Worker を使わないため、登録済み SW を無効化し、
// 旧キャッシュを削除して self を unregister する。
// すべてのユーザーが解除された後は、このファイルと
// src/scripts/unregister-sw.ts を削除してよい。
self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {
      self.skipWaiting();
      // 旧キャッシュの削除と unregister が完了するまでイベント寿命を延長する
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      await self.registration.unregister();
    })()
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});
