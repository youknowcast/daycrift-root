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
  if (!fm.title || !(fm.date ?? fm.pubDatetime)) { errors.push(`${file}: title/date 欠落`); continue }

  const slug = (fm.slug ?? kebabcase(fm.title)).replace(/^\/+|\/+$/g, "")
  // NOTE: url-snapshot.json はパーセントエンコード済み URL のため、比較時に encodeURIComponent する
  const url = `${SITE_URL}/${encodeURIComponent(slug)}/`
  if (!SNAPSHOT.includes(url)) { errors.push(`${file}: スナップショットに無い URL → ${url}`); continue }

  const out = ["---"]
  out.push(`pubDatetime: ${fm.date ?? fm.pubDatetime}`)
  out.push(`title: ${JSON.stringify(fm.title)}`)
  // NOTE: description: "" (空文字) を落とさない (AstroPaper schema は description 必須)
  // そもそも description を持たない投稿 (1 件) は "" で補完する
  out.push(`description: ${JSON.stringify(fm.description ?? "")}`)
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
