import axios from 'axios'
import {
  ProjectHandover,
  ProjectFinalSettlement,
  CapstoneSummaryMetrics,
  UpdateDossierPayload,
  ClientSignoffPayload,
} from '../types/capstone-settlement.types'

const API_BASE = '/api/v1'

export const capstoneSettlementService = {
  // Get all handovers
  async getHandovers(params?: {
    project_id?: number
    client_id?: number
    status?: string
    per_page?: number
  }): Promise<{ data: ProjectHandover[]; meta: any }> {
    const response = await axios.get(`${API_BASE}/handovers`, { params })
    return response.data
  },

  // Get single handover
  async getHandover(identifier: string | number): Promise<ProjectHandover> {
    const response = await axios.get(`${API_BASE}/handovers/${identifier}`)
    return response.data.data
  },

  // Initialize handover
  async initializeHandover(payload: {
    project_id: number
    unit_id?: number
    client_id: number
    handover_title?: string
  }): Promise<ProjectHandover> {
    const response = await axios.post(`${API_BASE}/handovers`, payload)
    return response.data.data
  },

  // Update dossier & municipal permits
  async updateDossier(
    identifier: string | number,
    payload: UpdateDossierPayload
  ): Promise<ProjectHandover> {
    const response = await axios.put(`${API_BASE}/handovers/${identifier}/dossier`, payload)
    return response.data.data
  },

  // Client deed sign-off and key release
  async executeClientSignoff(
    identifier: string | number,
    payload: ClientSignoffPayload
  ): Promise<ProjectHandover> {
    const response = await axios.post(`${API_BASE}/handovers/${identifier}/signoff`, payload)
    return response.data.data
  },

  // Generate / fetch final settlement audit
  async generateAudit(payload: {
    project_id: number
    unit_id?: number
    handover_id?: number
  }): Promise<ProjectFinalSettlement> {
    const response = await axios.post(`${API_BASE}/settlements/audit`, payload)
    return response.data.data
  },

  // Finalize settlement and mark project completed
  async finalizeSettlement(
    identifier: string | number,
    payload?: { notes?: string }
  ): Promise<ProjectFinalSettlement> {
    const response = await axios.post(`${API_BASE}/settlements/${identifier}/finalize`, payload)
    return response.data.data
  },

  // Capstone summary metrics
  async getCapstoneSummary(): Promise<CapstoneSummaryMetrics> {
    const response = await axios.get(`${API_BASE}/settlements/capstone-summary`)
    return response.data.data
  },
}

export default capstoneSettlementService
