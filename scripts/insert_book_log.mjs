#!/usr/bin/env zx

//
// register read book log to current book log
// requirements:
//   [zx](https://github.com/google/zx)
//   installation: `npm install -g zx`
// usage:
//   % cd /path/to/daycrift-root
//   % ./scripts/insert_book_log {book_name} --date 2022-10-14
// --date is optional. default date is current day
//

// zx exposes `fs` (fs-extra) and `path` as globals
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

// filename is deleted from zx 8.x >=
const bookName = argv._[0]
if (bookName === undefined) {
  console.error("book_name is not specified")
  await $`exit`
}
const date = argv.date || (new Date()).toISOString().substr(0, 10)

const fileContent = await fs.readFile(BOOK_LOG_MDX_PATH, 'utf-8')

// 最後の文字が改行でない場合、改行を追加
if (!fileContent.endsWith('\n')) {
  fs.outputFileSync(BOOK_LOG_MDX_PATH, '\n', { flag: "a+" })
}

const bookLog = `|${bookName}|${date}| |`
fs.outputFileSync(BOOK_LOG_MDX_PATH, bookLog, { flag: "a+" })

const commitLog = "feat: update book log"

await $`git add ${BOOK_LOG_MDX_PATH}`
await $`git commit -m ${commitLog}`

console.log("updated book log and committed.")
