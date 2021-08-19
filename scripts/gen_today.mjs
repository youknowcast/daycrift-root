#!/usr/bin/env zx

//
// generate today blog template
// requirements:
//   [zx](https://github.com/google/zx)
//   installation: `yarn global add zx`
// usage:
//   % cd /path/to/daycrift-root
//   % ./scripts/gen_today.mjs
//

const current = new Date()
const padding = (num) => {
  const str = num.toString()
  return num.toString().length < 2 ? `0${str}` : str
}
const thisYear = `${current.getFullYear()}`
const thisMonth = padding(current.getMonth() + 1)
const thisDay = padding(current.getDate())
const today = `${thisYear}${thisMonth}${thisDay}`

const path = `content/posts/${thisYear}/${thisMonth}/${today}`
console.log(`generate ${path}`)
await $`mkdir -p ${path}`

const template = `---
title: ""
description: ""
date: ${thisYear}-${thisMonth}-${thisDay}
tags:
  - Diary
---

### hello world
`

const indexPath = `${path}/index.mdx`
const exists = await fs.pathExists(indexPath)
if (!exists) {
  await fs.outputFile(indexPath, template)
} else {
  console.log(`index.mdx is already generated!`)
}