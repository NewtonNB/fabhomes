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
  ip_whitelist?: string[]
  enforce_ip_whitelist?: boolean
  enforce_signature?: boolean
  replay_window_seconds?: number
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

export interface PaymentWebhookLog {
  id: number
  uuid: string
  provider: string
  event_type?: string
  external_reference?: string
  headers?: Record<string, any>
  payload: Record<string, any>
  ip_address?: string
  status: 'received' | 'processed' | 'failed' | 'ignored'
  signature_valid: boolean
  signature_hash?: string
  payload_hash?: string
  is_replay: boolean
  ip_whitelisted: boolean
  processing_duration_ms: number
  retry_count: number
  max_retries: number
  next_retry_at?: string
  processing_error?: string
  payment_intent_id?: number
  payment_intent?: PaymentIntent
  processed_at?: string
  created_at: string
}

export interface WebhookMetrics {
  total_webhooks_received: number
  processed_count: number
  failed_count: number
  replay_attacks_blocked: number
  signature_rejections_count: number
  average_latency_ms: number
  success_rate_percentage: number
}
