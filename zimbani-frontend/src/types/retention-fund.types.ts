export type RetentionFundStatus =
  | 'accumulating'
  | 'dlp_active'
  | 'partially_released'
  | 'eligible_for_release'
  | 'fully_released'

export type BeneficiaryType = 'subcontractor' | 'developer' | 'client'
export type FundType = 'subcontractor_contract' | 'client_milestone' | 'general_project'

export type DefectCertificateType =
  | 'practical_completion'
  | 'defect_clearance'
  | 'final_handover'
  | 'retention_release'

export type DefectCertificateStatus = 'draft' | 'pending_signatures' | 'issued' | 'revoked'

export type RetentionTransactionType =
  | 'withholding'
  | 'rectification_deduction'
  | 'interim_release'
  | 'final_release'

export interface RetentionTransaction {
  id: number
  uuid: string
  retention_fund_id: number
  defect_liability_certificate_id?: number | null
  payment_certificate_id?: number | null
  milestone_payment_release_id?: number | null
  ledger_transaction_id?: number | null
  transaction_type: RetentionTransactionType
  amount: number
  balance_before: number
  balance_after: number
  reference_number: string
  description?: string | null
  processed_by?: number | null
  processed_at?: string | null
  created_at: string
  updated_at: string
}

export interface DefectLiabilityCertificate {
  id: number
  uuid: string
  certificate_number: string
  certificate_type: DefectCertificateType
  project_id: number
  unit_id?: number | null
  contract_id?: number | null
  client_id?: number | null
  retention_fund_id?: number | null
  commencement_date: string
  maturity_date?: string | null
  retention_pool_amount: number
  deductions_amount: number
  net_release_amount: number
  currency: string
  open_snags_count: number
  resolved_snags_count: number
  qs_signed_by?: number | null
  qs_signed_at?: string | null
  engineer_signed_by?: number | null
  engineer_signed_at?: string | null
  client_signed_at?: string | null
  status: DefectCertificateStatus
  inspection_notes?: string | null
  certificate_notes?: string | null
  created_at: string
  updated_at: string
  // Linked relations
  project?: {
    id: number
    name: string
    code?: string
  }
  contract?: {
    id: number
    contract_number: string
    subcontractor_name: string
  }
  unit?: {
    id: number
    unit_number: string
  }
  client?: {
    id: number
    name: string
  }
  retention_fund?: RetentionFund
  qs_user?: {
    id: number
    name: string
    email: string
  }
  engineer_user?: {
    id: number
    name: string
    email: string
  }
}

export interface RetentionFund {
  id: number
  uuid: string
  fund_number: string
  project_id: number
  unit_id?: number | null
  contract_id?: number | null
  client_id?: number | null
  beneficiary_type: BeneficiaryType
  beneficiary_name: string
  fund_type: FundType
  total_withheld_amount: number
  total_deductions_amount: number
  total_released_amount: number
  current_balance: number
  currency: string
  retention_rate: number
  status: RetentionFundStatus
  practical_completion_date?: string | null
  dlp_commenced_at?: string | null
  dlp_expiry_date?: string | null
  dlp_period_days: number
  eligible_for_release: boolean
  cleared_for_release_at?: string | null
  cleared_by?: number | null
  notes?: string | null
  created_at: string
  updated_at: string
  // Computed accessors
  days_remaining_in_dlp: number
  is_dlp_matured: boolean
  release_rate_percentage: number
  // Relations
  project?: {
    id: number
    name: string
    code?: string
  }
  unit?: {
    id: number
    unit_number: string
  }
  contract?: {
    id: number
    contract_number: string
    subcontractor_name: string
    trade?: string
  }
  client?: {
    id: number
    name: string
  }
  transactions?: RetentionTransaction[]
  certificates?: DefectLiabilityCertificate[]
}

export interface RetentionPortfolioStats {
  currency: string
  total_withheld: number
  total_deductions: number
  total_released: number
  total_held_balance: number
  active_funds_count: number
  matured_ready_count: number
  overall_release_rate: number
}

export interface SnagAuditSummary {
  project_id?: number
  unit_id?: number | null
  contract_id?: number | null
  subcontractor_name?: string
  total_snags: number
  open_snags: number
  rectified_snags: number
  verified_closed_snags: number
  all_cleared: boolean
}

export interface MaturityScheduleItem {
  id: number
  uuid: string
  fund_number: string
  beneficiary_name: string
  beneficiary_type: BeneficiaryType
  currency: string
  current_balance: number
  total_withheld: number
  dlp_commenced_at?: string | null
  dlp_expiry_date?: string | null
  dlp_period_days: number
  days_remaining: number
  is_matured: boolean
  eligible_for_release: boolean
  status: RetentionFundStatus
  open_snags_count: number
  resolved_snags_count: number
}

export interface RetentionFundFilters {
  project_id?: number | string
  contract_id?: number | string
  client_id?: number | string
  status?: RetentionFundStatus | string
  beneficiary_type?: BeneficiaryType | string
  eligible_only?: boolean | number
  search?: string
  page?: number
  per_page?: number
}

export interface DefectCertificateFilters {
  project_id?: number | string
  contract_id?: number | string
  certificate_type?: DefectCertificateType | string
  status?: DefectCertificateStatus | string
  page?: number
  per_page?: number
}

export interface CreatePracticalCompletionPayload {
  certificate_type: 'practical_completion'
  retention_fund_id: number
  commencement_date?: string
  dlp_period_days?: number
  release_percentage?: number
  inspection_notes?: string
  certificate_notes?: string
}

export interface CreateDefectClearancePayload {
  certificate_type: 'defect_clearance'
  retention_fund_id: number
  inspection_notes?: string
  certificate_notes?: string
}

export interface CreateFinalReleasePayload {
  certificate_type: 'retention_release' | 'final_handover'
  retention_fund_id: number
  release_amount?: number
  inspection_notes?: string
  certificate_notes?: string
}

export interface RectificationDeductionPayload {
  amount: number
  reason: string
  rectification_notes?: string
}

export interface ReleaseRetentionPayload {
  amount?: number
  release_type: 'interim_release' | 'final_release'
  notes?: string
}
