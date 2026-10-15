import api from '../config/api'
import {
  Equipment,
  EquipmentDispatch,
  EquipmentMaintenanceLog,
  EquipmentUtilizationLog,
  CreateEquipmentInput,
  UpdateEquipmentInput,
  CreateEquipmentDispatchInput,
  UpdateEquipmentDispatchInput,
  CreateMaintenanceLogInput,
  UpdateMaintenanceLogInput,
  CreateUtilizationLogInput,
  EquipmentFilterParams,
  DispatchFilterParams,
  MaintenanceFilterParams,
  UtilizationFilterParams,
  EquipmentStatistics,
} from '../types/equipment.types'

export interface EquipmentPaginatedResponse<T> {
  data: T[]
  pagination: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

class EquipmentService {
  // ==========================================
  // EQUIPMENT FLEET
  // ==========================================

  async getEquipment(filters?: EquipmentFilterParams): Promise<EquipmentPaginatedResponse<Equipment>> {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.site_id) params.append('site_id', filters.site_id.toString())
      if (filters.type) params.append('type', filters.type)
      if (filters.status) params.append('status', filters.status)
      if (filters.condition) params.append('condition', filters.condition)
      if (filters.needs_service) params.append('needs_service', '1')
      if (filters.search) params.append('search', filters.search)
      if (filters.sort_by) params.append('sort_by', filters.sort_by)
      if (filters.sort_order) params.append('sort_order', filters.sort_order)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.per_page) params.append('per_page', filters.per_page.toString())
    }

    const response = await api.get<EquipmentPaginatedResponse<Equipment>>(`/equipment?${params.toString()}`)
    return response.data
  }

  async getEquipmentItem(uuid: string): Promise<Equipment> {
    const response = await api.get<{ data: Equipment }>(`/equipment/${uuid}`)
    return response.data.data
  }

  async createEquipment(input: CreateEquipmentInput): Promise<Equipment> {
    const response = await api.post<{ data: Equipment }>('/equipment', input)
    return response.data.data
  }

  async updateEquipment(uuid: string, data: UpdateEquipmentInput): Promise<Equipment> {
    const response = await api.put<{ data: Equipment }>(`/equipment/${uuid}`, data)
    return response.data.data
  }

  async deleteEquipment(uuid: string): Promise<void> {
    await api.delete(`/equipment/${uuid}`)
  }

  async getEquipmentStatistics(siteId?: string | number): Promise<EquipmentStatistics> {
    const params = siteId ? `?site_id=${siteId}` : ''
    const response = await api.get<{ data: EquipmentStatistics }>(`/admin/equipment/statistics${params}`)
    return response.data.data
  }

  // ==========================================
  // DISPATCHES & SITE ALLOCATIONS
  // ==========================================

  async getDispatches(filters?: DispatchFilterParams): Promise<EquipmentPaginatedResponse<EquipmentDispatch>> {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.equipment_id) params.append('equipment_id', filters.equipment_id.toString())
      if (filters.site_id) params.append('site_id', filters.site_id.toString())
      if (filters.project_id) params.append('project_id', filters.project_id.toString())
      if (filters.status) params.append('status', filters.status)
      if (filters.search) params.append('search', filters.search)
      if (filters.sort_by) params.append('sort_by', filters.sort_by)
      if (filters.sort_order) params.append('sort_order', filters.sort_order)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.per_page) params.append('per_page', filters.per_page.toString())
    }

    const response = await api.get<EquipmentPaginatedResponse<EquipmentDispatch>>(`/equipment-dispatches?${params.toString()}`)
    return response.data
  }

  async getDispatch(uuid: string): Promise<EquipmentDispatch> {
    const response = await api.get<{ data: EquipmentDispatch }>(`/equipment-dispatches/${uuid}`)
    return response.data.data
  }

  async createDispatch(input: CreateEquipmentDispatchInput): Promise<EquipmentDispatch> {
    const response = await api.post<{ data: EquipmentDispatch }>('/equipment-dispatches', input)
    return response.data.data
  }

  async updateDispatch(uuid: string, data: UpdateEquipmentDispatchInput): Promise<EquipmentDispatch> {
    const response = await api.put<{ data: EquipmentDispatch }>(`/equipment-dispatches/${uuid}`, data)
    return response.data.data
  }

  async deleteDispatch(uuid: string): Promise<void> {
    await api.delete(`/equipment-dispatches/${uuid}`)
  }

  async activateDispatch(uuid: string): Promise<EquipmentDispatch> {
    const response = await api.post<{ data: EquipmentDispatch }>(`/equipment-dispatches/${uuid}/activate`)
    return response.data.data
  }

  async returnDispatch(uuid: string, actualReturnDate?: string, notes?: string): Promise<EquipmentDispatch> {
    const response = await api.post<{ data: EquipmentDispatch }>(`/equipment-dispatches/${uuid}/return`, {
      actual_return_date: actualReturnDate,
      notes,
    })
    return response.data.data
  }

  // ==========================================
  // MAINTENANCE LOGS
  // ==========================================

  async getMaintenanceLogs(filters?: MaintenanceFilterParams): Promise<EquipmentPaginatedResponse<EquipmentMaintenanceLog>> {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.equipment_id) params.append('equipment_id', filters.equipment_id.toString())
      if (filters.maintenance_type) params.append('maintenance_type', filters.maintenance_type)
      if (filters.status) params.append('status', filters.status)
      if (filters.from_date) params.append('from_date', filters.from_date)
      if (filters.to_date) params.append('to_date', filters.to_date)
      if (filters.search) params.append('search', filters.search)
      if (filters.sort_by) params.append('sort_by', filters.sort_by)
      if (filters.sort_order) params.append('sort_order', filters.sort_order)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.per_page) params.append('per_page', filters.per_page.toString())
    }

    const response = await api.get<EquipmentPaginatedResponse<EquipmentMaintenanceLog>>(`/equipment-maintenance?${params.toString()}`)
    return response.data
  }

  async getMaintenanceLog(uuid: string): Promise<EquipmentMaintenanceLog> {
    const response = await api.get<{ data: EquipmentMaintenanceLog }>(`/equipment-maintenance/${uuid}`)
    return response.data.data
  }

  async createMaintenanceLog(input: CreateMaintenanceLogInput): Promise<EquipmentMaintenanceLog> {
    const response = await api.post<{ data: EquipmentMaintenanceLog }>('/equipment-maintenance', input)
    return response.data.data
  }

  async updateMaintenanceLog(uuid: string, data: UpdateMaintenanceLogInput): Promise<EquipmentMaintenanceLog> {
    const response = await api.put<{ data: EquipmentMaintenanceLog }>(`/equipment-maintenance/${uuid}`, data)
    return response.data.data
  }

  async deleteMaintenanceLog(uuid: string): Promise<void> {
    await api.delete(`/equipment-maintenance/${uuid}`)
  }

  async startMaintenance(uuid: string): Promise<EquipmentMaintenanceLog> {
    const response = await api.post<{ data: EquipmentMaintenanceLog }>(`/equipment-maintenance/${uuid}/start`)
    return response.data.data
  }

  async completeMaintenance(
    uuid: string,
    data?: {
      completed_date?: string
      cost?: number
      parts_replaced?: string
      next_service_due_date?: string
      notes?: string
    }
  ): Promise<EquipmentMaintenanceLog> {
    const response = await api.post<{ data: EquipmentMaintenanceLog }>(`/equipment-maintenance/${uuid}/complete`, data || {})
    return response.data.data
  }

  // ==========================================
  // UTILIZATION & OPERATING HOURS
  // ==========================================

  async getUtilizationLogs(filters?: UtilizationFilterParams): Promise<EquipmentPaginatedResponse<EquipmentUtilizationLog>> {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.equipment_id) params.append('equipment_id', filters.equipment_id.toString())
      if (filters.site_id) params.append('site_id', filters.site_id.toString())
      if (filters.project_id) params.append('project_id', filters.project_id.toString())
      if (filters.task_id) params.append('task_id', filters.task_id.toString())
      if (filters.from_date) params.append('from_date', filters.from_date)
      if (filters.to_date) params.append('to_date', filters.to_date)
      if (filters.search) params.append('search', filters.search)
      if (filters.sort_by) params.append('sort_by', filters.sort_by)
      if (filters.sort_order) params.append('sort_order', filters.sort_order)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.per_page) params.append('per_page', filters.per_page.toString())
    }

    const response = await api.get<EquipmentPaginatedResponse<EquipmentUtilizationLog>>(`/equipment-utilization?${params.toString()}`)
    return response.data
  }

  async getUtilizationLog(uuid: string): Promise<EquipmentUtilizationLog> {
    const response = await api.get<{ data: EquipmentUtilizationLog }>(`/equipment-utilization/${uuid}`)
    return response.data.data
  }

  async createUtilizationLog(input: CreateUtilizationLogInput): Promise<EquipmentUtilizationLog> {
    const response = await api.post<{ data: EquipmentUtilizationLog }>('/equipment-utilization', input)
    return response.data.data
  }

  async deleteUtilizationLog(uuid: string): Promise<void> {
    await api.delete(`/equipment-utilization/${uuid}`)
  }
}

export const equipmentService = new EquipmentService()
export default equipmentService
