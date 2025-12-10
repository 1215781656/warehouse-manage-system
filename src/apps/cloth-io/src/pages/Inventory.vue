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
        <span class="label">品名规格</span>
        <el-input v-model="search.item_name" size="small" style="width:180px" />
        <span class="label">成分</span>
        <el-input v-model="search.composition" size="small" style="width:180px" />
        <span class="label">克重(g/m²)</span>
        <el-input v-model.number="search.gram_weight" size="small" style="width:120px" />
        <span class="label">全幅宽(cm)</span>
        <el-input v-model.number="search.width_cm" size="small" style="width:120px" />
        <span class="label">颜色</span>
        <el-input v-model="search.color" size="small" style="width:120px" />
        <span class="label">色号</span>
        <el-input v-model="search.color_no" size="small" style="width:120px" />
        <el-button size="small" type="primary" style="margin-left:8px" @click="load">查询</el-button>
        <el-button size="small" style="margin-left:8px" @click="reset">重置</el-button>
      </div>
      <div class="select-row">
        <el-checkbox v-model="selectAll" @change="toggleSelectAll">全选所有数据</el-checkbox>
        <span style="margin-left:12px">已选：{{ selectionCount }} 条</span>
      </div>
      <el-table ref="tableRef" :data="rows" stripe style="width:100%" v-loading="loading" :row-key="rowKey" :reserve-selection="true" @selection-change="onSelectionChange">
        <el-table-column type="selection" width="55" :selectable="rowSelectable" />
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
      <div style="display:flex;justify-content:flex-end;margin-top:8px">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          :page-sizes="pageSizes"
          :page-size="pageSize"
          :current-page="currentPage"
          :hide-on-single-page="false"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
  </template>
<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { query } from '@/api/db'
import { searchInventoryPaged, searchInventoryAll } from '@/api/inventory'
import { exportToXLSX, getVisibleColumnsFromTable } from '@/utils/exportExcel'
import { runWithLoading } from '@/utils/ui'

const loading = ref(false)
const rows = ref<any[]>([])
const tableRef = ref<any>(null)
const selectAll = ref(false)
const selectedKeys = ref<Set<any>>(new Set())
const suppressSelectionEvent = ref(false)
const rowKey = (row:any)=> row.fabric_id
const onSelectionChange = (sel:any[]) => { if (suppressSelectionEvent.value) return; selectedKeys.value = new Set(sel.map(r=>rowKey(r))) }
const toggleSelectAll = async () => {
  if (selectAll.value) {
    suppressSelectionEvent.value = true
    rows.value.forEach(r=> tableRef.value?.toggleRowSelection(r, true))
    suppressSelectionEvent.value = false
  } else {
    rows.value.forEach(r=> tableRef.value?.toggleRowSelection(r, false))
    selectedKeys.value.clear()
  }
  await nextTick(); restoreSelection()
}
const rowSelectable = () => !selectAll.value
const selectionCount = computed(()=> selectAll.value ? total.value : selectedKeys.value.size)
const onExport = async () => {
  try {
    let rowsSel: any[] = []
    if (selectAll.value) {
      rowsSel = await searchInventoryAll(search.value)
    } else {
      rowsSel = rows.value.filter(r=> selectedKeys.value.has(rowKey(r)))
      if (!rowsSel.length) { ElMessage.warning('请选择要导出的数据'); return }
    }
    const cols = getVisibleColumnsFromTable(tableRef)
    const ts = new Date().toISOString().slice(0,16).replace(/[-:T]/g,'').replace(/(.{8})(.{4}).*/, '$1_$2')
    await exportToXLSX(`库存查询_${ts}.xlsx`, cols, rowsSel)
    ElMessage.success('已导出')
  } catch (e:any) { /* eslint-disable-next-line */ }
}
const search = ref<{ item_name:string; composition:string; gram_weight:number|''; width_cm:number|''; color:string; color_no:string }>({ item_name:'', composition:'', gram_weight:'', width_cm:'', color:'', color_no:'' })
const pageSize = ref(10)
const pageSizes = ref([10,20,50,100])
const currentPage = ref(1)
const total = ref(0)
const savePagination = () => { try { localStorage.setItem('inventory.pagination', JSON.stringify({ pageSize: pageSize.value, currentPage: currentPage.value })) } catch {} }
const restorePagination = () => { try { const raw = localStorage.getItem('inventory.pagination'); if (raw) { const s = JSON.parse(raw); if (s && s.pageSize) pageSize.value = Number(s.pageSize)||10; if (s && s.currentPage) currentPage.value = Number(s.currentPage)||1 } } catch {} }
const handlePageChange = async (p:number)=>{ suppressSelectionEvent.value = true; currentPage.value = p; savePagination(); await fetchPage(); await nextTick(); restoreSelection(); suppressSelectionEvent.value = false }
const handleSizeChange = async (s:number)=>{ suppressSelectionEvent.value = true; pageSize.value = s; currentPage.value = 1; savePagination(); await fetchPage(); await nextTick(); restoreSelection(); suppressSelectionEvent.value = false }

const ensureTable = async () => {
  const cols:any[] = await query('PRAGMA table_info(cloth_inventory)')
  if (!Array.isArray(cols) || cols.length === 0) throw new Error('系统未初始化库存表，请联系管理员')
}

const rebuildInventory = async () => { try { await (window as any).electronAPI?.rebuildInventory?.() } catch {} }

const fetchPage = async () => {
  const { rows: r, total: t } = await searchInventoryPaged({ ...search.value, page: currentPage.value, pageSize: pageSize.value })
  rows.value = r
  total.value = t
}
const restoreSelection = () => {
  suppressSelectionEvent.value = true
  rows.value.forEach(r=> tableRef.value?.toggleRowSelection(r, selectAll.value || selectedKeys.value.has(rowKey(r))))
  suppressSelectionEvent.value = false
}
const load = async () => {
  await runWithLoading(loading, async () => {
    await ensureTable()
    await rebuildInventory()
    currentPage.value = 1
    savePagination()
    await fetchPage()
  })
  await nextTick(); restoreSelection()
}
const reset = async () => { search.value = { item_name:'', composition:'', gram_weight:'', width_cm:'', color:'', color_no:'' }; currentPage.value = 1; savePagination(); suppressSelectionEvent.value = true; await fetchPage(); await nextTick(); restoreSelection(); suppressSelectionEvent.value = false }

onMounted(async () => { restorePagination(); await load() })
// 数据清空通知后刷新
try { window.electronAPI.onDataCleared(()=> load()) } catch {}
</script>
<style scoped>
.search-row{margin-bottom:6px; display:flex; align-items:center; gap:8px; flex-wrap:wrap}
.select-row{margin:6px 0; padding-left:12px}
</style>
