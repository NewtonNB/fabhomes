import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  MdAdd,
  MdSearch,
  MdRefresh,
  MdVisibility,
  MdAccountBalanceWallet,
  MdPayments,
  MdAttachMoney,
  MdWarning,
  MdCheckCircle,
} from 'react-icons/md'
import pettyCashService from '../../services/petty-cash.service'
import {
  PettyCashAccount,
  PettyCashStatistics,
  PettyCashAccountStatus,
} from '../../types/petty-cash.types'
import '../contracts/ContractsList.css'
import './PettyCash.css'

export const PettyCashList: React.FC = () => {
  const navigate = useNavigate()

  // State
  const [accounts, setAccounts] = useState<PettyCashAccount[]>([])
  const [stats, setStats] = useState<PettyCashStatistics | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<PettyCashAccountStatus | ''>('')
  const [page, setPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [totalCount, setTotalCount] = useState<number>(0)

  // Fetch accounts
  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await pettyCashService.getPettyCashAccounts({
        status: statusFilter || undefined,
        search: search || undefined,
        page,
        per_page: 15,
      })
      const items = res?.data || []
      setAccounts(Array.isArray(items) ? items : [])
      setTotalPages(res?.meta?.last_page || 1)
      setTotalCount(res?.meta?.total || items.length)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch petty cash accounts.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search, page])

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    try {
      const data = await pettyCashService.getStatistics()
      setStats(data)
    } catch (err) {
      console.warn('Failed to fetch petty cash statistics:', err)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
    fetchStats()
  }, [fetchAccounts, fetchStats])

  const formatCurrency = (val: number, currency: string = 'UGX') => {
    return `${currency} ${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  const getStatusBadge = (status: PettyCashAccountStatus) => {
    switch (status) {
      case 'active':
        return <span className="status-badge badge-active">Active</span>
      case 'suspended':
        return <span className="status-badge badge-suspended">Suspended</span>
      case 'closed':
        return <span className="status-badge badge-closed">Closed</span>
      default:
        return <span className="status-badge badge-closed">{status}</span>
    }
  }

  const getProgressColorClass = (balance: number, limit: number) => {
    if (limit <= 0) return 'progress-safe'
    const pct = (balance / limit) * 100
    if (pct < 20) return 'progress-danger'
    if (pct < 40) return 'progress-warning'
    return 'progress-safe'
  }

  return (
    <div className="petty-cash-page">
      {/* Top Header */}
      <div className="petty-cash-header">
        <div>
          <h1>Petty Cash & Site Floats</h1>
          <p>Monitor site cash reserves, replenishments, disbursements, and float limits</p>
        </div>
        <div className="header-actions">
          <Link to="/petty-cash/new" className="btn-primary">
            <MdAdd size={20} /> New Site Float
          </Link>
          <button onClick={fetchAccounts} className="btn-secondary" title="Refresh">
            <MdRefresh size={20} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <MdAccountBalanceWallet size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Floats</span>
            <span className="stat-value">{stats ? stats.total_accounts : '...'}</span>
            <span className="stat-sub">{stats ? `${stats.active_accounts} Active` : ''}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
            <MdCheckCircle size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Float Limit</span>
            <span className="stat-value" style={{ fontSize: '1.25rem' }}>
              {stats ? formatCurrency(stats.total_float_limit) : '...'}
            </span>
            <span className="stat-sub">Across All Authorized Sites</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
            <MdAttachMoney size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Current Cash on Hand</span>
            <span className="stat-value" style={{ fontSize: '1.25rem', color: '#16a34a' }}>
              {stats ? formatCurrency(stats.total_current_balance) : '...'}
            </span>
            <span className="stat-sub">Live Float Reserves</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
            <MdPayments size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Disbursed This Month</span>
            <span className="stat-value" style={{ fontSize: '1.25rem', color: '#d97706' }}>
              {stats ? formatCurrency(stats.total_disbursed_this_month) : '...'}
            </span>
            <span className="stat-sub">Authorized Site Purchases</span>
          </div>
        </div>

        {stats && stats.low_balance_accounts_count > 0 && (
          <div className="stat-card" style={{ borderColor: '#fca5a5', backgroundColor: '#fef2f2' }}>
            <div className="stat-icon" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
              <MdWarning size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-label" style={{ color: '#b91c1c' }}>Low Float Alert</span>
              <span className="stat-value" style={{ color: '#dc2626' }}>{stats.low_balance_accounts_count}</span>
              <span className="stat-sub" style={{ color: '#b91c1c' }}>Accounts below 20% limit</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="contracts-card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <MdSearch
              size={20}
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
            />
            <input
              type="text"
              placeholder="Search by account number, name, site, or custodian..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="form-input"
              style={{ paddingLeft: '2.5rem', width: '100%' }}
            />
          </div>

          <div style={{ minWidth: '160px' }}>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as PettyCashAccountStatus | '')
                setPage(1)
              }}
              className="form-select"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {(search || statusFilter) && (
            <button
              onClick={() => {
                setSearch('')
                setStatusFilter('')
                setPage(1)
              }}
              className="btn-secondary"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Accounts Table */}
      <div className="contracts-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            Loading petty cash accounts...
          </div>
        ) : accounts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <MdAccountBalanceWallet size={48} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
            <p style={{ fontSize: '1.125rem', fontWeight: 500, margin: '0 0 0.5rem 0' }}>No petty cash accounts found</p>
            <p style={{ fontSize: '0.875rem', margin: 0 }}>Create a new site float or adjust your filter query.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="contracts-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Project & Site</th>
                  <th>Custodian</th>
                  <th>Current Balance</th>
                  <th>Float Limit</th>
                  <th>Float Health</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc) => {
                  const pct = acc.float_limit > 0 ? Math.min(100, Math.round((acc.current_balance / acc.float_limit) * 100)) : 0
                  const colorClass = getProgressColorClass(acc.current_balance, acc.float_limit)

                  return (
                    <tr
                      key={acc.id}
                      onClick={() => navigate(`/petty-cash/${acc.uuid}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{acc.account_number}</div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{acc.name}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{acc.project?.name || '—'}</div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{acc.site?.name || 'All Sites'}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{acc.custodian?.name || 'Unassigned'}</div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{acc.custodian?.email || ''}</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>
                          {formatCurrency(acc.current_balance, acc.currency)}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: '#64748b' }}>
                          {formatCurrency(acc.float_limit, acc.currency)}
                        </span>
                      </td>
                      <td style={{ minWidth: '130px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>
                          <span>{pct}% Available</span>
                        </div>
                        <div className="float-progress-container">
                          <div
                            className={`float-progress-bar ${colorClass}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                      <td>{getStatusBadge(acc.status)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                          <Link
                            to={`/petty-cash/${acc.uuid}`}
                            className="btn-secondary"
                            style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}
                            title="View Float Ledger"
                          >
                            <MdVisibility size={16} /> Details
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && accounts.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Showing {accounts.length} of {totalCount} accounts
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn-secondary"
                style={{ padding: '0.375rem 0.75rem' }}
              >
                Previous
              </button>
              <span style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem', fontWeight: 500 }}>
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="btn-secondary"
                style={{ padding: '0.375rem 0.75rem' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
