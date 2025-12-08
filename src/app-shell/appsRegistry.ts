export interface AppManifest {
  id: string
  title: string
  description?: string
  default?: boolean
}

export async function listApps(): Promise<AppManifest[]> {
  if (window.appsAPI?.list) {
    const res = await window.appsAPI.list()
    if (Array.isArray(res)) return res
  }
  return [
    { id: 'cloth-io', title: '色布出入库', description: '离线色布出/入库记录', default: true },
    { id: 'system-config', title: '系统配置', description: '系统设置/用户管理/数据备份' }
  ]
}

export async function loadAppComponent(id: string) {
  switch (id) {
    case 'cloth-io':
      return (await import('../apps/cloth-io/src/Root.vue')).default
    case 'system-config':
      return (await import('../apps/system-config/src/Root.vue')).default
    default:
      throw new Error('未知应用: ' + id)
  }
}

