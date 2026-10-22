// Client Portal Savings, Checkout & Milestone Trackers Types (Phase 12 Day 2)

export interface ClientSavingsAccount {
  id: number
  uuid: string
  account_number: string
  account_type: 'land_saving' | 'construction_saving'
  scheme_name: string
  target_amount: number
  current_balance: number
  remaining_amount: number
  progress_percentage: number
  currency: string
  status: 'active' | 'completed' | 'suspended' | 'closed'
  opened_date: string
  target_date?: string | null
  project?: {
    id: number
    uuid: string
    name: string
    code: string
  } | null
  plot?: {
    id: number
    uuid: string
    unit_number: string
    unit_type: string
    status: string
    price: number
  } | null
  recent_transactions?: ClientTransactionItem[]
}

export interface SavingsOverviewSummary {
  total_balance: number
  total_target: number
  total_remaining: number
  average_progress_pct: number
  total_accounts_count: number
  active_accounts_count: number
  completed_accounts_count: number
  by_type: {
    land_saving: {
      count: number
      balance: number
      target: number
    }
    construction_saving: {
      count: number
      balance: number
      target: number
    }
  }
}

export interface ClientTransactionItem {
  id: number
  uuid: string
  transaction_number: string
  account_id: number
  transaction_type: 'credit' | 'debit' | 'deposit' | 'withdrawal' | 'transfer'
  amount: number
  currency: string
  balance_before: number
  balance_after: number
  description: string
  narration?: string | null
  reference_number?: string | null
  transaction_date: string
  status: 'posted' | 'pending' | 'reversed'
}

export interface ClientSavingsOverviewResponse {
  summary: SavingsOverviewSummary
  accounts: ClientSavingsAccount[]
  recent_deposits: ClientTransactionItem[]
}

export interface InitiateDepositRequest {
  account_id: string | number
  amount: number
  gateway: 'mtn_momo' | 'airtel_money' | 'stanbic_bank' | 'flexipay'
  phone_number?: string
  narration?: string
}

export interface DepositIntentResponse {
  intent_id: number
  uuid: string
  intent_reference: string
  account: {
    id: number
    uuid: string
    account_number: string
    scheme_name: string
  }
  gateway: string
  amount: number
  currency: string
  client_phone: string
  status: string
  expires_at: string
  instructions: string
}

export interface DepositReceipt {
  payment_number: string
  transaction_number: string
  intent_reference: string
  amount: number
  currency: string
  gateway: string
  account_number: string
  scheme_name: string
  previous_balance: number
  new_balance: number
  target_amount: number
  progress_percentage: number
  status: string
  timestamp: string
}

export interface MilestoneProgressTracker {
  unit_id: number
  unit_uuid: string
  unit_number: string
  unit_name?: string | null
  unit_type: string
  unit_status: string
  project_name: string
  project_location: string
  total_milestones: number
  completed_milestones: number
  in_progress_milestones: number
  completion_pct: number
  current_milestone?: {
    id: number
    title: string
    milestone_order: number
    target_completion_date?: string | null
    status: string
  } | null
  latest_verification?: {
    uuid: string
    stage: string
    client_approval_status: string
    inspection_date: string
    qs_certified_amount: number
  } | null
}
