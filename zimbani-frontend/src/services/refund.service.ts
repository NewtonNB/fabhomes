import api from '../config/api'

export interface PaymentRefund {
  id: number
  uuid: string
  refund_number: string
  payment_id?: number
  client_id: number
  savings_account_id?: number
  phase_name?: string
  scheme_name?: string
  notice_date?: string
  amount: number
  deduction_percentage: number
  deduction_amount: number
  balance_after_refund: number
  currency: string
  fee_refunded: number
  reason_category: string
  reason_description: string
  withdrawal_reason?: string
  payment_method?: string
  notes?: string
  status: 'requested' | 'approved' | 'rejected' | 'processing' | 'completed'
  requested_by?: number
  approved_by?: number
  approved_at?: string
  rejection_reason?: string
  client?: {
    id: number
    uuid: string
    name: string
    client_number: string
    phone?: string
    email?: string
  }
  payment?: {
    id: number
    payment_number: string
    amount: number
    payment_date: string
  }
  savings_account?: {
    id: number
    account_number: string
    current_balance: number
  }
  approved_by_user?: {
    id: number
    name: string
  }
  created_at: string
}

export interface DeductionCalculationResult {
  amount_paid: number
  requested_amount: number
  deduction_percentage: number
  deduction_amount: number
  net_payable_to_client: number
  balance_after_refund: number
}

class RefundService {
  async getRefunds(params?: any) {
    const res = await api.get('/payment-refunds', { params })
    return res.data
  }

  async getRefund(id: string | number): Promise<PaymentRefund> {
    const res = await api.get(`/payment-refunds/${id}`)
    return res.data.data
  }

  async calculateDeduction(data: {
    amount_paid: number
    requested_amount: number
    deduction_percentage: number
  }): Promise<DeductionCalculationResult> {
    const res = await api.post('/payment-refunds/calculate-deduction', data)
    return res.data.data
  }

  async requestRefund(data: Partial<PaymentRefund>) {
    const res = await api.post('/payment-refunds', data)
    return res.data
  }

  async approveRefund(id: string | number, autoExecute: boolean = true) {
    const res = await api.post(`/payment-refunds/${id}/approve`, { auto_execute: autoExecute })
    return res.data
  }

  async rejectRefund(id: string | number, rejection_reason: string) {
    const res = await api.post(`/payment-refunds/${id}/reject`, { rejection_reason })
    return res.data
  }

  async executeRefund(id: string | number) {
    const res = await api.post(`/payment-refunds/${id}/execute`)
    return res.data
  }
}

export default new RefundService()
