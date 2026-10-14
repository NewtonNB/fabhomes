import api from '../config/api'
import {
  Payment,
  PaymentFormData,
  PaymentFilters,
  PaymentStatistics,
} from '../types/payment.types'
import { ApiResponse, PaginatedResponse } from '../types/common.types'

/**
 * Payment Service
 * Handles all payment-related API operations
 */
class PaymentService {
  private readonly baseUrl = '/payments'

  /**
   * Get paginated list of payments
   */
  async getPayments(filters?: PaymentFilters): Promise<PaginatedResponse<Payment>> {
    try {
      const response = await api.get<PaginatedResponse<Payment>>(this.baseUrl, {
        params: filters,
      })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch payments')
    }
  }

  /**
   * Get single payment by UUID
   */
  async getPayment(uuid: string): Promise<Payment> {
    try {
      const response = await api.get<ApiResponse<Payment>>(`${this.baseUrl}/${uuid}`)
      return response.data.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch payment')
    }
  }

  /**
   * Create a new payment record
   */
  async createPayment(data: PaymentFormData): Promise<Payment> {
    try {
      const response = await api.post<ApiResponse<Payment>>(this.baseUrl, data)
      return response.data.data
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errors = error.response.data.errors
        const errorMessages: string[] = []
        if (errors) {
          Object.keys(errors).forEach((field) => {
            errorMessages.push(...errors[field])
          })
        }
        throw new Error(errorMessages.join('. ') || error.response?.data?.message || 'Validation failed')
      }
      throw new Error(error.response?.data?.message || 'Failed to create payment')
    }
  }

  /**
   * Update payment record
   */
  async updatePayment(uuid: string, data: Partial<PaymentFormData>): Promise<Payment> {
    try {
      const response = await api.put<ApiResponse<Payment>>(`${this.baseUrl}/${uuid}`, data)
      return response.data.data
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errors = error.response.data.errors
        const errorMessages: string[] = []
        if (errors) {
          Object.keys(errors).forEach((field) => {
            errorMessages.push(...errors[field])
          })
        }
        throw new Error(errorMessages.join('. ') || error.response?.data?.message || 'Validation failed')
      }
      throw new Error(error.response?.data?.message || 'Failed to update payment')
    }
  }

  /**
   * Delete payment (soft delete)
   */
  async deletePayment(uuid: string): Promise<void> {
    try {
      await api.delete(`${this.baseUrl}/${uuid}`)
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete payment')
    }
  }

  /**
   * Restore soft-deleted payment
   */
  async restorePayment(uuid: string): Promise<Payment> {
    try {
      const response = await api.post<ApiResponse<Payment>>(`${this.baseUrl}/${uuid}/restore`)
      return response.data.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to restore payment')
    }
  }

  /**
   * Confirm pending payment
   */
  async confirmPayment(uuid: string): Promise<Payment> {
    try {
      const response = await api.post<ApiResponse<Payment>>(`${this.baseUrl}/${uuid}/confirm`)
      return response.data.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to confirm payment')
    }
  }

  /**
   * Verify confirmed payment
   */
  async verifyPayment(uuid: string): Promise<Payment> {
    try {
      const response = await api.post<ApiResponse<Payment>>(`${this.baseUrl}/${uuid}/verify`)
      return response.data.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to verify payment')
    }
  }

  /**
   * Reject payment
   */
  async rejectPayment(uuid: string, reason: string): Promise<Payment> {
    try {
      const response = await api.post<ApiResponse<Payment>>(`${this.baseUrl}/${uuid}/reject`, { reason })
      return response.data.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to reject payment')
    }
  }

  /**
   * Refund payment
   */
  async refundPayment(uuid: string, refundReason: string, refundAmount?: number): Promise<Payment> {
    try {
      const response = await api.post<ApiResponse<Payment>>(`${this.baseUrl}/${uuid}/refund`, {
        refund_reason: refundReason,
        refund_amount: refundAmount,
      })
      return response.data.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to refund payment')
    }
  }

  /**
   * Cancel pending payment
   */
  async cancelPayment(uuid: string): Promise<Payment> {
    try {
      const response = await api.post<ApiResponse<Payment>>(`${this.baseUrl}/${uuid}/cancel`)
      return response.data.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to cancel payment')
    }
  }

  /**
   * Get payment statistics
   */
  async getStatistics(params?: { from_date?: string; to_date?: string }): Promise<PaymentStatistics> {
    try {
      const response = await api.get<ApiResponse<PaymentStatistics>>('/admin/payments/statistics', {
        params,
      })
      return response.data.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch payment statistics')
    }
  }
}

export const paymentService = new PaymentService()
export default paymentService
