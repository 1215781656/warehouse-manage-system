const { ref } = require('vue')

function initialItem() {
  return { fabric_id:'', supplier:'', item_name:'', color:'', color_no:'', composition:'', gram_weight:0, width_cm:0, rolls:0, weight_kg:0, price:0 }
}
function initialForm() { return { ship_date:'', order_no:'' } }

function resetInForm(state) {
  state.item.value = initialItem()
  state.form.value = initialForm()
  state.editing.value = false
  state.setEditOriginal({ record_id: 0, rolls: 0, weight_kg: 0 })
}

async function testCloseResetsForm() {
  const item = ref({ fabric_id:'F-in-1', supplier:'供應商A', item_name:'汗布', color:'黑', color_no:'K01', composition:'棉', gram_weight:180, width_cm:180, rolls:10, weight_kg:200, price:18 })
  const form = ref({ ship_date:'2025-12-10', order_no:'IN001' })
  const editing = ref(true)
  let editOriginal = { record_id: 7, rolls: 9, weight_kg: 180 }
  const setEditOriginal = (v)=>{ editOriginal = v }

  resetInForm({ item, form, editing, setEditOriginal })

  const i0 = initialItem()
  const f0 = initialForm()
  if (JSON.stringify(item.value) !== JSON.stringify(i0)) throw new Error('关闭未清空 item')
  if (JSON.stringify(form.value) !== JSON.stringify(f0)) throw new Error('关闭未清空 form')
  if (editing.value !== false) throw new Error('关闭未重置编辑状态')
  if (JSON.stringify(editOriginal) !== JSON.stringify({ record_id:0, rolls:0, weight_kg:0 })) throw new Error('关闭未清空原始编辑数据')
}

async function testSaveResetsForm() {
  const item = ref({ fabric_id:'F-in-2', supplier:'供應商B', item_name:'羅紋', color:'灰', color_no:'H02', composition:'涤', gram_weight:200, width_cm:170, rolls:6, weight_kg:120, price:22 })
  const form = ref({ ship_date:'2025-12-11', order_no:'IN002' })
  const editing = ref(false)
  let editOriginal = { record_id: 9, rolls: 5, weight_kg: 100 }
  const setEditOriginal = (v)=>{ editOriginal = v }

  resetInForm({ item, form, editing, setEditOriginal })

  const i0 = initialItem()
  const f0 = initialForm()
  if (JSON.stringify(item.value) !== JSON.stringify(i0)) throw new Error('保存未清空 item')
  if (JSON.stringify(form.value) !== JSON.stringify(f0)) throw new Error('保存未清空 form')
  if (editing.value !== false) throw new Error('保存后编辑状态未复位')
  if (JSON.stringify(editOriginal) !== JSON.stringify({ record_id:0, rolls:0, weight_kg:0 })) throw new Error('保存未清空原始编辑数据')
}

async function testConsistencyOnConsecutiveOps() {
  const item = ref({ fabric_id:'F-in-3', supplier:'供應商C', item_name:'珠地', color:'白', color_no:'B03', composition:'棉涤', gram_weight:220, width_cm:190, rolls:3, weight_kg:60, price:24 })
  const form = ref({ ship_date:'2025-12-12', order_no:'IN003' })
  const editing = ref(false)
  let editOriginal = { record_id: 1, rolls: 3, weight_kg: 60 }
  const setEditOriginal = (v)=>{ editOriginal = v }

  // 第一次取消
  resetInForm({ item, form, editing, setEditOriginal })
  // 第二次模拟编辑后再取消
  editing.value = true
  item.value.rolls = 8
  item.value.weight_kg = 160
  form.value.order_no = 'IN-RETRY'
  editOriginal = { record_id: 2, rolls: 8, weight_kg: 160 }

  resetInForm({ item, form, editing, setEditOriginal })

  const i0 = initialItem()
  const f0 = initialForm()
  if (JSON.stringify(item.value) !== JSON.stringify(i0)) throw new Error('连续操作后 item 未一致重置')
  if (JSON.stringify(form.value) !== JSON.stringify(f0)) throw new Error('连续操作后 form 未一致重置')
  if (editing.value !== false) throw new Error('连续操作后编辑状态未重置')
  if (JSON.stringify(editOriginal) !== JSON.stringify({ record_id:0, rolls:0, weight_kg:0 })) throw new Error('连续操作后原始编辑数据未清空')
}

async function run() {
  const cases = [testCloseResetsForm, testSaveResetsForm, testConsistencyOnConsecutiveOps]
  for (const fn of cases) {
    await fn()
    console.log(`[PASS] ${fn.name}`)
  }
}

module.exports = { run }

