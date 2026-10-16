// Expense Claims & Direct Purchasing Types for Fab Homes ZIMBANI Platform

export type ExpenseClaimType =
  | 'petty_cash_reimbursement'
  | 'direct_site_purchase'
  | 'travel_mileage'
  | 'emergency_materials'
  | 'site_utilities'
  | 'other'

export type ExpenseCategory =
  | 'materials'
  | 'fuel_oil'
  | 'tools_hardware'
  | 'transport'
  | 'labour_welfare'
  | 'equipment_hire'
  | 'statutory_permits'
  | 'office_admin'
  | 'other'

export type ExpensePaymentMethod =
  | 'petty_cash'
  | 'bank_transfer'
  | 'mobile_money'
  | 'cash'
  | 'company_card'

export type ExpenseClaimStatus =
  | 'draft'
  | 'submitted'
  | 'verified_by_site_manager'
  | 'approved_by_finance'
  | 'authorized_by_admin'
  | 'reimbursed'
  | 'rejected'

export interface ExpenseItem {
  id?: number
  uuid?: string
  expense_claim_id?: number
  item_description: string
  expense_category?: ExpenseCategory
  quantity: number
  unit_of_measure: string
  unit_price: number
  total_price: number
  receipt_reference?: string | null
  created_at?: string
}

export interface ExpenseRefProject {
  id: number
  uuid: string
  name: string
  code?: string
}

export interface ExpenseRefSite {
  id: number
  uuid: string
  name: string
  code?: string
}

export interface ExpenseRefUser {
  id: number
  uuid?: string
  name: string
  email?: string
}

export interface ExpenseRefAccount {
  id: number
  uuid: string
  account_number: string
  name: string
  current_balance: number
  currency: string
}

export interface ExpenseClaim {
  id: number
  uuid: string
  claim_number: string
  claimant_id: number
  claimant?: ExpenseRefUser
  petty_cash_account_id?: number | null
  petty_cash_account?: ExpenseRefAccount | null
  project_id: number
  project?: ExpenseRefProject
  site_id: number
  site?: ExpenseRefSite
  claim_type: ExpenseClaimType
  expense_category: ExpenseCategory
  title: string
  expense_date: string
  total_amount: number
  currency: string
  payment_method: ExpensePaymentMethod
  vendor_name?: string | null
  vendor_tin?: string | null
  receipt_number?: string | null
  description?: string | null
  status: ExpenseClaimStatus
  
  // Multi-tier sign-off audit
  site_manager_id?: number | null
  site_manager?: ExpenseRefUser | null
  site_manager_signed_at?: string | null
  site_manager_notes?: string | null

  finance_officer_id?: number | null
  finance_officer?: ExpenseRefUser | null
  finance_officer_approved_at?: string | null
  finance_officer_notes?: string | null

  admin_id?: number | null
  admin?: ExpenseRefUser | null
  admin_authorized_at?: string | null
  admin_notes?: string | null

  paid_by?: number | null
  paid_by_user?: ExpenseRefUser | null
  paid_at?: string | null
  payment_reference?: string | null
  rejection_reason?: string | null

  items?: ExpenseItem[]
  documents?: unknown[]
  created_at: string
  updated_at: string
}

export interface ExpenseClaimFilters {
  project_id?: string
  site_id?: string
  petty_cash_account_id?: string
  claimant_id?: string
  claim_type?: string
  expense_category?: string
  status?: string
  payment_method?: string
  date_from?: string
  date_to?: string
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

export interface CreateExpenseClaimPayload {
  claimant_id?: string | number
  petty_cash_account_id?: string | number
  project_id: string | number
  site_id: string | number
  claim_type: ExpenseClaimType
  expense_category: ExpenseCategory
  title: string
  expense_date: string
  payment_method: ExpensePaymentMethod
  vendor_name?: string
  vendor_tin?: string
  receipt_number?: string
  description?: string
  items: Array<{
    item_description: string
    expense_category?: ExpenseCategory
    quantity: number
    unit_of_measure: string
    unit_price: number
    receipt_reference?: string
  }>
}

export interface UpdateExpenseClaimPayload {
  petty_cash_account_id?: string | number
  project_id?: string | number
  site_id?: string | number
  claim_type?: ExpenseClaimType
  expense_category?: ExpenseCategory
  title?: string
  expense_date?: string
  payment_method?: ExpensePaymentMethod
  vendor_name?: string
  vendor_tin?: string
  receipt_number?: string
  description?: string
  items?: Array<{
    item_description: string
    expense_category?: ExpenseCategory
    quantity: number
    unit_of_measure: string
    unit_price: number
    receipt_reference?: string
  }>
}

export interface VerifyClaimPayload {
  notes?: string
}

export interface ApproveClaimPayload {
  notes?: string
}

export interface AuthorizeClaimPayload {
  notes?: string
}

export interface ReimburseClaimPayload {
  payment_reference?: string
  payment_method?: ExpensePaymentMethod
  petty_cash_account_id?: string | number
  notes?: string
}

export interface RejectClaimPayload {
  reason: string
}

export interface ExpenseCategoryBreakdown {
  count: number
  total: number
}

export interface ExpenseStatistics {
  total_claims: number
  total_amount_claimed: number
  total_amount_reimbursed: number
  pending_verification: number
  pending_finance_approval: number
  pending_admin_authorization: number
  pending_reimbursement: number
  by_category: Record<string, ExpenseCategoryBreakdown>
}
