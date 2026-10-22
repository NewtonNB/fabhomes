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

export interface PaymentRefund {
  id: number
  uuid: string
  refund_number: string
  payment_id: number
  payment_intent_id?: number
  client_id: number
  client?: {
    id: number
    uuid: string
    first_name: string
    last_name: string
    email?: string
    phone_primary?: string
  }
  payment?: {
    id: number
    payment_number: string
    amount: number
    currency: string
    status: string
  }
  savings_account_id?: number
  reversal_transaction_id?: number
  reversal_transaction?: {
    id: number
    transaction_number: string
    amount: number
    status: string
  }
  amount: number
  currency: string
  fee_refunded: number
  reason_category:
    | 'escrow_surplus'
    | 'duplicate_payment'
    | 'client_cancellation'
    | 'milestone_variation'
    | 'disputed_chargeback'
    | 'other'
  reason_description: string
  status: 'requested' | 'approved' | 'processing' | 'completed' | 'rejected'
  requested_by: number
  requested_by_user?: { id: number; name: string; email: string }
  approved_by?: number
  approved_by_user?: { id: number; name: string }
  approved_at?: string
  rejected_by?: number
  rejected_by_user?: { id: number; name: string }
  rejected_at?: string
  rejection_reason?: string
  processed_at?: string
  gateway_refund_reference?: string
  gateway_response?: Record<string, any>
  metadata?: Record<string, any>
  created_at: string
}

export interface DisputeEvidenceFile {
  title: string
  file_path: string
  file_type?: string
  submitted_at: string
  submitted_by?: string
  notes?: string
}

export interface PaymentDispute {
  id: number
  uuid: string
  dispute_number: string
  payment_id: number
  payment_intent_id?: number
  client_id: number
  client?: {
    id: number
    uuid: string
    first_name: string
    last_name: string
    email?: string
    phone_primary?: string
  }
  payment?: {
    id: number
    payment_number: string
    amount: number
    currency: string
    status: string
  }
  refund_id?: number
  refund?: PaymentRefund
  dispute_source: 'chargeback_visa_mc' | 'momo_fraud_claim' | 'client_portal_inquiry'
  disputed_amount: number
  currency: string
  reason: string
  evidence_deadline?: string
  status: 'opened' | 'evidence_submitted' | 'under_review' | 'won' | 'lost' | 'settled'
  evidence_files?: DisputeEvidenceFile[]
  resolution_notes?: string
  resolved_at?: string
  resolved_by?: number
  resolved_by_user?: { id: number; name: string }
  metadata?: Record<string, any>
  created_at: string
}

export interface RefundsDisputesStatistics {
  refunds: {
    total_count: number
    total_refunded_amount: number
    pending_approval_count: number
    approved_count: number
    rejected_count: number
    by_category: { reason_category: string; count: number; total_amount: number }[]
  }
  disputes: {
    total_count: number
    total_disputed_amount: number
    active_open_count: number
    won_count: number
    lost_count: number
    settled_count: number
    win_rate_percentage: number
    by_source: { dispute_source: string; count: number; total_amount: number }[]
  }
}

export interface CreateRefundPayload {
  payment_id: number | string
  amount: number
  currency?: string
  reason_category: string
  reason_description: string
  savings_account_id?: number
  fee_refunded?: number
  metadata?: Record<string, any>
}

export interface OpenDisputePayload {
  payment_id: number | string
  disputed_amount: number
  currency?: string
  dispute_source: string
  reason: string
  evidence_deadline?: string
  metadata?: Record<string, any>
}

export interface SubmitEvidencePayload {
  title: string
  file_path?: string
  file_type?: string
  notes?: string
}

export interface ResolveDisputePayload {
  resolution: 'won' | 'lost' | 'settled'
  resolution_notes?: string
  create_refund?: boolean
}
