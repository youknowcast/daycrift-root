# daycrift-root: Gatsby → Astro + AstroPaper 移行設計

日付: 2026-08-15
状態: 承認済み (要ユーザーレビュー)

## 1. 背景と目的

- 現在のスタックは Gatsby 5 (gatsby-starter-minimal-blog / @lekoarts/gatsby-theme-minimal-blog)。
- Gatsby はメジャーアップデートが止まり、保守モードに移行している (2026-02 が最新リリース、v6 は存在しない)。
- `npm audit` で 88 件の脆弱性警告 (critical 2 / high 43) があり、ほぼ全て Gatsby 5 の推移的依存由来で解消不能。
- ユーザーの優先事項: **技術スタックを現代的に保つ / セキュリティ / 運用をシンプルに**。

## 2. 決定事項

| 項目 | 決定 |
|---|---|
| フレームワーク | **Astro 5** |
| テーマ | **AstroPaper** (satnaing/astro-paper, MIT, テンプレートとして取り込み) |
| デプロイ | **GitHub Actions → S3 継続** |
| URL 戦略 | **既存 URL を完全維持** (`https://www.daycrift.net/<slug>/` ルート直下) |
| ホーム | hero (草グラフ) + Projects セクションを**再現** |
| PWA | **Service Worker 不要**。manifest + アイコンのみ維持 |
| コンテンツ | MDX は無変換で流用 (remark-gfm / rehype-external-links 等の設定は Astro 側に移植) |

検討済みの代替案: Next.js (静的ブログに過剰・S3 との相性不良)、Hugo/Zola (MDX 資産と非互換)、minimal-blog 完全再現 (作業量大)。

## 3. 現状把握

### 3.1 URL 構造 (SEO 保全の根拠)

- 投稿 URL: `/<frontmatter.slug ?? kebabCase(title)>/` (ルート直下)
  - 例: `読書ログ2026` → `/読書ログ-2026/`、`Using GatsbyJS` → `/using-gatsbyjs/`
- ページ: `/about/`, `/favorite/`, `/newscast/`, `/resume/`, タグ: `/tags/<tag>/`
- 投稿一覧: `/` (ホーム) と `/blog/`
- 検証済み: **109 記事、トップレベルルートとの衝突 0 件** (reserved: blog, tags, about, favorite, newscast, resume, rss.xml, sitemap-index.xml, 404, pagefind, posts 等)

### 3.2 コンテンツ

- `content/posts/YYYY/MM/<name>/index.mdx` … 109 件
- `content/pages/{about,favorite,newscast,resume}/index.mdx` … 4 件
- `content/posts/useful/index.mdx` … 投稿として扱う (タグ Useful)
- フロントマター: `title`, `description`, `date`, `tags` (一部に `slug` 有り)
- 画像は全て CloudFront (S3) 上の URL 参照 (ローカル画像なし。相対パスは内部リンクのみで、URL 維持によりそのまま有効)
- `src/@lekoarts/.../hero.mdx` (ここはなに？ + 草グラフ SVG) と `bottom.mdx` (Projects 一覧) がホームに表示

### 3.3 機能

- RSS (`/rss.xml`), sitemap, タグ一覧/タグページ, ライト/ダーク切替 (theme-ui)
- 動画埋め込み 9 記事 (gatsby-remark-embed-video), Twitter 埋め込み 4 記事 (gatsby-plugin-twitter), mermaid 1 記事 (mdx-mermaid)
- PWA (manifest + offline SW), Twitter card / OGP (banner.png)
- 外部リンク: X, GitHub, note, zenn, Qiita (フッター)
- ナビゲーション: Blog, About, Useful, Newscast

### 3.4 スクリプト・CI

- `scripts/`: add_newscast.mjs, clean.mjs, gen_today.mjs, insert_book_log.mjs, upload_images.mjs
- `.github/workflows/`: check-building-blog.yml (lint+build), generate-github-graph.yml, s3-deploy.yml
- Node 24 / npm 10.8.2 (packageManager), TypeScript

## 4. 移行設計

### 4.1 リポジトリ構成

- AstroPaper テンプレートを本リポジトリに展開して Gatsby を置換。
- 削除: `gatsby-*.mjs/tsx`, `.eslintrc.js`, `src/@lekoarts/**`, theme-ui 関連, Gatsby 固有の `tsconfig` 設定
- 追加: AstroPaper の `astro.config.ts`, `astro-paper.config.ts`, `src/` (components, layouts, content, pages, i18n, styles)
- `content/posts` → `src/content/posts`、`content/pages` → `src/content/pages` (git mv で履歴保全)
- 既存の `static/` (favicon, banner, robots.txt) は `public/` へ移動・統合

### 4.2 URL 戦略

- 全記事のフロントマターへ **`slug` を明示付与** し、既存 URL を固定する。
  - 移行時に旧テーマの slugify ロジック (`frontmatter.slug ?? lodash.kebabCase(title)`) を実行して値を焼き込む。
  - 現行 `public/sitemap-0.xml` と突合して一致を検証 (109 件)。
- AstroPaper 標準の `/posts/<path>/` をやめ、独自ルート **`src/pages/[slug].astro`** を追加して `/<slug>/` を出力。
  - 静的ルート (/about, /tags, /blog 等) が動的ルートより優先される Astro のルーティング仕様を利用。
  - 衝突は移行スクリプトで検証済み (0 件)。
- RSS / sitemap の URL 導出を一元化するユーティリティ (`getPostUrl`) を用意し、AstroPaper の rss/sitemap 設定が同じ `/<slug>/` を出力するよう調整。

### 4.3 コンテンツ移行

フロントマター変換 (移行スクリプト `scripts/migrate_frontmatter.mjs`):

| 旧 (Gatsby) | 新 (AstroPaper) |
|---|---|
| `date` | `pubDatetime` |
| `title` | `title` |
| `description` | `description` |
| `tags` | `tags` |
| (無し) | `slug` (既存 URL から焼き込み) |
| `slug` (一部) | `slug` (そのまま維持) |

- `modDatetime`, `featured`, `draft` 等は未使用なので付与しない (スキーマの default/optional に依存)。
- ページ (about/favorite/newscast/resume): AstroPaper の pages コレクションに移し、複数ページ対応のルート (`src/pages/[page].astro` 相当) を追加。ヘッダー/フッターは既存ナビゲーションに合わせる。
- `useful`: posts コレクションのまま維持。

### 4.4 ホームページ

AstroPaper のホームをカスタマイズし、現行の 3 要素を再現:

1. **hero**: 「ここはなに？よくあるエンジニアのブログ」+ 草グラフ SVG (S3 の `grass-graph.svg` を参照、静的画像として埋め込み)
2. **投稿一覧**
3. **bottom / Projects**: nvim-cheats, Melrhohien 等のプロジェクト一覧セクション

役割分担: `/` (ホーム) = hero + 投稿一覧 + Projects、`/blog/` = 投稿一覧のみ (現行と同じ挙動)。

### 4.5 埋め込み

| 種別 | 現行 | 移行後 |
|---|---|---|
| 動画 (9 記事) | `gatsby-remark-embed-video` | MDX カスタムコンポーネント `Video` (iframe ラッパー) へ移行スクリプトで変換 |
| Twitter (4 記事 + favorite ページ) | `gatsby-plugin-twitter` + HTML blockquote | **変換不要**: blockquote HTML はそのまま MDX で描画。非推奨の `platform.twitter.com/widgets.js` script タグのみ除去 |
| mermaid (1 記事) | `mdx-mermaid` | `astro-mermaid` 統合を `@astrojs/mdx` に適用 (テーマ切替連動) |

- `remark-gfm` と `rehype-external-links` (target=_blank, noopener) は `astro.config.ts` の mdx オプションに移植。

### 4.6 機能

- **RSS**: AstroPaper 標準 (`@astrojs/rss`)。出力先 `/rss.xml` を維持、フィード内容 (title/date/url/guid) を現行と同等に。
- **sitemap**: `astro-sitemap` で全 URL 維持。
- **タグ**: AstroPaper 標準 (タグ一覧 + `/tags/<tag>/`)。
- **ダークモード**: AstroPaper 標準のトグル (既存の OS 連動挙動に合わせて設定)。
- **検索**: Pagefind (AstroPaper 標準、ビルド時に index 生成)。
- **OGP**: 動的 OG 画像 (Satori) + 既存 `banner.png` をフォールバック。
- **PWA**: manifest のみ (既存 android-chrome-*.png を流用)。**SW は入れない**。
- **外部リンク**: AstroPaper の social 設定に X / GitHub / note / zenn / Qiita。
- **404**: AstroPaper 標準ページを日本語化。
- **i18n**: サイトは日本語のみ → default locale `ja` の単一ロケール構成。

### 4.7 スクリプト

- `insert_book_log.mjs`: 書影追記対象パスを `src/content/posts/<最新読書ログ記事>/index.mdx` に更新。年明けの新記事検出ロジックも新ディレクトリ構造に合わせる。
- `add_newscast.mjs`, `gen_today.mjs`: 記事生成パス・フロントマター (pubDatetime) を新形式に更新。
- `upload_images.mjs`, `clean.mjs`: パス整合のみ。
- 移行専用スクリプト (`migrate_frontmatter.mjs` 等) は移行完了後に削除。

### 4.8 CI/CD

- `s3-deploy.yml`: `npm ci` → `npm run build` (astro build) → `aws s3 sync dist/ s3://<bucket>` に変更。
- `check-building-blog.yml`: lint を AstroPaper の ESLint (flat config, eslint 9) に置換。
- `generate-github-graph.yml`: 変更なし (草グラフ SVG 生成は独立)。
- Node 24 / npm は維持。`packageManager: npm@10.8.2` 維持。

## 5. 検証方法

1. `astro build` 成功、`astro check` (型チェック) 成功、ESLint 成功。
2. 生成された `dist/` の URL 集合が現行 `public/sitemap-0.xml` の URL 集合と一致することをスクリプトで突合 (109 投稿 + ページ + タグ)。
3. `/`, `/blog/`, `/about/`, `/useful/`, `/newscast/`, 代表的な記事 (読書ログ-2026, using-gatsbyjs, mermaid 記事, 動画埋め込み記事), `/tags/`, `/rss.xml` をブラウザ (chromium + puppeteer-core) で表示確認。ダークモード切替、検索、埋め込みの動作確認。
4. RSS フィードのアイテム URL が既存と一致。
5. ローカルで `npm run preview` により全リンク (404 チェック) を巡回。

## 6. リスクと対策

| リスク | 対策 |
|---|---|
| URL ズレによる SEO 低下 | slug 焼き込み + sitemap 突合で全件検証 |
| AstroPaper の標準ルート変更によるレイアウト崩れ | 影響範囲を限定した独自 `[slug].astro` + 既存テスト URL での表示確認 |
| ローカル画像参照の破綻 | 移行時に `static/` 画像参照を走査し、`public/` への移動で追随 |
| 旧記事の特殊記法 (video/twitter) の取りこぼし | 変換スクリプトで変換漏れ検出 (動画 9 記事、twitter blockquote 4 記事 + favorite ページ) と手動レビュー |
| 読書ログ記事の頻繁な追記フロー | スクリプト更新 + 記事追加後の smoke test |

## 7. スコープ外

- Service Worker / PWA オフライン対応
- デザインの大幅刷新 (AstroPaper のデフォルトデザインに寄せる)
- コメント機能、アクセス解析の追加
- URL の変更・リダイレクト対応 (不要なため)
