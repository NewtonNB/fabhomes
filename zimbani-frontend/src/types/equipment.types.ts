// Equipment & Machinery Tracking Types for Fab Homes ZIMBANI Platform

export type EquipmentStatus = 'available' | 'in_use' | 'under_maintenance' | 'decommissioned'

export type EquipmentCondition = 'excellent' | 'good' | 'fair' | 'needs_repair'

export type EquipmentOwnership = 'owned' | 'rented' | 'leased'

export type EquipmentType =
  | 'earthmoving'
  | 'lifting'
  | 'concrete'
  | 'transport'
  | 'power_tools'
  | 'generators'
  | 'compaction'
  | 'other'

export type DispatchStatus = 'pending' | 'in_transit' | 'active_on_site' | 'returned' | 'cancelled'

export type MaintenanceType =
  | 'routine_service'
  | 'preventative'
  | 'breakdown_repair'
  | 'safety_inspection'
  | 'oil_change'
  | 'tire_replacement'

export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

export interface EquipmentSite {
  id: number
  uuid: string
  name: string
  code?: string
}

export interface EquipmentProject {
  id: number
  uuid: string
  name: string
  code?: string
}

export interface EquipmentUser {
  id: number
  uuid?: string
  name: string
  email?: string
}

export interface EquipmentTaskRef {
  id: number
  uuid: string
  task_number: string
  title: string
}

export interface Equipment {
  id: number
  uuid: string
  equipment_code: string
  name: string
  type: EquipmentType
  model_number?: string | null
  serial_number?: string | null
  registration_number?: string | null
  ownership_type: EquipmentOwnership
  hourly_rate?: number | null
  daily_rate?: number | null
  currency: string
  purchase_date?: string | null
  purchase_price?: number | null
  supplier_or_vendor?: string | null
  status: EquipmentStatus
  condition: EquipmentCondition
  total_hours_operated: number
  last_service_date?: string | null
  next_service_due_date?: string | null
  is_available: boolean
  is_in_use: boolean
  is_under_maintenance: boolean
  needs_service: boolean
  is_service_overdue: boolean
  notes?: string | null
  metadata?: Record<string, any> | null
  current_site?: EquipmentSite | null
  assigned_operator?: EquipmentUser | null
  created_by?: EquipmentUser | null
  created_at: string
  updated_at: string
}

export interface EquipmentDispatch {
  id: number
  uuid: string
  dispatch_number: string
  status: DispatchStatus
  dispatched_at: string
  expected_return_date?: string | null
  actual_return_date?: string | null
  purpose: string
  transport_cost?: number | null
  notes?: string | null
  equipment?: {
    id: number
    uuid: string
    equipment_code: string
    name: string
    type: EquipmentType
    registration_number?: string | null
  } | null
  from_site?: EquipmentSite | null
  to_site?: EquipmentSite | null
  project?: EquipmentProject | null
  operator?: EquipmentUser | null
  dispatched_by?: EquipmentUser | null
  received_by?: EquipmentUser | null
  created_at: string
  updated_at: string
}

export interface EquipmentMaintenanceLog {
  id: number
  uuid: string
  maintenance_number: string
  maintenance_type: MaintenanceType
  status: MaintenanceStatus
  scheduled_date: string
  completed_date?: string | null
  hours_at_maintenance?: number | null
  cost: number
  currency: string
  service_provider?: string | null
  description: string
  parts_replaced?: string | null
  next_service_due_date?: string | null
  notes?: string | null
  equipment?: {
    id: number
    uuid: string
    equipment_code: string
    name: string
    type: EquipmentType
    registration_number?: string | null
    total_hours_operated: number
  } | null
  performed_by?: EquipmentUser | null
  created_at?: string
  updated_at?: string
}

export interface EquipmentUtilizationLog {
  id: number
  uuid: string
  log_number: string
  date: string
  start_meter_reading?: number | null
  end_meter_reading?: number | null
  hours_operated: number
  hourly_rate?: number | null
  fuel_litres_used?: number | null
  total_cost?: number | null
  purpose: string
  notes?: string | null
  equipment?: {
    id: number
    uuid: string
    equipment_code: string
    name: string
    type: EquipmentType
    registration_number?: string | null
    hourly_rate?: number | null
  } | null
  site?: EquipmentSite | null
  project?: EquipmentProject | null
  task?: EquipmentTaskRef | null
  operator?: EquipmentUser | null
  logged_by?: EquipmentUser | null
  created_at?: string
  updated_at?: string
}

export interface CreateEquipmentInput {
  name: string
  type: EquipmentType
  model_number?: string | null
  serial_number?: string | null
  registration_number?: string | null
  ownership_type: EquipmentOwnership
  hourly_rate?: number | null
  daily_rate?: number | null
  currency?: string
  current_site_id?: number | string | null
  assigned_operator_id?: number | string | null
  status?: EquipmentStatus
  condition?: EquipmentCondition
  total_hours_operated?: number
  last_service_date?: string | null
  next_service_due_date?: string | null
  purchase_date?: string | null
  purchase_price?: number | null
  supplier_or_vendor?: string | null
  notes?: string | null
}

export interface UpdateEquipmentInput extends Partial<CreateEquipmentInput> {}

export interface CreateEquipmentDispatchInput {
  equipment_id: number | string
  to_site_id: number | string
  from_site_id?: number | string | null
  project_id?: number | string | null
  operator_id?: number | string | null
  dispatched_at?: string
  expected_return_date?: string | null
  purpose: string
  transport_cost?: number | null
  notes?: string | null
}

export interface UpdateEquipmentDispatchInput extends Partial<CreateEquipmentDispatchInput> {
  status?: DispatchStatus
  actual_return_date?: string | null
}

export interface CreateMaintenanceLogInput {
  equipment_id: number | string
  maintenance_type: MaintenanceType
  scheduled_date: string
  completed_date?: string | null
  hours_at_maintenance?: number | null
  cost?: number
  currency?: string
  service_provider?: string | null
  description: string
  parts_replaced?: string | null
  next_service_due_date?: string | null
  notes?: string | null
}

export interface UpdateMaintenanceLogInput extends Partial<CreateMaintenanceLogInput> {
  status?: MaintenanceStatus
}

export interface CreateUtilizationLogInput {
  equipment_id: number | string
  site_id: number | string
  project_id?: number | string | null
  task_id?: number | string | null
  operator_id?: number | string | null
  date: string
  start_meter_reading?: number | null
  end_meter_reading?: number | null
  hours_operated: number
  hourly_rate?: number | null
  fuel_litres_used?: number | null
  purpose: string
  notes?: string | null
}

export interface EquipmentFilterParams {
  site_id?: string | number
  type?: string
  status?: EquipmentStatus
  condition?: EquipmentCondition
  needs_service?: boolean
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

export interface DispatchFilterParams {
  equipment_id?: string | number
  site_id?: string | number
  project_id?: string | number
  status?: DispatchStatus
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

export interface MaintenanceFilterParams {
  equipment_id?: string | number
  maintenance_type?: MaintenanceType
  status?: MaintenanceStatus
  from_date?: string
  to_date?: string
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

export interface UtilizationFilterParams {
  equipment_id?: string | number
  site_id?: string | number
  project_id?: string | number
  task_id?: string | number
  from_date?: string
  to_date?: string
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

export interface EquipmentStatistics {
  total_fleet: number
  available: number
  in_use: number
  under_maintenance: number
  decommissioned: number
  service_overdue: number
  total_operating_hours: number
  by_type: {
    type: string
    count: number
  }[]
  active_dispatches_count: number
}
