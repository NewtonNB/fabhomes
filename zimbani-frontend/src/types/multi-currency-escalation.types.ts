export interface FxExchangeRate {
  id: number
  uuid: string
  base_currency: string
  target_currency: string
  spot_rate: number
  buy_rate: number
  sell_rate: number
  source: string
  rate_date: string
  is_active: boolean
  created_at: string
}

export interface FxConversionResult {
  original_amount: number
  from_currency: string
  to_currency: string
  converted_amount: number
  exchange_rate: number
  rate_date: string
}

export interface FxHedgingContract {
  id: number
  uuid: string
  contract_number: string
  client_id: number
  client?: {
    id: number
    uuid: string
    first_name: string
    last_name: string
    email?: string
    phone_number?: string
  }
  savings_account_id?: number
  savings_account?: {
    id: number
    uuid: string
    account_number: string
    current_balance: number
  }
  milestone_savings_pool_id?: number
  milestone_savings_pool?: {
    id: number
    uuid: string
    milestone_name: string
    tier_order: number
    allocated_amount: number
    target_amount: number
  }
  base_currency: string
  target_currency: string
  locked_exchange_rate: number
  committed_amount_foreign: number
  guaranteed_amount_local: number
  utilized_amount_foreign: number
  utilized_amount_local: number
  remaining_foreign_amount: number
  remaining_local_amount: number
  utilization_percentage: number
  effective_date: string
  expiry_date: string
  is_expired: boolean
  status: 'active' | 'fully_utilized' | 'expired' | 'cancelled'
  premium_fee_percentage: number
  premium_fee_amount: number
  notes?: string
  created_at: string
}

export interface MaterialPriceRecord {
  id: number
  uuid: string
  material_price_index_id: number
  item_code: string
  item_name: string
  unit_of_measure: string
  basket_weight_percentage: number
  base_unit_price: number
  current_unit_price: number
  price_variance_percentage: number
  currency: string
  survey_source?: string
  effective_date: string
  created_at: string
}

export interface MaterialPriceIndex {
  id: number
  uuid: string
  index_code: string
  name: string
  description?: string
  project_type: 'residential' | 'commercial' | 'infrastructure' | 'mixed_use'
  base_period: string
  base_index_value: number
  current_index_value: number
  escalation_percentage: number
  tolerance_threshold_percentage: number
  is_tolerance_exceeded: boolean
  is_active: boolean
  last_calculated_at?: string
  price_records?: MaterialPriceRecord[]
  created_at: string
}

export interface BoqEscalationResult {
  initial_boq_amount: number
  base_index_value: number
  current_index_value: number
  escalation_percentage: number
  adjusted_contract_sum: number
  price_adjustment_amount: number
  is_tolerance_exceeded: boolean
  recommended_client_buffer: number
  advisory_notes: string
}

export interface MultiCurrencyStatistics {
  exchange_rates: {
    usd_ugx: number
    gbp_ugx: number
    eur_ugx: number
    kes_ugx: number
  }
  hedging_metrics: {
    active_contracts_count: number
    total_committed_usd: number
    total_guaranteed_ugx: number
    total_utilized_ugx: number
    hedged_coverage_percentage: number
  }
  escalation_metrics: {
    index_code: string
    current_index: number
    escalation_percentage: number
    tolerance_threshold: number
    is_alert_triggered: boolean
  }
}

export interface CreateHedgingContractPayload {
  client_id: number
  savings_account_id?: number
  milestone_savings_pool_id?: number
  base_currency: string
  target_currency?: string
  committed_amount_foreign: number
  locked_exchange_rate?: number
  lock_duration_days?: number
  premium_fee_percentage?: number
  notes?: string
}

export interface DrawdownHedgingPayload {
  amount_foreign: number
  notes?: string
}

export interface UpdateMaterialPricePayload {
  item_code: string
  new_price: number
  survey_source?: string
}
