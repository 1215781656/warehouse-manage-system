<template>
  <div>
    <el-card shadow="never">
      <template #header>
        <div style="display:flex;align-items:center">
          <span style="font-weight:600">应收管理</span>
          <div style="flex:1" />
          <el-button size="small" style="margin-left:8px;color:#fff;background:#4CAF50;border-color:#4CAF50" @click="onExport">导出</el-button>
        </div>
      </template>
      <div class="search-row">
        <span class="label">客户</span>
        <el-input v-model="search.customer" size="small" style="width:160px" />
        <span class="label">单号</span>
        <el-input v-model="search.order_no" size="small" style="width:160px" />
        <span class="label">日期</span>
        <el-date-picker v-model="search.range" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" size="small" />
        <el-button size="small" type="primary" style="margin-left:8px" @click="load">查询</el-button>
        <el-button size="small" style="margin-left:8px" @click="reset">重置</el-button>
      </div>
      <div class="select-row"><el-checkbox v-model="selectAll" @change="toggleSelectAll">全选所有数据</el-checkbox></div>
      <el-table ref="tableRef" :data="filtered" stripe style="width:100%" v-loading="loading" :row-key="rowKey" @selection-change="onSelectionChange">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="ship_date" label="出货日期" width="120" />
        <el-table-column prop="order_no" label="货单号" width="140" />
        <el-table-column prop="item_code" label="编号" width="120" />
        <el-table-column prop="customer" label="客户" width="140" />
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
import { ref, computed, onMounted } from 'vue'
import { query, execute } from '@/api/db'
import { exportToXLSX, getVisibleColumnsFromTable } from '@/utils/exportExcel'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const rows = ref<any[]>([])
const tableRef = ref<any>(null)
const selectAll = ref(false)
const selectedKeys = ref<Set<any>>(new Set())
const rowKey = (row:any)=> `${row.order_no}|${row.item_code||''}`
const onSelectionChange = (sel:any[]) => { selectedKeys.value = new Set(sel.map(r=>rowKey(r))) }
const toggleSelectAll = () => {
  if (selectAll.value) filtered.value.forEach(r=> tableRef.value?.toggleRowSelection(r, true))
  else filtered.value.forEach(r=> tableRef.value?.toggleRowSelection(r, false))
}
const onExport = async () => {
  try {
    let rowsSel: any[] = []
    if (selectAll.value) {
      rowsSel = await query(`
        SELECT sor.ship_date, sor.order_no, sor.item_code, sor.customer, sor.item_name, sor.composition, sor.color, sor.process_code, sor.gram_weight, sor.rolls, sor.weight_kg, sor.price, sor.total_amount,
               r.paid_amount, r.unpaid_amount
        FROM stock_out_records sor
        LEFT JOIN receivables r ON r.order_no = sor.order_no
        ORDER BY sor.created_at DESC
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
    await exportToXLSX(`应收管理_${ts}.xlsx`, cols, rowsSel)
    ElMessage.success('已导出')
  } catch (e:any) { ElMessage.error(e.message||'导出失败') }
}
const search = ref<{customer:string; order_no:string; range: [Date,Date]|null}>({ customer:'', order_no:'', range: null })
const filtered = computed(()=>{
  return rows.value.filter(r=>{
    if (search.value.customer && !(r.customer||'').includes(search.value.customer)) return false
    if (search.value.order_no && !(r.order_no||'').includes(search.value.order_no)) return false
    if (search.value.range) {
      const d = new Date(r.ship_date)
      const [s,e] = search.value.range
      if (isNaN(d.getTime()) || d < s || d > e) return false
    }
    return true
  })
})

const ensureTable = async () => {
  await execute(`CREATE TABLE IF NOT EXISTS receivables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT UNIQUE,
    customer TEXT,
    ship_date TEXT,
    total_amount DECIMAL(10,2),
    paid_amount DECIMAL(10,2),
    unpaid_amount DECIMAL(10,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)
}

const load = async () => {
  loading.value = true
  try {
    await ensureTable()
    rows.value = await query(`
      SELECT sor.ship_date, sor.order_no, sor.item_code, sor.customer, sor.item_name, sor.composition, sor.color, sor.process_code, sor.gram_weight, sor.rolls, sor.weight_kg, sor.price, sor.total_amount,
             r.paid_amount, r.unpaid_amount, r.id AS recv_id
      FROM stock_out_records sor
      LEFT JOIN receivables r ON r.order_no = sor.order_no
      ORDER BY sor.created_at DESC
      LIMIT 1000
    `)
  } finally { loading.value=false }
}

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
    await execute('UPDATE receivables SET paid_amount=?, unpaid_amount=?, updated_at=CURRENT_TIMESTAMP WHERE order_no=?', [paid, unpaid, editOrderNo.value])
    ElMessage.success('已保存')
    dialogVisible.value = false
    load()
  } catch (e:any) { ElMessage.error(e.message) }
}

// 删除由出库记录删除时联动执行，页面不提供单独删除

const reset = () => { search.value = { customer:'', order_no:'', range:null } }

onMounted(load)
</script>
<style scoped>
.search-row {margin-bottom:6px; display:flex; align-items:center; gap:8px; flex-wrap:wrap}
.select-row {margin:6px 0; padding-left:12px}
.label{color:#b8b8b8;font-size:12px;margin-left:8px}
</style>
