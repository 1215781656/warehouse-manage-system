import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './styles/global.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
;(window as any).__APP__ = app
;(window as any).__bgLoadStatus = { started: false, done: false, errors: [], steps: [] }
app.mount('#app')

const isLogin = () => location.hash.includes('/login')
function startBackgroundLoad(trigger: 'mount' | 'typing') {
  const st = (window as any).__bgLoadStatus
  st.started = true
  st.steps.push(trigger)
  ;(async () => {
    try {
      st.steps.push('element-plus')
      const [{ default: ElementPlus }, { default: zhCn }] = await Promise.all([
        import('element-plus'),
        import('element-plus/es/locale/lang/zh-cn')
      ])
      await import('element-plus/dist/index.css')
      app.use(ElementPlus, { locale: zhCn })
      const { ElMessage } = await import('element-plus')
      ;(window as any).__notify = (type: any, msg: string) => ElMessage[type](msg)
    } catch (e) {
      st.errors.push('element-plus')
    }
    try {
      st.steps.push('charts')
      await Promise.all([import('echarts'), import('vue-echarts')])
    } catch (e) {
      st.errors.push('charts')
    }
    try {
      st.steps.push('excel')
      await Promise.all([import('exceljs'), import('xlsx')])
    } catch (e) {
      st.errors.push('excel')
    }
    st.done = true
  })()
}

if (isLogin()) {
  setTimeout(() => startBackgroundLoad('mount'), 0)
} else {
  startBackgroundLoad('mount')
}

(window as any).startBackgroundLoad = startBackgroundLoad

router.beforeEach((to, from, next) => {
  if (to.path !== '/login' && !(window as any).__bgLoadStatus?.started) {
    startBackgroundLoad('mount')
  }
  next()
})

document.addEventListener('input', () => {
  if (isLogin() && !(window as any).__bgLoadStatus?.started) {
    startBackgroundLoad('typing')
  }
})
