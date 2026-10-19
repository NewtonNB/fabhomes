import api from '../config/api'
import {
  ContractMilestone,
  AllocateMilestonesPayload,
  GenerateCertificateFromMilestonePayload,
  GenerateRetentionReleasePayload,
  ContractMilestoneProgress,
  ProjectMilestoneMatrix,
} from '../types/subcontractor-milestone.types'
import { PaymentCertificate } from '../types/certificate.types'

class SubcontractorMilestoneService {
  /**
   * Get allocated milestones for a subcontractor contract.
   */
  async getContractMilestones(contractId: string | number): Promise<ContractMilestone[]> {
    const response = await api.get<{ success: boolean; data: ContractMilestone[] }>(
      `/subcontractor-contracts/${contractId}/milestones`
    )
    return response.data.data
  }

  /**
   * Allocate construction milestones to a subcontractor contract.
   */
  async allocateMilestones(
    contractId: string | number,
    payload: AllocateMilestonesPayload
  ): Promise<ContractMilestone[]> {
    const response = await api.post<{ success: boolean; message: string; data: ContractMilestone[] }>(
      `/subcontractor-contracts/${contractId}/milestones`,
      payload
    )
    return response.data.data
  }

  /**
   * Get milestone progress and valuation statistics for a subcontractor contract.
   */
  async getContractMilestoneProgress(
    contractId: string | number
  ): Promise<ContractMilestoneProgress> {
    const response = await api.get<{ success: boolean; data: ContractMilestoneProgress }>(
      `/subcontractor-contracts/${contractId}/milestone-progress`
    )
    return response.data.data
  }

  /**
   * One-click generate an Interim Payment Certificate directly from a QS-verified Milestone Verification.
   */
  async generateCertificateFromMilestone(
    verificationUuid: string,
    payload: GenerateCertificateFromMilestonePayload
  ): Promise<PaymentCertificate> {
    const response = await api.post<{ success: boolean; message: string; data: PaymentCertificate }>(
      `/milestone-verifications/${verificationUuid}/generate-subcontractor-certificate`,
      payload
    )
    return response.data.data
  }

  /**
   * Generate 5% Defect Liability Retention Release Certificate for subcontractor upon warranty inspection.
   */
  async generateRetentionReleaseCertificate(
    contractId: string | number,
    payload?: GenerateRetentionReleasePayload
  ): Promise<PaymentCertificate> {
    const response = await api.post<{ success: boolean; message: string; data: PaymentCertificate }>(
      `/subcontractor-contracts/${contractId}/retention-release-certificate`,
      payload || {}
    )
    return response.data.data
  }

  /**
   * Get project cross-sectional milestone & subcontractor valuation matrix.
   */
  async getProjectMilestoneSubcontractorMatrix(
    projectId: string | number
  ): Promise<ProjectMilestoneMatrix> {
    const response = await api.get<{ success: boolean; data: ProjectMilestoneMatrix }>(
      `/projects/${projectId}/milestone-subcontractor-matrix`
    )
    return response.data.data
  }
}

export default new SubcontractorMilestoneService()
