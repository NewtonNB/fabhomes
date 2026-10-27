import React, { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  MdSearch,
  MdAdd,
  MdRefresh,
  MdAccountBalance,
  MdTrendingUp,
  MdLandscape,
  MdHomeRepairService,
  MdCheckCircle,
  MdPauseCircle,
  MdCancel,
  MdVisibility,
  MdAttachMoney,
  MdClose,
  MdConstruction,
  MdCompareArrows,
  MdPeople,
} from 'react-icons/md'
import {
  SavingsAccount,
  SavingsAccountStatistics,
} from '../../types/savings-account.types'
import savingsAccountService from '../../services/savings-account.service'
import constructionSavingSchemeService from '../../services/construction-scheme.service'
import schemeTransferService, { SchemeTransferItem } from '../../services/scheme-transfer.service'
import { ConstructionSavingScheme } from '../../types/construction-scheme.types'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import './SavingsAccountsList.css'

export const SavingsAccountsList: React.FC = () => {
  const [searchParams] = useSearchParams()

  const initialClientId = searchParams.get('client_id') || ''
  const initialType = searchParams.get('account_type') || searchParams.get('type') || ''
  const initialStatus = searchParams.get('status') || ''

  // Data & Stats
  const [accounts, setAccounts] = useState<SavingsAccount[]>([])
  const [stats, setStats] = useState<SavingsAccountStatistics | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [accountToActivate, setAccountToActivate] = useState<SavingsAccount | null>(null)

  // Filters
  const [search, setSearch] = useState<string>('')
  const [selectedType, setSelectedType] = useState<string>(initialType)
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatus)
  const [clientId] = useState<string>(initialClientId)
  const [page, setPage] = useState<number>(1)
  const [total, setTotal] = useState<number>(0)

  // Action / Modal States
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [adjustModalOpen, setAdjustModalOpen] = useState<boolean>(false)
  const [adjustTarget, setAdjustTarget] = useState<SavingsAccount | null>(null)
  const [adjustType, setAdjustType] = useState<'credit' | 'debit' | 'set_exact'>('credit')
  const [adjustAmount, setAdjustAmount] = useState<number | string>('')
  const [adjustReason, setAdjustReason] = useState<string>('')

  const [suspendModalOpen, setSuspendModalOpen] = useState<boolean>(false)
  const [suspendTarget, setSuspendTarget] = useState<SavingsAccount | null>(null)
  const [suspendReason, setSuspendReason] = useState<string>('')

  const [closeModalOpen, setCloseModalOpen] = useState<boolean>(false)
  const [closeTarget, setCloseTarget] = useState<SavingsAccount | null>(null)
  const [closeNotes, setCloseNotes] = useState<string>('')

  // Construction Schemes Modal
  const [showSchemesModal, setShowSchemesModal] = useState<boolean>(false)
  const [schemesList, setSchemesList] = useState<ConstructionSavingScheme[]>([])
  const [schemesLoading, setSchemesLoading] = useState<boolean>(false)

  const handleOpenSchemes = async () => {
    setShowSchemesModal(true)
    try {
      setSchemesLoading(true)
      const res = await constructionSavingSchemeService.getSchemes({ is_active: true })
      if (!res.data || res.data.length === 0) {
        const seeded = await constructionSavingSchemeService.seedDefaults()
        setSchemesList(seeded)
      } else {
        setSchemesList(res.data)
      }
    } catch (err: any) {
      console.error('Failed to load schemes', err)
    } finally {
      setSchemesLoading(false)
    }
  }

  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  // Scheme Transfers Modal State (Legacy Manual Section 2.7)
  const [showTransfersModal, setShowTransfersModal] = useState<boolean>(false)
  const [transfersList, setTransfersList] = useState<SchemeTransferItem[]>([])
  const [transfersLoading, setTransfersLoading] = useState<boolean>(false)
  const [transferActionLoading, setTransferActionLoading] = useState<boolean>(false)

  const handleOpenTransfers = async () => {
    setShowTransfersModal(true)
    fetchTransfers()
  }

  const fetchTransfers = async () => {
    try {
      setTransfersLoading(true)
      const res = await schemeTransferService.getTransfers()
      setTransfersList(res.data?.data || res.data || [])
    } catch (err: any) {
      console.error('Failed to load transfers', err)
    } finally {
      setTransfersLoading(false)
    }
  }

  const handleApproveTransfer = async (uuid: string) => {
    try {
      setTransferActionLoading(true)
      await schemeTransferService.approveTransfer(uuid)
      triggerSuccess('Scheme transfer approved and balances updated successfully!')
      fetchTransfers()
      fetchAccounts()
      fetchStatistics()
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to approve transfer')
    } finally {
      setTransferActionLoading(false)
    }
  }

  const handleRejectTransfer = async (uuid: string) => {
    const reason = prompt('Please enter the reason for rejecting this transfer:')
    if (!reason) return
    try {
      setTransferActionLoading(true)
      await schemeTransferService.rejectTransfer(uuid, reason)
      triggerSuccess('Scheme transfer marked as rejected.')
      fetchTransfers()
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to reject transfer')
    } finally {
      setTransferActionLoading(false)
    }
  }

  // Fetch Accounts
  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await savingsAccountService.getSavingsAccounts({
        client_id: clientId || undefined,
        account_type: selectedType || undefined,
        status: selectedStatus || undefined,
        search: search || undefined,
        page,
        per_page: 15,
      })
      const items = res?.data || []
      setAccounts(Array.isArray(items) ? items : [])
      setTotal(res?.pagination?.total ?? res?.meta?.total ?? items.length)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch savings accounts')
    } finally {
      setLoading(false)
    }
  }, [clientId, selectedType, selectedStatus, search, page])

  // Fetch Portfolio Statistics
  const fetchStatistics = useCallback(async () => {
    try {
      const data = await savingsAccountService.getStatistics(clientId || undefined)
      setStats(data)
    } catch (err: any) {
      console.warn('Failed to load savings portfolio statistics:', err)
    }
  }, [clientId])

  useEffect(() => {
    fetchStatistics()
  }, [fetchStatistics])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  useEffect(() => {
    const typeParam = searchParams.get('account_type') || searchParams.get('type') || ''
    setSelectedType(typeParam)
    const statusParam = searchParams.get('status') || ''
    setSelectedStatus(statusParam)
    setPage(1)
  }, [searchParams])

  // Quick Action Handlers
  const handleActivate = (account: SavingsAccount) => {
    setAccountToActivate(account)
  }

  const executeActivate = async () => {
    if (!accountToActivate) return
    try {
      setActionLoading(true)
      await savingsAccountService.activateSavingsAccount(accountToActivate.uuid)
      triggerSuccess(`Account ${accountToActivate.account_number} reactivated successfully!`)
      setAccountToActivate(null)
      fetchAccounts()
      fetchStatistics()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to activate account.')
      setAccountToActivate(null)
    } finally {
      setActionLoading(false)
    }
  }

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adjustTarget) return
    const amt = Number(adjustAmount)
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid positive adjustment amount.')
      return
    }

    try {
      setActionLoading(true)
      await savingsAccountService.adjustBalance(adjustTarget.uuid, {
        adjustment_type: adjustType,
        amount: amt,
        reason: adjustReason,
      })
      setAdjustModalOpen(false)
      setAdjustTarget(null)
      setAdjustAmount('')
      setAdjustReason('')
      triggerSuccess('Account balance adjusted successfully!')
      fetchAccounts()
      fetchStatistics()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to adjust balance.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSuspendSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!suspendTarget) return
    try {
      setActionLoading(true)
      await savingsAccountService.suspendSavingsAccount(suspendTarget.uuid, suspendReason)
      setSuspendModalOpen(false)
      setSuspendTarget(null)
      setSuspendReason('')
      triggerSuccess(`Account ${suspendTarget.account_number} suspended.`)
      fetchAccounts()
      fetchStatistics()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to suspend account.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!closeTarget) return
    try {
      setActionLoading(true)
      await savingsAccountService.closeSavingsAccount(closeTarget.uuid, closeNotes)
      setCloseModalOpen(false)
      setCloseTarget(null)
      setCloseNotes('')
      triggerSuccess(`Account ${closeTarget.account_number} closed successfully.`)
      fetchAccounts()
      fetchStatistics()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to close account.')
    } finally {
      setActionLoading(false)
    }
  }

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 100) return 'bar-teal'
    if (percentage >= 70) return 'bar-green'
    if (percentage >= 30) return 'bar-blue'
    return 'bar-amber'
  }

  return (
    <div className="savings-accounts-container">
      {/* Header */}
      <div className="savings-header">
        <div className="savings-title-group">
          <h1>
            <MdAccountBalance />{' '}
            {selectedType === 'land_saving'
              ? 'Land Saving Scheme Portfolio'
              : selectedType === 'construction_saving'
              ? 'Construction Saving Scheme Portfolio'
              : selectedType === 'tuzimbe_group'
              ? 'Tuzimbe Group Savings Program'
              : 'Client Savings Accounts & Schemes'}
          </h1>
          <p className="savings-subtitle">
            {selectedType === 'land_saving'
              ? 'Track client land installment savings, target parcel deposits, and title deed qualification across Fab Homes estates.'
              : selectedType === 'construction_saving'
              ? 'Track client home construction savings pools, structural milestone accumulation, and escrow releases.'
              : selectedType === 'tuzimbe_group'
              ? 'Track structured cohort group savings, package contributions, and milestone achievements under the Tuzimbe program.'
              : 'Manage land and construction client installment schemes, track target progress, and monitor fund accumulation.'}
          </p>
        </div>

        <div className="savings-header-actions">
          <button
            className="btn btn-secondary"
            onClick={handleOpenTransfers}
            title="Client Scheme & Phase Transfer Requests (Legacy Manual Section 2.7)"
          >
            <MdCompareArrows /> Scheme Transfers
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleOpenSchemes}
            title="View Standard Construction Saving Scheme Templates & Milestone Weights"
          >
            <MdConstruction /> Construction Schemes
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => {
              fetchStatistics()
              fetchAccounts()
            }}
          >
            <MdRefresh /> Refresh
          </button>

          <Link to="/savings-accounts/new" className="btn btn-primary">
            <MdAdd /> Open Savings Account
          </Link>
        </div>
      </div>

      {successMessage && <div className="alert-banner success">{successMessage}</div>}
      {error && <div className="alert-banner error">{error}</div>}

      {/* KPI Cards Grid */}
      <div className="savings-stats-grid">
        <div className="stat-card">
          <div className="stat-icon green">
            <MdAttachMoney />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Portfolio Saved</span>
            <span className="stat-value">
              UGX {(stats?.total_balance_ugx ?? 0).toLocaleString()}
            </span>
            <span className="stat-subtext">
              Target: UGX {(stats?.total_target_ugx ?? 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            <MdTrendingUp />
          </div>
          <div className="stat-info">
            <span className="stat-label">Overall Progress</span>
            <span className="stat-value">{stats?.overall_progress_percentage ?? 0}%</span>
            <span className="stat-subtext">Portfolio target completion</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon teal">
            <MdCheckCircle />
          </div>
          <div className="stat-info">
            <span className="stat-label">Active Schemes</span>
            <span className="stat-value">{stats?.active_accounts ?? 0}</span>
            <span className="stat-subtext">
              {stats?.completed_accounts ?? 0} targets achieved
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon amber">
            <MdLandscape />
          </div>
          <div className="stat-info">
            <span className="stat-label">Land Saving Schemes</span>
            <span className="stat-value">{stats?.land_savings?.count ?? 0}</span>
            <span className="stat-subtext">
              UGX {(stats?.land_savings?.balance_ugx ?? 0).toLocaleString()} accumulated
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <MdHomeRepairService />
          </div>
          <div className="stat-info">
            <span className="stat-label">Construction Savings</span>
            <span className="stat-value">{stats?.construction_savings?.count ?? 0}</span>
            <span className="stat-subtext">
              UGX {(stats?.construction_savings?.balance_ugx ?? 0).toLocaleString()} accumulated
            </span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="savings-filters">
        <div className="filter-search-box">
          <MdSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search account number, scheme name, client name or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>

        <select
          className="filter-select"
          value={selectedType}
          onChange={(e) => {
            setSelectedType(e.target.value)
            setPage(1)
          }}
        >
          <option value="">All Scheme Types</option>
          <option value="land_saving">Land Saving Scheme</option>
          <option value="construction_saving">Construction Saving Scheme</option>
          <option value="tuzimbe_group">Tuzimbe Group Scheme</option>
        </select>

        <select
          className="filter-select"
          value={selectedStatus}
          onChange={(e) => {
            setSelectedStatus(e.target.value)
            setPage(1)
          }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="completed">Target Reached / Completed</option>
          <option value="suspended">Suspended</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Quick Navigation Filter Chips */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => { setSelectedStatus(''); setSelectedType(''); setPage(1); }}
          style={{
            padding: '7px 14px',
            borderRadius: '20px',
            border: `1px solid ${selectedStatus === '' && selectedType === '' ? '#0d9488' : '#cbd5e1'}`,
            background: selectedStatus === '' && selectedType === '' ? '#0d9488' : '#ffffff',
            color: selectedStatus === '' && selectedType === '' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          All Schemes ({stats?.total_accounts ?? accounts.length})
        </button>
        <button
          type="button"
          onClick={() => { setSelectedStatus('active'); setSelectedType(''); setPage(1); }}
          style={{
            padding: '7px 14px',
            borderRadius: '20px',
            border: `1px solid ${selectedStatus === 'active' && selectedType === '' ? '#16a34a' : '#cbd5e1'}`,
            background: selectedStatus === 'active' && selectedType === '' ? '#16a34a' : '#ffffff',
            color: selectedStatus === 'active' && selectedType === '' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Active Accounts ({stats?.active_accounts ?? 0})
        </button>
        <button
          type="button"
          onClick={() => { setSelectedType('tuzimbe_group'); setSelectedStatus(''); setPage(1); }}
          style={{
            padding: '7px 14px',
            borderRadius: '20px',
            border: `1px solid ${selectedType === 'tuzimbe_group' ? '#2563eb' : '#cbd5e1'}`,
            background: selectedType === 'tuzimbe_group' ? '#2563eb' : '#ffffff',
            color: selectedType === 'tuzimbe_group' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Tuzimbe Group Cohorts
        </button>
        <button
          type="button"
          onClick={() => { setSelectedType('land_saving'); setSelectedStatus(''); setPage(1); }}
          style={{
            padding: '7px 14px',
            borderRadius: '20px',
            border: `1px solid ${selectedType === 'land_saving' ? '#d97706' : '#cbd5e1'}`,
            background: selectedType === 'land_saving' ? '#d97706' : '#ffffff',
            color: selectedType === 'land_saving' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Land Saving Schemes ({stats?.land_savings?.count ?? 0})
        </button>
        <button
          type="button"
          onClick={() => { setSelectedType('construction_saving'); setSelectedStatus(''); setPage(1); }}
          style={{
            padding: '7px 14px',
            borderRadius: '20px',
            border: `1px solid ${selectedType === 'construction_saving' ? '#7c3aed' : '#cbd5e1'}`,
            background: selectedType === 'construction_saving' ? '#7c3aed' : '#ffffff',
            color: selectedType === 'construction_saving' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Construction Schemes ({stats?.construction_savings?.count ?? 0})
        </button>
        <button
          type="button"
          onClick={() => { setSelectedStatus('completed'); setSelectedType(''); setPage(1); }}
          style={{
            padding: '7px 14px',
            borderRadius: '20px',
            border: `1px solid ${selectedStatus === 'completed' ? '#0f766e' : '#cbd5e1'}`,
            background: selectedStatus === 'completed' ? '#0f766e' : '#ffffff',
            color: selectedStatus === 'completed' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Target Achieved ({stats?.completed_accounts ?? 0})
        </button>
      </div>

      {/* Main Table Card */}
      <div className="savings-table-card">
        <div className="savings-table-wrap">
          <table className="savings-table">
            <thead>
              <tr>
                <th>Account #</th>
                <th>Client Details</th>
                <th>Scheme Type</th>
                <th>Target & Balance (UGX)</th>
                <th>Progress</th>
                <th>Status</th>
                <th>Timeline</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="spinner"></div>
                    <p style={{ marginTop: '0.75rem', color: '#64748b' }}>
                      Loading client savings accounts...
                    </p>
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    <MdAccountBalance style={{ fontSize: '2.5rem', color: '#cbd5e1' }} />
                    <p style={{ margin: '0.5rem 0' }}>No client savings accounts found.</p>
                    <Link to="/savings-accounts/new" className="btn btn-primary btn-sm">
                      Open New Account
                    </Link>
                  </td>
                </tr>
              ) : (
                accounts.map((acc) => (
                  <tr key={acc.uuid}>
                    <td>
                      <span className="account-number-badge">{acc.account_number}</span>
                    </td>
                    <td>
                      <strong>{acc.client?.name || 'Client'}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {acc.client?.client_number} {acc.client?.phone ? `• ${acc.client.phone}` : ''}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`scheme-type-badge ${
                          acc.account_type === 'land_saving' ? 'scheme-land' : acc.account_type === 'tuzimbe_group' ? 'scheme-tuzimbe' : 'scheme-construction'
                        }`}
                      >
                        {acc.account_type === 'land_saving' ? <MdLandscape /> : acc.account_type === 'tuzimbe_group' ? <MdPeople /> : <MdHomeRepairService />}
                        {acc.account_type === 'land_saving' ? 'Land Saving' : acc.account_type === 'tuzimbe_group' ? 'Tuzimbe Group' : 'Construction Saving'}
                      </span>
                      {acc.scheme_name && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                          {acc.scheme_name}
                        </div>
                      )}
                    </td>
                    <td>
                      <div>
                        <strong>UGX {acc.current_balance.toLocaleString()}</strong>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        of UGX {acc.target_amount.toLocaleString()}
                      </div>
                    </td>
                    <td>
                      <div className="progress-cell">
                        <div className="progress-header-info">
                          <span className="progress-pct">{acc.progress_percentage}%</span>
                          <span className="progress-rem">
                            {acc.remaining_amount > 0
                              ? `UGX ${acc.remaining_amount.toLocaleString()} left`
                              : 'Goal Met'}
                          </span>
                        </div>
                        <div className="progress-track">
                          <div
                            className={`progress-bar-fill ${getProgressBarColor(acc.progress_percentage)}`}
                            style={{ width: `${acc.progress_percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge badge-${acc.status}`}>
                        {acc.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem' }}>
                        Opened: <strong>{acc.opened_date}</strong>
                      </div>
                      {acc.target_date && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Target: {acc.target_date}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="table-actions">
                        <Link
                          to={`/savings-accounts/${acc.uuid}`}
                          className="action-icon-btn"
                          title="View Account Details"
                        >
                          <MdVisibility />
                        </Link>

                        <button
                          className="action-icon-btn btn-deposit"
                          title="Adjust Balance / Record Deposit"
                          onClick={() => {
                            setAdjustTarget(acc)
                            setAdjustType('credit')
                            setAdjustAmount('')
                            setAdjustReason('')
                            setAdjustModalOpen(true)
                          }}
                        >
                          <MdAttachMoney />
                        </button>

                        {acc.status === 'active' && (
                          <button
                            className="action-icon-btn btn-suspend"
                            title="Suspend Account"
                            onClick={() => {
                              setSuspendTarget(acc)
                              setSuspendReason('')
                              setSuspendModalOpen(true)
                            }}
                          >
                            <MdPauseCircle />
                          </button>
                        )}

                        {acc.status === 'suspended' && (
                          <button
                            className="action-icon-btn"
                            style={{ color: '#16a34a' }}
                            title="Activate Account"
                            onClick={() => handleActivate(acc)}
                          >
                            <MdCheckCircle />
                          </button>
                        )}

                        {acc.status !== 'closed' && (
                          <button
                            className="action-icon-btn btn-close"
                            title="Close Account"
                            onClick={() => {
                              setCloseTarget(acc)
                              setCloseNotes('')
                              setCloseModalOpen(true)
                            }}
                          >
                            <MdCancel />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > 15 && (
          <div className="pagination-controls">
            <span>
              Showing {accounts.length} of {total} savings accounts
            </span>
            <div className="pagination-pages">
              <button
                className="btn btn-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span style={{ padding: '0.35rem 0.75rem', fontWeight: 600 }}>Page {page}</span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={accounts.length < 15}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADJUST BALANCE / RECORD DEPOSIT                                    */}
      {/* ========================================================================= */}
      {adjustModalOpen && adjustTarget && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Adjust Balance — {adjustTarget.account_number}</h2>
              <button className="modal-close-btn" onClick={() => setAdjustModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleAdjustSubmit}>
              <div className="modal-body">
                <p>
                  Client: <strong>{adjustTarget.client?.name}</strong> • Current Balance:{' '}
                  <strong>UGX {adjustTarget.current_balance.toLocaleString()}</strong>
                </p>

                <div className="form-group">
                  <label>Adjustment Type *</label>
                  <select
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value as any)}
                    required
                  >
                    <option value="credit">Credit (+) Deposit Funds to Account</option>
                    <option value="debit">Debit (-) Disburse / Deduct Funds</option>
                    <option value="set_exact">Set Exact Reconciled Balance</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Amount (UGX) *</label>
                  <input
                    type="number"
                    step="1000"
                    min="1000"
                    required
                    placeholder="e.g. 5000000"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Reason / Audit Note *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. Client deposited cash via finance desk / mobile money reconciliation"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setAdjustModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Apply Balance Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SUSPEND ACCOUNT                                                   */}
      {/* ========================================================================= */}
      {suspendModalOpen && suspendTarget && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Suspend Account — {suspendTarget.account_number}</h2>
              <button className="modal-close-btn" onClick={() => setSuspendModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleSuspendSubmit}>
              <div className="modal-body">
                <p>
                  Are you sure you want to suspend savings account{' '}
                  <strong>{suspendTarget.account_number}</strong> for{' '}
                  <strong>{suspendTarget.client?.name}</strong>?
                </p>
                <div className="form-group">
                  <label>Suspension Reason</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Client requested temporary pause on installments..."
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSuspendModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-warning" disabled={actionLoading}>
                  {actionLoading ? 'Suspending...' : 'Suspend Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CLOSE ACCOUNT                                                     */}
      {/* ========================================================================= */}
      {closeModalOpen && closeTarget && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Close Savings Account — {closeTarget.account_number}</h2>
              <button className="modal-close-btn" onClick={() => setCloseModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleCloseSubmit}>
              <div className="modal-body">
                <p>
                  Closing account for <strong>{closeTarget.client?.name}</strong> (Balance: UGX{' '}
                  {closeTarget.current_balance.toLocaleString()}).
                </p>
                <div className="form-group">
                  <label>Closing Notes / Handover Details</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Target reached, plot deed handed over to client..."
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setCloseModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger" disabled={actionLoading}>
                  {actionLoading ? 'Closing...' : 'Confirm Account Closure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CONSTRUCTION SAVING SCHEMES TEMPLATES              */}
      {/* ========================================================= */}
      {showSchemesModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <MdConstruction style={{ color: '#2563eb' }} />
                Construction Saving Scheme Templates
              </h2>
              <button className="modal-close-btn" onClick={() => setShowSchemesModal(false)}>
                <MdClose />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 0 }}>
                Standard sequential milestone schemes. Enrolling an account creates tiered savings pools that allocate deposits sequentially (Waterfall) from Substructure to Handover.
              </p>

              {schemesLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  Loading construction schemes...
                </div>
              ) : schemesList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  No construction schemes found.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {schemesList.map((scheme) => (
                    <div
                      key={scheme.uuid}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '1rem 1.25rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '0.5rem',
                          flexWrap: 'wrap',
                          gap: '0.5rem',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a' }}>
                            {scheme.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                            Code: {scheme.scheme_code} &bull; Type: {scheme.project_type}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: '#059669', fontSize: '1.05rem' }}>
                            {scheme.currency} {Number(scheme.standard_target_amount).toLocaleString()}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Min Deposit: {scheme.currency} {Number(scheme.minimum_initial_deposit).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {scheme.description && (
                        <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 0.75rem 0' }}>
                          {scheme.description}
                        </p>
                      )}

                      {/* Milestone Template Tiers */}
                      {scheme.milestone_template && scheme.milestone_template.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                            Milestone Funding Tiers ({scheme.milestone_template.length} Pools):
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                            {scheme.milestone_template.map((tmpl) => (
                              <div
                                key={tmpl.tier_order}
                                style={{
                                  background: '#ffffff',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '6px',
                                  padding: '0.4rem 0.6rem',
                                  fontSize: '0.8rem',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                                  <span>#{tmpl.tier_order} {tmpl.name}</span>
                                  <span style={{ color: '#2563eb' }}>{tmpl.weight_percentage}%</span>
                                </div>
                                {tmpl.description && (
                                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>
                                    {tmpl.description}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowSchemesModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: SCHEME & PHASE TRANSFERS (Legacy Manual Section 2.7) */}
      {/* ============================================================ */}
      {showTransfersModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '900px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MdCompareArrows size={22} style={{ color: '#047857' }} />
                <h3>Client Scheme & Phase Transfers</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowTransfersModal(false)}>
                <MdClose />
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
                Review, authorize, and track client balance transfers between Estates, Phases, and Savings Schemes.
                Approved transfers automatically update balances and record immutable ledger transactions.
              </p>

              {transfersLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  Loading transfer requests...
                </div>
              ) : transfersList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                  <p style={{ color: '#64748b', margin: 0 }}>No scheme transfer requests found.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="savings-table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>From Scheme</th>
                        <th>To Scheme</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transfersList.map((tr) => (
                        <tr key={tr.uuid}>
                          <td>
                            <strong>{tr.client?.full_name || tr.client?.first_name || 'Client'}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {tr.client?.client_number}
                            </div>
                          </td>
                          <td>
                            <span style={{ color: '#b91c1c', fontWeight: 600 }}>{tr.from_scheme_name}</span>
                          </td>
                          <td>
                            <span style={{ color: '#047857', fontWeight: 600 }}>{tr.to_scheme_name}</span>
                          </td>
                          <td style={{ fontWeight: 700 }}>
                            UGX {Number(tr.amount).toLocaleString()}
                          </td>
                          <td>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                background:
                                  tr.status === 'approved'
                                    ? '#ecfdf5'
                                    : tr.status === 'rejected'
                                    ? '#fef2f2'
                                    : '#fffbeb',
                                color:
                                  tr.status === 'approved'
                                    ? '#047857'
                                    : tr.status === 'rejected'
                                    ? '#b91c1c'
                                    : '#b45309',
                                border:
                                  tr.status === 'approved'
                                    ? '1px solid #a7f3d0'
                                    : tr.status === 'rejected'
                                    ? '1px solid #fecaca'
                                    : '1px solid #fde68a',
                              }}
                            >
                              {tr.status}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {new Date(tr.created_at).toLocaleDateString()}
                          </td>
                          <td>
                            {tr.status === 'pending' ? (
                              <div style={{ display: 'flex', gap: '0.35rem' }}>
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                  disabled={transferActionLoading}
                                  onClick={() => handleApproveTransfer(tr.uuid)}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-danger"
                                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                  disabled={transferActionLoading}
                                  onClick={() => handleRejectTransfer(tr.uuid)}
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Processed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowTransfersModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Soft Confirmation Modal for Account Activation */}
      <ConfirmDialog
        isOpen={Boolean(accountToActivate)}
        title="Activate Savings Account"
        message={`Are you sure you want to reactivate savings account "${accountToActivate?.account_number}" (${accountToActivate?.client?.first_name} ${accountToActivate?.client?.last_name})?`}
        confirmText="Activate Account"
        cancelText="Cancel"
        variant="primary"
        isLoading={actionLoading}
        onConfirm={executeActivate}
        onClose={() => setAccountToActivate(null)}
      />
    </div>
  )
}

export default SavingsAccountsList
