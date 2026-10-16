import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  MdAdd,
  MdSearch,
  MdRefresh,
  MdHandshake,
  MdCheckCircle,
  MdPauseCircle,
  MdCancel,
  MdVisibility,
  MdPlayArrow,
  MdClose,
  MdTrendingUp,
} from 'react-icons/md'
import contractService from '../../services/contract.service'
import {
  SubcontractorContract,
  ContractStatistics,
  TradeCategory,
  ContractStatus,
} from '../../types/contract.types'
import './ContractsList.css'

const TRADE_CATEGORIES: { value: TradeCategory; label: string }[] = [
  { value: 'masonry', label: 'Masonry & Concrete' },
  { value: 'electrical', label: 'Electrical Systems' },
  { value: 'plumbing', label: 'Plumbing & Drainage' },
  { value: 'roofing', label: 'Roofing & Trusses' },
  { value: 'painting', label: 'Painting & Finishing' },
  { value: 'steelwork', label: 'Steelwork & Metal' },
  { value: 'carpentry', label: 'Carpentry & Joinery' },
  { value: 'tiling', label: 'Tiling & Flooring' },
  { value: 'landscaping', label: 'Landscaping & External' },
  { value: 'earthworks', label: 'Earthworks & Grading' },
  { value: 'other', label: 'Other Trades' },
]

export const ContractsList: React.FC = () => {
  const navigate = useNavigate()

  // State
  const [contracts, setContracts] = useState<SubcontractorContract[]>([])
  const [stats, setStats] = useState<ContractStatistics | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState<string>('')
  const [selectedTrade, setSelectedTrade] = useState<TradeCategory | ''>('')
  const [selectedStatus, setSelectedStatus] = useState<ContractStatus | ''>('')
  const [page, setPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [totalCount, setTotalCount] = useState<number>(0)

  // Modals
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [suspendModal, setSuspendModal] = useState<{ open: boolean; contract: SubcontractorContract | null; reason: string }>({
    open: false,
    contract: null,
    reason: '',
  })
  const [terminateModal, setTerminateModal] = useState<{ open: boolean; contract: SubcontractorContract | null; reason: string }>({
    open: false,
    contract: null,
    reason: '',
  })

  const notifySuccess = (msg: string) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  // Fetch contracts
  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await contractService.getSubcontractorContracts({
        trade_category: selectedTrade || undefined,
        status: selectedStatus || undefined,
        search: search || undefined,
        page,
        per_page: 15,
      })
      const items = res?.data || []
      setContracts(Array.isArray(items) ? items : [])
      setTotalPages(res?.meta?.last_page || 1)
      setTotalCount(res?.meta?.total || items.length)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load subcontractor contracts')
    } finally {
      setLoading(false)
    }
  }, [selectedTrade, selectedStatus, search, page])

  // Fetch Statistics
  const fetchStats = useCallback(async () => {
    try {
      const data = await contractService.getSubcontractorContractStatistics()
      setStats(data)
    } catch (err) {
      console.warn('Failed to fetch contract statistics:', err)
    }
  }, [])

  useEffect(() => {
    fetchContracts()
    fetchStats()
  }, [fetchContracts, fetchStats])

  // Quick State Transitions
  const handleActivate = async (contract: SubcontractorContract) => {
    if (!window.confirm(`Activate contract ${contract.contract_number} for ${contract.subcontractor_name}?`)) {
      return
    }
    try {
      setActionLoading(true)
      await contractService.activateSubcontractorContract(contract.uuid)
      notifySuccess(`Contract ${contract.contract_number} successfully activated.`)
      fetchContracts()
      fetchStats()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to activate contract')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSuspendSubmit = async () => {
    if (!suspendModal.contract) return
    try {
      setActionLoading(true)
      await contractService.suspendSubcontractorContract(suspendModal.contract.uuid, suspendModal.reason)
      notifySuccess(`Contract ${suspendModal.contract.contract_number} has been suspended.`)
      setSuspendModal({ open: false, contract: null, reason: '' })
      fetchContracts()
      fetchStats()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to suspend contract')
    } finally {
      setActionLoading(false)
    }
  }

  const handleTerminateSubmit = async () => {
    if (!terminateModal.contract || !terminateModal.reason.trim()) {
      alert('A valid termination reason is required.')
      return
    }
    try {
      setActionLoading(true)
      await contractService.terminateSubcontractorContract(terminateModal.contract.uuid, terminateModal.reason)
      notifySuccess(`Contract ${terminateModal.contract.contract_number} has been terminated.`)
      setTerminateModal({ open: false, contract: null, reason: '' })
      fetchContracts()
      fetchStats()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to terminate contract')
    } finally {
      setActionLoading(false)
    }
  }

  const formatCurrency = (val: number, currency: string = 'UGX') => {
    return `${currency} ${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  return (
    <div className="contracts-page">
      {/* Page Header */}
      <div className="contracts-header">
        <div>
          <h1>Subcontractor Contracts & Works</h1>
          <p>Manage trade subcontracts, retention funds, and contractor performance across construction sites.</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => { fetchContracts(); fetchStats(); }} disabled={loading}>
            <MdRefresh /> Refresh
          </button>
          <Link to="/contracts/new" className="btn-primary">
            <MdAdd /> New Subcontract
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && <div className="alert-success">{successMessage}</div>}
      {error && <div className="alert-error">{error}</div>}

      {/* KPI Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <MdHandshake />
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Contracts</div>
            <div className="stat-value">{stats?.total_contracts ?? totalCount}</div>
            <div className="stat-subtext">Active: {stats?.active_count ?? 0} | Draft: {stats?.draft_count ?? 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <MdTrendingUp />
          </div>
          <div className="stat-content">
            <div className="stat-label">Committed Portfolio Sum</div>
            <div className="stat-value">{formatCurrency(stats?.total_contract_sum ?? 0)}</div>
            <div className="stat-subtext">Budgeted Retentions: {formatCurrency(stats?.total_retention_budgeted ?? 0)}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon amber">
            <MdCheckCircle />
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Certified Gross</div>
            <div className="stat-value">{formatCurrency(stats?.total_certified_gross ?? 0)}</div>
            <div className="stat-subtext">Retention Held: {formatCurrency(stats?.total_retention_held ?? 0)}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <MdCheckCircle />
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Disbursed (Paid)</div>
            <div className="stat-value">{formatCurrency(stats?.total_paid ?? 0)}</div>
            <div className="stat-subtext">Remaining Balance: {formatCurrency(stats?.overall_balance_remaining ?? 0)}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-card">
        <div className="search-box">
          <MdSearch className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by contract #, subcontractor name, trade, or TIN..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>

        <div className="filter-selects">
          <select
            className="filter-select"
            value={selectedTrade}
            onChange={(e) => {
              setSelectedTrade(e.target.value as TradeCategory | '')
              setPage(1)
            }}
          >
            <option value="">All Trade Categories</option>
            {TRADE_CATEGORIES.map((trade) => (
              <option key={trade.value} value={trade.value}>
                {trade.label}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value as ContractStatus | '')
              setPage(1)
            }}
          >
            <option value="">All Contract Statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="completed">Completed</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="table-card">
        {loading ? (
          <div className="loading-box">
            <div className="spinner"></div>
            <p>Loading subcontractor contracts...</p>
          </div>
        ) : contracts.length === 0 ? (
          <div className="empty-box">
            <p>No subcontractor contracts found matching current filters.</p>
            <Link to="/contracts/new" className="btn-primary" style={{ marginTop: '0.75rem' }}>
              <MdAdd /> Create First Contract
            </Link>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="contracts-table">
              <thead>
                <tr>
                  <th>Contract Number</th>
                  <th>Title & Subcontractor</th>
                  <th>Trade</th>
                  <th>Site / Project</th>
                  <th>Contract Sum</th>
                  <th>Certified Gross</th>
                  <th>Total Paid</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((item) => (
                  <tr key={item.uuid}>
                    <td>
                      <Link to={`/contracts/${item.uuid}`} className="contract-num">
                        {item.contract_number}
                      </Link>
                    </td>
                    <td>
                      <span className="subcontractor-title">{item.title}</span>
                      <span className="subcontractor-name">
                        {item.subcontractor_name} {item.subcontractor_phone ? `(${item.subcontractor_phone})` : ''}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-trade">{item.trade_category}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{item.site?.name || 'Site'}</span>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>
                        {item.project?.name || 'Project'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(item.contract_sum, item.currency)}</td>
                    <td style={{ color: '#0369a1', fontWeight: 500 }}>
                      {formatCurrency(item.total_certified_gross, item.currency)}
                    </td>
                    <td style={{ color: '#15803d', fontWeight: 600 }}>
                      {formatCurrency(item.total_paid, item.currency)}
                    </td>
                    <td className="progress-cell">
                      <div className="progress-bar-bg">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${Math.min(100, Math.max(0, item.percentage_completed))}%` }}
                        ></div>
                      </div>
                      <div className="progress-text">
                        <span>{item.percentage_completed}%</span>
                        <span>Rem: {formatCurrency(item.remaining_balance, item.currency)}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${item.status}`}>{item.status}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="action-btn view"
                          title="View Details"
                          onClick={() => navigate(`/contracts/${item.uuid}`)}
                        >
                          <MdVisibility />
                        </button>

                        {item.status === 'draft' && (
                          <button
                            className="action-btn activate"
                            title="Activate Contract"
                            onClick={() => handleActivate(item)}
                            disabled={actionLoading}
                          >
                            <MdPlayArrow />
                          </button>
                        )}

                        {item.status === 'active' && (
                          <button
                            className="action-btn suspend"
                            title="Suspend Contract"
                            onClick={() => setSuspendModal({ open: true, contract: item, reason: '' })}
                            disabled={actionLoading}
                          >
                            <MdPauseCircle />
                          </button>
                        )}

                        {['draft', 'active', 'suspended'].includes(item.status) && (
                          <button
                            className="action-btn terminate"
                            title="Terminate Contract"
                            onClick={() => setTerminateModal({ open: true, contract: item, reason: '' })}
                            disabled={actionLoading}
                          >
                            <MdCancel />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {contracts.length > 0 && (
          <div className="pagination-container">
            <div>
              Showing page {page} of {totalPages} ({totalCount} total contracts)
            </div>
            <div className="pagination-buttons">
              <button
                className="btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                className="btn-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Suspend Modal */}
      {suspendModal.open && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Suspend Subcontract</h3>
              <button
                className="modal-close"
                onClick={() => setSuspendModal({ open: false, contract: null, reason: '' })}
              >
                <MdClose />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#475569', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Are you sure you want to suspend contract <strong>{suspendModal.contract?.contract_number}</strong> (
                {suspendModal.contract?.subcontractor_name})?
              </p>
              <div className="form-group">
                <label>Reason for Suspension</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="e.g. Site work temporarily stalled pending material delivery..."
                  value={suspendModal.reason}
                  onChange={(e) => setSuspendModal({ ...suspendModal, reason: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setSuspendModal({ open: false, contract: null, reason: '' })}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                style={{ backgroundColor: '#d97706' }}
                onClick={handleSuspendSubmit}
                disabled={actionLoading}
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terminate Modal */}
      {terminateModal.open && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Terminate Subcontract</h3>
              <button
                className="modal-close"
                onClick={() => setTerminateModal({ open: false, contract: null, reason: '' })}
              >
                <MdClose />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Warning: Terminating contract <strong>{terminateModal.contract?.contract_number}</strong> will halt all
                further valuations and works under this contract.
              </p>
              <div className="form-group">
                <label>Termination Cause / Notice (Required)</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="State breach of contract, abandonment, non-compliance, or mutual agreement..."
                  value={terminateModal.reason}
                  onChange={(e) => setTerminateModal({ ...terminateModal, reason: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setTerminateModal({ open: false, contract: null, reason: '' })}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                style={{ backgroundColor: '#dc2626' }}
                onClick={handleTerminateSubmit}
                disabled={actionLoading || !terminateModal.reason.trim()}
              >
                Confirm Termination
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ContractsList
