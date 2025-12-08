<template>
  <el-container>
    <el-aside width="200px" class="aside">
      <div class="sub-title">系统配置</div>
      <el-menu :default-active="active" class="menu" background-color="transparent" text-color="#b8b8b8" active-text-color="#ffffff" @select="onSelect">
        <el-menu-item index="settings">系统设置</el-menu-item>
        <el-menu-item index="users">用户管理</el-menu-item>
        <el-menu-item index="backup">数据备份</el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="sub-header">
        <div class="sub-name">系统配置</div>
      </el-header>
      <el-main>
        <Settings v-if="active==='settings'" />
        <Users v-else-if="active==='users'" />
        <Backup v-else />
      </el-main>
    </el-container>
  </el-container>
</template>
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Settings from './pages/Config.vue'
import Users from './pages/Users.vue'
import Backup from './pages/Backup.vue'
const route = useRoute()
const router = useRouter()
const active = ref<'settings'|'users'|'backup'>('settings')
onMounted(()=>{
  const p = String(route.params.page||'settings')
  active.value = p==='users'? 'users' : p==='backup'? 'backup' : 'settings'
})
const onSelect = (index:string) => router.push(`/app/system-config/${index}`)
watch(()=>route.params.page, (p)=>{
  const v = String(p||'settings')
  active.value = v==='users'? 'users' : v==='backup'? 'backup' : 'settings'
})
</script>
<style scoped>
.sub-title{color:#fff;font-weight:700;padding:10px 12px}
.sub-header{height:40px;border-bottom:1px solid #0f4c75;color:#fff;display:flex;align-items:center}
.menu{border-right:none}
.aside{border-right:1px solid #0f4c75; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)}
:deep(.el-menu){background: transparent}
:deep(.el-menu-item){color:#b8b8b8}
:deep(.el-menu-item.is-active){background: rgba(15,76,117,0.25); color:#fff; border-left:2px solid #0f4c75}
</style>
