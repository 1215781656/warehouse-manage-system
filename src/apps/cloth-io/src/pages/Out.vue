<template>
  <div>
    <el-card shadow="never">
      <template #header>
        <div style="display:flex;align-items:center">
          <span style="font-weight:600">出库记录</span>
          <div style="flex:1" />
          <el-button type="warning" size="small" style="margin-left:8px" @click="openDrawer">新增出库</el-button>
          <el-button size="small" style="margin-left:8px;color:#fff;background:#4CAF50;border-color:#4CAF50" @click="onExport">导出</el-button>
        </div>
      </template>
      <div class="search-row">
        <span class="label">出货日期</span>
        <div>
          <el-date-picker 
          v-model="searchDate" 
          type="daterange" 
          range-separator="至"
           start-placeholder="开始"
            end-placeholder="结束" />
            </div>
        <span class="label">货单号</span>
        <el-input v-model="searchOrderNo" size="small" style="width:120px" />
        <span class="label">编号</span>
        <el-input v-model="searchItemCode" size="small" style="width:120px" />
        <span class="label">客户</span>
        <el-input v-model="searchCustomer" size="small" style="width:120px" />
        
        <el-button size="small" type="primary" @click="applySearch">搜索</el-button>
        <el-button size="small" @click="resetSearch">重置</el-button>
      </div>
      <div class="select-row">
        <el-checkbox v-model="selectAll" @change="toggleSelectAll">全选所有数据</el-checkbox>
        <span style="margin-left:12px">已选：{{ selectionCount }} 条</span>
      </div>
      <el-table ref="tableRef" :data="paged" stripe style="width:100%" v-loading="loading" @current-change="onCurrentChange" highlight-current-row :row-key="rowKey" :reserve-selection="true" @selection-change="onSelectionChange">
        <el-table-column type="selection" width="55" :selectable="rowSelectable" />
        <el-table-column prop="ship_date" label="出货日期" width="120" />
        <el-table-column prop="order_no" label="货单号" width="120" />
        <el-table-column prop="item_code" label="编号" width="120" />
        <el-table-column prop="customer" label="客户" width="120" />
        <el-table-column prop="item_name" label="品名规格" min-width="160" />
        <el-table-column prop="composition" label="成分" min-width="160" />
        <el-table-column prop="color" label="颜色" width="120" />
        <el-table-column prop="process_code" label="工艺" width="120" />
        <el-table-column prop="gram_weight" label="克重(g)" width="120" />
        <el-table-column prop="rolls" label="匹数" width="100" />
        <el-table-column prop="color_no" label="色号" width="100" />
        <el-table-column prop="weight_kg" label="重量(kg)" width="120" />
        <el-table-column prop="price" label="单价(元/kg)" width="120" />
        <el-table-column prop="total_amount" label="金额(元)" width="120" />
      <el-table-column label="操作" fixed="right" width="300">
        <template #default="{row}">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" @click="openShipment(row)">生成发货单</el-button>
          <el-button size="small" type="danger" @click="deleteRow(row)">删除</el-button>
        </template>
      </el-table-column>
      </el-table>
      <div style="display:flex;justify-content:flex-end;margin-top:8px">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          :page-sizes="pageSizes"
          :page-size="pageSize"
          :current-page="currentPage"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <el-dialog v-model="shipmentDialog" title="生成发货单" align-center width="600px" class="shipment-dialog">
      <el-form :model="shipmentForm" label-width="120px">
        <el-form-item label="No."><el-input v-model="shipmentForm.no" /></el-form-item>
        <el-form-item label="出货日期"><el-date-picker v-model="shipmentForm.ship_date" type="date" value-format="YYYY-MM-DD" /></el-form-item>
    <el-form-item label="客户"><el-input v-model="shipmentForm.customer" /></el-form-item>
    <el-form-item label="联系电话"><el-input v-model="shipmentForm.phone" /></el-form-item>
    <el-form-item label="发货单编号"><el-input v-model="shipmentForm.order_no" /></el-form-item>
        <el-form-item label="品名规格"><el-input v-model="shipmentForm.item_name" /></el-form-item>
        <el-form-item label="成分"><el-input v-model="shipmentForm.composition" /></el-form-item>
        <el-form-item label="颜色"><el-input v-model="shipmentForm.color" /></el-form-item>
        <el-form-item label="工艺"><el-input v-model="shipmentForm.process_code" /></el-form-item>
        <el-form-item label="克重"><el-input v-model.number="shipmentForm.gram_weight" type="number" /></el-form-item>
        <el-form-item label="匹数"><el-input v-model.number="shipmentForm.rolls" type="number" /></el-form-item>
        <el-form-item label="重量(kg)"><el-input v-model.number="shipmentForm.weight_kg" type="number" /></el-form-item>
        <el-form-item label="单价(元)"><el-input v-model.number="shipmentForm.price" type="number" /></el-form-item>
        <el-form-item label="金额(元)"><el-input :model-value="Number(shipmentForm.weight_kg||0) * Number(shipmentForm.price||0)" disabled /></el-form-item>
      </el-form>
      <template #footer>
        <FixedActionBar>
          <el-button @click="shipmentDialog=false">取消</el-button>
          <el-button type="primary" @click="doGenerateShipment">生成发货单</el-button>
        </FixedActionBar>
      </template>
    </el-dialog>

    <el-drawer v-model="drawer" :title="editing ? '编辑出库' : '新增出库'" size="40%" direction="rtl" :with-header="true" destroy-on-close @close="handleDrawerClose">
      <el-form :model="form" label-width="100px">
        <el-form-item label="选择色布">
          <el-select v-model="selectedFabricId" filterable remote clearable reserve-keyword :remote-method="searchCloth" :loading="clothLoading" placeholder="输入货单编号或品名规格进行搜索" style="width:100%" @change="handleClothChange" @clear="handleClothClear">
            <el-option v-for="opt in clothOptions" :key="opt.fabric_id" :label="`${opt.item_name}（${opt.order_no||'无单号'}）`" :value="opt.fabric_id" />
          </el-select>
        </el-form-item>
        <el-form-item label="出货日期"><el-date-picker v-model="form.ship_date" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width:100%"/></el-form-item>
        <el-form-item label="货单号"><el-input v-model="form.order_no" /></el-form-item>
        <el-form-item label="出库编号"><el-input v-model="item.item_code" /></el-form-item>
        <el-form-item label="客户"><el-input v-model="item.customer" /></el-form-item>
        <el-form-item label="品名规格"><el-input v-model="item.item_name" /></el-form-item>
        <el-form-item label="成分"><el-input v-model="item.composition" type="textarea" /></el-form-item>
        <el-form-item label="颜色"><el-input v-model="item.color" /></el-form-item>
        <el-form-item label="工艺"><el-input v-model="item.process_code" /></el-form-item>
        <el-form-item label="克重(g/m²)"><el-input v-model.number="item.gram_weight" type="number" /></el-form-item>
        <el-form-item label="匹数"><el-input v-model.number="item.rolls" type="number" /></el-form-item>
        <el-form-item label="色号"><el-input v-model="item.color_no" /></el-form-item>
        <el-form-item label="重量(kg)"><el-input v-model.number="item.weight_kg" type="number" /></el-form-item>
        <el-form-item label="单价(元)"><el-input v-model.number="item.price" type="number" /></el-form-item>
        <el-form-item label="金额(元)"><el-input :model-value="(item.weight_kg||0)*(item.price||0)" disabled /></el-form-item>
      </el-form>
      <template #footer>
        <FixedActionBar>
          <el-button @click="onCancel">取消</el-button>
          <el-button type="warning" @click="save">保存出库</el-button>
        </FixedActionBar>
      </template>
    </el-drawer>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { query, execute, transaction } from '@/api/db'
import dayjs from 'dayjs'
import { exportToXLSX, getVisibleColumnsFromTable } from '@/utils/exportExcel'
import { generateShipmentExcel } from '@/utils/exportExcel'
import { generateShipmentFromTemplate } from '@/utils/shipmentTemplate'
import { runWithLoading } from '@/utils/ui'
import FixedActionBar from '@/components/FixedActionBar.vue'

const item = ref<any>({ item_code:'', customer:'', item_name:'', color:'', color_no:'', composition:'', process_code:'', gram_weight:0, rolls:0, weight_kg:0, price:0 })
const isValidItemCode = (code: any) => {
  const s = String(code||'')
  if (!/^\d{7}$/.test(s)) return false
  const mm = Number(s.slice(2,4))
  if (mm < 1 || mm > 12) return false
  const seq = Number(s.slice(4))
  return seq >= 1 && seq <= 999
}
const form = ref({ ship_date:'', order_no:'' })
const drawer = ref(false)
const records = ref<any[]>([])
const loading = ref(false)
const keyword = ref('')
const searchDate = ref<[Date, Date] | null>(null)
const searchOrderNo = ref('')
const searchItemCode = ref('')
const searchCustomer = ref('')
 
const filtered = computed(()=>{
  return records.value.filter(r=>{
    if (keyword.value && !(r.order_no||'').includes(keyword.value)) return false
    if (searchOrderNo.value && !(r.order_no||'').includes(searchOrderNo.value)) return false
    if (searchItemCode.value && !(r.item_code||'').includes(searchItemCode.value)) return false
    if (searchCustomer.value && !(r.customer||'').includes(searchCustomer.value)) return false
    
    if (searchDate.value) {
      const d = new Date(r.ship_date)
      const [s,e] = searchDate.value
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
const handlePageChange = async (p:number)=>{ suppressSelectionEvent.value = true; currentPage.value = p; await nextTick(); restoreSelection(); suppressSelectionEvent.value = false }
const handleSizeChange = async (s:number)=>{ suppressSelectionEvent.value = true; pageSize.value = s; currentPage.value = 1; await nextTick(); restoreSelection(); suppressSelectionEvent.value = false }

const selectedRow = ref<any|null>(null)
const onCurrentChange = (row:any) => { selectedRow.value = row }
const generateReceivable = async (row:any) => {
  try {
    await ensureOutRecordsReady()
    const amount = Number(row.total_amount||0)
    await execute('INSERT INTO receivables (order_no, customer, ship_date, total_amount, paid_amount, unpaid_amount) VALUES (?,?,?,?,?,?) ON CONFLICT(order_no) DO UPDATE SET customer=excluded.customer, ship_date=excluded.ship_date, total_amount=excluded.total_amount, paid_amount=excluded.paid_amount, unpaid_amount=excluded.unpaid_amount, updated_at=CURRENT_TIMESTAMP', [row.order_no, row.customer, row.ship_date, amount, Number(row.received_amount||0), amount - Number(row.received_amount||0)])
    ElMessage.success('已生成发货单（登记应收）')
  } catch (e:any) { ElMessage.error(e.message) }
}
const generateReceivableFromSelection = async () => {
  if (!selectedRow.value) return
  await generateReceivable(selectedRow.value)
}

const shipmentDialog = ref(false)
const shipmentForm = ref<any>({ no:'', ship_date:'', customer:'', order_no:'', phone:'', item_name:'', composition:'', color:'', process_code:'', gram_weight:0, rolls:0, weight_kg:0, price:0 })
const openShipment = (row:any) => {
  shipmentForm.value = {
    no: row.order_no,
    ship_date: row.ship_date,
    customer: row.customer,
    order_no: row.order_no,
    phone: '',
    item_name: row.item_name,
    composition: row.composition,
    color: row.color,
    process_code: row.process_code,
    gram_weight: row.gram_weight,
    rolls: row.rolls,
    weight_kg: row.weight_kg,
    price: row.price
  }
  shipmentDialog.value = true
}
const doGenerateShipment = async () => {
  try {
    const amount = Number(shipmentForm.value.weight_kg||0) * Number(shipmentForm.value.price||0)
    const meta = { ship_date: shipmentForm.value.ship_date, customer: shipmentForm.value.customer, order_no: shipmentForm.value.order_no, phone: shipmentForm.value.phone || '', publisher: '李维蓉' }
    const row = { no: shipmentForm.value.no, item_name: shipmentForm.value.item_name, composition: shipmentForm.value.composition, color: shipmentForm.value.color, process_code: shipmentForm.value.process_code, gram_weight: shipmentForm.value.gram_weight, rolls: shipmentForm.value.rolls, weight_kg: shipmentForm.value.weight_kg, price: shipmentForm.value.price, amount }
    const ok = await generateShipmentFromTemplate('发货单.xlsx', '/templates/shipment-template', meta, row, [])
    if (!ok) {
      ElMessage.error('模板未找到或读取失败，请确认模板路径 /templates/shipment-template.xlsx')
      return
    }
    shipmentDialog.value = false
    ElMessage.success('已按模板生成发货单')
  } catch (e:any) { ElMessage.error(e.message||'生成失败') }
}


const ensureOutRecordsReady = async () => {
  const cols:any[] = await query('PRAGMA table_info(stock_out_records)')
  if (!Array.isArray(cols) || cols.length === 0) throw new Error('系统未初始化出库表，请联系管理员')
}
const loadRecords = async () => {
  await runWithLoading(loading, async () => {
    await ensureOutRecordsReady()
    records.value = await query("SELECT id, ship_date, order_no, fabric_id, item_code, customer, item_name, color, color_no, composition, process_code, gram_weight, rolls, weight_kg, price, total_amount FROM stock_out_records ORDER BY created_at DESC LIMIT 500")
    setTimeout(()=>{ suppressSelectionEvent.value = true; restoreSelection(); suppressSelectionEvent.value = false },0)
  })
}

const openDrawer = () => { drawer.value=true }
const applySearch = async () => { currentPage.value = 1; await runWithLoading(loading, async () => { await Promise.resolve() }); suppressSelectionEvent.value = true; await nextTick(); restoreSelection(); suppressSelectionEvent.value = false }
const resetSearch = async () => { searchDate.value=null; searchOrderNo.value=''; searchItemCode.value=''; searchCustomer.value=''; keyword.value=''; suppressSelectionEvent.value = true; await nextTick(); restoreSelection(); suppressSelectionEvent.value = false }

const genOrderNo = () => `OUT${dayjs().format('YYYYMMDDHHmmss')}${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`

const selectedFabricId = ref<string>('')
const clothLoading = ref(false)
const clothOptions = ref<any[]>([])
let selectedInventory: any = null

const initialItem = () => ({ fabric_id:'', item_code:'', customer:'', item_name:'', color:'', color_no:'', composition:'', process_code:'', gram_weight:0, rolls:0, weight_kg:0, price:0 })
const initialForm = () => ({ ship_date:'', order_no:'' })
const resetOutForm = () => {
  item.value = initialItem()
  form.value = initialForm()
  selectedFabricId.value = ''
  clothOptions.value = []
  editing.value = false
  selectedInventory = null
}

const searchCloth = async (kw: string) => {
  clothLoading.value = true
  try {
    const rows = await query(`
      SELECT ci.fabric_id, ci.item_name, ci.color, ci.color_no, ci.composition, ci.gram_weight, ci.width_cm, ci.current_rolls, ci.current_weight,
             (SELECT order_no FROM stock_in_records WHERE fabric_id = ci.fabric_id ORDER BY created_at DESC LIMIT 1) AS order_no,
             (SELECT process_code FROM stock_in_records WHERE fabric_id = ci.fabric_id ORDER BY created_at DESC LIMIT 1) AS process_code
      FROM cloth_inventory ci
      ORDER BY last_updated DESC
      LIMIT 500
    `)
    const k = (kw||'').trim()
    clothOptions.value = rows.filter((r:any)=> !k || (String(r.order_no||'').includes(k) || String(r.item_name||'').includes(k)))
  } finally { clothLoading.value = false }
}

const handleClothChange = async (fid: string) => {
  if (!fid) { handleClothClear(); return }
  try {
    const inv = await query('SELECT fabric_id, item_name, color, color_no, composition, gram_weight, width_cm, current_rolls, current_weight FROM cloth_inventory WHERE fabric_id=?', [fid])
    selectedInventory = inv[0] || null
    item.value.fabric_id = fid
    item.value.item_name = selectedInventory?.item_name || ''
    item.value.color = selectedInventory?.color || ''
    item.value.color_no = selectedInventory?.color_no || ''
    item.value.composition = selectedInventory?.composition || ''
    item.value.gram_weight = selectedInventory?.gram_weight || 0
    const lastIn = await query('SELECT process_code FROM stock_in_records WHERE fabric_id=? ORDER BY created_at DESC LIMIT 1', [fid])
    item.value.process_code = (lastIn[0]?.process_code)||''
  } catch {}
}
const handleClothClear = () => {
  selectedFabricId.value = ''
  selectedInventory = null
  item.value.fabric_id = ''
  item.value.item_name = ''
  item.value.color = ''
  item.value.color_no = ''
  item.value.composition = ''
  item.value.process_code = ''
  item.value.gram_weight = 0
}

const save = async () => {
  try {
    await ensureOutRecordsReady()
    const code = String(item.value.item_code||'').trim()
    if (!code) { ElMessage.error('请填写出库编号'); return }
    if (!editing.value) {
      const exists = await query('SELECT 1 FROM stock_out_records WHERE item_code = ? LIMIT 1', [code])
      if (exists.length) { ElMessage.error('出库编号已存在，请重新输入'); return }
      try {
        const backend = await (window as any).electronAPI?.validateOutItemCode?.(code, null)
        if (backend?.exists) { ElMessage.error('出库编号已重复，请重新输入'); return }
        if (backend?.error) { ElMessage.error(backend.error); return }
      } catch {}
    }
    const inv = await query('SELECT current_rolls, current_weight FROM cloth_inventory WHERE fabric_id = ? LIMIT 1', [item.value.fabric_id])
    if (!inv.length) { ElMessage.error('库存不足'); return }
    const curRolls = Number(inv[0].current_rolls||0)
    const curWeight = Number(inv[0].current_weight||0)
    if ((item.value.rolls||0) > curRolls || (item.value.weight_kg||0) > curWeight) {
      ElMessage.error(`库存不足，当前剩余：${curRolls}匹，${curWeight}kg`)
      return
    }
    const orderNoInput = form.value.order_no?.trim()
    let orderNo = orderNoInput || genOrderNo()
    const amount = (item.value.weight_kg||0) * (item.value.price||0)
    if (editing.value) {
      const dRolls = (item.value.rolls||0) - (editOriginal.rolls||0)
      const dWeight = (item.value.weight_kg||0) - (editOriginal.weight_kg||0)
      const ops:any[] = [
        {
          sql: 'UPDATE stock_out_records SET ship_date=?, order_no=?, fabric_id=?, item_code=?, customer=?, item_name=?, color=?, color_no=?, composition=?, process_code=?, gram_weight=?, rolls=?, weight_kg=?, price=?, total_amount=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
          params: [form.value.ship_date, orderNo, item.value.fabric_id, item.value.item_code, item.value.customer, item.value.item_name, item.value.color, item.value.color_no||'', item.value.composition, item.value.process_code, item.value.gram_weight, item.value.rolls, item.value.weight_kg, item.value.price||0, amount, editOriginal.record_id]
        }
      ]
      if (dRolls !== 0 || dWeight !== 0) {
        ops.push({
          sql: 'UPDATE cloth_inventory SET current_rolls = current_rolls - ?, current_weight = current_weight - ?, total_out_rolls = total_out_rolls + ?, total_out_weight = total_out_weight + ?, last_updated=CURRENT_TIMESTAMP WHERE fabric_id = ?',
          params: [dRolls, dWeight, Math.max(dRolls,0), Math.max(dWeight,0), item.value.fabric_id]
        })
      }
      await transaction(ops)
      ElMessage.success('已更新并同步库存')
    } else {
      let tries = 0
      while (true) {
        try {
          const bizId = await window.electronAPI.genBizId('OUT', form.value.ship_date)
          await transaction([
            {
              sql: 'INSERT INTO stock_out_records (biz_id, ship_date, order_no, fabric_id, item_code, customer, item_name, color, color_no, composition, process_code, gram_weight, rolls, weight_kg, price, total_amount) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
              params: [bizId, form.value.ship_date, orderNo, item.value.fabric_id, item.value.item_code, item.value.customer, item.value.item_name, item.value.color, item.value.color_no||'', item.value.composition, item.value.process_code, item.value.gram_weight, item.value.rolls, item.value.weight_kg, item.value.price||0, amount]
            },
            {
              sql: 'UPDATE cloth_inventory SET current_rolls = current_rolls - ?, current_weight = current_weight - ?, total_out_rolls = total_out_rolls + ?, total_out_weight = total_out_weight + ?, last_updated=CURRENT_TIMESTAMP WHERE fabric_id = ?',
              params: [item.value.rolls||0, item.value.weight_kg||0, item.value.rolls||0, item.value.weight_kg||0, item.value.fabric_id]
            },
            {
              sql: 'INSERT INTO receivables (order_no, customer, ship_date, total_amount, paid_amount, unpaid_amount) VALUES (?,?,?,?,?,?) ON CONFLICT(order_no) DO UPDATE SET customer=excluded.customer, ship_date=excluded.ship_date, total_amount=excluded.total_amount, updated_at=CURRENT_TIMESTAMP',
              params: [orderNo, item.value.customer, form.value.ship_date, amount, 0, amount]
            }
          ])
          ElMessage.success(`出库记录已创建，编号：${item.value.item_code}`)
          break
        } catch (err:any) {
          const msg = String(err?.message||'')
          if (msg.includes('UNIQUE') && msg.includes('stock_out_records') && msg.includes('biz_id') && tries < 3) { tries++; continue }
          throw err
        }
      }
    }
    resetOutForm()
    drawer.value=false
    loadRecords()
  } catch (e:any) { ElMessage.error(e.message) }
}

const editing = ref(false)
let editOriginal: any = { record_id: 0, rolls: 0, weight_kg: 0 }
const openEdit = (row:any) => {
  editing.value = true
  drawer.value = true
  form.value = { ship_date: row.ship_date, order_no: row.order_no }
  item.value = { fabric_id: row.fabric_id, item_code: row.item_code, customer: row.customer, item_name: row.item_name, color: row.color, color_no: row.color_no, composition: row.composition, process_code: row.process_code, gram_weight: row.gram_weight, width_cm: row.width_cm, rolls: row.rolls, weight_kg: row.weight_kg, quantity: row.quantity, price: row.price, received_amount: row.received_amount, invoice_amount: row.invoice_amount, signer: row.signer, remark: row.remark }
  editOriginal.record_id = row.id
  editOriginal.rolls = row.rolls
  editOriginal.weight_kg = row.weight_kg
}

const handleDrawerClose = () => { resetOutForm() }
const onCancel = () => { drawer.value = false; resetOutForm() }

const deleteRow = async (row:any) => {
  try {
    await ElMessageBox.confirm('确认删除该出库记录？','提示',{type:'warning'})
    await transaction([
      { sql: 'DELETE FROM stock_out_records WHERE id=?', params: [row.id] },
      { sql: 'UPDATE cloth_inventory SET current_rolls = current_rolls + ?, current_weight = current_weight + ?, total_out_rolls = total_out_rolls - ?, total_out_weight = total_out_weight - ?, last_updated=CURRENT_TIMESTAMP WHERE fabric_id = ?', params: [row.rolls||0, row.weight_kg||0, row.rolls||0, row.weight_kg||0, row.fabric_id] },
      { sql: 'DELETE FROM receivables WHERE order_no=?', params: [row.order_no] }
    ])
    ElMessage.success('已删除')
    loadRecords()
  } catch (e:any) {
    if (e !== 'cancel') ElMessage.error(e.message)
  }
}

onMounted(async ()=>{ await loadRecords() })
// 数据清空通知后刷新
try { window.electronAPI.onDataCleared(()=> loadRecords()) } catch {}

const tableRef = ref<any>(null)
const selectAll = ref(false)
const selectedKeys = ref<Set<any>>(new Set())
const suppressSelectionEvent = ref(false)
const rowKey = (row:any)=> row.id
const onSelectionChange = (sel:any[]) => {
  if (suppressSelectionEvent.value) return
  const pageRows = paged.value
  const pageKeys = new Set(pageRows.map(r=>rowKey(r)))
  const newSelKeys = new Set(sel.map(r=>rowKey(r)))
  for (const k of Array.from(pageKeys)) { selectedKeys.value.delete(k) }
  for (const k of Array.from(newSelKeys)) { selectedKeys.value.add(k) }
  if (selectAll.value && newSelKeys.size < pageRows.length) selectAll.value = false
}
const toggleSelectAll = async () => {
  if (selectAll.value) {
    selectedKeys.value = new Set(filtered.value.map(r=>rowKey(r)))
    suppressSelectionEvent.value = true
    clearPageSelection()
    paged.value.forEach(r=> tableRef.value?.toggleRowSelection(r, true))
    suppressSelectionEvent.value = false
  } else {
    selectedKeys.value.clear()
    clearPageSelection()
  }
  await nextTick()
  restoreSelection()
}
const clearPageSelection = () => {
  paged.value.forEach(r=> tableRef.value?.toggleRowSelection(r, false))
}
const restoreSelection = () => {
  suppressSelectionEvent.value = true
  paged.value.forEach(r=> {
    const k = rowKey(r)
    tableRef.value?.toggleRowSelection(r, selectedKeys.value.has(k))
  })
  suppressSelectionEvent.value = false
}
const selectionCount = computed(()=> selectedKeys.value.size)

const rowSelectable = () => !selectAll.value
const onExport = async () => {
  try {
    let rows: any[] = []
    if (selectAll.value) {
      rows = await query("SELECT id, ship_date, order_no, item_code, customer, item_name, color, color_no, composition, process_code, gram_weight, rolls, weight_kg, price, total_amount FROM stock_out_records ORDER BY created_at DESC")
    } else {
      rows = filtered.value.filter(r=> selectedKeys.value.has(rowKey(r)))
      if (!rows.length) { ElMessage.warning('请选择要导出的数据'); return }
    }
    const cols = getVisibleColumnsFromTable(tableRef)
    const ts = dayjs().format('YYYYMMDD_HHmm')
    await exportToXLSX(`出库记录_${ts}.xlsx`, cols, rows)
    ElMessage.success('已导出')
  } catch (e:any) { ElMessage.error(e.message||'导出失败') }
}
</script>
<style scoped>
.search-row {margin-bottom:6px; display:flex; align-items:center; gap:8px; flex-wrap:wrap}
.select-row {margin:6px 0; padding-left:12px}
.label {font-size:16px;margin-left:8px;margin-right: 8px;}
</style>
 
