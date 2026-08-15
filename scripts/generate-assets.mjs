#!/usr/bin/env node
// CALL ME STUPID 用オリジナルアセット生成スクリプト
// usage: node scripts/generate-assets.mjs
import sharp from "sharp"
import fs from "node:fs"

const ACCENT = "#006cac"
const FG = "#282728"
const MUTED = "#6b7280"
const BG = "#fdfdfd"
const FONT = "Noto Sans, sans-serif"

// --- OG 画像 (1200x630) ---
function ogSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${BG}"/>
  <rect width="1200" height="12" fill="${ACCENT}"/>
  <text x="600" y="280" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="96" fill="${FG}">CALL ME STUPID</text>
  <text x="600" y="356" text-anchor="middle" font-family="${FONT}" font-weight="400" font-size="36" letter-spacing="12" fill="${MUTED}">DAYCRIFT.NET</text>
  <text x="600" y="430" text-anchor="middle" font-family="${FONT}" font-weight="400" font-size="28" fill="${MUTED}">engineer blog.</text>
</svg>`
}

// --- ファビコン (角丸四角 + CMS モノグラム) ---
function iconSvg(size) {
  const fs = Math.round(size * 0.42)
  const rx = Math.round(size * 0.22)
  const y = Math.round(size * 0.5 + fs * 0.36)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${rx}" fill="${ACCENT}"/>
  <text x="${size / 2}" y="${y}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="${fs}" fill="#ffffff">CMS</text>
</svg>`
}

// --- ICO コンテナ生成 (PNG 埋め込み、Vista+ 対応形式) ---
function buildIco(pngs) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(pngs.length, 4)
  let offset = 6 + 16 * pngs.length
  const chunks = [header]
  for (const [w, data] of pngs) {
    const e = Buffer.alloc(16)
    e.writeUInt8(w >= 256 ? 0 : w, 0)
    e.writeUInt8(w >= 256 ? 0 : w, 1)
    e.writeUInt8(0, 2)
    e.writeUInt8(0, 3)
    e.writeUInt16LE(1, 4)
    e.writeUInt16LE(32, 6)
    e.writeUInt32LE(data.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += data.length
    chunks.push(e, data)
  }
  return Buffer.concat(chunks)
}

async function svgToPng(svg, size) {
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer()
}

const og = await sharp(Buffer.from(ogSvg())).png().toFile("public/og-default.png")
console.log("og-default.png:", og.width, "x", og.height)

const iconPngs = {}
for (const size of [16, 32, 192, 512, 180]) {
  const buf = await svgToPng(iconSvg(size), size)
  const name =
    size === 180 ? "apple-touch-icon.png" : `favicon-${size}x${size}.png`
  if (size === 180) {
    fs.writeFileSync("public/apple-touch-icon.png", buf)
    fs.writeFileSync("public/apple-touch-icon-precomposed.png", buf)
  } else {
    fs.writeFileSync(`public/${name}`, buf)
  }
  iconPngs[size] = buf
  console.log(name, "OK")
}
fs.writeFileSync("public/android-chrome-192x192.png", iconPngs[192])
fs.writeFileSync("public/android-chrome-512x512.png", iconPngs[512])
console.log("android-chrome-192x192.png / android-chrome-512x512.png OK")

fs.writeFileSync("public/favicon.ico", buildIco([[16, iconPngs[16]], [32, iconPngs[32]]]))
console.log("favicon.ico OK")

console.log("done")
