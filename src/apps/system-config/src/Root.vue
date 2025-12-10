<template>
  <el-container>
    <el-aside width="200px" class="aside">
      <div class="sub-title">系统配置</div>
      <el-menu :default-active="active" class="menu" background-color="transparent" text-color="#b8b8b8" active-text-color="#ffffff" @select="onSelect">
        <el-menu-item index="users">用户管理</el-menu-item>
        <el-menu-item index="backup">数据备份</el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="sub-header">
        <div class="sub-name">系统配置</div>
        <div style="flex:1" />
        <el-dropdown trigger="hover" placement="bottom-end">
          <span class="user-info">
            <el-avatar size="small">{{ initials }}</el-avatar>
            <span class="user-name">{{ displayName }}</span>
            <span class="caret">▾</span>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item divided @click="doLogout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>
      <el-main>
        <Users v-if="active==='users'" />
        <Backup v-else />
      </el-main>
    </el-container>
  </el-container>
</template>
<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/store/modules/user'
import Users from './pages/Users.vue'
import Backup from './pages/Backup.vue'
const route = useRoute()
const router = useRouter()
const active = ref<'users'|'backup'>('users')
onMounted(()=>{
  const p = String(route.params.page||'users')
  active.value = p==='users'? 'users' : 'backup'
})
const onSelect = (index:string) => router.push(`/app/system-config/${index}`)
const userStore = useUserStore()
const displayName = computed(()=> userStore.userInfo?.name || userStore.userInfo?.username || '用户')
const initials = computed(()=> (userStore.userInfo?.name || userStore.userInfo?.username || 'U').slice(0,1))
const doLogout = () => { userStore.logout(); router.push('/login') }
watch(()=>route.params.page, (p)=>{
  const v = String(p||'users')
  active.value = v==='users'? 'users' : 'backup'
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
.user-info{display:inline-flex; align-items:center; gap:8px; padding:6px 10px; border-radius:8px; background:rgba(255,255,255,0.06); cursor:pointer}
.user-info:hover{background:rgba(255,255,255,0.1)}
.user-name{color:#ffffff}
.caret{color:#cfd8dc}
</style>
