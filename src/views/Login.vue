<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1 class="login-title">校服仓库管理系统</h1>
        <p class="login-subtitle">Warehouse Management System</p>
      </div>
      
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入用户名"
            size="large"
            class="cyberpunk-input"
          >
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            class="cyberpunk-input"
            @keyup.enter="handleLogin"
          >
            <template #prefix>
              <el-icon><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="login-button cyberpunk-button"
            :loading="loading"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="login-footer">
        <p></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/modules/user'

const router = useRouter()
const userStore = useUserStore()

const loginFormRef = ref()
const loading = ref(false)

const loginForm = reactive({
  username: '',
  password: ''
})

const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  try {
    await loginFormRef.value.validate()
    loading.value = true
    
    const success = await userStore.login(loginForm.username, loginForm.password)
    
    if (success) {
      router.push('/app/cloth-io')
    }
  } catch (error) {
    console.error('登录验证失败:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  position: relative;
  overflow: hidden;
}

.login-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 20% 80%, rgba(15, 76, 117, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255, 107, 53, 0.2) 0%, transparent 50%);
  pointer-events: none;
}

.login-card {
  background: rgba(26, 26, 46, 0.9);
  border: 1px solid #0f4c75;
  border-radius: 12px;
  padding: 40px;
  width: 400px;
  box-shadow: 
    0 0 40px rgba(15, 76, 117, 0.5),
    inset 0 0 20px rgba(15, 76, 117, 0.1);
  backdrop-filter: blur(10px);
  position: relative;
  z-index: 1;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-title {
  font-size: 24px;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 8px;
  text-shadow: 0 0 10px rgba(50, 130, 184, 0.8);
}

.login-subtitle {
  font-size: 14px;
  color: #b8b8b8;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.login-form {
  margin-bottom: 20px;
}

.login-button {
  width: 100%;
  font-size: 16px;
  font-weight: bold;
  letter-spacing: 1px;
}

.login-footer {
  text-align: center;
  color: #b8b8b8;
  font-size: 12px;
}

/* Element Plus 样式覆盖 */
:deep(.el-input__wrapper) {
  background: rgba(15, 76, 117, 0.1);
  border: 1px solid #0f4c75;
  box-shadow: 0 0 10px rgba(15, 76, 117, 0.2);
}

:deep(.el-input__wrapper:hover) {
  border-color: #3282b8;
  box-shadow: 0 0 15px rgba(50, 130, 184, 0.4);
}

:deep(.el-input__inner) {
  color: #ffffff;
}

:deep(.el-input__prefix) {
  color: #3282b8;
}
</style>
