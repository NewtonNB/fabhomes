// Financial Reporting & Cost Accounting Types for Fab Homes ZIMBANI Platform

export interface ExecutiveFinancialSummary {
  total_budget: number
  total_actual_costs_incurred: number
  total_subcontractor_costs: number
  total_direct_expenses: number
  total_inflows: number
  savings_inflows: number
  unit_sales_inflows: number
  net_gross_margin: number
  gross_margin_percentage: number
  committed_pipeline_outflows: number
  cash_runway_months: number
  active_projects_count: number
  unpaid_certificates_count: number
  currency: string
}

export type CostVarianceStatus = 'on_track' | 'warning' | 'over_budget'

export interface CostCodeVariance {
  budget_code: string
  name: string
  cost_category: string
  allocated_amount: number
  actual_incurred_amount: number
  variance_amount: number
  variance_percentage: number
  status: CostVarianceStatus
}

export interface BudgetVarianceReport {
  project_id?: number | null
  site_id?: number | null
  total_allocated_budget: number
  total_actual_costs: number
  total_variance: number
  overall_variance_percentage: number
  over_budget_count: number
  on_track_count: number
  cost_codes: CostCodeVariance[]
}

export interface ProjectProfitabilityItem {
  project_id: number
  project_uuid: string
  project_name: string
  project_budget: number
  inflows: {
    client_savings: number
    unit_sales: number
    total_inflows: number
  }
  outflows: {
    subcontractor_certified: number
    direct_expenses: number
    total_outflows: number
  }
  gross_margin: number
  gross_margin_percentage: number
  units: {
    total_units: number
    sold_units: number
    reserved_units: number
    available_units: number
  }
  per_unit: {
    average_revenue: number
    average_cost: number
    average_profit: number
  }
}

export interface ProfitabilityReport {
  total_portfolio_revenue: number
  total_portfolio_costs: number
  portfolio_gross_margin: number
  portfolio_margin_percentage: number
  projects: ProjectProfitabilityItem[]
}

export interface CashFlowBucket {
  label: string
  period_days: string
  inflows: number
  outflows: number
  net: number
}

export interface CommitmentRunwayItem {
  id: string
  type: 'subcontractor_certificate' | 'expense_claim' | 'retention_release' | 'expected_savings_deposit'
  description: string
  amount: number
  due_date: string
  status: string
}

export interface CashFlowForecast {
  horizon_days: number
  summary: {
    total_projected_inflows: number
    total_projected_outflows: number
    net_projected_cash_flow: number
    currency: string
  }
  buckets: {
    bucket_30_days: CashFlowBucket
    bucket_60_days: CashFlowBucket
    bucket_90_days: CashFlowBucket
  }
  commitments_runway: CommitmentRunwayItem[]
}

export interface ComplianceAuditReport {
  statutory_tax_compliance: {
    total_certified_gross: number
    total_withholding_tax_6pct_held: number
    total_retention_fund_5pct_held: number
    tax_compliance_status: string
    notes: string
  }
  governance_sign_off_integrity: {
    total_certificates_audited: number
    fully_signed_off_certificates: number
    pending_sign_off_certificates: number
    governance_status: string
  }
  site_petty_cash_health: {
    active_petty_cash_accounts: number
    total_approved_limits: number
    total_current_balances: number
    accounts_near_or_below_reorder: number
    float_risk_status: string
  }
}


// Phase 11 Executive BI Analytics & Reporting Types
export interface FinancialSummaryFilters {
  date_from?: string
  date_to?: string
  group_by?: 'day' | 'week' | 'month'
  account_type?: string
  gateway?: string
}

export interface FinancialSummaryReport {
  period: {
    from: string
    to: string
    group_by: string
  }
  summary: {
    total_revenue: number
    net_revenue: number
    total_transactions: number
    average_transaction_value: number
    unique_clients: number
    total_gateway_fees: number
    total_refunded: number
    fee_refunded: number
    currency: string
  }
  by_account_type: Record<
    string,
    {
      revenue: number
      transactions: number
      clients: number
    }
  >
  by_payment_method: Record<
    string,
    {
      revenue: number
      transactions: number
      percentage_of_volume: number
    }
  >
  time_series_breakdown: {
    date: string
    revenue: number
    transactions: number
  }[]
}

export interface CashFlowBreakdownReport {
  period: {
    from: string
    to: string
  }
  inflows: {
    total: number
    breakdown: Record<string, number>
  }
  outflows: {
    total: number
    breakdown: Record<string, number>
  }
  net_operating_cash_flow: number
  liquidity_velocity_ratio: number
  currency: string
}

export interface ExecutiveKpis {
  month_to_date_revenue: number
  year_to_date_revenue: number
  savings_under_management: number
  retention_warranty_reserves: number
  active_clients_count: number
  dispute_win_rate_percentage: number
  currency: string
  computed_at: string
}
