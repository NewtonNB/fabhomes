// Cost-Code Budget Types for Fab Homes ZIMBANI Platform

export type BudgetCostCategory =
  | 'subcontractor'
  | 'materials'
  | 'equipment'
  | 'labour'
  | 'direct_purchasing'
  | 'permits_legal'
  | 'contingency'
  | 'other'

export interface BudgetRefProject {
  id: number
  uuid: string
  name: string
  code?: string
  budget?: number
  currency?: string
}

export interface BudgetRefSite {
  id: number
  uuid: string
  name: string
  code?: string
}

export interface BudgetRefUser {
  id: number
  first_name?: string
  last_name?: string
  name?: string
  email?: string
}

export interface ProjectBudget {
  id: number
  uuid: string
  project_id: number
  site_id?: number | null
  budget_code: string
  name: string
  cost_category: BudgetCostCategory
  allocated_amount: number
  currency: string
  notes?: string | null
  created_by?: number | null
  updated_by?: number | null
  created_at: string
  updated_at: string
  project?: BudgetRefProject
  site?: BudgetRefSite | null
  created_by_user?: BudgetRefUser | null
}

export interface ProjectBudgetFilters {
  project_id?: string
  site_id?: string
  cost_category?: BudgetCostCategory | ''
  search?: string
}

export interface CreateBudgetPayload {
  project_id: string | number
  site_id?: string | number | null
  budget_code: string
  name: string
  cost_category: BudgetCostCategory
  allocated_amount: number
  notes?: string
}

export interface UpdateBudgetPayload {
  name?: string
  cost_category?: BudgetCostCategory
  allocated_amount?: number
  notes?: string
}

export interface StandardCostCodeTemplate {
  budget_code: string
  name: string
  cost_category: BudgetCostCategory
  percentage: number
}
