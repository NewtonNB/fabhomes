// Subcontractor Contracts Types for Fab Homes ZIMBANI Platform

export type TradeCategory =
  | 'masonry'
  | 'electrical'
  | 'plumbing'
  | 'roofing'
  | 'painting'
  | 'steelwork'
  | 'carpentry'
  | 'tiling'
  | 'landscaping'
  | 'earthworks'
  | 'other'

export type ContractStatus = 'draft' | 'active' | 'suspended' | 'completed' | 'terminated'

export interface ContractRefProject {
  id: number
  uuid: string
  name: string
  code?: string
}

export interface ContractRefSite {
  id: number
  uuid: string
  name: string
  code?: string
}

export interface ContractRefUser {
  id: number
  uuid?: string
  name: string
  email?: string
}

export interface SubcontractorContract {
  id: number
  uuid: string
  contract_number: string
  title: string
  subcontractor_name: string
  subcontractor_contact_person?: string | null
  subcontractor_phone: string
  subcontractor_email?: string | null
  tax_identification_number?: string | null
  project_id: number
  site_id: number
  trade_category: TradeCategory
  scope_of_work: string
  contract_sum: number
  currency: string
  retention_percentage: number
  retention_amount: number
  start_date: string
  expected_completion_date: string
  actual_completion_date?: string | null
  payment_terms?: string | null
  status: ContractStatus
  signed_at?: string | null
  signed_by?: number | null
  approved_at?: string | null
  approved_by?: number | null
  notes?: string | null
  created_by?: number
  created_at: string
  updated_at: string

  // Relationships
  project?: ContractRefProject
  site?: ContractRefSite
  signed_by_user?: ContractRefUser
  approved_by_user?: ContractRefUser
  created_by_user?: ContractRefUser
  payment_certificates?: any[]

  // Aggregated Financial Metrics
  total_certified_gross: number
  total_retention_held: number
  total_net_payable: number
  total_paid: number
  remaining_balance: number
  percentage_completed: number
}

export interface CreateContractPayload {
  project_id: string | number
  site_id: string | number
  title: string
  subcontractor_name: string
  subcontractor_contact_person?: string
  subcontractor_phone: string
  subcontractor_email?: string
  tax_identification_number?: string
  trade_category: TradeCategory
  scope_of_work: string
  contract_sum: number
  currency?: string
  retention_percentage?: number
  start_date: string
  expected_completion_date: string
  payment_terms?: string
  notes?: string
}

export interface UpdateContractPayload {
  project_id?: string | number
  site_id?: string | number
  title?: string
  subcontractor_name?: string
  subcontractor_contact_person?: string
  subcontractor_phone?: string
  subcontractor_email?: string
  tax_identification_number?: string
  trade_category?: TradeCategory
  scope_of_work?: string
  contract_sum?: number
  currency?: string
  retention_percentage?: number
  start_date?: string
  expected_completion_date?: string
  payment_terms?: string
  notes?: string
}

export interface ContractFilters {
  project_id?: string
  site_id?: string
  trade_category?: TradeCategory | ''
  status?: ContractStatus | ''
  search?: string
  page?: number
  per_page?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface ContractStatistics {
  total_contracts: number
  draft_count: number
  active_count: number
  completed_count: number
  suspended_count: number
  terminated_count: number
  total_contract_sum: number
  total_retention_budgeted: number
  total_certified_gross: number
  total_retention_held: number
  total_net_payable: number
  total_paid: number
  overall_balance_remaining: number
}
