import React, { useState, useEffect, useCallback } from 'react'
import {
  MdAccountBalance,
  MdSync,
  MdWarning,
  MdCheckCircle,
  MdErrorOutline,
  MdAdd,
  MdSearch,
  MdVisibility,
  MdRefresh,
  MdClose,
  MdTrendingDown,
  MdFilterList,
  MdDoneAll,
} from 'react-icons/md'
import escrowReconciliationService from '../../../services/escrow-reconciliation.service'
import savingsAccountService from '../../../services/savings-account.service'
import {
  EscrowReconciliation,
  EscrowReconciliationItem,
  MilestoneTriggerLog,
  ShortfallAlert,
  CreateReconciliationItemPayload,
  ReconciliationItemType,
} from '../../../types/escrow-reconciliation.types'
import { Project } from '../../../types/project.types'
import { SavingsAccount } from '../../../types/savings-account.types'

interface EscrowReconciliationTabProps {
  projects: Project[]
  filterProject: string
  formatCurrency: (amount: number | string | undefined | null, currency?: string) => string
  onVerificationTriggered?: () => void
}

export const EscrowReconciliationTab: React.FC<EscrowReconciliationTabProps> = ({
  projects,
  filterProject,
  formatCurrency,
  onVerificationTriggered,
}) => {
  // Sub-view: reconciliations vs trigger logs
  const [subView, setSubView] = useState<'statements' | 'trigger_logs'>('statements')

  // Data states
  const [reconciliations, setReconciliations] = useState<EscrowReconciliation[]>([])
  const [triggerLogs, setTriggerLogs] = useState<MilestoneTriggerLog[]>([])
  const [shortfallAlerts, setShortfallAlerts] = useState<ShortfallAlert[]>([])
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>([])

  // Loading & error states
  const [loading, setLoading] = useState<boolean>(true)
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [triggerStatusFilter, setTriggerStatusFilter] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false)
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false)
  const [showResolveModal, setShowResolveModal] = useState<boolean>(false)
  const [selectedReconciliation, setSelectedReconciliation] = useState<EscrowReconciliation | null>(null)
  const [selectedItem, setSelectedItem] = useState<EscrowReconciliationItem | null>(null)

  // Create Form State
  const [createForm, setCreateForm] = useState<{
    project_id: string
    savings_account_id: string
    institution_name: string
    statement_date: string
    statement_balance: number
    notes: string
    items: CreateReconciliationItemPayload[]
  }>({
    project_id: '',
    savings_account_id: '',
    institution_name: '',
    statement_date: new Date().toISOString().slice(0, 10),
    statement_balance: 0,
    notes: '',
    items: [],
  })

  // New Item Row state for create form
  const [newItem, setNewItem] = useState<CreateReconciliationItemPayload>({
    item_type: 'deposit',
    external_reference: '',
    external_date: new Date().toISOString().slice(0, 10),
    statement_amount: 0,
    notes: '',
  })

  // Resolve form state
  const [resolveForm, setResolveForm] = useState<{
    status: 'matched' | 'resolved'
    notes: string
  }>({
    status: 'resolved',
    notes: '',
  })

  // Load Savings Accounts for dropdown
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const res = await savingsAccountService.getSavingsAccounts({ per_page: 100 })
        setSavingsAccounts(res.data || [])
      } catch (err) {
        console.error('Failed to load savings accounts', err)
      }
    }
    loadAccounts()
  }, [])

  // Load Reconciliations
  const loadReconciliations = useCallback(async () => {
    try {
      setLoading(true)
      const res = await escrowReconciliationService.getReconciliations({
        project_id: filterProject || undefined,
        status: (statusFilter as any) || undefined,
        per_page: 50,
      })
      setReconciliations(res.data || [])
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load escrow reconciliations')
    } finally {
      setLoading(false)
    }
  }, [filterProject, statusFilter])

  // Load Trigger Logs
  const loadTriggerLogs = useCallback(async () => {
    try {
      setLoading(true)
      const res = await escrowReconciliationService.getTriggerLogs({
        status: (triggerStatusFilter as any) || undefined,
        per_page: 50,
      })
      setTriggerLogs(res.data || [])
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load milestone trigger logs')
    } finally {
      setLoading(false)
    }
  }, [triggerStatusFilter])

  // Load Shortfall Alerts
  const loadShortfallAlerts = useCallback(async () => {
    try {
      const alerts = await escrowReconciliationService.getShortfallAlerts()
      setShortfallAlerts(alerts || [])
    } catch (err: any) {
      console.error('Failed to load shortfall alerts', err)
    }
  }, [])

  // Initial and reactive load
  useEffect(() => {
    loadShortfallAlerts()
    if (subView === 'statements') {
      loadReconciliations()
    } else {
      loadTriggerLogs()
    }
  }, [subView, loadReconciliations, loadTriggerLogs, loadShortfallAlerts])

  const refreshCurrentView = () => {
    setError(null)
    setSuccessMsg(null)
    loadShortfallAlerts()
    if (subView === 'statements') {
      loadReconciliations()
    } else {
      loadTriggerLogs()
    }
  }

  // Handle Add Item to Create Form
  const handleAddItemToForm = () => {
    if (!newItem.external_reference || !newItem.statement_amount) {
      alert('Please specify external reference and statement amount.')
      return
    }
    setCreateForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...newItem }],
    }))
    setNewItem({
      item_type: 'deposit',
      external_reference: '',
      external_date: new Date().toISOString().slice(0, 10),
      statement_amount: 0,
      notes: '',
    })
  }

  // Handle Remove Item from Create Form
  const handleRemoveItemFromForm = (idx: number) => {
    setCreateForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }))
  }

  // Handle Create Reconciliation Submit
  const handleCreateReconciliation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.project_id || !createForm.savings_account_id || !createForm.institution_name) {
      setError('Please select Project, Escrow Account, and provide Institution Name.')
      return
    }

    try {
      setActionLoading(true)
      setError(null)
      const res = await escrowReconciliationService.createReconciliation({
        project_id: Number(createForm.project_id),
        savings_account_id: Number(createForm.savings_account_id),
        institution_name: createForm.institution_name,
        statement_date: createForm.statement_date,
        statement_balance: Number(createForm.statement_balance),
        notes: createForm.notes,
        statement_items: createForm.items,
      })

      setSuccessMsg(
        `Reconciliation ${res.reconciliation_number} created successfully. Matched: ${res.matched_items_count}, Unmatched: ${res.unmatched_items_count}.`
      )
      setShowCreateModal(false)
      setCreateForm({
        project_id: '',
        savings_account_id: '',
        institution_name: '',
        statement_date: new Date().toISOString().slice(0, 10),
        statement_balance: 0,
        notes: '',
        items: [],
      })
      refreshCurrentView()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create escrow reconciliation.')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle View Details
  const handleOpenDetails = async (rec: EscrowReconciliation) => {
    try {
      setActionLoading(true)
      const fresh = await escrowReconciliationService.getReconciliation(rec.uuid)
      setSelectedReconciliation(fresh)
      setShowDetailModal(true)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch reconciliation details.')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Resolve Item Submit
  const handleResolveItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem || !selectedReconciliation) return
    try {
      setActionLoading(true)
      setError(null)
      await escrowReconciliationService.resolveItem(selectedItem.uuid, {
        status: resolveForm.status,
        notes: resolveForm.notes,
      })
      setSuccessMsg(`Reconciliation item ${selectedItem.external_reference} resolved.`)
      setShowResolveModal(false)

      // Refresh reconciliation details
      const fresh = await escrowReconciliationService.getReconciliation(selectedReconciliation.uuid)
      setSelectedReconciliation(fresh)
      refreshCurrentView()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to resolve reconciliation item.')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Approve Reconciliation
  const handleApproveReconciliation = async (rec: EscrowReconciliation) => {
    if (!window.confirm(`Are you sure you want to approve escrow reconciliation ${rec.reconciliation_number}?`)) {
      return
    }
    try {
      setActionLoading(true)
      setError(null)
      await escrowReconciliationService.approveReconciliation(rec.uuid, 'Approved by Finance Controller')
      setSuccessMsg(`Escrow reconciliation ${rec.reconciliation_number} approved successfully.`)
      if (selectedReconciliation && selectedReconciliation.uuid === rec.uuid) {
        setShowDetailModal(false)
      }
      refreshCurrentView()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to approve escrow reconciliation.')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Bulk Evaluate Triggers
  const handleBulkEvaluate = async () => {
    try {
      setActionLoading(true)
      setError(null)
      const res = await escrowReconciliationService.bulkEvaluatePendingTriggers()
      setSuccessMsg(
        `Bulk Evaluation Complete: ${res.processed_count} evaluated, ${res.releases_triggered} releases triggered, ${res.shortfalls_detected} shortfalls detected.`
      )
      loadShortfallAlerts()
      if (onVerificationTriggered) onVerificationTriggered()
      if (subView === 'trigger_logs') loadTriggerLogs()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Bulk evaluation failed.')
    } finally {
      setActionLoading(false)
    }
  }

  // Quick Trigger Single Verification from Alert
  const handleTriggerSingle = async (verificationId: number) => {
    try {
      setActionLoading(true)
      setError(null)
      const res = await escrowReconciliationService.triggerForVerification(verificationId)
      if (res.status === 'success') {
        setSuccessMsg(`Milestone payment release created and debited from client escrow successfully!`)
      } else if (res.status === 'shortfall') {
        setError(`Insufficient escrow balance. Shortfall of ${formatCurrency(res.trigger_log.shortfall_amount)} logged.`)
      }
      loadShortfallAlerts()
      if (onVerificationTriggered) onVerificationTriggered()
      if (subView === 'trigger_logs') loadTriggerLogs()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to trigger verification escrow release.')
    } finally {
      setActionLoading(false)
    }
  }

  // Aggregate stats
  const totalBookBalance = reconciliations.reduce((sum, r) => sum + Number(r.book_balance || 0), 0)
  const totalStatementBalance = reconciliations.reduce((sum, r) => sum + Number(r.statement_balance || 0), 0)
  const reconciledCount = reconciliations.filter((r) => r.status === 'reconciled' || r.status === 'approved').length
  const openVarianceCount = reconciliations.filter((r) => Math.abs(Number(r.variance_amount || 0)) > 0.01).length

  return (
    <div className="escrow-reconciliation-tab">
      {/* Alert / Notification Feedback */}
      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.85rem 1.25rem', borderRadius: '8px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MdErrorOutline style={{ fontSize: '1.25rem' }} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer' }}><MdClose /></button>
        </div>
      )}

      {successMsg && (
        <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '0.85rem 1.25rem', borderRadius: '8px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MdCheckCircle style={{ fontSize: '1.25rem' }} />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} style={{ background: 'none', border: 'none', color: '#065f46', cursor: 'pointer' }}><MdClose /></button>
        </div>
      )}

      {/* Shortfall Alerts Banner */}
      {shortfallAlerts.length > 0 && (
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b45309', fontWeight: 700, fontSize: '1rem' }}>
              <MdWarning style={{ fontSize: '1.4rem', color: '#d97706' }} />
              <span>Escrow Shortfall Alerts ({shortfallAlerts.length} Client Accounts Pending Deposit)</span>
            </div>
            <button
              onClick={handleBulkEvaluate}
              disabled={actionLoading}
              className="action-btn warning"
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
            >
              <MdSync /> Bulk Re-evaluate Escrows
            </button>
          </div>
          <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: '#78350f' }}>
            The following client-approved construction milestones could not be automatically released due to insufficient funds in the linked client escrow account. Please notify the clients to top up their escrow savings.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.825rem', borderCollapse: 'collapse', background: '#ffffff', borderRadius: '6px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: '#fef3c7', color: '#92400e', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem 0.75rem' }}>Verification #</th>
                  <th style={{ padding: '0.5rem 0.75rem' }}>Project / Client</th>
                  <th style={{ padding: '0.5rem 0.75rem' }}>Escrow Account</th>
                  <th style={{ padding: '0.5rem 0.75rem' }} className="text-right">Certified Amount</th>
                  <th style={{ padding: '0.5rem 0.75rem' }} className="text-right">Escrow Balance</th>
                  <th style={{ padding: '0.5rem 0.75rem' }} className="text-right">Shortfall Required</th>
                  <th style={{ padding: '0.5rem 0.75rem' }} className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {shortfallAlerts.map((alert, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #fef3c7' }}>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{alert.verification_number}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      <div style={{ fontWeight: 600 }}>{alert.project_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Client: {alert.client_name}</div>
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#2563eb', fontWeight: 600 }}>{alert.account_number}</td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 600 }}>
                      {formatCurrency(alert.certified_amount, alert.currency)}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#059669', fontWeight: 600 }}>
                      {formatCurrency(alert.escrow_balance, alert.currency)}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#dc2626', fontWeight: 700 }}>
                      {formatCurrency(alert.shortfall_amount, alert.currency)}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>
                      <button
                        className="action-btn primary"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                        disabled={actionLoading}
                        onClick={() => handleTriggerSingle(alert.verification_id)}
                      >
                        Retry Trigger
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KPI Overview Grid */}
      <div className="milestone-kpi-grid">
        <div className="kpi-stat-card">
          <div className="kpi-stat-header">
            <span className="kpi-stat-title">Total Escrow Book Balance</span>
            <span className="kpi-stat-icon blue"><MdAccountBalance /></span>
          </div>
          <div className="kpi-stat-val">{formatCurrency(totalBookBalance)}</div>
          <div className="kpi-stat-sub">Across all linked client savings accounts</div>
        </div>

        <div className="kpi-stat-card">
          <div className="kpi-stat-header">
            <span className="kpi-stat-title">External Statement Balance</span>
            <span className="kpi-stat-icon green"><MdDoneAll /></span>
          </div>
          <div className="kpi-stat-val">{formatCurrency(totalStatementBalance)}</div>
          <div className="kpi-stat-sub">From bank & mobile money settlements</div>
        </div>

        <div className="kpi-stat-card">
          <div className="kpi-stat-header">
            <span className="kpi-stat-title">Reconciled Statements</span>
            <span className="kpi-stat-icon purple"><MdCheckCircle /></span>
          </div>
          <div className="kpi-stat-val">{reconciledCount} / {reconciliations.length}</div>
          <div className="kpi-stat-sub">{reconciliations.length > 0 ? Math.round((reconciledCount / reconciliations.length) * 100) : 0}% compliance rate</div>
        </div>

        <div className="kpi-stat-card">
          <div className="kpi-stat-header">
            <span className="kpi-stat-title">Open Variances / Shortfalls</span>
            <span className="kpi-stat-icon amber"><MdTrendingDown /></span>
          </div>
          <div className="kpi-stat-val" style={{ color: openVarianceCount > 0 ? '#dc2626' : '#059669' }}>
            {openVarianceCount} Open Variances
          </div>
          <div className="kpi-stat-sub">{shortfallAlerts.length} client accounts with shortfall</div>
        </div>
      </div>

      {/* Sub-Tabs Nav & Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '8px' }}>
          <button
            onClick={() => setSubView('statements')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              background: subView === 'statements' ? '#ffffff' : 'transparent',
              color: subView === 'statements' ? '#1e293b' : '#64748b',
              boxShadow: subView === 'statements' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Bank & Escrow Reconciliations ({reconciliations.length})
          </button>
          <button
            onClick={() => setSubView('trigger_logs')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              background: subView === 'trigger_logs' ? '#ffffff' : 'transparent',
              color: subView === 'trigger_logs' ? '#1e293b' : '#64748b',
              boxShadow: subView === 'trigger_logs' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Automated Milestone Trigger Logs ({triggerLogs.length})
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={refreshCurrentView} className="action-btn" title="Refresh Data">
            <MdRefresh /> Refresh
          </button>
          <button
            onClick={handleBulkEvaluate}
            className="action-btn warning"
            disabled={actionLoading}
            title="Bulk evaluate all approved milestone verifications"
          >
            <MdSync /> Bulk Evaluate Triggers
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="action-btn primary"
            title="Create New Escrow Reconciliation Statement"
          >
            <MdAdd /> New Reconciliation
          </button>
        </div>
      </div>

      {/* Sub-View 1: RECONCILIATIONS STATEMENTS TABLE */}
      {subView === 'statements' ? (
        <div className="releases-table-card">
          <div style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', flexWrap: 'wrap' }}>
            <div className="releases-search-box" style={{ maxWidth: '300px' }}>
              <MdSearch style={{ color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search by rec # or institution..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <MdFilterList style={{ color: '#64748b' }} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#ffffff' }}
              >
                <option value="">All Reconciliation Statuses</option>
                <option value="draft">Draft</option>
                <option value="in_progress">In Progress</option>
                <option value="reconciled">Reconciled</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <table className="releases-table">
            <thead>
              <tr>
                <th>Reconciliation #</th>
                <th>Institution & Date</th>
                <th>Project & Account</th>
                <th className="text-right">Statement Balance</th>
                <th className="text-right">Book Balance</th>
                <th className="text-right">Variance</th>
                <th>Match Rate</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    Loading escrow reconciliations...
                  </td>
                </tr>
              ) : reconciliations.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    No escrow reconciliations found. Click "New Reconciliation" to create one.
                  </td>
                </tr>
              ) : (
                reconciliations
                  .filter(
                    (r) =>
                      !searchTerm ||
                      r.reconciliation_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      r.institution_name.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((rec) => {
                    const varianceNum = Number(rec.variance_amount || 0)
                    const isBalanced = Math.abs(varianceNum) < 0.01
                    return (
                      <tr key={rec.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{rec.reconciliation_number}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {new Date(rec.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{rec.institution_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Stmt Date: {rec.statement_date}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{rec.project?.name || 'Project'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#2563eb' }}>
                            {rec.savings_account?.account_number} ({rec.savings_account?.account_name})
                          </div>
                        </td>
                        <td className="text-right" style={{ fontWeight: 600 }}>
                          {formatCurrency(rec.statement_balance, rec.currency)}
                        </td>
                        <td className="text-right" style={{ fontWeight: 600 }}>
                          {formatCurrency(rec.book_balance, rec.currency)}
                        </td>
                        <td className="text-right">
                          <span
                            style={{
                              fontWeight: 700,
                              color: isBalanced ? '#059669' : '#dc2626',
                            }}
                          >
                            {formatCurrency(varianceNum, rec.currency)}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ flex: 1, minWidth: '50px', background: '#e2e8f0', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${Math.min(100, rec.match_rate_percentage || 0)}%`,
                                  background: isBalanced ? '#059669' : '#2563eb',
                                  height: '100%',
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                              {rec.match_rate_percentage || 0}%
                            </span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            {rec.matched_items_count} matched, {rec.unmatched_items_count} unmatched
                          </div>
                        </td>
                        <td>
                          <span className={`pill ${rec.status}`}>
                            {rec.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="action-btn-group">
                            <button
                              className="action-btn primary"
                              onClick={() => handleOpenDetails(rec)}
                              title="View Items & Resolve Variances"
                            >
                              <MdVisibility /> View Items
                            </button>
                            {rec.status !== 'approved' && isBalanced && (
                              <button
                                className="action-btn success"
                                onClick={() => handleApproveReconciliation(rec)}
                                disabled={actionLoading}
                                title="Approve Balanced Statement"
                              >
                                <MdCheckCircle /> Approve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Sub-View 2: AUTOMATED MILESTONE TRIGGER LOGS TABLE */
        <div className="releases-table-card">
          <div style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <MdFilterList style={{ color: '#64748b' }} />
              <select
                value={triggerStatusFilter}
                onChange={(e) => setTriggerStatusFilter(e.target.value)}
                style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#ffffff' }}
              >
                <option value="">All Trigger Statuses</option>
                <option value="success">Success</option>
                <option value="shortfall">Shortfall</option>
                <option value="failed">Failed</option>
                <option value="skipped">Skipped</option>
              </select>
            </div>
          </div>

          <table className="releases-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Verification #</th>
                <th>Trigger Event</th>
                <th>Escrow Account</th>
                <th className="text-right">Escrow Balance</th>
                <th className="text-right">Required Amount</th>
                <th className="text-right">Shortfall</th>
                <th>Status</th>
                <th>Details / Error</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    Loading milestone trigger logs...
                  </td>
                </tr>
              ) : triggerLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    No automated milestone trigger logs found.
                  </td>
                </tr>
              ) : (
                triggerLogs.map((log) => {
                  const isSuccess = log.status === 'success'
                  const isShortfall = log.status === 'shortfall'
                  return (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.8rem', color: '#475569' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>
                          {log.milestone_verification?.verification_number || `Verif #${log.milestone_verification_id}`}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {log.milestone_verification?.title}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, textTransform: 'capitalize', color: '#334155', fontSize: '0.825rem' }}>
                          {log.trigger_event.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <div style={{ color: '#2563eb', fontWeight: 600 }}>
                          {log.savings_account?.account_number || `Acc #${log.savings_account_id}`}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {log.savings_account?.account_name}
                        </div>
                      </td>
                      <td className="text-right" style={{ fontWeight: 600 }}>
                        {formatCurrency(log.escrow_balance)}
                      </td>
                      <td className="text-right" style={{ fontWeight: 600 }}>
                        {formatCurrency(log.required_amount)}
                      </td>
                      <td className="text-right">
                        <span style={{ fontWeight: 700, color: isShortfall ? '#dc2626' : '#64748b' }}>
                          {Number(log.shortfall_amount) > 0 ? formatCurrency(log.shortfall_amount) : '—'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`pill ${
                            isSuccess ? 'disbursed' : isShortfall ? 'rejected' : log.status
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: '#64748b', maxWidth: '200px' }}>
                        {log.details?.reason || log.details?.error || (isSuccess ? `Release ${log.payment_release?.release_number || ''} auto-debited` : '—')}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL 1: CREATE RECONCILIATION STATEMENT */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '850px' }}>
            <div className="modal-header">
              <h2>New Escrow Reconciliation Statement</h2>
              <button onClick={() => setShowCreateModal(false)} className="close-btn"><MdClose /></button>
            </div>
            <form onSubmit={handleCreateReconciliation}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem', color: '#334155' }}>
                      Project *
                    </label>
                    <select
                      value={createForm.project_id}
                      onChange={(e) => setCreateForm({ ...createForm, project_id: e.target.value })}
                      required
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="">Select Project</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem', color: '#334155' }}>
                      Client Escrow Savings Account *
                    </label>
                    <select
                      value={createForm.savings_account_id}
                      onChange={(e) => setCreateForm({ ...createForm, savings_account_id: e.target.value })}
                      required
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="">Select Escrow Account</option>
                      {savingsAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.account_number} — {acc.client?.name || acc.scheme_name || 'Escrow Account'} ({formatCurrency(acc.current_balance, acc.currency)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem', color: '#334155' }}>
                      Settlement Institution / Bank Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Stanbic Bank Uganda, MTN Escrow"
                      value={createForm.institution_name}
                      onChange={(e) => setCreateForm({ ...createForm, institution_name: e.target.value })}
                      required
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem', color: '#334155' }}>
                      Statement Date *
                    </label>
                    <input
                      type="date"
                      value={createForm.statement_date}
                      onChange={(e) => setCreateForm({ ...createForm, statement_date: e.target.value })}
                      required
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem', color: '#334155' }}>
                      Statement Closing Balance *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={createForm.statement_balance}
                      onChange={(e) => setCreateForm({ ...createForm, statement_balance: Number(e.target.value) })}
                      required
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem', color: '#334155' }}>
                      Notes / Reference
                    </label>
                    <input
                      type="text"
                      placeholder="Optional statement notes"
                      value={createForm.notes}
                      onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>

                {/* Statement Items Input for Automatic Matching */}
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#1e293b' }}>
                    Statement Line Items for Auto-Matching ({createForm.items.length})
                  </h4>
                  <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: '#64748b' }}>
                    Add lines from the external bank/settlement statement. The system will match them against internal ledger transactions by reference and amount.
                  </p>

                  {/* Input row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'end', marginBottom: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Type</label>
                      <select
                        value={newItem.item_type}
                        onChange={(e) => setNewItem({ ...newItem, item_type: e.target.value as ReconciliationItemType })}
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                      >
                        <option value="deposit">Client Deposit</option>
                        <option value="milestone_release">Milestone Release</option>
                        <option value="bank_fee">Bank Fee</option>
                        <option value="interest">Interest Earned</option>
                        <option value="adjustment">Adjustment</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>External Ref / Cheque #</label>
                      <input
                        type="text"
                        placeholder="e.g. TXN-10924 or STAN-882"
                        value={newItem.external_reference}
                        onChange={(e) => setNewItem({ ...newItem, external_reference: e.target.value })}
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Date</label>
                      <input
                        type="date"
                        value={newItem.external_date}
                        onChange={(e) => setNewItem({ ...newItem, external_date: e.target.value })}
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newItem.statement_amount}
                        onChange={(e) => setNewItem({ ...newItem, statement_amount: Number(e.target.value) })}
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={handleAddItemToForm}
                        className="action-btn primary"
                        style={{ padding: '0.45rem 0.75rem' }}
                      >
                        <MdAdd /> Add Line
                      </button>
                    </div>
                  </div>

                  {/* Added items list */}
                  {createForm.items.length > 0 && (
                    <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse', background: '#ffffff', borderRadius: '6px', overflow: 'hidden' }}>
                      <thead>
                        <tr style={{ background: '#e2e8f0', textAlign: 'left' }}>
                          <th style={{ padding: '0.4rem 0.6rem' }}>Type</th>
                          <th style={{ padding: '0.4rem 0.6rem' }}>Reference</th>
                          <th style={{ padding: '0.4rem 0.6rem' }}>Date</th>
                          <th style={{ padding: '0.4rem 0.6rem' }} className="text-right">Amount</th>
                          <th style={{ padding: '0.4rem 0.6rem' }} className="text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {createForm.items.map((it, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.4rem 0.6rem', textTransform: 'capitalize' }}>{it.item_type.replace('_', ' ')}</td>
                            <td style={{ padding: '0.4rem 0.6rem', fontWeight: 600 }}>{it.external_reference}</td>
                            <td style={{ padding: '0.4rem 0.6rem' }}>{it.external_date}</td>
                            <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontWeight: 600 }}>
                              {formatCurrency(it.statement_amount)}
                            </td>
                            <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveItemFromForm(idx)}
                                style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.9rem' }}
                              >
                                &times;
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowCreateModal(false)} className="action-btn">
                  Cancel
                </button>
                <button type="submit" className="action-btn primary" disabled={actionLoading}>
                  {actionLoading ? 'Creating & Auto-Matching...' : 'Create & Reconcile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECONCILIATION DETAILS & ITEMS RESOLUTION */}
      {showDetailModal && selectedReconciliation && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '950px' }}>
            <div className="modal-header">
              <div>
                <h2>{selectedReconciliation.reconciliation_number} Details</h2>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {selectedReconciliation.institution_name} &bull; Statement Date: {selectedReconciliation.statement_date}
                </span>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="close-btn"><MdClose /></button>
            </div>

            <div className="modal-body">
              {/* Header metrics card */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Escrow Account</div>
                  <div style={{ fontWeight: 600, color: '#2563eb' }}>{selectedReconciliation.savings_account?.account_number}</div>
                  <div style={{ fontSize: '0.75rem' }}>{selectedReconciliation.savings_account?.account_name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Statement Balance</div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    {formatCurrency(selectedReconciliation.statement_balance, selectedReconciliation.currency)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Ledger Book Balance</div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    {formatCurrency(selectedReconciliation.book_balance, selectedReconciliation.currency)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Variance</div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: Math.abs(Number(selectedReconciliation.variance_amount || 0)) < 0.01 ? '#059669' : '#dc2626' }}>
                    {formatCurrency(selectedReconciliation.variance_amount, selectedReconciliation.currency)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Status</div>
                  <span className={`pill ${selectedReconciliation.status}`}>
                    {selectedReconciliation.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: '#1e293b' }}>
                Reconciliation Line Items ({selectedReconciliation.items?.length || 0})
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table className="releases-table" style={{ fontSize: '0.825rem' }}>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Reference</th>
                      <th>Date</th>
                      <th className="text-right">Statement Amt</th>
                      <th className="text-right">Ledger Amt</th>
                      <th className="text-right">Variance</th>
                      <th>Status</th>
                      <th>Notes / Resolution</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!selectedReconciliation.items || selectedReconciliation.items.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                          No statement line items attached to this reconciliation.
                        </td>
                      </tr>
                    ) : (
                      selectedReconciliation.items.map((item) => {
                        const isItemMatched = item.status === 'matched' || item.status === 'resolved'
                        return (
                          <tr key={item.id}>
                            <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{item.item_type.replace('_', ' ')}</td>
                            <td style={{ fontWeight: 600, color: '#1e293b' }}>{item.external_reference}</td>
                            <td>{item.external_date}</td>
                            <td className="text-right" style={{ fontWeight: 600 }}>
                              {formatCurrency(item.statement_amount, selectedReconciliation.currency)}
                            </td>
                            <td className="text-right" style={{ fontWeight: 600 }}>
                              {formatCurrency(item.ledger_amount, selectedReconciliation.currency)}
                            </td>
                            <td className="text-right">
                              <span style={{ fontWeight: 700, color: Math.abs(Number(item.variance || 0)) < 0.01 ? '#059669' : '#dc2626' }}>
                                {formatCurrency(item.variance, selectedReconciliation.currency)}
                              </span>
                            </td>
                            <td>
                              <span className={`pill ${isItemMatched ? 'disbursed' : 'rejected'}`}>
                                {item.status}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {item.notes || '—'}
                              {item.resolved_by_user && (
                                <div style={{ fontSize: '0.7rem', color: '#059669' }}>
                                  Resolved by {item.resolved_by_user.name}
                                </div>
                              )}
                            </td>
                            <td className="text-right">
                              {item.status !== 'matched' && item.status !== 'resolved' && (
                                <button
                                  className="action-btn warning"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                  onClick={() => {
                                    setSelectedItem(item)
                                    setResolveForm({
                                      status: 'resolved',
                                      notes: '',
                                    })
                                    setShowResolveModal(true)
                                  }}
                                >
                                  Resolve
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <div>
                {selectedReconciliation.status !== 'approved' &&
                  Math.abs(Number(selectedReconciliation.variance_amount || 0)) < 0.01 && (
                    <button
                      type="button"
                      className="action-btn success"
                      disabled={actionLoading}
                      onClick={() => handleApproveReconciliation(selectedReconciliation)}
                    >
                      <MdCheckCircle /> Approve Reconciliation
                    </button>
                  )}
              </div>
              <button type="button" onClick={() => setShowDetailModal(false)} className="action-btn">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RESOLVE ITEM MODAL */}
      {showResolveModal && selectedItem && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-container" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Resolve Item: {selectedItem.external_reference}</h2>
              <button onClick={() => setShowResolveModal(false)} className="close-btn"><MdClose /></button>
            </div>
            <form onSubmit={handleResolveItem}>
              <div className="modal-body">
                <div style={{ marginBottom: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                  <div><strong>Statement Amount:</strong> {formatCurrency(selectedItem.statement_amount)}</div>
                  <div><strong>Ledger Amount:</strong> {formatCurrency(selectedItem.ledger_amount)}</div>
                  <div style={{ color: '#dc2626' }}><strong>Variance:</strong> {formatCurrency(selectedItem.variance)}</div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Resolution Status *
                  </label>
                  <select
                    value={resolveForm.status}
                    onChange={(e) => setResolveForm({ ...resolveForm, status: e.target.value as any })}
                    required
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="resolved">Mark as Resolved (Manual Adjustment / Bank Explanation)</option>
                    <option value="matched">Force Matched (Tolerate Discrepancy)</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Resolution Notes & Justification *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide details of resolution or bank fee confirmation..."
                    value={resolveForm.notes}
                    onChange={(e) => setResolveForm({ ...resolveForm, notes: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowResolveModal(false)} className="action-btn">
                  Cancel
                </button>
                <button type="submit" className="action-btn primary" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Save Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default EscrowReconciliationTab
