const { app, BrowserWindow, Menu, ipcMain, dialog, Tray } = require('electron')
const path = require('path')
const Database = require('better-sqlite3')
const fs = require('fs')
// 简化登录验证，去除 bcrypt

let mainWindow
let db
let tray
let isQuiting = false

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
  const schemaSQL = `
    -- 用户表
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

    -- 物料分类表
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(50) UNIQUE NOT NULL,
      parent_id INTEGER,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES categories(id)
    );

    -- 物料表
    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(200) NOT NULL,
      specification VARCHAR(200),
      unit VARCHAR(20) NOT NULL,
      category_id INTEGER,
      price DECIMAL(10,2) DEFAULT 0.00,
      min_stock INTEGER DEFAULT 0,
      max_stock INTEGER DEFAULT 10000,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    -- 入库单表
    CREATE TABLE IF NOT EXISTS stock_in (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no VARCHAR(50) UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      supplier VARCHAR(200),
      contact VARCHAR(100),
      phone VARCHAR(50),
      address TEXT,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      remark TEXT,
      audit_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- 入库明细表
    CREATE TABLE IF NOT EXISTS stock_in_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stock_in_id INTEGER NOT NULL,
      material_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      price DECIMAL(10,2) DEFAULT 0.00,
      total_amount DECIMAL(10,2) DEFAULT 0.00,
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (stock_in_id) REFERENCES stock_in(id),
      FOREIGN KEY (material_id) REFERENCES materials(id)
    );

    -- 出库单表
    CREATE TABLE IF NOT EXISTS stock_out (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no VARCHAR(50) UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      recipient VARCHAR(100),
      department VARCHAR(100),
      purpose TEXT,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      remark TEXT,
      audit_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- 出库明细表
    CREATE TABLE IF NOT EXISTS stock_out_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stock_out_id INTEGER NOT NULL,
      material_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      price DECIMAL(10,2) DEFAULT 0.00,
      total_amount DECIMAL(10,2) DEFAULT 0.00,
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (stock_out_id) REFERENCES stock_out(id),
      FOREIGN KEY (material_id) REFERENCES materials(id)
    );

    -- 库存表
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER UNIQUE NOT NULL,
      current_stock INTEGER DEFAULT 0,
      current_amount DECIMAL(10,2) DEFAULT 0.00,
      total_in INTEGER DEFAULT 0,
      total_out INTEGER DEFAULT 0,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (material_id) REFERENCES materials(id)
    );

    -- 系统配置表
    CREATE TABLE IF NOT EXISTS system_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key VARCHAR(100) UNIQUE NOT NULL,
      value TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_materials_code ON materials(code);
    CREATE INDEX IF NOT EXISTS idx_materials_name ON materials(name);
    CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category_id);
    CREATE INDEX IF NOT EXISTS idx_stock_in_order_no ON stock_in(order_no);
    CREATE INDEX IF NOT EXISTS idx_stock_in_status ON stock_in(status);
    CREATE INDEX IF NOT EXISTS idx_stock_in_created ON stock_in(created_at);
    CREATE INDEX IF NOT EXISTS idx_stock_in_items_stock_in ON stock_in_items(stock_in_id);
    CREATE INDEX IF NOT EXISTS idx_stock_in_items_material ON stock_in_items(material_id);
    CREATE INDEX IF NOT EXISTS idx_stock_out_order_no ON stock_out(order_no);
    CREATE INDEX IF NOT EXISTS idx_stock_out_status ON stock_out(status);
    CREATE INDEX IF NOT EXISTS idx_stock_out_created ON stock_out(created_at);
    CREATE INDEX IF NOT EXISTS idx_stock_out_items_stock_out ON stock_out_items(stock_out_id);
    CREATE INDEX IF NOT EXISTS idx_stock_out_items_material ON stock_out_items(material_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_material ON inventory(material_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_current_stock ON inventory(current_stock);
  `
  
  db.exec(schemaSQL)
  
  // 插入默认数据
  const defaultDataSQL = `
    -- 插入默认管理员用户 (密码: admin123)
    INSERT OR IGNORE INTO users (username, password_hash, name, role) 
    VALUES ('admin', '$2b$10$8K1p/kVGKpDH0j7W2yP3P.XdVm3lNqZ7j3u5m1a4w6y8n9b0v2c1d', '系统管理员', 'admin');

    -- 插入默认分类数据
    INSERT OR IGNORE INTO categories (name, code, description) VALUES 
    ('布料', 'FABRIC', '各类校服布料'),
    ('辅料', 'ACCESSORY', '纽扣、拉链等辅料'),
    ('成品校服', 'UNIFORM', '各类成品校服'),
    ('包装材料', 'PACKAGING', '包装袋、标签等');

    -- 插入默认配置
    INSERT OR IGNORE INTO system_config (key, value, description) VALUES 
    ('company_name', '校服工厂', '公司名称'),
    ('company_address', '', '公司地址'),
    ('company_phone', '', '公司电话'),
    ('low_stock_warning', '10', '库存预警阈值'),
    ('backup_path', './backups', '备份文件路径'),
    ('default_currency', 'CNY', '默认货币单位');
  `
  
  db.exec(defaultDataSQL)
  // 增加单头日期字段
  const ensureHeadColumns = (table, cols) => {
    const info = db.prepare(`PRAGMA table_info(${table})`).all()
    const existing = new Set(info.map(c => c.name))
    for (const col of cols) {
      if (!existing.has(col.name)) {
        db.prepare(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.type}`).run()
      }
    }
  }
  ensureHeadColumns('stock_out', [{ name: 'ship_date', type: 'TEXT' }])
  ensureHeadColumns('stock_in', [{ name: 'ship_date', type: 'TEXT' }])
  const existing = db.prepare('SELECT * FROM users WHERE username = ?').get('admin')
  if (!existing) {
    db.prepare('INSERT INTO users (username, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, 1)').run('admin', 'admin123', '系统管理员', 'admin')
  } else {
    db.prepare('UPDATE users SET password_hash = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('admin123', existing.id)
  }
  // schema upgrade for new item-level fields
  const ensureColumns = (table, cols) => {
    if (!db) return
    const info = db.prepare(`PRAGMA table_info(${table})`).all()
    const existingCols = new Set(info.map(c => c.name))
    for (const col of cols) {
      if (!existingCols.has(col.name)) {
        db.prepare(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.type}${col.default ? ' DEFAULT ' + col.default : ''}`).run()
      }
    }
  }
  ensureColumns('stock_out_items', [
    { name: 'item_code', type: 'TEXT' },
    { name: 'item_name', type: 'TEXT' },
    { name: 'color', type: 'TEXT' },
    { name: 'composition', type: 'TEXT' },
    { name: 'process_code', type: 'TEXT' },
    { name: 'gram_weight', type: 'INTEGER', default: 0 },
    { name: 'rolls', type: 'INTEGER', default: 0 },
    { name: 'weight_kg', type: 'REAL', default: 0 },
    { name: 'customer', type: 'TEXT' },
    { name: 'signer', type: 'TEXT' },
    { name: 'received_amount', type: 'DECIMAL(10,2)', default: 0 },
    { name: 'invoice_amount', type: 'DECIMAL(10,2)', default: 0 }
  ])
  ensureColumns('stock_in_items', [
    { name: 'item_code', type: 'TEXT' },
    { name: 'item_name', type: 'TEXT' },
    { name: 'color', type: 'TEXT' },
    { name: 'composition', type: 'TEXT' },
    { name: 'process_code', type: 'TEXT' },
    { name: 'gram_weight', type: 'INTEGER', default: 0 },
    { name: 'rolls', type: 'INTEGER', default: 0 },
    { name: 'weight_kg', type: 'REAL', default: 0 },
    { name: 'supplier', type: 'TEXT' },
    { name: 'signer', type: 'TEXT' }
  ])
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_out_items_order_item_code ON stock_out_items(stock_out_id, item_code)`)
  // 独立出库记录表（与库存/物料解耦）
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_out_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ship_date TEXT,
      order_no TEXT,
      item_code TEXT,
      customer TEXT,
      item_name TEXT,
      color TEXT,
      composition TEXT,
      process_code TEXT,
      gram_weight INTEGER,
      rolls INTEGER,
      weight_kg REAL,
      price DECIMAL(10,2),
      quantity INTEGER,
      total_amount DECIMAL(10,2),
      received_amount DECIMAL(10,2),
      invoice_amount DECIMAL(10,2),
      signer TEXT,
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_sor_order_no ON stock_out_records(order_no);
    CREATE INDEX IF NOT EXISTS idx_sor_ship_date ON stock_out_records(ship_date);
    CREATE INDEX IF NOT EXISTS idx_sor_item_code ON stock_out_records(item_code);
    CREATE INDEX IF NOT EXISTS idx_sor_customer ON stock_out_records(customer);
    CREATE INDEX IF NOT EXISTS idx_sor_signer ON stock_out_records(signer);
  `)
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_in_items_order_item_code ON stock_in_items(stock_in_id, item_code)`)
}

function createWindow() {
  // 创建浏览器窗口
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
    icon: path.join(__dirname, '../build/icons/icon.png'),
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
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // 设置菜单
  Menu.setApplicationMenu(null)

  mainWindow.on('close', (e) => {
    if (!isQuiting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })

  // 窗口关闭事件
  mainWindow.on('closed', () => {
    mainWindow = null
  })
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

ipcMain.handle('db-transaction', async (event, operations) => {
  try {
    const transaction = db.transaction(() => {
      const results = []
      for (const op of operations) {
        const stmt = db.prepare(op.sql)
        const result = stmt.run(...op.params)
        results.push(result)
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
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password_hash = ? AND is_active = 1').get(username, password)
    if (!user) return { success: false, error: '用户名或密码错误' }
    return { success: true, data: user }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('user-create', async (event, user) => {
  try {
    const stmt = db.prepare('INSERT INTO users (username, password_hash, name, role, email, is_active) VALUES (?, ?, ?, ?, ?, 1)')
    const res = stmt.run(user.username, user.password || '123456', user.name, user.role || 'user', user.email || '')
    return { success: true, data: res }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('user-set-password', async (event, { id, oldPassword, newPassword }) => {
  try {
    const res = db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newPassword, id)
    return { success: true, data: res }
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

ipcMain.handle('get-db-path', async () => {
  const dbPath = path.join(app.getPath('userData'), 'warehouse.db')
  return dbPath
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
      mainWindow.hide(); break
    case 'isMaximized':
      return mainWindow.isMaximized()
  }
  return true
})

// 应用列表（简化：静态返回，后续可改扫描）
ipcMain.handle('apps-list', async () => {
  return [
    { id: 'cloth-io', title: '色布出入库', description: '离线色布出/入库记录', default: true },
    { id: 'system-config', title: '系统配置', description: '系统设置/用户管理/数据备份' }
  ]
})

// 应用准备就绪
app.whenReady().then(() => {
  // 创建数据库
  createDatabase()
  initializeDatabase()
  
  // 创建窗口
  createWindow()

  try {
    const pngIcon = path.join(__dirname, '../build/icons/icon.png')
    const icoIcon = path.join(__dirname, '../node_modules/app-builder-lib/templates/icons/proton-native/proton-native.ico')
    const iconPath = fs.existsSync(pngIcon) ? pngIcon : icoIcon
    tray = new Tray(iconPath)
    const contextMenu = Menu.buildFromTemplate([
      { label: '显示', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus() } } },
      { label: '隐藏', click: () => { if (mainWindow) { mainWindow.hide() } } },
      { type: 'separator' },
      { label: '退出', click: () => { isQuiting = true; app.quit() } }
    ])
    tray.setToolTip('仓库管理系统')
    tray.setContextMenu(contextMenu)
    tray.on('click', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus() } })
    tray.on('double-click', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus() } })
  } catch {}

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
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
})
