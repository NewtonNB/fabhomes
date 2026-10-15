import api from '../config/api'
import {
  SavingsAccount,
  SavingsAccountFilterParams,
  CreateSavingsAccountInput,
  UpdateSavingsAccountInput,
  AdjustBalanceInput,
  SavingsAccountStatistics,
  AccountStatementData,
} from '../types/savings-account.types'

export interface SavingsAccountPaginatedResponse {
  data: SavingsAccount[]
  pagination?: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
  meta?: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

class SavingsAccountService {
  async getSavingsAccounts(filters?: SavingsAccountFilterParams): Promise<SavingsAccountPaginatedResponse> {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.client_id) params.append('client_id', filters.client_id.toString())
      if (filters.account_type) params.append('account_type', filters.account_type)
      if (filters.status) params.append('status', filters.status)
      if (filters.project_id) params.append('project_id', filters.project_id.toString())
      if (filters.plot_id) params.append('plot_id', filters.plot_id.toString())
      if (filters.search) params.append('search', filters.search)
      if (filters.sort_by) params.append('sort_by', filters.sort_by)
      if (filters.sort_order) params.append('sort_order', filters.sort_order)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.per_page) params.append('per_page', filters.per_page.toString())
    }

    const response = await api.get<SavingsAccountPaginatedResponse>(`/savings-accounts?${params.toString()}`)
    return response.data
  }

  async getSavingsAccount(uuid: string): Promise<SavingsAccount> {
    const response = await api.get<{ data: SavingsAccount }>(`/savings-accounts/${uuid}`)
    return response.data.data
  }

  async createSavingsAccount(input: CreateSavingsAccountInput): Promise<SavingsAccount> {
    const response = await api.post<{ data: SavingsAccount }>('/savings-accounts', input)
    return response.data.data
  }

  async updateSavingsAccount(uuid: string, input: UpdateSavingsAccountInput): Promise<SavingsAccount> {
    const response = await api.put<{ data: SavingsAccount }>(`/savings-accounts/${uuid}`, input)
    return response.data.data
  }

  async deleteSavingsAccount(uuid: string): Promise<void> {
    await api.delete(`/savings-accounts/${uuid}`)
  }

  async activateSavingsAccount(uuid: string): Promise<SavingsAccount> {
    const response = await api.post<{ data: SavingsAccount }>(`/savings-accounts/${uuid}/activate`)
    return response.data.data
  }

  async suspendSavingsAccount(uuid: string, reason?: string): Promise<SavingsAccount> {
    const response = await api.post<{ data: SavingsAccount }>(`/savings-accounts/${uuid}/suspend`, { reason })
    return response.data.data
  }

  async closeSavingsAccount(uuid: string, notes?: string): Promise<SavingsAccount> {
    const response = await api.post<{ data: SavingsAccount }>(`/savings-accounts/${uuid}/close`, { notes })
    return response.data.data
  }

  async adjustBalance(uuid: string, input: AdjustBalanceInput): Promise<SavingsAccount> {
    const response = await api.post<{ data: SavingsAccount }>(`/savings-accounts/${uuid}/adjust-balance`, input)
    return response.data.data
  }

  async getStatement(uuid: string): Promise<AccountStatementData> {
    const response = await api.get<{ data: AccountStatementData }>(`/savings-accounts/${uuid}/statement`)
    return response.data.data
  }

  async getStatistics(clientId?: string | number): Promise<SavingsAccountStatistics> {
    const params = new URLSearchParams()
    if (clientId) params.append('client_id', clientId.toString())

    const response = await api.get<{ data: SavingsAccountStatistics }>(`/admin/savings-accounts/statistics?${params.toString()}`)
    return response.data.data
  }
}

export const savingsAccountService = new SavingsAccountService()
export default savingsAccountService
