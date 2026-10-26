import React, { useState, useEffect, useCallback } from 'react'
import {
  MdShield,
  MdFactCheck,
  MdCheckCircle,
  MdWarning,
  MdErrorOutline,
  MdSearch,
  MdVisibility,
  MdRefresh,
  MdClose,
  MdAttachMoney,
  MdHandyman,
  MdHistory,
  MdDraw,
  MdTrendingDown,
  MdVerified,
} from 'react-icons/md'
import retentionFundService from '../../../services/retention-fund.service'
import {
  RetentionFund,
  DefectLiabilityCertificate,
  RetentionPortfolioStats,
  SnagAuditSummary,
} from '../../../types/retention-fund.types'
import { Project } from '../../../types/project.types'

interface RetentionFundsTabProps {
  projects: Project[]
  filterProject: string
  formatCurrency: (amount: number | string | undefined | null, currency?: string) => string
  onFundUpdated?: () => void
}

export const RetentionFundsTab: React.FC<RetentionFundsTabProps> = ({
  projects,
  filterProject,
  formatCurrency,
  onFundUpdated,
}) => {
  // Sub-view: 'funds' | 'certificates'
  const [subView, setSubView] = useState<'funds' | 'certificates'>('funds')

  // Data states
  const [funds, setFunds] = useState<RetentionFund[]>([])
  const [certificates, setCertificates] = useState<DefectLiabilityCertificate[]>([])
  const [stats, setStats] = useState<RetentionPortfolioStats | null>(null)

  // Loading & error states
  const [loading, setLoading] = useState<boolean>(true)
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState<string>('')
  const [projectFilter, setProjectFilter] = useState<string>(filterProject || '')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [certTypeFilter, setCertTypeFilter] = useState<string>('')

  useEffect(() => {
    setProjectFilter(filterProject || '')
  }, [filterProject])

  // Selected entities for modals
  const [selectedFund, setSelectedFund] = useState<RetentionFund | null>(null)
  const [selectedCert, setSelectedCert] = useState<DefectLiabilityCertificate | null>(null)
  const [snagAudit, setSnagAudit] = useState<SnagAuditSummary | null>(null)
  const [snagAuditLoading, setSnagAuditLoading] = useState<boolean>(false)

  // Modal display toggles
  const [showPccModal, setShowPccModal] = useState<boolean>(false)
  const [showDeductionModal, setShowDeductionModal] = useState<boolean>(false)
  const [showReleaseModal, setShowReleaseModal] = useState<boolean>(false)
  const [showDccModal, setShowDccModal] = useState<boolean>(false)
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false)
  const [showCertDetailModal, setShowCertDetailModal] = useState<boolean>(false)

  // Form states
  const [pccForm, setPccForm] = useState({
    commencement_date: new Date().toISOString().slice(0, 10),
    dlp_period_days: 180,
    release_percentage: 50,
    inspection_notes: 'Practical completion achieved in compliance with approved drawings and specifications.',
    certificate_notes: '',
  })

  const [deductionForm, setDeductionForm] = useState({
    amount: '',
    reason: '',
    rectification_notes: '',
  })

  const [releaseForm, setReleaseForm] = useState<{
    amount: string
    release_type: 'interim_release' | 'final_release'
    notes: string
  }>({
    amount: '',
    release_type: 'final_release',
    notes: 'Final retention pool payout following successful defect liability inspection and snag verification.',
  })

  const [dccNotes, setDccNotes] = useState(
    'End of Defect Liability Period audit complete. 100% snags resolved and signed off.'
  )

  // Load portfolio stats
  const loadStats = useCallback(async () => {
    try {
      const res = await retentionFundService.getStatistics(projectFilter || undefined)
      setStats(res)
    } catch (err: any) {
      console.error('Failed to load retention stats', err)
    }
  }, [projectFilter])

  // Load retention funds
  const loadFunds = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await retentionFundService.getRetentionFunds({
        project_id: projectFilter || undefined,
        status: statusFilter || undefined,
        beneficiary_type: typeFilter || undefined,
        search: search || undefined,
        per_page: 50,
      })
      setFunds(res.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load retention funds')
    } finally {
      setLoading(false)
    }
  }, [projectFilter, statusFilter, typeFilter, search])

  // Load certificates
  const loadCertificates = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await retentionFundService.getDefectCertificates({
        project_id: projectFilter || undefined,
        certificate_type: certTypeFilter || undefined,
        per_page: 50,
      })
      setCertificates(res.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load defect certificates')
    } finally {
      setLoading(false)
    }
  }, [projectFilter, certTypeFilter])

  // Reload active data
  const refreshAll = useCallback(() => {
    loadStats()
    if (subView === 'funds') {
      loadFunds()
    } else {
      loadCertificates()
    }
    if (onFundUpdated) onFundUpdated()
  }, [loadStats, loadFunds, loadCertificates, subView, onFundUpdated])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    if (subView === 'funds') {
      loadFunds()
    } else {
      loadCertificates()
    }
  }, [subView, loadFunds, loadCertificates])

  // Handlers: Issue PCC
  const handleOpenPcc = (fund: RetentionFund) => {
    setSelectedFund(fund)
    setPccForm({
      commencement_date: new Date().toISOString().slice(0, 10),
      dlp_period_days: fund.dlp_period_days || 180,
      release_percentage: 50,
      inspection_notes: 'Practical completion achieved in compliance with approved drawings and specifications.',
      certificate_notes: `FIDIC Practical Completion Certificate for ${fund.beneficiary_name}`,
    })
    setShowPccModal(true)
  }

  const handleSubmitPcc = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFund) return
    try {
      setActionLoading(true)
      setError(null)
      await retentionFundService.createDefectCertificate({
        certificate_type: 'practical_completion',
        retention_fund_id: selectedFund.id,
        commencement_date: pccForm.commencement_date,
        dlp_period_days: Number(pccForm.dlp_period_days),
        release_percentage: Number(pccForm.release_percentage),
        inspection_notes: pccForm.inspection_notes,
        certificate_notes: pccForm.certificate_notes,
      })
      setSuccessMsg(`Practical Completion Certificate issued for fund ${selectedFund.fund_number}. DLP commenced!`)
      setShowPccModal(false)
      refreshAll()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to issue Practical Completion Certificate')
    } finally {
      setActionLoading(false)
    }
  }

  // Handlers: Record Rectification Deduction
  const handleOpenDeduction = (fund: RetentionFund) => {
    setSelectedFund(fund)
    setDeductionForm({
      amount: '',
      reason: '',
      rectification_notes: '',
    })
    setShowDeductionModal(true)
  }

  const handleSubmitDeduction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFund || !deductionForm.amount || !deductionForm.reason) {
      setError('Please provide deduction amount and reason.')
      return
    }
    try {
      setActionLoading(true)
      setError(null)
      await retentionFundService.recordRectificationDeduction(selectedFund.uuid, {
        amount: Number(deductionForm.amount),
        reason: deductionForm.reason,
        rectification_notes: deductionForm.rectification_notes,
      })
      setSuccessMsg(`Rectification deduction of ${formatCurrency(deductionForm.amount, selectedFund.currency)} recorded against ${selectedFund.fund_number}.`)
      setShowDeductionModal(false)
      refreshAll()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record deduction')
    } finally {
      setActionLoading(false)
    }
  }

  // Handlers: Issue Defect Clearance Certificate (DCC)
  const handleOpenDcc = async (fund: RetentionFund) => {
    setSelectedFund(fund)
    setShowDccModal(true)
    setSnagAuditLoading(true)
    setSnagAudit(null)
    try {
      // Find latest certificate or fetch schedule
      const sched = await retentionFundService.getMaturitySchedule(fund.uuid)
      setSnagAudit({
        project_id: fund.project_id,
        contract_id: fund.contract_id,
        total_snags: sched.open_snags_count + sched.resolved_snags_count,
        open_snags: sched.open_snags_count,
        rectified_snags: 0,
        verified_closed_snags: sched.resolved_snags_count,
        all_cleared: sched.open_snags_count === 0,
      })
    } catch (err: any) {
      console.error('Failed to load snag audit for DCC', err)
    } finally {
      setSnagAuditLoading(false)
    }
  }

  const handleSubmitDcc = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFund) return
    try {
      setActionLoading(true)
      setError(null)
      await retentionFundService.createDefectCertificate({
        certificate_type: 'defect_clearance',
        retention_fund_id: selectedFund.id,
        inspection_notes: dccNotes,
      })
      setSuccessMsg(`Defect Clearance Certificate issued! Fund ${selectedFund.fund_number} is now eligible for final release.`)
      setShowDccModal(false)
      refreshAll()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to issue Defect Clearance Certificate')
    } finally {
      setActionLoading(false)
    }
  }

  // Handlers: Release Retention Funds
  const handleOpenRelease = (fund: RetentionFund, type: 'interim_release' | 'final_release' = 'final_release') => {
    setSelectedFund(fund)
    setReleaseForm({
      amount: String(fund.current_balance),
      release_type: type,
      notes: type === 'final_release'
        ? 'Final retention release disbursement following Defect Liability Certificate sign-off.'
        : 'Interim retention release upon Practical Completion.',
    })
    setShowReleaseModal(true)
  }

  const handleSubmitRelease = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFund) return
    try {
      setActionLoading(true)
      setError(null)
      await retentionFundService.releaseRetention(selectedFund.uuid, {
        amount: releaseForm.amount ? Number(releaseForm.amount) : undefined,
        release_type: releaseForm.release_type,
        notes: releaseForm.notes,
      })
      setSuccessMsg(`Retention disbursement of ${formatCurrency(releaseForm.amount, selectedFund.currency)} processed successfully with double-entry ledger entry.`)
      setShowReleaseModal(false)
      refreshAll()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to release retention')
    } finally {
      setActionLoading(false)
    }
  }

  // Handlers: View History
  const handleOpenHistory = async (fund: RetentionFund) => {
    try {
      setActionLoading(true)
      const detailed = await retentionFundService.getRetentionFund(fund.uuid)
      setSelectedFund(detailed)
      setShowHistoryModal(true)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load fund history')
    } finally {
      setActionLoading(false)
    }
  }

  // Handlers: Sign Certificate
  const handleSignCert = async (cert: DefectLiabilityCertificate, role: 'engineer' | 'qs' | 'client') => {
    try {
      setActionLoading(true)
      setError(null)
      const updated = await retentionFundService.signCertificate(cert.uuid, role)
      setSuccessMsg(`Certificate ${cert.certificate_number} signed by ${role.toUpperCase()} successfully.`)
      setSelectedCert(updated)
      refreshAll()
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to sign certificate as ${role}`)
    } finally {
      setActionLoading(false)
    }
  }

  // Handlers: View Certificate Detail
  const handleOpenCertDetail = async (cert: DefectLiabilityCertificate) => {
    try {
      setActionLoading(true)
      const detailed = await retentionFundService.getDefectCertificate(cert.uuid)
      setSelectedCert(detailed)
      setShowCertDetailModal(true)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load certificate details')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="retention-funds-tab-container">
      {/* Messages */}
      {error && (
        <div className="milestone-alert danger">
          <MdErrorOutline style={{ fontSize: '1.25rem' }} />
          <span>{error}</span>
          <button className="alert-close-btn" onClick={() => setError(null)}>
            <MdClose />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="milestone-alert success">
          <MdCheckCircle style={{ fontSize: '1.25rem' }} />
          <span>{successMsg}</span>
          <button className="alert-close-btn" onClick={() => setSuccessMsg(null)}>
            <MdClose />
          </button>
        </div>
      )}

      {/* KPI Cards for Retention Portfolio */}
      <div className="milestone-kpi-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="kpi-stat-card">
          <div className="kpi-stat-header">
            <span className="kpi-stat-title">Total Retention Withheld</span>
            <span className="kpi-stat-icon purple">
              <MdShield />
            </span>
          </div>
          <div className="kpi-stat-val">{formatCurrency(stats?.total_withheld, stats?.currency)}</div>
          <div className="kpi-stat-sub">
            Total 5% defect pool accumulated across contracts & milestones
          </div>
        </div>

        <div className="kpi-stat-card">
          <div className="kpi-stat-header">
            <span className="kpi-stat-title">Active Retention Held</span>
            <span className="kpi-stat-icon blue">
              <MdAttachMoney />
            </span>
          </div>
          <div className="kpi-stat-val">{formatCurrency(stats?.total_held_balance, stats?.currency)}</div>
          <div className="kpi-stat-sub">
            {stats?.active_funds_count ?? 0} active retention pool accounts
          </div>
        </div>

        <div className="kpi-stat-card">
          <div className="kpi-stat-header">
            <span className="kpi-stat-title">Rectification Deductions</span>
            <span className="kpi-stat-icon amber">
              <MdTrendingDown />
            </span>
          </div>
          <div className="kpi-stat-val">{formatCurrency(stats?.total_deductions, stats?.currency)}</div>
          <div className="kpi-stat-sub">3rd-party defect repair charges offset</div>
        </div>

        <div className="kpi-stat-card">
          <div className="kpi-stat-header">
            <span className="kpi-stat-title">Total Retention Released</span>
            <span className="kpi-stat-icon green">
              <MdCheckCircle />
            </span>
          </div>
          <div className="kpi-stat-val">{formatCurrency(stats?.total_released, stats?.currency)}</div>
          <div className="kpi-stat-sub">
            Release Rate: {stats?.overall_release_rate ?? 0}% &bull; Matured: {stats?.matured_ready_count ?? 0} ready
          </div>
        </div>
      </div>

      {/* Sub-view Navigation & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn ${subView === 'funds' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setSubView('funds')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}
          >
            <MdShield /> Retention Funds & DLP Schedule ({funds.length})
          </button>
          <button
            className={`btn ${subView === 'certificates' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setSubView('certificates')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}
          >
            <MdFactCheck /> Defect Certificates & Punch-list Audits ({certificates.length})
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            className="btn btn-outline"
            onClick={refreshAll}
            title="Refresh retention data"
            style={{ padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <MdRefresh /> Refresh
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="releases-toolbar" style={{ marginBottom: '1.25rem' }}>
        <div className="releases-search-box">
          <MdSearch style={{ color: '#94a3b8', fontSize: '1.2rem' }} />
          <input
            type="text"
            placeholder={
              subView === 'funds'
                ? 'Search by fund #, contractor, or project...'
                : 'Search by certificate # or contractor...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="releases-filter-select"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {subView === 'funds' ? (
          <>
            <select
              className="releases-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Fund Statuses</option>
              <option value="accumulating">Accumulating (Works Ongoing)</option>
              <option value="dlp_active">DLP Active (Warranty Period)</option>
              <option value="eligible_for_release">Eligible for Release (Snags Cleared)</option>
              <option value="partially_released">Partially Released</option>
              <option value="fully_released">Fully Released</option>
            </select>

            <select
              className="releases-filter-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Beneficiary Types</option>
              <option value="subcontractor">Trade Subcontractor</option>
              <option value="developer">Developer</option>
              <option value="client">Client</option>
            </select>
          </>
        ) : (
          <select
            className="releases-filter-select"
            value={certTypeFilter}
            onChange={(e) => setCertTypeFilter(e.target.value)}
          >
            <option value="">All Certificate Types</option>
            <option value="practical_completion">Practical Completion (PCC)</option>
            <option value="defect_clearance">Defect Clearance (DCC)</option>
            <option value="retention_release">Final Retention Release</option>
            <option value="final_handover">Final Handover Protocol</option>
          </select>
        )}
      </div>

      {/* Main Content: SUB-VIEW 1 - RETENTION FUNDS TABLE */}
      {subView === 'funds' && (
        <div className="milestone-table-card">
          <div className="table-responsive">
            <table className="milestone-data-table">
              <thead>
                <tr>
                  <th>Fund Number</th>
                  <th>Beneficiary / Trade</th>
                  <th>Project & Reference</th>
                  <th>Total Withheld</th>
                  <th>Deductions</th>
                  <th>Released</th>
                  <th>Current Balance</th>
                  <th>DLP / Warranty Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                      <div className="loading-spinner" style={{ margin: '0 auto 0.75rem' }} />
                      Loading retention funds and defect warranty schedules...
                    </td>
                  </tr>
                ) : funds.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                      <MdShield style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '0.5rem' }} />
                      <div>No retention funds found matching your criteria.</div>
                    </td>
                  </tr>
                ) : (
                  funds.map((f) => {
                    const daysLeft = f.days_remaining_in_dlp ?? 0
                    return (
                      <tr key={f.uuid}>
                        {/* Fund Number */}
                        <td>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{f.fund_number}</div>
                          <span className={`pill ${f.fund_type}`}>
                            {f.fund_type.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Beneficiary */}
                        <td>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{f.beneficiary_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'capitalize' }}>
                            {f.beneficiary_type}
                            {f.contract?.trade ? ` • ${f.contract.trade}` : ''}
                          </div>
                        </td>

                        {/* Project */}
                        <td>
                          <div style={{ fontWeight: 500, color: '#334155' }}>
                            {f.project?.name || 'General Project'}
                          </div>
                          {f.contract && (
                            <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#64748b' }}>
                              {f.contract.contract_number}
                            </div>
                          )}
                          {f.unit && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              Unit: {f.unit.unit_number}
                            </div>
                          )}
                        </td>

                        {/* Total Withheld */}
                        <td>
                          <div style={{ fontWeight: 600, color: '#334155' }}>
                            {formatCurrency(f.total_withheld_amount, f.currency)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Rate: {f.retention_rate}%
                          </div>
                        </td>

                        {/* Deductions */}
                        <td>
                          <div
                            style={{
                              fontWeight: 600,
                              color: Number(f.total_deductions_amount) > 0 ? '#dc2626' : '#64748b',
                            }}
                          >
                            {formatCurrency(f.total_deductions_amount, f.currency)}
                          </div>
                        </td>

                        {/* Released */}
                        <td>
                          <div style={{ fontWeight: 600, color: '#059669' }}>
                            {formatCurrency(f.total_released_amount, f.currency)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {f.release_rate_percentage}% paid
                          </div>
                        </td>

                        {/* Current Balance */}
                        <td>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: '0.95rem',
                              color: Number(f.current_balance) > 0 ? '#2563eb' : '#64748b',
                            }}
                          >
                            {formatCurrency(f.current_balance, f.currency)}
                          </div>
                        </td>

                        {/* DLP / Warranty Status */}
                        <td>
                          {f.status === 'accumulating' && (
                            <div>
                              <span className="pill pending">Accumulating</span>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                                Works Ongoing
                              </div>
                            </div>
                          )}

                          {f.status === 'dlp_active' && (
                            <div>
                              <span className="pill approved">DLP Active</span>
                              <div style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 600, marginTop: '0.2rem' }}>
                                {daysLeft > 0 ? `${daysLeft} days remaining` : 'Matured'}
                              </div>
                              {f.dlp_expiry_date && (
                                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                  Exp: {f.dlp_expiry_date.slice(0, 10)}
                                </div>
                              )}
                            </div>
                          )}

                          {f.status === 'eligible_for_release' && (
                            <div>
                              <span className="pill verified" style={{ background: '#dcfce7', color: '#15803d' }}>
                                <MdCheckCircle style={{ display: 'inline', marginRight: '3px' }} />
                                Eligible for Payout
                              </span>
                              <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, marginTop: '0.2rem' }}>
                                Snags 100% Cleared
                              </div>
                            </div>
                          )}

                          {f.status === 'partially_released' && (
                            <div>
                              <span className="pill review">Partially Released</span>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                                Interim 50% paid
                              </div>
                            </div>
                          )}

                          {f.status === 'fully_released' && (
                            <div>
                              <span className="pill verified">Fully Released</span>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                                Settled
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {/* Issue PCC if accumulating */}
                            {f.status === 'accumulating' && (
                              <button
                                className="action-icon-btn blue"
                                title="Issue Practical Completion Certificate (PCC) & Start DLP"
                                onClick={() => handleOpenPcc(f)}
                              >
                                <MdFactCheck />
                              </button>
                            )}

                            {/* Deduct defect costs */}
                            {Number(f.current_balance) > 0 && f.status !== 'fully_released' && (
                              <button
                                className="action-icon-btn red"
                                title="Record 3rd-Party Rectification Deduction"
                                onClick={() => handleOpenDeduction(f)}
                              >
                                <MdHandyman />
                              </button>
                            )}

                            {/* Snag Audit / Defect Clearance */}
                            {(f.status === 'dlp_active' || f.status === 'partially_released') && (
                              <button
                                className="action-icon-btn amber"
                                title="Conduct Snag Audit & Issue Defect Clearance Certificate"
                                onClick={() => handleOpenDcc(f)}
                              >
                                <MdVerified />
                              </button>
                            )}

                            {/* Release Retention */}
                            {Number(f.current_balance) > 0 &&
                              (f.status === 'eligible_for_release' || f.status === 'dlp_active' || f.status === 'partially_released') && (
                                <button
                                  className="action-icon-btn green"
                                  title="Disburse Retention Payout"
                                  onClick={() => handleOpenRelease(f, f.eligible_for_release ? 'final_release' : 'interim_release')}
                                >
                                  <MdAttachMoney />
                                </button>
                              )}

                            {/* History */}
                            <button
                              className="action-icon-btn gray"
                              title="View Retention Transaction Ledger History"
                              onClick={() => handleOpenHistory(f)}
                            >
                              <MdHistory />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Content: SUB-VIEW 2 - DEFECT LIABILITY CERTIFICATES TABLE */}
      {subView === 'certificates' && (
        <div className="milestone-table-card">
          <div className="table-responsive">
            <table className="milestone-data-table">
              <thead>
                <tr>
                  <th>Certificate #</th>
                  <th>Type</th>
                  <th>Project / Contractor</th>
                  <th>Retention Pool</th>
                  <th>Deductions</th>
                  <th>Net Release Amount</th>
                  <th>Snag Clearance</th>
                  <th>Signatures</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                      <div className="loading-spinner" style={{ margin: '0 auto 0.75rem' }} />
                      Loading Defect Liability Certificates...
                    </td>
                  </tr>
                ) : certificates.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                      <MdFactCheck style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '0.5rem' }} />
                      <div>No defect liability certificates found.</div>
                    </td>
                  </tr>
                ) : (
                  certificates.map((c) => (
                    <tr key={c.uuid}>
                      {/* Certificate # */}
                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{c.certificate_number}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {c.commencement_date ? c.commencement_date.slice(0, 10) : ''}
                        </div>
                      </td>

                      {/* Type */}
                      <td>
                        <span className={`pill ${c.certificate_type}`}>
                          {c.certificate_type.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Project / Contractor */}
                      <td>
                        <div style={{ fontWeight: 500, color: '#334155' }}>
                          {c.project?.name || 'General Project'}
                        </div>
                        {c.contract && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {c.contract.subcontractor_name}
                          </div>
                        )}
                      </td>

                      {/* Retention Pool */}
                      <td>
                        <div style={{ fontWeight: 600, color: '#334155' }}>
                          {formatCurrency(c.retention_pool_amount, c.currency)}
                        </div>
                      </td>

                      {/* Deductions */}
                      <td>
                        <div style={{ fontWeight: 600, color: Number(c.deductions_amount) > 0 ? '#dc2626' : '#64748b' }}>
                          {formatCurrency(c.deductions_amount, c.currency)}
                        </div>
                      </td>

                      {/* Net Release Amount */}
                      <td>
                        <div style={{ fontWeight: 700, color: '#059669' }}>
                          {formatCurrency(c.net_release_amount, c.currency)}
                        </div>
                      </td>

                      {/* Snag Clearance */}
                      <td>
                        {c.open_snags_count > 0 ? (
                          <span className="pill rejected" style={{ fontSize: '0.75rem' }}>
                            <MdWarning style={{ display: 'inline', marginRight: '3px' }} />
                            {c.open_snags_count} Open Snags
                          </span>
                        ) : (
                          <span className="pill verified" style={{ fontSize: '0.75rem' }}>
                            <MdCheckCircle style={{ display: 'inline', marginRight: '3px' }} />
                            {c.resolved_snags_count} Snags Resolved
                          </span>
                        )}
                      </td>

                      {/* Signatures */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.75rem' }}>
                          <div>
                            {c.engineer_signed_at ? (
                              <span style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <MdCheckCircle size={12} /> Eng Signed
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>○ Eng Pending</span>
                            )}
                          </div>
                          <div>
                            {c.qs_signed_at ? (
                              <span style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <MdCheckCircle size={12} /> QS Signed
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>○ QS Pending</span>
                            )}
                          </div>
                          <div>
                            {c.client_signed_at ? (
                              <span style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <MdCheckCircle size={12} /> Client Signed
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>○ Client Pending</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`pill ${c.status}`}>{c.status}</span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          {/* Sign button */}
                          {!c.engineer_signed_at && (
                            <button
                              className="action-icon-btn blue"
                              title="Sign as Site Engineer"
                              onClick={() => handleSignCert(c, 'engineer')}
                            >
                              <MdDraw />
                            </button>
                          )}
                          {!c.qs_signed_at && (
                            <button
                              className="action-icon-btn purple"
                              title="Sign as Quantity Surveyor"
                              onClick={() => handleSignCert(c, 'qs')}
                            >
                              <MdVerified />
                            </button>
                          )}
                          {!c.client_signed_at && (
                            <button
                              className="action-icon-btn green"
                              title="Sign as Client / Developer"
                              onClick={() => handleSignCert(c, 'client')}
                            >
                              <MdCheckCircle />
                            </button>
                          )}

                          {/* Detail View */}
                          <button
                            className="action-icon-btn gray"
                            title="View Full Certificate"
                            onClick={() => handleOpenCertDetail(c)}
                          >
                            <MdVisibility />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: ISSUE PRACTICAL COMPLETION CERTIFICATE (PCC)     */}
      {/* ========================================================= */}
      {showPccModal && selectedFund && (
        <div className="milestone-modal-overlay">
          <div className="milestone-modal-container" style={{ maxWidth: '600px' }}>
            <div className="milestone-modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <MdFactCheck style={{ color: '#2563eb' }} />
                Issue Practical Completion Certificate (FIDIC)
              </h3>
              <button className="modal-close-btn" onClick={() => setShowPccModal(false)}>
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleSubmitPcc}>
              <div className="milestone-modal-body">
                <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Retention Pool Account:</div>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>
                    {selectedFund.fund_number} &bull; {selectedFund.beneficiary_name}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: '0.25rem' }}>
                    Accumulated Retention Held:{' '}
                    <strong>{formatCurrency(selectedFund.total_withheld_amount, selectedFund.currency)}</strong>
                  </div>
                </div>

                <div className="milestone-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="form-group">
                    <label>Practical Completion Date *</label>
                    <input
                      type="date"
                      value={pccForm.commencement_date}
                      onChange={(e) => setPccForm({ ...pccForm, commencement_date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Defect Liability Period (Days) *</label>
                    <input
                      type="number"
                      min="30"
                      max="730"
                      value={pccForm.dlp_period_days}
                      onChange={(e) => setPccForm({ ...pccForm, dlp_period_days: Number(e.target.value) })}
                      required
                    />
                    <small style={{ color: '#64748b' }}>Standard FIDIC: 180 days (or 365)</small>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label>Initial Practical Completion Release %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={pccForm.release_percentage}
                    onChange={(e) => setPccForm({ ...pccForm, release_percentage: Number(e.target.value) })}
                  />
                  <small style={{ color: '#64748b' }}>
                    FIDIC standard releases 50% of retention upon PCC issuance, holding 50% until DLC maturity.
                  </small>
                </div>

                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label>Inspection Notes & Site Verification</label>
                  <textarea
                    rows={3}
                    value={pccForm.inspection_notes}
                    onChange={(e) => setPccForm({ ...pccForm, inspection_notes: e.target.value })}
                    placeholder="Enter site engineer and QS verification notes..."
                  />
                </div>

                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label>Certificate Notes (Optional)</label>
                  <textarea
                    rows={2}
                    value={pccForm.certificate_notes}
                    onChange={(e) => setPccForm({ ...pccForm, certificate_notes: e.target.value })}
                    placeholder="Reference FIDIC clause, contractor handover notes..."
                  />
                </div>
              </div>

              <div className="milestone-modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowPccModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Issuing...' : 'Issue PCC & Start DLP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: RECORD RECTIFICATION DEDUCTION                  */}
      {/* ========================================================= */}
      {showDeductionModal && selectedFund && (
        <div className="milestone-modal-overlay">
          <div className="milestone-modal-container" style={{ maxWidth: '520px' }}>
            <div className="milestone-modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <MdHandyman style={{ color: '#dc2626' }} />
                Record 3rd-Party Rectification Deduction
              </h3>
              <button className="modal-close-btn" onClick={() => setShowDeductionModal(false)}>
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleSubmitDeduction}>
              <div className="milestone-modal-body">
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', color: '#991b1b', fontSize: '0.85rem' }}>
                  This action deducts defect repair costs incurred by a third-party contractor from the subcontractor's retention pool. This is recorded on the ledger.
                </div>

                <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Beneficiary & Balance:</div>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedFund.beneficiary_name}</div>
                  <div style={{ fontSize: '0.85rem', color: '#2563eb', fontWeight: 600, marginTop: '0.2rem' }}>
                    Current Retention Balance: {formatCurrency(selectedFund.current_balance, selectedFund.currency)}
                  </div>
                </div>

                <div className="form-group">
                  <label>Deduction Amount ({selectedFund.currency}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    max={Number(selectedFund.current_balance)}
                    value={deductionForm.amount}
                    onChange={(e) => setDeductionForm({ ...deductionForm, amount: e.target.value })}
                    required
                    placeholder="e.g. 500.00"
                  />
                </div>

                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label>Defect Description / Reason *</label>
                  <input
                    type="text"
                    value={deductionForm.reason}
                    onChange={(e) => setDeductionForm({ ...deductionForm, reason: e.target.value })}
                    required
                    placeholder="e.g. Failure to repair bathroom plumbing leak; 3rd-party plumber engaged"
                  />
                </div>

                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label>Rectification Invoice / Inspection Notes</label>
                  <textarea
                    rows={3}
                    value={deductionForm.rectification_notes}
                    onChange={(e) => setDeductionForm({ ...deductionForm, rectification_notes: e.target.value })}
                    placeholder="Enter 3rd-party invoice reference or QS justification..."
                  />
                </div>
              </div>

              <div className="milestone-modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowDeductionModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#dc2626', borderColor: '#dc2626' }} disabled={actionLoading}>
                  {actionLoading ? 'Recording...' : 'Authorize Deduction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: DEFECT CLEARANCE CERTIFICATE & SNAG AUDIT        */}
      {/* ========================================================= */}
      {showDccModal && selectedFund && (
        <div className="milestone-modal-overlay">
          <div className="milestone-modal-container" style={{ maxWidth: '580px' }}>
            <div className="milestone-modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <MdVerified style={{ color: '#059669' }} />
                Defect Clearance Certificate (DCC) & Snag Audit
              </h3>
              <button className="modal-close-btn" onClick={() => setShowDccModal(false)}>
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleSubmitDcc}>
              <div className="milestone-modal-body">
                <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Fund:</div>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>
                    {selectedFund.fund_number} &bull; {selectedFund.beneficiary_name}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: '0.2rem' }}>
                    DLP Warranty Expiry:{' '}
                    <strong>{selectedFund.dlp_expiry_date ? selectedFund.dlp_expiry_date.slice(0, 10) : 'N/A'}</strong>
                  </div>
                </div>

                {/* Live Snag Audit Section */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '1rem', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#1e293b' }}>
                    Punch-list / Defect Clearance Verification
                  </div>

                  {snagAuditLoading ? (
                    <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                      Auditing open snag items against warranty pool...
                    </div>
                  ) : snagAudit ? (
                    <div>
                      {snagAudit.open_snags > 0 ? (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '0.75rem', borderRadius: '6px', color: '#b91c1c', fontSize: '0.85rem' }}>
                          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <MdWarning /> Cannot Issue DCC: {snagAudit.open_snags} Open Snag(s) Remain!
                          </div>
                          <div style={{ marginTop: '0.25rem' }}>
                            All reported punch-list defects must be rectified and closed by the Site Engineer before the Defect Clearance Certificate can be issued.
                          </div>
                        </div>
                      ) : (
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.75rem', borderRadius: '6px', color: '#15803d', fontSize: '0.85rem' }}>
                          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <MdCheckCircle /> 100% Snags Resolved & Cleared!
                          </div>
                          <div style={{ marginTop: '0.25rem' }}>
                            {snagAudit.verified_closed_snags} defect(s) verified closed. Contractor has satisfied all warranty obligations.
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      No defects recorded. Ready for clearance.
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Inspection Notes & Warranty Audit Summary</label>
                  <textarea
                    rows={3}
                    value={dccNotes}
                    onChange={(e) => setDccNotes(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="milestone-modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowDccModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading || (snagAudit !== null && snagAudit.open_snags > 0)}
                  style={{ background: '#059669', borderColor: '#059669' }}
                >
                  {actionLoading ? 'Issuing...' : 'Issue Defect Clearance Certificate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: RELEASE RETENTION FUNDS DISBURSEMENT             */}
      {/* ========================================================= */}
      {showReleaseModal && selectedFund && (
        <div className="milestone-modal-overlay">
          <div className="milestone-modal-container" style={{ maxWidth: '520px' }}>
            <div className="milestone-modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <MdAttachMoney style={{ color: '#059669' }} />
                Disburse Retention Fund Payout
              </h3>
              <button className="modal-close-btn" onClick={() => setShowReleaseModal(false)}>
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleSubmitRelease}>
              <div className="milestone-modal-body">
                <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Beneficiary:</div>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedFund.beneficiary_name}</div>
                  <div style={{ fontSize: '0.85rem', color: '#2563eb', fontWeight: 600, marginTop: '0.2rem' }}>
                    Available Retention Pool: {formatCurrency(selectedFund.current_balance, selectedFund.currency)}
                  </div>
                </div>

                <div className="milestone-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="form-group">
                    <label>Release Type *</label>
                    <select
                      value={releaseForm.release_type}
                      onChange={(e) =>
                        setReleaseForm({
                          ...releaseForm,
                          release_type: e.target.value as 'interim_release' | 'final_release',
                        })
                      }
                    >
                      <option value="final_release">Final Release (100% Post-DLP)</option>
                      <option value="interim_release">Interim Release (50% on PCC)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Amount to Release ({selectedFund.currency}) *</label>
                    <input
                      type="number"
                      step="0.01"
                      max={Number(selectedFund.current_balance)}
                      value={releaseForm.amount}
                      onChange={(e) => setReleaseForm({ ...releaseForm, amount: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label>Disbursement Notes / Payment Reference</label>
                  <textarea
                    rows={3}
                    value={releaseForm.notes}
                    onChange={(e) => setReleaseForm({ ...releaseForm, notes: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="milestone-modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowReleaseModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#059669', borderColor: '#059669' }} disabled={actionLoading}>
                  {actionLoading ? 'Processing...' : 'Authorize Disbursement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: RETENTION FUND TRANSACTION LEDGER HISTORY        */}
      {/* ========================================================= */}
      {showHistoryModal && selectedFund && (
        <div className="milestone-modal-overlay">
          <div className="milestone-modal-container" style={{ maxWidth: '780px' }}>
            <div className="milestone-modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <MdHistory style={{ color: '#2563eb' }} />
                Retention Fund Ledger History: {selectedFund.fund_number}
              </h3>
              <button className="modal-close-btn" onClick={() => setShowHistoryModal(false)}>
                <MdClose />
              </button>
            </div>

            <div className="milestone-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Withheld</div>
                  <strong style={{ color: '#0f172a' }}>{formatCurrency(selectedFund.total_withheld_amount, selectedFund.currency)}</strong>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Deductions</div>
                  <strong style={{ color: '#dc2626' }}>{formatCurrency(selectedFund.total_deductions_amount, selectedFund.currency)}</strong>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Released</div>
                  <strong style={{ color: '#059669' }}>{formatCurrency(selectedFund.total_released_amount, selectedFund.currency)}</strong>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Current Balance</div>
                  <strong style={{ color: '#2563eb' }}>{formatCurrency(selectedFund.current_balance, selectedFund.currency)}</strong>
                </div>
              </div>

              <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Transaction Audit Trail</div>
              {selectedFund.transactions && selectedFund.transactions.length > 0 ? (
                <div className="table-responsive">
                  <table className="milestone-data-table">
                    <thead>
                      <tr>
                        <th>Date & Reference</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Balance Before</th>
                        <th>Balance After</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedFund.transactions.map((tx) => (
                        <tr key={tx.uuid}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{tx.reference_number}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {tx.created_at ? tx.created_at.slice(0, 16).replace('T', ' ') : ''}
                            </div>
                          </td>
                          <td>
                            <span className={`pill ${tx.transaction_type}`}>
                              {tx.transaction_type.replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            {tx.transaction_type === 'withholding' ? (
                              <span style={{ color: '#2563eb' }}>+{formatCurrency(tx.amount, selectedFund.currency)}</span>
                            ) : (
                              <span style={{ color: '#dc2626' }}>-{formatCurrency(tx.amount, selectedFund.currency)}</span>
                            )}
                          </td>
                          <td style={{ color: '#64748b' }}>{formatCurrency(tx.balance_before, selectedFund.currency)}</td>
                          <td style={{ fontWeight: 600 }}>{formatCurrency(tx.balance_after, selectedFund.currency)}</td>
                          <td style={{ fontSize: '0.8rem', color: '#334155' }}>{tx.description || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ color: '#64748b', fontStyle: 'italic', padding: '1rem', textAlign: 'center' }}>
                  No transactions recorded for this retention pool yet.
                </div>
              )}
            </div>

            <div className="milestone-modal-footer">
              <button className="btn btn-outline" onClick={() => setShowHistoryModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 6: DEFECT LIABILITY CERTIFICATE DETAIL MODAL        */}
      {/* ========================================================= */}
      {showCertDetailModal && selectedCert && (
        <div className="milestone-modal-overlay">
          <div className="milestone-modal-container" style={{ maxWidth: '680px' }}>
            <div className="milestone-modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <MdFactCheck style={{ color: '#2563eb' }} />
                Certificate: {selectedCert.certificate_number}
              </h3>
              <button className="modal-close-btn" onClick={() => setShowCertDetailModal(false)}>
                <MdClose />
              </button>
            </div>

            <div className="milestone-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Certificate Type</div>
                  <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                    {selectedCert.certificate_type.replace('_', ' ')}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Status</div>
                  <span className={`pill ${selectedCert.status}`}>{selectedCert.status}</span>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Beneficiary / Contractor</div>
                  <div style={{ fontWeight: 600 }}>
                    {selectedCert.contract?.subcontractor_name || selectedCert.client?.name || 'Developer'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Project</div>
                  <div style={{ fontWeight: 600 }}>{selectedCert.project?.name}</div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Retention Pool</div>
                  <div style={{ fontWeight: 600 }}>{formatCurrency(selectedCert.retention_pool_amount, selectedCert.currency)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Rectification Deductions</div>
                  <div style={{ fontWeight: 600, color: '#dc2626' }}>{formatCurrency(selectedCert.deductions_amount, selectedCert.currency)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Net Certified Release</div>
                  <div style={{ fontWeight: 700, color: '#059669' }}>{formatCurrency(selectedCert.net_release_amount, selectedCert.currency)}</div>
                </div>
              </div>

              {selectedCert.inspection_notes && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#475569' }}>Inspection Notes</div>
                  <div style={{ background: '#f1f5f9', padding: '0.65rem 0.85rem', borderRadius: '6px', fontSize: '0.85rem', color: '#1e293b', marginTop: '0.25rem' }}>
                    {selectedCert.inspection_notes}
                  </div>
                </div>
              )}

              {/* Signatures Status */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem 1rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem' }}>Signatory Endorsements</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', fontSize: '0.8rem' }}>
                  <div>
                    <div style={{ color: '#64748b' }}>Site Engineer</div>
                    {selectedCert.engineer_signed_at ? (
                      <div style={{ color: '#16a34a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <MdCheckCircle size={13} /> {selectedCert.engineer_signed_at.slice(0, 10)}
                      </div>
                    ) : (
                      <div style={{ color: '#eab308' }}>Pending Signature</div>
                    )}
                  </div>
                  <div>
                    <div style={{ color: '#64748b' }}>Quantity Surveyor</div>
                    {selectedCert.qs_signed_at ? (
                      <div style={{ color: '#16a34a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <MdCheckCircle size={13} /> {selectedCert.qs_signed_at.slice(0, 10)}
                      </div>
                    ) : (
                      <div style={{ color: '#eab308' }}>Pending Signature</div>
                    )}
                  </div>
                  <div>
                    <div style={{ color: '#64748b' }}>Client / Developer</div>
                    {selectedCert.client_signed_at ? (
                      <div style={{ color: '#16a34a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <MdCheckCircle size={13} /> {selectedCert.client_signed_at.slice(0, 10)}
                      </div>
                    ) : (
                      <div style={{ color: '#eab308' }}>Pending Signature</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="milestone-modal-footer">
              <button className="btn btn-outline" onClick={() => setShowCertDetailModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RetentionFundsTab
