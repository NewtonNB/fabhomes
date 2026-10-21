export interface PaymentGatewayConfig {
  id: number
  uuid: string
  name: 'flutterwave' | 'pesapal' | 'mtn_momo' | 'airtel_money' | 'bank_transfer'
  display_name: string
  provider_type: 'aggregator' | 'telco' | 'bank'
  is_active: boolean
  is_default: boolean
  environment: 'sandbox' | 'production'
  public_key?: string
  merchant_id?: string
  api_endpoint?: string
  supported_currencies: string[]
  supported_methods: ('card' | 'mobile_money' | 'bank_transfer')[]
  transaction_fee_percentage: number
  flat_fee: number
  min_transaction_amount: number
  max_transaction_amount: number
  display_order: number
  instructions?: string
}

export interface PaymentIntent {
  id: number
  uuid: string
  intent_reference: string
  client_id?: number
  client?: {
    id: number
    uuid: string
    first_name: string
    last_name: string
    email?: string
    phone_primary?: string
  }
  user_id?: number
  project_id?: number
  project?: {
    id: number
    uuid: string
    name: string
    code: string
  }
  unit_id?: number
  savings_account_id?: number
  milestone_savings_pool_id?: number
  payment_id?: number
  gateway_name: string
  payment_method: string
  amount: number
  currency: string
  fee_amount: number
  total_charge_amount: number
  client_phone?: string
  client_email?: string
  client_name?: string
  status:
    | 'requires_payment_method'
    | 'requires_action'
    | 'processing'
    | 'succeeded'
    | 'failed'
    | 'cancelled'
    | 'expired'
  gateway_reference?: string
  gateway_checkout_url?: string
  gateway_response?: Record<string, any>
  failure_reason?: string
  expires_at?: string
  succeeded_at?: string
  failed_at?: string
  created_at: string
}

export interface PaymentStatistics {
  total_volume: number
  total_fees: number
  successful_transactions_count: number
  failed_transactions_count: number
  pending_transactions_count: number
  success_rate_percentage: number
  by_payment_method: Record<string, { count: number; volume: number }>
  by_gateway: Record<string, { count: number; volume: number }>
}

export interface CreatePaymentIntentPayload {
  amount: number
  currency?: string
  gateway_name?: string
  payment_method?: string
  client_id?: number
  project_id?: number
  unit_id?: number
  savings_account_id?: number
  milestone_savings_pool_id?: number
  client_phone?: string
  client_email?: string
  client_name?: string
  metadata?: Record<string, any>
}
