// Savings Accounts & Scheme Enrolment Types for Fab Homes ZIMBANI Platform

export type AccountType = 'land_saving' | 'construction_saving'

export type AccountStatus = 'active' | 'suspended' | 'completed' | 'closed'

export interface SavingsAccountRefClient {
  id: number
  uuid: string
  name: string
  first_name?: string
  last_name?: string
  client_number: string
  phone?: string
  email?: string
}

export interface SavingsAccountRefPlot {
  id: number
  uuid: string
  unit_number: string
  block_number?: string | null
  floor_number?: number | null
  unit_type?: string
  current_price?: number
  status?: string
}

export interface SavingsAccountRefProject {
  id: number
  uuid: string
  name: string
  code?: string
}

export interface SavingsAccountRefUser {
  id: number
  uuid?: string
  name: string
  email?: string
}

export interface SavingsAccount {
  id: number
  uuid: string
  account_number: string
  account_type: AccountType
  scheme_name?: string | null
  target_amount: number
  current_balance: number
  remaining_amount: number
  progress_percentage: number
  currency: string
  status: AccountStatus
  opened_date: string
  target_date?: string | null
  closed_date?: string | null
  notes?: string | null

  // Computed state flags
  is_active: boolean
  is_completed: boolean
  is_suspended: boolean
  is_closed: boolean

  // Relations
  client?: SavingsAccountRefClient | null
  plot?: SavingsAccountRefPlot | null
  project?: SavingsAccountRefProject | null
  created_by?: SavingsAccountRefUser | null
  updated_by?: SavingsAccountRefUser | null
  payments_count?: number
  payments?: any[]
  documents?: any[]

  created_at: string
  updated_at: string
}

export interface SavingsAccountFilterParams {
  client_id?: string | number
  account_type?: string
  status?: string
  project_id?: string | number
  plot_id?: string | number
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

export interface CreateSavingsAccountInput {
  client_id: number | string
  account_type: AccountType
  scheme_name?: string
  target_amount: number
  currency?: string
  opened_date?: string
  target_date?: string
  plot_id?: number | string | null
  project_id?: number | string | null
  notes?: string
}

export interface UpdateSavingsAccountInput {
  account_type?: AccountType
  scheme_name?: string
  target_amount?: number
  status?: AccountStatus
  opened_date?: string
  target_date?: string
  closed_date?: string
  plot_id?: number | string | null
  project_id?: number | string | null
  notes?: string
}

export interface AdjustBalanceInput {
  adjustment_type: 'credit' | 'debit' | 'set_exact'
  amount: number
  reason: string
  notes?: string
}

export interface SavingsAccountStatistics {
  total_accounts: number
  active_accounts: number
  completed_accounts: number
  suspended_accounts: number
  closed_accounts: number
  total_balance_ugx: number
  total_target_ugx: number
  overall_progress_percentage: number
  land_savings: {
    count: number
    balance_ugx: number
  }
  construction_savings: {
    count: number
    balance_ugx: number
  }
}

export interface AccountStatementData {
  account: SavingsAccount
  total_deposited: number
  target_amount: number
  current_balance: number
  progress_percentage: number
  transactions_count: number
  recent_payments: any[]
}
