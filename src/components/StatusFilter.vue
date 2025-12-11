<template>
  <div class="status-filter">
    <el-select v-model="value" :loading="loading" style="min-width:140px;height:32px" :aria-label="ariaLabel" @change="onChange" :teleported="false">
      <el-option v-for="opt in options" :key="opt.value" :label="opt.label" :value="opt.value" />
    </el-select>
  </div>
</template>
<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

const props = defineProps<{ modelValue?: string; loading?: boolean; storageKey?: string; ariaLabel?: string }>()
const emit = defineEmits(['update:modelValue','change'])

const options = [
  { label: '全部', value: 'all' },
  { label: '待付款', value: 'pending' },
  { label: '已完成付款', value: 'done' }
]
const key = props.storageKey || 'status-filter'
const loading = props.loading || false
const ariaLabel = props.ariaLabel || '付款状态筛选'
const value = ref(props.modelValue ?? 'all')
let timer: any = null

const save = (v: string) => { try { localStorage.setItem(key, v) } catch {} }
const load = () => { try { const v = localStorage.getItem(key); return v || null } catch { return null } }

onMounted(() => {
  const v = load()
  value.value = v || value.value || 'all'
  emit('update:modelValue', value.value)
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => { emit('change', value.value) }, 300)
})

watch(value, (v) => { save(v); emit('update:modelValue', v) })

watch(() => props.modelValue, (v) => {
  const nv = v ?? 'all'
  if (nv !== value.value) {
    value.value = nv
    save(nv)
  }
})

const onChange = (v: string) => {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => { emit('change', v) }, 300)
}
</script>
<style scoped>
.status-filter { display:inline-flex;height: 32px; }
.status-filter :deep(.el-select), .status-filter :deep(.el-input__wrapper) { height:32px; min-height:32px }
.status-filter :deep(.el-select .el-select__selected-item) { line-height:32px }
@media (max-width: 640px) { .status-filter { width: 100% } }
</style>
