import api from '../config/api'
import {
  SiteInspection,
  PunchListItem,
  InspectionFilterParams,
  PunchListFilterParams,
  CreateSiteInspectionInput,
  UpdateSiteInspectionInput,
  CompleteInspectionInput,
  SignOffInspectionInput,
  CreatePunchListItemInput,
  UpdatePunchListItemInput,
  RectifyPunchListItemInput,
  VerifyPunchListItemInput,
  InspectionStatistics,
  DefectStatistics,
} from '../types/inspection.types'

export interface InspectionPaginatedResponse<T> {
  data: T[]
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

class InspectionService {
  // ==========================================
  // SITE INSPECTIONS & QUALITY CHECKS
  // ==========================================

  async getInspections(filters?: InspectionFilterParams): Promise<InspectionPaginatedResponse<SiteInspection>> {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.site_id) params.append('site_id', filters.site_id.toString())
      if (filters.project_id) params.append('project_id', filters.project_id.toString())
      if (filters.unit_id) params.append('unit_id', filters.unit_id.toString())
      if (filters.task_id) params.append('task_id', filters.task_id.toString())
      if (filters.inspection_type) params.append('inspection_type', filters.inspection_type)
      if (filters.status) params.append('status', filters.status)
      if (filters.inspector_id) params.append('inspector_id', filters.inspector_id.toString())
      if (filters.supervisor_id) params.append('supervisor_id', filters.supervisor_id.toString())
      if (filters.from_date) params.append('from_date', filters.from_date)
      if (filters.to_date) params.append('to_date', filters.to_date)
      if (filters.needs_sign_off) params.append('needs_sign_off', '1')
      if (filters.search) params.append('search', filters.search)
      if (filters.sort_by) params.append('sort_by', filters.sort_by)
      if (filters.sort_order) params.append('sort_order', filters.sort_order)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.per_page) params.append('per_page', filters.per_page.toString())
    }

    const response = await api.get<InspectionPaginatedResponse<SiteInspection>>(`/site-inspections?${params.toString()}`)
    return response.data
  }

  async getInspection(uuid: string): Promise<SiteInspection> {
    const response = await api.get<{ data: SiteInspection }>(`/site-inspections/${uuid}`)
    return response.data.data
  }

  async createInspection(input: CreateSiteInspectionInput): Promise<SiteInspection> {
    const response = await api.post<{ data: SiteInspection }>('/site-inspections', input)
    return response.data.data
  }

  async updateInspection(uuid: string, input: UpdateSiteInspectionInput): Promise<SiteInspection> {
    const response = await api.put<{ data: SiteInspection }>(`/site-inspections/${uuid}`, input)
    return response.data.data
  }

  async deleteInspection(uuid: string): Promise<void> {
    await api.delete(`/site-inspections/${uuid}`)
  }

  async completeInspection(uuid: string, input: CompleteInspectionInput): Promise<SiteInspection> {
    const response = await api.post<{ data: SiteInspection }>(`/site-inspections/${uuid}/complete`, input)
    return response.data.data
  }

  async signOffInspection(uuid: string, input: SignOffInspectionInput): Promise<SiteInspection> {
    const response = await api.post<{ data: SiteInspection }>(`/site-inspections/${uuid}/sign-off`, input)
    return response.data.data
  }

  async getInspectionStatistics(site_id?: string | number): Promise<InspectionStatistics> {
    const params = new URLSearchParams()
    if (site_id) params.append('site_id', site_id.toString())

    const response = await api.get<{ data: InspectionStatistics }>(`/admin/inspections/statistics?${params.toString()}`)
    return response.data.data
  }

  // ==========================================
  // PUNCH LIST & DEFECTS
  // ==========================================

  async getPunchList(filters?: PunchListFilterParams): Promise<InspectionPaginatedResponse<PunchListItem>> {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.site_id) params.append('site_id', filters.site_id.toString())
      if (filters.project_id) params.append('project_id', filters.project_id.toString())
      if (filters.unit_id) params.append('unit_id', filters.unit_id.toString())
      if (filters.site_inspection_id) params.append('site_inspection_id', filters.site_inspection_id.toString())
      if (filters.category) params.append('category', filters.category)
      if (filters.severity) params.append('severity', filters.severity)
      if (filters.status) params.append('status', filters.status)
      if (filters.open_only) params.append('open_only', '1')
      if (filters.overdue_only) params.append('overdue_only', '1')
      if (filters.assigned_to) params.append('assigned_to', filters.assigned_to.toString())
      if (filters.search) params.append('search', filters.search)
      if (filters.sort_by) params.append('sort_by', filters.sort_by)
      if (filters.sort_order) params.append('sort_order', filters.sort_order)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.per_page) params.append('per_page', filters.per_page.toString())
    }

    const response = await api.get<InspectionPaginatedResponse<PunchListItem>>(`/punch-lists?${params.toString()}`)
    return response.data
  }

  async getPunchItem(uuid: string): Promise<PunchListItem> {
    const response = await api.get<{ data: PunchListItem }>(`/punch-lists/${uuid}`)
    return response.data.data
  }

  async createPunchItem(input: CreatePunchListItemInput): Promise<PunchListItem> {
    const response = await api.post<{ data: PunchListItem }>('/punch-lists', input)
    return response.data.data
  }

  async updatePunchItem(uuid: string, input: UpdatePunchListItemInput): Promise<PunchListItem> {
    const response = await api.put<{ data: PunchListItem }>(`/punch-lists/${uuid}`, input)
    return response.data.data
  }

  async deletePunchItem(uuid: string): Promise<void> {
    await api.delete(`/punch-lists/${uuid}`)
  }

  async rectifyPunchItem(uuid: string, input: RectifyPunchListItemInput): Promise<PunchListItem> {
    const response = await api.post<{ data: PunchListItem }>(`/punch-lists/${uuid}/rectify`, input)
    return response.data.data
  }

  async verifyPunchItem(uuid: string, input: VerifyPunchListItemInput): Promise<PunchListItem> {
    const response = await api.post<{ data: PunchListItem }>(`/punch-lists/${uuid}/verify`, input)
    return response.data.data
  }

  async getPunchStatistics(site_id?: string | number): Promise<DefectStatistics> {
    const params = new URLSearchParams()
    if (site_id) params.append('site_id', site_id.toString())

    const response = await api.get<{ data: DefectStatistics }>(`/admin/punch-lists/statistics?${params.toString()}`)
    return response.data.data
  }
}

export const inspectionService = new InspectionService()
export default inspectionService
