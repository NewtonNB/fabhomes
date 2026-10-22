import api from '../config/api'
import {
  ExecutiveFinancialSummary,
  BudgetVarianceReport,
  ProfitabilityReport,
  CashFlowForecast,
  ComplianceAuditReport,
  FinancialSummaryReport,
  FinancialSummaryFilters,
  CashFlowBreakdownReport,
  ExecutiveKpis,
  ClientActivityReport,
  PlotAllocationReport,
  ConstructionProgressReport,
  ScheduledReportItem,
  CreateScheduledReportInput,
  PrintViewResponse,
} from '../types/financial-report.types'

class FinancialReportService {
  async getExecutiveSummary(projectId?: string, siteId?: string): Promise<ExecutiveFinancialSummary> {
    const params = new URLSearchParams()
    if (projectId) params.append('project_id', projectId)
    if (siteId) params.append('site_id', siteId)

    const response = await api.get<{ data: ExecutiveFinancialSummary }>(
      `/financial-reports/executive-summary?${params.toString()}`
    )
    return response.data.data
  }

  async getBudgetVariance(projectId?: string, siteId?: string): Promise<BudgetVarianceReport> {
    const params = new URLSearchParams()
    if (projectId) params.append('project_id', projectId)
    if (siteId) params.append('site_id', siteId)

    const response = await api.get<{ data: BudgetVarianceReport }>(
      `/financial-reports/budget-variance?${params.toString()}`
    )
    return response.data.data
  }

  async getProfitability(projectId?: string): Promise<ProfitabilityReport> {
    const params = new URLSearchParams()
    if (projectId) params.append('project_id', projectId)

    const response = await api.get<{ data: ProfitabilityReport }>(
      `/financial-reports/profitability?${params.toString()}`
    )
    return response.data.data
  }

  async getCashFlowForecast(projectId?: string, days: number = 90): Promise<CashFlowForecast> {
    const params = new URLSearchParams()
    if (projectId) params.append('project_id', projectId)
    params.append('days', days.toString())

    const response = await api.get<{ data: CashFlowForecast }>(
      `/financial-reports/cash-flow-forecast?${params.toString()}`
    )
    return response.data.data
  }

  async getComplianceAudit(projectId?: string): Promise<ComplianceAuditReport> {
    const params = new URLSearchParams()
    if (projectId) params.append('project_id', projectId)

    const response = await api.get<{ data: ComplianceAuditReport }>(
      `/financial-reports/compliance-audit?${params.toString()}`
    )
    return response.data.data
  }

  async downloadCsv(reportType: 'budget_variance' | 'profitability' | 'compliance_audit', projectId?: string): Promise<void> {
    const params = new URLSearchParams()
    params.append('report_type', reportType)
    if (projectId) params.append('project_id', projectId)

    const response = await api.get(`/financial-reports/export-csv?${params.toString()}`, {
      responseType: 'blob',
    })

    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `financial_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // --- Executive BI Analytics & Advanced Reporting Engine (Phase 11 Day 1) ---

  async getFinancialSummary(filters?: FinancialSummaryFilters): Promise<FinancialSummaryReport> {
    const params = new URLSearchParams()
    if (filters?.date_from) params.append('date_from', filters.date_from)
    if (filters?.date_to) params.append('date_to', filters.date_to)
    if (filters?.group_by) params.append('group_by', filters.group_by)
    if (filters?.account_type) params.append('account_type', filters.account_type)
    if (filters?.gateway) params.append('gateway', filters.gateway)

    const response = await api.get<{ success: boolean; data: FinancialSummaryReport }>(
      `/reports/financial-summary?${params.toString()}`
    )
    return response.data.data
  }

  async getCashFlowBreakdown(filters?: { date_from?: string; date_to?: string }): Promise<CashFlowBreakdownReport> {
    const params = new URLSearchParams()
    if (filters?.date_from) params.append('date_from', filters.date_from)
    if (filters?.date_to) params.append('date_to', filters.date_to)

    const response = await api.get<{ success: boolean; data: CashFlowBreakdownReport }>(
      `/reports/cash-flow-breakdown?${params.toString()}`
    )
    return response.data.data
  }

  async getExecutiveKpis(): Promise<ExecutiveKpis> {
    const response = await api.get<{ success: boolean; data: ExecutiveKpis }>('/reports/executive-kpis')
    return response.data.data
  }

  // --- Phase 11 Day 2 Client Activity, Plot Allocation & Construction Analytics ---

  async getClientActivity(filters?: { date_from?: string; date_to?: string; status?: string }): Promise<ClientActivityReport> {
    const params = new URLSearchParams()
    if (filters?.date_from) params.append('date_from', filters.date_from)
    if (filters?.date_to) params.append('date_to', filters.date_to)
    if (filters?.status) params.append('status', filters.status)

    const response = await api.get<{ success: boolean; data: ClientActivityReport }>(
      `/reports/client-activity?${params.toString()}`
    )
    return response.data.data
  }

  async getPlotAllocation(filters?: { site_id?: number; status?: string }): Promise<PlotAllocationReport> {
    const params = new URLSearchParams()
    if (filters?.site_id) params.append('site_id', filters.site_id.toString())
    if (filters?.status) params.append('status', filters.status)

    const response = await api.get<{ success: boolean; data: PlotAllocationReport }>(
      `/reports/plot-allocation?${params.toString()}`
    )
    return response.data.data
  }

  async getConstructionProgress(filters?: { project_id?: number; site_id?: number; status?: string }): Promise<ConstructionProgressReport> {
    const params = new URLSearchParams()
    if (filters?.project_id) params.append('project_id', filters.project_id.toString())
    if (filters?.site_id) params.append('site_id', filters.site_id.toString())
    if (filters?.status) params.append('status', filters.status)

    const response = await api.get<{ success: boolean; data: ConstructionProgressReport }>(
      `/reports/construction-progress?${params.toString()}`
    )
    return response.data.data
  }

  // --- Phase 11 Day 4 Multi-Format Export Engine & Scheduled Delivery ---

  async downloadReportCsv(reportType: string, filters?: Record<string, any>): Promise<void> {
    const params = new URLSearchParams()
    params.append('report_type', reportType)
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          params.append(k, String(v))
        }
      })
    }

    const response = await api.get(`/reports/export/csv?${params.toString()}`, {
      responseType: 'blob',
    })

    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `zimbani_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  async getPrintView(reportType: string, filters?: Record<string, any>): Promise<PrintViewResponse> {
    const params = new URLSearchParams()
    params.append('report_type', reportType)
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          params.append(k, String(v))
        }
      })
    }

    const response = await api.get<{ success: boolean; data: PrintViewResponse }>(
      `/reports/export/print-view?${params.toString()}`
    )
    return response.data.data
  }

  async getScheduledReports(): Promise<ScheduledReportItem[]> {
    const response = await api.get<{ success: boolean; data: ScheduledReportItem[] }>('/reports/schedules')
    return response.data.data
  }

  async createScheduledReport(input: CreateScheduledReportInput): Promise<ScheduledReportItem> {
    const response = await api.post<{ success: boolean; data: ScheduledReportItem }>('/reports/schedules', input)
    return response.data.data
  }

  async toggleScheduledReport(identifier: string | number): Promise<ScheduledReportItem> {
    const response = await api.post<{ success: boolean; data: ScheduledReportItem }>(`/reports/schedules/${identifier}/toggle`)
    return response.data.data
  }
}

export const financialReportService = new FinancialReportService()
export default financialReportService
