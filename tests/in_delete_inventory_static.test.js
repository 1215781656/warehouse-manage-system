const fs = require('fs')
const path = require('path')

function run() {
  const p = path.join(__dirname, '..', 'src', 'apps', 'cloth-io', 'src', 'pages', 'In.vue')
  const s = fs.readFileSync(p, 'utf-8')
  const hasDeleteInv = /DELETE\s+FROM\s+cloth_inventory\s+WHERE\s+fabric_id/.test(s)
  if (!hasDeleteInv) throw new Error('未找到删除库存语句')
  console.log('[PASS] in_delete_inventory_static')
}

module.exports = { run }
