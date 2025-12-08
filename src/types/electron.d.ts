export {}
declare global {
  interface Window {
    electronAPI?: {
      dbQuery: (sql: string, params?: any[]) => Promise<{ success: boolean; data?: any; error?: string }>
      dbExecute: (sql: string, params?: any[]) => Promise<{ success: boolean; data?: any; error?: string }>
      dbTransaction: (ops: { sql: string; params?: any[] }[]) => Promise<{ success: boolean; data?: any; error?: string }>
      authLogin: (username: string, password: string) => Promise<{ success: boolean; data?: any; error?: string }>
      userCreate: (user: any) => Promise<{ success: boolean; data?: any; error?: string }>
      userSetPassword: (id: number, oldPassword: string, newPassword: string) => Promise<{ success: boolean; data?: any; error?: string }>
      backupDb: (targetPath?: string) => Promise<{ success: boolean; data?: any; error?: string }>
      restoreDb: (sourcePath?: string) => Promise<{ success: boolean; data?: any; error?: string }>
      getDbPath: () => Promise<string>
      getAppVersion: () => Promise<string>
      showSaveDialog: (options: any) => Promise<any>
      showOpenDialog: (options: any) => Promise<any>
      getSystemInfo: () => Promise<any>
    }
  }
}

