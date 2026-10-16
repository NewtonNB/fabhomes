import api from '../config/api'
import {
  PaymentCertificate,
  CertificateFilters,
  CreateCertificatePayload,
  UpdateCertificatePayload,
  VerifyCertificatePayload,
  ApproveCertificatePayload,
  AuthorizeCertificatePayload,
  PayCertificatePayload,
  RejectCertificatePayload,
  CertificateStatistics,
} from '../types/certificate.types'

export interface CertificatePaginatedResponse {
  data: PaymentCertificate[]
  meta?: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

class CertificateService {
  async getPaymentCertificates(filters?: CertificateFilters): Promise<CertificatePaginatedResponse> {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.contract_id) params.append('contract_id', filters.contract_id)
      if (filters.project_id) params.append('project_id', filters.project_id)
      if (filters.site_id) params.append('site_id', filters.site_id)
      if (filters.status) params.append('status', filters.status)
      if (filters.certificate_type) params.append('certificate_type', filters.certificate_type)
      if (filters.search) params.append('search', filters.search)
      if (filters.sort_by) params.append('sort_by', filters.sort_by)
      if (filters.sort_order) params.append('sort_order', filters.sort_order)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.per_page) params.append('per_page', filters.per_page.toString())
    }

    const response = await api.get<CertificatePaginatedResponse>(`/payment-certificates?${params.toString()}`)
    return response.data
  }

  async getPaymentCertificate(uuid: string): Promise<PaymentCertificate> {
    const response = await api.get<{ data: PaymentCertificate }>(`/payment-certificates/${uuid}`)
    return response.data.data
  }

  async createPaymentCertificate(payload: CreateCertificatePayload): Promise<PaymentCertificate> {
    const response = await api.post<{ data: PaymentCertificate }>('/payment-certificates', payload)
    return response.data.data
  }

  async updatePaymentCertificate(uuid: string, payload: UpdateCertificatePayload): Promise<PaymentCertificate> {
    const response = await api.put<{ data: PaymentCertificate }>(`/payment-certificates/${uuid}`, payload)
    return response.data.data
  }

  async deletePaymentCertificate(uuid: string): Promise<void> {
    await api.delete(`/payment-certificates/${uuid}`)
  }

  async submitPaymentCertificate(uuid: string): Promise<PaymentCertificate> {
    const response = await api.post<{ data: PaymentCertificate }>(`/payment-certificates/${uuid}/submit`)
    return response.data.data
  }

  async verifySitePaymentCertificate(uuid: string, payload?: VerifyCertificatePayload): Promise<PaymentCertificate> {
    const response = await api.post<{ data: PaymentCertificate }>(`/payment-certificates/${uuid}/verify-site`, payload)
    return response.data.data
  }

  async approveFinancePaymentCertificate(uuid: string, payload?: ApproveCertificatePayload): Promise<PaymentCertificate> {
    const response = await api.post<{ data: PaymentCertificate }>(`/payment-certificates/${uuid}/approve-finance`, payload)
    return response.data.data
  }

  async authorizeAdminPaymentCertificate(uuid: string, payload?: AuthorizeCertificatePayload): Promise<PaymentCertificate> {
    const response = await api.post<{ data: PaymentCertificate }>(`/payment-certificates/${uuid}/authorize-admin`, payload)
    return response.data.data
  }

  async payPaymentCertificate(uuid: string, payload: PayCertificatePayload): Promise<PaymentCertificate> {
    const response = await api.post<{ data: PaymentCertificate }>(`/payment-certificates/${uuid}/pay`, payload)
    return response.data.data
  }

  async rejectPaymentCertificate(uuid: string, payload: RejectCertificatePayload): Promise<PaymentCertificate> {
    const response = await api.post<{ data: PaymentCertificate }>(`/payment-certificates/${uuid}/reject`, payload)
    return response.data.data
  }

  async getPaymentCertificateStatistics(filters?: { contract_id?: string; project_id?: string; site_id?: string }): Promise<CertificateStatistics> {
    const params = new URLSearchParams()
    if (filters?.contract_id) params.append('contract_id', filters.contract_id)
    if (filters?.project_id) params.append('project_id', filters.project_id)
    if (filters?.site_id) params.append('site_id', filters.site_id)

    const response = await api.get<{ data: CertificateStatistics }>(`/payment-certificates/statistics?${params.toString()}`)
    return response.data.data
  }
}

export default new CertificateService()
