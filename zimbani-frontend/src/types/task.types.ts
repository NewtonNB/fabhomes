// Task and Milestone Types for Fab Homes ZIMBANI Platform

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled'
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'skipped'

export interface TaskUser {
  id: number
  uuid: string
  name: string
  email: string
}

export interface TaskProject {
  id: number
  uuid: string
  name: string
  code: string
}

export interface TaskSite {
  id: number
  uuid: string
  name: string
  code: string
}

export interface TaskUnit {
  id: number
  uuid: string
  unit_number: string
}

export interface TaskMilestone {
  id: number
  uuid: string
  milestone_name: string
  milestone_order: number
  status: MilestoneStatus
}

export interface Milestone {
  id: number
  uuid: string
  project_id: number
  milestone_name: string
  name?: string
  milestone_order: number
  description?: string | null
  planned_start_date?: string | null
  planned_end_date?: string | null
  actual_start_date?: string | null
  actual_end_date?: string | null
  completed_at?: string | null
  completed_date?: string | null
  estimated_cost?: number | null
  actual_cost?: number | null
  cost_variance?: number | null
  currency: string
  status: MilestoneStatus
  completion_percentage: number
  progress?: number
  notes?: string | null
  completion_notes?: string | null
  tasks_count?: number
  project?: TaskProject
  completed_by?: TaskUser | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: number
  uuid: string
  task_number: string
  title: string
  description?: string | null
  priority: TaskPriority
  status: TaskStatus
  completion_percentage: number
  start_date?: string | null
  due_date?: string | null
  completed_at?: string | null
  is_overdue: boolean
  estimated_hours?: number | null
  actual_hours?: number | null
  project?: TaskProject
  site?: TaskSite | null
  unit?: TaskUnit | null
  milestone?: TaskMilestone | null
  assigned_user?: TaskUser | null
  created_by_user?: { id: number; uuid: string; name: string } | null
  notes?: string | null
  metadata?: Record<string, any> | null
  created_at: string
  updated_at: string
}

export interface CreateTaskInput {
  title: string
  description?: string
  project_id: string | number
  site_id?: string | number
  unit_id?: string | number
  milestone_id?: string | number
  assigned_to?: string | number
  priority?: TaskPriority
  status?: TaskStatus
  completion_percentage?: number
  start_date?: string
  due_date?: string
  estimated_hours?: number
  actual_hours?: number
  notes?: string
  metadata?: Record<string, any>
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  project_id?: string | number
  site_id?: string | number
  unit_id?: string | number
  milestone_id?: string | number
  assigned_to?: string | number
  priority?: TaskPriority
  status?: TaskStatus
  completion_percentage?: number
  start_date?: string
  due_date?: string
  estimated_hours?: number
  actual_hours?: number
  notes?: string
  metadata?: Record<string, any>
}

export interface CreateMilestoneInput {
  project_id: string | number
  milestone_name: string
  milestone_order?: number
  description?: string
  planned_start_date?: string
  planned_end_date?: string
  actual_start_date?: string
  actual_end_date?: string
  estimated_cost?: number
  actual_cost?: number
  currency?: string
  status?: MilestoneStatus
  completion_percentage?: number
  notes?: string
  completion_notes?: string
  metadata?: Record<string, any>
}

export interface UpdateMilestoneInput {
  milestone_name?: string
  milestone_order?: number
  description?: string
  planned_start_date?: string
  planned_end_date?: string
  actual_start_date?: string
  actual_end_date?: string
  estimated_cost?: number
  actual_cost?: number
  currency?: string
  status?: MilestoneStatus
  completion_percentage?: number
  progress?: number
  completed_at?: string
  completedDate?: string
  notes?: string
  completion_notes?: string
  metadata?: Record<string, any>
}

export interface TaskFilterParams {
  project_id?: string
  site_id?: string
  unit_id?: string
  milestone_id?: string
  assigned_to?: string
  status?: TaskStatus
  priority?: TaskPriority
  overdue_only?: boolean
  search?: string
  sort_by?: string
  sort_direction?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

export interface TaskStatistics {
  total: number
  pending: number
  in_progress: number
  completed: number
  blocked: number
  cancelled: number
  overdue: number
  urgent: number
  high: number
}
