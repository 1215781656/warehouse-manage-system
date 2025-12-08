export interface Category {
  id: number
  name: string
  code: string
  parent_id?: number | null
  description?: string | null
  created_at: string
  updated_at: string
}

export interface Material {
  id: number
  code: string
  name: string
  specification?: string | null
  unit: string
  category_id?: number | null
  price: number
  min_stock: number
  max_stock: number
  description?: string | null
  created_at: string
  updated_at: string
}

export interface InventoryRow {
  material_id: number
  current_stock: number
  current_amount: number
  total_in: number
  total_out: number
  last_updated: string
}

