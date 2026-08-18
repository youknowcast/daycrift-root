// 旧 Gatsby サイト (gatsby-plugin-offline) の Service Worker を解除する。
// 新サイトは Service Worker を使わないため、既存の登録をすべて解除する。
// すべてのユーザーが解除された後は、このスクリプトと public/sw.js を
// 削除してよい。
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then(registrations => {
      for (const registration of registrations) {
        registration.unregister();
      }
    })
    .catch(() => {});
}
