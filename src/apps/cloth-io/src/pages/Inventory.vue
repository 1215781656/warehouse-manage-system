<template>
  <div>
    <el-card shadow="never">
      <template #header>
        <div style="display:flex;align-items:center">
          <span style="font-weight:600">库存查询</span>
          <div style="flex:1" />
          <el-button size="small" style="margin-left:8px;color:#fff;background:#4CAF50;border-color:#4CAF50" @click="onExport">导出</el-button>
        </div>
      </template>
      <div class="search-row">
        <span class="label">编号</span>
        <el-input v-model="search.item_code" size="small" style="width:160px" />
        <span class="label">品名</span>
        <el-input v-model="search.item_name" size="small" style="width:160px" />
        <span class="label">颜色</span>
        <el-input v-model="search.color" size="small" style="width:120px" />
        <span class="label">色号</span>
        <el-input v-model="search.color_no" size="small" style="width:120px" />
        <el-button size="small" type="primary" style="margin-left:8px" @click="load">查询</el-button>
        <el-button size="small" style="margin-left:8px" @click="reset">重置</el-button>
      </div>
      <div class="select-row"><el-checkbox v-model="selectAll" @change="toggleSelectAll">全选所有数据</el-checkbox></div>
      <el-table ref="tableRef" :data="filtered" stripe style="width:100%" v-loading="loading" :row-key="rowKey" @selection-change="onSelectionChange">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="item_name" label="品名规格" min-width="180" />
        <el-table-column prop="composition" label="成分" min-width="180" />
        <el-table-column prop="gram_weight" label="克重(g/m²)" width="120" />
        <el-table-column prop="width_cm" label="全幅宽(cm)" width="120" />
        <el-table-column prop="color" label="颜色" width="100" />
        <el-table-column prop="color_no" label="色号" width="100" />
        <el-table-column prop="total_in_rolls" label="入库匹数" width="110" />
        <el-table-column prop="total_in_weight" label="入库重量(kg)" width="140" />
        <el-table-column prop="total_out_rolls" label="出库匹数" width="110" />
        <el-table-column prop="total_out_weight" label="出库重量(kg)" width="140" />
        <el-table-column prop="current_rolls" label="库存匹数" width="110" />
        <el-table-column prop="current_weight" label="库存重量(kg)" width="140" />
        <el-table-column prop="last_updated" label="更新时间" width="160" />
      </el-table>
    </el-card>
  </div>
  </template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { query, execute } from '@/api/db'
import { exportToXLSX, getVisibleColumnsFromTable } from '@/utils/exportExcel'

const loading = ref(false)
const rows = ref<any[]>([])
const tableRef = ref<any>(null)
const selectAll = ref(false)
const selectedKeys = ref<Set<any>>(new Set())
const rowKey = (row:any)=> row.fabric_id
const onSelectionChange = (sel:any[]) => { selectedKeys.value = new Set(sel.map(r=>rowKey(r))) }
const toggleSelectAll = () => {
  if (selectAll.value) filtered.value.forEach(r=> tableRef.value?.toggleRowSelection(r, true))
  else filtered.value.forEach(r=> tableRef.value?.toggleRowSelection(r, false))
}
const onExport = async () => {
  try {
    let rowsSel: any[] = []
    if (selectAll.value) {
      rowsSel = await query('SELECT item_name, composition, gram_weight, width_cm, color, color_no, total_in_rolls, total_in_weight, total_out_rolls, total_out_weight, current_rolls, current_weight, last_updated FROM cloth_inventory ORDER BY last_updated DESC')
    } else {
      rowsSel = filtered.value.filter(r=> selectedKeys.value.has(rowKey(r)))
      if (!rowsSel.length) { ElMessage.warning('请选择要导出的数据'); return }
    }
    const cols = getVisibleColumnsFromTable(tableRef)
    const ts = new Date().toISOString().slice(0,16).replace(/[-:T]/g,'').replace(/(.{8})(.{4}).*/, '$1_$2')
    await exportToXLSX(`库存查询_${ts}.xlsx`, cols, rowsSel)
    ElMessage.success('已导出')
  } catch (e:any) { /* eslint-disable-next-line */ }
}
const search = ref({ item_code:'', item_name:'', color:'', color_no:'' })
const filtered = computed(()=>{
  return rows.value.filter(r=>
    (!search.value.item_code || (r.fabric_id||'').includes(search.value.item_code)) &&
    (!search.value.item_name || (r.item_name||'').includes(search.value.item_name)) &&
    (!search.value.color || (r.color||'').includes(search.value.color)) &&
    (!search.value.color_no || (r.color_no||'').includes(search.value.color_no))
  )
})

const ensureTable = async () => {
  await execute(`CREATE TABLE IF NOT EXISTS cloth_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fabric_id TEXT UNIQUE,
    item_name TEXT,
    color TEXT,
    color_no TEXT,
    composition TEXT,
    gram_weight INTEGER,
    width_cm INTEGER,
    current_rolls INTEGER DEFAULT 0,
    current_weight REAL DEFAULT 0,
    total_in_rolls INTEGER DEFAULT 0,
    total_in_weight REAL DEFAULT 0,
    total_out_rolls INTEGER DEFAULT 0,
    total_out_weight REAL DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)
}

const load = async () => {
  loading.value = true
  try {
    await ensureTable()
    rows.value = await query('SELECT item_name, composition, gram_weight, width_cm, color, color_no, total_in_rolls, total_in_weight, total_out_rolls, total_out_weight, current_rolls, current_weight, last_updated FROM cloth_inventory ORDER BY last_updated DESC LIMIT 1000')
  } finally { loading.value=false }
}
const reset = () => { search.value = { item_code:'', item_name:'', color:'', color_no:'' } }

onMounted(load)
</script>
<style scoped>
.search-row{margin-bottom:6px; display:flex; align-items:center; gap:8px; flex-wrap:wrap}
.select-row{margin:6px 0; padding-left:12px}
</style>
