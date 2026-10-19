import api from '../config/api'
import {
  ClientMilestoneVerification,
  ClientMilestoneSummary,
  MilestoneProgressPhoto,
  PhotoUploadPayload,
  ClientAuthorizePayload,
  ClientDisputePayload,
  ClientMilestoneFilters,
} from '../types/client-milestone.types'
import { PaginatedResponse } from './milestone-release.service'

class ClientPortalService {
  private readonly baseUrl = '/client-portal/milestones'

  /**
   * Get Client milestone portal summary KPI statistics.
   */
  async getSummary(clientId?: string): Promise<ClientMilestoneSummary> {
    const params = new URLSearchParams()
    if (clientId) params.append('client_id', clientId)

    const response = await api.get<{ success: boolean; data: ClientMilestoneSummary }>(
      `${this.baseUrl}/summary?${params.toString()}`
    )
    return response.data.data
  }

  /**
   * Get paginated milestone verifications for the client.
   */
  async getVerifications(filters?: ClientMilestoneFilters): Promise<PaginatedResponse<ClientMilestoneVerification>> {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.stage) params.append('stage', filters.stage)
      if (filters.client_approval_status) params.append('client_approval_status', filters.client_approval_status)
      if (filters.project_id) params.append('project_id', filters.project_id)
      if (filters.unit_id) params.append('unit_id', filters.unit_id)
      if (filters.search) params.append('search', filters.search)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.per_page) params.append('per_page', filters.per_page.toString())
    }

    const response = await api.get<PaginatedResponse<ClientMilestoneVerification>>(
      `${this.baseUrl}/verifications?${params.toString()}`
    )
    return response.data
  }

  /**
   * Get detailed verification view with full photo gallery and payment release breakdown.
   */
  async getVerificationDetails(uuid: string): Promise<ClientMilestoneVerification> {
    const response = await api.get<{ success: boolean; data: ClientMilestoneVerification }>(
      `${this.baseUrl}/verifications/${uuid}`
    )
    return response.data.data
  }

  /**
   * Client authorizes milestone progress & payment release from escrow.
   */
  async authorizeVerification(
    uuid: string,
    payload: ClientAuthorizePayload
  ): Promise<ClientMilestoneVerification> {
    const response = await api.post<{ success: boolean; message: string; data: ClientMilestoneVerification }>(
      `${this.baseUrl}/verifications/${uuid}/authorize`,
      payload
    )
    return response.data.data
  }

  /**
   * Client disputes milestone verification and logs snags / defects.
   */
  async disputeVerification(
    uuid: string,
    payload: ClientDisputePayload
  ): Promise<ClientMilestoneVerification> {
    const response = await api.post<{ success: boolean; message: string; data: ClientMilestoneVerification }>(
      `${this.baseUrl}/verifications/${uuid}/dispute`,
      payload
    )
    return response.data.data
  }

  /**
   * Upload progress photo with geotagging and stage metadata.
   */
  async uploadPhoto(
    verificationUuid: string,
    payload: PhotoUploadPayload
  ): Promise<MilestoneProgressPhoto> {
    const response = await api.post<{ success: boolean; message: string; data: MilestoneProgressPhoto }>(
      `${this.baseUrl}/verifications/${verificationUuid}/photos`,
      payload
    )
    return response.data.data
  }

  /**
   * Client flags a photo with snag notes.
   */
  async flagPhoto(photoUuid: string, notes: string): Promise<MilestoneProgressPhoto> {
    const response = await api.post<{ success: boolean; message: string; data: MilestoneProgressPhoto }>(
      `${this.baseUrl}/photos/${photoUuid}/flag`,
      { notes }
    )
    return response.data.data
  }
}

export const clientPortalService = new ClientPortalService()
export default clientPortalService
