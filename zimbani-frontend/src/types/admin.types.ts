export interface AdminUser {
  uuid: string
  name: string
  email: string
  phone: string | null
  status: 'active' | 'inactive' | 'suspended' | 'pending'
  roles: string[]
  permissions?: string[]
  created_at: string
  updated_at: string
}

export interface UserFormData {
  name: string
  email: string
  phone?: string
  password?: string
  status?: 'active' | 'inactive' | 'suspended' | 'pending'
  roles?: string[]
}

export interface UserFilters {
  search?: string
  status?: string
  role?: string
  page?: number
  per_page?: number
}

export interface Permission {
  id: number
  name: string
  guard_name: string
}

export interface Role {
  id: number
  name: string
  guard_name: string
  permissions: Permission[]
  users_count?: number
}

export interface ActivityUser {
  id: number
  name: string
  email: string
}

export interface Activity {
  id: number
  log_name?: string
  description: string
  subject_type?: string
  event?: string
  causer_id?: number
  causer_type?: string
  properties?: Record<string, any>
  created_at: string
  user?: ActivityUser | null
}

export interface ActivityFilters {
  user_id?: number
  type?: string
  entity_type?: string
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
}

export interface ActivityStatistics {
  total_activities: number
  by_type: Record<string, number>
  by_user: Array<{ user: string; count: number }>
  recent_activities: Activity[]
}
