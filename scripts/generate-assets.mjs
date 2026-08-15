#!/usr/bin/env node
// banner.png からスクエアアイコン (android-chrome / apple-touch) を生成するスクリプト
// usage: node scripts/generate-assets.mjs
import sharp from "sharp"

const SRC = "public/banner.png"

const { width, height } = await sharp(SRC).metadata()
const side = Math.min(width, height)
const left = Math.round((width - side) / 2)
const top = Math.round((height - side) / 2)

const targets = [
  [192, "public/android-chrome-192x192.png"],
  [512, "public/android-chrome-512x512.png"],
  [180, "public/apple-touch-icon.png"],
  [180, "public/apple-touch-icon-precomposed.png"],
]

for (const [size, out] of targets) {
  await sharp(SRC)
    .extract({ left, top, width: side, height: side })
    .resize(size, size)
    .png()
    .toFile(out)
  console.log(`${out} (${size}x${size}) OK`)
}

console.log("done")
