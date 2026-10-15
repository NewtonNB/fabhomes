import api from '../config/api'
import {
  SiteDailyLog,
  SafetyIncident,
  SafetyToolboxTalk,
  DailyLogFilterParams,
  SafetyIncidentFilterParams,
  ToolboxTalkFilterParams,
  CreateSiteDailyLogInput,
  UpdateSiteDailyLogInput,
  CreateSafetyIncidentInput,
  UpdateSafetyIncidentInput,
  CreateToolboxTalkInput,
  UpdateToolboxTalkInput,
  DailyLogStatistics,
  SafetyStatistics,
} from '../types/daily-log.types'

export interface DailyLogPaginatedResponse<T> {
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

class DailyLogService {
  // ==========================================
  // SITE DAILY SUPERVISOR LOGS
  // ==========================================

  async getDailyLogs(filters?: DailyLogFilterParams): Promise<DailyLogPaginatedResponse<SiteDailyLog>> {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.site_id) params.append('site_id', filters.site_id.toString())
      if (filters.project_id) params.append('project_id', filters.project_id.toString())
      if (filters.weather_condition) params.append('weather_condition', filters.weather_condition)
      if (filters.status) params.append('status', filters.status)
      if (filters.delayed_only) params.append('delayed_only', '1')
      if (filters.from_date) params.append('from_date', filters.from_date)
      if (filters.to_date) params.append('to_date', filters.to_date)
      if (filters.search) params.append('search', filters.search)
      if (filters.sort_by) params.append('sort_by', filters.sort_by)
      if (filters.sort_order) params.append('sort_order', filters.sort_order)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.per_page) params.append('per_page', filters.per_page.toString())
    }

    const response = await api.get<DailyLogPaginatedResponse<SiteDailyLog>>(`/site-daily-logs?${params.toString()}`)
    return response.data
  }

  async getDailyLog(uuid: string): Promise<SiteDailyLog> {
    const response = await api.get<{ data: SiteDailyLog }>(`/site-daily-logs/${uuid}`)
    return response.data.data
  }

  async createDailyLog(input: CreateSiteDailyLogInput): Promise<SiteDailyLog> {
    const response = await api.post<{ data: SiteDailyLog }>('/site-daily-logs', input)
    return response.data.data
  }

  async updateDailyLog(uuid: string, input: UpdateSiteDailyLogInput): Promise<SiteDailyLog> {
    const response = await api.put<{ data: SiteDailyLog }>(`/site-daily-logs/${uuid}`, input)
    return response.data.data
  }

  async deleteDailyLog(uuid: string): Promise<void> {
    await api.delete(`/site-daily-logs/${uuid}`)
  }

  async submitDailyLog(uuid: string): Promise<SiteDailyLog> {
    const response = await api.post<{ data: SiteDailyLog }>(`/site-daily-logs/${uuid}/submit`)
    return response.data.data
  }

  async approveDailyLog(uuid: string, notes?: string): Promise<SiteDailyLog> {
    const response = await api.post<{ data: SiteDailyLog }>(`/site-daily-logs/${uuid}/approve`, { notes })
    return response.data.data
  }

  async getDailyLogStatistics(site_id?: string | number): Promise<DailyLogStatistics> {
    const params = new URLSearchParams()
    if (site_id) params.append('site_id', site_id.toString())

    const response = await api.get<{ data: DailyLogStatistics }>(`/admin/daily-logs/statistics?${params.toString()}`)
    return response.data.data
  }

  // ==========================================
  // SAFETY INCIDENTS & NEAR MISSES
  // ==========================================

  async getIncidents(filters?: SafetyIncidentFilterParams): Promise<DailyLogPaginatedResponse<SafetyIncident>> {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.site_id) params.append('site_id', filters.site_id.toString())
      if (filters.project_id) params.append('project_id', filters.project_id.toString())
      if (filters.incident_type) params.append('incident_type', filters.incident_type)
      if (filters.severity) params.append('severity', filters.severity)
      if (filters.status) params.append('status', filters.status)
      if (filters.open_only) params.append('open_only', '1')
      if (filters.from_date) params.append('from_date', filters.from_date)
      if (filters.to_date) params.append('to_date', filters.to_date)
      if (filters.search) params.append('search', filters.search)
      if (filters.sort_by) params.append('sort_by', filters.sort_by)
      if (filters.sort_order) params.append('sort_order', filters.sort_order)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.per_page) params.append('per_page', filters.per_page.toString())
    }

    const response = await api.get<DailyLogPaginatedResponse<SafetyIncident>>(`/safety-incidents?${params.toString()}`)
    return response.data
  }

  async getIncident(uuid: string): Promise<SafetyIncident> {
    const response = await api.get<{ data: SafetyIncident }>(`/safety-incidents/${uuid}`)
    return response.data.data
  }

  async createIncident(input: CreateSafetyIncidentInput): Promise<SafetyIncident> {
    const response = await api.post<{ data: SafetyIncident }>('/safety-incidents', input)
    return response.data.data
  }

  async updateIncident(uuid: string, input: UpdateSafetyIncidentInput): Promise<SafetyIncident> {
    const response = await api.put<{ data: SafetyIncident }>(`/safety-incidents/${uuid}`, input)
    return response.data.data
  }

  async deleteIncident(uuid: string): Promise<void> {
    await api.delete(`/safety-incidents/${uuid}`)
  }

  async investigateIncident(
    uuid: string,
    input?: { investigator_id?: string | number; immediate_actions_taken?: string }
  ): Promise<SafetyIncident> {
    const response = await api.post<{ data: SafetyIncident }>(`/safety-incidents/${uuid}/investigate`, input || {})
    return response.data.data
  }

  async closeIncident(
    uuid: string,
    input: { root_cause_analysis: string; preventative_measures: string }
  ): Promise<SafetyIncident> {
    const response = await api.post<{ data: SafetyIncident }>(`/safety-incidents/${uuid}/close`, input)
    return response.data.data
  }

  async getSafetyStatistics(site_id?: string | number): Promise<SafetyStatistics> {
    const params = new URLSearchParams()
    if (site_id) params.append('site_id', site_id.toString())

    const response = await api.get<{ data: SafetyStatistics }>(`/admin/safety/statistics?${params.toString()}`)
    return response.data.data
  }

  // ==========================================
  // SAFETY TOOLBOX TALKS & BRIEFINGS
  // ==========================================

  async getToolboxTalks(filters?: ToolboxTalkFilterParams): Promise<DailyLogPaginatedResponse<SafetyToolboxTalk>> {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.site_id) params.append('site_id', filters.site_id.toString())
      if (filters.project_id) params.append('project_id', filters.project_id.toString())
      if (filters.category) params.append('category', filters.category)
      if (filters.from_date) params.append('from_date', filters.from_date)
      if (filters.to_date) params.append('to_date', filters.to_date)
      if (filters.search) params.append('search', filters.search)
      if (filters.sort_by) params.append('sort_by', filters.sort_by)
      if (filters.sort_order) params.append('sort_order', filters.sort_order)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.per_page) params.append('per_page', filters.per_page.toString())
    }

    const response = await api.get<DailyLogPaginatedResponse<SafetyToolboxTalk>>(`/safety-toolbox-talks?${params.toString()}`)
    return response.data
  }

  async getToolboxTalk(uuid: string): Promise<SafetyToolboxTalk> {
    const response = await api.get<{ data: SafetyToolboxTalk }>(`/safety-toolbox-talks/${uuid}`)
    return response.data.data
  }

  async createToolboxTalk(input: CreateToolboxTalkInput): Promise<SafetyToolboxTalk> {
    const response = await api.post<{ data: SafetyToolboxTalk }>('/safety-toolbox-talks', input)
    return response.data.data
  }

  async updateToolboxTalk(uuid: string, input: UpdateToolboxTalkInput): Promise<SafetyToolboxTalk> {
    const response = await api.put<{ data: SafetyToolboxTalk }>(`/safety-toolbox-talks/${uuid}`, input)
    return response.data.data
  }

  async deleteToolboxTalk(uuid: string): Promise<void> {
    await api.delete(`/safety-toolbox-talks/${uuid}`)
  }
}

export const dailyLogService = new DailyLogService()
export default dailyLogService
