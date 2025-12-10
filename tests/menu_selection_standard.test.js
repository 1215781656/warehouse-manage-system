const fs = require('fs')
const path = require('path')

function checkFile(p, patterns) {
  const s = fs.readFileSync(p, 'utf-8')
  for (const [desc, re] of patterns) {
    if (!re.test(s)) throw new Error(`${path.basename(p)} 缺少: ${desc}`)
  }
}

function run() {
  const files = [
    path.join(__dirname, '..', 'src', 'apps', 'cloth-io', 'src', 'pages', 'In.vue'),
    path.join(__dirname, '..', 'src', 'apps', 'cloth-io', 'src', 'pages', 'Out.vue'),
    path.join(__dirname, '..', 'src', 'apps', 'cloth-io', 'src', 'pages', 'Inventory.vue'),
    path.join(__dirname, '..', 'src', 'apps', 'cloth-io', 'src', 'pages', 'Payables.vue'),
    path.join(__dirname, '..', 'src', 'apps', 'cloth-io', 'src', 'pages', 'Receivables.vue'),
    path.join(__dirname, '..', 'src', 'apps', 'system-config', 'src', 'pages', 'Users.vue'),
  ]

  const patterns = [
    ['reserve-selection', /:reserve-selection="true"/],
    ['selection column selectable', /<el-table-column[^>]*type="selection"[^>]*:selectable/],
    ['selectAll state', /const\s+selectAll\s*=\s*ref\(/],
    ['selectedKeys set', /const\s+selectedKeys[\s\S]*?ref\(/],
    ['restoreSelection function', /const\s+restoreSelection\s*=\s*(async\s*)?\(/],
    ['onSelectionChange function', /const\s+onSelectionChange\s*=\s*(async\s*)?\(/],
    ['toggleSelectAll function', /const\s+toggleSelectAll\s*=\s*(async\s*)?\(/],
    ['selectionCount computed', /selectionCount\s*=\s*computed\(/],
  ]

  for (const f of files) checkFile(f, patterns)
  console.log('[PASS] menu_selection_standard')
}

module.exports = { run }
