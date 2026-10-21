export interface ProjectHandover {
  id: number
  uuid: string
  handover_number: string
  project_id: number
  project?: {
    id: number
    uuid: string
    name: string
    code: string
    status: string
    completion_percentage: number
    budget: number
    currency: string
  }
  unit_id?: number
  unit?: {
    id: number
    uuid: string
    unit_number: string
    name: string
    status: string
  }
  client_id: number
  client?: {
    id: number
    uuid: string
    first_name: string
    last_name: string
    email?: string
    phone_primary?: string
  }
  company_id?: number
  handover_title: string
  status:
    | 'draft'
    | 'snags_pending'
    | 'dossier_review'
    | 'client_review'
    | 'approved_by_client'
    | 'keys_released'
    | 'closed'

  // Milestone Clearance
  substructure_cleared: boolean
  superstructure_cleared: boolean
  roofing_cleared: boolean
  mep_cleared: boolean
  finishes_cleared: boolean
  all_milestones_verified: boolean

  // Punch list clearance
  total_snags_logged: number
  total_snags_resolved: number
  critical_snags_pending: number
  snags_cleared: boolean

  // Dossier Checklist
  has_occupancy_permit: boolean
  occupancy_permit_ref?: string
  occupancy_permit_issued_at?: string
  has_as_built_drawings: boolean
  as_built_drawings_ref?: string
  has_mep_compliance_certs: boolean
  mep_compliance_notes?: string
  has_warranty_manual: boolean
  has_keys_inventory: boolean
  key_sets_count: number

  // Signoff & Keys
  lead_architect_signed_by?: number
  lead_architect_signed_at?: string
  project_director_signed_by?: number
  project_director_signed_at?: string
  client_signed_at?: string
  client_signature_name?: string
  client_signature_hash?: string
  client_signoff_ip?: string
  keys_released_at?: string
  keys_received_by_name?: string
  dlp_start_date?: string
  dlp_end_date?: string
  dlp_period_days: number
  handover_notes?: string

  // Appends
  readiness_percentage: number
  dlp_days_remaining: number
  is_dlp_active: boolean
  created_at: string
}

export interface ProjectFinalSettlement {
  id: number
  uuid: string
  settlement_number: string
  project_id: number
  project?: {
    id: number
    uuid: string
    name: string
    code: string
  }
  unit_id?: number
  client_id: number
  client?: {
    id: number
    uuid: string
    first_name: string
    last_name: string
  }
  project_handover_id?: number
  handover?: ProjectHandover
  currency: string
  original_contract_sum: number
  approved_variations_amount: number
  material_escalation_amount: number
  adjusted_contract_sum: number
  total_escrow_inflows: number
  total_subcontractor_paid: number
  total_direct_expenses_paid: number
  total_disbursements_paid: number
  retention_withheld_total: number
  retention_released_completion: number
  retention_held_dlp: number
  diaspora_fx_hedging_savings: number
  gross_project_profit: number
  profit_margin_percentage: number
  final_settlement_balance: number
  settlement_direction: 'balanced' | 'client_payable' | 'client_refund'
  status: 'draft' | 'audited' | 'client_confirmed' | 'final_settled' | 'disputed'
  audited_by?: number
  audited_at?: string
  client_approved_at?: string
  final_settled_at?: string
  settlement_notes?: string
  ledger_snapshot?: Record<string, any>
  created_at: string
}

export interface CapstoneSummaryMetrics {
  total_handovers_completed: number
  active_dlp_warranties: number
  total_escrow_settled: number
  total_retention_held_dlp: number
  total_diaspora_fx_savings: number
  total_gross_profit: number
  average_readiness_score: number
}

export interface UpdateDossierPayload {
  has_occupancy_permit?: boolean
  occupancy_permit_ref?: string
  occupancy_permit_issued_at?: string
  has_as_built_drawings?: boolean
  as_built_drawings_ref?: string
  has_mep_compliance_certs?: boolean
  mep_compliance_notes?: string
  has_warranty_manual?: boolean
  has_keys_inventory?: boolean
  key_sets_count?: number
  handover_notes?: string
  project_director_signed?: boolean
}

export interface ClientSignoffPayload {
  client_signature_name: string
  keys_received_by_name?: string
  key_sets_count?: number
  dlp_period_days?: number
  notes?: string
}
