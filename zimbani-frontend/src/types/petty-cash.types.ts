// Petty Cash Float Ledger Types for Fab Homes ZIMBANI Platform

export type PettyCashAccountStatus = 'active' | 'suspended' | 'closed'

export type PettyCashTransactionType =
  | 'initial_allocation'
  | 'replenishment'
  | 'expense_disbursement'
  | 'return_of_funds'

export interface PettyCashRefProject {
  id: number
  uuid: string
  name: string
  code?: string
}

export interface PettyCashRefSite {
  id: number
  uuid: string
  name: string
  code?: string
}

export interface PettyCashRefUser {
  id: number
  uuid?: string
  name: string
  email?: string
}

export interface PettyCashTransaction {
  id: number
  uuid: string
  transaction_number: string
  petty_cash_account_id: number
  transaction_type: PettyCashTransactionType
  amount: number
  balance_before: number
  balance_after: number
  currency: string
  expense_claim_id?: number | null
  reference_number?: string | null
  description: string
  notes?: string | null
  created_by?: number | null
  created_by_user?: PettyCashRefUser | null
  created_at: string
}

export interface PettyCashAccount {
  id: number
  uuid: string
  account_number: string
  name: string
  project_id: number
  project?: PettyCashRefProject
  site_id: number
  site?: PettyCashRefSite
  custodian_id: number
  custodian?: PettyCashRefUser
  float_limit: number
  current_balance: number
  currency: string
  status: PettyCashAccountStatus
  utilization_rate: number
  notes?: string | null
  created_by?: number | null
  created_by_user?: PettyCashRefUser | null
  transactions?: PettyCashTransaction[]
  expense_claims?: unknown[]
  documents?: unknown[]
  created_at: string
  updated_at: string
}

export interface PettyCashFilters {
  project_id?: string
  site_id?: string
  custodian_id?: string
  status?: string
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

export interface CreatePettyCashPayload {
  name: string
  project_id: string | number
  site_id: string | number
  custodian_id: string | number
  float_limit: number
  initial_balance?: number
  currency?: string
  notes?: string
}

export interface UpdatePettyCashPayload {
  name?: string
  custodian_id?: string | number
  float_limit?: number
  status?: PettyCashAccountStatus
  notes?: string
}

export interface TopUpPettyCashPayload {
  amount: number
  description: string
  reference_number?: string
}

export interface ReturnFundsPettyCashPayload {
  amount: number
  reason: string
  reference_number?: string
}

export interface PettyCashStatistics {
  total_accounts: number
  active_accounts: number
  total_float_limit: number
  total_current_balance: number
  total_disbursed_this_month: number
  low_balance_accounts_count: number
}
