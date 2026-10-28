export type OtherFeeStatus = 'pending' | 'partial' | 'paid' | 'waived' | 'cancelled'

export type PaymentMethod = 'cash' | 'mtn_momo' | 'airtel_money' | 'bank_transfer' | 'cheque'

export interface OtherFeeCategory {
  id: number
  uuid: string
  code: string
  name: string
  description?: string
  standard_amount: number
  is_mandatory: boolean
  is_active: boolean
}

export interface OtherFee {
  id: number
  uuid: string
  fee_number: string
  client_id: number
  category_code: string
  category_name: string
  site_id?: number
  unit_id?: number
  savings_account_id?: number
  title: string
  description?: string
  amount: number
  amount_paid: number
  balance_due: number
  status: OtherFeeStatus
  due_date?: string
  paid_at?: string
  payment_method?: PaymentMethod
  payment_reference?: string
  receipt_number?: string
  recorded_by?: number
  approved_by?: number
  waiver_reason?: string
  notes?: string
  created_at: string
  updated_at: string
  client?: {
    id: number
    uuid: string
    client_number: string
    first_name: string
    last_name: string
    phone_primary?: string
    phone_secondary?: string
    email?: string
    nin?: string
    physical_address?: string
  }
  site?: {
    id: number
    uuid: string
    name: string
    code?: string
  }
  unit?: {
    id: number
    uuid: string
    unit_number: string
    block_number?: string
  }
  savings_account?: {
    id: number
    uuid: string
    account_number: string
    scheme_name: string
  }
  recorded_by_user?: {
    id: number
    name: string
  }
}

export interface OtherFeeFormData {
  client_id: number | string
  category_code: string
  title: string
  amount: number
  due_date?: string
  description?: string
  site_id?: number | ''
  unit_id?: number | ''
  savings_account_id?: number | ''
  notes?: string
}

export interface OtherFeePaymentFormData {
  payment_amount: number
  payment_method: PaymentMethod
  payment_reference?: string
  payment_date?: string
  notes?: string
}

export interface OtherFeeStatistics {
  total_billed: number
  total_collected: number
  total_pending: number
  total_waived: number
  count_all: number
  count_pending: number
  count_partial: number
  count_paid: number
  count_waived: number
}
