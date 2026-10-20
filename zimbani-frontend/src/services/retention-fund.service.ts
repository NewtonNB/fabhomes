import api from '../config/api'
import {
  RetentionFund,
  RetentionTransaction,
  DefectLiabilityCertificate,
  RetentionPortfolioStats,
  MaturityScheduleItem,
  SnagAuditSummary,
  RetentionFundFilters,
  DefectCertificateFilters,
  CreatePracticalCompletionPayload,
  CreateDefectClearancePayload,
  CreateFinalReleasePayload,
  RectificationDeductionPayload,
  ReleaseRetentionPayload,
} from '../types/retention-fund.types'

class RetentionFundService {
  /**
   * Get portfolio statistics on total retention withheld, released, held balance, and matured funds.
   */
  async getStatistics(projectId?: number | string): Promise<RetentionPortfolioStats> {
    const params = new URLSearchParams()
    if (projectId) params.append('project_id', String(projectId))

    const response = await api.get<{
      success: boolean
      data: RetentionPortfolioStats
    }>(`/retention-funds/statistics?${params.toString()}`)
    return response.data.data
  }

  /**
   * List retention funds with pagination and filtering.
   */
  async getRetentionFunds(filters: RetentionFundFilters = {}): Promise<{
    data: RetentionFund[]
    total: number
    current_page: number
    last_page: number
  }> {
    const params = new URLSearchParams()
    if (filters.project_id) params.append('project_id', String(filters.project_id))
    if (filters.contract_id) params.append('contract_id', String(filters.contract_id))
    if (filters.client_id) params.append('client_id', String(filters.client_id))
    if (filters.status) params.append('status', filters.status)
    if (filters.beneficiary_type) params.append('beneficiary_type', filters.beneficiary_type)
    if (filters.eligible_only) params.append('eligible_only', '1')
    if (filters.search) params.append('search', filters.search)
    if (filters.page) params.append('page', String(filters.page))
    if (filters.per_page) params.append('per_page', String(filters.per_page))

    const response = await api.get<{
      success: boolean
      data: {
        data: RetentionFund[]
        total: number
        current_page: number
        last_page: number
      }
    }>(`/retention-funds?${params.toString()}`)
    return response.data.data
  }

  /**
   * Get a single retention fund by UUID, with transactions and certificates.
   */
  async getRetentionFund(uuid: string): Promise<RetentionFund> {
    const response = await api.get<{
      success: boolean
      data: RetentionFund
    }>(`/retention-funds/${uuid}`)
    return response.data.data
  }

  /**
   * Get DLP maturity schedule and punch-list status for a fund.
   */
  async getMaturitySchedule(uuid: string): Promise<MaturityScheduleItem> {
    const response = await api.get<{
      success: boolean
      data: MaturityScheduleItem
    }>(`/retention-funds/${uuid}/maturity-schedule`)
    return response.data.data
  }

  /**
   * Deduct 3rd-party rectification costs from a contractor's retention pool.
   */
  async recordRectificationDeduction(
    uuid: string,
    payload: RectificationDeductionPayload
  ): Promise<{ transaction: RetentionTransaction; retention_fund: RetentionFund }> {
    const response = await api.post<{
      success: boolean
      data: {
        transaction: RetentionTransaction
        retention_fund: RetentionFund
      }
      message: string
    }>(`/retention-funds/${uuid}/rectification-deduction`, payload)
    return response.data.data
  }

  /**
   * Release interim or final retention to the beneficiary.
   */
  async releaseRetention(
    uuid: string,
    payload: ReleaseRetentionPayload
  ): Promise<{ transaction: RetentionTransaction; retention_fund: RetentionFund }> {
    const response = await api.post<{
      success: boolean
      data: {
        transaction: RetentionTransaction
        retention_fund: RetentionFund
      }
      message: string
    }>(`/retention-funds/${uuid}/release`, payload)
    return response.data.data
  }

  /**
   * Manually start DLP if not already commenced via PCC.
   */
  async startDlp(
    uuid: string,
    payload: { practical_completion_date?: string; dlp_period_days?: number }
  ): Promise<RetentionFund> {
    const response = await api.post<{
      success: boolean
      data: RetentionFund
      message: string
    }>(`/retention-funds/${uuid}/start-dlp`, payload)
    return response.data.data
  }

  /**
   * List Defect Liability Certificates.
   */
  async getDefectCertificates(filters: DefectCertificateFilters = {}): Promise<{
    data: DefectLiabilityCertificate[]
    total: number
    current_page: number
    last_page: number
  }> {
    const params = new URLSearchParams()
    if (filters.project_id) params.append('project_id', String(filters.project_id))
    if (filters.contract_id) params.append('contract_id', String(filters.contract_id))
    if (filters.certificate_type) params.append('certificate_type', filters.certificate_type)
    if (filters.status) params.append('status', filters.status)
    if (filters.page) params.append('page', String(filters.page))
    if (filters.per_page) params.append('per_page', String(filters.per_page))

    const response = await api.get<{
      success: boolean
      data: {
        data: DefectLiabilityCertificate[]
        total: number
        current_page: number
        last_page: number
      }
    }>(`/defect-certificates?${params.toString()}`)
    return response.data.data
  }

  /**
   * Issue a Defect Liability Certificate (PCC, DCC, Final Release, or Handover).
   */
  async createDefectCertificate(
    payload: CreatePracticalCompletionPayload | CreateDefectClearancePayload | CreateFinalReleasePayload
  ): Promise<DefectLiabilityCertificate> {
    const response = await api.post<{
      success: boolean
      data: DefectLiabilityCertificate
      message: string
    }>('/defect-certificates', payload)
    return response.data.data
  }

  /**
   * Get single Defect Liability Certificate details.
   */
  async getDefectCertificate(uuid: string): Promise<DefectLiabilityCertificate> {
    const response = await api.get<{
      success: boolean
      data: DefectLiabilityCertificate
    }>(`/defect-certificates/${uuid}`)
    return response.data.data
  }

  /**
   * Perform a live punch-list audit check for a certificate/fund.
   */
  async checkCertificateSnags(uuid: string): Promise<SnagAuditSummary> {
    const response = await api.get<{
      success: boolean
      data: SnagAuditSummary
    }>(`/defect-certificates/${uuid}/snags-check`)
    return response.data.data
  }

  /**
   * Digitally sign a defect liability certificate.
   */
  async signCertificate(
    uuid: string,
    role: 'engineer' | 'qs' | 'client'
  ): Promise<DefectLiabilityCertificate> {
    const endpoint =
      role === 'engineer'
        ? `/defect-certificates/${uuid}/sign-engineer`
        : role === 'qs'
        ? `/defect-certificates/${uuid}/sign-qs`
        : `/defect-certificates/${uuid}/sign-client`

    const response = await api.post<{
      success: boolean
      data: DefectLiabilityCertificate
      message: string
    }>(endpoint)
    return response.data.data
  }
}

export const retentionFundService = new RetentionFundService()
export default retentionFundService
