export interface QAInspectionChecklistItem {
  id: string
  title: string
  description: string
  critical: boolean
  status?: 'pass' | 'fail' | 'na'
  notes?: string
}

export type InspectionTypeKey =
  | 'foundation'
  | 'structural_framing'
  | 'roofing'
  | 'plumbing_rough_in'
  | 'electrical_rough_in'
  | 'finishing'
  | 'handover_audit'
  | 'other'

export interface OfflineCachePackage {
  package_version: string
  generated_at: string
  user: {
    id: number
    name: string
    email?: string
  }
  checklist_templates: Record<string, QAInspectionChecklistItem[]>
  sites: Array<{
    id: number
    uuid: string
    name: string
    code: string
    address?: string
    city?: string
    latitude?: number
    longitude?: number
    status: string
  }>
  projects: Array<{
    id: number
    uuid: string
    name: string
    code: string
    site_id: number
    status: string
    budget?: number
    milestones: Array<{
      id: number
      uuid: string
      milestone_name: string
      milestone_order: number
      completion_percentage: number
      status: string
      target_amount?: number
      savings_pool?: {
        id: number
        uuid: string
        milestone_name: string
        tier_order: number
        allocated_amount: number
        target_amount: number
        status: string
      }
    }>
    units?: Array<{
      id: number
      uuid: string
      unit_number: string
      status: string
    }>
  }>
  milestone_pools: Array<{
    id: number
    uuid: string
    milestone_name: string
    tier_order: number
    allocated_amount: number
    target_amount: number
    status: string
    savings_account?: {
      id: number
      uuid: string
      account_number: string
      client_id: number
      current_balance: number
    }
  }>
  open_punch_items: Array<{
    id: number
    uuid: string
    item_number: string
    project_id?: number
    site_id: number
    title: string
    location_details?: string
    category: string
    severity: string
    status: string
  }>
  subcontractors: Array<{
    id: number
    contract_number: string
    subcontractor_name: string
    scope_of_work?: string
    trade_category?: string
  }>
  gps_geo_fences?: Record<
    string,
    {
      name: string
      lat: number
      lng: number
      radius_m: number
    }
  >
}

export interface OfflineInspectionPayload {
  client_sync_id: string
  uuid?: string
  site_id: number
  project_id?: number
  unit_id?: number
  milestone_id?: number
  milestone_savings_pool_id?: number
  title: string
  inspection_type: string
  scheduled_date?: string
  inspected_at?: string
  offline_created_at: string
  status: 'scheduled' | 'in_progress' | 'passed' | 'failed' | 'passed_with_conditions' | 'cancelled'
  score?: number
  verified_milestone_percentage?: number
  checklist_items: Array<{
    id: string
    status: 'pass' | 'fail' | 'na'
    notes?: string
  }>
  summary_notes?: string
  conditions?: string
  gps_latitude?: number
  gps_longitude?: number
  gps_accuracy?: number
  weather_condition?: string
  work_authorized?: boolean
}

export interface OfflinePunchPayload {
  client_sync_id: string
  uuid?: string
  inspection_client_sync_id?: string
  site_inspection_id?: number
  site_id: number
  project_id?: number
  unit_id?: number
  title: string
  description?: string
  photo_url?: string
  location_details?: string
  category: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status?: string
  due_date?: string
  gps_latitude?: number
  gps_longitude?: number
  offline_created_at: string
}

export interface OfflineSyncBatch {
  device_id: string
  client_version?: string
  sync_type?: string
  inspections: OfflineInspectionPayload[]
  punch_list_items: OfflinePunchPayload[]
}

export interface OfflineSyncResult {
  sync_id: string
  status: 'success' | 'partial_success' | 'failed'
  total_processed: number
  total_conflicts: number
  synced_inspections: any[]
  synced_punch_items: any[]
  conflicts: any[]
  server_time: string
}

export interface OfflineSyncLog {
  id: number
  uuid: string
  device_id: string
  user_id: number
  user?: {
    id: number
    name: string
    email: string
  }
  sync_type: string
  total_items_processed: number
  total_conflicts: number
  payload_summary?: {
    inspections_count: number
    punch_items_count: number
    conflicts_count: number
  }
  client_version?: string
  ip_address?: string
  status: 'success' | 'partial_success' | 'failed'
  created_at: string
}
