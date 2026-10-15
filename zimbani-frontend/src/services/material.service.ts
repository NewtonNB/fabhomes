import api from '../config/api'
import {
  Material,
  MaterialRequisition,
  MaterialUsage,
  CreateMaterialInput,
  UpdateMaterialInput,
  AdjustStockInput,
  CreateRequisitionInput,
  UpdateRequisitionInput,
  CreateUsageInput,
  MaterialFilterParams,
  RequisitionFilterParams,
  UsageFilterParams,
  MaterialStatistics,
} from '../types/material.types'

export interface MaterialPaginatedResponse<T> {
  data: T[]
  pagination: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

class MaterialService {
  /**
   * Get materials list with filters and pagination
   */
  async getMaterials(filters?: MaterialFilterParams): Promise<MaterialPaginatedResponse<Material>> {
    const params = new URLSearchParams()

    if (filters) {
      if (filters.site_id) params.append('site_id', filters.site_id.toString())
      if (filters.category) params.append('category', filters.category)
      if (filters.status) params.append('status', filters.status)
      if (filters.low_stock_only) params.append('low_stock_only', '1')
      if (filters.search) params.append('search', filters.search)
      if (filters.sort_by) params.append('sort_by', filters.sort_by)
      if (filters.sort_order) params.append('sort_order', filters.sort_order)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.per_page) params.append('per_page', filters.per_page.toString())
    }

    const response = await api.get<MaterialPaginatedResponse<Material>>(`/materials?${params.toString()}`)
    return response.data
  }

  /**
   * Get single material by UUID
   */
  async getMaterial(uuid: string): Promise<Material> {
    const response = await api.get<{ data: Material }>(`/materials/${uuid}`)
    return response.data.data
  }

  /**
   * Create material
   */
  async createMaterial(input: CreateMaterialInput): Promise<Material> {
    const response = await api.post<{ data: Material }>('/materials', input)
    return response.data.data
  }

  /**
   * Update material
   */
  async updateMaterial(uuid: string, data: UpdateMaterialInput): Promise<Material> {
    const response = await api.put<{ data: Material }>(`/materials/${uuid}`, data)
    return response.data.data
  }

  /**
   * Delete material
   */
  async deleteMaterial(uuid: string): Promise<void> {
    await api.delete(`/materials/${uuid}`)
  }

  /**
   * Adjust material stock
   */
  async adjustStock(uuid: string, data: AdjustStockInput): Promise<Material> {
    const response = await api.post<{ data: Material }>(`/materials/${uuid}/adjust-stock`, data)
    return response.data.data
  }

  /**
   * Get material statistics
   */
  async getMaterialStatistics(siteId?: string | number): Promise<MaterialStatistics> {
    const params = siteId ? `?site_id=${siteId}` : ''
    const response = await api.get<{ data: MaterialStatistics }>(`/admin/materials/statistics${params}`)
    return response.data.data
  }

  // ==========================================
  // REQUISITIONS
  // ==========================================

  /**
   * Get requisitions list with filters
   */
  async getRequisitions(filters?: RequisitionFilterParams): Promise<MaterialPaginatedResponse<MaterialRequisition>> {
    const params = new URLSearchParams()

    if (filters) {
      if (filters.site_id) params.append('site_id', filters.site_id.toString())
      if (filters.project_id) params.append('project_id', filters.project_id.toString())
      if (filters.status) params.append('status', filters.status)
      if (filters.priority) params.append('priority', filters.priority)
      if (filters.search) params.append('search', filters.search)
      if (filters.sort_by) params.append('sort_by', filters.sort_by)
      if (filters.sort_order) params.append('sort_order', filters.sort_order)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.per_page) params.append('per_page', filters.per_page.toString())
    }

    const response = await api.get<MaterialPaginatedResponse<MaterialRequisition>>(`/material-requisitions?${params.toString()}`)
    return response.data
  }

  /**
   * Get single requisition by UUID
   */
  async getRequisition(uuid: string): Promise<MaterialRequisition> {
    const response = await api.get<{ data: MaterialRequisition }>(`/material-requisitions/${uuid}`)
    return response.data.data
  }

  /**
   * Create requisition
   */
  async createRequisition(input: CreateRequisitionInput): Promise<MaterialRequisition> {
    const response = await api.post<{ data: MaterialRequisition }>('/material-requisitions', input)
    return response.data.data
  }

  /**
   * Update requisition
   */
  async updateRequisition(uuid: string, data: UpdateRequisitionInput): Promise<MaterialRequisition> {
    const response = await api.put<{ data: MaterialRequisition }>(`/material-requisitions/${uuid}`, data)
    return response.data.data
  }

  /**
   * Delete requisition
   */
  async deleteRequisition(uuid: string): Promise<void> {
    await api.delete(`/material-requisitions/${uuid}`)
  }

  /**
   * Approve requisition
   */
  async approveRequisition(uuid: string): Promise<MaterialRequisition> {
    const response = await api.post<{ data: MaterialRequisition }>(`/material-requisitions/${uuid}/approve`)
    return response.data.data
  }

  /**
   * Reject requisition
   */
  async rejectRequisition(uuid: string, reason: string): Promise<MaterialRequisition> {
    const response = await api.post<{ data: MaterialRequisition }>(`/material-requisitions/${uuid}/reject`, {
      rejection_reason: reason,
    })
    return response.data.data
  }

  /**
   * Mark requisition delivered and restock inventory
   */
  async deliverRequisition(uuid: string): Promise<MaterialRequisition> {
    const response = await api.post<{ data: MaterialRequisition }>(`/material-requisitions/${uuid}/deliver`)
    return response.data.data
  }

  // ==========================================
  // USAGE TRACKING
  // ==========================================

  /**
   * Get material usages list with filters
   */
  async getUsages(filters?: UsageFilterParams): Promise<MaterialPaginatedResponse<MaterialUsage>> {
    const params = new URLSearchParams()

    if (filters) {
      if (filters.material_id) params.append('material_id', filters.material_id.toString())
      if (filters.site_id) params.append('site_id', filters.site_id.toString())
      if (filters.project_id) params.append('project_id', filters.project_id.toString())
      if (filters.task_id) params.append('task_id', filters.task_id.toString())
      if (filters.milestone_id) params.append('milestone_id', filters.milestone_id.toString())
      if (filters.from_date) params.append('from_date', filters.from_date)
      if (filters.to_date) params.append('to_date', filters.to_date)
      if (filters.search) params.append('search', filters.search)
      if (filters.sort_by) params.append('sort_by', filters.sort_by)
      if (filters.sort_order) params.append('sort_order', filters.sort_order)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.per_page) params.append('per_page', filters.per_page.toString())
    }

    const response = await api.get<MaterialPaginatedResponse<MaterialUsage>>(`/material-usages?${params.toString()}`)
    return response.data
  }

  /**
   * Record material usage
   */
  async createUsage(input: CreateUsageInput): Promise<MaterialUsage> {
    const response = await api.post<{ data: MaterialUsage }>('/material-usages', input)
    return response.data.data
  }

  /**
   * Delete material usage (restoring stock)
   */
  async deleteUsage(uuid: string): Promise<void> {
    await api.delete(`/material-usages/${uuid}`)
  }
}

export const materialService = new MaterialService()
export default materialService
