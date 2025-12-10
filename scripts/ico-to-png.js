const { app, nativeImage } = require('electron')
const fs = require('fs')
const path = require('path')

const ASSETS_DIR = path.join(process.cwd(), 'electron', 'assets')
function findIco() {
  const files = fs.readdirSync(ASSETS_DIR)
  const ico = files.find(f => f.toLowerCase().endsWith('.ico'))
  return ico ? path.join(ASSETS_DIR, ico) : null
}
const OUT_TRAY = path.join(ASSETS_DIR, 'tray.png')

app.whenReady().then(() => {
  try {
    const icoPath = findIco()
    if (!icoPath) {
      console.error('No .ico file found in', ASSETS_DIR)
      process.exit(1)
    }
    const img = nativeImage.createFromPath(icoPath)
    if (!img || img.isEmpty()) {
      console.error('ICO unreadable:', icoPath)
      process.exit(1)
    }
    const trayImg = img.resize({ width: 16, height: 16 })
    const buf = trayImg.toPNG()
    fs.writeFileSync(OUT_TRAY, buf)
    console.log('Tray PNG written:', OUT_TRAY)
  } catch (e) {
    console.error('ICO to PNG failed:', e.message)
    process.exit(1)
  } finally {
    app.quit()
  }
})
