// 一覧ページのスクロール位置を保存/復元する。
// Astro の View Transitions は初期エントリ (直リンク/リロード) への
// ブラウザバックでスクロールを復元しないため、遷移前の位置を
// sessionStorage に記録して astro:after-swap で戻す。
// 復元は履歴移動 (back/forward) に限定し、ナビクリック等の前方遷移では
// トップから表示する (Astro 標準と同じ挙動)。
// モジュールスクリプトは初回ロード時に一度だけ実行され、
// document レベルのリスナーは View Transitions 後も生き続ける。

const saveScroll = () => {
  sessionStorage.setItem("scroll:" + location.pathname, String(window.scrollY));
};

document.addEventListener(
  "click",
  e => {
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

// 遷移種別 (navigate / traverse / reload) を記録する。
// astro:after-swap には遷移種別が載らないため、before-preparation で捕捉する。
let lastNavigationType = "navigate";

document.addEventListener("astro:before-preparation", event => {
  lastNavigationType =
    (event as Event & { navigationType?: string }).navigationType ?? "navigate";
});

document.addEventListener("astro:after-swap", () => {
  if (lastNavigationType !== "traverse") return;
  // Astro の ClientRouter は履歴エントリ (history.state の scrollX/Y) 単位で
  // 座標を復元する。それが効くケース (pushState 済みエントリへのバック) では
  // 独自復元で上書きしない。初期エントリ (state が null) へのバックだけ
  // sessionStorage の値を復元する (このケースは Astro の復元が効かない)。
  if (
    history.state &&
    typeof (history.state as { scrollY?: unknown }).scrollY === "number"
  ) {
    return;
  }
  const key = "scroll:" + location.pathname;
  const value = sessionStorage.getItem(key);
  if (value === null) return;
  sessionStorage.removeItem(key);
  requestAnimationFrame(() => {
    window.scrollTo(0, Number(value));
  });
});
