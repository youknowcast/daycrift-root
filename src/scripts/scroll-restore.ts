// 一覧ページのスクロール位置を保存/復元する。
// Astro の View Transitions は popstate (ブラウザバック) 時に
// astro:page-load を発火せず、スクロール復元も不確実なため、
// 遷移前の位置を sessionStorage に記録し、astro:after-swap で戻す。
// モジュールスクリプトは初回ロード時に一度だけ実行され、
// document レベルのリスナーは View Transitions 後も生き続ける。

const saveScroll = () => {
  sessionStorage.setItem("scroll:" + location.pathname, String(window.scrollY));
};

document.addEventListener(
  "click",
  (e) => {
    const target = e.target as Element | null;
    const a = target?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a) return;
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#")) return;
    let url: URL;
    try {
      url = new URL(href, location.href);
    } catch {
      return;
    }
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname) return;
    saveScroll();
  },
  true
);

document.addEventListener("astro:after-swap", () => {
  const key = "scroll:" + location.pathname;
  const value = sessionStorage.getItem(key);
  if (value === null) return;
  sessionStorage.removeItem(key);
  requestAnimationFrame(() => {
    window.scrollTo(0, Number(value));
  });
});
