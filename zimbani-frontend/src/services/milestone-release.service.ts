import api from '../config/api'
import {
  MilestoneVerification,
  MilestonePaymentRelease,
  CreateVerificationPayload,
  SiteEngineerSignOffPayload,
  QsSignOffPayload,
  ClientApprovePayload,
  DisburseReleasePayload,
  ReleaseRetentionPayload,
  MilestoneVerificationFilters,
  MilestoneReleaseFilters,
  MilestoneReleaseStatistics,
} from '../types/milestone-release.types'

export interface PaginatedResponse<T> {
  data: T[]
  current_page: number
  last_page: number
  total: number
  per_page: number
}

class MilestoneReleaseService {
  // Verification endpoints
  async getVerifications(filters?: MilestoneVerificationFilters): Promise<PaginatedResponse<MilestoneVerification>> {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.project_id) params.append('project_id', filters.project_id)
      if (filters.unit_id) params.append('unit_id', filters.unit_id)
      if (filters.milestone_id) params.append('milestone_id', filters.milestone_id)
      if (filters.stage) params.append('stage', filters.stage)
      if (filters.search) params.append('search', filters.search)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.per_page) params.append('per_page', filters.per_page.toString())
    }

    const response = await api.get<PaginatedResponse<MilestoneVerification>>(`/milestone-verifications?${params.toString()}`)
    return response.data
  }

  async getVerification(uuid: string): Promise<MilestoneVerification> {
    const response = await api.get<{ data: MilestoneVerification }>(`/milestone-verifications/${uuid}`)
    return response.data.data
  }

  async createVerification(payload: CreateVerificationPayload): Promise<MilestoneVerification> {
    const response = await api.post<{ message: string; data: MilestoneVerification }>('/milestone-verifications', payload)
    return response.data.data
  }

  async submitVerification(uuid: string): Promise<MilestoneVerification> {
    const response = await api.post<{ message: string; data: MilestoneVerification }>(`/milestone-verifications/${uuid}/submit`)
    return response.data.data
  }

  async signOffSiteEngineer(uuid: string, payload: SiteEngineerSignOffPayload): Promise<MilestoneVerification> {
    const response = await api.post<{ message: string; data: MilestoneVerification }>(
      `/milestone-verifications/${uuid}/sign-off-engineer`,
      payload
    )
    return response.data.data
  }

  async signOffQuantitySurveyor(uuid: string, payload: QsSignOffPayload): Promise<MilestoneVerification> {
    const response = await api.post<{ message: string; data: MilestoneVerification }>(
      `/milestone-verifications/${uuid}/sign-off-qs`,
      payload
    )
    return response.data.data
  }

  async clientApprove(uuid: string, payload: ClientApprovePayload): Promise<MilestoneVerification> {
    const response = await api.post<{ message: string; data: MilestoneVerification }>(
      `/milestone-verifications/${uuid}/client-approve`,
      payload
    )
    return response.data.data
  }

  async rejectVerification(uuid: string, reason: string): Promise<MilestoneVerification> {
    const response = await api.post<{ message: string; data: MilestoneVerification }>(
      `/milestone-verifications/${uuid}/reject`,
      { reason }
    )
    return response.data.data
  }

  // Payment Release endpoints
  async getReleases(filters?: MilestoneReleaseFilters): Promise<PaginatedResponse<MilestonePaymentRelease>> {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.project_id) params.append('project_id', filters.project_id)
      if (filters.unit_id) params.append('unit_id', filters.unit_id)
      if (filters.status) params.append('status', filters.status)
      if (filters.source_type) params.append('source_type', filters.source_type)
      if (filters.search) params.append('search', filters.search)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.per_page) params.append('per_page', filters.per_page.toString())
    }

    const response = await api.get<PaginatedResponse<MilestonePaymentRelease>>(`/milestone-payment-releases?${params.toString()}`)
    return response.data
  }

  async getRelease(uuid: string): Promise<MilestonePaymentRelease> {
    const response = await api.get<{ data: MilestonePaymentRelease }>(`/milestone-payment-releases/${uuid}`)
    return response.data.data
  }

  async authorizeRelease(uuid: string, notes?: string): Promise<MilestonePaymentRelease> {
    const response = await api.post<{ message: string; data: MilestonePaymentRelease }>(
      `/milestone-payment-releases/${uuid}/authorize`,
      { notes }
    )
    return response.data.data
  }

  async disburseRelease(uuid: string, payload: DisburseReleasePayload): Promise<MilestonePaymentRelease> {
    const response = await api.post<{ message: string; data: MilestonePaymentRelease }>(
      `/milestone-payment-releases/${uuid}/disburse`,
      payload
    )
    return response.data.data
  }

  async releaseRetention(uuid: string, payload: ReleaseRetentionPayload): Promise<MilestonePaymentRelease> {
    const response = await api.post<{ message: string; data: MilestonePaymentRelease }>(
      `/milestone-payment-releases/${uuid}/release-retention`,
      payload
    )
    return response.data.data
  }

  async getStatistics(projectId?: string): Promise<MilestoneReleaseStatistics> {
    const params = new URLSearchParams()
    if (projectId) params.append('project_id', projectId)

    const response = await api.get<{ data: MilestoneReleaseStatistics }>(
      `/milestone-payment-releases/statistics?${params.toString()}`
    )
    return response.data.data
  }
}

export const milestoneReleaseService = new MilestoneReleaseService()
export default milestoneReleaseService
