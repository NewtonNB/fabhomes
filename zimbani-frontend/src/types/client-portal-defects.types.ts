export interface PunchListDefectItem {
  id: number
  uuid: string
  item_number: string
  site_id?: number
  project_id?: number
  unit_id?: number
  unit?: {
    id: number
    uuid: string
    unit_number: string
    name: string
  }
  project?: {
    id: number
    uuid: string
    name: string
  }
  title: string
  description: string
  photo_url?: string
  location_details?: string
  category: 'structural' | 'architectural' | 'plumbing' | 'electrical' | 'finishing' | 'safety' | 'other'
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'in_progress' | 'rectified' | 'verified' | 'closed'
  reported_by?: number
  created_at: string
}

export interface ReportDefectPayload {
  unit_id?: number
  project_id?: number
  site_id?: number
  title: string
  description: string
  photo_url?: string
  location_details?: string
  category?: 'structural' | 'architectural' | 'plumbing' | 'electrical' | 'finishing' | 'safety' | 'other'
  severity?: 'low' | 'medium' | 'high' | 'critical'
}

export interface PunchListResponse {
  punch_items: PunchListDefectItem[]
  open_count: number
  rectified_count: number
}
