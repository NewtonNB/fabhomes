export type MobileMoneyProvider = 'mtn_momo' | 'airtel_money' | 'mock_gateway'
export type MobileMoneyTxType = 'c2b_collection' | 'b2c_disbursement'
export type MobileMoneyTxStatus = 'pending' | 'processing' | 'successful' | 'failed' | 'reversed'
export type MobileMoneyPurpose =
  | 'savings_deposit'
  | 'construction_milestone'
  | 'installment'
  | 'contractor_payout'
  | 'petty_cash_float'
  | 'labor_wage'
  | 'refund'
  | 'other'

export interface MobileMoneyGateway {
  id: number
  uuid: string
  provider: MobileMoneyProvider
  account_name: string
  merchant_code?: string
  environment: 'sandbox' | 'production'
  currency: string
  daily_disbursement_limit: number
  current_daily_disbursed: number
  is_active: boolean
  last_sync_at?: string
  created_at: string
  updated_at: string
}

export interface MobileMoneyTransaction {
  id: number
  uuid: string
  transaction_reference: string
  external_reference?: string
  provider: MobileMoneyProvider
  transaction_type: MobileMoneyTxType
  status: MobileMoneyTxStatus
  phone_number: string
  payer_or_payee_name?: string
  amount: number
  currency: string
  fee_amount: number
  net_amount: number
  purpose: MobileMoneyPurpose
  failure_reason?: string
  metadata?: Record<string, any>
  callback_payload?: Record<string, any>
  client_id?: number
  client?: {
    id: number
    uuid: string
    name?: string
    first_name?: string
    last_name?: string
    phone_number?: string
  }
  savings_account_id?: number
  savings_account?: {
    id: number
    uuid: string
    account_number: string
    scheme_name?: string
    account_type?: string
  }
  milestone_savings_pool_id?: number
  milestone_savings_pool?: {
    id: number
    uuid: string
    milestone_name: string
    tier_order: number
  }
  payment_id?: number
  payment?: {
    id: number
    uuid: string
    payment_number: string
    status: string
  }
  payment_certificate_id?: number
  petty_cash_account_id?: number
  ledger_transaction_id?: number
  initiated_by?: number
  initiator?: {
    id: number
    name: string
    email: string
  }
  initiated_at: string
  completed_at?: string
  created_at: string
  updated_at: string
}

export interface PaymentWebhookLog {
  id: number
  uuid: string
  provider: string
  event_type?: string
  external_reference?: string
  ip_address?: string
  headers?: Record<string, any>
  payload?: Record<string, any>
  status: 'received' | 'processed' | 'failed' | 'ignored'
  error_message?: string
  processed_at?: string
  created_at: string
}

export interface MobileMoneyStats {
  total_collected: number
  total_disbursed: number
  net_cash_flow: number
  total_transactions: number
  successful_transactions: number
  failed_transactions: number
  pending_transactions: number
  success_rate: number
  collections_by_provider: {
    mtn_momo: number
    airtel_money: number
    [key: string]: number
  }
  disbursements_by_provider: {
    mtn_momo: number
    airtel_money: number
    [key: string]: number
  }
}

export interface StkPushPayload {
  phone_number: string
  amount: number
  currency?: string
  provider?: MobileMoneyProvider
  client_id?: number
  savings_account_id?: number
  milestone_savings_pool_id?: number
  notes?: string
}

export interface DisbursementPayload {
  phone_number: string
  payee_name: string
  amount: number
  currency?: string
  provider?: MobileMoneyProvider
  purpose: MobileMoneyPurpose
  petty_cash_account_id?: number
  payment_certificate_id?: number
  milestone_savings_pool_id?: number
  notes?: string
}

export interface SimulateWebhookPayload {
  transaction_reference: string
  status: 'SUCCESSFUL' | 'FAILED'
  failure_reason?: string
}
