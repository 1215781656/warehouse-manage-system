<template>
  <div>
    <el-card shadow="never">
      <template #header>
        <div style="display:flex;align-items:center">
          <span style="font-weight:600">应用中心</span>
        </div>
      </template>
      <el-row :gutter="12">
        <el-col :span="6" v-for="app in apps" :key="app.id">
          <el-card shadow="hover">
            <div style="font-weight:600">{{ app.title }}</div>
            <div style="color:#b8b8b8; font-size:12px; margin-top:6px">{{ app.description }}</div>
            <div style="margin-top:10px">
              <el-button type="primary" size="small" @click="open(app)">进入应用</el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listApps } from '@/app-shell/appsRegistry'
const router = useRouter()
const apps = ref<{id:string; title:string; description?:string}[]>([])
onMounted(async ()=>{
  apps.value = await listApps()
})
const open = (app:any) => {
  const defaultPage = app.id === 'cloth-io' ? 'dashboard' : (app.id === 'system-config' ? 'settings' : '')
  router.push(`/app/${app.id}/${defaultPage}`)
}
</script>
