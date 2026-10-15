// Quality Control & Site Inspections Types for Fab Homes ZIMBANI Platform

export type InspectionType =
  | 'foundation'
  | 'structural_framing'
  | 'masonry'
  | 'plumbing_rough_in'
  | 'electrical_rough_in'
  | 'concrete_pre_pour'
  | 'waterproofing'
  | 'finishing'
  | 'handover_audit'
  | 'safety_environmental'
  | 'other'

export type InspectionStatus =
  | 'scheduled'
  | 'in_progress'
  | 'passed'
  | 'failed'
  | 'passed_with_conditions'
  | 'cancelled'

export type ChecklistItemStatus = 'pass' | 'fail' | 'na' | 'pending'

export interface ChecklistItem {
  item_text: string
  category?: string
  status: ChecklistItemStatus
  notes?: string
}

export type PunchSeverity = 'low' | 'medium' | 'high' | 'critical'

export type PunchCategory =
  | 'structural'
  | 'architectural'
  | 'plumbing'
  | 'electrical'
  | 'finishing'
  | 'safety'
  | 'other'

export type PunchStatus = 'open' | 'in_progress' | 'rectified' | 'verified_closed' | 'waived'

export interface InspectionRefSite {
  id: number
  uuid: string
  name: string
  code?: string
}

export interface InspectionRefProject {
  id: number
  uuid: string
  name: string
  code?: string
}

export interface InspectionRefUnit {
  id: number
  uuid: string
  unit_number: string
}

export interface InspectionRefTask {
  id: number
  uuid: string
  task_number: string
  title: string
}

export interface InspectionRefMilestone {
  id: number
  uuid: string
  milestone_name: string
  milestone_order?: number
}

export interface InspectionRefUser {
  id: number
  uuid?: string
  name: string
  email?: string
}

export interface SiteInspection {
  id: number
  uuid: string
  inspection_number: string
  title: string
  inspection_type: InspectionType
  status: InspectionStatus
  score?: number | null
  checklist_items: ChecklistItem[]
  summary_notes?: string | null
  conditions?: string | null
  scheduled_date?: string | null
  inspected_at?: string | null
  signed_off_at?: string | null
  sign_off_notes?: string | null

  // Computed helpers
  is_passed: boolean
  is_failed: boolean
  is_signed_off: boolean
  is_overdue: boolean
  defects_count?: number
  open_defects_count?: number

  // Relations
  site?: InspectionRefSite | null
  project?: InspectionRefProject | null
  unit?: InspectionRefUnit | null
  task?: InspectionRefTask | null
  milestone?: InspectionRefMilestone | null
  inspector?: InspectionRefUser | null
  supervisor?: InspectionRefUser | null
  created_by?: InspectionRefUser | null
  punch_list_items?: PunchListItem[]
  documents?: any[]

  created_at: string
  updated_at: string
}

export interface PunchListItem {
  id: number
  uuid: string
  item_number: string
  title: string
  description?: string | null
  location_details?: string | null
  category: PunchCategory
  severity: PunchSeverity
  status: PunchStatus
  due_date?: string | null
  rectified_at?: string | null
  rectification_notes?: string | null
  subcontractor_name?: string | null
  verified_at?: string | null
  verification_notes?: string | null

  // Computed helpers
  is_open: boolean
  is_rectified: boolean
  is_closed: boolean
  is_waived: boolean
  is_critical: boolean
  is_overdue: boolean

  // Relations
  site_inspection?: {
    id: number
    uuid: string
    inspection_number: string
    title: string
    inspection_type: InspectionType
    status: InspectionStatus
  } | null
  site?: InspectionRefSite | null
  project?: InspectionRefProject | null
  unit?: InspectionRefUnit | null
  task?: InspectionRefTask | null
  assigned_to?: InspectionRefUser | null
  reported_by?: InspectionRefUser | null
  verified_by?: InspectionRefUser | null
  documents?: any[]

  created_at: string
  updated_at: string
}

export interface InspectionFilterParams {
  site_id?: string | number
  project_id?: string | number
  unit_id?: string | number
  task_id?: string | number
  inspection_type?: InspectionType | string
  status?: InspectionStatus | string
  inspector_id?: string | number
  supervisor_id?: string | number
  from_date?: string
  to_date?: string
  needs_sign_off?: boolean
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

export interface PunchListFilterParams {
  site_id?: string | number
  project_id?: string | number
  unit_id?: string | number
  site_inspection_id?: string | number
  category?: PunchCategory | string
  severity?: PunchSeverity | string
  status?: PunchStatus | string
  open_only?: boolean
  overdue_only?: boolean
  assigned_to?: string | number
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

export interface CreateSiteInspectionInput {
  title: string
  inspection_type: InspectionType
  site_id: number | string
  project_id?: number | string | null
  unit_id?: number | string | null
  task_id?: number | string | null
  milestone_id?: number | string | null
  inspector_id?: number | string | null
  supervisor_id?: number | string | null
  scheduled_date: string
  summary_notes?: string | null
  checklist_items?: ChecklistItem[]
}

export interface UpdateSiteInspectionInput extends Partial<CreateSiteInspectionInput> {
  status?: InspectionStatus
  score?: number | null
  conditions?: string | null
  inspected_at?: string | null
}

export interface CompleteInspectionInput {
  status: 'passed' | 'failed' | 'passed_with_conditions'
  score?: number | null
  checklist_items?: ChecklistItem[]
  summary_notes?: string | null
  conditions?: string | null
  inspected_at?: string | null
}

export interface SignOffInspectionInput {
  sign_off_notes?: string | null
  supervisor_id?: number | string | null
}

export interface CreatePunchListItemInput {
  title: string
  site_id: number | string
  site_inspection_id?: number | string | null
  project_id?: number | string | null
  unit_id?: number | string | null
  task_id?: number | string | null
  description?: string | null
  location_details?: string | null
  category: PunchCategory
  severity: PunchSeverity
  due_date?: string | null
  assigned_to?: number | string | null
  subcontractor_name?: string | null
}

export interface UpdatePunchListItemInput extends Partial<CreatePunchListItemInput> {
  status?: PunchStatus
  rectification_notes?: string | null
}

export interface RectifyPunchListItemInput {
  rectification_notes: string
}

export interface VerifyPunchListItemInput {
  verification_notes?: string | null
  action: 'close' | 'waive'
}

export interface InspectionStatistics {
  total_inspections: number
  passed: number
  failed: number
  passed_with_conditions: number
  scheduled: number
  in_progress: number
  needs_sign_off: number
  average_score: number
  by_type: Record<string, number>
  defects: {
    total: number
    open: number
    critical: number
    rectified: number
    closed: number
  }
}

export interface DefectStatistics {
  total: number
  open: number
  rectified: number
  closed: number
  waived: number
  overdue: number
  critical_open: number
  by_severity: Record<string, number>
  by_category: Record<string, number>
}
