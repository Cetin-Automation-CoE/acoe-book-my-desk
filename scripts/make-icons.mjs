// Generates placeholder PWA icons (solid brand background + simple desk/seat glyph)
// without any image dependencies. Replace the PNGs in public/ with real artwork later.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const BRAND = [0x30, 0x00, 0x91]
const ACCENT = [0xf1, 0x2e, 0x49]
const WHITE = [0xff, 0xff, 0xff]

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
mkdirSync(outDir, { recursive: true })

function crc32(buf) {
  let crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) {
    let c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function inRoundedRect(x, y, rx, ry, rw, rh, r) {
  if (x < rx || x >= rx + rw || y < ry || y >= ry + rh) return false
  const cx = Math.max(rx + r, Math.min(x, rx + rw - r))
  const cy = Math.max(ry + r, Math.min(y, ry + rh - r))
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}

function pixel(x, y, size, padding) {
  const s = size
  const p = padding
  const u = (x - p) / (s - 2 * p)
  const v = (y - p) / (s - 2 * p)
  if (u < 0 || u > 1 || v < 0 || v > 1) return BRAND
  // Desk: wide rounded bar across the lower third.
  if (inRoundedRect(u, v, 0.14, 0.58, 0.72, 0.14, 0.04)) return WHITE
  // Desk legs.
  if (inRoundedRect(u, v, 0.2, 0.72, 0.08, 0.14, 0.02)) return WHITE
  if (inRoundedRect(u, v, 0.72, 0.72, 0.08, 0.14, 0.02)) return WHITE
  // Seat: red rounded square above the desk.
  if (inRoundedRect(u, v, 0.36, 0.26, 0.28, 0.24, 0.07)) return ACCENT
  return BRAND
}

function png(size, padding) {
  const raw = Buffer.alloc((size * 3 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y, size, padding)
      const i = y * (size * 3 + 1) + 1 + x * 3
      raw[i] = r
      raw[i + 1] = g
      raw[i + 2] = b
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // RGB
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const files = [
  ['pwa-192x192.png', 192, 0],
  ['pwa-512x512.png', 512, 0],
  ['pwa-maskable-512x512.png', 512, 64],
  ['apple-touch-icon.png', 180, 0],
]
for (const [name, size, padding] of files) {
  writeFileSync(join(outDir, name), png(size, padding))
  console.log('wrote', name)
}

const hex = (c) => '#' + c.map((n) => n.toString(16).padStart(2, '0')).join('')
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="18" fill="${hex(BRAND)}"/>
  <rect x="14" y="58" width="72" height="14" rx="4" fill="${hex(WHITE)}"/>
  <rect x="20" y="72" width="8" height="14" rx="2" fill="${hex(WHITE)}"/>
  <rect x="72" y="72" width="8" height="14" rx="2" fill="${hex(WHITE)}"/>
  <rect x="36" y="26" width="28" height="24" rx="7" fill="${hex(ACCENT)}"/>
</svg>
`
writeFileSync(join(outDir, 'icon.svg'), svg)
console.log('wrote icon.svg')
