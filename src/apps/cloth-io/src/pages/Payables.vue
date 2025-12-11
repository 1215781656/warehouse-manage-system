<template>
  <div>
    <el-card shadow="never">
      <template #header>
        <div style="display:flex;align-items:center">
          <span style="font-weight:600">应付管理</span>
          <div style="flex:1" />
          <el-button size="small" style="margin-left:8px;color:#fff;background:#4CAF50;border-color:#4CAF50" @click="onExport">导出</el-button>
        </div>
      </template>
      <div class="search-row">
        <span class="label">日期</span>
        <div>
          <el-date-picker v-model="search.range" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束"/>
        </div>
        <span class="label">供应商</span>
        <el-input v-model="search.supplier" size="small" style="width:160px" />
        <span class="label">货单编号</span>
        <el-input v-model="search.order_no" size="small" style="width:160px" />
        <span class="label">付款状态</span>
        <StatusFilter v-model="search.status" :loading="loading" storage-key="status-filter-pay" aria-label="应付付款状态筛选" />
        
        <el-button size="small" type="primary" style="margin-left:8px" @click="load">查询</el-button>
        <el-button size="small" style="margin-left:8px" @click="reset">重置</el-button>
      </div>
      <div class="select-row">
        <el-checkbox v-model="selectAll" @change="toggleSelectAll">全选所有数据</el-checkbox>
        <span style="margin-left:12px">已选：{{ selectionCount }} 条</span>
      </div>
      <el-table ref="tableRef" :data="paged" stripe style="width:100%" v-loading="loading" :row-key="rowKey" :reserve-selection="true" @selection-change="onSelectionChange">
        <el-table-column type="selection" width="55" :selectable="rowSelectable" />
        <el-table-column prop="ship_date" label="入库日期" width="120" />
        <el-table-column prop="order_no" label="货单编号" width="140" />
        
        <el-table-column prop="supplier" label="供应商" width="140" />
        <el-table-column prop="item_name" label="品名规格" min-width="160" />
        <el-table-column prop="rolls" label="匹数" width="100" />
        <el-table-column prop="weight_kg" label="重量(kg)" width="120" />
        <el-table-column prop="price" label="单价(元/kg)" width="120" />
        <el-table-column prop="total_amount" label="金额(元)" width="120" />
        <el-table-column prop="paid_amount" label="已付金额（元）" width="140" />
        <el-table-column prop="unpaid_amount" label="未付金额（元）" width="140" />
        <el-table-column label="操作" fixed="right" width="160">
          <template #default="{row}">
            <el-button size="small" type="primary" @click="openEditPaid(row)">编辑已付金额</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div style="display:flex;justify-content:flex-end;margin-top:8px">
        <el-pagination background layout="total, sizes, prev, pager, next, jumper" :total="total" :page-sizes="pageSizes" :page-size="pageSize" :current-page="currentPage" @size-change="handleSizeChange" @current-change="handlePageChange" />
      </div>
      <el-dialog v-model="dialogVisible" title="编辑已付金额" align-center width="400px">
        <el-form label-width="100px">
          <el-form-item label="货单号"><el-input v-model="editOrderNo" disabled /></el-form-item>
          <el-form-item label="总金额"><el-input :model-value="editTotal" disabled /></el-form-item>
          <el-form-item label="已付金额"><el-input-number v-model="paidEdit" :min="0" :max="editTotal" controls-position="right" /></el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible=false">取消</el-button>
          <el-button type="primary" @click="savePaid">保存</el-button>
        </template>
      </el-dialog>
    </el-card>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { query, execute } from '@/api/db'
import { exportToXLSX, getVisibleColumnsFromTable } from '@/utils/exportExcel'
import { ElMessage } from 'element-plus'
import { runWithLoading } from '@/utils/ui'
import StatusFilter from '@/components/StatusFilter.vue'

const loading = ref(false)
const rows = ref<any[]>([])
const tableRef = ref<any>(null)
const selectAll = ref(false)
const selectedKeys = ref<Set<any>>(new Set())
const suppressSelectionEvent = ref(false)
const rowKey = (row:any)=> `${row.order_no}|${row.ship_date}|${row.item_name||''}`
const onSelectionChange = (sel:any[]) => { if (suppressSelectionEvent.value) return; const pageRows = paged.value; const pageKeys = new Set(pageRows.map(r=>rowKey(r))); const newSel = new Set(sel.map(r=>rowKey(r))); for (const k of Array.from(pageKeys)) selectedKeys.value.delete(k); for (const k of Array.from(newSel)) selectedKeys.value.add(k); if (selectAll.value && newSel.size < pageRows.length) selectAll.value=false }
const toggleSelectAll = async () => { if (selectAll.value) { selectedKeys.value = new Set(filtered.value.map(r=>rowKey(r))); suppressSelectionEvent.value = true; paged.value.forEach(r=> tableRef.value?.toggleRowSelection(r, true)); suppressSelectionEvent.value=false } else { selectedKeys.value.clear(); paged.value.forEach(r=> tableRef.value?.toggleRowSelection(r, false)) } await nextTick(); restoreSelection() }
const rowSelectable = () => !selectAll.value
const selectionCount = computed(()=> selectAll.value ? total.value : selectedKeys.value.size)
const onExport = async () => {
  try {
    let rowsSel: any[] = []
    if (selectAll.value) {
      rowsSel = await query(`
        SELECT sir.ship_date, sir.order_no, sir.supplier, sir.item_name, sir.composition, sir.color, sir.process_code, sir.gram_weight, sir.rolls, sir.weight_kg, sir.price, sir.total_amount,
               p.paid_amount, p.unpaid_amount
        FROM stock_in_records sir
        LEFT JOIN payables p ON p.order_no = sir.order_no
        ORDER BY sir.created_at DESC
      `)
    } else {
      rowsSel = filtered.value.filter(r=> selectedKeys.value.has(rowKey(r)))
      if (!rowsSel.length) { ElMessage.warning('请选择要导出的数据'); return }
    }
    const base = getVisibleColumnsFromTable(tableRef)
    const extra = [
      { prop: 'composition', label: '成分' },
      { prop: 'color', label: '颜色' },
      { prop: 'process_code', label: '工艺' },
      { prop: 'gram_weight', label: '克重(g/m²)' }
    ]
    const existing = new Set(base.map(c=>c.prop))
    const extras = extra.filter(c=>!existing.has(c.prop))
    const insertIdx = base.findIndex(c=>c.prop==='item_name')
    const cols = insertIdx>=0 ? [...base.slice(0, insertIdx+1), ...extras, ...base.slice(insertIdx+1)] : base.concat(extras)
    const ts = new Date().toISOString().slice(0,16).replace(/[-:T]/g,'').replace(/(.{8})(.{4}).*/, '$1_$2')
    await exportToXLSX(`应付管理_${ts}.xlsx`, cols, rowsSel)
    ElMessage.success('已导出')
  } catch (e:any) { ElMessage.error(e.message||'导出失败') }
}
const search = ref<{supplier:string; order_no:string; range: [Date,Date]|null; status: 'all'|'pending'|'done'}>({ supplier:'', order_no:'', range: null, status: 'all' })
const filtered = computed(()=>{
  return rows.value.filter(r=>{
    if (search.value.supplier && !(r.supplier||'').includes(search.value.supplier)) return false
    if (search.value.order_no && !(r.order_no||'').includes(search.value.order_no)) return false
    
    if (search.value.range) {
      const d = new Date(r.ship_date)
      const [s,e] = search.value.range
      const end = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999)
      if (isNaN(d.getTime()) || d < s || d > end) return false
    }
    return true
  })
})
const pageSize = ref(10)
const pageSizes = ref([10,20,50,100])
const currentPage = ref(1)
const total = computed(()=> filtered.value.length)
const paged = computed(()=> filtered.value.slice((currentPage.value-1)*pageSize.value, (currentPage.value-1)*pageSize.value + pageSize.value))
const handlePageChange = async (p:number)=>{ suppressSelectionEvent.value = true; currentPage.value = p; await nextTick(); restoreSelection(); suppressSelectionEvent.value=false }
const handleSizeChange = async (s:number)=>{ suppressSelectionEvent.value = true; pageSize.value = s; currentPage.value = 1; await nextTick(); restoreSelection(); suppressSelectionEvent.value=false }

const ensureTable = async () => {
  await execute(`CREATE TABLE IF NOT EXISTS payables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT UNIQUE,
    supplier TEXT,
    ship_date TEXT,
    total_amount DECIMAL(10,2),
    paid_amount DECIMAL(10,2),
    unpaid_amount DECIMAL(10,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)
}

const load = async () => {
  await runWithLoading(loading, async () => {
    await ensureTable()
    await execute(`
      INSERT INTO payables (order_no, supplier, ship_date, total_amount, paid_amount, unpaid_amount)
      SELECT i.order_no,
             COALESCE(MAX(i.supplier),'') AS supplier,
             COALESCE(MIN(i.ship_date),'') AS ship_date,
             COALESCE(SUM(i.total_amount),0) AS total_amount,
             0 AS paid_amount,
             COALESCE(SUM(i.total_amount),0) AS unpaid_amount
      FROM stock_in_records i
      GROUP BY i.order_no
      HAVING NOT EXISTS (SELECT 1 FROM payables p WHERE p.order_no = i.order_no)
    `)
    await execute(`
      WITH sums AS (
        SELECT order_no, COALESCE(SUM(total_amount),0) AS total
        FROM stock_in_records
        GROUP BY order_no
      )
      UPDATE payables AS p
      SET total_amount = COALESCE((SELECT total FROM sums s WHERE s.order_no = p.order_no), 0),
          unpaid_amount = CASE
            WHEN COALESCE((SELECT total FROM sums s WHERE s.order_no = p.order_no), 0) - COALESCE(p.paid_amount, 0) < 0 THEN 0
            ELSE COALESCE((SELECT total FROM sums s WHERE s.order_no = p.order_no), 0) - COALESCE(p.paid_amount, 0)
          END,
          updated_at = CURRENT_TIMESTAMP
    `)
    const st = search.value.status
    const where = st==='pending' ? 'WHERE COALESCE(p.unpaid_amount,0) > 0' : (st==='done' ? 'WHERE COALESCE(p.unpaid_amount,0) = 0' : '')
    rows.value = await query(`
      SELECT sir.ship_date, sir.order_no, sir.supplier, sir.item_name, sir.composition, sir.color, sir.process_code, sir.gram_weight, sir.rolls, sir.weight_kg, sir.price, sir.total_amount,
             p.paid_amount, p.unpaid_amount
      FROM stock_in_records sir
      LEFT JOIN payables p ON p.order_no = sir.order_no
      ${where}
      ORDER BY sir.created_at DESC
      LIMIT 1000
    `)
  })
  await nextTick(); restoreSelection()
}
const restoreSelection = () => { suppressSelectionEvent.value = true; paged.value.forEach(r=> tableRef.value?.toggleRowSelection(r, selectedKeys.value.has(rowKey(r)) || selectAll.value)); suppressSelectionEvent.value = false }

const dialogVisible = ref(false)
const paidEdit = ref(0)
const editOrderNo = ref('')
const editTotal = ref(0)
const openEditPaid = (row:any) => {
  editOrderNo.value = row.order_no
  editTotal.value = Number(row.total_amount||0)
  paidEdit.value = Number(row.paid_amount||0)
  dialogVisible.value = true
}
const savePaid = async () => {
  try {
    const paid = Number(paidEdit.value||0)
    const unpaid = Math.max(Number(editTotal.value||0) - paid, 0)
    const bizId = await window.electronAPI.genBizId('PAY', new Date().toISOString().slice(0,10))
    await execute('INSERT INTO payables (biz_id, order_no, supplier, ship_date, total_amount, paid_amount, unpaid_amount) VALUES (?,?,?,?,?,?,?) ON CONFLICT(order_no) DO UPDATE SET paid_amount=?, unpaid_amount=?, updated_at=CURRENT_TIMESTAMP', [bizId, editOrderNo.value, '', '', editTotal.value, paid, unpaid, paid, unpaid])
    ElMessage.success('已保存')
    dialogVisible.value = false
    load()
  } catch (e:any) { ElMessage.error(e.message) }
}

// 删除由入库记录删除时联动执行，页面不提供单独删除

const reset = () => { search.value = { supplier:'', order_no:'', range:null, status:'all' } }

let statusTimer: any = null
const onStatusChange = async () => { if (statusTimer) clearTimeout(statusTimer); statusTimer = setTimeout(async () => { currentPage.value = 1; await load() }, 300) }
watch(()=>search.value.status, onStatusChange)

onMounted(load)
// 数据清空通知后刷新
try { window.electronAPI.onDataCleared(()=> load()) } catch {}
</script>
<style scoped>
.search-row {margin-bottom:6px; display:flex; align-items:center; gap:8px; flex-wrap:wrap}
.select-row {margin:6px 0; padding-left:12px}
.label{font-size:16px;margin-left:8px;margin-right: 8px;}
</style>
