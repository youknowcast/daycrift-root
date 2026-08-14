# Gatsby → Astro + AstroPaper 移行 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** daycrift-root (Gatsby 5 + minimal-blog) を Astro 7 + AstroPaper v6 へ移行し、既存 URL を完全維持したまま新しいスタックで動かす。

**Architecture:** AstroPaper テンプレートをリポジトリに展開して Gatsby を置換。投稿 URL を既存の `/<slug>/` (ルート直下) に維持するため、全投稿の frontmatter に `slug` を焼き込み、AstroPaper の URL 導出関数 (`getPostPaths.ts`) と投稿ルート (`posts/[...slug]` → `[...slug]`) を改修する。デプロイは GitHub Actions → S3 (`dist/` sync) を継続。

**Tech Stack:** Astro 7, AstroPaper v6 (Tailwind CSS 4, TypeScript 6), @astrojs/mdx, @astrojs/rss, @astrojs/sitemap, Pagefind, dayjs, lodash.kebabcase, mermaid 11, Node 24 / npm 10.8.2

**Spec:** `docs/superpowers/specs/2026-08-15-astro-migration-design.md`

## Global Constraints

- サイト URL は `https://www.daycrift.net`。投稿 URL は `/<slug>/` (ルート直下) を**厳守** (`/posts/` プレフィックス禁止)
- slug = 既存 frontmatter `slug` があればそれを、なければ `lodash.kebabcase(title)`。全 109 投稿が現行 sitemap と一致すること
- ページ: `/about/`, `/favorite/`, `/newscast/`, `/resume/`。ナビ: Blog (`/blog/`), About, Useful (`/useful/`), Newscast
- ホーム `/` = hero (「ここはなに？」+ 草グラフ) + 投稿一覧 + Projects。`/blog/` = 投稿一覧のみ (単一ページ、perPage 100)
- 日付表示は `YYYY/MM/DD` 形式 (現行 formatString 踏襲)
- 言語: 日本語のみ。i18n `locales: ["ja"]`, `defaultLocale: "ja"`, `prefixDefaultLocale: false`
- タイムゾーン: `Asia/Tokyo`。`ogImage: "banner.png"`。PWA は manifest のみ (SW 禁止)
- remark-gfm + rehype-external-links (`target: "_blank"`, `rel: ["noopener","noreferrer"]`) を必ず有効化
- 埋め込み: `youtube:<id>` 構文 (5 記事) → `<Video videoId="<id>" />` に変換。`<BuildYoutubeLink>` (記事内 export) と `<iframe>` HTML は無変換。`platform.twitter.com/widgets.js` script タグは全除去。mermaid は `src/utils/mermaid-wrapper.astro` (記事の `import MermaidWrapper from '/src/utils/mermaid-wrapper'` が動くこと)
- ビルド: `npm run build` = `astro check && astro build && pagefind --site dist && cp -r dist/pagefind public/` (AstroPaper 既定)
- Node 24 / npm 10.8.2 維持。Git は master ブランチ。各タスク終了時コミット必須

---

### Task 1: 現行 URL のスナップショット取得

**Files:**
- Create: `scripts/migration/url-snapshot.json`
- Create: `scripts/migration/snapshot-urls.mjs`

**Interfaces:**
- Consumes: `public/sitemap-0.xml` (Gatsby ビルド成果物。このリポジトリのディスク上に存在する前提。無ければ旧スタックで `npm run build` を一度実行してから始める)
- Produces: `scripts/migration/url-snapshot.json` — `{ "all": string[] }`。後続タスクの URL 突合の唯一の正

- [ ] **Step 1: スナップショットスクリプトを作成**

```js
// scripts/migration/snapshot-urls.mjs
// Gatsby の sitemap から現行 URL 全件を抜き出し、scripts/migration/url-snapshot.json に保存する
import fs from "node:fs"

const SITEMAP = "public/sitemap-0.xml"

if (!fs.existsSync(SITEMAP)) {
  console.error(`${SITEMAP} が見つかりません。旧 Gatsby スタックで npm run build を実行してから再試行してください。`)
  process.exit(1)
}

const sitemap = fs.readFileSync(SITEMAP, "utf-8")
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1])

fs.mkdirSync("scripts/migration", { recursive: true })
fs.writeFileSync("scripts/migration/url-snapshot.json", JSON.stringify({ all: urls }, null, 2))
console.log(`snapshot ${urls.length} URLs → scripts/migration/url-snapshot.json`)
```

- [ ] **Step 2: 実行して件数を確認**

Run: `node scripts/migration/snapshot-urls.mjs`
Expected: `snapshot N URLs` と出力される (N は 500 前後。109 投稿 + タグ + ページ + トップ)

- [ ] **Step 3: コミット**

```bash
git add scripts/migration/
git commit -m "chore: snapshot current URLs for migration verification"
```

---

### Task 2: AstroPaper テンプレート展開 (scaffold)

**Files:**
- Modify: リポジトリ全体 (Gatsby ファイル削除、AstroPaper ファイル追加)
- Modify: `.gitignore` (`public/` の ignore を解除、`.cache` は維持)
- Create: `src/utils/mermaid-wrapper.astro` (旧 `src/utils/mermaid-wrapper.tsx` の移植)

**Interfaces:**
- Consumes: なし (Task 1 は独立)
- Produces: `npm run build` が通る Astro プロジェクト。`mermaid-wrapper.astro` は props `{ graph: string }` を受け取り、`[data-mermaid]` を持つ div を描画する (Task 4 以降の記事ビルドで必要)

- [ ] **Step 1: テンプレートを取得**

```bash
git clone --depth 1 https://github.com/satnaing/astro-paper /tmp/opencode/astro-paper
```

- [ ] **Step 2: テンプレートのファイルをコピー**

```bash
# 設定・ソース・静的アセット (pnpm / CI の余計なファイルはコピーしない)
cp /tmp/opencode/astro-paper/{astro.config.ts,astro-paper.config.ts,tsconfig.json,eslint.config.js,.prettierrc,.prettierignore,.editorconfig,package.json} ./
cp -r /tmp/opencode/astro-paper/src ./src-tpl
cp -r /tmp/opencode/astro-paper/public ./public-tpl
```

- [ ] **Step 3: Gatsby 関連ファイルを削除**

```bash
git rm -r -q gatsby-config.mjs gatsby-ssr.tsx .eslintrc.js .eslintignore src/@lekoarts src/utils
rm -rf public  # 旧 Gatsby ビルド出力 (gitignore 対象)
mkdir public
```

- [ ] **Step 4: テンプレートの src / public を配置し、サンプルコンテンツを除去**

```bash
rm -rf src && mv src-tpl src
# AstroPaper のデモ記事・デモページを削除 (posts/pages コレクション)
rm -rf src/content
mkdir -p src/content/posts src/content/pages
# about.astro 等が getEntry("pages", ...) で throw するため、一時的な placeholder を置く (Task 4 で本物に置き換わる)
for page in about favorite newscast resume; do
  printf -- '---\ntitle: %s\ndescription: placeholder\n---\n' "$page" > "src/content/pages/$page.mdx"
done
# 静的アセット: AstroPaper サンプルを消して旧 static/ のアセットを public/ へ
rm -rf public-tpl/pagefind
mv public-tpl/* public/
rm -rf public-tpl
cp -r static/* public/    # 先にコピー (git rm はファイルも消すため順序注意)
git rm -r -q static
rm public/robots.txt      # robots.txt.ts がビルド時に生成するため削除
```

`public/` に残るもの: `banner.png`, `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon*.png`, `android-chrome-*.png`, AstroPaper の `favicon.svg`, `default-og.jpg`。

- [ ] **Step 5: package.json を調整**

AstroPaper の package.json をコピーしたので、name と packageManager を元のリポジトリの値に合わせる:

```bash
node -e "
const fs = require('fs')
const p = JSON.parse(fs.readFileSync('package.json', 'utf-8'))
p.name = 'daycrift-root'
p.packageManager = 'npm@10.8.2'
fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n')
"
```

- [ ] **Step 5: .gitignore を統合**

`public/` の ignore 行を削除し (favicon 等をコミットするため)、AstroPaper の ignore 行 (`dist/`, `.astro/`, `public/pagefind`) を追加。`.cache` と `node_modules` は維持。

```bash
# .gitignore に追記
cat >> .gitignore <<'EOF'

# Astro / AstroPaper
dist/
.astro/
public/pagefind
EOF
```

`public/` の ignore 行を `.gitignore` から削除する (Gatsby 由来の `public` エントリ)。

- [ ] **Step 6: 依存関係インストール**

```bash
npm install
```

Expected: 成功。`package-lock.json` が生成される (pnpm-lock.yaml 等はコピーしていないので無関係)。

- [ ] **Step 7: mermaid wrapper を Astro コンポーネントに移植**

`src/utils/mermaid-wrapper.tsx` は `mdx-mermaid` の React コンポーネントを使っていた。Astro ネイティブ版に置き換える (記事は `import MermaidWrapper from '/src/utils/mermaid-wrapper'` で参照するためパスは維持):

```astro
---
// src/utils/mermaid-wrapper.astro
// 使い方: <MermaidWrapper graph={`gantt\n...`} />
interface Props {
  graph: string
}
const { graph } = Astro.props
---

<div class="not-prose my-4 overflow-x-auto" data-mermaid></div>

<script define:vars={{ graph }}>
  import mermaid from "mermaid"

  const theme = () =>
    document.documentElement.getAttribute("data-theme") === "dark"
      ? "dark"
      : "default"

  const renderAll = async () => {
    mermaid.initialize({ startOnLoad: false, theme: theme(), securityLevel: "strict" })
    for (const el of document.querySelectorAll("[data-mermaid]")) {
      try {
        const { svg } = await mermaid.render(`mermaid-${Math.random().toString(36).slice(2)}`, el.getAttribute("data-graph") ?? "")
        el.innerHTML = svg
      } catch (e) {
        el.innerHTML = `<pre class="text-sm">${e instanceof Error ? e.message : String(e)}</pre>`
      }
    }
  }

  // グラフ文字列を data-graph に渡す
  document.addEventListener("astro:page-load", () => {
    const target = document.querySelector("[data-mermaid]")
    if (target) target.setAttribute("data-graph", graph)
  })

  // テーマ切替時に再描画 (AstroPaper は <html data-theme="..."> を使う)
  const observer = new MutationObserver(() => renderAll())
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] })
  renderAll()
</script>
```

このコンポーネントは **Task 8 で微調整する** (data-graph 渡しのタイミング)。このタスクではビルドが通る状態にしておく:

```bash
npm install mermaid
```

- [ ] **Step 8: ビルド検証 (デフォルト状態)**

Run: `npm run build`
Expected: `astro check` が pass、`astro build` が成功し `dist/` が生成される。Pagefind の index も生成される。エラーが出た場合は原因を修正 (サンプルコンテンツ削除の漏れや設定ファイルのコピー漏れが典型)。

- [ ] **Step 9: コミット**

```bash
git add -A
git commit -m "feat: scaffold AstroPaper template, remove Gatsby"
```

---

### Task 3: サイト設定 (config / i18n / PWA manifest / ナビ / socials)

**Files:**
- Modify: `astro-paper.config.ts`
- Modify: `astro.config.ts`
- Modify: `src/layouts/Layout.astro` (manifest link, theme-color, favicon, lang)
- Modify: `src/components/Header.astro` (ナビゲーション)
- Modify: `src/components/Socials.astro` 関連 (icons/socials/ に note/zenn/qiita SVG 追加)
- Modify: `src/components/Datetime.astro` (日付形式)
- Create: `public/site.webmanifest`

**Interfaces:**
- Consumes: Task 2 の scaffold
- Produces: サイト名 CALL ME STUPID、`lang="ja"`、ナビ 4 項目、socials 5 件、manifest。後続タスクのレイアウト基盤

- [ ] **Step 1: astro-paper.config.ts にサイト情報を設定**

```ts
// astro-paper.config.ts の site / posts / features / socials を書き換える
site: {
  url: "https://www.daycrift.net",
  title: "CALL ME STUPID",
  description: "engineer blog.",
  author: "youknowcast",
  profile: "https://github.com/youknowcast",
  ogImage: "banner.png",
  lang: "ja",
  timezone: "Asia/Tokyo",
  dir: "ltr",
},
posts: {
  perPage: 200,          // 旧サイトは一覧を 1 ページに全表示していた (109 件)
  perIndex: 200,
  scheduledPostMargin: 15 * 60 * 1000,
},
features: {
  lightAndDarkMode: true,
  dynamicOgImage: true,
  showArchives: false,   // 旧サイトに /archives/ は存在しない
  showBackButton: true,
  editPost: { enabled: false, url: "" },  // AstroPaper フォークではないため無効
  search: "pagefind",
},
socials: [
  { name: "github", url: "https://github.com/youknowcast" },
  { name: "x", url: "https://x.com/youknowcast" },
  { name: "note", url: "https://note.com/youknowcast" },
  { name: "zenn", url: "https://zenn.dev/youknowcast" },
  { name: "qiita", url: "https://qiita.com/youknowcast" },
],
```

- [ ] **Step 2: astro.config.ts に日本語設定と remark/rehype プラグインを追加**

`astro.config.ts` を編集:

```ts
import remarkGfm from "remark-gfm"
import rehypeExternalLinks from "rehype-external-links"
// (既存 import に追加)
```

i18n と markdown.processor を変更:

```ts
i18n: {
  locales: ["ja"],
  defaultLocale: "ja",
  routing: { prefixDefaultLocale: false },
},
markdown: {
  processor: unified({
    remarkPlugins: [
      remarkToc,
      [remarkCollapse, { test: "Table of contents" }],
      remarkGfm,                                          // ← 追加
    ],
    rehypePlugins: [
      rehypeCallouts,
      [rehypeExternalLinks, { target: "_blank", rel: ["noopener", "noreferrer"] }],  // ← 追加
    ],
  }),
  // shikiConfig はそのまま
},
```

```bash
npm install remark-gfm rehype-external-links
```

- [ ] **Step 3: PWA manifest を追加**

`public/site.webmanifest` を作成:

```json
{
  "name": "CALL ME STUPID",
  "short_name": "Daycrift",
  "description": "engineer blog.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#6B46C1",
  "icons": [
    { "src": "/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

`src/layouts/Layout.astro` の `<head>` 内 (既存の favicon link 付近) に追記:

```html
<link rel="manifest" href="/site.webmanifest" />
<meta name="theme-color" content="#6B46C1" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
```

AstroPaper が `<link rel="icon" type="image/svg+xml" href="/favicon.svg">` を出力している場合は 32/16px PNG に置き換える (favicon.svg は public/ から削除してよい)。

- [ ] **Step 4: ナビゲーションを 4 項目に変更**

`src/components/Header.astro` のナビ部分を書き換える。現在の nav は `/posts`, `/tags`, `/about`, `/archives`, `/search` がハードコードされている (約 70〜140 行)。`getRelativeLocaleUrl(locale, "posts")` 等を次の 4 項目に置換:

| 表示 | href |
|---|---|
| Blog | `getRelativeLocaleUrl(locale, "blog")` |
| About | `getRelativeLocaleUrl(locale, "about")` |
| Useful | `getRelativeLocaleUrl(locale, "useful")` |
| Newscast | `getRelativeLocaleUrl(locale, "newscast")` |

isActive 判定 (`isActive("/posts")`) も各パスに合わせる。archives のドロップダウンと検索リンクは削除してよいが、**検索 (`/search`) は残す** (Pagefind 検索は仕様 4.6 で採用)。ただし「Blog / About / Useful / Newscast」の 4 項目のみを優先し、検索アイコンはヘッダーの端に置く。

- [ ] **Step 5: socials アイコン追加**

`src/assets/icons/socials/` に `note.svg`, `zenn.svg`, `qiita.svg` を追加 (各 24x24 の単色 SVG、`stroke="currentColor"` で既存アイコンと同じ描画方式。参考: `IconX.svg`)。Socials.astro は `import.meta.glob("/src/assets/icons/socials/*.svg")` で動的に解決するため、ファイルを置くだけで良い。

- [ ] **Step 6: 日付表示を YYYY/MM/DD に変更**

`src/components/Datetime.astro` の該当行:

```ts
const date = datetime.format("D MMM, YYYY");
```

を次のように変更:

```ts
const date = datetime.format("YYYY/MM/DD");
```

- [ ] **Step 7: ビルド検証**

Run: `npm run build`
Expected: 成功。`dist/index.html` に `<html lang="ja">` と manifest link が含まれる。

```bash
grep -o 'lang="ja"' dist/index.html
grep -o 'site.webmanifest' dist/index.html
```

- [ ] **Step 8: コミット**

```bash
git add -A
git commit -m "feat: configure site (ja locale, nav, socials, PWA manifest)"
```

---

### Task 4: コンテンツ移行 + frontmatter 変換

**Files:**
- Modify: `src/content.config.ts` (posts schema に `slug` 追加)
- Create: `scripts/migration/migrate-frontmatter.mjs` (移行後に削除する一時スクリプト)
- Move: `content/posts` → `src/content/posts`, `content/pages` → `src/content/pages` (git mv)

**Interfaces:**
- Consumes: Task 1 の `scripts/migration/url-snapshot.json`、Task 2 の scaffold
- Produces: 全 109 投稿の frontmatter が `pubDatetime` / `title` / `description` / `tags` / `slug` を持つ。ページ 4 件が `src/content/pages/<name>.mdx` にフラット化される。slug の正当性はスナップショットと完全一致で検証済み

- [ ] **Step 1: コンテンツディレクトリを移動**

```bash
# src/content/posts と src/content/pages は既に存在するため、中身を移動する
git mv content/posts/* src/content/posts/
git mv content/pages/* src/content/pages/
rmdir content/posts content/pages content 2>/dev/null || true
```

- [ ] **Step 2: posts schema に slug フィールドを追加**

`src/content.config.ts` の posts schema (z.object 内) に追加:

```ts
slug: z.string().optional(),
```

- [ ] **Step 3: 移行スクリプトを作成**

```js
// scripts/migration/migrate-frontmatter.mjs
// 旧 Gatsby frontmatter (date) → AstroPaper frontmatter (pubDatetime) 変換
// slug = frontmatter.slug ?? lodash.kebabcase(title) で旧テーマと同じ値を焼き込み、
// scripts/migration/url-snapshot.json と全件突合する
import fs from "node:fs"
import path from "node:path"
import kebabcase from "lodash.kebabcase"

const SNAPSHOT = JSON.parse(fs.readFileSync("scripts/migration/url-snapshot.json", "utf-8")).all
const SITE_URL = "https://www.daycrift.net"

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (e.name === "index.mdx") out.push(p)
  }
  return out
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---/)
  if (!m) return null
  const fm = {}
  const lines = m[1].split("\n")
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const kv = line.match(/^(\w+):\s*(.*)$/)
    if (!kv) continue
    const key = kv[1]
    let value = kv[2].trim()
    if (key === "tags") {
      // 複数行 YAML (tags:\n  - A\n  - B) をサポート
      if (value === "") {
        const items = []
        let j = i + 1
        while (j < lines.length && /^\s+-\s+/.test(lines[j])) {
          items.push(lines[j].replace(/^\s+-\s+/, "").replace(/^["']|["']$/g, ""))
          j++
        }
        value = items
        i = j - 1
      } else if (value.startsWith("[")) {
        value = value.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""))
      } else if (value.startsWith('"') || value.startsWith("'")) {
        value = [value.replace(/^["']|["']$/g, "")]
      }
    } else {
      value = value.replace(/^["']|["']$/g, "")
    }
    fm[key] = value
  }
  return { fm, rest: raw.slice(m[0].length) }
}

function formatYamlValue(v) {
  if (Array.isArray(v)) return v.length ? `\n${v.map((x) => `  - ${x}`).join("\n")}` : " []"
  return ` ${JSON.stringify(v)}`
}

const errors = []
const done = []

for (const file of walk("src/content/posts")) {
  const parsed = parseFrontmatter(fs.readFileSync(file, "utf-8"))
  if (!parsed) { errors.push(`${file}: frontmatter parse error`); continue }

  const { fm, rest } = parsed
  if (!fm.title || !fm.date) { errors.push(`${file}: title/date 欠落`); continue }

  const slug = (fm.slug ?? kebabcase(fm.title)).replace(/^\/+|\/+$/g, "")
  const url = `${SITE_URL}/${slug}/`
  if (!SNAPSHOT.includes(url)) { errors.push(`${file}: スナップショットに無い URL → ${url}`); continue }

  const out = ["---"]
  out.push(`pubDatetime: ${fm.date}`)
  out.push(`title: ${JSON.stringify(fm.title)}`)
  if (fm.description) out.push(`description: ${JSON.stringify(fm.description)}`)
  if (fm.tags) out.push(`tags:${formatYamlValue(fm.tags)}`)
  out.push(`slug: ${JSON.stringify(slug)}`)
  out.push("---")
  fs.writeFileSync(file, out.join("\n") + rest)
  done.push(`${file} → ${url}`)
}

// ページ: src/content/pages/<name>/index.mdx → src/content/pages/<name>.mdx にフラット化
const pageDirs = fs.readdirSync("src/content/pages")
for (const dir of pageDirs) {
  const src = path.join("src/content/pages", dir, "index.mdx")
  if (!fs.existsSync(src)) continue
  const parsed = parseFrontmatter(fs.readFileSync(src, "utf-8"))
  const { fm, rest } = parsed
  const out = ["---"]
  out.push(`title: ${JSON.stringify(fm.title)}`)
  if (fm.description) out.push(`description: ${JSON.stringify(fm.description)}`)
  out.push("---")
  const dest = path.join("src/content/pages", `${dir}.mdx`)
  fs.writeFileSync(dest, out.join("\n") + rest)
  fs.rmSync(path.join("src/content/pages", dir), { recursive: true, force: true })
  console.log(`page: ${dest}`)
}

if (errors.length) {
  console.error("=== ERROR ===")
  console.error(errors.join("\n"))
  process.exit(1)
}
console.log(`migrated ${done.length} posts`)
```

- [ ] **Step 4: 実行**

Run: `node scripts/migration/migrate-frontmatter.mjs`
Expected: `migrated 109 posts` と出力され、errors が 0 件。エラーがあれば内容を確認して修正 (slug の揺れはスナップショット URL と照合して個別対応)。

補足: 一部の投稿は `tags` が YAML 配列でない形式 (`tags: - A - B`) の場合があるため、上記のパーサで `tags` が配列にならない場合は手動で正しい形式に直す。検証: `grep -l "^tags:" src/content/posts/*/*/*/index.mdx | wc -l` で 109 件を確認する。

- [ ] **Step 5: スラッグの重複チェック**

Run:

```bash
grep -rh "^slug:" src/content/posts | sort | uniq -d
```

Expected: 出力なし (重複 slug なし)

- [ ] **Step 6: ビルド検証**

Run: `npm run build`
Expected: 成功し、109 投稿 + 4 ページがビルドされる。エラーが出た場合は投稿の frontmatter 形式 (日付形式等) を確認。

```bash
find dist -name index.html | wc -l   # 110 以上 (投稿 109 + ページ + トップ)
```

- [ ] **Step 7: コミット**

```bash
git add -A
git commit -m "feat: migrate content to AstroPaper frontmatter with slug pinning"
```

---

### Task 5: URL 層の書き換え (ルート直下 URL 化)

**Files:**
- Modify: `src/utils/getPostPaths.ts`
- Move: `src/pages/posts/[...slug]/` → `src/pages/[...slug]/` (index.astro, index.png.ts, _components/)
- Modify: `src/pages/[...slug]/index.astro` (getStaticPaths / prevPost / nextPost の型)
- Modify: `src/pages/[...slug]/_components/AdjacentPostNav.astro`
- Modify: `src/pages/rss.xml.ts`
- Modify: `src/components/Card.astro`

**Interfaces:**
- Consumes: Task 4 で各投稿に `slug` frontmatter が焼き込まれていること
- Produces: 全投稿が `/<slug>/` で出力される。`getPostSlug(post)` と `getPostUrl(post, locale?)` が新シグネチャ (引数は CollectionEntry<"posts"> 全体)

- [ ] **Step 1: getPostPaths.ts を書き換え**

```ts
// src/utils/getPostPaths.ts
import { getRelativeLocaleUrl } from "astro:i18n";
import type { CollectionEntry } from "astro:content";
import config from "@/config";

/**
 * 投稿 URL は frontmatter の slug から直接導出する。
 * e.g. slug: "読書ログ-2026" → "/読書ログ-2026"
 */
export function getPostSlug(post: CollectionEntry<"posts">): string {
  return post.data.slug ?? post.id;
}

export function getPostUrl(
  post: CollectionEntry<"posts">,
  locale: string | undefined = config.site.lang
): string {
  return getRelativeLocaleUrl(locale, getPostSlug(post));
}
```

※ `getRelativeLocaleUrl("ja", "読書ログ-2026")` は defaultLocale かつ `prefixDefaultLocale: false` のため `/読書ログ-2026` を返す。

- [ ] **Step 2: 投稿ルートをルート直下へ移動**

```bash
git mv "src/pages/posts/[...slug]" "src/pages/[...slug]"
```

(注意: `src/pages/posts/` 全体は削除しない。`[...page].astro` は Task 6 で `/blog/` に変換するまで残す)

`src/pages/[...slug]/index.astro` と `index.png.ts` の `getStaticPaths` を新シグネチャに合わせる:

```ts
// index.astro 内
params: { slug: getPostSlug(post) },
```

`prevPost` / `nextPost` の props 型を `CollectionEntry<"posts"> | null` に変更し、`{ id, title, filePath }` のオブジェクトを渡すのをやめて投稿全体を渡す:

```ts
prevPost: index < sortedPosts.length - 1 ? sortedPosts[index + 1] : null,
nextPost: index > 0 ? sortedPosts[index - 1] : null,
```

`index.png.ts` も同様に `getPostSlug(post)` へ。

- [ ] **Step 3: AdjacentPostNav.astro を新シグネチャへ**

`AdjacentPostNav.astro` の props 型を変更する。`prevPost` / `nextPost` は `CollectionEntry<"posts"> | null` を受け取り、テンプレート内の参照も `prevPost.title` → `prevPost.data.title`、`prevPost.id` はそのまま。リンク生成は `getPostUrl(prevPost, locale)`。

- [ ] **Step 4: rss.xml.ts と Card.astro を新シグネチャへ**

`rss.xml.ts`:

```ts
items: sortedPosts.map((post) => ({
  link: getPostUrl(post, config.site.lang),
  title: post.data.title,
  description: post.data.description,
  pubDate: new Date(post.data.modDatetime ?? post.data.pubDatetime),
})),
```

`Card.astro`: `getPostUrl(id, filePath, Astro.currentLocale)` → `getPostUrl(Astro.props, Astro.currentLocale)` (Astro.props は `{ id, data, filePath }` を含むのでそのまま渡せる)。

- [ ] **Step 5: 残存参照の確認**

```bash
grep -rn "getPostSlug(\|getPostUrl(" src --include="*.astro" --include="*.ts"
```

Expected: すべて新シグネチャ (第 1 引数が投稿全体)。旧シグネチャのままの呼び出しがあれば修正。

- [ ] **Step 6: ビルドと URL 突合**

Run: `npm run build`

突合スクリプトを実行し、スナップショットの URL がすべて生成されていることを確認:

```bash
node --input-type=module -e '
import fs from "node:fs"
const snap = JSON.parse(fs.readFileSync("scripts/migration/url-snapshot.json", "utf-8")).all
const dist = new Set(
  fs.readdirSync("dist", { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(`dist/${e.name}/index.html`))
    .map((e) => `https://www.daycrift.net/${e.name}/`)
)
const missing = snap.filter((u) => {
  const path = u.replace("https://www.daycrift.net", "")
  // タグと後続タスクで追加するページは除外 (blog/favorite/newscast/resume)
  if (path.startsWith("/tags/")) return false
  if (["/blog/", "/favorite/", "/newscast/", "/resume/"].includes(path)) return false
  return !dist.has(u)
})
console.log("missing:", missing)
'
```

Expected: `missing: []` (タグ系は除外済み。`/blog/`, `/favorite/`, `/newscast/`, `/resume/` は後続タスクで追加されるため対象外)。

- [ ] **Step 7: コミット**

```bash
git add -A
git commit -m "feat: emit posts at root-level URLs (preserve existing slugs)"
```

---

### Task 6: ホーム再現 + /blog/ 一覧ページ

**Files:**
- Modify: `src/pages/index.astro` (hero + 草グラフ + Projects)
- Create: `src/pages/blog/[...page].astro` (`src/pages/posts/[...page].astro` のコピー + パス変更)

**Interfaces:**
- Consumes: Task 5 の URL 層
- Produces: `/` (hero + 投稿一覧 + Projects)、`/blog/` と `/blog/2/` 等の一覧ページ。ナビ「Blog」の遷移先

- [ ] **Step 1: /blog/ 一覧ページを作成**

`src/pages/posts/[...page].astro` を `src/pages/blog/[...page].astro` にコピーし、URL のプレフィックスを `posts` → `blog` に変更 (内部の `getRelativeLocaleUrl(locale, "posts...")` や isActive を blog に)。パンくず等の文言は `Blog` に。

```bash
mkdir -p src/pages/blog
cp "src/pages/posts/[...page].astro" "src/pages/blog/[...page].astro"
git rm "src/pages/posts/[...page].astro"
```

- [ ] **Step 2: ホームの hero セクションを差し替え**

`src/pages/index.astro` の `<section id="hero">` (「Mingalaba」の h1 がある部分) を次に置き換える:

```astro
<section id="hero" class="border-border border-b pt-8 pb-6">
  <h1 class="my-4 inline-block text-4xl font-bold sm:my-8 sm:text-5xl">
    CALL ME STUPID
  </h1>
  <p>
    ここはなに？ よくあるエンジニアのブログ
  </p>
  <a
    target="_blank"
    rel="noopener noreferrer"
    href="https://github.com/akerl/githubchart"
    class="mt-4 inline-block"
    title="grass graph"
  >
    <img
      src="https://d1q5p5okdzyz0p.cloudfront.net/grass-graph/grass-graph.svg"
      alt="GitHub grass graph"
      width="800"
      height="200"
      class="h-auto w-full max-w-2xl rounded border border-border"
    />
  </a>
  <p class="mt-2 text-sm">
    草(もっとがんばれ)
  </p>
  <a
    target="_blank"
    href={`${import.meta.env.BASE_URL.replace(/\/?$/, "/")}rss.xml`}
    class="inline-block"
    aria-label="RSS Feed"
    title="RSS Feed"
  >
    <IconRss width={20} height={20} class="stroke-accent scale-125 stroke-3" />
    <span class="sr-only">RSS Feed</span>
  </a>
</section>
```

※ 元の hero.mdx の内容: 「#### ここはなに？ / よくあるエンジニアのブログ」「#### 草(もっとがんばれ)」+ grass graph + `https://github.com/akerl/githubchart` 参照。草グラフ画像は S3 (CloudFront) の静的アセットなので外部 URL のまま埋め込む。

- [ ] **Step 3: Projects セクションをホーム末尾に追加**

`src/pages/index.astro` の投稿一覧の**後**に追加 (bottom.mdx の内容):

```astro
<section class="mt-12 border-t border-border pt-8">
  <h2 class="my-4 text-3xl font-bold">Projects</h2>
  <ul class="mt-4 space-y-4">
    <li>
      <h3 class="text-lg font-medium">
        <a class="text-accent hover:underline" href="https://github.com/youknowcast/nvim-cheats" target="_blank" rel="noopener noreferrer">nvim-cheats</a>
      </h3>
      <p>Hyprland layer application</p>
    </li>
    <li>
      <h3 class="text-lg font-medium">
        <a class="text-accent hover:underline" href="https://github.com/youknowcast/melrhohien" target="_blank" rel="noopener noreferrer">Melrhohien</a>
      </h3>
      <p>GUI application</p>
    </li>
  </ul>
</section>
```

- [ ] **Step 4: ビルド検証**

Run: `npm run build`
Expected: 成功。`dist/index.html` に「CALL ME STUPID」「ここはなに？」「Projects」が含まれ、`dist/blog/index.html` が存在する。

```bash
grep -o "CALL ME STUPID" dist/index.html | head -1
grep -o "grass-graph" dist/index.html | head -1
ls dist/blog/index.html
```

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "feat: rebuild home page (hero, grass graph, projects) and add /blog/ listing"
```

---

### Task 7: 固定ページ (favorite / newscast / resume / about)

**Files:**
- Create: `src/pages/favorite.astro`, `src/pages/newscast.astro`, `src/pages/resume.astro`
- Modify: `src/pages/about.astro` (不要な場合そのまま)
- Modify: `src/pages/[...slug]/index.astro` (favorite 等のページと URL 衝突がないことの確認)

**Interfaces:**
- Consumes: Task 4 の pages コレクション (`src/content/pages/{about,favorite,newscast,resume}.mdx`)
- Produces: `/favorite/`, `/newscast/`, `/resume/` が静的ページとして出力される。`/about/` は既存のまま

- [ ] **Step 1: about.astro の構造を確認して雛形をコピー**

`src/pages/about.astro` は `getEntry("pages", "about")` を `getEntry("pages", "favorite")` 等に変えるだけで再利用できる雛形。

```bash
cp src/pages/about.astro src/pages/favorite.astro
cp src/pages/about.astro src/pages/newscast.astro
cp src/pages/about.astro src/pages/resume.astro
```

- [ ] **Step 2: 各ページの getEntry 名を変更**

`favorite.astro` では `getEntry("pages", "favorite")`、`newscast.astro` では `getEntry("pages", "newscast")`、`resume.astro` では `getEntry("pages", "resume")` に変更。変数名 `about` → `page` にリネームし、`page.data.title` 等を参照するよう修正。

- [ ] **Step 3: ビルド検証**

Run: `npm run build`
Expected: 成功し `dist/about/`, `dist/favorite/`, `dist/newscast/`, `dist/resume/` に index.html が生成される。

```bash
ls dist/about/index.html dist/favorite/index.html dist/newscast/index.html dist/resume/index.html
```

- [ ] **Step 4: コミット**

```bash
git add -A
git commit -m "feat: add static pages (favorite, newscast, resume)"
```

---

### Task 8: 埋め込み移行 (Video / twitter script / mermaid 調整)

**Files:**
- Create: `src/components/Video.astro`
- Modify: `src/pages/[...slug]/index.astro` (`<Content components={{ Video }} />`)
- Modify: 5 投稿の `youtube:` 行 (変換)
- Modify: 4 投稿 + favorite ページの `widgets.js` script タグ (除去)
- Modify: `src/utils/mermaid-wrapper.astro` (data-graph の渡し方を修正)
- Modify: `package.json` (不要依存の削除)

**Interfaces:**
- Consumes: Task 5 の投稿ルート
- Produces: MDX で `<Video videoId="xxx" />` が使える。`youtube:` 構文が全滅していること。twitter blockquote が JS なしで表示されること

- [ ] **Step 1: Video コンポーネントを作成**

```astro
---
// src/components/Video.astro
interface Props {
  videoId: string
  title?: string
}
const { videoId, title } = Astro.props
---

<div class="relative my-4 aspect-video w-full overflow-hidden rounded border border-border">
  <iframe
    class="absolute inset-0 h-full w-full"
    src={`https://www.youtube.com/embed/${videoId}`}
    title={title ?? "YouTube video"}
    loading="lazy"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    referrerpolicy="strict-origin-when-cross-origin"
    allowfullscreen
  ></iframe>
</div>
```

- [ ] **Step 2: 投稿ルートで MDX components を注入**

`src/pages/[...slug]/index.astro` の `const { Content } = await render(post)` を:

```ts
const { Content } = await render(post, {
  components: { Video: (await import("../../components/Video.astro")).default },
});
```

※ `render()` の components オプションは Astro 7 の `render(post, { components })` 形式。構文が異なる場合は `astro:content` の `render` の型定義を確認して合わせる。

- [ ] **Step 3: youtube: 構文を変換**

5 記事 (`20200909_00_favorite_ASMR`, `20200920_01_base_guitar_plactice`, `20200920_watched_interstellar`, `20201101`, `20201107`) の `youtube:<id>` 行を `<Video videoId="<id>" />` に置換するスクリプトを実行:

```bash
node --input-type=module -e '
import fs from "node:fs"
const targets = [
  "src/content/posts/2020/09/20200909_00_favorite_ASMR/index.mdx",
  "src/content/posts/2020/09/20200920_01_base_guitar_plactice/index.mdx",
  "src/content/posts/2020/09/20200920_watched_interstellar/index.mdx",
  "src/content/posts/2020/11/20201101/index.mdx",
  "src/content/posts/2020/11/20201107/index.mdx",
]
let count = 0
for (const f of targets) {
  const raw = fs.readFileSync(f, "utf-8")
  const out = raw.replace(/`?youtube:([A-Za-z0-9_-]+)`?/g, (_m, id) => {
    count++
    return `<Video videoId="${id}" />`
  })
  fs.writeFileSync(f, out)
}
console.log("converted:", count)
'
```

Expected: `converted: N` (N ≥ 5)。変換後、`youtube:` の残存を確認:

```bash
grep -rn "youtube:" src/content/ | grep -v "youtube.com/watch\|youtu.be" 
```

Expected: 出力なし (説明文中のコード例は例外として許容し、内容を確認)

- [ ] **Step 4: twitter widgets.js を除去**

```bash
node --input-type=module -e '
import fs from "node:fs"
const targets = []
;(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = `${d}/${e.name}`
    if (e.isDirectory()) walk(p)
    else if (p.endsWith(".mdx")) targets.push(p)
  }
})("src/content")
let removed = 0
for (const f of targets) {
  const raw = fs.readFileSync(f, "utf-8")
  const out = raw.replace(/<script async src="https:\/\/platform\.twitter\.com\/widgets\.js"[^>]*><\/script>/g, () => { removed++; return "" })
  if (out !== raw) fs.writeFileSync(f, out)
}
console.log("removed scripts:", removed)
'
```

Expected: `removed scripts: 6` 以上 (20200908_using_gatsbyjs, 20200908_02_written_addendum_mindflare, 20200910_00_written_5th_fujimori_akari, 20200922 ×複数, favorite ページ)。blockquote 本体は残す。

- [ ] **Step 5: mermaid wrapper を仕上げる**

Task 2 の `src/utils/mermaid-wrapper.astro` を確認し、`data-graph` の設定が `astro:page-load` より前に走る場合は直接 props を埋める。最も確実な方法に置き換え (グラフ文字列が大きいため属性で渡す):

```astro
---
interface Props { graph: string }
const { graph } = Astro.props
const graphJson = JSON.stringify(graph)
---

<div class="not-prose my-4 overflow-x-auto" data-mermaid data-graph={graphJson}></div>

<script>
  import mermaid from "mermaid"

  const renderAll = async () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark"
    mermaid.initialize({ startOnLoad: false, theme: isDark ? "dark" : "default" })
    for (const el of document.querySelectorAll("[data-mermaid]")) {
      const graph = el.getAttribute("data-graph")
      if (!graph) continue
      try {
        const { svg } = await mermaid.render(`mmd-${Math.random().toString(36).slice(2)}`, JSON.parse(graph))
        el.innerHTML = svg
      } catch (e) {
        el.innerHTML = `<pre class="text-sm">${e instanceof Error ? e.message : String(e)}</pre>`
      }
    }
  }

  new MutationObserver(renderAll).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  })
  renderAll()
</script>
```

- [ ] **Step 6: 不要依存を削除**

`package.json` から `mdx-mermaid` を削除し、`npm uninstall mdx-mermaid @mdx-js/react @mdx-js/mdx gatsby-plugin-* gatsby-remark-*` の残りを確認 (Task 2 の scaffold で既に消えているはず。残っていれば削除)。

- [ ] **Step 7: ビルド検証**

Run: `npm run build`
Expected: 成功。動画変換記事 (`/20200909_00_favorite_ASMR/` 等)、mermaid 記事 (`/mermaid-使えるようにしてみた/` — 実際の slug はスナップショットを参照)、twitter 記事 (`/20200922/`) がビルドできる。

```bash
grep -l "youtube.com/embed" dist/*/index.html | head
```

Expected: 変換した 5 記事の dist/index.html に iframe が含まれる。

- [ ] **Step 8: コミット**

```bash
git add -A
git commit -m "feat: migrate embeds (Video component, twitter scripts cleanup, mermaid wrapper)"
```

---

### Task 9: 運用スクリプトの更新

**Files:**
- Modify: `scripts/insert_book_log.mjs`
- Modify: `scripts/add_newscast.mjs`
- Modify: `scripts/gen_today.mjs`
- Modify: `scripts/upload_images.mjs`, `scripts/clean.mjs` (必要なら)

**Interfaces:**
- Consumes: Task 4 の新しいパス構成 (`src/content/posts/<y>/<m>/<today>/index.mdx`, `src/content/pages/newscast.mdx`)
- Produces: 各スクリプトが新しい構成で動く

- [ ] **Step 1: insert_book_log.mjs のパスを動的化**

`BOOK_LOG_MDX_PATH` のハードコード (例: `"content/posts/2026/01/20260102/index.mdx"`) を、`src/content/posts` からタイトルが「読書ログ」で始まる最新記事を探して使うように変更:

```js
// 冒頭の定数定義を置き換え
const fs = require("fs-extra")
const path = require("path")

function findLatestBookLog() {
  const postsRoot = "src/content/posts"
  const candidates = []
  ;(function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (e.name === "index.mdx") {
        const raw = fs.readFileSync(p, "utf-8")
        const title = raw.match(/^title:\s*["']?([^"'\n]+)/m)?.[1] ?? ""
        if (title.startsWith("読書ログ")) candidates.push(p)
      }
    }
  })(postsRoot)
  candidates.sort()
  return candidates[candidates.length - 1]
}

const BOOK_LOG_MDX_PATH = findLatestBookLog()
```

※ zx 環境では `fs` / `fs-extra` が使える。従来 `fs.readFile` を使っていた箇所はそのまま。

- [ ] **Step 2: add_newscast.mjs のパスを更新**

```js
const NEWSCAST_MDX_PATH = "src/content/pages/newscast.mdx"
```

(フロントマター終端の検出ロジックはそのまま動作する。)

- [ ] **Step 3: gen_today.mjs を更新**

パスを `src/content/posts/${thisYear}/${thisMonth}/${today}` に、テンプレートの frontmatter を新しい形式に:

```js
const template = `---
pubDatetime: ${thisYear}-${thisMonth}-${thisDay}
title: ""
description: ""
tags:
  - Diary
---

### hello world
`
```

- [ ] **Step 4: upload_images.mjs / clean.mjs を確認・更新**

それぞれ内容を読み、Gatsby 固有のパス (`content/`, `public/`) を参照していれば新しい構成 (`src/content/`) に合わせる。upload_images.mjs は S3 アップロードのみなら変更不要。

- [ ] **Step 5: 動作検証**

```bash
node --check scripts/insert_book_log.mjs
node --check scripts/add_newscast.mjs
node --check scripts/gen_today.mjs
```

Expected: シンタックス OK。さらに `gen_today.mjs` を実行して記事が生成されることを確認し、生成されたファイルは削除:

```bash
./scripts/gen_today.mjs
git status --porcelain src/content   # 生成された新規ファイルを確認
# 生成された今日の記事ディレクトリのみを削除 (例: src/content/posts/2026/08/20260815/)
rm -rf <生成されたディレクトリ>
```

- [ ] **Step 6: コミット**

```bash
git add -A
git commit -m "chore: update utility scripts for Astro content structure"
```

---

### Task 10: CI/CD 更新

**Files:**
- Modify: `.github/workflows/s3-deploy.yml`
- Modify: `.github/workflows/check-building-blog.yml` (必要なら)

**Interfaces:**
- Consumes: Task 2 以降の build が `dist/` を生成すること
- Produces: master push で Astro サイトが S3 にデプロイされる

- [ ] **Step 1: s3-deploy.yml の sync 先を変更**

`aws s3 sync ./public s3://$S3_CONTENTS_BUCKET/` を:

```yaml
aws s3 sync ./dist s3://$S3_CONTENTS_BUCKET/ --delete --only-show-errors
```

に変更。CloudFront invalidation のステップはそのまま。

- [ ] **Step 2: check-building-blog.yml の検証**

内容を確認。`npm ci` → `npm run lint` → `npm run build` の流れは AstroPaper でもそのまま動く (eslint は flat config、build は astro check + build + pagefind)。変更不要ならそのまま。もし `npm run build` が pagefind で失敗する場合は `npx pagefind` を明示的に `npm run build` に含めない (AstroPaper の build script が既に含んでいる) ことを確認。

- [ ] **Step 3: ローカルで CI 相当を実行**

```bash
npm ci && npm run lint && npm run build
```

Expected: すべて成功 (lint は eslint 10 の flat config)

- [ ] **Step 4: コミット**

```bash
git add -A
git commit -m "ci: deploy dist to S3"
```

---

### Task 11: 総合検証 + クリーンアップ

**Files:**
- Delete: `scripts/migration/` (url-snapshot.json, snapshot-urls.mjs, migrate-frontmatter.mjs)
- Modify: `README.md` (Astro 版に書き換え)
- Modify: 必要な微調整 (404 日本語化、タイトル等)

**Interfaces:**
- Consumes: 全タスクの成果物
- Produces: 検証済み・クリーンな最終状態

- [ ] **Step 1: URL 完全一致検証**

ビルドして、スナップショットと生成 URL を最終比較 (タグ系は `/tags/<tag>/` を除いて厳密比較):

```bash
node --input-type=module -e '
import fs from "node:fs"
const snap = JSON.parse(fs.readFileSync("scripts/migration/url-snapshot.json", "utf-8")).all
const dist = new Set(
  fs.readdirSync("dist", { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(`dist/${e.name}/index.html`))
    .map((e) => `https://www.daycrift.net/${e.name}/`)
)
const missing = snap.filter((u) => {
  const p = u.replace("https://www.daycrift.net", "")
  return !(p.startsWith("/tags/") || p.endsWith(".xml")) && !dist.has(u)
})
if (missing.length) { console.error("MISSING:", missing); process.exit(1) }
console.log("all snapshot URLs present")
'
```

Expected: `all snapshot URLs present`

- [ ] **Step 2: リンク巡回チェック**

生成された全 HTML の内部リンクが存在することを確認:

```bash
node --input-type=module -e '
import fs from "node:fs"
import path from "node:path"
const htmls = []
;(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) walk(p)
    else if (e.name === "index.html") htmls.push(p)
  }
})("dist")
const broken = []
for (const h of htmls) {
  const content = fs.readFileSync(h, "utf-8")
  for (const m of content.matchAll(/href="(\/[^"#?]*)/g)) {
    const href = m[1]
    if (href.startsWith("http") || href.startsWith("mailto:")) continue
    const target = path.join("dist", href)
    if (!fs.existsSync(target) && !fs.existsSync(`${target}.html`) && !fs.existsSync(path.join(target, "index.html"))) {
      broken.push(`${h} → ${href}`)
    }
  }
}
console.log(broken.length ? broken.join("\n") : "no broken links")
'
```

Expected: `no broken links`

- [ ] **Step 3: ブラウザ表示確認 (chromium + puppeteer-core)**

```bash
mkdir -p /tmp/opencode/scratch && cd /tmp/opencode/scratch && npm install puppeteer-core 2>&1 | tail -1
```

以下のスクリプトで主要ページを確認する (スクリーンショットを `/tmp/opencode/` に保存):

```js
// /tmp/opencode/scratch/check.mjs
import puppeteer from "puppeteer-core"
import fs from "node:fs"

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  args: ["--no-sandbox"],
})
const page = await browser.newPage()

const targets = [
  ["/", "home"],
  ["/blog/", "blog"],
  ["/about/", "about"],
  ["/newscast/", "newscast"],
  ["/tags/", "tags"],
]
const postSlugs = ["読書ログ-2026", "using-gatsbyjs", "20200922"]  // mermaid / video 記事はスナップショットから正しい slug を確認
for (const s of postSlugs) targets.push([`/${s}/`, s])

for (const [url, name] of targets) {
  await page.goto(`http://localhost:4321${url}`, { waitUntil: "networkidle0" })
  await page.screenshot({ path: `/tmp/opencode/${name}.png`, fullPage: true })
  console.log(name, "OK:", await page.title())
}

// ダークモード切替
await page.goto("http://localhost:4321/", { waitUntil: "networkidle0" })
await page.click("button[aria-label*='theme' i], button[title*='theme' i]").catch(() => {})
await page.screenshot({ path: "/tmp/opencode/dark.png" })

await browser.close()
```

プレビューサーバー起動:

```bash
npm run preview &   # http://localhost:4321
sleep 3
node /tmp/opencode/scratch/check.mjs
```

Expected: 各ページのタイトルが正しく、スクリーンショットでレイアウト崩れがないこと。mermaid 記事・動画記事・twitter 記事の描画を目視確認 (mermaid グラフが描画され、iframe と blockquote が表示されている)。

- [ ] **Step 4: 移行スクリプトとスナップショットを削除**

```bash
git rm -r scripts/migration
```

- [ ] **Step 5: README を更新**

`README.md` を Astro 版に書き換え (起動方法: `npm install` → `npm run dev` / `npm run build`、デプロイ: GitHub Actions → S3、構成: AstroPaper ベース + 独自 URL 設計の説明)。

- [ ] **Step 6: 404 ページの日本語化 (必要なら)**

`src/pages/404.astro` の文言を日本語にする (「ページが見つかりません」等)。AstroPaper の i18n 辞書 (`src/i18n/lang/`) が en のままの場合は、最低限 404 とヘッダー/フッターの表示を ja に。

- [ ] **Step 7: 最終ビルド + コミット**

```bash
npm run build && npm run lint
git add -A
git commit -m "chore: final cleanup, update README"
```

Expected: ビルド・lint 成功、最終コミット完了。

---

## Self-Review メモ

- 仕様 4.1 (リポジトリ構成) → Task 2 / Task 4 / Task 11
- 仕様 4.2 (URL 戦略) → Task 1 / Task 4 / Task 5 / Task 11 (スナップショット突合)
- 仕様 4.3 (frontmatter 変換・ページ) → Task 4 / Task 7
- 仕様 4.4 (ホーム再現) → Task 6
- 仕様 4.5 (埋め込み) → Task 2 / Task 8
- 仕様 4.6 (機能: RSS/sitemap/タグ/ダークモード/検索/OGP/manifest/socials/404) → Task 3 / Task 5 / Task 6 / Task 11
- 仕様 4.7 (スクリプト) → Task 9
- 仕様 4.8 (CI/CD) → Task 10
- 仕様 5 (検証方法) → Task 11
