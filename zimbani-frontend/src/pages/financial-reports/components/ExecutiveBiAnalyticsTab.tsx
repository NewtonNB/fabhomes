import React, { useState, useEffect, useCallback } from 'react'
import {
  MdAttachMoney,
  MdTrendingUp,
  MdAccountBalance,
  MdSecurity,
  MdFileDownload,
  MdRefresh,
  MdPrint,
  MdSchedule,
  MdPeople,
  MdLandscape,
  MdConstruction,
  MdCheckCircle,
  MdWarning,
  MdError,
  MdClose,
  MdAdd,
  MdToggleOn,
  MdToggleOff,
} from 'react-icons/md'
import financialReportService from '../../../services/financial-report.service'
import {
  FinancialSummaryReport,
  ClientActivityReport,
  PlotAllocationReport,
  ConstructionProgressReport,
  ExecutiveKpis,
  ScheduledReportItem,
  PrintViewResponse,
} from '../../../types/financial-report.types'
import './ExecutiveBiAnalyticsTab.css'

export const ExecutiveBiAnalyticsTab: React.FC = () => {
  const [subview, setSubview] = useState<'financial' | 'clients' | 'plots' | 'construction' | 'schedules'>('financial')
  const [loading, setLoading] = useState<boolean>(true)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Report States
  const [kpis, setKpis] = useState<ExecutiveKpis | null>(null)
  const [financialSummary, setFinancialSummary] = useState<FinancialSummaryReport | null>(null)
  const [clientActivity, setClientActivity] = useState<ClientActivityReport | null>(null)
  const [plotAllocation, setPlotAllocation] = useState<PlotAllocationReport | null>(null)
  const [constructionProgress, setConstructionProgress] = useState<ConstructionProgressReport | null>(null)
  const [schedules, setSchedules] = useState<ScheduledReportItem[]>([])

  // Modal States
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false)
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false)
  const [printData, setPrintData] = useState<PrintViewResponse | null>(null)
  const [exporting, setExporting] = useState<boolean>(false)

  // New Schedule Form State
  const [scheduleName, setScheduleName] = useState<string>('')
  const [scheduleType, setScheduleType] = useState<string>('financial_summary')
  const [scheduleFreq, setScheduleFreq] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [scheduleFormat, setScheduleFormat] = useState<'csv' | 'pdf' | 'both'>('both')
  const [scheduleRecipients, setScheduleRecipients] = useState<string>('')
  const [scheduleSubmitting, setScheduleSubmitting] = useState<boolean>(false)

  // Filter States
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day')

  // Load All Executive BI Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [kpisRes, finRes, clientRes, plotRes, constrRes, schedRes] = await Promise.all([
        financialReportService.getExecutiveKpis(),
        financialReportService.getFinancialSummary({ group_by: groupBy }),
        financialReportService.getClientActivity(),
        financialReportService.getPlotAllocation(),
        financialReportService.getConstructionProgress(),
        financialReportService.getScheduledReports().catch(() => []),
      ])

      setKpis(kpisRes)
      setFinancialSummary(finRes)
      setClientActivity(clientRes)
      setPlotAllocation(plotRes)
      setConstructionProgress(constrRes)
      setSchedules(schedRes || [])
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to load Executive BI datasets',
      })
    } finally {
      setLoading(false)
    }
  }, [groupBy])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Clear feedback after 6s
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 6000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  // Handle CSV Download
  const handleDownloadCsv = async () => {
    try {
      setExporting(true)
      const reportMap: Record<string, string> = {
        financial: 'financial_summary',
        clients: 'client_activity',
        plots: 'plot_allocation',
        construction: 'construction_progress',
        schedules: 'financial_summary',
      }
      const type = reportMap[subview]
      await financialReportService.downloadReportCsv(type, { group_by: groupBy })
      setFeedback({ type: 'success', text: `Downloaded ${type.replace('_', ' ')} CSV successfully!` })
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.message || err.message || 'Export failed' })
    } finally {
      setExporting(false)
    }
  }

  // Handle Print-Ready View
  const handleOpenPrintView = async () => {
    try {
      setLoading(true)
      const reportMap: Record<string, string> = {
        financial: 'financial_summary',
        clients: 'client_activity',
        plots: 'plot_allocation',
        construction: 'construction_progress',
        schedules: 'financial_summary',
      }
      const type = reportMap[subview]
      const res = await financialReportService.getPrintView(type, { group_by: groupBy })
      setPrintData(res)
      setShowPrintModal(true)
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.message || err.message || 'Failed to generate print view' })
    } finally {
      setLoading(false)
    }
  }

  // Handle Schedule Creation
  const handleCreateScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scheduleName || !scheduleRecipients) return
    try {
      setScheduleSubmitting(true)
      const emails = scheduleRecipients
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

      const created = await financialReportService.createScheduledReport({
        name: scheduleName,
        report_type: scheduleType,
        frequency: scheduleFreq,
        format: scheduleFormat,
        recipients: emails,
      })

      setSchedules((prev) => [created, ...prev])
      setFeedback({ type: 'success', text: `Scheduled automation "${created.name}" created!` })
      setShowScheduleModal(false)
      setScheduleName('')
      setScheduleRecipients('')
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.message || err.message || 'Failed to create schedule' })
    } finally {
      setScheduleSubmitting(false)
    }
  }

  // Handle Toggle Schedule
  const handleToggleSchedule = async (id: number) => {
    try {
      const updated = await financialReportService.toggleScheduledReport(id)
      setSchedules((prev) => prev.map((s) => (s.id === id ? updated : s)))
      setFeedback({
        type: 'success',
        text: `Schedule "${updated.name}" is now ${updated.is_active ? 'active' : 'paused'}`,
      })
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.message || err.message || 'Failed to toggle schedule' })
    }
  }

  // Format UGX
  const formatUGX = (val?: number | null) => {
    if (val === undefined || val === null || isNaN(val)) return '0 UGX'
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(val)
  }

  return (
    <div className="ebi-container">
      {/* Feedback Alert */}
      {feedback && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '13px',
            background: feedback.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: feedback.type === 'success' ? '#15803d' : '#b91c1c',
            border: `1px solid ${feedback.type === 'success' ? '#86efac' : '#fca5a5'}`,
          }}
        >
          {feedback.text}
        </div>
      )}

      {/* Top-Level Executive KPI Cards */}
      {kpis && (
        <div className="ebi-kpi-grid">
          <div className="ebi-kpi-card">
            <div className="ebi-kpi-header">
              <span className="ebi-kpi-title">Month-To-Date Inflow</span>
              <span style={{ color: '#16a34a', fontSize: '18px' }}><MdTrendingUp /></span>
            </div>
            <div className="ebi-kpi-val">{formatUGX(kpis.month_to_date_revenue)}</div>
            <div className="ebi-kpi-subtext">Current calendar month collections</div>
          </div>

          <div className="ebi-kpi-card">
            <div className="ebi-kpi-header">
              <span className="ebi-kpi-title">Savings Under Management</span>
              <span style={{ color: '#0284c7', fontSize: '18px' }}><MdAccountBalance /></span>
            </div>
            <div className="ebi-kpi-val">{formatUGX(kpis.savings_under_management)}</div>
            <div className="ebi-kpi-subtext">Active & dormant savings schemes</div>
          </div>

          <div className="ebi-kpi-card">
            <div className="ebi-kpi-header">
              <span className="ebi-kpi-title">Warranty Retention Held</span>
              <span style={{ color: '#9333ea', fontSize: '18px' }}><MdSecurity /></span>
            </div>
            <div className="ebi-kpi-val">{formatUGX(kpis.retention_warranty_reserves)}</div>
            <div className="ebi-kpi-subtext">DLP contract defect liability fund</div>
          </div>

          <div className="ebi-kpi-card">
            <div className="ebi-kpi-header">
              <span className="ebi-kpi-title">Active Clients</span>
              <span style={{ color: '#d97706', fontSize: '18px' }}><MdPeople /></span>
            </div>
            <div className="ebi-kpi-val">{kpis.active_clients_count}</div>
            <div className="ebi-kpi-subtext">Verified KYC accounts enrolled</div>
          </div>

          <div className="ebi-kpi-card">
            <div className="ebi-kpi-header">
              <span className="ebi-kpi-title">Dispute Resolution Rate</span>
              <span style={{ color: '#059669', fontSize: '18px' }}><MdCheckCircle /></span>
            </div>
            <div className="ebi-kpi-val">{kpis.dispute_win_rate_percentage}%</div>
            <div className="ebi-kpi-subtext">Won chargeback & fraud defenses</div>
          </div>
        </div>
      )}

      {/* Header Bar with Sub-Pills & Actions */}
      <div className="ebi-header-bar">
        <div className="ebi-nav-pills">
          <button
            className={`ebi-nav-pill ${subview === 'financial' ? 'active' : ''}`}
            onClick={() => setSubview('financial')}
          >
            <MdAttachMoney /> Financial Summary & Velocity
          </button>
          <button
            className={`ebi-nav-pill ${subview === 'clients' ? 'active' : ''}`}
            onClick={() => setSubview('clients')}
          >
            <MdPeople /> Client Activity & Leaderboard
          </button>
          <button
            className={`ebi-nav-pill ${subview === 'plots' ? 'active' : ''}`}
            onClick={() => setSubview('plots')}
          >
            <MdLandscape /> Plot Allocation & Estates
          </button>
          <button
            className={`ebi-nav-pill ${subview === 'construction' ? 'active' : ''}`}
            onClick={() => setSubview('construction')}
          >
            <MdConstruction /> Milestones & Health
          </button>
          <button
            className={`ebi-nav-pill ${subview === 'schedules' ? 'active' : ''}`}
            onClick={() => setSubview('schedules')}
          >
            <MdSchedule /> Scheduled Automations ({schedules.length})
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {subview === 'financial' && (
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <option value="day">Group by Day</option>
              <option value="week">Group by Week</option>
              <option value="month">Group by Month</option>
            </select>
          )}

          <button
            className="btn-secondary"
            onClick={loadData}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '6px 12px' }}
          >
            <MdRefresh className={loading ? 'ebi-spin' : ''} /> Refresh
          </button>

          <button
            className="btn-secondary"
            onClick={handleDownloadCsv}
            disabled={exporting}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '6px 12px' }}
          >
            <MdFileDownload /> {exporting ? 'Exporting...' : 'Export CSV'}
          </button>

          <button
            className="btn-secondary"
            onClick={handleOpenPrintView}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '6px 12px' }}
          >
            <MdPrint /> Print Report
          </button>

          {subview === 'schedules' && (
            <button
              className="btn-primary"
              onClick={() => setShowScheduleModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '6px 12px' }}
            >
              <MdAdd /> New Schedule
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: FINANCIAL SUMMARY */}
      {subview === 'financial' && financialSummary && (
        <>
          <div className="ebi-kpi-grid">
            <div className="ebi-kpi-card">
              <span className="ebi-kpi-title">Gross Settled Revenue</span>
              <div className="ebi-kpi-val" style={{ color: '#0284c7' }}>
                {formatUGX(financialSummary.summary.total_revenue)}
              </div>
              <div className="ebi-kpi-subtext">{financialSummary.summary.total_transactions} transactions settled</div>
            </div>

            <div className="ebi-kpi-card">
              <span className="ebi-kpi-title">Net Operating Revenue</span>
              <div className="ebi-kpi-val" style={{ color: '#16a34a' }}>
                {formatUGX(financialSummary.summary.net_revenue)}
              </div>
              <div className="ebi-kpi-subtext">Minus fees & client refunds</div>
            </div>

            <div className="ebi-kpi-card">
              <span className="ebi-kpi-title">Average Transaction Size</span>
              <div className="ebi-kpi-val">
                {formatUGX(financialSummary.summary.average_transaction_value)}
              </div>
              <div className="ebi-kpi-subtext">Across {financialSummary.summary.unique_clients} unique depositors</div>
            </div>

            <div className="ebi-kpi-card">
              <span className="ebi-kpi-title">Gateway Fees Paid</span>
              <div className="ebi-kpi-val" style={{ color: '#b45309' }}>
                {formatUGX(financialSummary.summary.total_gateway_fees)}
              </div>
              <div className="ebi-kpi-subtext">Aggregator processing deductions</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* By Account Type */}
            <div className="ebi-card">
              <div className="ebi-card-header">
                <h4 className="ebi-card-title">Collections by Scheme Account Type</h4>
              </div>
              <table className="ebi-table">
                <thead>
                  <tr>
                    <th>Scheme Type</th>
                    <th>Gross Volume</th>
                    <th>Transactions</th>
                    <th>Clients</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(financialSummary.by_account_type).map(([type, stats]) => (
                    <tr key={type}>
                      <td>
                        <strong style={{ color: '#0284c7' }}>{type.replace('_', ' ')}</strong>
                      </td>
                      <td style={{ fontWeight: 700 }}>{formatUGX(stats.revenue)}</td>
                      <td>{stats.transactions}</td>
                      <td>{stats.clients}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* By Payment Method */}
            <div className="ebi-card">
              <div className="ebi-card-header">
                <h4 className="ebi-card-title">Payment Method & Channel Share</h4>
              </div>
              <table className="ebi-table">
                <thead>
                  <tr>
                    <th>Channel</th>
                    <th>Volume (UGX)</th>
                    <th>Share %</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(financialSummary.by_payment_method).map(([method, data]) => (
                    <tr key={method}>
                      <td>
                        <span className="ebi-badge ebi-badge-blue">{method.replace('_', ' ').toUpperCase()}</span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{formatUGX(data.revenue)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{data.percentage_of_volume}%</span>
                          <div className="ebi-progress-bar-bg" style={{ width: '60px' }}>
                            <div className="ebi-progress-bar-fill" style={{ width: `${data.percentage_of_volume}%` }} />
                          </div>
                        </div>
                      </td>
                      <td>{data.transactions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Time Series Trajectory Table */}
          <div className="ebi-card">
            <div className="ebi-card-header">
              <h4 className="ebi-card-title">Time-Series Collection Velocity ({financialSummary.period.from} to {financialSummary.period.to})</h4>
            </div>
            <div className="ebi-table-container">
              <table className="ebi-table">
                <thead>
                  <tr>
                    <th>Date / Period</th>
                    <th>Gross Revenue</th>
                    <th>Transactions Settled</th>
                    <th>Velocity Meter</th>
                  </tr>
                </thead>
                <tbody>
                  {financialSummary.time_series_breakdown.map((row) => (
                    <tr key={row.date}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.date}</td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{formatUGX(row.revenue)}</td>
                      <td>{row.transactions}</td>
                      <td>
                        <div className="ebi-progress-bar-bg" style={{ width: '120px' }}>
                          <div
                            className="ebi-progress-bar-fill"
                            style={{
                              width: `${
                                financialSummary.summary.total_revenue > 0
                                  ? Math.min(100, (row.revenue / (financialSummary.summary.total_revenue / 10)) * 100)
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* VIEW 2: CLIENT ACTIVITY & LEADERBOARD */}
      {subview === 'clients' && clientActivity && (
        <>
          <div className="ebi-kpi-grid">
            <div className="ebi-kpi-card">
              <span className="ebi-kpi-title">Total Registered Clients</span>
              <div className="ebi-kpi-val">{clientActivity.summary.total_clients}</div>
              <div className="ebi-kpi-subtext">All time registered profiles</div>
            </div>

            <div className="ebi-kpi-card">
              <span className="ebi-kpi-title">New Period Enrollments</span>
              <div className="ebi-kpi-val" style={{ color: '#16a34a' }}>
                +{clientActivity.summary.new_clients}
              </div>
              <div className="ebi-kpi-subtext">Registered in selected window</div>
            </div>

            <div className="ebi-kpi-card">
              <span className="ebi-kpi-title">Active Transacting Clients</span>
              <div className="ebi-kpi-val" style={{ color: '#0284c7' }}>
                {clientActivity.summary.active_clients}
              </div>
              <div className="ebi-kpi-subtext">Deposited within period</div>
            </div>

            <div className="ebi-kpi-card">
              <span className="ebi-kpi-title">KYC Verified Profiles</span>
              <div className="ebi-kpi-val" style={{ color: '#059669' }}>
                {clientActivity.summary.kyc_verified_count}
              </div>
              <div className="ebi-kpi-subtext">{clientActivity.summary.kyc_pending_count} pending documentation</div>
            </div>

            <div className="ebi-kpi-card">
              <span className="ebi-kpi-title">Portfolio Churn Rate</span>
              <div className="ebi-kpi-val" style={{ color: clientActivity.summary.churn_rate_percentage > 20 ? '#dc2626' : '#16a34a' }}>
                {clientActivity.summary.churn_rate_percentage}%
              </div>
              <div className="ebi-kpi-subtext">{clientActivity.summary.dormant_clients} dormant clients (&gt;60d)</div>
            </div>
          </div>

          <div className="ebi-card">
            <div className="ebi-card-header">
              <h4 className="ebi-card-title">Top Depositors & Scheme Leaders</h4>
            </div>
            <div className="ebi-table-container">
              <table className="ebi-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Client Number</th>
                    <th>Client Name</th>
                    <th>Contact Details</th>
                    <th>Total Deposits</th>
                    <th>Transactions</th>
                    <th>Active Schemes</th>
                    <th>Allocated Plots</th>
                    <th>Last Active Date</th>
                  </tr>
                </thead>
                <tbody>
                  {clientActivity.top_clients.map((c, idx) => (
                    <tr key={c.client_id}>
                      <td>
                        <span className="ebi-badge ebi-badge-purple">#{idx + 1}</span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{c.client_number}</td>
                      <td>
                        <strong>{c.name}</strong>
                      </td>
                      <td>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          <div>{c.email || 'No email'}</div>
                          <div>{c.phone || 'No phone'}</div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 800, color: '#16a34a' }}>{formatUGX(c.total_deposits)}</td>
                      <td>{c.transaction_count}</td>
                      <td>
                        <span className="ebi-badge ebi-badge-blue">{c.active_schemes} Schemes</span>
                      </td>
                      <td>
                        <span className="ebi-badge ebi-badge-green">{c.allocated_plots} Plots</span>
                      </td>
                      <td style={{ color: '#64748b' }}>
                        {c.last_deposit_at ? new Date(c.last_deposit_at).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* VIEW 3: PLOT ALLOCATION & ESTATES */}
      {subview === 'plots' && plotAllocation && (
        <>
          <div className="ebi-kpi-grid">
            <div className="ebi-kpi-card">
              <span className="ebi-kpi-title">Total Estate Inventory</span>
              <div className="ebi-kpi-val">{plotAllocation.summary.total_plots} Plots</div>
              <div className="ebi-kpi-subtext">Across {plotAllocation.by_estate.length} commercial estates</div>
            </div>

            <div className="ebi-kpi-card">
              <span className="ebi-kpi-title">Allocation Progress</span>
              <div className="ebi-kpi-val" style={{ color: '#0284c7' }}>
                {plotAllocation.summary.allocation_rate_percentage}%
              </div>
              <div className="ebi-progress-bar-bg">
                <div
                  className="ebi-progress-bar-fill"
                  style={{ width: `${plotAllocation.summary.allocation_rate_percentage}%` }}
                />
              </div>
            </div>

            <div className="ebi-kpi-card">
              <span className="ebi-kpi-title">Total Portfolio Value</span>
              <div className="ebi-kpi-val">{formatUGX(plotAllocation.summary.total_inventory_value)}</div>
              <div className="ebi-kpi-subtext">Valuation of all mapped plots</div>
            </div>

            <div className="ebi-kpi-card">
              <span className="ebi-kpi-title">Realized Collections</span>
              <div className="ebi-kpi-val" style={{ color: '#16a34a' }}>
                {formatUGX(plotAllocation.summary.realized_collections)}
              </div>
              <div className="ebi-kpi-subtext">Paid client downpayments</div>
            </div>

            <div className="ebi-kpi-card">
              <span className="ebi-kpi-title">Outstanding Receivables</span>
              <div className="ebi-kpi-val" style={{ color: '#b45309' }}>
                {formatUGX(plotAllocation.summary.outstanding_receivables)}
              </div>
              <div className="ebi-kpi-subtext">Pending installment contracts</div>
            </div>
          </div>

          <div className="ebi-card">
            <div className="ebi-card-header">
              <h4 className="ebi-card-title">Estate-by-Estate Land Inventory & Allocation Audit</h4>
            </div>
            <div className="ebi-table-container">
              <table className="ebi-table">
                <thead>
                  <tr>
                    <th>Estate Name</th>
                    <th>Code</th>
                    <th>Location</th>
                    <th>Total Plots</th>
                    <th>Available</th>
                    <th>Reserved</th>
                    <th>Allocated</th>
                    <th>Handed Over</th>
                    <th>Allocation Rate</th>
                    <th>Inventory Value</th>
                    <th>Receivables Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {plotAllocation.by_estate.map((site) => (
                    <tr key={site.site_id}>
                      <td>
                        <strong>{site.site_name}</strong>
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>{site.site_code}</td>
                      <td>{site.location}</td>
                      <td>{site.total_plots}</td>
                      <td>
                        <span className="ebi-badge ebi-badge-blue">{site.available_plots} Available</span>
                      </td>
                      <td>
                        <span className="ebi-badge ebi-badge-amber">{site.reserved_plots} Reserved</span>
                      </td>
                      <td>
                        <span className="ebi-badge ebi-badge-green">{site.allocated_plots} Allocated</span>
                      </td>
                      <td>
                        <span className="ebi-badge ebi-badge-purple">{site.handed_over_plots} Handed Over</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700 }}>{site.allocation_rate_percentage}%</span>
                          <div className="ebi-progress-bar-bg" style={{ width: '50px' }}>
                            <div className="ebi-progress-bar-fill" style={{ width: `${site.allocation_rate_percentage}%` }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 700 }}>{formatUGX(site.total_inventory_value)}</td>
                      <td style={{ fontWeight: 700, color: '#dc2626' }}>{formatUGX(site.outstanding_receivables)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* VIEW 4: CONSTRUCTION MILESTONES & HEALTH */}
      {subview === 'construction' && constructionProgress && (
        <>
          <div className="ebi-kpi-grid">
            <div className="ebi-kpi-card">
              <span className="ebi-kpi-title">Active Projects</span>
              <div className="ebi-kpi-val">{constructionProgress.summary.total_projects} Projects</div>
              <div className="ebi-kpi-subtext">Residential & infrastructure</div>
            </div>

            <div className="ebi-kpi-card">
              <span className="ebi-kpi-title">Milestones Tracked</span>
              <div className="ebi-kpi-val">{constructionProgress.summary.total_milestones}</div>
              <div className="ebi-kpi-subtext">
                {constructionProgress.summary.completed_milestones} completed • {constructionProgress.summary.in_progress_milestones} in progress
              </div>
            </div>

            <div className="ebi-kpi-card">
              <span className="ebi-kpi-title">Delayed Milestones</span>
              <div className="ebi-kpi-val" style={{ color: constructionProgress.summary.delayed_milestones > 0 ? '#dc2626' : '#16a34a' }}>
                {constructionProgress.summary.delayed_milestones}
              </div>
              <div className="ebi-kpi-subtext">Past target completion deadline</div>
            </div>

            <div className="ebi-kpi-card">
              <span className="ebi-kpi-title">Total Project Budgets</span>
              <div className="ebi-kpi-val">{formatUGX(constructionProgress.summary.total_construction_budget)}</div>
              <div className="ebi-kpi-subtext">Certified cost: {formatUGX(constructionProgress.summary.total_certified_cost)}</div>
            </div>

            <div className="ebi-kpi-card">
              <span className="ebi-kpi-title">Budget Utilization</span>
              <div className="ebi-kpi-val" style={{ color: '#0284c7' }}>
                {constructionProgress.summary.budget_utilization_percentage}%
              </div>
              <div className="ebi-progress-bar-bg">
                <div
                  className="ebi-progress-bar-fill"
                  style={{ width: `${Math.min(100, constructionProgress.summary.budget_utilization_percentage)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="ebi-card">
            <div className="ebi-card-header">
              <h4 className="ebi-card-title">Project Health Scorecard & Schedule Adherence</h4>
            </div>
            <div className="ebi-table-container">
              <table className="ebi-table">
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>Estate / Site</th>
                    <th>Health Status</th>
                    <th>Completion %</th>
                    <th>Total Budget</th>
                    <th>Certified Cost</th>
                    <th>Cost Variance</th>
                    <th>Milestones (Total / Done / Delayed)</th>
                    <th>Target Date</th>
                  </tr>
                </thead>
                <tbody>
                  {constructionProgress.by_project.map((proj) => (
                    <tr key={proj.project_id}>
                      <td>
                        <strong>{proj.project_name}</strong>
                      </td>
                      <td>{proj.site_name}</td>
                      <td>
                        <span
                          className={`ebi-badge ebi-badge-${
                            proj.health_status === 'on_track'
                              ? 'green'
                              : proj.health_status === 'at_risk'
                              ? 'amber'
                              : 'red'
                          }`}
                        >
                          {proj.health_status === 'on_track' ? <MdCheckCircle /> : proj.health_status === 'at_risk' ? <MdWarning /> : <MdError />}
                          {proj.health_status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700 }}>{proj.completion_percentage}%</span>
                          <div className="ebi-progress-bar-bg" style={{ width: '50px' }}>
                            <div className="ebi-progress-bar-fill" style={{ width: `${proj.completion_percentage}%` }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatUGX(proj.budget)}</td>
                      <td style={{ fontWeight: 600 }}>{formatUGX(proj.actual_cost)}</td>
                      <td style={{ fontWeight: 700, color: proj.variance < 0 ? '#dc2626' : '#16a34a' }}>
                        {formatUGX(proj.variance)}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>
                          {proj.milestones_total} / {proj.milestones_completed} /{' '}
                          <span style={{ color: proj.milestones_delayed > 0 ? '#dc2626' : '#64748b' }}>
                            {proj.milestones_delayed}
                          </span>
                        </span>
                      </td>
                      <td style={{ color: '#64748b' }}>{proj.target_completion_date || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* VIEW 5: SCHEDULED AUTOMATIONS */}
      {subview === 'schedules' && (
        <div className="ebi-card">
          <div className="ebi-card-header">
            <h4 className="ebi-card-title">Recurring Executive Report Distribution Schedules</h4>
            <button className="btn-primary" onClick={() => setShowScheduleModal(true)}>
              <MdAdd /> Create Schedule
            </button>
          </div>
          <div className="ebi-table-container">
            <table className="ebi-table">
              <thead>
                <tr>
                  <th>Schedule Name</th>
                  <th>Report Type</th>
                  <th>Cadence</th>
                  <th>Export Format</th>
                  <th>Recipients</th>
                  <th>Active Status</th>
                  <th>Last Executed</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                      No scheduled reports configured. Click "Create Schedule" above.
                    </td>
                  </tr>
                ) : (
                  schedules.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.name}</strong>
                      </td>
                      <td>
                        <span className="ebi-badge ebi-badge-blue">
                          {s.report_type.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className="ebi-badge ebi-badge-purple">{s.frequency.toUpperCase()}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{s.format.toUpperCase()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {s.recipients.map((em, i) => (
                            <span key={i} className="ebi-badge" style={{ background: '#f1f5f9', color: '#334155' }}>
                              {em}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className={`ebi-badge ebi-badge-${s.is_active ? 'green' : 'amber'}`}>
                          {s.is_active ? 'ACTIVE' : 'PAUSED'}
                        </span>
                      </td>
                      <td style={{ color: '#64748b' }}>
                        {s.last_sent_at ? new Date(s.last_sent_at).toLocaleString() : 'Pending Next Cycle'}
                      </td>
                      <td>
                        <button
                          className="btn-secondary"
                          onClick={() => handleToggleSchedule(s.id)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {s.is_active ? <MdToggleOn size={16} color="#16a34a" /> : <MdToggleOff size={16} color="#94a3b8" />}
                          {s.is_active ? 'Pause' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE SCHEDULE MODAL */}
      {showScheduleModal && (
        <div className="ebi-modal-backdrop">
          <div className="ebi-modal-card">
            <div className="ebi-modal-header">
              <h3 style={{ margin: 0, fontSize: '17px', color: '#0f172a' }}>
                New Scheduled Report Delivery Automation
              </h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
              >
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleCreateScheduleSubmit} className="ebi-modal-body">
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Automation Title <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekly Management Financial Briefing"
                  value={scheduleName}
                  onChange={(e) => setScheduleName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Report Dataset
                  </label>
                  <select
                    value={scheduleType}
                    onChange={(e) => setScheduleType(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="financial_summary">Executive Financial Summary</option>
                    <option value="client_activity">Client Activity & Leaderboard</option>
                    <option value="plot_allocation">Plot Allocation & Estates</option>
                    <option value="construction_progress">Construction Progress & Health</option>
                    <option value="cash_flow">Cash Flow Statement</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Frequency / Cadence
                  </label>
                  <select
                    value={scheduleFreq}
                    onChange={(e) => setScheduleFreq(e.target.value as any)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="daily">Daily Briefing</option>
                    <option value="weekly">Weekly Summary</option>
                    <option value="monthly">Monthly Board Pack</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  File Format
                </label>
                <select
                  value={scheduleFormat}
                  onChange={(e) => setScheduleFormat(e.target.value as any)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  <option value="both">Both CSV & PDF</option>
                  <option value="csv">CSV Spreadsheet Only</option>
                  <option value="pdf">PDF Document Only</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Recipient Email Addresses (comma separated) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. director@fabhomes.ug, cfo@fabhomes.ug"
                  value={scheduleRecipients}
                  onChange={(e) => setScheduleRecipients(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowScheduleModal(false)}
                  disabled={scheduleSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={scheduleSubmitting || !scheduleName || !scheduleRecipients}
                >
                  {scheduleSubmitting ? 'Creating...' : 'Confirm Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT-READY MODAL */}
      {showPrintModal && printData && (
        <div className="ebi-modal-backdrop">
          <div className="ebi-modal-card" style={{ maxWidth: '800px' }}>
            <div className="ebi-modal-header">
              <div>
                <h3 style={{ margin: '0 0 2px 0', fontSize: '18px', color: '#0f172a' }}>
                  {printData.title}
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {printData.organization.name} • {printData.organization.system}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn-primary"
                  onClick={() => window.print()}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 12px' }}
                >
                  <MdPrint /> Print Now
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
                >
                  <MdClose />
                </button>
              </div>
            </div>

            <div className="ebi-modal-body">
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '16px',
                  marginBottom: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                }}
              >
                <div>
                  <strong>Generated At:</strong> {new Date(printData.organization.generated_at).toLocaleString()}
                </div>
                <div>
                  <strong>Currency:</strong> {printData.organization.currency}
                </div>
                <div>
                  <strong>Official Digital Document</strong>
                </div>
              </div>

              <pre
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '16px',
                  fontSize: '12px',
                  overflowX: 'auto',
                  maxHeight: '400px',
                }}
              >
                {JSON.stringify(printData.report, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExecutiveBiAnalyticsTab
