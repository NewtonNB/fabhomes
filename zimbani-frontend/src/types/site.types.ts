export interface Site {
  id: string
  uuid: string
  name: string
  code: string
  project_id: string
  site_type: 'construction' | 'warehouse' | 'office' | 'showroom' | 'other'
  status: 'planning' | 'active' | 'completed' | 'on_hold' | 'closed'
  description?: string
  address?: string
  city?: string
  region?: string
  country: string
  postal_code?: string
  latitude?: number
  longitude?: number
  total_area?: number
  buildable_area?: number
  start_date?: string
  expected_completion_date?: string
  actual_completion_date?: string
  progress_percentage?: number
  supervisor_id?: string
  total_workers?: number
  total_equipment?: number
  allocated_budget?: number
  spent_budget?: number
  currency: string
  safety_compliance_status?: 'compliant' | 'non_compliant' | 'under_review'
  last_inspection_date?: string
  next_inspection_date?: string
  contact_person?: string
  contact_phone?: string
  contact_email?: string
  utilities?: string[]
  facilities?: string[]
  access_restrictions?: string
  notes?: string
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  deleted_at?: string
  
  // Computed properties
  area_utilization?: number
  budget_utilization?: number
  is_overdue?: boolean
  days_until_completion?: number
  
  // Relationships
  project?: {
    uuid: string
    name: string
    code: string
  }
  supervisor?: {
    uuid: string
    name: string
    email: string
  }
  units_count?: number
  workers_count?: number
}

export interface SiteFormData {
  name: string
  code: string
  project_id: string
  site_type: 'construction' | 'warehouse' | 'office' | 'showroom' | 'other'
  status?: 'planning' | 'active' | 'completed' | 'on_hold' | 'closed'
  description?: string
  address?: string
  city?: string
  region?: string
  country: string
  postal_code?: string
  latitude?: number
  longitude?: number
  total_area?: number
  buildable_area?: number
  start_date?: string
  expected_completion_date?: string
  actual_completion_date?: string
  progress_percentage?: number
  supervisor_id?: string
  total_workers?: number
  total_equipment?: number
  allocated_budget?: number
  spent_budget?: number
  currency?: string
  safety_compliance_status?: 'compliant' | 'non_compliant' | 'under_review'
  last_inspection_date?: string
  next_inspection_date?: string
  contact_person?: string
  contact_phone?: string
  contact_email?: string
  utilities?: string[]
  facilities?: string[]
  access_restrictions?: string
  notes?: string
  metadata?: Record<string, any>
}

export interface SiteFilters {
  search?: string
  project_id?: string
  site_type?: string
  status?: string
  supervisor_id?: string
  country?: string
  per_page?: number
  page?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface SiteStatistics {
  total_sites: number
  active_sites: number
  completed_sites: number
  on_hold_sites: number
  by_type: Record<string, number>
  by_status: Record<string, number>
  total_workers: number
  total_equipment: number
  total_area: number
  total_buildable_area: number
  budget: {
    total_allocated: number
    total_spent: number
    total_remaining: number
  }
  safety: {
    compliant: number
    non_compliant: number
    under_review: number
  }
}

export interface AssignWorkersData {
  workers: {
    user_id: string
    role?: string
    status?: 'active' | 'inactive'
  }[]
}

export interface UpdateInspectionData {
  last_inspection_date?: string
  next_inspection_date?: string
  inspection_notes?: string
}
