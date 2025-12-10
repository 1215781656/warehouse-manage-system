const Database = require('better-sqlite3')

function buildWhere(s) {
  const conds = []
  const params = []
  if (s.item_name) { conds.push('item_name LIKE ?'); params.push(`%${s.item_name}%`) }
  if (s.composition) { conds.push('composition LIKE ?'); params.push(`%${s.composition}%`) }
  if (s.gram_weight !== undefined && s.gram_weight !== '') { conds.push('gram_weight = ?'); params.push(Number(s.gram_weight)) }
  if (s.width_cm !== undefined && s.width_cm !== '') { conds.push('width_cm = ?'); params.push(Number(s.width_cm)) }
  if (s.color) { conds.push('color LIKE ?'); params.push(`%${s.color}%`) }
  if (s.color_no) { conds.push('color_no LIKE ?'); params.push(`%${s.color_no}%`) }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  return { where, params }
}

function searchInventoryPaged(db, s) {
  const pageSize = Number(s.pageSize || 10)
  const page = Number(s.page || 1)
  const { where, params } = buildWhere(s)
  const total = db.prepare(`SELECT COUNT(1) AS c FROM cloth_inventory ${where}`).get(...params).c
  const rows = db.prepare(
    `SELECT fabric_id, item_name, composition, gram_weight, width_cm, color, color_no, total_in_rolls, total_in_weight, total_out_rolls, total_out_weight, current_rolls, current_weight, last_updated
     FROM cloth_inventory ${where} ORDER BY last_updated DESC LIMIT ? OFFSET ?`
  ).all(...params, pageSize, (page - 1) * pageSize)
  return { rows, total }
}

function seed(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cloth_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fabric_id TEXT UNIQUE,
      item_name TEXT,
      color TEXT,
      color_no TEXT,
      composition TEXT,
      gram_weight INTEGER,
      width_cm INTEGER,
      current_rolls INTEGER DEFAULT 0,
      current_weight REAL DEFAULT 0,
      total_in_rolls INTEGER DEFAULT 0,
      total_in_weight REAL DEFAULT 0,
      total_out_rolls INTEGER DEFAULT 0,
      total_out_weight REAL DEFAULT 0,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_ci_item_name ON cloth_inventory(item_name);
    CREATE INDEX IF NOT EXISTS idx_ci_composition ON cloth_inventory(composition);
    CREATE INDEX IF NOT EXISTS idx_ci_gram_weight ON cloth_inventory(gram_weight);
    CREATE INDEX IF NOT EXISTS idx_ci_width_cm ON cloth_inventory(width_cm);
    CREATE INDEX IF NOT EXISTS idx_ci_color ON cloth_inventory(color);
    CREATE INDEX IF NOT EXISTS idx_ci_color_no ON cloth_inventory(color_no);
    CREATE INDEX IF NOT EXISTS idx_ci_last_updated ON cloth_inventory(last_updated);
  `)
  const stmt = db.prepare(`INSERT INTO cloth_inventory (fabric_id, item_name, color, color_no, composition, gram_weight, width_cm, current_rolls, current_weight, total_in_rolls, total_in_weight, total_out_rolls, total_out_weight, last_updated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  const now = new Date().toISOString()
  for (let i = 1; i <= 123; i++) {
    stmt.run(
      `F${i}`,
      i % 2 === 0 ? 'T/C 双面' : 'CVC 斜纹',
      i % 3 === 0 ? '红' : (i % 3 === 1 ? '蓝' : '黑'),
      `C${i % 10}`,
      i % 2 === 0 ? 'T/C' : 'CVC',
      180 + (i % 5) * 10,
      150 + (i % 3) * 5,
      i % 20,
      i % 50,
      i,
      i * 1.2,
      Math.floor(i / 2),
      i * 0.6,
      now
    )
  }
}

function assert(cond, msg) { if (!cond) throw new Error(msg) }

function run() {
  const db = new Database(':memory:')
  seed(db)
  const t1 = Date.now()
  const { rows: r1, total: tot1 } = searchInventoryPaged(db, { page: 1, pageSize: 10 })
  const d1 = Date.now() - t1
  assert(tot1 === 123, '总数不正确')
  assert(r1.length === 10, '第一页数量应为10')
  const t2 = Date.now()
  const { rows: r2, total: tot2 } = searchInventoryPaged(db, { item_name: 'CVC', page: 2, pageSize: 20 })
  const d2 = Date.now() - t2
  assert(tot2 > 0, '过滤后总数应大于0')
  assert(r2.length <= 20, '第二页数量不应超过20')
  const t3 = Date.now()
  const { rows: r3, total: tot3 } = searchInventoryPaged(db, { gram_weight: 200, color: '红', page: 1, pageSize: 50 })
  const d3 = Date.now() - t3
  assert(r3.every(x => x.gram_weight === 200), '克重过滤失败')
  console.log(JSON.stringify({ ok: true, perf: { d1, d2, d3 }, totals: { tot1, tot2, tot3 }, samples: { r1: r1.length, r2: r2.length, r3: r3.length } }, null, 2))
}

try { run() } catch (e) { console.error('TEST FAILED:', e.message); process.exit(1) }

