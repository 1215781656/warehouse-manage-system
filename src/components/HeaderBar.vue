<template>
  <div class="header-bar" :class="{drag:true}">
    <div class="left no-drag">
      <span class="title">校服仓库管理系统</span>
      <el-button size="small" class="hub-btn" @click="goHub">应用中心</el-button>
    </div>
    <div class="right no-drag">
      <el-button size="small" @click="windowAPI.minimize()">—</el-button>
      <el-button size="small" @click="toggleMax">□</el-button>
      <el-button size="small" type="danger" @click="windowAPI.close()">×</el-button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()
// @ts-ignore
const windowAPI = window.windowAPI
const maximized = ref(false)
const goHub = () => router.push('/hub')
const toggleMax = async () => {
  const isMax = await windowAPI.isMaximized()
  maximized.value = isMax
  if (isMax) {
    windowAPI.unmaximize()
  } else {
    windowAPI.maximize()
  }
}
</script>
<style scoped>
.header-bar{height:36px; display:flex; align-items:center; justify-content:space-between; padding:0 8px; background:linear-gradient(135deg,#0f1e33,#16213e); border-bottom:1px solid #0f4c75; box-shadow:0 0 10px rgba(15,76,117,.3)}
.title{color:#fff; font-weight:700; margin-right:12px}
.hub-btn{margin-left:8px; background:linear-gradient(45deg,#0f4c75,#3282b8); border:none; color:#fff}
.left{display:flex; align-items:center}
.right .el-button{margin-left:6px}
.drag{ -webkit-app-region: drag }
.no-drag{ -webkit-app-region: no-drag }
</style>
