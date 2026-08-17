// 記事内の <blockquote class="twitter-tweet"> をツイートカード化する。
// 旧 Gatsby サイトは記事ごとに widgets.js を読み込んでいたが、
// 移行時にそれらを除去したため、ここでグローバルに面倒を見る。
// widgets.js はツイートのあるページでだけ読み込む。

const WIDGETS_SRC = "https://platform.twitter.com/widgets.js";

type Twttr = { widgets?: { load(): void } };

function enhanceTweets(): void {
  if (!document.querySelector("blockquote.twitter-tweet")) return;

  const twttr = (window as unknown as { twttr?: Twttr }).twttr;
  if (twttr?.widgets) {
    // 読み込み済みなら swap 後の新しい blockquote だけ再処理させる。
    twttr.widgets.load();
    return;
  }
  if (document.querySelector(`script[src="${WIDGETS_SRC}"]`)) return;

  // 初回読み込み。widgets.js はロード時にページ内を自動で走査する。
  const script = document.createElement("script");
  script.src = WIDGETS_SRC;
  script.async = true;
  document.body.appendChild(script);
}

enhanceTweets();
document.addEventListener("astro:after-swap", enhanceTweets);
