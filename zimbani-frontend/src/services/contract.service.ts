import api from '../config/api'
import {
  SubcontractorContract,
  ContractFilters,
  CreateContractPayload,
  UpdateContractPayload,
  ContractStatistics,
} from '../types/contract.types'

export interface ContractPaginatedResponse {
  data: SubcontractorContract[]
  meta?: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

class ContractService {
  async getSubcontractorContracts(filters?: ContractFilters): Promise<ContractPaginatedResponse> {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.project_id) params.append('project_id', filters.project_id)
      if (filters.site_id) params.append('site_id', filters.site_id)
      if (filters.trade_category) params.append('trade_category', filters.trade_category)
      if (filters.status) params.append('status', filters.status)
      if (filters.search) params.append('search', filters.search)
      if (filters.sort_by) params.append('sort_by', filters.sort_by)
      if (filters.sort_order) params.append('sort_order', filters.sort_order)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.per_page) params.append('per_page', filters.per_page.toString())
    }

    const response = await api.get<ContractPaginatedResponse>(`/subcontractor-contracts?${params.toString()}`)
    return response.data
  }

  async getSubcontractorContract(uuid: string): Promise<SubcontractorContract> {
    const response = await api.get<{ data: SubcontractorContract }>(`/subcontractor-contracts/${uuid}`)
    return response.data.data
  }

  async createSubcontractorContract(payload: CreateContractPayload): Promise<SubcontractorContract> {
    const response = await api.post<{ data: SubcontractorContract }>('/subcontractor-contracts', payload)
    return response.data.data
  }

  async updateSubcontractorContract(uuid: string, payload: UpdateContractPayload): Promise<SubcontractorContract> {
    const response = await api.put<{ data: SubcontractorContract }>(`/subcontractor-contracts/${uuid}`, payload)
    return response.data.data
  }

  async deleteSubcontractorContract(uuid: string): Promise<void> {
    await api.delete(`/subcontractor-contracts/${uuid}`)
  }

  async activateSubcontractorContract(uuid: string): Promise<SubcontractorContract> {
    const response = await api.post<{ data: SubcontractorContract }>(`/subcontractor-contracts/${uuid}/activate`)
    return response.data.data
  }

  async suspendSubcontractorContract(uuid: string, notes?: string): Promise<SubcontractorContract> {
    const response = await api.post<{ data: SubcontractorContract }>(`/subcontractor-contracts/${uuid}/suspend`, { notes })
    return response.data.data
  }

  async terminateSubcontractorContract(uuid: string, reason: string): Promise<SubcontractorContract> {
    const response = await api.post<{ data: SubcontractorContract }>(`/subcontractor-contracts/${uuid}/terminate`, { reason })
    return response.data.data
  }

  async getSubcontractorContractStatistics(filters?: { project_id?: string; site_id?: string }): Promise<ContractStatistics> {
    const params = new URLSearchParams()
    if (filters?.project_id) params.append('project_id', filters.project_id)
    if (filters?.site_id) params.append('site_id', filters.site_id)

    const response = await api.get<{ data: ContractStatistics }>(`/subcontractor-contracts/statistics?${params.toString()}`)
    return response.data.data
  }
}

export default new ContractService()
