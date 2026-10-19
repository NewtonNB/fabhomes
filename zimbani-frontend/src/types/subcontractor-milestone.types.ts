// Subcontractor Milestone Valuation & Interim Payment Linkages Types
// Fab Homes ZIMBANI Platform (Phase 8 Day 3)

import { RefMilestone } from './milestone-release.types'
import { SubcontractorContract } from './contract.types'

export type ContractMilestoneStatus =
  | 'pending'
  | 'in_progress'
  | 'under_review'
  | 'certified'
  | 'completed'

export interface ContractMilestone {
  id: number
  uuid: string
  contract_id: number
  milestone_id: number
  allocated_amount: number
  weight_percentage: number | null
  start_date: string | null
  due_date: string | null
  status: ContractMilestoneStatus
  certified_amount: number
  paid_amount: number
  notes: string | null
  remaining_to_certify: number
  percentage_certified: number
  created_at: string
  updated_at: string

  // Relationships
  contract?: SubcontractorContract
  milestone?: RefMilestone
}

export interface ContractMilestoneAllocationItem {
  milestone_id: number
  allocated_amount: number
  weight_percentage?: number | null
  start_date?: string | null
  due_date?: string | null
  notes?: string | null
}

export interface AllocateMilestonesPayload {
  milestones: ContractMilestoneAllocationItem[]
}

export interface GenerateCertificateFromMilestonePayload {
  contract_id: number | string
  certified_amount?: number
  materials_on_site_value?: number
  other_deductions?: number
  measurement_summary?: string
  valuation_period_start?: string
  valuation_period_end?: string
}

export interface GenerateRetentionReleasePayload {
  notes?: string
}

export interface ContractMilestoneProgress {
  contract_id: number
  contract_number: string
  contract_title: string
  subcontractor_name: string
  contract_sum: number
  currency: string
  total_allocated: number
  total_certified: number
  total_paid: number
  remaining_balance: number
  retention_held: number
  retention_released: number
  percentage_certified: number
  milestones_count: number
  milestones_completed_count: number
  milestones: ContractMilestone[]
}

export interface MatrixContractDetail {
  contract_milestone_id: number
  contract_id: number
  contract_number: string
  contract_title: string
  subcontractor_name: string
  trade_category: string
  allocated_amount: number
  weight_percentage: number | null
  status: ContractMilestoneStatus
  certified_amount: number
  paid_amount: number
  percentage_certified: number
  certificates_count: number
  certificates: Array<{
    id: number
    uuid: string
    certificate_number: string
    certificate_type: string
    status: string
    gross_amount: number
    net_certified_amount: number
    retention_deducted: number
    withholding_tax_amount: number
    created_at: string
  }>
}

export interface ProjectMilestoneMatrixItem {
  milestone_id: number
  milestone_order: number
  milestone_name: string
  milestone_code: string | null
  completion_percentage: number
  status: string
  target_date: string | null
  actual_date: string | null
  allocated_subcontractors: MatrixContractDetail[]
  totals: {
    allocated_sum: number
    certified_amount: number
    paid_amount: number
    subcontractors_count: number
  }
}

export interface ProjectMilestoneMatrix {
  project_id: number
  project_name: string
  milestones: ProjectMilestoneMatrixItem[]
  summary: {
    total_milestones: number
    total_subcontractors: number
    total_allocated_sum: number
    total_certified_gross: number
    total_retention_held: number
  }
}
