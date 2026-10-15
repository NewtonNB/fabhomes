export type TransactionType =
  | 'payment'
  | 'adjustment'
  | 'reversal'
  | 'refund'
  | 'transfer'
  | 'withdrawal'

export type TransactionStatus = 'posted' | 'reversed' | 'pending' | 'failed'

export interface TransactionClient {
  id: number
  uuid: string
  full_name: string
  client_number: string
  phone_primary: string
}

export interface TransactionAccount {
  id: number
  uuid: string
  account_number: string
  scheme_name: string
  account_type: 'land_saving' | 'construction_saving'
  current_balance: number
  target_amount: number
  status: string
}

export interface TransactionPayment {
  id: number
  uuid: string
  payment_number: string
  payment_type: string
  payment_method: string
  status: string
  total_amount: number
}

export interface TransactionUser {
  id: number
  name: string
  email: string
}

export interface Transaction {
  id: number
  uuid: string
  transaction_number: string
  account_id?: number | null
  client_id: number
  payment_id?: number | null
  related_transaction_id?: number | null
  transaction_type: TransactionType
  amount: number
  currency: string
  balance_before: number
  balance_after: number
  description: string
  narration?: string | null
  reference_number?: string | null
  transaction_date: string
  value_date: string
  status: TransactionStatus
  is_credit: boolean
  is_debit: boolean
  is_reversed: boolean
  reversed_at?: string | null
  reversal_reason?: string | null

  // Nested Relations
  client?: TransactionClient
  savings_account?: TransactionAccount
  payment?: TransactionPayment
  related_transaction?: Transaction
  reversals?: Transaction[]
  created_by?: TransactionUser
  reversed_by?: TransactionUser
  documents?: any[]
  created_at: string
  updated_at: string
}

export interface TransactionFilters {
  client_id?: string | number
  account_id?: string | number
  payment_id?: string | number
  transaction_type?: string
  status?: string
  start_date?: string
  end_date?: string
  flow?: 'credit' | 'debit'
  search?: string
  page?: number
  per_page?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface CreateTransactionInput {
  client_id: string | number
  account_id?: string | number | null
  payment_id?: string | number | null
  transaction_type: TransactionType
  amount: number
  currency?: string
  description: string
  narration?: string
  reference_number?: string
  transaction_date?: string
  value_date?: string
}

export interface ReverseTransactionInput {
  reason: string
}

export interface TransactionStatistics {
  total_transactions: number
  total_inflow: number
  total_outflow: number
  net_movement: number
  total_reversals: number
  today_transactions: number
  today_volume: number
  breakdown_by_type: Array<{
    transaction_type: TransactionType
    count: number
    total_amount: string | number
  }>
}

export interface DiscrepancyAccount {
  id: number
  uuid: string
  account_number: string
  scheme_name: string
  first_name: string
  last_name: string
  stored_balance: string | number
  calculated_balance: string | number
  difference: string | number
}

export interface ReconciliationReport {
  total_accounts_checked: number
  matched_count: number
  discrepancy_count: number
  is_healthy: boolean
  discrepancies: DiscrepancyAccount[]
  verified_at: string
}
