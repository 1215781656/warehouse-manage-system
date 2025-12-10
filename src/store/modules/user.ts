import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'

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
        ElMessage.error(response.error || '登录失败')
        return false
      }
      const user = response.data

      userInfo.value = user
      token.value = `${username}_${Date.now()}`
      localStorage.setItem('token', token.value)
      localStorage.setItem('userInfo', JSON.stringify(user))
      
      ElMessage.success('登录成功')
      return true
    } catch (error) {
      ElMessage.error('登录失败: ' + (error as any).message)
      return false
    }
  }

  // 登出
  const logout = () => {
    userInfo.value = null
    token.value = ''
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
    ElMessage.success('已退出登录')
  }

  // 检查登录状态
  const checkLoginStatus = () => {
    const savedToken = localStorage.getItem('token')
    const savedUserInfo = localStorage.getItem('userInfo')
    
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
        ElMessage.error('用户未登录')
        return false
      }

      const response = await window.electronAPI.userSetPassword(userInfo.value.id, oldPassword, newPassword)

      if (!response.success) {
        throw new Error(response.error)
      }

      ElMessage.success('密码修改成功')
      return true
    } catch (error) {
      ElMessage.error('密码修改失败: ' + error.message)
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
      ElMessage.error('获取用户列表失败: ' + error.message)
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

      ElMessage.success('用户创建成功')
      return true
    } catch (error) {
      ElMessage.error('用户创建失败: ' + error.message)
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

      ElMessage.success('用户更新成功')
      return true
    } catch (error) {
      ElMessage.error('用户更新失败: ' + error.message)
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

      ElMessage.success('用户删除成功')
      return true
    } catch (error) {
      ElMessage.error('用户删除失败: ' + error.message)
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
