const fs = require('fs')
const path = require('path')
const sizeOf = require('image-size')
const toIco = require('to-ico')
const ICO = require('icojs')

const ASSETS_DIR = path.join(process.cwd(), 'electron', 'assets')
const OUT_ICO = path.join(ASSETS_DIR, 'app-icon.ico')
const OUT_TRAY = path.join(ASSETS_DIR, 'tray.png')

function findPngs() {
  const files = fs.readdirSync(ASSETS_DIR)
  return files.filter(f => f.toLowerCase().endsWith('.png')).map(f => path.join(ASSETS_DIR, f))
}

function findIco() {
  const files = fs.readdirSync(ASSETS_DIR)
  const ico = files.find(f => f.toLowerCase().endsWith('.ico'))
  return ico ? path.join(ASSETS_DIR, ico) : null
}

function pickBySize(paths) {
  const want = [16, 32, 48, 256]
  const picked = {}
  for (const p of paths) {
    try {
      const dim = sizeOf(p)
      if (want.includes(dim.width) && dim.width === dim.height) {
        picked[dim.width] = picked[dim.width] || p
      }
    } catch {}
  }
  // fallback：按文件名包含尺寸关键字
  for (const size of want) {
    if (!picked[size]) {
      const hit = paths.find(p => new RegExp(`[-_.]${size}(x|x${size})?`, 'i').test(path.basename(p)))
      if (hit) picked[size] = hit
    }
  }
  return picked
}

async function main() {
  const pngs = findPngs()
  if (pngs.length === 0) {
    const icoPath = findIco()
    if (icoPath) {
      // 直接使用现有 ICO
      try { fs.copyFileSync(icoPath, OUT_ICO); console.log('ICO copied:', OUT_ICO) } catch {}
      // 尝试从 ICO 提取 16x16 作为托盘 PNG
      try {
        const buf = fs.readFileSync(icoPath)
        const images = await ICO.parse(buf, 'image/png')
        const img16 = images.find(i => i.width === 16 && i.height === 16) || images[0]
        if (img16 && img16.buffer) {
          fs.writeFileSync(OUT_TRAY, Buffer.from(img16.buffer))
          console.log('Tray PNG extracted:', OUT_TRAY)
        }
      } catch {}
      return
    }
    console.error('No PNGs or ICO in electron/assets; please add icon-16/32/48/256.png or an ico file')
    process.exit(1)
  }
  const picked = pickBySize(pngs)
  const ordered = [picked[256], picked[48], picked[32], picked[16]].filter(Boolean)
  if (ordered.length === 0) {
    console.error('No valid PNG sizes found (need one of 16/32/48/256).')
    process.exit(1)
  }
  try {
    const bufs = ordered.map(p => fs.readFileSync(p))
    const buf = await toIco(bufs)
    fs.writeFileSync(OUT_ICO, buf)
    console.log('ICO written:', OUT_ICO)
  } catch (e) {
    console.error('ICO build failed:', e.message)
    process.exit(1)
  }
  // tray.png：优先使用 16×16，否则 32×32
  const traySrc = picked[16] || picked[32]
  if (traySrc) {
    try {
      fs.copyFileSync(traySrc, OUT_TRAY)
      console.log('Tray PNG copied:', OUT_TRAY)
    } catch {}
  }
}

main()
