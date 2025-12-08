<template>
  <component :is="Comp" :app-title="title" />
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { loadAppComponent, listApps } from '@/app-shell/appsRegistry'

const route = useRoute()
const title = ref('应用')
const Comp = ref<any>(null)

onMounted(async () => {
  const id = String(route.params.id)
  Comp.value = await loadAppComponent(id)
  const apps = await listApps()
  title.value = apps.find(a=>a.id===id)?.title || '应用'
})
</script>
