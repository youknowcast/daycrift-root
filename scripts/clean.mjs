#!/usr/bin/env zx

const target_paths = [
  "public/",
  "yarn-error.log",
]

async function _clean(path) {
  const command = `rm -fr ${path}`
  await $`${command.split(' ')}`
}

target_paths.forEach(async (path) => {
  await _clean(path)
})