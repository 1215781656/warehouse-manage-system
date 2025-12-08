async function resolveTemplateBuffer(input: string): Promise<{ url: string | null, buffer: ArrayBuffer | null }> {
  const base: string = (import.meta as any)?.env?.BASE_URL || '/'
  const name = input.endsWith('.xlsx') ? input : `${input}.xlsx`
  const candidates = [
    name,
    `${base}templates/shipment-template.xlsx`,
    `${base}shipment-template.xlsx`,
    `/templates/shipment-template.xlsx`,
    `/shipment-template.xlsx`
  ]
  for (const url of candidates) {
    try {
      const r = await fetch(url)
      if (r.ok) {
        const buf = await r.arrayBuffer()
        return { url, buffer: buf }
      }
    } catch {}
  }
  return { url: null, buffer: null }
}

export async function generateShipmentFromTemplate(filename: string, templateUrl: string, meta: any, row: any, details: number[] = []) {
  try {
    const ExcelMod: any = await import('exceljs/dist/exceljs.min.js')
    const Workbook = ExcelMod.Workbook || (ExcelMod.default && ExcelMod.default.Workbook)
    if (!Workbook) throw new Error('ExcelJS 加载失败')
    const { url, buffer } = await resolveTemplateBuffer(templateUrl)
    if (!buffer) throw new Error('模板未找到')
    const wb = new Workbook()
    await wb.xlsx.load(buffer)
    const ws = wb.worksheets[0]


    // 基本信息（按示例坐标，适配你的模板）
    ws.getCell('B3').value = meta.customer || ''
    ws.getCell('D4').value = meta.ship_date || ''
    ws.getCell('H4').value = meta.phone || ''
    ws.getCell('N4').value = meta.order_no || ''

    // 自动定位表头行并按表头名映射写入，避免列位置偏移
    const normalize = (s: any) => String(s||'').trim().replace(/\s+/g,'').replace(/（/g,'(').replace(/）/g,')')
    let headerRowIndex = 5
    for (let r = 4; r <= 12; r++) {
      const val = normalize(ws.getCell(`B${r}`).text)
      if (val.includes(normalize('品名规格'))) { headerRowIndex = r; break }
    }
    const targetRow = headerRowIndex + 1
    const amountVal = Number(row.amount || (Number(row.weight_kg||0)*Number(row.price||0)))
    const valueMap: Record<string, any> = {
      [normalize('品名规格')]: row.item_name || '',
      [normalize('成分')]: row.composition || '',
      [normalize('颜色')]: row.color || '',
      [normalize('工艺')]: row.process_code || '',
      [normalize('克重')]: Number(row.gram_weight || 0),
      [normalize('匹数')]: Number(row.rolls || 0),
      [normalize('重量(kg)')]: Number(row.weight_kg || 0),
      [normalize('重量')]: Number(row.weight_kg || 0),
      [normalize('单价(元)')]: Number(row.price || 0),
      [normalize('单价')]: Number(row.price || 0),
      [normalize('金额(元)')]: amountVal,
      [normalize('金额')]: amountVal,
      [normalize('小计')]: amountVal
    }
    // 构建表头名称=>列索引映射（扫描更宽范围避免漏列）
    const headerRow = ws.getRow(headerRowIndex)
    const posMap: Record<string, number> = {}
    for (let c = 2; c <= 20; c++) { // B..T
      const n = normalize(headerRow.getCell(c).text)
      if (n) posMap[n] = c
    }
    // 写入值，按名称找到列再写入下一行
    Object.keys(valueMap).forEach(key => {
      const col = posMap[key]
      if (col) ws.getRow(targetRow).getCell(col).value = valueMap[key]
    })

    // 出库明细行（从 C13 起填充数值，不写左侧标签）
    const startCols = ['C','D','E','F','G','H','I','J']
    for (let i = 0; i < Math.min(details.length, startCols.length); i++) {
      ws.getCell(`${startCols[i]}13`).value = Number(details[i])
    }

    // 小计与页脚
    ws.getCell('L24').value = `${amountVal}`
    // 去除 B27 额外信息，不写发布人与收货人

    // 消除共享公式，避免 ExcelJS 写出错误（将公式替换为其结果）
    ws.eachRow(row => {
      row.eachCell(cell => {
        const v: any = cell.value
        if (v && typeof v === 'object' && (v.sharedFormula || v.formula)) {
          cell.value = (v.result !== undefined && v.result !== null) ? v.result : null
        }
      })
    })
    const out = await wb.xlsx.writeBuffer()
    const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
    return true
  } catch (e) {
    
    return false
  }
}
