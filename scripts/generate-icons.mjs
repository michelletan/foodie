// Regenerates PWA/home-screen icons from public/favicon.svg. Re-run this
// (`npm run icons`) whenever that source SVG changes.
import { readFileSync } from 'node:fs'
import sharp from 'sharp'

const source = readFileSync(new URL('../public/favicon.svg', import.meta.url))

const jobs = [
  [192, 'public/icons/icon-192.png'],
  [512, 'public/icons/icon-512.png'],
  [180, 'public/apple-touch-icon.png'],
]

for (const [size, out] of jobs) {
  await sharp(source, { density: 384 }).resize(size, size).png().toFile(out)
  console.log('wrote', out)
}
