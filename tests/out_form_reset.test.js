const { ref } = require('vue')

function initialItem() {
  return { fabric_id:'', item_code:'', customer:'', item_name:'', color:'', color_no:'', composition:'', process_code:'', gram_weight:0, rolls:0, weight_kg:0, price:0 }
}
function initialForm() {
  return { ship_date:'', order_no:'' }
}
function resetOutForm(state) {
  state.item.value = initialItem()
  state.form.value = initialForm()
  state.selectedFabricId.value = ''
  state.clothOptions.value = []
  state.editing.value = false
  state.setSelectedInventory(null)
}

async function testCloseResetsForm() {
  const item = ref({ fabric_id:'F1', item_code:'1234567', customer:'张三', item_name:'T恤', color:'红', color_no:'R01', composition:'棉', process_code:'染色', gram_weight:180, rolls:5, weight_kg:100, price:20 })
  const form = ref({ ship_date:'2025-12-10', order_no:'OUT123' })
  const selectedFabricId = ref('F1')
  const clothOptions = ref([{ fabric_id:'F1' }])
  const editing = ref(true)
  let selectedInventory = { fabric_id:'F1' }
  const setSelectedInventory = (v)=>{ selectedInventory = v }

  resetOutForm({ item, form, selectedFabricId, clothOptions, editing, setSelectedInventory })

  const i0 = initialItem()
  const f0 = initialForm()
  if (JSON.stringify(item.value) !== JSON.stringify(i0)) throw new Error('关闭未清空 item')
  if (JSON.stringify(form.value) !== JSON.stringify(f0)) throw new Error('关闭未清空 form')
  if (selectedFabricId.value !== '') throw new Error('关闭未重置 selectedFabricId')
  if (clothOptions.value.length !== 0) throw new Error('关闭未清空 clothOptions')
  if (editing.value !== false) throw new Error('关闭未重置编辑状态')
  if (selectedInventory !== null) throw new Error('关闭未清空临时库存选择')
}

async function testSaveResetsForm() {
  const item = ref({ fabric_id:'F2', item_code:'7654321', customer:'李四', item_name:'裤子', color:'蓝', color_no:'B02', composition:'涤', process_code:'定型', gram_weight:200, rolls:3, weight_kg:60, price:30 })
  const form = ref({ ship_date:'2025-12-10', order_no:'OUT456' })
  const selectedFabricId = ref('F2')
  const clothOptions = ref([{ fabric_id:'F2' }])
  const editing = ref(false)
  let selectedInventory = { fabric_id:'F2' }
  const setSelectedInventory = (v)=>{ selectedInventory = v }

  resetOutForm({ item, form, selectedFabricId, clothOptions, editing, setSelectedInventory })

  const i0 = initialItem()
  const f0 = initialForm()
  if (JSON.stringify(item.value) !== JSON.stringify(i0)) throw new Error('保存未清空 item')
  if (JSON.stringify(form.value) !== JSON.stringify(f0)) throw new Error('保存未清空 form')
  if (selectedFabricId.value !== '') throw new Error('保存未重置 selectedFabricId')
  if (clothOptions.value.length !== 0) throw new Error('保存未清空 clothOptions')
  if (editing.value !== false) throw new Error('保存未重置编辑状态')
  if (selectedInventory !== null) throw new Error('保存未清空临时库存选择')
}

async function testConsistencyOnConsecutiveOps() {
  const item = ref({ fabric_id:'F3', item_code:'1111111', customer:'王五', item_name:'衬衫', color:'白', color_no:'W03', composition:'棉涤', process_code:'漂白', gram_weight:150, rolls:2, weight_kg:30, price:25 })
  const form = ref({ ship_date:'2025-12-10', order_no:'' })
  const selectedFabricId = ref('F3')
  const clothOptions = ref([{ fabric_id:'F3' }])
  const editing = ref(false)
  let selectedInventory = { fabric_id:'F3' }
  const setSelectedInventory = (v)=>{ selectedInventory = v }

  resetOutForm({ item, form, selectedFabricId, clothOptions, editing, setSelectedInventory })
  // 再次模拟用户选择后取消
  item.value.item_code = '2222222'
  form.value.ship_date = '2025-12-11'
  selectedFabricId.value = 'F3'
  clothOptions.value = [{ fabric_id:'F3' }, { fabric_id:'F4' }]
  editing.value = true
  selectedInventory = { fabric_id:'F4' }

  resetOutForm({ item, form, selectedFabricId, clothOptions, editing, setSelectedInventory })

  const i0 = initialItem()
  const f0 = initialForm()
  if (JSON.stringify(item.value) !== JSON.stringify(i0)) throw new Error('连续操作后 item 未一致重置')
  if (JSON.stringify(form.value) !== JSON.stringify(f0)) throw new Error('连续操作后 form 未一致重置')
  if (selectedFabricId.value !== '') throw new Error('连续操作后 selectedFabricId 未重置')
  if (clothOptions.value.length !== 0) throw new Error('连续操作后 clothOptions 未清空')
  if (editing.value !== false) throw new Error('连续操作后编辑状态未重置')
  if (selectedInventory !== null) throw new Error('连续操作后临时库存选择未清空')
}

async function run() {
  const cases = [testCloseResetsForm, testSaveResetsForm, testConsistencyOnConsecutiveOps]
  for (const fn of cases) {
    await fn()
    console.log(`[PASS] ${fn.name}`)
  }
}

module.exports = { run }

