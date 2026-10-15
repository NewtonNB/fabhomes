// Material & Inventory Tracking Types for Fab Homes ZIMBANI Platform

export type MaterialStatus = 'in_stock' | 'low_stock' | 'out_of_stock'

export type MaterialCategory =
  | 'cement'
  | 'steel'
  | 'aggregates'
  | 'timber'
  | 'plumbing'
  | 'electrical'
  | 'finishing'
  | 'masonry'
  | 'tools'
  | 'paint'
  | 'other'

export type RequisitionStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'ordered'
  | 'partially_delivered'
  | 'delivered'
  | 'cancelled'

export type RequisitionPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface MaterialSite {
  id: number
  uuid: string
  name: string
  code: string
}

export interface MaterialProject {
  id: number
  uuid: string
  name: string
  code: string
}

export interface MaterialUser {
  id: number
  uuid?: string
  name: string
  email?: string
}

export interface MaterialTaskRef {
  id: number
  uuid: string
  task_number: string
  title: string
}

export interface MaterialMilestoneRef {
  id: number
  uuid: string
  milestone_name: string
  milestone_order?: number
}

export interface MaterialUnitRef {
  id: number
  uuid: string
  unit_number: string
}

export interface Material {
  id: number
  uuid: string
  material_code: string
  name: string
  category: MaterialCategory
  unit_of_measure: string
  unit_cost: number
  currency: string
  current_stock: number
  minimum_stock_level: number
  reorder_quantity: number
  total_valuation: number
  storage_location?: string | null
  status: MaterialStatus
  is_low_stock: boolean
  is_out_of_stock: boolean
  supplier_name?: string | null
  supplier_contact?: string | null
  description?: string | null
  metadata?: Record<string, any> | null
  site?: MaterialSite | null
  usages_count?: number
  created_by?: {
    id: number
    name: string
  } | null
  created_at: string
  updated_at: string
}

export interface RequisitionItem {
  material_id?: number
  material_uuid?: string
  material_name: string
  unit_of_measure: string
  quantity: number
  estimated_unit_cost: number
  total_estimated_cost?: number
  notes?: string
}

export interface MaterialRequisition {
  id: number
  uuid: string
  requisition_number: string
  status: RequisitionStatus
  priority: RequisitionPriority
  required_by_date?: string | null
  total_estimated_cost: number
  currency: string
  items: RequisitionItem[]
  items_count: number
  notes?: string | null
  rejection_reason?: string | null
  approved_at?: string | null
  delivered_at?: string | null
  site?: MaterialSite | null
  project?: MaterialProject | null
  requested_by?: MaterialUser | null
  approved_by?: MaterialUser | null
  created_at: string
  updated_at: string
}

export interface MaterialUsage {
  id: number
  uuid: string
  usage_number: string
  quantity_used: number
  unit_of_measure: string
  unit_cost_at_usage?: number | null
  total_cost?: number | null
  used_date: string
  purpose: string
  notes?: string | null
  material?: {
    id: number
    uuid: string
    material_code: string
    name: string
    category: string
    unit_of_measure: string
    current_stock: number
  } | null
  site?: MaterialSite | null
  project?: MaterialProject | null
  task?: MaterialTaskRef | null
  milestone?: MaterialMilestoneRef | null
  unit?: MaterialUnitRef | null
  logged_by?: MaterialUser | null
  created_at: string
  updated_at: string
}

export interface CreateMaterialInput {
  name: string
  category: MaterialCategory
  unit_of_measure: string
  unit_cost: number
  currency?: string
  site_id: string | number
  current_stock?: number
  minimum_stock_level?: number
  reorder_quantity?: number
  storage_location?: string
  supplier_name?: string
  supplier_contact?: string
  description?: string
}

export interface UpdateMaterialInput extends Partial<CreateMaterialInput> {}

export interface AdjustStockInput {
  quantity_delta: number
  reason: string
}

export interface CreateRequisitionInput {
  site_id: string | number
  project_id?: string | number | null
  priority?: RequisitionPriority
  required_by_date?: string | null
  notes?: string | null
  items: RequisitionItem[]
}

export interface UpdateRequisitionInput extends Partial<CreateRequisitionInput> {
  status?: RequisitionStatus
}

export interface CreateUsageInput {
  material_id: string | number
  site_id: string | number
  project_id?: string | number | null
  task_id?: string | number | null
  milestone_id?: string | number | null
  unit_id?: string | number | null
  quantity_used: number
  unit_of_measure?: string
  unit_cost_at_usage?: number
  total_cost?: number
  used_date: string
  purpose: string
  notes?: string | null
}

export interface MaterialFilterParams {
  site_id?: string | number
  category?: string
  status?: MaterialStatus
  low_stock_only?: boolean
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

export interface RequisitionFilterParams {
  site_id?: string | number
  project_id?: string | number
  status?: RequisitionStatus
  priority?: RequisitionPriority
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

export interface UsageFilterParams {
  material_id?: string | number
  site_id?: string | number
  project_id?: string | number
  task_id?: string | number
  milestone_id?: string | number
  from_date?: string
  to_date?: string
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

export interface MaterialStatistics {
  total_items: number
  in_stock: number
  low_stock: number
  out_of_stock: number
  total_valuation: number
  currency: string
  by_category: {
    category: string
    count: number
    valuation: number
  }[]
  pending_requisitions_count: number
}
