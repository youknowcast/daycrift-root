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
