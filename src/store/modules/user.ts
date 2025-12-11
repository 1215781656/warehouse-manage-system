import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
const notify = (type: 'success' | 'error' | 'warning' | 'info', msg: string) => {
  try {
    const fn = (window as any).__notify
    if (typeof fn === 'function') fn(type, msg)
  } catch {}
}

export interface User {
  id: number
  username: string
  name: string
  role: 'admin' | 'manager' | 'user'
  email?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export const useUserStore = defineStore('user', () => {
  const userInfo = ref<User | null>(null)
  const token = ref<string>('')
  const isLoggedIn = computed(() => !!token.value && !!userInfo.value)

  // 登录
  const login = async (username: string, password: string) => {
    try {
      if (!('electronAPI' in window)) {
        throw new Error('请在桌面应用中运行，浏览器预览无法连接本地数据库')
      }
      const response = await window.electronAPI.authLogin(username, password)
      if (!response.success) {
        notify('error', response.error || '登录失败')
        return false
      }
      const user = response.data

      userInfo.value = user
      token.value = `${username}_${Date.now()}`
      sessionStorage.setItem('token', token.value)
      sessionStorage.setItem('userInfo', JSON.stringify(user))
      
      notify('success', '登录成功')
      return true
    } catch (error) {
      notify('error', '登录失败: ' + (error as any).message)
      return false
    }
  }

  // 登出
  const logout = () => {
    userInfo.value = null
    token.value = ''
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('userInfo')
    notify('success', '已退出登录')
  }

  // 检查登录状态
  const checkLoginStatus = () => {
    const savedToken = sessionStorage.getItem('token')
    const savedUserInfo = sessionStorage.getItem('userInfo')
    
    if (savedToken && savedUserInfo) {
      token.value = savedToken
      userInfo.value = JSON.parse(savedUserInfo)
    }
  }

  // 修改密码
  const changePassword = async (oldPassword: string, newPassword: string) => {
    try {
      if (!('electronAPI' in window)) {
        throw new Error('请在桌面应用中运行，浏览器预览无法连接本地数据库')
      }
      if (!userInfo.value) {
        notify('error', '用户未登录')
        return false
      }

      const response = await window.electronAPI.userSetPassword(userInfo.value.id, oldPassword, newPassword)

      if (!response.success) {
        throw new Error(response.error)
      }

      notify('success', '密码修改成功')
      return true
    } catch (error) {
      notify('error', '密码修改失败: ' + (error as any).message)
      return false
    }
  }

  // 获取用户列表
  const getUserList = async () => {
    try {
      if (!('electronAPI' in window)) {
        throw new Error('请在桌面应用中运行，浏览器预览无法连接本地数据库')
      }
      const response = await window.electronAPI.dbQuery(
        'SELECT id, username, name, role, email, is_active, created_at, updated_at FROM users ORDER BY created_at DESC'
      )

      if (!response.success) {
        throw new Error(response.error)
      }

      return response.data
    } catch (error) {
      notify('error', '获取用户列表失败: ' + (error as any).message)
      return []
    }
  }

  // 创建用户
  const createUser = async (userData: Partial<User>) => {
    try {
      if (!('electronAPI' in window)) {
        throw new Error('请在桌面应用中运行，浏览器预览无法连接本地数据库')
      }
      const response = await window.electronAPI.userCreate({
        username: userData.username,
        password: (userData as any).password || userData.password_hash,
        name: userData.name,
        role: userData.role,
        email: userData.email
      })

      if (!response.success) {
        throw new Error(response.error)
      }

      notify('success', '用户创建成功')
      return true
    } catch (error) {
      notify('error', '用户创建失败: ' + (error as any).message)
      return false
    }
  }

  // 更新用户
  const updateUser = async (id: number, userData: Partial<User>) => {
    try {
      if (!('electronAPI' in window)) {
        throw new Error('请在桌面应用中运行，浏览器预览无法连接本地数据库')
      }
      const response = await window.electronAPI.dbExecute(
        'UPDATE users SET name = ?, role = ?, email = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [userData.name, userData.role, userData.email, userData.is_active, id]
      )

      if (!response.success) {
        throw new Error(response.error)
      }

      notify('success', '用户更新成功')
      return true
    } catch (error) {
      notify('error', '用户更新失败: ' + (error as any).message)
      return false
    }
  }

  // 删除用户
  const deleteUser = async (id: number) => {
    try {
      if (!('electronAPI' in window)) {
        throw new Error('请在桌面应用中运行，浏览器预览无法连接本地数据库')
      }
      const response = await window.electronAPI.dbExecute(
        'DELETE FROM users WHERE id = ?',
        [id]
      )

      if (!response.success) {
        throw new Error(response.error)
      }

      notify('success', '用户删除成功')
      return true
    } catch (error) {
      notify('error', '用户删除失败: ' + (error as any).message)
      return false
    }
  }

  return {
    userInfo,
    token,
    isLoggedIn,
    login,
    logout,
    checkLoginStatus,
    changePassword,
    getUserList,
    createUser,
    updateUser,
    deleteUser
  }
})
