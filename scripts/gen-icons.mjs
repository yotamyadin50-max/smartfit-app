import sharp from 'sharp'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const tigerPath = resolve(root, 'tiger.png')

// Step 1: get tiger metadata
const meta = await sharp(tigerPath).metadata()
const W = meta.width
const H = meta.height

// Step 2: Paint tiger as a solid vivid purple silhouette — full coverage, all pixels same color
// Resize tiger so it fits fully inside the canvas with padding on all sides
const tigerFitSize = Math.round(W * 0.88)
const tigerTop = Math.round(H * 0.04)  // push up slightly to leave room for text at bottom

const blackTigerBuf = await sharp(tigerPath)
  .ensureAlpha()
  .resize(tigerFitSize, Math.round(H * 0.72), { fit: 'inside' })
  .linear([0, 0, 0, 1], [130, 45, 215, 0])  // every pixel → rgb(130,45,215), keep alpha
  .png()
  .toBuffer()

// Get resized tiger dimensions to center it
const tigerMeta = await sharp(blackTigerBuf).metadata()
const tigerLeft = Math.round((W - tigerMeta.width) / 2)

// Step 3: Build a static dark-purple background matching the app
// App bg: #070c18 with a subtle purple blob like the lava-lamp background (frozen)
// We'll use SVG for the background gradient
const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <radialGradient id="bg" cx="38%" cy="32%" r="80%">
      <stop offset="0%" stop-color="#1a0a3a"/>
      <stop offset="55%" stop-color="#0d0620"/>
      <stop offset="100%" stop-color="#070c18"/>
    </radialGradient>
    <radialGradient id="b1" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#6010c0" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#6010c0" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="b2" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#3a0880" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#3a0880" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <ellipse cx="${W * 0.35}" cy="${H * 0.38}" rx="${W * 0.55}" ry="${H * 0.45}" fill="url(#b1)"/>
  <ellipse cx="${W * 0.70}" cy="${H * 0.65}" rx="${W * 0.45}" ry="${H * 0.40}" fill="url(#b2)"/>
</svg>`

const bgBuf = Buffer.from(bgSvg)

// Step 4: Composite tiger + text over background
const textSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <text
    x="${W / 2}" y="${H - 28}"
    text-anchor="middle"
    font-family="Arial Black, Arial, sans-serif"
    font-weight="900"
    font-size="${Math.round(W * 0.09)}px"
    letter-spacing="${Math.round(W * 0.012)}"
    fill="#8230d8"
  >Ascend AI</text>
</svg>`

const finalBuf = await sharp(bgBuf)
  .composite([
    { input: blackTigerBuf, blend: 'over', top: tigerTop, left: tigerLeft },
    { input: Buffer.from(textSvg), blend: 'over' },
  ])
  .png()
  .toBuffer()

// Step 5: Output all needed sizes
const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
for (const size of sizes) {
  await sharp(finalBuf)
    .resize(size, size)
    .png()
    .toFile(resolve(root, `public/icons/icon-${size}.png`))
  console.log(`✓ icon-${size}.png`)
}

await sharp(finalBuf).resize(32, 32).png().toFile(resolve(root, 'public/favicon.png'))
console.log('✓ favicon.png')

// Also save a preview
await sharp(finalBuf).resize(512, 512).png().toFile(resolve(root, 'public/icon-preview.png'))
console.log('✓ icon-preview.png (512px preview)')

console.log('Done.')
