// Payment Certificates & Valuations Types for Fab Homes ZIMBANI Platform

import { SubcontractorContract, ContractRefProject, ContractRefSite, ContractRefUser } from './contract.types'

export type CertificateType = 'interim' | 'practical_completion' | 'final' | 'retention_release'

export type CertificateStatus =
  | 'draft'
  | 'submitted'
  | 'verified_by_site_manager'
  | 'approved_by_finance'
  | 'authorized_by_admin'
  | 'paid'
  | 'rejected'

export interface PaymentCertificate {
  id: number
  uuid: string
  certificate_number: string
  contract_id: number
  project_id: number
  site_id: number
  valuation_period_start: string
  valuation_period_end: string
  valuation_date: string
  certificate_type: CertificateType
  gross_amount: number
  previous_gross_amount: number
  current_gross_amount: number
  materials_on_site_value: number
  retention_rate: number
  retention_deducted: number
  withholding_tax_rate: number
  withholding_tax_amount: number
  other_deductions: number
  net_certified_amount: number
  currency: string
  description: string
  measurement_sheet_summary?: string | null
  status: CertificateStatus

  // Multi-tier Sign-off Details
  site_manager_id?: number | null
  site_manager_signed_at?: string | null
  site_manager_notes?: string | null

  finance_officer_id?: number | null
  finance_officer_approved_at?: string | null
  finance_officer_notes?: string | null

  admin_id?: number | null
  admin_authorized_at?: string | null
  admin_notes?: string | null

  paid_at?: string | null
  paid_by?: number | null
  payment_reference?: string | null
  rejection_reason?: string | null

  created_by?: number
  created_at: string
  updated_at: string

  // Relationships
  contract?: SubcontractorContract
  project?: ContractRefProject
  site?: ContractRefSite
  site_manager?: ContractRefUser
  finance_officer?: ContractRefUser
  admin?: ContractRefUser
  paid_by_user?: ContractRefUser
  created_by_user?: ContractRefUser
  documents?: any[]
}

export interface CreateCertificatePayload {
  contract_id: string | number
  project_id?: string | number
  site_id?: string | number
  valuation_period_start: string
  valuation_period_end: string
  valuation_date: string
  certificate_type: CertificateType
  gross_amount: number
  previous_gross_amount?: number
  materials_on_site_value?: number
  retention_rate?: number
  withholding_tax_rate?: number
  other_deductions?: number
  currency?: string
  description: string
  measurement_sheet_summary?: string
}

export interface UpdateCertificatePayload {
  valuation_period_start?: string
  valuation_period_end?: string
  valuation_date?: string
  certificate_type?: CertificateType
  gross_amount?: number
  previous_gross_amount?: number
  materials_on_site_value?: number
  retention_rate?: number
  withholding_tax_rate?: number
  other_deductions?: number
  currency?: string
  description?: string
  measurement_sheet_summary?: string
}

export interface VerifyCertificatePayload {
  notes?: string
}

export interface ApproveCertificatePayload {
  notes?: string
}

export interface AuthorizeCertificatePayload {
  notes?: string
}

export interface PayCertificatePayload {
  payment_reference: string
  notes?: string
}

export interface RejectCertificatePayload {
  rejection_reason: string
}

export interface CertificateFilters {
  contract_id?: string
  project_id?: string
  site_id?: string
  status?: CertificateStatus | ''
  certificate_type?: CertificateType | ''
  search?: string
  page?: number
  per_page?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface CertificateStatistics {
  total_certificates: number
  draft_count: number
  submitted_count: number
  verified_count: number
  approved_count: number
  authorized_count: number
  paid_count: number
  rejected_count: number
  total_gross_certified: number
  total_retention_deducted: number
  total_wht_deducted: number
  total_net_certified: number
  total_paid_amount: number
  pending_payout: number
}
