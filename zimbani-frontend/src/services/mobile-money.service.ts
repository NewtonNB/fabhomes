import api from '../config/api'
import {
  MobileMoneyTransaction,
  MobileMoneyGateway,
  PaymentWebhookLog,
  MobileMoneyStats,
  StkPushPayload,
  DisbursementPayload,
  SimulateWebhookPayload,
} from '../types/mobile-money.types'

class MobileMoneyService {
  /**
   * Fetch aggregate Mobile Money statistics
   */
  async getStatistics(): Promise<MobileMoneyStats> {
    const response = await api.get<{
      success: boolean
      data: MobileMoneyStats
    }>('/mobile-money/statistics')
    return response.data.data
  }

  /**
   * List Mobile Money transactions with search, provider, status, and pagination
   */
  async getTransactions(params?: {
    search?: string
    provider?: string
    transaction_type?: string
    status?: string
    purpose?: string
    page?: number
    per_page?: number
  }): Promise<{
    data: MobileMoneyTransaction[]
    total: number
    current_page: number
    last_page: number
  }> {
    const q = new URLSearchParams()
    if (params?.search) q.append('search', params.search)
    if (params?.provider) q.append('provider', params.provider)
    if (params?.transaction_type) q.append('transaction_type', params.transaction_type)
    if (params?.status) q.append('status', params.status)
    if (params?.purpose) q.append('purpose', params.purpose)
    if (params?.page) q.append('page', String(params.page))
    if (params?.per_page) q.append('per_page', String(params.per_page))

    const response = await api.get<{
      success: boolean
      data: {
        data: MobileMoneyTransaction[]
        total: number
        current_page: number
        last_page: number
      }
    }>(`/mobile-money/transactions?${q.toString()}`)

    return response.data.data
  }

  /**
   * Get single transaction details
   */
  async getTransaction(uuid: string): Promise<MobileMoneyTransaction> {
    const response = await api.get<{
      success: boolean
      data: MobileMoneyTransaction
    }>(`/mobile-money/transactions/${uuid}`)
    return response.data.data
  }

  /**
   * List configured mobile money gateways
   */
  async getGateways(): Promise<MobileMoneyGateway[]> {
    const response = await api.get<{
      success: boolean
      data: MobileMoneyGateway[]
    }>('/mobile-money/gateways')
    return response.data.data
  }

  /**
   * Fetch gateway webhook audit logs
   */
  async getWebhookLogs(params?: {
    provider?: string
    status?: string
    page?: number
    per_page?: number
  }): Promise<{
    data: PaymentWebhookLog[]
    total: number
    current_page: number
    last_page: number
  }> {
    const q = new URLSearchParams()
    if (params?.provider) q.append('provider', params.provider)
    if (params?.status) q.append('status', params.status)
    if (params?.page) q.append('page', String(params.page))
    if (params?.per_page) q.append('per_page', String(params.per_page))

    const response = await api.get<{
      success: boolean
      data: {
        data: PaymentWebhookLog[]
        total: number
        current_page: number
        last_page: number
      }
    }>(`/mobile-money/webhook-logs?${q.toString()}`)

    return response.data.data
  }

  /**
   * Initiate STK Push (C2B Collection) prompt to customer mobile wallet
   */
  async initiateStkPush(payload: StkPushPayload): Promise<{
    transaction: MobileMoneyTransaction
    message: string
  }> {
    const response = await api.post<{
      success: boolean
      data: {
        transaction: MobileMoneyTransaction
        message: string
      }
    }>('/mobile-money/stk-push', payload)
    return response.data.data
  }

  /**
   * Initiate automated B2C disbursement to contractor/site float/labor
   */
  async disburse(payload: DisbursementPayload): Promise<{
    transaction: MobileMoneyTransaction
    message: string
  }> {
    const response = await api.post<{
      success: boolean
      data: {
        transaction: MobileMoneyTransaction
        message: string
      }
    }>('/mobile-money/disburse', payload)
    return response.data.data
  }

  /**
   * Simulate webhook callback (Sandbox / testing)
   */
  async simulateCallback(payload: SimulateWebhookPayload): Promise<any> {
    const response = await api.post<{
      success: boolean
      data: any
    }>('/mobile-money/simulate-callback', payload)
    return response.data.data
  }
}

export const mobileMoneyService = new MobileMoneyService()
export default mobileMoneyService
