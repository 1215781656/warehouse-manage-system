const { contextBridge, ipcRenderer } = require('electron')

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 数据库操作
  dbQuery: (sql, params) => ipcRenderer.invoke('db-query', sql, params),
  dbExecute: (sql, params) => ipcRenderer.invoke('db-execute', sql, params),
  dbTransaction: (operations) => ipcRenderer.invoke('db-transaction', operations),
  authLogin: (username, password) => ipcRenderer.invoke('auth-login', { username, password }),
  userCreate: (user) => ipcRenderer.invoke('user-create', user),
  userSetPassword: (id, oldPassword, newPassword) => ipcRenderer.invoke('user-set-password', { id, oldPassword, newPassword }),
  resetAdmin: () => ipcRenderer.invoke('reset-admin'),
  backupDb: (targetPath) => ipcRenderer.invoke('backup-db', targetPath),
  restoreDb: (sourcePath) => ipcRenderer.invoke('restore-db', sourcePath),
  getDbPath: () => ipcRenderer.invoke('get-db-path'),
  cleanupLegacy: () => ipcRenderer.invoke('cleanup-legacy'),
  resetDb: () => ipcRenderer.invoke('reset-db'),
  mergeDb: (sourcePath) => ipcRenderer.invoke('merge-db', sourcePath),
  rebuildInventory: () => ipcRenderer.invoke('rebuild-inventory'),
  genBizId: (prefix, date) => ipcRenderer.invoke('gen-biz-id', { prefix, date }),
  genItemCode: (date) => ipcRenderer.invoke('gen-item-code', date),
  validateOutItemCode: (item_code, exclude_id) => ipcRenderer.invoke('validate-out-item-code', { item_code, exclude_id }),
  clearData: (mode) => ipcRenderer.invoke('clear-data', { mode }),
  onDataCleared: (cb) => ipcRenderer.on('data-cleared', (_e, payload) => { try { cb && cb(payload) } catch {} }),
  readFileBuffer: (relPath) => ipcRenderer.invoke('read-file-buffer', relPath),
  
  // 应用信息
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // 文件操作
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  
  // 系统信息
  getSystemInfo: () => ipcRenderer.invoke('get-system-info')
})

// 窗口控制
contextBridge.exposeInMainWorld('windowAPI', {
  minimize: () => ipcRenderer.invoke('win-control', 'minimize'),
  maximize: () => ipcRenderer.invoke('win-control', 'maximize'),
  unmaximize: () => ipcRenderer.invoke('win-control', 'unmaximize'),
  close: () => ipcRenderer.invoke('win-control', 'close'),
  isMaximized: () => ipcRenderer.invoke('win-control', 'isMaximized')
})

// 应用列表 API
contextBridge.exposeInMainWorld('appsAPI', {
  list: () => ipcRenderer.invoke('apps-list')
})
