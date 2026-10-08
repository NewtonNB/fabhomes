export interface Project {
  id: string
  uuid: string
  name: string
  code: string
  company_id: string
  project_type: 'residential' | 'commercial' | 'mixed' | 'industrial' | 'infrastructure' | 'other'
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  description?: string
  start_date?: string
  expected_end_date?: string
  actual_end_date?: string
  total_budget?: number
  spent_budget?: number
  currency: string
  location?: string
  city?: string
  region?: string
  country: string
  client_name?: string
  client_contact?: string
  contract_value?: number
  progress_percentage?: number
  priority?: 'low' | 'medium' | 'high' | 'critical'
  tags?: string[]
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  deleted_at?: string
  
  // Relationships
  company?: {
    uuid: string
    name: string
    code: string
  }
  sites_count?: number
  units_count?: number
  assigned_users_count?: number
}

export interface ProjectFormData {
  name: string
  code: string
  company_id: string
  project_type: 'residential' | 'commercial' | 'mixed' | 'industrial' | 'infrastructure' | 'other'
  status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  description?: string
  start_date?: string
  expected_end_date?: string
  actual_end_date?: string
  total_budget?: number
  spent_budget?: number
  currency?: string
  location?: string
  city?: string
  region?: string
  country: string
  client_name?: string
  client_contact?: string
  contract_value?: number
  progress_percentage?: number
  priority?: 'low' | 'medium' | 'high' | 'critical'
  tags?: string[]
  metadata?: Record<string, any>
}

export interface ProjectFilters {
  search?: string
  company_id?: string
  project_type?: string
  status?: string
  priority?: string
  country?: string
  per_page?: number
  page?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface ProjectStatistics {
  total_projects: number
  active_projects: number
  completed_projects: number
  on_hold_projects: number
  cancelled_projects: number
  by_type: Record<string, number>
  by_status: Record<string, number>
  budget: {
    total_budget: number
    total_spent: number
    total_remaining: number
    average_budget: number
  }
  timeline: {
    on_schedule: number
    delayed: number
    completed_on_time: number
  }
  by_company: Record<string, number>
}

export interface AssignUsersData {
  user_ids: string[]
}
