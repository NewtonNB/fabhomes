export type ProjectType = 'residential' | 'commercial' | 'mixed_use' | 'infrastructure'

export type MilestonePoolStatus =
  | 'unfunded'
  | 'partially_funded'
  | 'fully_funded'
  | 'locked'
  | 'partially_disbursed'
  | 'fully_disbursed'

export type PoolAllocationType =
  | 'deposit_allocation'
  | 'manual_rebalance'
  | 'escrow_lock'
  | 'milestone_disbursement'
  | 'refund_unlock'

export interface MilestoneTemplateItem {
  tier_order: number
  name: string
  weight_percentage: number
  description?: string
}

export interface ConstructionSavingScheme {
  id: number
  uuid: string
  scheme_code: string
  name: string
  description?: string | null
  project_type: ProjectType
  currency: string
  standard_target_amount: number
  minimum_initial_deposit: number
  minimum_milestone_threshold_percentage: number
  waterfall_auto_allocation: boolean
  is_active: boolean
  milestone_template?: MilestoneTemplateItem[] | null
  created_at: string
  updated_at: string
  savings_accounts_count?: number
  created_by_user?: {
    id: number
    name: string
    email: string
  }
}

export interface SavingsPoolAllocation {
  id: number
  uuid: string
  savings_account_id: number
  milestone_savings_pool_id: number
  payment_id?: number | null
  milestone_payment_release_id?: number | null
  source_pool_id?: number | null
  allocation_type: PoolAllocationType
  amount: number
  balance_before: number
  balance_after: number
  reference_number: string
  notes?: string | null
  allocated_by?: number | null
  created_at: string
  updated_at: string
}

export interface MilestoneSavingsPool {
  id: number
  uuid: string
  pool_code: string
  savings_account_id: number
  project_id?: number | null
  construction_milestone_id?: number | null
  tier_order: number
  milestone_name: string
  description?: string | null
  target_amount: number
  allocated_amount: number
  locked_amount: number
  disbursed_amount: number
  currency: string
  weight_percentage: number
  status: MilestonePoolStatus
  funded_at?: string | null
  commenced_at?: string | null
  completed_at?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
  // Computed accessors
  funding_percentage: number
  remaining_to_target: number
  available_to_lock: number
  can_commence_work: boolean
  // Relations
  construction_milestone?: {
    id: number
    milestone_name: string
    status: string
    completion_percentage: number
  }
  allocations?: SavingsPoolAllocation[]
}

export interface AccountReadinessAudit {
  account_number: string
  scheme_name: string
  scheme_code?: string
  currency: string
  total_target: number
  total_saved: number
  overall_progress_percentage: number
  total_allocated: number
  unallocated_balance: number
  total_locked: number
  total_disbursed: number
  pools_count: number
  funded_pools_count: number
  active_milestone_pool?: {
    id: number
    uuid: string
    tier_order: number
    milestone_name: string
    locked_amount: number
    disbursed_amount: number
  } | null
  next_milestone_pool?: {
    id: number
    uuid: string
    tier_order: number
    milestone_name: string
    target_amount: number
    allocated_amount: number
    shortfall: number
    can_commence: boolean
    funding_percentage: number
  } | null
  waterfall_enabled: boolean
  pools: MilestoneSavingsPool[]
}

export interface CreateSchemePayload {
  name: string
  scheme_code?: string
  description?: string
  project_type?: ProjectType
  currency?: string
  standard_target_amount: number
  minimum_initial_deposit?: number
  minimum_milestone_threshold_percentage?: number
  waterfall_auto_allocation?: boolean
  is_active?: boolean
  milestone_template: MilestoneTemplateItem[]
}

export interface EnrollAccountPayload {
  scheme_id?: number
  scheme_uuid?: string
  project_id?: number
}

export interface AllocateDepositPayload {
  amount: number
  payment_id?: number
  mode?: 'waterfall' | 'custom'
  custom_allocations?: Record<number, number>
}

export interface RebalancePoolsPayload {
  from_pool_id: number
  to_pool_id: number
  amount: number
  reason: string
}

export interface LockPoolPayload {
  amount?: number
}
