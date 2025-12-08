<template>
  <div>
    <el-card shadow="never">
      <template #header>
        <div style="display:flex;align-items:center">
          <span style="font-weight:600">入库记录</span>
          <div style="flex:1" />
          <el-button type="primary" size="small" style="margin-left:8px" @click="openDrawer">新增入库</el-button>
          <el-button size="small" style="margin-left:8px;color:#fff;background:#4CAF50;border-color:#4CAF50" @click="onExport">导出</el-button>
        </div>
      </template>
      <div class="search-row">
        <span class="label">入库日期</span>
        <el-date-picker v-model="searchDate" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" size="small" />
        <span class="label">货单编号</span>
        <el-input v-model="searchOrderNo" size="small" style="width:140px" />
        <span class="label">编号</span>
        <el-input v-model="searchItemCode" size="small" style="width:140px" />
        <span class="label">供应商</span>
        <el-input v-model="searchSupplier" size="small" style="width:160px" />
        <el-button size="small" type="primary" @click="applySearch">搜索</el-button>
        <el-button size="small" @click="resetSearch">重置</el-button>
      </div>
      <div class="select-row"><el-checkbox v-model="selectAll" @change="toggleSelectAll">全选所有数据</el-checkbox></div>
      <el-table ref="tableRef" :data="filtered" stripe style="width:100%" v-loading="loading" :row-key="rowKey" @selection-change="onSelectionChange">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="ship_date" label="日期" width="120" />
        <el-table-column prop="order_no" label="货单编号" width="140" />
        <el-table-column prop="supplier" label="供应商" width="160" />
        <el-table-column prop="item_name" label="品名规格" min-width="180" />
        <el-table-column prop="composition" label="成分" min-width="180" />
        <el-table-column prop="gram_weight" label="克重(g/m²)" width="120" />
        <el-table-column prop="width_cm" label="全幅宽(cm)" width="120" />
        <el-table-column prop="color" label="颜色" width="100" />
        <el-table-column prop="color_no" label="色号" width="100" />
        <el-table-column prop="rolls" label="匹数" width="100" />
        <el-table-column prop="weight_kg" label="重量(kg)" width="120" />
        <el-table-column prop="price" label="单价(元/kg)" width="120" />
        <el-table-column prop="total_amount" label="金额(元)" width="120" />
        <el-table-column label="操作" fixed="right" width="160">
          <template #default="{row}">
            <el-button size="small" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteRow(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-drawer v-model="drawer" title="新增入库" size="40%" direction="rtl" :with-header="true">
      <el-form :model="form" label-width="100px">
        <el-form-item label="入库日期"><el-date-picker v-model="form.ship_date" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width:100%"/></el-form-item>
        <el-form-item label="货单编号"><el-input v-model="form.order_no" /></el-form-item>
        <el-form-item label="供应商"><el-input v-model="item.supplier" /></el-form-item>
        <el-form-item label="品名规格"><el-input v-model="item.item_name" /></el-form-item>
        <el-form-item label="成分"><el-input v-model="item.composition" type="textarea" /></el-form-item>
        <el-form-item label="克重(g/m²)"><el-input v-model.number="item.gram_weight" type="number" /></el-form-item>
        <el-form-item label="全幅宽(cm)"><el-input v-model.number="item.width_cm" type="number" /></el-form-item>
        <el-form-item label="颜色"><el-input v-model="item.color" /></el-form-item>
        <el-form-item label="色号"><el-input v-model="item.color_no" /></el-form-item>
        <el-form-item label="匹数"><el-input v-model.number="item.rolls" type="number" /></el-form-item>
        <el-form-item label="重量(kg)"><el-input v-model.number="item.weight_kg" type="number" /></el-form-item>
        <el-form-item label="单价(元)"><el-input v-model.number="item.price" type="number" /></el-form-item>
        <el-form-item label="金额(元)"><el-input :model-value="(item.weight_kg||0)*(item.price||0)" disabled /></el-form-item>
        <div>
          <el-button type="primary" @click="save">保存入库</el-button>
        </div>
      </el-form>
    </el-drawer>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { query, execute, transaction } from '@/api/db'
import { exportToXLSX, getVisibleColumnsFromTable } from '@/utils/exportExcel'
import dayjs from 'dayjs'

const item = ref<any>({ item_code:'', supplier:'', item_name:'', color:'', color_no:'', composition:'', gram_weight:0, width_cm:0, rolls:0, weight_kg:0, price:0 })
const form = ref({ ship_date:'', order_no:'' })
const drawer = ref(false)
const records = ref<any[]>([])
const loading = ref(false)
const tableRef = ref<any>(null)
const selectAll = ref(false)
const selectedKeys = ref<Set<any>>(new Set())
const rowKey = (row:any)=> row.id
const onSelectionChange = (sel:any[]) => { selectedKeys.value = new Set(sel.map(r=>rowKey(r))) }
const toggleSelectAll = () => {
  if (selectAll.value) filtered.value.forEach(r=> tableRef.value?.toggleRowSelection(r, true))
  else filtered.value.forEach(r=> tableRef.value?.toggleRowSelection(r, false))
}
const onExport = async () => {
  try {
    let rows: any[] = []
    if (selectAll.value) {
      rows = await query("SELECT id, ship_date, order_no, item_code, supplier, item_name, color, color_no, composition, gram_weight, width_cm, rolls, weight_kg, price, total_amount FROM stock_in_records ORDER BY created_at DESC")
    } else {
      rows = filtered.value.filter(r=> selectedKeys.value.has(rowKey(r)))
      if (!rows.length) { ElMessage.warning('请选择要导出的数据'); return }
    }
    const cols = getVisibleColumnsFromTable(tableRef)
    const ts = dayjs().format('YYYYMMDD_HHmm')
    await exportToXLSX(`入库记录_${ts}.xlsx`, cols, rows)
    ElMessage.success('已导出')
  } catch (e:any) { ElMessage.error(e.message||'导出失败') }
}
const searchDate = ref<[Date, Date] | null>(null)
const searchOrderNo = ref('')
const searchItemCode = ref('')
const searchSupplier = ref('')
const filtered = computed(()=>{
  return records.value.filter(r=>{
    if (searchOrderNo.value && !(r.order_no||'').includes(searchOrderNo.value)) return false
    if (searchItemCode.value && !(r.item_code||'').includes(searchItemCode.value)) return false
    if (searchSupplier.value && !(r.supplier||'').includes(searchSupplier.value)) return false
    if (searchDate.value) {
      const d = new Date(r.ship_date)
      const [s,e] = searchDate.value
      if (isNaN(d.getTime()) || d < s || d > e) return false
    }
    return true
  })
})
const applySearch = () => {}
const resetSearch = () => { searchDate.value=null; searchOrderNo.value=''; searchItemCode.value=''; searchSupplier.value='' }

const ensureInRecordsTable = async () => {
  await execute(`CREATE TABLE IF NOT EXISTS stock_in_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ship_date TEXT,
    order_no TEXT,
    item_code TEXT,
    supplier TEXT,
    item_name TEXT,
    color TEXT,
    color_no TEXT,
    composition TEXT,
    process_code TEXT,
    gram_weight INTEGER,
    width_cm INTEGER,
    rolls INTEGER,
    weight_kg REAL,
    price DECIMAL(10,2),
    quantity INTEGER,
    total_amount DECIMAL(10,2),
    signer TEXT,
    remark TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)
  await execute('CREATE INDEX IF NOT EXISTS idx_sir_order_no ON stock_in_records(order_no)')
  await execute('CREATE INDEX IF NOT EXISTS idx_sir_ship_date ON stock_in_records(ship_date)')
  await execute('CREATE INDEX IF NOT EXISTS idx_sir_item_code ON stock_in_records(item_code)')
  await execute('CREATE INDEX IF NOT EXISTS idx_sir_supplier ON stock_in_records(supplier)')
  const cols:any[] = await query('PRAGMA table_info(stock_in_records)')
  const names = new Set(cols.map((c:any)=>c.name))
  if (!names.has('color_no')) await execute('ALTER TABLE stock_in_records ADD COLUMN color_no TEXT')
  if (!names.has('width_cm')) await execute('ALTER TABLE stock_in_records ADD COLUMN width_cm INTEGER')
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
  await execute('CREATE INDEX IF NOT EXISTS idx_ci_fabric_id ON cloth_inventory(fabric_id)')
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

const loadRecords = async () => {
  loading.value = true
  try {
    await ensureInRecordsTable()
    records.value = await query("SELECT id, ship_date, order_no, item_code, supplier, item_name, color, color_no, composition, gram_weight, width_cm, rolls, weight_kg, price, total_amount FROM stock_in_records ORDER BY created_at DESC LIMIT 500")
  } finally { loading.value=false }
}

const openDrawer = () => { drawer.value=true }

const editing = ref(false)
let editOriginal: any = { record_id: 0, rolls: 0, weight_kg: 0 }

const genOrderNo = () => `IN${dayjs().format('YYYYMMDDHHmmss')}${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`
const genFabricId = () => `FAB${dayjs().format('YYYYMMDDHHmmss')}${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`

const save = async () => {
  try {
    await ensureInRecordsTable()
    const orderNoInput = form.value.order_no?.trim()
    let orderNo = orderNoInput || genOrderNo()
    if (!item.value.item_code) item.value.item_code = genFabricId()
    const amount = (item.value.weight_kg||0) * (item.value.price||0)
    if (editing.value) {
      await transaction([
        {
          sql: 'UPDATE stock_in_records SET ship_date=?, order_no=?, item_code=?, supplier=?, item_name=?, color=?, color_no=?, composition=?, gram_weight=?, width_cm=?, rolls=?, weight_kg=?, price=?, total_amount=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
          params: [form.value.ship_date, orderNo, item.value.item_code, item.value.supplier, item.value.item_name, item.value.color, item.value.color_no||'', item.value.composition, item.value.gram_weight, item.value.width_cm||0, item.value.rolls, item.value.weight_kg, item.value.price||0, amount, editOriginal.record_id]
        },
        {
          sql: 'UPDATE cloth_inventory SET current_rolls = current_rolls + ?, current_weight = current_weight + ?, total_in_rolls = total_in_rolls + ?, total_in_weight = total_in_weight + ?, item_name=?, color=?, color_no=?, composition=?, gram_weight=?, width_cm=?, last_updated=CURRENT_TIMESTAMP WHERE fabric_id = ?',
          params: [
            (item.value.rolls||0) - (editOriginal.rolls||0),
            (item.value.weight_kg||0) - (editOriginal.weight_kg||0),
            Math.max((item.value.rolls||0) - (editOriginal.rolls||0), 0),
            Math.max((item.value.weight_kg||0) - (editOriginal.weight_kg||0), 0),
            item.value.item_name, item.value.color, item.value.color_no||'', item.value.composition, item.value.gram_weight||0, item.value.width_cm||0,
            item.value.item_code
          ]
        },
        {
          sql: 'INSERT INTO payables (order_no, supplier, ship_date, total_amount, paid_amount, unpaid_amount) VALUES (?,?,?,?,?,?) ON CONFLICT(order_no) DO UPDATE SET total_amount=excluded.total_amount, unpaid_amount=excluded.total_amount - paid_amount, supplier=excluded.supplier, ship_date=excluded.ship_date, updated_at=CURRENT_TIMESTAMP',
          params: [orderNo, item.value.supplier, form.value.ship_date, amount, 0, amount]
        }
      ])
      ElMessage.success('已更新并同步库存')
    } else {
      await transaction([
      {
        sql: 'INSERT INTO stock_in_records (ship_date, order_no, item_code, supplier, item_name, color, color_no, composition, gram_weight, width_cm, rolls, weight_kg, price, total_amount) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        params: [form.value.ship_date, orderNo, item.value.item_code, item.value.supplier, item.value.item_name, item.value.color, item.value.color_no||'', item.value.composition, item.value.gram_weight, item.value.width_cm||0, item.value.rolls, item.value.weight_kg, item.value.price||0, amount]
      },
      {
        sql: 'INSERT INTO cloth_inventory (fabric_id, item_name, color, color_no, composition, gram_weight, width_cm, current_rolls, current_weight, total_in_rolls, total_in_weight, last_updated) VALUES (?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(fabric_id) DO UPDATE SET item_name=excluded.item_name, color=excluded.color, color_no=excluded.color_no, composition=excluded.composition, gram_weight=excluded.gram_weight, width_cm=excluded.width_cm, current_rolls=current_rolls+excluded.current_rolls, current_weight=current_weight+excluded.current_weight, total_in_rolls=total_in_rolls+excluded.total_in_rolls, total_in_weight=total_in_weight+excluded.total_in_weight, last_updated=CURRENT_TIMESTAMP',
        params: [item.value.item_code, item.value.item_name, item.value.color, item.value.color_no||'', item.value.composition, item.value.gram_weight||0, item.value.width_cm||0, item.value.rolls||0, item.value.weight_kg||0, item.value.rolls||0, item.value.weight_kg||0]
      }
      ,{
        sql: 'INSERT INTO payables (order_no, supplier, ship_date, total_amount, paid_amount, unpaid_amount) VALUES (?,?,?,?,?,?) ON CONFLICT(order_no) DO UPDATE SET total_amount=excluded.total_amount, unpaid_amount=excluded.total_amount - paid_amount, supplier=excluded.supplier, ship_date=excluded.ship_date, updated_at=CURRENT_TIMESTAMP',
        params: [orderNo, item.value.supplier, form.value.ship_date, amount, 0, amount]
      }
      ])
      ElMessage.success('入库成功')
    }
    item.value = { item_code:'', supplier:'', item_name:'', color:'', color_no:'', composition:'', gram_weight:0, width_cm:0, rolls:0, weight_kg:0, price:0 }
    form.value = { ship_date:'', order_no:'' }
    drawer.value=false
    loadRecords()
  } catch (e:any) { ElMessage.error(e.message) }
}

const openEdit = (row:any) => {
  editing.value = true
  drawer.value = true
  form.value = { ship_date: row.ship_date, order_no: row.order_no }
  item.value = { item_code: row.item_code, supplier: row.supplier, item_name: row.item_name, color: row.color, color_no: row.color_no, composition: row.composition, gram_weight: row.gram_weight, width_cm: row.width_cm, rolls: row.rolls, weight_kg: row.weight_kg, price: row.price }
  editOriginal.record_id = row.id
  editOriginal.rolls = row.rolls
  editOriginal.weight_kg = row.weight_kg
}

const deleteRow = async (row:any) => {
  try {
    await ElMessageBox.confirm('确认删除该入库记录？','提示',{type:'warning'})
    await transaction([
      { sql: 'DELETE FROM stock_in_records WHERE id=?', params: [row.id] },
      { sql: 'UPDATE cloth_inventory SET current_rolls = current_rolls - ?, current_weight = current_weight - ?, total_in_rolls = total_in_rolls - ?, total_in_weight = total_in_weight - ?, last_updated=CURRENT_TIMESTAMP WHERE fabric_id = ?', params: [row.rolls||0, row.weight_kg||0, row.rolls||0, row.weight_kg||0, row.item_code] },
      { sql: 'DELETE FROM payables WHERE order_no = ?', params: [row.order_no] }
    ])
    ElMessage.success('已删除并同步库存')
    loadRecords()
  } catch (e:any) {
    if (e !== 'cancel') ElMessage.error(e.message)
  }
}

onMounted(async ()=>{ await loadRecords() })
</script>
<style scoped>
.search-row {margin-bottom:2px; display:flex; align-items:center; gap:2px; flex-wrap:wrap}
.select-row {margin:6px 0; padding-left:12px}
.label {color:#b8b8b8; font-size:12px;}
</style>
