import api from '../config/api'
import {
  ExecutiveFinancialSummary,
  BudgetVarianceReport,
  ProfitabilityReport,
  CashFlowForecast,
  ComplianceAuditReport,
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
}

export const financialReportService = new FinancialReportService()
export default financialReportService
