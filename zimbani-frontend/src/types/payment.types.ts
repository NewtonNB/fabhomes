// Payment Types for Fab Homes

export type PaymentType =
  | 'deposit'
  | 'installment'
  | 'full_payment'
  | 'balance'
  | 'booking_fee'
  | 'penalty'
  | 'refund'

export type PaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'check'
  | 'mobile_money'
  | 'card'
  | 'other'

export type PaymentStatus =
  | 'pending'
  | 'confirmed'
  | 'verified'
  | 'rejected'
  | 'refunded'
  | 'cancelled'

export interface PaymentClient {
  uuid: string
  client_number: string
  full_name: string
  email: string | null
  phone_primary: string
}

export interface PaymentUnit {
  uuid: string
  unit_number: string
  type: string
}

export interface PaymentUser {
  id: number
  name: string
  email: string
}

export interface Payment {
  id: number
  uuid: string
  payment_number: string
  reference_number: string | null
  
  // Relations
  unit?: PaymentUnit
  client?: PaymentClient
  processed_by?: PaymentUser | null
  confirmed_by?: PaymentUser | null
  
  // Classification
  payment_type: PaymentType
  payment_method: PaymentMethod
  status: PaymentStatus
  
  // Financial info
  amount: number
  currency: string
  penalty_amount: number
  discount_amount: number
  total_amount: number
  
  // Booleans
  has_penalty: boolean
  has_discount: boolean
  is_confirmed: boolean
  is_verified: boolean
  is_pending: boolean
  is_overdue: boolean
  
  // Dates
  payment_date: string
  due_date: string | null
  confirmed_at_date: string | null
  days_overdue: number | null
  
  // Bank & Transaction
  bank_name: string | null
  bank_account: string | null
  transaction_id: string | null
  check_number: string | null
  mobile_money_number: string | null
  
  // Additional info
  notes: string | null
  receipt_path: string | null
  metadata: Record<string, any> | null
  
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface PaymentFormData {
  unit_id: string // unit uuid
  client_id: string // client uuid
  payment_type: PaymentType
  payment_method: PaymentMethod
  amount: number
  currency?: string
  penalty_amount?: number
  discount_amount?: number
  payment_date: string
  due_date?: string
  reference_number?: string
  bank_name?: string
  bank_account?: string
  transaction_id?: string
  check_number?: string
  mobile_money_number?: string
  notes?: string
}

export interface PaymentFilters {
  search?: string
  unit_id?: string
  client_id?: string
  payment_type?: string
  payment_method?: string
  status?: string
  from_date?: string
  to_date?: string
  overdue_only?: boolean
  pending_only?: boolean
  confirmed_only?: boolean
  sort_by?: string
  sort_direction?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

export interface PaymentStatistics {
  total_payments: number
  pending_payments: number
  confirmed_payments: number
  verified_payments: number
  rejected_payments: number
  refunded_payments: number
  overdue_payments: number
  by_type: Record<string, number>
  by_method: Record<string, number>
  total_amount: number
  pending_amount: number
  confirmed_amount: number
  recent_payments: Payment[]
}
