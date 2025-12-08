import { createRouter, createWebHashHistory } from 'vue-router'
import { useUserStore } from '@/store/modules/user'

const routes = [
  {
    path: '/',
    redirect: '/app/cloth-io/out'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue')
  },
  {
    path: '/dashboard',
    redirect: '/app/cloth-io/out'
  },
  {
    path: '/hub',
    name: 'AppsHub',
    component: () => import('@/views/AppsHub.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/app/:id/:page?',
    name: 'AppRuntime',
    component: () => import('@/views/AppRuntime.vue'),
    meta: { requiresAuth: true }
  },
  
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next('/login')
  } else if (to.meta.requiresAdmin && userStore.userInfo?.role !== 'admin') {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
