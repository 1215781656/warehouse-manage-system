const Database = require('better-sqlite3')

function genItemCode(db, date) {
  const d = (String(date||'').slice(0,10) || new Date().toISOString().slice(0,10)).replace(/-/g,'')
  const yymm = d.slice(2,6)
  const row = db.prepare(`
    SELECT MAX(CAST(substr(code, 5, 3) AS INTEGER)) AS max_seq FROM (
      SELECT item_code AS code FROM stock_in_records WHERE item_code LIKE ?
      UNION ALL
      SELECT item_code AS code FROM stock_out_records WHERE item_code LIKE ?
      UNION ALL
      SELECT item_code AS code FROM cloth_inventory WHERE item_code LIKE ?
    )
  `).get(`${yymm}%`, `${yymm}%`, `${yymm}%`)
  const n = Number((row && row.max_seq) || 0) + 1
  if (n > 999) throw new Error('当月编号已达上限')
  return `${yymm}${String(n).padStart(3,'0')}`
}

function isValid(code) {
  const s = String(code||'')
  if (!/^\d{7}$/.test(s)) return false
  const mm = Number(s.slice(2,4))
  if (mm < 1 || mm > 12) return false
  const seq = Number(s.slice(4))
  return seq >= 1 && seq <= 999
}

function setupDb() {
  const db = new Database(':memory:')
  db.exec(`
    CREATE TABLE stock_in_records (item_code TEXT);
    CREATE TABLE stock_out_records (item_code TEXT);
    CREATE TABLE cloth_inventory (item_code TEXT PRIMARY KEY);
  `)
  return db
}

async function testPattern() {
  const db = setupDb()
  const code = genItemCode(db, '2025-12-08')
  if (!isValid(code)) throw new Error('编码格式校验失败')
  if (!code.startsWith('2512')) throw new Error('YYMM 前缀错误')
}

async function testSequential() {
  const db = setupDb()
  const codes = []
  for (let i=0; i<10; i++) {
    const c = genItemCode(db, '2025-12-08')
    codes.push(c)
    db.prepare('INSERT INTO cloth_inventory (item_code) VALUES (?)').run(c)
  }
  const seqs = codes.map(c=> Number(c.slice(4)))
  for (let i=1; i<seqs.length; i++) {
    if (seqs[i] !== seqs[i-1]+1) throw new Error('序列未按递增生成')
  }
}

async function testConcurrency() {
  const db = setupDb()
  const tasks = Array.from({length: 50}, (_,i)=> Promise.resolve().then(()=>{
    const c = genItemCode(db, '2025-12-08')
    db.prepare('INSERT INTO cloth_inventory (item_code) VALUES (?)').run(c)
    return c
  }))
  const codes = await Promise.all(tasks)
  const set = new Set(codes)
  if (set.size !== codes.length) throw new Error('并发生成产生重复编码')
}

async function testOverflow() {
  const db = setupDb()
  for (let i=1; i<=999; i++) {
    const c = `2512${String(i).padStart(3,'0')}`
    db.prepare('INSERT INTO cloth_inventory (item_code) VALUES (?)').run(c)
  }
  let ok = false
  try { genItemCode(db, '2025-12-08') } catch (e) { ok = true }
  if (!ok) throw new Error('超过上限未抛出错误')
}

async function run() {
  const cases = [testPattern, testSequential, testConcurrency, testOverflow]
  for (const fn of cases) {
    await fn()
    console.log(`[PASS] ${fn.name}`)
  }
}

module.exports = { run }

