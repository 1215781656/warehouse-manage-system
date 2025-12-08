import type { WritableComputedRef } from 'vue'

export interface ExportColumn {
  prop: string
  label: string
}

export async function exportToXLSX(filename: string, columns: ExportColumn[], rows: any[]) {
  const XLSX = await import('xlsx')
  const header = columns.map(c => c.label)
  const keys = columns.map(c => c.prop)
  const aoa: any[] = [header]
  const limit = 10000
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([header])
  let written = 0
  while (written < rows.length) {
    const chunk = rows.slice(written, written + limit)
    const chunkAoa = chunk.map(r => keys.map(k => r[k]))
    XLSX.utils.sheet_add_aoa(ws, chunkAoa, { origin: -1 })
    written += chunk.length
  }
  const colsWidth = columns.map((c, idx) => {
    const isNumber = rows.every(r => typeof r[c.prop] === 'number')
    if (isNumber) return { wch: 12 }
    let maxLen = c.label?.length || 8
    for (const r of rows) {
      const v = r[c.prop]
      const s = v == null ? '' : String(v)
      if (s.length > maxLen) maxLen = s.length
    }
    const w = Math.max(Math.floor(maxLen * 1.6) + 8, 18)
    return { wch: w }
  })
  ;(ws as any)['!cols'] = colsWidth
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, filename)
}

export function getVisibleColumnsFromTable(tableRef: any): ExportColumn[] {
  const cols: ExportColumn[] = []
  const inst = tableRef?.value
  // Element Plus Table: columns property contains column definitions
  const raw = inst?.columns || []
  for (const c of raw) {
    const type = c.type || c.columnConfig?.type
    const prop = c.property || c.columnConfig?.property
    const label = c.label || c.columnConfig?.label
    if (type === 'selection') continue
    if (!prop || !label) continue
    cols.push({ prop, label })
  }
  return cols
}

export interface ShipmentRow {
  no: string
  item_name: string
  composition: string
  color: string
  process_code: string
  gram_weight: number | string
  rolls: number | string
  weight_kg: number | string
  price: number | string
  amount: number | string
  subtotal?: number | string
}

export interface ShipmentMeta {
  ship_date: string
  customer: string
  order_no: string
  title?: string
  phone?: string
  publisher?: string
  footer_tip?: string
  copies_desc?: string[]
}

export async function generateShipmentExcel(filename: string, meta: ShipmentMeta, row: ShipmentRow) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([[]])

  // Title centered across B1:N1
  const title = meta.title || '聚德丰送发货单'
  XLSX.utils.sheet_add_aoa(ws, [[title]], { origin: 'B1' })
  ;(ws as any)['!merges'] = ((ws as any)['!merges'] || []).concat([XLSX.utils.decode_range('B1:N1')])

  // No. in top-right
  XLSX.utils.sheet_add_aoa(ws, [['No.', meta.order_no || row.no || '']], { origin: 'N1' })

  // Info lines
  XLSX.utils.sheet_add_aoa(ws, [['客户：', meta.customer || '']], { origin: 'B3' })
  XLSX.utils.sheet_add_aoa(ws, [['出货日期', meta.ship_date || '']], { origin: 'B4' })
  XLSX.utils.sheet_add_aoa(ws, [['联系电话：', meta.phone || '']], { origin: 'F4' })
  XLSX.utils.sheet_add_aoa(ws, [['发货单编号：', meta.order_no || '']], { origin: 'L4' })

  // Header row at B5
  const header = ['品名规格', '成分', '颜色', '工艺', '克重', '匹数', '重量(kg)', '单价(元)', '金额(元)', '小计']
  XLSX.utils.sheet_add_aoa(ws, [header], { origin: 'B5' })

  // Data row at B6
  const dataRow = [
    row.item_name,
    row.composition,
    row.color,
    row.process_code,
    row.gram_weight,
    row.rolls,
    row.weight_kg,
    row.price,
    row.amount,
    row.subtotal ?? ''
  ]
  XLSX.utils.sheet_add_aoa(ws, [dataRow], { origin: 'B6' })

  // Detail & footer
  XLSX.utils.sheet_add_aoa(ws, [[`出库明细：${row.color||''}`]], { origin: 'B13' })
  XLSX.utils.sheet_add_aoa(ws, [[0,0,0,0,0,0,0]], { origin: 'C13' })

  const footer = meta.footer_tip || '提示：如有质量问题裁剪后恕不负责'
  const copies = meta.copies_desc || ['第一联(白):留底', '第二联(红):客户', '第三联(黄):回财务结算']
  XLSX.utils.sheet_add_aoa(ws, [[`小 计 ￥${row.amount || ''}`]], { origin: 'L24' })
  XLSX.utils.sheet_add_aoa(ws, [[footer]], { origin: 'B25' })
  XLSX.utils.sheet_add_aoa(ws, [copies], { origin: 'B26' })
  const pubLine = `发布人：${meta.publisher || ''}    收货人：空`
  XLSX.utils.sheet_add_aoa(ws, [[pubLine]], { origin: 'B27' })

  // Column widths (A..N)
  ;(ws as any)['!cols'] = [
    { wch: 4 },  // A padding
    { wch: 22 }, // B 品名规格
    { wch: 22 }, // C 成分
    { wch: 14 }, // D 颜色
    { wch: 14 }, // E 工艺
    { wch: 12 }, // F 克重
    { wch: 10 }, // G 匹数
    { wch: 14 }, // H 重量
    { wch: 14 }, // I 单价
    { wch: 16 }, // J 金额
    { wch: 12 }, // K 小计
    { wch: 10 }, // L
    { wch: 16 }, // M
    { wch: 6 },  // N
    { wch: 10 }, // O
  ]

  XLSX.utils.book_append_sheet(wb, ws, '发货单')
  XLSX.writeFile(wb, filename)
}
