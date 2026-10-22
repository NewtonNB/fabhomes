import axios from 'axios'
import {
  PaymentGatewayConfig,
  PaymentIntent,
  PaymentStatistics,
  CreatePaymentIntentPayload,
  PaymentWebhookLog,
  WebhookMetrics,
  PaymentRefund,
  PaymentDispute,
  RefundsDisputesStatistics,
  CreateRefundPayload,
  OpenDisputePayload,
  SubmitEvidencePayload,
  ResolveDisputePayload,
} from '../types/payment-integration.types'

const API_BASE = '/api/v1'

export const paymentIntegrationService = {
  // Get all active payment gateways
  async getGateways(): Promise<PaymentGatewayConfig[]> {
    const response = await axios.get(`${API_BASE}/payment-gateways`)
    return response.data.data
  },

  // Get global payment statistics
  async getStatistics(): Promise<PaymentStatistics> {
    const response = await axios.get(`${API_BASE}/payment-gateways/statistics`)
    return response.data.data
  },

  // List payment intents
  async getPaymentIntents(params?: {
    status?: string
    gateway_name?: string
    client_id?: number
    per_page?: number
  }): Promise<{ data: PaymentIntent[]; meta: any }> {
    const response = await axios.get(`${API_BASE}/payment-intents`, { params })
    return response.data
  },

  // Get single intent
  async getPaymentIntent(identifier: string | number): Promise<PaymentIntent> {
    const response = await axios.get(`${API_BASE}/payment-intents/${identifier}`)
    return response.data.data
  },

  // Create payment intent session
  async createPaymentIntent(payload: CreatePaymentIntentPayload): Promise<PaymentIntent> {
    const response = await axios.post(`${API_BASE}/payment-intents`, payload)
    return response.data.data
  },

  // Confirm payment intent
  async confirmPaymentIntent(
    identifier: string | number,
    data?: Record<string, any>
  ): Promise<PaymentIntent> {
    const response = await axios.post(`${API_BASE}/payment-intents/${identifier}/confirm`, data || {})
    return response.data.data
  },

  // Cancel payment intent
  async cancelPaymentIntent(
    identifier: string | number,
    reason?: string
  ): Promise<PaymentIntent> {
    const response = await axios.post(`${API_BASE}/payment-intents/${identifier}/cancel`, { reason })
    return response.data.data
  },

  // Get webhook telemetry stream logs
  async getWebhookLogs(params?: {
    provider?: string
    status?: string
    signature_valid?: boolean
    search?: string
    per_page?: number
  }): Promise<{ data: PaymentWebhookLog[]; meta: any }> {
    const response = await axios.get(`${API_BASE}/payment-webhooks/logs`, { params })
    return response.data
  },

  // Get real-time webhook ingestion metrics
  async getWebhookMetrics(): Promise<WebhookMetrics> {
    const response = await axios.get(`${API_BASE}/payment-webhooks/metrics`)
    return response.data.data
  },

  // Retry a dead-letter / failed webhook
  async retryWebhook(id: number): Promise<{ success: boolean; message: string }> {
    const response = await axios.post(`${API_BASE}/payment-webhooks/logs/${id}/retry`)
    return response.data
  },

  // --- Refunds & Disputes Ledger (Phase 10 Day 3) ---

  // Get refunds & disputes aggregate statistics
  async getRefundsDisputesStatistics(): Promise<RefundsDisputesStatistics> {
    const response = await axios.get(`${API_BASE}/payment-refunds-disputes/statistics`)
    return response.data.data
  },

  // Get refunds list
  async getRefunds(params?: {
    status?: string
    reason_category?: string
    client_id?: number
    payment_id?: number
    search?: string
    per_page?: number
  }): Promise<{ data: PaymentRefund[]; meta: any }> {
    const response = await axios.get(`${API_BASE}/payment-refunds`, { params })
    return response.data
  },

  // Get single refund details
  async getRefund(identifier: string | number): Promise<PaymentRefund> {
    const response = await axios.get(`${API_BASE}/payment-refunds/${identifier}`)
    return response.data.data
  },

  // Request new refund
  async requestRefund(payload: CreateRefundPayload): Promise<PaymentRefund> {
    const response = await axios.post(`${API_BASE}/payment-refunds`, payload)
    return response.data.data
  },

  // Approve refund request
  async approveRefund(identifier: string | number, autoExecute: boolean = true): Promise<PaymentRefund> {
    const response = await axios.post(`${API_BASE}/payment-refunds/${identifier}/approve`, {
      auto_execute: autoExecute,
    })
    return response.data.data
  },

  // Reject refund request
  async rejectRefund(identifier: string | number, rejectionReason: string): Promise<PaymentRefund> {
    const response = await axios.post(`${API_BASE}/payment-refunds/${identifier}/reject`, {
      rejection_reason: rejectionReason,
    })
    return response.data.data
  },

  // Execute approved refund
  async executeRefund(identifier: string | number): Promise<PaymentRefund> {
    const response = await axios.post(`${API_BASE}/payment-refunds/${identifier}/execute`)
    return response.data.data
  },

  // Get disputes list
  async getDisputes(params?: {
    status?: string
    dispute_source?: string
    client_id?: number
    payment_id?: number
    search?: string
    per_page?: number
  }): Promise<{ data: PaymentDispute[]; meta: any }> {
    const response = await axios.get(`${API_BASE}/payment-disputes`, { params })
    return response.data
  },

  // Get single dispute details
  async getDispute(identifier: string | number): Promise<PaymentDispute> {
    const response = await axios.get(`${API_BASE}/payment-disputes/${identifier}`)
    return response.data.data
  },

  // Open new dispute
  async openDispute(payload: OpenDisputePayload): Promise<PaymentDispute> {
    const response = await axios.post(`${API_BASE}/payment-disputes`, payload)
    return response.data.data
  },

  // Submit dispute evidence
  async submitDisputeEvidence(
    identifier: string | number,
    payload: SubmitEvidencePayload
  ): Promise<PaymentDispute> {
    const response = await axios.post(`${API_BASE}/payment-disputes/${identifier}/evidence`, payload)
    return response.data.data
  },

  // Resolve dispute
  async resolveDispute(
    identifier: string | number,
    payload: ResolveDisputePayload
  ): Promise<PaymentDispute> {
    const response = await axios.post(`${API_BASE}/payment-disputes/${identifier}/resolve`, payload)
    return response.data.data
  },
}

export default paymentIntegrationService
