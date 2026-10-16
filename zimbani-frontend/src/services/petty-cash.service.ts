import api from '../config/api'
import {
  PettyCashAccount,
  PettyCashTransaction,
  PettyCashFilters,
  CreatePettyCashPayload,
  UpdatePettyCashPayload,
  TopUpPettyCashPayload,
  ReturnFundsPettyCashPayload,
  PettyCashStatistics,
} from '../types/petty-cash.types'

export interface PettyCashPaginatedResponse {
  data: PettyCashAccount[]
  meta?: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

export interface PettyCashTransactionPaginatedResponse {
  data: PettyCashTransaction[]
  meta?: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

class PettyCashService {
  async getPettyCashAccounts(filters?: PettyCashFilters): Promise<PettyCashPaginatedResponse> {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.project_id) params.append('project_id', filters.project_id)
      if (filters.site_id) params.append('site_id', filters.site_id)
      if (filters.custodian_id) params.append('custodian_id', filters.custodian_id)
      if (filters.status) params.append('status', filters.status)
      if (filters.search) params.append('search', filters.search)
      if (filters.sort_by) params.append('sort_by', filters.sort_by)
      if (filters.sort_order) params.append('sort_order', filters.sort_order)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.per_page) params.append('per_page', filters.per_page.toString())
    }

    const response = await api.get<PettyCashPaginatedResponse>(`/petty-cash-accounts?${params.toString()}`)
    return response.data
  }

  async getPettyCashAccount(uuid: string): Promise<PettyCashAccount> {
    const response = await api.get<{ data: PettyCashAccount }>(`/petty-cash-accounts/${uuid}`)
    return response.data.data
  }

  async createPettyCashAccount(payload: CreatePettyCashPayload): Promise<PettyCashAccount> {
    const response = await api.post<{ data: PettyCashAccount }>('/petty-cash-accounts', payload)
    return response.data.data
  }

  async updatePettyCashAccount(uuid: string, payload: UpdatePettyCashPayload): Promise<PettyCashAccount> {
    const response = await api.put<{ data: PettyCashAccount }>(`/petty-cash-accounts/${uuid}`, payload)
    return response.data.data
  }

  async deletePettyCashAccount(uuid: string): Promise<void> {
    await api.delete(`/petty-cash-accounts/${uuid}`)
  }

  async topUpPettyCashAccount(
    uuid: string,
    payload: TopUpPettyCashPayload
  ): Promise<{ account: PettyCashAccount; transaction: PettyCashTransaction }> {
    const response = await api.post<{
      message: string
      data: { account: PettyCashAccount; transaction: PettyCashTransaction }
    }>(`/petty-cash-accounts/${uuid}/top-up`, payload)
    return response.data.data
  }

  async returnFunds(
    uuid: string,
    payload: ReturnFundsPettyCashPayload
  ): Promise<{ account: PettyCashAccount; transaction: PettyCashTransaction }> {
    const response = await api.post<{
      message: string
      data: { account: PettyCashAccount; transaction: PettyCashTransaction }
    }>(`/petty-cash-accounts/${uuid}/return-funds`, payload)
    return response.data.data
  }

  async getTransactions(
    uuid: string,
    filters?: { transaction_type?: string; page?: number; per_page?: number }
  ): Promise<PettyCashTransactionPaginatedResponse> {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.transaction_type) params.append('transaction_type', filters.transaction_type)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.per_page) params.append('per_page', filters.per_page.toString())
    }
    const response = await api.get<PettyCashTransactionPaginatedResponse>(
      `/petty-cash-accounts/${uuid}/transactions?${params.toString()}`
    )
    return response.data
  }

  async getStatistics(params?: { project_id?: string; site_id?: string }): Promise<PettyCashStatistics> {
    const searchParams = new URLSearchParams()
    if (params?.project_id) searchParams.append('project_id', params.project_id)
    if (params?.site_id) searchParams.append('site_id', params.site_id)

    const response = await api.get<{ data: PettyCashStatistics }>(
      `/petty-cash-accounts/statistics?${searchParams.toString()}`
    )
    return response.data.data
  }
}

export default new PettyCashService()
