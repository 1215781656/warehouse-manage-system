export async function query(sql: string, params: any[] = []) {
  if (!window.electronAPI) throw new Error('需要在Electron中运行以访问本地数据库')
  const res = await window.electronAPI.dbQuery(sql, params)
  if (!res.success) throw new Error(res.error || '查询失败')
  return res.data
}

export async function execute(sql: string, params: any[] = []) {
  if (!window.electronAPI) throw new Error('需要在Electron中运行以访问本地数据库')
  const res = await window.electronAPI.dbExecute(sql, params)
  if (!res.success) throw new Error(res.error || '执行失败')
  return res.data
}

export async function transaction(ops: { sql: string; params?: any[] }[]) {
  if (!window.electronAPI) throw new Error('需要在Electron中运行以访问本地数据库')
  const res = await window.electronAPI.dbTransaction(ops)
  if (!res.success) throw new Error(res.error || '事务执行失败')
  return res.data
}

