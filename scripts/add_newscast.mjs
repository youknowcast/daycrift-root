#!/usr/bin/env zx

//
// add newscast entry interactively
// requirements:
//   [zx](https://github.com/google/zx)
//   installation: `yarn global add zx`
// usage:
//   % cd /path/to/daycrift-root
//   % ./scripts/add_newscast.mjs
//

const NEWSCAST_MDX_PATH = "content/pages/newscast/index.mdx"

// 対話型で入力を取得
const url = await question("URL: ")
if (!url.trim()) {
  console.error("URL is required")
  process.exit(1)
}

const comment = await question("Comment (optional): ")

// 現在の日付を取得
const current = new Date()
const padding = (num) => num.toString().padStart(2, "0")
const today = `${current.getFullYear()}/${padding(current.getMonth() + 1)}/${padding(current.getDate())}`

// 既存ファイルを読み込む
const fileContent = await fs.readFile(NEWSCAST_MDX_PATH, "utf-8")

// frontmatter の終了位置を見つける (2つ目の --- の後)
const frontmatterEnd = fileContent.indexOf("---", 4) + 3

// 先頭部分と本文を分離
const frontmatter = fileContent.slice(0, frontmatterEnd)
const body = fileContent.slice(frontmatterEnd)

// 本文から既存の最初の日付セクションを探す
const firstDateMatch = body.match(/\n##### \d{4}\/\d{2}\/\d{2}/)

// 新しいエントリを作成
let newEntry = `\n##### ${today}\n\n`
if (comment.trim()) {
  newEntry += `${comment.trim()}  \n`
}
newEntry += `${url.trim()}\n`

let newContent
if (firstDateMatch) {
  // 既存の最初の日付セクションの前に新しいエントリを挿入
  const insertPosition = frontmatterEnd + firstDateMatch.index
  newContent = fileContent.slice(0, insertPosition) + newEntry + fileContent.slice(insertPosition + 1)
} else {
  // 日付セクションがない場合は frontmatter の後に追加
  newContent = frontmatter + newEntry + body
}

// ファイルを更新
await fs.writeFile(NEWSCAST_MDX_PATH, newContent)

console.log(`\n✅ Added newscast entry:`)
console.log(`   Date: ${today}`)
console.log(`   URL: ${url.trim()}`)
if (comment.trim()) {
  console.log(`   Comment: ${comment.trim()}`)
}

// git commit するか確認
const shouldCommit = await question("\nCommit changes? (y/N): ")
if (shouldCommit.toLowerCase() === "y") {
  await $`git add ${NEWSCAST_MDX_PATH}`
  await $`git commit -m "feat: add newscast entry"`
  console.log("✅ Committed!")
} else {
  console.log("Changes saved but not committed.")
}
