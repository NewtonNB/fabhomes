import api from '../config/api'
import {
  OtherFee,
  OtherFeeCategory,
  OtherFeeFormData,
  OtherFeePaymentFormData,
  OtherFeeStatistics,
} from '../types/other-fee.types'

class OtherFeeService {
  private readonly baseUrl = '/other-fees'

  async getFees(params?: any): Promise<{ data: OtherFee[]; statistics: OtherFeeStatistics; meta?: any }> {
    const res = await api.get(this.baseUrl, { params })
    const payload = res.data
    return {
      data: payload?.data?.data || payload?.data || [],
      statistics: payload?.statistics || {
        total_billed: 0,
        total_collected: 0,
        total_pending: 0,
        total_waived: 0,
        count_all: 0,
        count_pending: 0,
        count_partial: 0,
        count_paid: 0,
        count_waived: 0,
      },
      meta: payload?.data,
    }
  }

  async getCategories(): Promise<OtherFeeCategory[]> {
    const res = await api.get(`${this.baseUrl}/categories`)
    return res.data?.data || []
  }

  async getFee(uuid: string): Promise<OtherFee> {
    const res = await api.get(`${this.baseUrl}/${uuid}`)
    return res.data?.data
  }

  async createFee(data: OtherFeeFormData): Promise<OtherFee> {
    const res = await api.post(this.baseUrl, data)
    return res.data?.data
  }

  async recordPayment(uuid: string, data: OtherFeePaymentFormData): Promise<OtherFee> {
    const res = await api.post(`${this.baseUrl}/${uuid}/payment`, data)
    return res.data?.data
  }

  async waiveFee(uuid: string, waiver_reason: string): Promise<OtherFee> {
    const res = await api.post(`${this.baseUrl}/${uuid}/waive`, { waiver_reason })
    return res.data?.data
  }

  async deleteFee(uuid: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${uuid}`)
  }
}

export const otherFeeService = new OtherFeeService()
export default otherFeeService
