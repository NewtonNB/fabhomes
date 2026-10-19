// Milestone-Based Payment Release & Construction Verification Types for Fab Homes ZIMBANI Platform

export type VerificationStage =
  | 'draft'
  | 'submitted'
  | 'engineer_verified'
  | 'qs_verified'
  | 'client_approved'
  | 'rejected'

export type WorkQualityRating =
  | 'exceptional'
  | 'satisfactory'
  | 'defects_noted'
  | 'rejected'

export type BoqComplianceStatus =
  | 'fully_compliant'
  | 'minor_variations'
  | 'non_compliant'

export type ClientApprovalStatus =
  | 'pending'
  | 'approved'
  | 'disputed'
  | 'waived_by_admin'

export type ReleaseStatus =
  | 'pending_authorization'
  | 'authorized'
  | 'disbursed'
  | 'rejected'
  | 'reversed'

export type ReleaseSourceType =
  | 'savings_escrow'
  | 'unit_installment'
  | 'project_operations'

export type ReleasePaymentMethod =
  | 'internal_transfer'
  | 'bank_transfer'
  | 'mobile_money'
  | 'cheque'

export interface RefProject {
  id: number
  uuid: string
  name: string
  code?: string
}

export interface RefSite {
  id: number
  uuid: string
  name: string
  code?: string
}

export interface RefUnit {
  id: number
  uuid: string
  unit_number: string
  name?: string
  current_price?: number
  amount_paid?: number
  balance?: number
}

export interface RefMilestone {
  id: number
  uuid: string
  milestone_name: string
  milestone_order: number
  status: string
  completion_percentage: number
}

export interface RefClient {
  id: number
  name: string
  email?: string
  phone?: string
}

export interface RefUser {
  id: number
  name: string
  first_name?: string
  last_name?: string
  email?: string
}

export interface MilestonePaymentRelease {
  id: number
  uuid: string
  release_number: string
  milestone_verification_id: number
  milestone_id: number
  project_id: number
  site_id?: number | null
  unit_id?: number | null
  client_id?: number | null
  savings_account_id?: number | null
  source_type: ReleaseSourceType
  gross_amount: number
  retention_percentage: number
  retention_amount: number
  net_release_amount: number
  currency: string
  status: ReleaseStatus
  authorized_by?: number | null
  authorized_at?: string | null
  authorization_notes?: string | null
  disbursed_by?: number | null
  disbursed_at?: string | null
  payment_method?: ReleasePaymentMethod | null
  disbursement_reference?: string | null
  transaction_id?: number | null
  payment_id?: number | null
  retention_released_at?: string | null
  retention_released_by?: number | null
  retention_transaction_id?: number | null
  retention_notes?: string | null
  notes?: string | null
  rejection_reason?: string | null
  created_at: string
  updated_at: string
  milestone?: RefMilestone
  project?: RefProject
  site?: RefSite | null
  unit?: RefUnit | null
  client?: RefClient | null
  authorized_by_user?: RefUser | null
  disbursed_by_user?: RefUser | null
}

export interface MilestoneVerification {
  id: number
  uuid: string
  verification_number: string
  milestone_id: number
  project_id: number
  site_id?: number | null
  unit_id?: number | null
  client_id?: number | null
  title: string
  stage: VerificationStage
  physical_completion_percentage: number
  work_quality_rating: WorkQualityRating
  inspection_date?: string | null
  inspection_notes?: string | null
  site_engineer_id?: number | null
  engineer_signed_at?: string | null
  structural_checks_passed: boolean
  engineer_notes?: string | null
  quantity_surveyor_id?: number | null
  qs_signed_at?: string | null
  qs_certified_amount: number
  boq_compliance_status: BoqComplianceStatus
  qs_notes?: string | null
  client_user_id?: number | null
  client_signed_at?: string | null
  client_approval_status: ClientApprovalStatus
  client_feedback?: string | null
  rejection_reason?: string | null
  auto_release_triggered?: boolean
  auto_release_status?: string | null
  created_at: string
  updated_at: string
  milestone?: RefMilestone
  project?: RefProject
  site?: RefSite | null
  unit?: RefUnit | null
  client?: RefClient | null
  site_engineer?: RefUser | null
  quantity_surveyor?: RefUser | null
  payment_releases?: MilestonePaymentRelease[]
}

export interface CreateVerificationPayload {
  milestone_id: string | number
  project_id: string | number
  site_id?: string | number | null
  unit_id?: string | number | null
  title: string
  physical_completion_percentage: number
  work_quality_rating?: WorkQualityRating
  inspection_date?: string
  inspection_notes?: string
}

export interface SiteEngineerSignOffPayload {
  structural_checks_passed: boolean
  physical_completion_percentage?: number
  work_quality_rating?: WorkQualityRating
  inspection_date?: string
  engineer_notes: string
}

export interface QsSignOffPayload {
  qs_certified_amount: number
  boq_compliance_status: BoqComplianceStatus
  retention_percentage?: number
  qs_notes: string
}

export interface ClientApprovePayload {
  status: 'approved' | 'disputed' | 'waived_by_admin'
  client_feedback?: string
}

export interface DisburseReleasePayload {
  payment_method: ReleasePaymentMethod
  disbursement_reference: string
}

export interface ReleaseRetentionPayload {
  notes: string
}

export interface MilestoneVerificationFilters {
  project_id?: string
  unit_id?: string
  milestone_id?: string
  stage?: VerificationStage | ''
  search?: string
  page?: number
  per_page?: number
}

export interface MilestoneReleaseFilters {
  project_id?: string
  unit_id?: string
  status?: ReleaseStatus | ''
  source_type?: ReleaseSourceType | ''
  search?: string
  page?: number
  per_page?: number
}

export interface MilestoneReleaseStatistics {
  total_verifications: number
  submitted_verifications: number
  engineer_verified_count: number
  qs_verified_count: number
  client_approved_count: number
  total_gross_certified: number
  total_disbursed: number
  pending_release_amount: number
  total_retention_held: number
  total_retention_released: number
  currency: string
}
