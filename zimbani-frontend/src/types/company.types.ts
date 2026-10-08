export interface Company {
  id: string
  uuid: string
  name: string
  code: string
  company_type: 'parent' | 'subsidiary'
  parent_id?: string
  registration_number?: string
  tax_number?: string
  industry?: string
  employee_count?: number
  website?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  region?: string
  country: string
  postal_code?: string
  logo?: string
  description?: string
  founded_date?: string
  status: 'active' | 'inactive' | 'suspended'
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  deleted_at?: string
  
  // Relationships
  parent?: Company
  subsidiaries_count?: number
  users_count?: number
  projects_count?: number
}

export interface CompanyFormData {
  name: string
  code: string
  company_type: 'parent' | 'subsidiary'
  parent_id?: string
  registration_number?: string
  tax_number?: string
  industry?: string
  employee_count?: number
  website?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  region?: string
  country: string
  postal_code?: string
  description?: string
  founded_date?: string
  status?: 'active' | 'inactive' | 'suspended'
  metadata?: Record<string, any>
}

export interface CompanyFilters {
  search?: string
  company_type?: string
  status?: string
  parent_id?: string
  country?: string
  per_page?: number
  page?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface CompanyStatistics {
  total_companies: number
  parent_companies: number
  subsidiary_companies: number
  active_companies: number
  inactive_companies: number
  suspended_companies: number
  by_country: Record<string, number>
  by_industry: Record<string, number>
  total_employees: number
  total_projects: number
}
