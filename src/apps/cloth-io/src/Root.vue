<template>
  <el-container class="sub-root">
    <el-aside width="200px" class="aside">
      <div class="sub-title">色布出入库管理</div>
      <el-menu :default-active="active" class="menu" background-color="transparent" text-color="#b8b8b8" active-text-color="#ffffff" @select="onSelect">
        <el-menu-item index="dashboard">仪表盘</el-menu-item>
        <el-menu-item index="in">入库记录</el-menu-item>
        <el-menu-item index="out">出库记录</el-menu-item>
        <el-menu-item index="inventory">库存查询</el-menu-item>
        <el-menu-item index="receivables">应收管理</el-menu-item>
        <el-menu-item index="payables">应付管理</el-menu-item>
      </el-menu>
    </el-aside>
    <el-container class="sub-inner">
      <el-header class="sub-header">
        <div class="sub-name">色布出入库管理</div>
        <div style="flex:1" />
        <el-dropdown trigger="hover" placement="bottom-end">
          <span class="user-info">
            <el-avatar size="small">{{ initials }}</el-avatar>
            <span class="user-name">{{ displayName }}</span>
            <span class="caret">▾</span>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="goHub">应用中心</el-dropdown-item>
              <el-dropdown-item divided @click="doLogout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>
      <el-main>
        <Dashboard v-if="active==='dashboard'" />
        <Out v-else-if="active==='out'" />
        <In v-else-if="active==='in'" />
        <Inventory v-else-if="active==='inventory'" />
        <Receivables v-else-if="active==='receivables'" />
        <Payables v-else />
      </el-main>
    </el-container>
  </el-container>
</template>
<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/store/modules/user'
import Out from './pages/Out.vue'
import In from './pages/In.vue'
import Inventory from './pages/Inventory.vue'
import Receivables from './pages/Receivables.vue'
import Payables from './pages/Payables.vue'
import Dashboard from './pages/Dashboard.vue'
const route = useRoute()
const router = useRouter()
const active = ref<'dashboard'|'out'|'in'|'inventory'|'receivables'|'payables'>('dashboard')
onMounted(()=>{
  const p = String(route.params.page||'dashboard')
  active.value = p==='in'?'in': p==='out'?'out': p==='inventory'?'inventory': p==='receivables'?'receivables': p==='payables'?'payables':'dashboard'
})
const onSelect = (index:string) => router.push(`/app/cloth-io/${index}`)
const userStore = useUserStore()
const displayName = computed(()=> userStore.userInfo?.name || userStore.userInfo?.username || '用户')
const initials = computed(()=> (userStore.userInfo?.name || userStore.userInfo?.username || 'U').slice(0,1))
const goHub = () => router.push('/hub')
const doLogout = () => { userStore.logout(); router.push('/login') }
watch(()=>route.params.page, (p)=>{
  const v = String(p||'dashboard')
  active.value = v==='in'?'in': v==='out'?'out': v==='inventory'?'inventory': v==='receivables'?'receivables': v==='payables'?'payables':'dashboard'
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
/* 高度约束与滚动，避免底部分页被裁切 */
.sub-root{ height: calc(100vh - 36px); }
.sub-inner{ height: 100%; }
:deep(.el-main){ overflow: auto; }
</style>
