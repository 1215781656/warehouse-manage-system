const { app, BrowserWindow, Menu, ipcMain, dialog, Tray, nativeImage } = require('electron')
const path = require('path')
const Database = require('better-sqlite3')
const fs = require('fs')
// 简化登录验证，去除 bcrypt

let mainWindow
let db
let tray
let isQuiting = false
let autoExitTimer = null
const AUTO_EXIT_MS = Number(process.env.AUTO_EXIT_MS || 0)

// 创建数据库连接
function createDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'warehouse.db')
  
  // 如果数据库文件不存在，创建它
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, '')
  }
  
  db = new Database(dbPath)
  
  // 启用外键约束
  db.pragma('foreign_keys = ON')
  
  return db
}

// 初始化数据库表结构
function initializeDatabase() {
  if (!db) {
    createDatabase()
  }
  try {
    const v = db.pragma('user_version', { simple: true })
    if (!Number.isInteger(v) || v < 1) {
      db.pragma('foreign_keys = ON')
    }
  } catch {}
  try {
    const ci = db.prepare("PRAGMA table_info(cloth_inventory)").all()
    const ciNames = new Set(ci.map(i=>i.name))
    if (ciNames.size && !ciNames.has('fabric_id')) {
      db.exec(`
        DROP INDEX IF EXISTS idx_ci_fabric_id;
        DROP INDEX IF EXISTS idx_ci_item_code;
        DROP TABLE IF EXISTS cloth_inventory;
      `)
    }
  } catch {}
  try {
    const sir = db.prepare("PRAGMA table_info(stock_in_records)").all()
    const sirNames = new Set(sir.map(i=>i.name))
    if (sirNames.size && !sirNames.has('fabric_id')) {
      db.exec(`
        DROP INDEX IF EXISTS idx_sir_order_no;
        DROP INDEX IF EXISTS idx_sir_ship_date;
        DROP INDEX IF EXISTS idx_sir_item_code;
        DROP INDEX IF EXISTS idx_sir_fabric_id;
        DROP INDEX IF EXISTS idx_sir_supplier;
        DROP TABLE IF EXISTS stock_in_records;
      `)
    }
  } catch {}
  try {
    const sor = db.prepare("PRAGMA table_info(stock_out_records)").all()
    const sorNames = new Set(sor.map(i=>i.name))
    if (sorNames.size && (!sorNames.has('fabric_id') || !sorNames.has('item_code'))) {
      db.exec(`
        DROP INDEX IF EXISTS idx_sor_order_no;
        DROP INDEX IF EXISTS idx_sor_ship_date;
        DROP INDEX IF EXISTS idx_sor_item_code;
        DROP INDEX IF EXISTS idx_sor_fabric_id;
        DROP INDEX IF EXISTS idx_sor_customer;
        DROP TABLE IF EXISTS stock_out_records;
      `)
    }
  } catch {}
  const schemaSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
      email VARCHAR(100),
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS system_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key VARCHAR(100) UNIQUE NOT NULL,
      value TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stock_in_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      biz_id TEXT UNIQUE,
      ship_date TEXT,
      order_no TEXT,
      fabric_id TEXT,
      supplier TEXT,
      item_name TEXT,
      color TEXT,
      composition TEXT,
      process_code TEXT,
      gram_weight INTEGER,
      width_cm INTEGER,
      rolls INTEGER,
      weight_kg REAL,
      price DECIMAL(10,2),
      quantity INTEGER,
      total_amount DECIMAL(10,2),
      signer TEXT,
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_sir_order_no ON stock_in_records(order_no);
    CREATE INDEX IF NOT EXISTS idx_sir_ship_date ON stock_in_records(ship_date);
    CREATE INDEX IF NOT EXISTS idx_sir_fabric_id ON stock_in_records(fabric_id);
    CREATE INDEX IF NOT EXISTS idx_sir_supplier ON stock_in_records(supplier);

    CREATE TABLE IF NOT EXISTS stock_out_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      biz_id TEXT UNIQUE,
      ship_date TEXT,
      order_no TEXT,
      fabric_id TEXT,
      item_code TEXT UNIQUE,
      customer TEXT,
      item_name TEXT,
      color TEXT,
      composition TEXT,
      process_code TEXT,
      gram_weight INTEGER,
      rolls INTEGER,
      weight_kg REAL,
      price DECIMAL(10,2),
      total_amount DECIMAL(10,2),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_sor_order_no ON stock_out_records(order_no);
    CREATE INDEX IF NOT EXISTS idx_sor_ship_date ON stock_out_records(ship_date);
    CREATE INDEX IF NOT EXISTS idx_sor_item_code ON stock_out_records(item_code);
    CREATE INDEX IF NOT EXISTS idx_sor_fabric_id ON stock_out_records(fabric_id);
    CREATE INDEX IF NOT EXISTS idx_sor_customer ON stock_out_records(customer);

    CREATE TABLE IF NOT EXISTS cloth_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      biz_id TEXT UNIQUE,
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
    CREATE INDEX IF NOT EXISTS idx_ci_fabric_id ON cloth_inventory(fabric_id);
    CREATE INDEX IF NOT EXISTS idx_ci_item_name ON cloth_inventory(item_name);
    CREATE INDEX IF NOT EXISTS idx_ci_composition ON cloth_inventory(composition);
    CREATE INDEX IF NOT EXISTS idx_ci_gram_weight ON cloth_inventory(gram_weight);
    CREATE INDEX IF NOT EXISTS idx_ci_width_cm ON cloth_inventory(width_cm);
    CREATE INDEX IF NOT EXISTS idx_ci_color ON cloth_inventory(color);
    CREATE INDEX IF NOT EXISTS idx_ci_color_no ON cloth_inventory(color_no);
    CREATE INDEX IF NOT EXISTS idx_ci_last_updated ON cloth_inventory(last_updated);

    CREATE TABLE IF NOT EXISTS receivables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      biz_id TEXT UNIQUE,
      order_no TEXT UNIQUE,
      customer TEXT,
      ship_date TEXT,
      total_amount DECIMAL(10,2),
      paid_amount DECIMAL(10,2),
      unpaid_amount DECIMAL(10,2),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_recv_order_no ON receivables(order_no);
    CREATE INDEX IF NOT EXISTS idx_recv_customer ON receivables(customer);

    CREATE TABLE IF NOT EXISTS payables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      biz_id TEXT UNIQUE,
      order_no TEXT UNIQUE,
      supplier TEXT,
      ship_date TEXT,
      total_amount DECIMAL(10,2),
      paid_amount DECIMAL(10,2),
      unpaid_amount DECIMAL(10,2),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `

  const currentVersion = db.pragma('user_version', { simple: true })
  if (!Number.isInteger(currentVersion) || currentVersion < 1) {
    db.exec(schemaSQL)
    db.pragma('user_version = 1')
  } else {
    db.exec(schemaSQL)
  }

  try {
    const infoOut = db.prepare('PRAGMA table_info(stock_out_records)').all()
    const outCols = new Set(infoOut.map(i=>i.name))
    if (!outCols.has('color_no')) db.exec('ALTER TABLE stock_out_records ADD COLUMN color_no TEXT')
  } catch {}
  try {
    const infoIn = db.prepare('PRAGMA table_info(stock_in_records)').all()
    const inCols = new Set(infoIn.map(i=>i.name))
    if (!inCols.has('color_no')) db.exec('ALTER TABLE stock_in_records ADD COLUMN color_no TEXT')
    if (!inCols.has('width_cm')) db.exec('ALTER TABLE stock_in_records ADD COLUMN width_cm INTEGER')
  } catch {}

  const defaultDataSQL = `
    INSERT OR IGNORE INTO system_config (key, value, description) VALUES 
    ('company_name', '校服工厂', '公司名称'),
    ('company_address', '', '公司地址'),
    ('company_phone', '', '公司电话'),
    ('low_stock_warning', '10', '库存预警阈值'),
    ('backup_path', './backups', '备份文件路径'),
    ('default_currency', 'CNY', '默认货币单位');
  `

  db.exec(defaultDataSQL)
  try {
    const count = db.prepare('SELECT COUNT(1) AS c FROM users').get().c
    if (count === 0) {
      db.prepare('INSERT INTO users (username, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, 1)').run('admin', 'admin123', '系统管理员', 'admin')
    }
  } catch {}
  try {
    const admin = db.prepare('SELECT id, password_hash, is_active FROM users WHERE username = ?').get('admin')
    if (admin) {
      const needsReset = String(admin.password_hash || '').startsWith('$2b$')
      if (needsReset || !admin.is_active) {
        db.prepare('UPDATE users SET password_hash = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('admin123', admin.id)
      }
    }
  } catch {}
  try {
    const hashedUsers = db.prepare("SELECT id, username FROM users WHERE password_hash LIKE '$2%' AND username <> 'admin'").all()
    const resetStmt = db.prepare('UPDATE users SET password_hash = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    for (const u of hashedUsers) {
      resetStmt.run('123456', u.id)
    }
  } catch {}

  const ensureBizId = (table, prefix, dateCol) => {
    const info = db.prepare(`PRAGMA table_info(${table})`).all()
    const names = new Set(info.map(i=>i.name))
    if (!names.has('biz_id')) db.exec(`ALTER TABLE ${table} ADD COLUMN biz_id TEXT UNIQUE`)
    const rows = db.prepare(`SELECT rowid, ${dateCol} AS d FROM ${table} WHERE biz_id IS NULL`).all()
    const gen = (p, d) => {
      const dd = (String(d||'').slice(0,10) || new Date().toISOString().slice(0,10)).replace(/-/g,'')
      const yymm = dd.slice(2,6)
      const row = db.prepare(`SELECT MAX(CAST(substr(REPLACE(biz_id,'-',''), -3) AS INTEGER)) AS max_seq FROM ${table} WHERE REPLACE(biz_id,'-','') LIKE ?`).get(`${yymm}%`)
      const n = Number((row && row.max_seq) || 0) + 1
      if (n > 999) throw new Error('当月业务编号已达上限')
      return `${yymm}${String(n).padStart(3,'0')}`
    }
    const upd = db.prepare(`UPDATE ${table} SET biz_id=? WHERE rowid=?`)
    const tx = db.transaction(()=>{ for (const r of rows) { upd.run(gen(prefix, r.d), r.rowid) } })
    tx()
  }
  try { ensureBizId('stock_in_records', 'IN', 'ship_date') } catch{}
  try { ensureBizId('stock_out_records', 'OUT', 'ship_date') } catch{}
  try { ensureBizId('receivables', 'REC', 'ship_date') } catch{}
  try { ensureBizId('payables', 'PAY', 'ship_date') } catch{}
}

// 清理不再使用的旧表
function cleanupLegacyTables() {
  if (!db) return
  try {
    // 关闭外键约束，按依赖顺序删除
    db.pragma('foreign_keys = OFF')
    db.exec(`
      DROP TABLE IF EXISTS stock_out_items;
      DROP TABLE IF EXISTS stock_in_items;
      DROP TABLE IF EXISTS inventory;
      DROP TABLE IF EXISTS stock_out;
      DROP TABLE IF EXISTS stock_in;
      DROP TABLE IF EXISTS materials;
      DROP TABLE IF EXISTS categories;
    `)
    db.pragma('foreign_keys = ON')
  } catch (e) {
    // 忽略清理错误，防止影响应用启动
  }
}

function createWindow() {
  // 创建浏览器窗口
  const protoIcon = path.join(process.resourcesPath || '', 'app', 'node_modules', 'app-builder-lib', 'templates', 'icons', 'proton-native', 'proton-native.ico')
  const protoIconDev = path.join(__dirname, '../node_modules/app-builder-lib/templates/icons/proton-native/proton-native.ico')
  const windowIconPath = fs.existsSync(protoIcon) ? protoIcon : (fs.existsSync(protoIconDev) ? protoIconDev : null)
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: windowIconPath ? nativeImage.createFromPath(windowIconPath) : undefined,
    backgroundColor: '#0e1a2b'
  })

  // 彻底隐藏菜单栏（某些平台需显式调用）
  mainWindow.setMenuBarVisibility(false)

  // 加载应用
  const isDev = process.env.NODE_ENV === 'development'
  if (isDev) {
    mainWindow.loadURL('http://localhost:5174')
    mainWindow.webContents.openDevTools()
  } else {
    const prodHtmlA = path.join(process.resourcesPath || '', 'app', 'dist', 'web', 'index.html')
    const prodHtmlB = path.join(__dirname, '../dist/web/index.html')
    const target = fs.existsSync(prodHtmlA) ? prodHtmlA : prodHtmlB
    mainWindow.loadFile(target)
  }

  // 设置菜单
  Menu.setApplicationMenu(null)

  mainWindow.on('close', () => {
    isQuiting = true
    try { tray && tray.destroy() } catch {}
    try { db && db.close() } catch {}
    app.quit()
  })

  // 窗口关闭事件
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  const logPath = path.join(app.getPath('userData'), 'app.log')
  const log = (msg) => { try { fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`) } catch {} }
  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => { log(`did-fail-load code=${code} desc=${desc} url=${url}`) })
  mainWindow.webContents.on('render-process-gone', (_e, details) => { log(`render-gone ${JSON.stringify(details)}`) })
  mainWindow.on('unresponsive', () => { log('window-unresponsive') })
}

// IPC 事件处理
ipcMain.handle('db-query', async (event, sql, params = []) => {
  try {
    const stmt = db.prepare(sql)
    const result = stmt.all(...params)
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db-execute', async (event, sql, params = []) => {
  try {
    const stmt = db.prepare(sql)
    const result = stmt.run(...params)
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('gen-item-code', async (event, date) => {
  try {
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
  } catch (e) { return { error: e.message } }
})

ipcMain.handle('validate-out-item-code', async (_event, { item_code, exclude_id }) => {
  try {
    const code = String(item_code || '').trim()
    if (!code) return { success: false, error: '出库编号不能为空' }
    const existsRow = exclude_id
      ? db.prepare('SELECT id FROM stock_out_records WHERE item_code = ? AND id <> ? LIMIT 1').get(code, Number(exclude_id))
      : db.prepare('SELECT id FROM stock_out_records WHERE item_code = ? LIMIT 1').get(code)
    const exists = !!existsRow
    if (exists) {
      try {
        const logPath = path.join(app.getPath('userData'), 'dup-attempts.log')
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] DUP item_code=${code} exclude_id=${exclude_id || ''}\n`)
      } catch {}
      return { success: true, exists: true }
    }
    return { success: true, exists: false }
  } catch (e) { return { success: false, error: e.message } }
})

ipcMain.handle('db-transaction', async (event, operations) => {
  try {
    const logPath = path.join(app.getPath('userData'), 'biz-log.jsonl')
    const writeBizLog = (entry) => {
      try { fs.appendFileSync(logPath, JSON.stringify(entry) + '\n') } catch {}
    }
    const transaction = db.transaction(() => {
      const results = []
      for (const op of operations) {
        const stmt = db.prepare(op.sql)
        const result = stmt.run(...op.params)
        results.push(result)
        const sql = String(op.sql || '').trim().toUpperCase()
        const isIn = sql.startsWith('INSERT INTO STOCK_IN_RECORDS') || sql.startsWith('UPDATE STOCK_IN_RECORDS') || sql.startsWith('DELETE FROM STOCK_IN_RECORDS')
        const isOut = sql.startsWith('INSERT INTO STOCK_OUT_RECORDS') || sql.startsWith('UPDATE STOCK_OUT_RECORDS') || sql.startsWith('DELETE FROM STOCK_OUT_RECORDS')
        if (isIn || isOut) {
          const table = isIn ? 'stock_in_records' : 'stock_out_records'
          const opType = sql.startsWith('INSERT') ? 'insert' : (sql.startsWith('UPDATE') ? 'update' : 'delete')
          const payload = { table, op: opType, params: op.params }
          writeBizLog({ ts: new Date().toISOString(), ...payload })
        }
      }
      return results
    })
    
    const results = transaction()
    return { success: true, data: results }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('auth-login', async (event, { username, password }) => {
  try {
    const u = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(String(username || '').trim())
    if (!u) return { success: false, error: '用户名或密码错误' }
    const ok = String(u.password_hash || '') === String(password || '').trim()
    if (!ok) return { success: false, error: '用户名或密码错误' }
    return { success: true, data: u }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('user-create', async (event, user) => {
  try {
    const stmt = db.prepare('INSERT INTO users (username, password_hash, name, role, email, is_active) VALUES (?, ?, ?, ?, ?, 1)')
    const res = stmt.run(String(user.username||'').trim(), String(user.password||'123456').trim(), String(user.name||user.username||'用户').trim(), String(user.role||'user').trim(), String(user.email||'').trim())
    return { success: true, data: res }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('user-set-password', async (event, { id, oldPassword, newPassword }) => {
  try {
    const res = db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(String(newPassword || '').trim(), id)
    return { success: true, data: res }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// 管理员重置为默认密码
ipcMain.handle('reset-admin', async () => {
  try {
    const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin')
    if (!admin) {
      db.prepare('INSERT INTO users (username, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, 1)').run('admin', 'admin123', '系统管理员', 'admin')
    } else {
      db.prepare('UPDATE users SET password_hash = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('admin123', admin.id)
    }
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('backup-db', async (event, targetPath) => {
  try {
    const dbPath = path.join(app.getPath('userData'), 'warehouse.db')
    if (!targetPath) {
      const res = await dialog.showSaveDialog({ defaultPath: path.join(app.getPath('documents'), `warehouse-${Date.now()}.db`) })
      if (res.canceled) return { success: false, error: '取消' }
      targetPath = res.filePath
    }
    fs.copyFileSync(dbPath, targetPath)
    return { success: true, data: targetPath }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('restore-db', async (event, sourcePath) => {
  try {
    if (!sourcePath) {
      const res = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'DB', extensions: ['db'] }] })
      if (res.canceled || !res.filePaths[0]) return { success: false, error: '取消' }
      sourcePath = res.filePaths[0]
    }
    const dbPath = path.join(app.getPath('userData'), 'warehouse.db')
    if (db) db.close()
    fs.copyFileSync(sourcePath, dbPath)
    db = new Database(dbPath)
    return { success: true, data: dbPath }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('read-file-buffer', async (event, relPath) => {
  try {
    const isDev = process.env.NODE_ENV === 'development'
    const input = String(relPath || '')
    let p = input
    if (!path.isAbsolute(p)) {
      const cleaned = p.replace(/^[\\\/]+/, '')
      p = isDev ? path.join(__dirname, '../public', cleaned) : path.join(__dirname, '../dist', cleaned)
    }
    const buf = fs.readFileSync(p)
    return buf
  } catch (e) {
    return { error: e.message }
  }
})

// 手动触发旧表清理（渲染进程可调用）
ipcMain.handle('cleanup-legacy', async () => {
  try { cleanupLegacyTables(); return { success: true } } catch (e) { return { success: false, error: e.message } }
})

ipcMain.handle('get-db-path', async () => {
  const dbPath = path.join(app.getPath('userData'), 'warehouse.db')
  return dbPath
})

ipcMain.handle('reset-db', async () => {
  try {
    const dbPath = path.join(app.getPath('userData'), 'warehouse.db')
    try { if (db) { db.close() } } catch {}
    if (fs.existsSync(dbPath)) {
      try { fs.unlinkSync(dbPath) } catch {}
    }
    createDatabase()
    try {
      db.pragma('foreign_keys = OFF')
      db.exec(`
        DROP TABLE IF EXISTS stock_in_records;
        DROP TABLE IF EXISTS stock_out_records;
        DROP TABLE IF EXISTS receivables;
        DROP TABLE IF EXISTS payables;
        DROP TABLE IF EXISTS cloth_inventory;
        DROP TABLE IF EXISTS users;
        DROP TABLE IF EXISTS system_config;
        DROP TABLE IF EXISTS stock_in;
        DROP TABLE IF EXISTS stock_out;
        DROP TABLE IF EXISTS stock_in_items;
        DROP TABLE IF EXISTS stock_out_items;
        DROP TABLE IF EXISTS inventory;
      `)
      db.pragma('foreign_keys = ON')
    } catch {}
    initializeDatabase()
    return { success: true, data: dbPath }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('clear-data', async (event, { mode } = { mode: 'business' }) => {
  try {
    if (!db) createDatabase()
    const trx = db.transaction(() => {
      db.exec(`
        DELETE FROM stock_in_records;
        DELETE FROM stock_out_records;
        DELETE FROM receivables;
        DELETE FROM payables;
        DELETE FROM cloth_inventory;
      `)
      if (mode === 'all') {
        db.exec(`DELETE FROM users; DELETE FROM system_config;`)
      }
    })
    trx()
    if (mode === 'all') {
      try {
        db.prepare('INSERT OR IGNORE INTO users (username, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, 1)')
          .run('admin', 'admin123', '系统管理员', 'admin')
        db.exec(`
          INSERT OR IGNORE INTO system_config (key, value, description) VALUES 
          ('company_name', '校服工厂', '公司名称'),
          ('company_address', '', '公司地址'),
          ('company_phone', '', '公司电话'),
          ('low_stock_warning', '10', '库存预警阈值'),
          ('backup_path', './backups', '备份文件路径'),
          ('default_currency', 'CNY', '默认货币单位');
        `)
      } catch {}
    }
    try { mainWindow?.webContents.send('data-cleared', { mode }) } catch {}
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('merge-db', async (event, sourcePath) => {
  try {
    if (!sourcePath) {
      const res = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'DB', extensions: ['db'] }] })
      if (res.canceled || !res.filePaths[0]) return { success: false, error: '取消' }
      sourcePath = res.filePaths[0]
    }
    if (!db) createDatabase()
    initializeDatabase()
    const attach = `ATTACH DATABASE '${sourcePath.replace(/'/g, "''")}' AS old`;
    db.exec(attach)
    const getOldTables = () => {
      try {
        const rows = db.prepare("SELECT name FROM old.sqlite_master WHERE type='table'").all()
        return new Set(rows.map(r => r.name))
      } catch { return new Set() }
    }
    const oldTables = getOldTables()
    const ensureTables = () => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS stock_in_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ship_date TEXT,
          order_no TEXT,
          item_code TEXT,
          supplier TEXT,
          item_name TEXT,
          color TEXT,
          color_no TEXT,
          composition TEXT,
          process_code TEXT,
          gram_weight INTEGER,
          width_cm INTEGER,
          rolls INTEGER,
          weight_kg REAL,
          price DECIMAL(10,2),
          quantity INTEGER,
          total_amount DECIMAL(10,2),
          signer TEXT,
          remark TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS stock_out_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ship_date TEXT,
          order_no TEXT,
          item_code TEXT,
          customer TEXT,
          item_name TEXT,
          color TEXT,
          color_no TEXT,
          composition TEXT,
          process_code TEXT,
          gram_weight INTEGER,
          rolls INTEGER,
          weight_kg REAL,
          price DECIMAL(10,2),
          total_amount DECIMAL(10,2),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `)
      db.exec(`CREATE INDEX IF NOT EXISTS idx_sir_order_no ON stock_in_records(order_no);`)
      db.exec(`CREATE INDEX IF NOT EXISTS idx_sor_order_no ON stock_out_records(order_no);`)
    }
    ensureTables()
    const ensureColumns = (table, cols) => {
      const info = db.prepare(`PRAGMA table_info(${table})`).all()
      const existing = new Set(info.map(r => r.name))
      for (const c of cols) {
        if (!existing.has(c.name)) db.prepare(`ALTER TABLE ${table} ADD COLUMN ${c.name} ${c.type}`).run()
      }
    }
    ensureColumns('stock_out_records', [{ name: 'color_no', type: 'TEXT' }])
    ensureColumns('stock_in_records', [
      { name: 'color_no', type: 'TEXT' },
      { name: 'width_cm', type: 'INTEGER' }
    ])

    rebuildClothInventory()

    try { db.exec('DROP TABLE IF EXISTS stock_in') } catch {}
    try { db.exec('DROP TABLE IF EXISTS stock_out') } catch {}
    try { db.exec('DROP TABLE IF EXISTS stock_in_items') } catch {}
    try { db.exec('DROP TABLE IF EXISTS stock_out_items') } catch {}
    try { db.exec('DROP TABLE IF EXISTS inventory') } catch {}

    if (oldTables.has('system_config')) {
      db.exec(`
        INSERT INTO system_config (key, value, description)
        SELECT s.key, s.value, s.description FROM old.system_config s
        WHERE NOT EXISTS (SELECT 1 FROM system_config t WHERE t.key = s.key);
      `)
    }

    // 合并出库记录：优先新表，其次旧表映射
    if (oldTables.has('stock_out_records')) {
      db.exec(`
        INSERT INTO stock_out_records (
          ship_date, order_no, item_code, customer, item_name, color, composition, process_code,
          gram_weight, rolls, weight_kg, price, total_amount
        )
        SELECT ship_date, order_no, item_code, customer, item_name, color, composition, process_code,
               gram_weight, rolls, weight_kg, price, total_amount
        FROM old.stock_out_records o
        WHERE NOT EXISTS (
          SELECT 1 FROM stock_out_records t
          WHERE IFNULL(t.order_no,'') = IFNULL(o.order_no,'')
            AND IFNULL(t.item_code,'') = IFNULL(o.item_code,'')
            AND IFNULL(t.ship_date,'') = IFNULL(o.ship_date,'')
        );
      `)
    } else if (oldTables.has('stock_out_items') && oldTables.has('stock_out')) {
      const heads = new Map()
      for (const h of db.prepare('SELECT id, order_no, customer, ship_date, created_at FROM old.stock_out').all()) {
        heads.set(h.id, h)
      }
      const rows = db.prepare('SELECT * FROM old.stock_out_items').all()
      const insert = db.prepare(
        'INSERT INTO stock_out_records (ship_date, order_no, item_code, customer, item_name, color, composition, process_code, gram_weight, rolls, weight_kg, price, total_amount) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
      )
      const exists = db.prepare(
        "SELECT 1 FROM stock_out_records WHERE IFNULL(order_no,'')=? AND IFNULL(item_code,'')=? AND IFNULL(ship_date,'')=? LIMIT 1"
      )
      const run = db.transaction(() => {
        for (const r of rows) {
          const h = heads.get(r.stock_out_id) || {}
          const ship = h.ship_date || h.created_at || ''
          const order = h.order_no || ''
          const ic = r.item_code || ''
          if (!exists.get(order, ic, ship)) {
            insert.run(
              ship,
              order,
              ic,
              h.customer || '',
              r.item_name || '',
              r.color || '',
              r.composition || '',
              r.process_code || '',
              Number(r.gram_weight || 0),
              Number(r.rolls || r.quantity || 0),
              Number(r.weight_kg || 0),
              Number(r.price || 0),
              Number(r.total_amount || 0)
            )
          }
        }
      })
      run()
    }

    // 合并入库记录：优先新表，其次旧表映射
    if (oldTables.has('stock_in_records')) {
      db.exec(`
        INSERT INTO stock_in_records (
          ship_date, order_no, item_code, supplier, item_name, color, composition, process_code,
          gram_weight, rolls, weight_kg, price, quantity, total_amount, signer, remark
        )
        SELECT ship_date, order_no, item_code, supplier, item_name, color, composition, process_code,
               gram_weight, rolls, weight_kg, price, quantity, total_amount, signer, remark
        FROM old.stock_in_records o
        WHERE NOT EXISTS (
          SELECT 1 FROM stock_in_records t
          WHERE IFNULL(t.order_no,'') = IFNULL(o.order_no,'')
            AND IFNULL(t.item_code,'') = IFNULL(o.item_code,'')
            AND IFNULL(t.ship_date,'') = IFNULL(o.ship_date,'')
        );
      `)
    } else if (oldTables.has('stock_in_items') && oldTables.has('stock_in')) {
      const heads = new Map()
      for (const h of db.prepare('SELECT id, order_no, supplier, ship_date, created_at FROM old.stock_in').all()) {
        heads.set(h.id, h)
      }
      const rows = db.prepare('SELECT * FROM old.stock_in_items').all()
      const insert = db.prepare(
        'INSERT INTO stock_in_records (ship_date, order_no, item_code, supplier, item_name, color, composition, process_code, gram_weight, rolls, weight_kg, price, quantity, total_amount, signer, remark) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
      )
      const exists = db.prepare(
        "SELECT 1 FROM stock_in_records WHERE IFNULL(order_no,'')=? AND IFNULL(item_code,'')=? AND IFNULL(ship_date,'')=? LIMIT 1"
      )
      const run = db.transaction(() => {
        for (const r of rows) {
          const h = heads.get(r.stock_in_id) || {}
          const ship = h.ship_date || h.created_at || ''
          const order = h.order_no || ''
          const ic = r.item_code || ''
          if (!exists.get(order, ic, ship)) {
            insert.run(
              ship,
              order,
              ic,
              h.supplier || '',
              r.item_name || '',
              r.color || '',
              r.composition || '',
              r.process_code || '',
              Number(r.gram_weight || 0),
              Number(r.rolls || r.quantity || 0),
              Number(r.weight_kg || 0),
              Number(r.price || 0),
              Number(r.quantity || 0),
              Number(r.total_amount || 0),
              r.signer || '',
              r.remark || ''
            )
          }
        }
      })
      run()
    }

    // 聚合补齐应收（仅补充缺失订单，生成 biz_id）
    {
      const rows = db.prepare(`
        SELECT order_no,
               COALESCE(MAX(customer),'') AS customer,
               COALESCE(MIN(ship_date),'') AS ship_date,
               COALESCE(SUM(total_amount),0) AS total_amount
        FROM stock_out_records
        GROUP BY order_no
      `).all()
      const exists = db.prepare('SELECT biz_id FROM receivables WHERE order_no=?')
      const ins = db.prepare('INSERT INTO receivables (biz_id, order_no, customer, ship_date, total_amount, paid_amount, unpaid_amount) VALUES (?,?,?,?,?,?,?)')
      const genBizId = (_prefix, date) => {
        const d = (String(date||'').slice(0,10) || new Date().toISOString().slice(0,10)).replace(/-/g,'')
        const yymm = d.slice(2,6)
        const row = db.prepare('SELECT MAX(CAST(substr(REPLACE(biz_id,\'-\',\'\'), -3) AS INTEGER)) AS max_seq FROM receivables WHERE REPLACE(biz_id,\'-\',\'\') LIKE ?').get(`${yymm}%`)
        const n = Number((row && row.max_seq) || 0) + 1
        if (n > 999) throw new Error('当月业务编号已达上限')
        return `${yymm}${String(n).padStart(3,'0')}`
      }
      const tx = db.transaction(()=>{
        for (const r of rows) {
          const cur = exists.get(r.order_no)
          if (!cur) {
            const biz = genBizId('REC', r.ship_date)
            ins.run(biz, r.order_no, r.customer, r.ship_date, r.total_amount, 0, r.total_amount)
          }
        }
      })
      tx()
    }

    // 聚合补齐应付（仅补充缺失订单，生成 biz_id）
    {
      const rows = db.prepare(`
        SELECT order_no,
               COALESCE(MAX(supplier),'') AS supplier,
               COALESCE(MIN(ship_date),'') AS ship_date,
               COALESCE(SUM(total_amount),0) AS total_amount
        FROM stock_in_records
        GROUP BY order_no
      `).all()
      const exists = db.prepare('SELECT biz_id FROM payables WHERE order_no=?')
      const ins = db.prepare('INSERT INTO payables (biz_id, order_no, supplier, ship_date, total_amount, paid_amount, unpaid_amount) VALUES (?,?,?,?,?,?,?)')
      const genBizId = (_prefix, date) => {
        const d = (String(date||'').slice(0,10) || new Date().toISOString().slice(0,10)).replace(/-/g,'')
        const yymm = d.slice(2,6)
        const row = db.prepare('SELECT MAX(CAST(substr(REPLACE(biz_id,\'-\',\'\'), -3) AS INTEGER)) AS max_seq FROM payables WHERE REPLACE(biz_id,\'-\',\'\') LIKE ?').get(`${yymm}%`)
        const n = Number((row && row.max_seq) || 0) + 1
        if (n > 999) throw new Error('当月业务编号已达上限')
        return `${yymm}${String(n).padStart(3,'0')}`
      }
      const tx = db.transaction(()=>{
        for (const r of rows) {
          const cur = exists.get(r.order_no)
          if (!cur) {
            const biz = genBizId('PAY', r.ship_date)
            ins.run(biz, r.order_no, r.supplier, r.ship_date, r.total_amount, 0, r.total_amount)
          }
        }
      })
      tx()
    }

    // 合并应收账款（仅补充）
    if (oldTables.has('receivables')) {
      db.exec(`
        INSERT INTO receivables (order_no, customer, ship_date, total_amount, paid_amount, unpaid_amount)
        SELECT r.order_no, r.customer, r.ship_date, r.total_amount,
               COALESCE(r.paid_amount, 0),
               COALESCE(r.unpaid_amount, r.total_amount - COALESCE(r.paid_amount, 0))
        FROM old.receivables r
        WHERE NOT EXISTS (SELECT 1 FROM receivables t WHERE t.order_no = r.order_no);
      `)
    }

    // 合并应付账款（仅补充）
    if (oldTables.has('payables')) {
      db.exec(`
        INSERT INTO payables (order_no, supplier, ship_date, total_amount, paid_amount, unpaid_amount)
        SELECT p.order_no, p.supplier, p.ship_date, p.total_amount,
               COALESCE(p.paid_amount, 0),
               COALESCE(p.unpaid_amount, p.total_amount - COALESCE(p.paid_amount, 0))
        FROM old.payables p
        WHERE NOT EXISTS (SELECT 1 FROM payables t WHERE t.order_no = p.order_no);
      `)
    }

    // 合并用户（仅补充，规范化密码）
    if (oldTables.has('users')) {
      db.exec(`
        INSERT INTO users (username, password_hash, name, role, email, is_active)
        SELECT u.username,
               CASE WHEN u.password_hash IS NULL OR u.password_hash = '' THEN '123456' ELSE u.password_hash END,
               COALESCE(u.name, u.username, ''),
               COALESCE(u.role, 'user'),
               COALESCE(u.email, ''),
               COALESCE(u.is_active, 1)
        FROM old.users u
        WHERE NOT EXISTS (SELECT 1 FROM users t WHERE t.username = u.username);
      `)
      try { db.exec(`UPDATE users SET password_hash='123456', is_active=COALESCE(is_active,1), updated_at=CURRENT_TIMESTAMP WHERE password_hash LIKE '$2%'`) } catch {}
    }
    db.exec('DETACH DATABASE old')
    return { success: true, data: sourcePath }
  } catch (e) {
    try { db.exec('DETACH DATABASE old') } catch {}
    return { success: false, error: e.message }
  }
})

ipcMain.handle('rebuild-inventory', async () => {
  try { rebuildClothInventory(); return { success: true } } catch (e) { return { success: false, error: e.message } }
})

// 窗口控制 IPC
ipcMain.handle('win-control', async (event, action) => {
  if (!mainWindow) return
  switch (action) {
    case 'minimize':
      mainWindow.minimize(); break
    case 'maximize':
      if (!mainWindow.isMaximized()) mainWindow.maximize(); else mainWindow.unmaximize(); break
    case 'unmaximize':
      mainWindow.unmaximize(); break
    case 'close':
      isQuiting = true; mainWindow.close(); break
    case 'isMaximized':
      return mainWindow.isMaximized()
    case 'quit':
      isQuiting = true; try { tray && tray.destroy() } catch {}; try { db && db.close() } catch {}; app.quit(); break
  }
  return true
})

// 应用列表（简化：静态返回，后续可改扫描）
ipcMain.handle('apps-list', async () => {
  return [
    { id: 'cloth-io', title: '色布出入库', description: '离线色布出/入库记录', default: true },
    { id: 'system-config', title: '系统配置', description: '用户管理/数据备份' }
  ]
})

// 应用准备就绪
app.whenReady().then(() => {
  // 创建数据库
  createDatabase()
  initializeDatabase()
  cleanupLegacyTables()
  
  // 创建窗口
  createWindow()

  try {
    const candidates = [protoIcon, protoIconDev].filter(p => p && fs.existsSync(p))
    let trayImage
    for (const p of candidates) {
      const img = nativeImage.createFromPath(p)
      if (!img.isEmpty()) { trayImage = img; break }
    }
    if (!trayImage || trayImage.isEmpty()) {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAKUlEQVRYhe3PMQEAIAwEsbNw/0YQxA0YwFQJmQdP+IYAAQAAEJpB+vUjVwAAAP8FfU7uVwQYxQAAAABJRU5ErkJggg=='
      trayImage = nativeImage.createFromDataURL(dataUrl).resize({ width: 16, height: 16 })
    } else {
      trayImage = trayImage.resize({ width: 16, height: 16 })
    }
    tray = new Tray(trayImage)
    const contextMenu = Menu.buildFromTemplate([
      { label: '显示', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus() } } },
      { label: '隐藏', click: () => { if (mainWindow) { mainWindow.hide() } } },
      { type: 'separator' },
      { label: '退出', click: () => { isQuiting = true; app.quit() } }
    ])
    tray.setToolTip('仓库管理系统')
    tray.setContextMenu(contextMenu)
    try { tray.setImage(trayImage) } catch {}
    tray.on('click', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus() } })
    tray.on('double-click', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus() } })
    tray.on('right-click', () => { try { tray.popUpContextMenu() } catch {} })
  } catch {}

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  if (AUTO_EXIT_MS > 0) {
    try { autoExitTimer = setTimeout(() => { isQuiting = true; app.quit() }, AUTO_EXIT_MS) } catch {}
  }
})

// 所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 应用退出前关闭数据库连接
app.on('before-quit', () => {
  isQuiting = true
  if (db) {
    db.close()
  }
  try { tray && tray.destroy() } catch {}
  if (autoExitTimer) { try { clearTimeout(autoExitTimer) } catch {} }
})

app.on('quit', () => {
  try { db && db.close() } catch {}
  try { tray && tray.destroy() } catch {}
  try { process.exit(0) } catch {}
})
function rebuildClothInventory() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cloth_inventory (
      item_code TEXT PRIMARY KEY,
      biz_id TEXT UNIQUE,
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
    CREATE INDEX IF NOT EXISTS idx_ci_item_code ON cloth_inventory(item_code);
  `)

  const agg = db.prepare(`
    SELECT ids.fabric_id,
           COALESCE(li.item_name,'') AS item_name,
           COALESCE(li.color,'') AS color,
           COALESCE(li.color_no,'') AS color_no,
           COALESCE(li.composition,'') AS composition,
           COALESCE(li.gram_weight,0) AS gram_weight,
           COALESCE(li.width_cm,0) AS width_cm,
           COALESCE(in_sum.in_rolls,0) - COALESCE(out_sum.out_rolls,0) AS current_rolls,
           COALESCE(in_sum.in_weight,0.0) - COALESCE(out_sum.out_weight,0.0) AS current_weight,
           COALESCE(in_sum.in_rolls,0) AS total_in_rolls,
           COALESCE(in_sum.in_weight,0.0) AS total_in_weight,
           COALESCE(out_sum.out_rolls,0) AS total_out_rolls,
           COALESCE(out_sum.out_weight,0.0) AS total_out_weight,
           COALESCE(min_dates.min_ship_date,'') AS ship_date
    FROM (
      SELECT fabric_id FROM stock_in_records
      UNION
      SELECT fabric_id FROM stock_out_records
    ) ids
    LEFT JOIN (
      SELECT fabric_id, item_name, color, color_no, composition, gram_weight, width_cm
      FROM stock_in_records GROUP BY fabric_id
    ) li ON li.fabric_id = ids.fabric_id
    LEFT JOIN (
      SELECT fabric_id, SUM(rolls) AS in_rolls, SUM(weight_kg) AS in_weight
      FROM stock_in_records GROUP BY fabric_id
    ) in_sum ON in_sum.fabric_id = ids.fabric_id
    LEFT JOIN (
      SELECT fabric_id, SUM(rolls) AS out_rolls, SUM(weight_kg) AS out_weight
      FROM stock_out_records GROUP BY fabric_id
    ) out_sum ON out_sum.fabric_id = ids.fabric_id
    LEFT JOIN (
      SELECT fabric_id, MIN(ship_date) AS min_ship_date
      FROM (
        SELECT fabric_id, ship_date FROM stock_in_records
        UNION ALL
        SELECT fabric_id, ship_date FROM stock_out_records
      ) t GROUP BY fabric_id
    ) min_dates ON min_dates.fabric_id = ids.fabric_id
  `).all()

  const exists = db.prepare('SELECT biz_id FROM cloth_inventory WHERE fabric_id=?')
  const insert = db.prepare(`
    INSERT INTO cloth_inventory (biz_id, fabric_id, item_name, color, color_no, composition, gram_weight, width_cm,
      current_rolls, current_weight, total_in_rolls, total_in_weight, total_out_rolls, total_out_weight, last_updated)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
  `)
  const update = db.prepare(`
    UPDATE cloth_inventory SET item_name=?, color=?, color_no=?, composition=?, gram_weight=?, width_cm=?,
      current_rolls=?, current_weight=?, total_in_rolls=?, total_in_weight=?, total_out_rolls=?, total_out_weight=?, last_updated=CURRENT_TIMESTAMP
    WHERE fabric_id=?
  `)

  const genBizId = (_prefix, date) => {
    const d = (String(date||'').slice(0,10) || new Date().toISOString().slice(0,10)).replace(/-/g,'')
    const yymm = d.slice(2,6)
    const row = db.prepare(`SELECT MAX(CAST(substr(REPLACE(biz_id,'-',''), -3) AS INTEGER)) AS max_seq FROM cloth_inventory WHERE REPLACE(biz_id,'-','') LIKE ?`).get(`${yymm}%`)
    const n = Number((row && row.max_seq) || 0) + 1
    if (n > 999) throw new Error('当月业务编号已达上限')
    return `${yymm}${String(n).padStart(3,'0')}`
  }

  const tx = db.transaction(()=>{
    for (const r of agg) {
      const cur = exists.get(r.fabric_id)
      if (!cur) {
        insert.run(genBizId('INV', r.ship_date), r.fabric_id, r.item_name, r.color, r.color_no, r.composition, r.gram_weight, r.width_cm,
          r.current_rolls, r.current_weight, r.total_in_rolls, r.total_in_weight, r.total_out_rolls, r.total_out_weight)
      } else {
        update.run(r.item_name, r.color, r.color_no, r.composition, r.gram_weight, r.width_cm,
          r.current_rolls, r.current_weight, r.total_in_rolls, r.total_in_weight, r.total_out_rolls, r.total_out_weight, r.fabric_id)
      }
    }
  })
  tx()
}
ipcMain.handle('gen-biz-id', async (event, { prefix, date }) => {
  try {
    const d = (String(date||'').slice(0,10) || new Date().toISOString().slice(0,10)).replace(/-/g,'')
    const yymm = d.slice(2,6)
    const tableMap = {
      IN: 'stock_in_records',
      OUT: 'stock_out_records',
      REC: 'receivables',
      PAY: 'payables',
      INV: 'cloth_inventory'
    }
    const table = tableMap[String(prefix||'').toUpperCase()] || 'stock_in_records'
    const row = db.prepare(`SELECT MAX(CAST(substr(REPLACE(biz_id,'-',''), -3) AS INTEGER)) AS max_seq FROM ${table} WHERE REPLACE(biz_id,'-','') LIKE ?`).get(`${yymm}%`)
    const n = Number((row && row.max_seq) || 0) + 1
    if (n > 999) throw new Error('当月业务编号已达上限')
    return `${yymm}${String(n).padStart(3,'0')}`
  } catch (e) { return { error: e.message } }
})
