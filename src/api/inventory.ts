import { query } from '@/api/db'

export type InventorySearch = {
  item_name?: string
  composition?: string
  gram_weight?: number | ''
  width_cm?: number | ''
  color?: string
  color_no?: string
  page?: number
  pageSize?: number
}

function buildWhere(s: InventorySearch) {
  const conds: string[] = []
  const params: any[] = []
  if (s.item_name) { conds.push('item_name LIKE ?'); params.push(`%${s.item_name}%`) }
  if (s.composition) { conds.push('composition LIKE ?'); params.push(`%${s.composition}%`) }
  if (s.gram_weight !== undefined && s.gram_weight !== '') { conds.push('gram_weight = ?'); params.push(Number(s.gram_weight)) }
  if (s.width_cm !== undefined && s.width_cm !== '') { conds.push('width_cm = ?'); params.push(Number(s.width_cm)) }
  if (s.color) { conds.push('color LIKE ?'); params.push(`%${s.color}%`) }
  if (s.color_no) { conds.push('color_no LIKE ?'); params.push(`%${s.color_no}%`) }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  return { where, params }
}

export async function searchInventoryPaged(s: InventorySearch) {
  const pageSize = Number(s.pageSize || 10)
  const page = Number(s.page || 1)
  const { where, params } = buildWhere(s)
  const totalRow = await query(`SELECT COUNT(1) AS c FROM cloth_inventory ${where}`, params)
  const total = Number((totalRow && totalRow[0] && totalRow[0].c) || 0)
  const rows = await query(
    `SELECT fabric_id, item_name, composition, gram_weight, width_cm, color, color_no, total_in_rolls, total_in_weight, total_out_rolls, total_out_weight, current_rolls, current_weight, last_updated
     FROM cloth_inventory ${where} ORDER BY last_updated DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  )
  return { rows, total }
}

export async function searchInventoryAll(s: InventorySearch) {
  const { where, params } = buildWhere(s)
  const rows = await query(
    `SELECT item_name, composition, gram_weight, width_cm, color, color_no, total_in_rolls, total_in_weight, total_out_rolls, total_out_weight, current_rolls, current_weight, last_updated FROM cloth_inventory ${where} ORDER BY last_updated DESC`,
    params
  )
  return rows
}

