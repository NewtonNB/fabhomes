import api from '../config/api'
import {
  ProjectBudget,
  ProjectBudgetFilters,
  CreateBudgetPayload,
  UpdateBudgetPayload,
  StandardCostCodeTemplate,
} from '../types/budget.types'

export interface BudgetListResponse {
  data: ProjectBudget[]
  total_allocated: number
}

class BudgetService {
  async getBudgets(filters?: ProjectBudgetFilters): Promise<BudgetListResponse> {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.project_id) params.append('project_id', filters.project_id)
      if (filters.site_id) params.append('site_id', filters.site_id)
      if (filters.cost_category) params.append('cost_category', filters.cost_category)
      if (filters.search) params.append('search', filters.search)
    }

    const response = await api.get<BudgetListResponse>(`/project-budgets?${params.toString()}`)
    return response.data
  }

  async getBudget(uuid: string): Promise<ProjectBudget> {
    const response = await api.get<{ data: ProjectBudget }>(`/project-budgets/${uuid}`)
    return response.data.data
  }

  async createBudget(payload: CreateBudgetPayload): Promise<ProjectBudget> {
    const response = await api.post<{ message: string; data: ProjectBudget }>('/project-budgets', payload)
    return response.data.data
  }

  async updateBudget(uuid: string, payload: UpdateBudgetPayload): Promise<ProjectBudget> {
    const response = await api.put<{ message: string; data: ProjectBudget }>(`/project-budgets/${uuid}`, payload)
    return response.data.data
  }

  async deleteBudget(uuid: string): Promise<void> {
    await api.delete(`/project-budgets/${uuid}`)
  }

  async getStandardCodes(): Promise<StandardCostCodeTemplate[]> {
    const response = await api.get<{ data: StandardCostCodeTemplate[] }>('/project-budgets/standard-codes')
    return response.data.data
  }

  async seedStandardCodes(projectUuid: string, totalBudget?: number): Promise<ProjectBudget[]> {
    const response = await api.post<{
      message: string
      project_budget: number
      data: ProjectBudget[]
    }>(`/project-budgets/seed-standard/${projectUuid}`, {
      total_budget: totalBudget,
    })
    return response.data.data
  }
}

export const budgetService = new BudgetService()
export default budgetService
