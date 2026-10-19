// Escrow Account Reconciliation & Automated Milestone Trigger Types for Fab Homes ZIMBANI Platform

import { RefProject, RefUser, MilestonePaymentRelease, MilestoneVerification } from './milestone-release.types'

export type ReconciliationStatus =
  | 'draft'
  | 'in_progress'
  | 'reconciled'
  | 'approved'
  | 'rejected'

export type ReconciliationItemType =
  | 'deposit'
  | 'milestone_release'
  | 'bank_fee'
  | 'interest'
  | 'adjustment'

export type ReconciliationItemStatus =
  | 'matched'
  | 'unmatched'
  | 'variance'
  | 'resolved'

export type TriggerEvent =
  | 'verification_approved'
  | 'shortfall_detected'
  | 'release_debited'
  | 'manual_retry'

export type TriggerStatus =
  | 'success'
  | 'shortfall'
  | 'failed'
  | 'skipped'

export interface RefSavingsAccount {
  id: number
  uuid: string
  account_number: string
  account_name: string
  current_balance: number
  currency: string
  status?: string
}

export interface EscrowReconciliationItem {
  id: number
  uuid: string
  escrow_reconciliation_id: number
  transaction_id?: number | null
  milestone_payment_release_id?: number | null
  item_type: ReconciliationItemType
  external_reference: string
  external_date: string
  statement_amount: number
  ledger_amount: number
  variance: number
  status: ReconciliationItemStatus
  notes?: string | null
  resolved_by?: number | null
  resolved_at?: string | null
  created_at: string
  updated_at: string
  transaction?: any | null
  payment_release?: MilestonePaymentRelease | null
  resolved_by_user?: RefUser | null
}

export interface EscrowReconciliation {
  id: number
  uuid: string
  reconciliation_number: string
  savings_account_id: number
  project_id: number
  institution_name: string
  statement_date: string
  statement_balance: number
  book_balance: number
  variance_amount: number
  currency: string
  matched_items_count: number
  unmatched_items_count: number
  status: ReconciliationStatus
  notes?: string | null
  reconciled_by?: number | null
  reconciled_at?: string | null
  approved_by?: number | null
  approved_at?: string | null
  is_balanced?: boolean
  match_rate_percentage?: number
  created_at: string
  updated_at: string
  savings_account?: RefSavingsAccount | null
  project?: RefProject | null
  reconciled_by_user?: RefUser | null
  approved_by_user?: RefUser | null
  items?: EscrowReconciliationItem[]
}

export interface MilestoneTriggerLog {
  id: number
  uuid: string
  milestone_verification_id: number
  milestone_payment_release_id?: number | null
  savings_account_id: number
  trigger_event: TriggerEvent
  status: TriggerStatus
  escrow_balance: number
  required_amount: number
  shortfall_amount: number
  details?: Record<string, any> | null
  triggered_by?: number | null
  created_at: string
  updated_at: string
  milestone_verification?: MilestoneVerification | null
  payment_release?: MilestonePaymentRelease | null
  savings_account?: RefSavingsAccount | null
  triggered_by_user?: RefUser | null
}

export interface ShortfallAlert {
  verification_id: number
  verification_number: string
  milestone_name: string
  project_name: string
  client_name: string
  certified_amount: number
  account_number: string
  escrow_balance: number
  shortfall_amount: number
  currency: string
  auto_release_status: string
  last_checked_at: string
}

export interface AccountEscrowSummary {
  account_id: number
  account_number: string
  account_name: string
  current_balance: number
  currency: string
  reconciliations: EscrowReconciliation[]
}

export interface ProjectEscrowSummary {
  project_id: number
  project_name: string
  total_escrow_balance: number
  reconciliations_count: number
  last_reconciliation_date: string | null
  open_variances_count: number
}

export interface CreateReconciliationItemPayload {
  item_type: ReconciliationItemType
  external_reference: string
  external_date: string
  statement_amount: number
  notes?: string
}

export interface CreateReconciliationPayload {
  savings_account_id: number
  project_id: number
  institution_name: string
  statement_date: string
  statement_balance: number
  notes?: string
  statement_items?: CreateReconciliationItemPayload[]
}

export interface ResolveItemPayload {
  status: 'matched' | 'resolved'
  notes: string
  matched_transaction_id?: number
}

export interface EscrowReconciliationFilters {
  savings_account_id?: number | string
  project_id?: number | string
  status?: ReconciliationStatus | ''
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
}

export interface MilestoneTriggerLogFilters {
  verification_id?: number | string
  savings_account_id?: number | string
  status?: TriggerStatus | ''
  trigger_event?: TriggerEvent | ''
  page?: number
  per_page?: number
}
