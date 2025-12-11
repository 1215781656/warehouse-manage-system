<template>
  <div class="login-container">
    <div class="win-toolbar no-drag">
      <button class="win-btn" title="最小化" @click="minimize">—</button>
      <button class="win-btn" title="最大化/还原" @click="toggleMax">{{ maximized ? '❐' : '□' }}</button>
      <button class="win-btn close" title="关闭" @click="closeWin">×</button>
    </div>
    <div class="page-title">校服仓库管理系统</div>
    <div class="login-card">
      <form class="login-form" @submit.prevent="handleLogin">
        <input
          v-model="username"
          class="form-control"
          placeholder="用户名"
          autocomplete="username"
          @input="onTyping"
        />
        <input
          v-model="password"
          class="form-control"
          type="password"
          placeholder="密码"
          autocomplete="current-password"
          @keyup.enter="handleLogin"
          @input="onTyping"
        />
        <button class="form-control btn-primary" type="submit" :disabled="loading">
          登录
        </button>
        <div class="error-tip" v-if="errorText">{{ errorText }}</div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/modules/user'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const username = ref('')
const password = ref('')
const errorText = ref('')
const maximized = ref(false)

const handleLogin = async () => {
  errorText.value = ''
  if (!username.value || username.value.length < 3) {
    errorText.value = '请输入有效用户名'
    return
  }
  if (!password.value || password.value.length < 6) {
    errorText.value = '请输入有效密码'
    return
  }
  loading.value = true
  const success = await userStore.login(username.value, password.value)
  loading.value = false
  if (success) {
    router.push('/app/cloth-io')
  } else {
    errorText.value = '登录失败'
  }
}

const onTyping = () => {
  try {
    const f = (window as any).__bgLoadStatus
    if (f && !f.started) {
      const g = (window as any).startBackgroundLoad
      if (typeof g === 'function') g('typing')
    }
  } catch {}
}

onMounted(() => {
  try {
    const g = (window as any).startBackgroundLoad
    if (typeof g === 'function') setTimeout(() => g('mount'), 0)
  } catch {}
  try {
    // 初始化窗口状态
    const api = (window as any).windowAPI
    if (api && typeof api.isMaximized === 'function') {
      Promise.resolve(api.isMaximized()).then((v:boolean)=>{ maximized.value = !!v })
    }
  } catch {}
})

const minimize = () => { try { (window as any).windowAPI?.minimize() } catch {} }
const toggleMax = async () => {
  try {
    const api = (window as any).windowAPI
    if (!api) return
    const isMax = await api.isMaximized()
    maximized.value = isMax
    if (isMax) await api.unmaximize(); else await api.maximize()
    maximized.value = await api.isMaximized()
  } catch {}
}
const closeWin = () => { try { (window as any).windowAPI?.close() } catch {} }
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

.page-title{
  position: absolute;
  top: 16px;
  left: 16px;
  color:#ffffff;
  font-weight:700;
  letter-spacing: .5px;
}

.win-toolbar{ position:absolute; top:6px; right:8px; display:flex; gap:6px }
.win-btn{ background:transparent; border:none; color:#cfd8dc; height:28px; min-width:28px; padding:0 8px; font-size:18px; border-radius:6px; cursor:pointer }
.win-btn:hover{ background:rgba(255,255,255,0.08) }
.win-btn:active{ background:rgba(255,255,255,0.12) }
.win-btn.close{ color:#ff8a80 }
.drag{ -webkit-app-region: drag }
.no-drag{ -webkit-app-region: no-drag }

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

.login-header { display:none }

.login-form {
  margin-bottom: 20px;
}

.form-control{ width:100%; height:40px; min-height:40px; display:block; margin-bottom:14px; padding:0 12px; border-radius:6px; border:1px solid #0f4c75; background: rgba(15, 76, 117, 0.1); color:#ffffff; box-shadow: 0 0 10px rgba(15, 76, 117, 0.2) }
.form-control:focus{ outline:none; border-color:#3282b8; box-shadow: 0 0 15px rgba(50, 130, 184, 0.4) }
.btn-primary{ background: linear-gradient(45deg, #0f4c75, #3282b8); border:none; cursor:pointer; font-weight:600 }
.btn-primary:disabled{ opacity:.6; cursor:not-allowed }

.login-footer {
  text-align: center;
  color: #b8b8b8;
  font-size: 12px;
}

.error-tip{margin-top:10px; text-align:center; color:#ff8a80; font-size:13px}

@media (max-width: 480px){
  .login-card{ width: calc(100% - 32px); padding: 24px }
  .page-title{ top:10px; left:10px }
  .win-toolbar{ top:4px; right:6px }
}
</style>
