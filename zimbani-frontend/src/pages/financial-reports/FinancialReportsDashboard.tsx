import React, { useState, useEffect, useCallback } from 'react'
import {
  MdAssessment,
  MdAttachMoney,
  MdTrendingUp,
  MdTrendingDown,
  MdShowChart,
  MdTimeline,
  MdAccountBalance,
  MdSecurity,
  MdFileDownload,
  MdRefresh,
  MdCheckCircle,
  MdWarning,
  MdError,
  MdAdd,
  MdDelete,
  MdAutoFixHigh,
  MdClose,
  MdReceiptLong,
  MdSpeed,
  MdCurrencyExchange,
  MdAssignmentTurnedIn,
} from 'react-icons/md'
import MultiCurrencyEscalationTab from './components/MultiCurrencyEscalationTab'
import ProjectHandoverSettlementTab from './components/ProjectHandoverSettlementTab'
import ExecutiveBiAnalyticsTab from './components/ExecutiveBiAnalyticsTab'
import financialReportService from '../../services/financial-report.service'
import budgetService from '../../services/budget.service'
import projectService from '../../services/project.service'
import siteService from '../../services/site.service'
import {
  ExecutiveFinancialSummary,
  BudgetVarianceReport,
  ProfitabilityReport,
  CashFlowForecast,
  ComplianceAuditReport,
} from '../../types/financial-report.types'
import {
  ProjectBudget,
  BudgetCostCategory,
  CreateBudgetPayload,
} from '../../types/budget.types'
import { Project } from '../../types/project.types'
import { Site } from '../../types/site.types'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import './FinancialReports.css'

type TabType =
  | 'executive_bi'
  | 'variance'
  | 'profitability'
  | 'cash_flow'
  | 'compliance'
  | 'budgets'
  | 'fx_escalation'
  | 'capstone_settlement'

const COST_CATEGORIES: { value: BudgetCostCategory; label: string }[] = [
  { value: 'subcontractor', label: 'Subcontractor Trade' },
  { value: 'materials', label: 'Bulk Materials' },
  { value: 'equipment', label: 'Equipment & Plant' },
  { value: 'labour', label: 'Site Labour' },
  { value: 'direct_purchasing', label: 'Direct Purchasing' },
  { value: 'permits_legal', label: 'Permits & Regulatory' },
  { value: 'contingency', label: 'Contingency Reserve' },
  { value: 'other', label: 'Other Construction Cost' },
]

export const FinancialReportsDashboard: React.FC = () => {
  // Navigation / Tab state
  const [activeTab, setActiveTab] = useState<TabType>('variance')

  // Filter state
  const [projects, setProjects] = useState<Project[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [selectedSiteId, setSelectedSiteId] = useState<string>('')
  const [cashFlowHorizon, setCashFlowHorizon] = useState<number>(90)

  // Report Data States
  const [executiveSummary, setExecutiveSummary] = useState<ExecutiveFinancialSummary | null>(null)
  const [varianceReport, setVarianceReport] = useState<BudgetVarianceReport | null>(null)
  const [profitabilityReport, setProfitabilityReport] = useState<ProfitabilityReport | null>(null)
  const [cashFlowForecast, setCashFlowForecast] = useState<CashFlowForecast | null>(null)
  const [complianceAudit, setComplianceAudit] = useState<ComplianceAuditReport | null>(null)
  const [budgetsList, setBudgetsList] = useState<ProjectBudget[]>([])

  // UI States
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState<boolean>(false)
  const [isSeeding, setIsSeeding] = useState<boolean>(false)
  const [showSeedConfirm, setShowSeedConfirm] = useState<boolean>(false)
  const [budgetToDelete, setBudgetToDelete] = useState<{ uuid: string; code: string } | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)

  // Modal State for adding a budget
  const [showAddModal, setShowAddModal] = useState<boolean>(false)
  const [newBudget, setNewBudget] = useState<{
    budget_code: string
    name: string
    cost_category: BudgetCostCategory
    allocated_amount: number
    notes: string
  }>({
    budget_code: '',
    name: '',
    cost_category: 'subcontractor',
    allocated_amount: 0,
    notes: '',
  })

  // Format currency in UGX
  const formatUGX = (amount?: number | null): string => {
    if (amount === undefined || amount === null || isNaN(amount)) return '0 UGX'
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Load project dropdown on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await projectService.getProjects({ per_page: 100 })
        const projectData = Array.isArray(res.data) ? res.data : (res as any).data?.data || []
        setProjects(projectData)
      } catch (err) {
        console.error('Failed to load projects list', err)
      }
    }
    fetchProjects()
  }, [])

  // Load sites when project changes
  useEffect(() => {
    const fetchSites = async () => {
      if (!selectedProjectId) {
        setSites([])
        setSelectedSiteId('')
        return
      }
      try {
        const res = await siteService.getSites({ project_id: selectedProjectId, per_page: 100 })
        const siteData = Array.isArray(res.data) ? res.data : (res as any).data?.data || []
        setSites(siteData)
      } catch (err) {
        console.error('Failed to load sites for project', err)
      }
    }
    fetchSites()
  }, [selectedProjectId])

  // Fetch report data
  const fetchAllReports = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const projId = selectedProjectId || undefined
      const stId = selectedSiteId || undefined

      // Run fetches in parallel
      const [execRes, varRes, profRes, flowRes, auditRes, budgRes] = await Promise.all([
        financialReportService.getExecutiveSummary(projId, stId),
        financialReportService.getBudgetVariance(projId, stId),
        financialReportService.getProfitability(projId),
        financialReportService.getCashFlowForecast(projId, cashFlowHorizon),
        financialReportService.getComplianceAudit(projId),
        budgetService.getBudgets({ project_id: projId, site_id: stId }),
      ])

      setExecutiveSummary(execRes)
      setVarianceReport(varRes)
      setProfitabilityReport(profRes)
      setCashFlowForecast(flowRes)
      setComplianceAudit(auditRes)
      setBudgetsList(budgRes.data || [])
    } catch (err: any) {
      console.error('Failed to load financial reports', err)
      setError(err?.response?.data?.message || err.message || 'Error loading financial reports')
    } finally {
      setLoading(false)
    }
  }, [selectedProjectId, selectedSiteId, cashFlowHorizon])

  useEffect(() => {
    fetchAllReports()
  }, [fetchAllReports])

  // Handle CSV Export
  const handleExportCsv = async () => {
    try {
      setIsExporting(true)
      let reportType: 'budget_variance' | 'profitability' | 'compliance_audit' = 'budget_variance'
      if (activeTab === 'profitability') reportType = 'profitability'
      if (activeTab === 'compliance') reportType = 'compliance_audit'

      await financialReportService.downloadCsv(reportType, selectedProjectId || undefined)
    } catch (err: any) {
      setError('CSV Export failed: ' + (err?.message || 'Unknown error'))
    } finally {
      setIsExporting(false)
    }
  }

  // Handle Quick-Seed standard trade cost codes
  const handleSeedStandard = () => {
    if (!selectedProjectId) {
      setError('Please select a specific project from the dropdown first to seed standard construction cost codes.')
      return
    }
    setShowSeedConfirm(true)
  }

  const confirmSeedStandard = async () => {
    if (!selectedProjectId) return
    try {
      setIsSeeding(true)
      setError(null)
      await budgetService.seedStandardCodes(selectedProjectId)
      await fetchAllReports()
      setSuccessMsg('Successfully seeded 12 standard construction cost code budgets!')
      setShowSeedConfirm(false)
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err: any) {
      setError('Failed to seed cost codes: ' + (err?.response?.data?.message || err.message))
    } finally {
      setIsSeeding(false)
    }
  }

  // Handle Create Budget Code
  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError(null)
    if (!selectedProjectId) {
      setModalError('Please select a project first')
      return
    }
    if (!newBudget.budget_code || !newBudget.name || newBudget.allocated_amount <= 0) {
      setModalError('Please provide a valid code, name, and allocated amount greater than zero.')
      return
    }

    try {
      const payload: CreateBudgetPayload = {
        project_id: selectedProjectId,
        site_id: selectedSiteId ? selectedSiteId : null,
        budget_code: newBudget.budget_code,
        name: newBudget.name,
        cost_category: newBudget.cost_category,
        allocated_amount: newBudget.allocated_amount,
        notes: newBudget.notes,
      }

      await budgetService.createBudget(payload)
      setShowAddModal(false)
      setNewBudget({
        budget_code: '',
        name: '',
        cost_category: 'subcontractor',
        allocated_amount: 0,
        notes: '',
      })
      setSuccessMsg(`Budget cost code "${payload.budget_code}" created successfully.`)
      setTimeout(() => setSuccessMsg(null), 4000)
      await fetchAllReports()
    } catch (err: any) {
      setModalError('Failed to create budget: ' + (err?.response?.data?.message || err.message))
    }
  }

  // Handle Delete Budget Code
  const handleDeleteBudget = (uuid: string, code: string) => {
    setBudgetToDelete({ uuid, code })
  }

  const confirmDeleteBudget = async () => {
    if (!budgetToDelete) return
    try {
      setError(null)
      await budgetService.deleteBudget(budgetToDelete.uuid)
      setSuccessMsg(`Cost code budget allocation "${budgetToDelete.code}" removed.`)
      setBudgetToDelete(null)
      setTimeout(() => setSuccessMsg(null), 4000)
      await fetchAllReports()
    } catch (err: any) {
      setError('Failed to delete budget: ' + (err?.response?.data?.message || err.message))
    }
  }

  return (
    <div className="financial-reports-container">
      {/* Header */}
      <div className="financial-reports-header">
        <div className="financial-reports-title">
          <h1>Financial Auditing, Profitability & Cash Flow</h1>
          <p>
            Portfolio KPIs, Cost Accounting & Variance, Gross Margins, 90-Day Cash Flow Runway & Statutory Governance
          </p>
        </div>

        <div className="financial-reports-actions">
          <button
            className="btn-secondary"
            onClick={fetchAllReports}
            disabled={loading}
            title="Refresh Financial Data"
          >
            <MdRefresh /> Refresh
          </button>

          <button
            className="btn-secondary"
            onClick={handleExportCsv}
            disabled={isExporting || loading}
            title="Download CSV Report for Current View"
          >
            <MdFileDownload /> {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>

          <button
            className="btn-primary"
            onClick={handleSeedStandard}
            disabled={isSeeding || loading || !selectedProjectId}
            title="Seed 12 Standard Trade Cost Codes (Foundation, MEP, Finishes, etc.)"
          >
            <MdAutoFixHigh /> {isSeeding ? 'Configuring...' : 'Seed Standard Codes'}
          </button>
        </div>
      </div>

      {/* Soft Feedback Banners */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', marginBottom: '1rem', fontSize: '13.5px' }}>
          <MdError size={18} />
          <span style={{ flex: 1 }}>{error}</span>
          <button type="button" onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}>
            <MdClose size={16} />
          </button>
        </div>
      )}
      {successMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', marginBottom: '1rem', fontSize: '13.5px' }}>
          <MdCheckCircle size={18} />
          <span style={{ flex: 1 }}>{successMsg}</span>
          <button type="button" onClick={() => setSuccessMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#047857' }}>
            <MdClose size={16} />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="financial-filters-bar">
        <div className="filter-group">
          <label>Filter By Project</label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
          >
            <option value="">All Projects (Consolidated Portfolio)</option>
            {projects.map((proj) => (
              <option key={proj.uuid || proj.id} value={proj.uuid || proj.id}>
                {proj.name} ({proj.code || 'PRJ'})
              </option>
            ))}
          </select>
        </div>

        {selectedProjectId && (
          <div className="filter-group">
            <label>Filter By Site</label>
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
            >
              <option value="">All Sites</option>
              {sites.map((st) => (
                <option key={st.uuid || st.id} value={st.uuid || st.id}>
                  {st.name} ({st.code || 'SITE'})
                </option>
              ))}
            </select>
          </div>
        )}

        {activeTab === 'cash_flow' && (
          <div className="filter-group">
            <label>Forecast Horizon</label>
            <select
              value={cashFlowHorizon}
              onChange={(e) => setCashFlowHorizon(Number(e.target.value))}
            >
              <option value={30}>Next 30 Days</option>
              <option value={60}>Next 60 Days</option>
              <option value={90}>Next 90 Days</option>
            </select>
          </div>
        )}
      </div>

      {/* Executive KPI Bar */}
      {executiveSummary && (
        <div className="executive-kpi-grid">
          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-title">Total Allocated Budget</span>
              <span className="kpi-icon budget"><MdAttachMoney /></span>
            </div>
            <div className="kpi-value">{formatUGX(executiveSummary.total_budget)}</div>
            <div className="kpi-subtext">{executiveSummary.active_projects_count} Active Project(s)</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-title">Actual Costs Incurred</span>
              <span className="kpi-icon incurred"><MdTrendingDown /></span>
            </div>
            <div className="kpi-value">{formatUGX(executiveSummary.total_actual_costs_incurred)}</div>
            <div className="kpi-subtext">
              Certificates: {formatUGX(executiveSummary.total_subcontractor_costs)} | Direct: {formatUGX(executiveSummary.total_direct_expenses)}
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-title">Portfolio Inflows</span>
              <span className="kpi-icon inflows"><MdTrendingUp /></span>
            </div>
            <div className="kpi-value">{formatUGX(executiveSummary.total_inflows)}</div>
            <div className="kpi-subtext">
              Client Savings + Direct Unit Sales
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-title">Net Gross Profit Margin</span>
              <span className="kpi-icon margin"><MdShowChart /></span>
            </div>
            <div className="kpi-value">{formatUGX(executiveSummary.net_gross_margin)}</div>
            <div className="kpi-subtext">
              <span className={executiveSummary.gross_margin_percentage >= 0 ? 'badge-green' : 'badge-amber'}>
                {executiveSummary.gross_margin_percentage}% Gross Margin
              </span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-title">Committed Pipeline</span>
              <span className="kpi-icon pipeline"><MdReceiptLong /></span>
            </div>
            <div className="kpi-value">{formatUGX(executiveSummary.committed_pipeline_outflows)}</div>
            <div className="kpi-subtext">
              {executiveSummary.unpaid_certificates_count} Pending Certificates / Claims
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-title">Cash Runway Liquidity</span>
              <span className="kpi-icon runway"><MdSpeed /></span>
            </div>
            <div className="kpi-value">
              {executiveSummary.cash_runway_months > 0
                ? `${executiveSummary.cash_runway_months} Mo`
                : 'Balanced'}
            </div>
            <div className="kpi-subtext">Estimated Runway Burn</div>
          </div>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="financial-tabs-nav">
        <button
          className={`financial-tab-btn ${activeTab === 'executive_bi' ? 'active' : ''}`}
          onClick={() => setActiveTab('executive_bi')}
        >
          <MdSpeed /> Executive BI Analytics & Export Center
        </button>

        <button
          className={`financial-tab-btn ${activeTab === 'variance' ? 'active' : ''}`}
          onClick={() => setActiveTab('variance')}
        >
          <MdAssessment /> Budget vs. Actual Variance
          {varianceReport && varianceReport.over_budget_count > 0 && (
            <span className="tab-badge danger">{varianceReport.over_budget_count} Over</span>
          )}
        </button>

        <button
          className={`financial-tab-btn ${activeTab === 'profitability' ? 'active' : ''}`}
          onClick={() => setActiveTab('profitability')}
        >
          <MdShowChart /> Project Profitability & Margins
        </button>

        <button
          className={`financial-tab-btn ${activeTab === 'cash_flow' ? 'active' : ''}`}
          onClick={() => setActiveTab('cash_flow')}
        >
          <MdTimeline /> 90-Day Cash Flow Runway
        </button>

        <button
          className={`financial-tab-btn ${activeTab === 'compliance' ? 'active' : ''}`}
          onClick={() => setActiveTab('compliance')}
        >
          <MdSecurity /> Statutory Tax & Governance Audit
        </button>

        <button
          className={`financial-tab-btn ${activeTab === 'budgets' ? 'active' : ''}`}
          onClick={() => setActiveTab('budgets')}
        >
          <MdAccountBalance /> Cost-Code Budgets
          <span className="tab-badge neutral">{budgetsList.length}</span>
        </button>

        <button
          className={`financial-tab-btn ${activeTab === 'fx_escalation' ? 'active' : ''}`}
          onClick={() => setActiveTab('fx_escalation')}
        >
          <MdCurrencyExchange /> FX Hedging & Material Escalation
        </button>

        <button
          className={`financial-tab-btn ${activeTab === 'capstone_settlement' ? 'active' : ''}`}
          onClick={() => setActiveTab('capstone_settlement')}
        >
          <MdAssignmentTurnedIn /> Capstone Handover & Settlement
        </button>
      </div>

      {/* Loading & Error handling */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
          <p>Analyzing financial ledgers, subcontractor certificates, and cash flows...</p>
        </div>
      )}

      {error && (
        <div className="banner-notice" style={{ borderColor: '#fca5a5', backgroundColor: '#fef2f2' }}>
          <div className="banner-notice-content">
            <h4 style={{ color: '#991b1b' }}>Error Generating Report</h4>
            <p style={{ color: '#dc2626' }}>{error}</p>
          </div>
          <button className="btn-secondary" onClick={fetchAllReports}>Try Again</button>
        </div>
      )}

      {/* TAB 1: BUDGET VS ACTUAL VARIANCE */}
      {!loading && activeTab === 'variance' && varianceReport && (
        <div className="report-panel-card">
          <div className="panel-header">
            <div>
              <h2>Construction Trade Cost Accounting & Variance</h2>
              <p>
                Monitoring allocated budgets vs. incurred subcontractor certificates and direct purchasing expenses.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span className="status-pill on_track">
                <MdCheckCircle /> {varianceReport.on_track_count} On Track
              </span>
              {varianceReport.over_budget_count > 0 && (
                <span className="status-pill over_budget">
                  <MdError /> {varianceReport.over_budget_count} Over Budget
                </span>
              )}
            </div>
          </div>

          {varianceReport.cost_codes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
              <p>No cost code budgets configured for this selection.</p>
              {selectedProjectId ? (
                <button className="btn-primary" onClick={handleSeedStandard} style={{ marginTop: '0.5rem' }}>
                  <MdAutoFixHigh /> Seed 12 Standard Trade Cost Codes Now
                </button>
              ) : (
                <p style={{ fontSize: '0.85rem' }}>Select a project from the top dropdown to configure standard cost code budgets.</p>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="financial-table">
                <thead>
                  <tr>
                    <th>Cost Code</th>
                    <th>Trade / Description</th>
                    <th>Category</th>
                    <th className="text-right">Allocated Budget</th>
                    <th className="text-right">Actual Incurred</th>
                    <th className="text-right">Variance</th>
                    <th style={{ width: '160px' }}>Budget Burn</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {varianceReport.cost_codes.map((item) => {
                    const pct = item.allocated_amount > 0
                      ? Math.round((item.actual_incurred_amount / item.allocated_amount) * 100)
                      : 0
                    const barColor = pct > 100 ? 'red' : pct > 85 ? 'amber' : 'green'

                    return (
                      <tr key={item.budget_code}>
                        <td><strong>{item.budget_code}</strong></td>
                        <td>{item.name}</td>
                        <td>
                          <span style={{ textTransform: 'capitalize', color: '#64748b' }}>
                            {item.cost_category.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="text-right">{formatUGX(item.allocated_amount)}</td>
                        <td className="text-right">{formatUGX(item.actual_incurred_amount)}</td>
                        <td className="text-right" style={{ color: item.variance_amount < 0 ? '#dc2626' : '#059669', fontWeight: 600 }}>
                          {formatUGX(item.variance_amount)}
                        </td>
                        <td>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{pct}% used</span>
                          </div>
                          <div className="progress-bar-container">
                            <div
                              className={`progress-bar-fill ${barColor}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </td>
                        <td>
                          {item.status === 'over_budget' && (
                            <span className="status-pill over_budget"><MdError /> Over</span>
                          )}
                          {item.status === 'warning' && (
                            <span className="status-pill warning"><MdWarning /> Warning</span>
                          )}
                          {item.status === 'on_track' && (
                            <span className="status-pill on_track"><MdCheckCircle /> On Track</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PROJECT PROFITABILITY & GROSS MARGINS */}
      {!loading && activeTab === 'profitability' && profitabilityReport && (
        <div>
          <div className="report-panel-card">
            <div className="panel-header">
              <div>
                <h2>Portfolio Profitability & Gross Margins</h2>
                <p>Consolidated revenue collections vs incurred construction costs and developer gross margins.</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#059669' }}>
                  {profitabilityReport.portfolio_margin_percentage}% Gross Margin
                </span>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                  Net: {formatUGX(profitabilityReport.portfolio_gross_margin)}
                </p>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="financial-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th className="text-right">Project Budget</th>
                    <th className="text-right">Inflows (Savings + Sales)</th>
                    <th className="text-right">Outflows (Subcontractors + Expenses)</th>
                    <th className="text-right">Gross Profit</th>
                    <th className="text-right">Margin %</th>
                    <th>Units Sold / Total</th>
                    <th className="text-right">Avg Profit / Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {profitabilityReport.projects.map((proj) => (
                    <tr key={proj.project_id}>
                      <td>
                        <strong>{proj.project_name}</strong>
                      </td>
                      <td className="text-right">{formatUGX(proj.project_budget)}</td>
                      <td className="text-right" style={{ color: '#059669', fontWeight: 600 }}>
                        {formatUGX(proj.inflows.total_inflows)}
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          Savings: {formatUGX(proj.inflows.client_savings)} | Sales: {formatUGX(proj.inflows.unit_sales)}
                        </div>
                      </td>
                      <td className="text-right" style={{ color: '#dc2626' }}>
                        {formatUGX(proj.outflows.total_outflows)}
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          Certificates: {formatUGX(proj.outflows.subcontractor_certified)} | Direct: {formatUGX(proj.outflows.direct_expenses)}
                        </div>
                      </td>
                      <td className="text-right" style={{ fontWeight: 700, color: proj.gross_margin >= 0 ? '#059669' : '#dc2626' }}>
                        {formatUGX(proj.gross_margin)}
                      </td>
                      <td className="text-right">
                        <span className={`status-pill ${proj.gross_margin_percentage >= 20 ? 'on_track' : proj.gross_margin_percentage > 0 ? 'warning' : 'over_budget'}`}>
                          {proj.gross_margin_percentage}%
                        </span>
                      </td>
                      <td>
                        {proj.units.sold_units} / {proj.units.total_units} sold
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          ({proj.units.reserved_units} reserved, {proj.units.available_units} avail)
                        </div>
                      </td>
                      <td className="text-right">
                        <strong>{formatUGX(proj.per_unit.average_profit)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: 90-DAY CASH FLOW RUNWAY */}
      {!loading && activeTab === 'cash_flow' && cashFlowForecast && (
        <div>
          <div className="cashflow-bucket-grid">
            {/* Bucket 1: 0-30 Days */}
            <div className="cashflow-bucket-card">
              <div className="cashflow-bucket-header">
                <div>
                  <div className="cashflow-bucket-title">0 - 30 Days (Immediate)</div>
                  <div className="cashflow-bucket-sub">Short-term liquidity & urgent commitments</div>
                </div>
                <span className="status-pill on_track">Immediate</span>
              </div>
              <div className="cashflow-flow-row">
                <span>Projected Inflows:</span>
                <span className="text-positive">{formatUGX(cashFlowForecast.buckets.bucket_30_days.inflows)}</span>
              </div>
              <div className="cashflow-flow-row">
                <span>Committed Outflows:</span>
                <span className="text-negative">{formatUGX(cashFlowForecast.buckets.bucket_30_days.outflows)}</span>
              </div>
              <div className="cashflow-flow-row net">
                <span>Net Cash Position:</span>
                <span className={cashFlowForecast.buckets.bucket_30_days.net >= 0 ? 'text-positive' : 'text-negative'}>
                  {formatUGX(cashFlowForecast.buckets.bucket_30_days.net)}
                </span>
              </div>
            </div>

            {/* Bucket 2: 31-60 Days */}
            <div className="cashflow-bucket-card">
              <div className="cashflow-bucket-header">
                <div>
                  <div className="cashflow-bucket-title">31 - 60 Days (Near Term)</div>
                  <div className="cashflow-bucket-sub">Pending milestones & contractor bills</div>
                </div>
                <span className="status-pill warning">Near Term</span>
              </div>
              <div className="cashflow-flow-row">
                <span>Projected Inflows:</span>
                <span className="text-positive">{formatUGX(cashFlowForecast.buckets.bucket_60_days.inflows)}</span>
              </div>
              <div className="cashflow-flow-row">
                <span>Committed Outflows:</span>
                <span className="text-negative">{formatUGX(cashFlowForecast.buckets.bucket_60_days.outflows)}</span>
              </div>
              <div className="cashflow-flow-row net">
                <span>Net Cash Position:</span>
                <span className={cashFlowForecast.buckets.bucket_60_days.net >= 0 ? 'text-positive' : 'text-negative'}>
                  {formatUGX(cashFlowForecast.buckets.bucket_60_days.net)}
                </span>
              </div>
            </div>

            {/* Bucket 3: 61-90 Days */}
            <div className="cashflow-bucket-card">
              <div className="cashflow-bucket-header">
                <div>
                  <div className="cashflow-bucket-title">61 - 90 Days (Medium Term)</div>
                  <div className="cashflow-bucket-sub">Retention releases & future claims</div>
                </div>
                <span className="status-pill healthy">Medium Term</span>
              </div>
              <div className="cashflow-flow-row">
                <span>Projected Inflows:</span>
                <span className="text-positive">{formatUGX(cashFlowForecast.buckets.bucket_90_days.inflows)}</span>
              </div>
              <div className="cashflow-flow-row">
                <span>Committed Outflows:</span>
                <span className="text-negative">{formatUGX(cashFlowForecast.buckets.bucket_90_days.outflows)}</span>
              </div>
              <div className="cashflow-flow-row net">
                <span>Net Cash Position:</span>
                <span className={cashFlowForecast.buckets.bucket_90_days.net >= 0 ? 'text-positive' : 'text-negative'}>
                  {formatUGX(cashFlowForecast.buckets.bucket_90_days.net)}
                </span>
              </div>
            </div>
          </div>

          {/* Commitments Runway Table */}
          <div className="report-panel-card">
            <div className="panel-header">
              <div>
                <h2>Scheduled Outflow Commitments & Pending Liabilities</h2>
                <p>Unpaid certificates, pending expense claims, and 5% defect liability retentions.</p>
              </div>
              <div>
                <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
                  Total 90-Day Pipeline: <strong>{formatUGX(cashFlowForecast.summary.total_projected_outflows)}</strong>
                </span>
              </div>
            </div>

            {cashFlowForecast.commitments_runway.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                <p>No pending payment liabilities or commitments detected in this forecast window.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="financial-table">
                  <thead>
                    <tr>
                      <th>Liability Item</th>
                      <th>Category</th>
                      <th>Scheduled / Due Date</th>
                      <th className="text-right">Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashFlowForecast.commitments_runway.map((item) => (
                      <tr key={item.id}>
                        <td><strong>{item.description}</strong></td>
                        <td>
                          <span style={{ textTransform: 'capitalize' }}>
                            {item.type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td>{item.due_date}</td>
                        <td className="text-right" style={{ fontWeight: 600, color: '#dc2626' }}>
                          {formatUGX(item.amount)}
                        </td>
                        <td>
                          <span className="status-pill warning">{item.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: STATUTORY TAX & GOVERNANCE COMPLIANCE AUDIT */}
      {!loading && activeTab === 'compliance' && complianceAudit && (
        <div>
          <div className="compliance-audit-grid">
            {/* Statutory URA Tax & Retentions */}
            <div className="audit-card">
              <div className="audit-card-title">
                <MdSecurity style={{ color: '#059669', fontSize: '1.25rem' }} />
                Statutory Tax & Retention Fund
              </div>
              <div className="audit-metric-row">
                <span className="audit-metric-label">Certified Subcontractor Gross:</span>
                <span className="audit-metric-val">{formatUGX(complianceAudit.statutory_tax_compliance.total_certified_gross)}</span>
              </div>
              <div className="audit-metric-row">
                <span className="audit-metric-label">Statutory 6% WHT Deducted (URA):</span>
                <span className="audit-metric-val" style={{ color: '#2563eb' }}>
                  {formatUGX(complianceAudit.statutory_tax_compliance.total_withholding_tax_6pct_held)}
                </span>
              </div>
              <div className="audit-metric-row">
                <span className="audit-metric-label">Statutory 5% Retention Held:</span>
                <span className="audit-metric-val" style={{ color: '#059669' }}>
                  {formatUGX(complianceAudit.statutory_tax_compliance.total_retention_fund_5pct_held)}
                </span>
              </div>
              <div className="audit-metric-row">
                <span className="audit-metric-label">Tax Compliance Status:</span>
                <span className="status-pill fully_compliant">
                  <MdCheckCircle /> {complianceAudit.statutory_tax_compliance.tax_compliance_status}
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.75rem' }}>
                {complianceAudit.statutory_tax_compliance.notes}
              </p>
            </div>

            {/* Governance Sign-Off Integrity */}
            <div className="audit-card">
              <div className="audit-card-title">
                <MdCheckCircle style={{ color: '#2563eb', fontSize: '1.25rem' }} />
                Governance & Sign-Off Integrity
              </div>
              <div className="audit-metric-row">
                <span className="audit-metric-label">Total Payment Certificates:</span>
                <span className="audit-metric-val">{complianceAudit.governance_sign_off_integrity.total_certificates_audited}</span>
              </div>
              <div className="audit-metric-row">
                <span className="audit-metric-label">Fully 4-Tier Signed Off:</span>
                <span className="audit-metric-val" style={{ color: '#059669' }}>
                  {complianceAudit.governance_sign_off_integrity.fully_signed_off_certificates}
                </span>
              </div>
              <div className="audit-metric-row">
                <span className="audit-metric-label">Pending Approval Sign-Off:</span>
                <span className="audit-metric-val" style={{ color: '#d97706' }}>
                  {complianceAudit.governance_sign_off_integrity.pending_sign_off_certificates}
                </span>
              </div>
              <div className="audit-metric-row">
                <span className="audit-metric-label">Governance Audit:</span>
                <span className="status-pill audited_clear">
                  <MdCheckCircle /> {complianceAudit.governance_sign_off_integrity.governance_status}
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.75rem' }}>
                Strict multi-tier enforcement prevents payment disbursement prior to QS, Site Manager, Finance, and Director authorisations.
              </p>
            </div>

            {/* Site Petty Cash Health */}
            <div className="audit-card">
              <div className="audit-card-title">
                <MdAccountBalance style={{ color: '#7c3aed', fontSize: '1.25rem' }} />
                Site Petty Cash & Imprest Health
              </div>
              <div className="audit-metric-row">
                <span className="audit-metric-label">Active Float Accounts:</span>
                <span className="audit-metric-val">{complianceAudit.site_petty_cash_health.active_petty_cash_accounts}</span>
              </div>
              <div className="audit-metric-row">
                <span className="audit-metric-label">Total Approved Float Limit:</span>
                <span className="audit-metric-val">{formatUGX(complianceAudit.site_petty_cash_health.total_approved_limits)}</span>
              </div>
              <div className="audit-metric-row">
                <span className="audit-metric-label">Current Cash Balances:</span>
                <span className="audit-metric-val">{formatUGX(complianceAudit.site_petty_cash_health.total_current_balances)}</span>
              </div>
              <div className="audit-metric-row">
                <span className="audit-metric-label">Accounts Below Re-Order Level:</span>
                <span className="audit-metric-val" style={{ color: complianceAudit.site_petty_cash_health.accounts_near_or_below_reorder > 0 ? '#dc2626' : '#059669' }}>
                  {complianceAudit.site_petty_cash_health.accounts_near_or_below_reorder}
                </span>
              </div>
              <div className="audit-metric-row">
                <span className="audit-metric-label">Float Risk Status:</span>
                <span className={`status-pill ${complianceAudit.site_petty_cash_health.float_risk_status === 'healthy' ? 'healthy' : 'warning'}`}>
                  {complianceAudit.site_petty_cash_health.float_risk_status}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: COST-CODE BUDGETS MANAGEMENT */}
      {!loading && activeTab === 'budgets' && (
        <div className="report-panel-card">
          <div className="panel-header">
            <div>
              <h2>Project Cost-Code Budgets</h2>
              <p>Configure and manage construction cost code allocations for precise trade accounting.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="btn-primary"
                onClick={() => setShowAddModal(true)}
                disabled={!selectedProjectId}
              >
                <MdAdd /> Add Budget Allocation
              </button>
            </div>
          </div>

          {!selectedProjectId ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
              <p>Please select a specific project from the dropdown above to view or manage its cost code budgets.</p>
            </div>
          ) : budgetsList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
              <p>No budget cost codes configured for this project yet.</p>
              <button className="btn-primary" onClick={handleSeedStandard} style={{ marginTop: '0.5rem' }}>
                <MdAutoFixHigh /> Seed 12 Standard Construction Cost Codes
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="financial-table">
                <thead>
                  <tr>
                    <th>Budget Code</th>
                    <th>Name</th>
                    <th>Cost Category</th>
                    <th className="text-right">Allocated Amount</th>
                    <th>Site Scope</th>
                    <th>Notes</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetsList.map((b) => (
                    <tr key={b.uuid || b.id}>
                      <td><strong>{b.budget_code}</strong></td>
                      <td>{b.name}</td>
                      <td>
                        <span style={{ textTransform: 'capitalize' }}>
                          {b.cost_category.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="text-right" style={{ fontWeight: 600 }}>
                        {formatUGX(b.allocated_amount)}
                      </td>
                      <td>{b.site ? b.site.name : 'Entire Project'}</td>
                      <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{b.notes || '—'}</td>
                      <td className="text-right">
                        <button
                          className="btn-danger-outline"
                          onClick={() => handleDeleteBudget(b.uuid, b.budget_code)}
                          title="Delete budget allocation"
                        >
                          <MdDelete />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* FX Hedging & Material Escalation Tab */}
      {activeTab === 'fx_escalation' && <MultiCurrencyEscalationTab />}

      {/* Capstone Project Handover & Settlement Tab */}
      {activeTab === 'capstone_settlement' && <ProjectHandoverSettlementTab />}

      {/* Executive BI Analytics & Export Center Tab (Phase 11 Day 5) */}
      {activeTab === 'executive_bi' && <ExecutiveBiAnalyticsTab />}

      {/* Modal: Add Budget Code */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Create Project Cost-Code Budget</h3>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleCreateBudget}>
              <div className="modal-body">
                {modalError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '6px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', marginBottom: '1rem', fontSize: '13px' }}>
                    <MdError size={16} />
                    <span>{modalError}</span>
                  </div>
                )}
                <div className="filter-group">
                  <label>Cost Code (e.g., CC-SUBSTRUCTURE)</label>
                  <input
                    type="text"
                    required
                    value={newBudget.budget_code}
                    onChange={(e) => setNewBudget({ ...newBudget, budget_code: e.target.value.toUpperCase() })}
                    placeholder="CC-ELECTRICAL"
                  />
                </div>

                <div className="filter-group">
                  <label>Description / Trade Name</label>
                  <input
                    type="text"
                    required
                    value={newBudget.name}
                    onChange={(e) => setNewBudget({ ...newBudget, name: e.target.value })}
                    placeholder="Electrical Wiring, Distribution & Conduit"
                  />
                </div>

                <div className="filter-group">
                  <label>Cost Category</label>
                  <select
                    value={newBudget.cost_category}
                    onChange={(e) => setNewBudget({ ...newBudget, cost_category: e.target.value as BudgetCostCategory })}
                  >
                    {COST_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Allocated Amount (UGX)</label>
                  <input
                    type="number"
                    min="1"
                    step="1000"
                    required
                    value={newBudget.allocated_amount || ''}
                    onChange={(e) => setNewBudget({ ...newBudget, allocated_amount: Number(e.target.value) })}
                    placeholder="25000000"
                  />
                </div>

                <div className="filter-group">
                  <label>Notes / Specification</label>
                  <input
                    type="text"
                    value={newBudget.notes}
                    onChange={(e) => setNewBudget({ ...newBudget, notes: e.target.value })}
                    placeholder="Contractor scope BOQ item reference"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Budget Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Soft Confirmation for Seeding Trade Codes */}
      <ConfirmDialog
        isOpen={showSeedConfirm}
        title="Initialize Trade Cost Codes"
        message={`Initialize 12 standard construction trade cost codes for "${projects.find((p) => p.uuid === selectedProjectId || p.id?.toString() === selectedProjectId)?.name || 'this project'}" based on its allocated budget?`}
        confirmLabel="Seed Standard Codes"
        cancelLabel="Cancel"
        variant="primary"
        loading={isSeeding}
        onConfirm={confirmSeedStandard}
        onCancel={() => setShowSeedConfirm(false)}
      />

      {/* Soft Confirmation for Delete Budget Code */}
      <ConfirmDialog
        isOpen={!!budgetToDelete}
        title="Remove Budget Allocation"
        message={`Are you sure you want to remove cost code budget allocation "${budgetToDelete?.code}"? Any future variances associated with this cost code will be unassigned.`}
        confirmLabel="Remove Allocation"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDeleteBudget}
        onCancel={() => setBudgetToDelete(null)}
      />
    </div>
  )
}

export default FinancialReportsDashboard
