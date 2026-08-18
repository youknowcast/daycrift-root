#!/usr/bin/env zx

const target_paths = [
  ".astro/",
  "dist/",
  "public/pagefind/",
  "npm-debug.log",
]

async function _clean(path) {
  const command = `rm -fr ${path}`
  await $`${command.split(' ')}`
}

await Promise.all(target_paths.map((path) => _clean(path)))
