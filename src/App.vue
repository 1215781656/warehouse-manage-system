<template>
  <div id="app">
    <HeaderBar />
    <template v-if="isLoggedIn">
      <template v-if="isSubApp">
        <router-view />
      </template>
      <template v-else>
        <el-container style="height: 100vh">
          <el-aside width="220px" class="aside">
            <div class="brand">校服仓库</div>
            <el-menu :default-active="activeMenu" class="menu" router background-color="transparent" text-color="#b8b8b8" active-text-color="#ffffff">
              <!-- Host侧边栏不再出现应用中心与仪表盘，入口在头部提供 -->
            </el-menu>
          </el-aside>
          <el-container>
            <el-header class="header">
              <div class="title">校服仓库管理系统</div>
              <div class="spacer" />
              <el-button type="primary" size="small" @click="goQuick('in')">快速入库</el-button>
              <el-button type="warning" size="small" style="margin-left:8px" @click="goQuick('out')">快速出库</el-button>
              <el-divider direction="vertical" />
              <el-dropdown>
                <span class="el-dropdown-link">{{ userStore.userInfo?.name || '用户' }}<el-icon><ArrowDown /></el-icon></span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="router.push('/hub')">应用中心</el-dropdown-item>
                    <el-dropdown-item divided @click="userStore.logout(); router.push('/login')">退出登录</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </el-header>
            <el-main class="main">
              <router-view />
            </el-main>
          </el-container>
        </el-container>
      </template>
    </template>
    <template v-else>
      <router-view />
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useUserStore } from '@/store/modules/user'
import { useRoute, useRouter } from 'vue-router'
import { Monitor, Collection, Goods, DataAnalysis, Setting, ArrowDown } from '@element-plus/icons-vue'
import HeaderBar from '@/components/HeaderBar.vue'

const userStore = useUserStore()
const route = useRoute()
const router = useRouter()
const isLoggedIn = computed(() => userStore.isLoggedIn)
const activeMenu = computed(() => route.path)
const isSubApp = computed(() => route.path.startsWith('/app/'))

const goQuick = (type: 'in' | 'out') => {
  router.push(type === 'in' ? '/app/cloth-io/in' : '/app/cloth-io/out')
}

onMounted(() => {
  // 检查是否有登录用户
  const token = localStorage.getItem('token')
  if (token) {
    userStore.checkLoginStatus()
  }
})
</script>

<style>
/* 全局样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #ffffff;
  overflow: hidden;
}

#app {
  height: 100vh;
  width: 100vw;
}

.aside {
  border-right: 1px solid #0f4c75;
  padding-top: 12px;
}
.brand {
  color: #ffffff;
  font-weight: 700;
  padding: 12px 16px;
  margin-bottom: 8px;
}
.menu {
  border-right: none;
}
.header {
  display: flex;
  align-items: center;
  height: 56px;
  border-bottom: 1px solid #0f4c75;
}
.title {
  font-size: 16px;
  font-weight: 600;
}
.spacer { flex: 1; }
.main { padding: 16px; overflow: auto; }

/* 赛博朋克主题样式 */
.cyberpunk-theme {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 1px solid #0f4c75;
  box-shadow: 0 0 20px rgba(15, 76, 117, 0.3);
}

.cyberpunk-button {
  background: linear-gradient(45deg, #0f4c75, #3282b8);
  border: none;
  color: white;
  padding: 12px 24px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(15, 76, 117, 0.4);
}

.cyberpunk-button:hover {
  background: linear-gradient(45deg, #3282b8, #0f4c75);
  box-shadow: 0 6px 20px rgba(15, 76, 117, 0.6);
  transform: translateY(-2px);
}

.cyberpunk-input {
  background: rgba(15, 76, 117, 0.1);
  border: 1px solid #0f4c75;
  color: #ffffff;
  padding: 10px 15px;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.cyberpunk-input:focus {
  outline: none;
  border-color: #3282b8;
  box-shadow: 0 0 10px rgba(50, 130, 184, 0.5);
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(15, 76, 117, 0.1);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: linear-gradient(45deg, #0f4c75, #3282b8);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(45deg, #3282b8, #0f4c75);
}
</style>
