import api from '../config/api'
import {
  ExpenseClaim,
  ExpenseClaimFilters,
  CreateExpenseClaimPayload,
  UpdateExpenseClaimPayload,
  VerifyClaimPayload,
  ApproveClaimPayload,
  AuthorizeClaimPayload,
  ReimburseClaimPayload,
  RejectClaimPayload,
  ExpenseStatistics,
} from '../types/expense.types'

export interface ExpenseClaimPaginatedResponse {
  data: ExpenseClaim[]
  meta?: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

class ExpenseService {
  async getExpenseClaims(filters?: ExpenseClaimFilters): Promise<ExpenseClaimPaginatedResponse> {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.project_id) params.append('project_id', filters.project_id)
      if (filters.site_id) params.append('site_id', filters.site_id)
      if (filters.petty_cash_account_id) params.append('petty_cash_account_id', filters.petty_cash_account_id)
      if (filters.claimant_id) params.append('claimant_id', filters.claimant_id)
      if (filters.claim_type) params.append('claim_type', filters.claim_type)
      if (filters.expense_category) params.append('expense_category', filters.expense_category)
      if (filters.status) params.append('status', filters.status)
      if (filters.payment_method) params.append('payment_method', filters.payment_method)
      if (filters.date_from) params.append('date_from', filters.date_from)
      if (filters.date_to) params.append('date_to', filters.date_to)
      if (filters.search) params.append('search', filters.search)
      if (filters.sort_by) params.append('sort_by', filters.sort_by)
      if (filters.sort_order) params.append('sort_order', filters.sort_order)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.per_page) params.append('per_page', filters.per_page.toString())
    }

    const response = await api.get<ExpenseClaimPaginatedResponse>(`/expense-claims?${params.toString()}`)
    return response.data
  }

  async getExpenseClaim(uuid: string): Promise<ExpenseClaim> {
    const response = await api.get<{ data: ExpenseClaim }>(`/expense-claims/${uuid}`)
    return response.data.data
  }

  async createExpenseClaim(payload: CreateExpenseClaimPayload): Promise<ExpenseClaim> {
    const response = await api.post<{ data: ExpenseClaim }>('/expense-claims', payload)
    return response.data.data
  }

  async updateExpenseClaim(uuid: string, payload: UpdateExpenseClaimPayload): Promise<ExpenseClaim> {
    const response = await api.put<{ data: ExpenseClaim }>(`/expense-claims/${uuid}`, payload)
    return response.data.data
  }

  async deleteExpenseClaim(uuid: string): Promise<void> {
    await api.delete(`/expense-claims/${uuid}`)
  }

  async submitExpenseClaim(uuid: string): Promise<ExpenseClaim> {
    const response = await api.post<{ data: ExpenseClaim }>(`/expense-claims/${uuid}/submit`)
    return response.data.data
  }

  async verifyExpenseClaim(uuid: string, payload: VerifyClaimPayload): Promise<ExpenseClaim> {
    const response = await api.post<{ data: ExpenseClaim }>(`/expense-claims/${uuid}/verify-site`, payload)
    return response.data.data
  }

  async approveExpenseClaim(uuid: string, payload: ApproveClaimPayload): Promise<ExpenseClaim> {
    const response = await api.post<{ data: ExpenseClaim }>(`/expense-claims/${uuid}/approve-finance`, payload)
    return response.data.data
  }

  async authorizeExpenseClaim(uuid: string, payload: AuthorizeClaimPayload): Promise<ExpenseClaim> {
    const response = await api.post<{ data: ExpenseClaim }>(`/expense-claims/${uuid}/authorize-admin`, payload)
    return response.data.data
  }

  async reimburseExpenseClaim(uuid: string, payload: ReimburseClaimPayload): Promise<ExpenseClaim> {
    const response = await api.post<{ data: ExpenseClaim }>(`/expense-claims/${uuid}/reimburse`, payload)
    return response.data.data
  }

  async rejectExpenseClaim(uuid: string, payload: RejectClaimPayload): Promise<ExpenseClaim> {
    const response = await api.post<{ data: ExpenseClaim }>(`/expense-claims/${uuid}/reject`, payload)
    return response.data.data
  }

  async getStatistics(params?: { project_id?: string; site_id?: string }): Promise<ExpenseStatistics> {
    const searchParams = new URLSearchParams()
    if (params?.project_id) searchParams.append('project_id', params.project_id)
    if (params?.site_id) searchParams.append('site_id', params.site_id)

    const response = await api.get<{ data: ExpenseStatistics }>(
      `/expense-claims/statistics?${searchParams.toString()}`
    )
    return response.data.data
  }
}

export default new ExpenseService()
