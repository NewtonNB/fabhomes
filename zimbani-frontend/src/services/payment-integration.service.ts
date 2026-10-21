import axios from 'axios'
import {
  PaymentGatewayConfig,
  PaymentIntent,
  PaymentStatistics,
  CreatePaymentIntentPayload,
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
}

export default paymentIntegrationService
