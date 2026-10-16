import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  MdAdd,
  MdSearch,
  MdRefresh,
  MdVisibility,
  MdReceiptLong,
  MdAttachMoney,
  MdHourglassTop,
  MdCheckCircle,
} from 'react-icons/md'
import expenseService from '../../services/expense.service'
import {
  ExpenseClaim,
  ExpenseStatistics,
  ExpenseClaimStatus,
  ExpenseCategory,
  ExpensePaymentMethod,
} from '../../types/expense.types'
import '../contracts/ContractsList.css'
import './Expenses.css'

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'materials', label: 'Emergency Materials' },
  { value: 'fuel_oil', label: 'Fuel & Lubricants' },
  { value: 'tools_hardware', label: 'Small Tools & Consumables' },
  { value: 'transport', label: 'Haulage & Transport' },
  { value: 'labour_welfare', label: 'Site Labour & Welfare' },
  { value: 'equipment_hire', label: 'Temporary Plant Hire' },
  { value: 'statutory_permits', label: 'Permits & Council Fees' },
  { value: 'office_admin', label: 'Site Office & Admin' },
  { value: 'other', label: 'Other Direct Site Expense' },
]

export const ExpenseClaimsList: React.FC = () => {
  const navigate = useNavigate()

  // State
  const [claims, setClaims] = useState<ExpenseClaim[]>([])
  const [stats, setStats] = useState<ExpenseStatistics | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<ExpenseClaimStatus | ''>('')
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | ''>('')
  const [paymentFilter, setPaymentFilter] = useState<ExpensePaymentMethod | ''>('')
  const [page, setPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [totalCount, setTotalCount] = useState<number>(0)

  const fetchClaims = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await expenseService.getExpenseClaims({
        status: statusFilter || undefined,
        expense_category: categoryFilter || undefined,
        payment_method: paymentFilter || undefined,
        search: search || undefined,
        page,
        per_page: 15,
      })
      const items = res?.data || []
      setClaims(Array.isArray(items) ? items : [])
      setTotalPages(res?.meta?.last_page || 1)
      setTotalCount(res?.meta?.total || items.length)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch expense claims.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, categoryFilter, paymentFilter, search, page])

  const fetchStats = useCallback(async () => {
    try {
      const data = await expenseService.getStatistics()
      setStats(data)
    } catch (err) {
      console.warn('Failed to fetch expense statistics:', err)
    }
  }, [])

  useEffect(() => {
    fetchClaims()
    fetchStats()
  }, [fetchClaims, fetchStats])

  const formatCurrency = (val: number, currency: string = 'UGX') => {
    return `${currency} ${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  const getStatusBadge = (status: ExpenseClaimStatus) => {
    switch (status) {
      case 'draft':
        return <span className="status-badge badge-draft">Draft</span>
      case 'submitted':
        return <span className="status-badge badge-suspended">Submitted</span>
      case 'verified_by_site_manager':
        return <span className="status-badge badge-trade">Site Verified</span>
      case 'approved_by_finance':
        return <span className="status-badge badge-active">Finance Approved</span>
      case 'authorized_by_admin':
        return <span className="status-badge badge-completed">Admin Authorized</span>
      case 'reimbursed':
        return <span className="status-badge badge-active">Reimbursed</span>
      case 'rejected':
        return <span className="status-badge badge-terminated">Rejected</span>
      default:
        return <span className="status-badge badge-draft">{status}</span>
    }
  }

  const getCategoryBadge = (cat: ExpenseCategory) => {
    return <span className={`badge-category cat-${cat}`}>{cat.replace('_', ' ')}</span>
  }

  return (
    <div className="expenses-page">
      {/* Header */}
      <div className="expenses-header">
        <div>
          <h1>Expense Claims & Site Purchasing</h1>
          <p>Multi-tier procurement workflow for emergency purchases, petty cash vouchers, and site consumables</p>
        </div>
        <div className="header-actions">
          <Link to="/expenses/new" className="btn-primary">
            <MdAdd size={20} /> New Expense Claim
          </Link>
          <button onClick={fetchClaims} className="btn-secondary" title="Refresh">
            <MdRefresh size={20} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <MdReceiptLong size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Claims</span>
            <span className="stat-value">{stats ? stats.total_claims : '...'}</span>
            <span className="stat-sub">Site Submissions</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
            <MdAttachMoney size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Value Claimed</span>
            <span className="stat-value" style={{ fontSize: '1.25rem' }}>
              {stats ? formatCurrency(stats.total_amount_claimed) : '...'}
            </span>
            <span className="stat-sub">Direct Purchasing</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
            <MdCheckCircle size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Reimbursed</span>
            <span className="stat-value" style={{ fontSize: '1.25rem', color: '#059669' }}>
              {stats ? formatCurrency(stats.total_amount_reimbursed) : '...'}
            </span>
            <span className="stat-sub">Disbursed to Site</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
            <MdHourglassTop size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Pending In Pipeline</span>
            <span className="stat-value" style={{ color: '#d97706' }}>
              {stats
                ? stats.pending_verification +
                  stats.pending_finance_approval +
                  stats.pending_admin_authorization +
                  stats.pending_reimbursement
                : '...'}
            </span>
            <span className="stat-sub">Awaiting Multi-Tier Sign-Off</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="contracts-card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <MdSearch
              size={20}
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
            />
            <input
              type="text"
              placeholder="Search by title, claim number, vendor, receipt..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="form-input"
              style={{ paddingLeft: '2.5rem', width: '100%' }}
            />
          </div>

          <div style={{ minWidth: '150px' }}>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as ExpenseClaimStatus | '')
                setPage(1)
              }}
              className="form-select"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="verified_by_site_manager">Verified by Site Mgr</option>
              <option value="approved_by_finance">Approved by Finance</option>
              <option value="authorized_by_admin">Authorized by Admin</option>
              <option value="reimbursed">Reimbursed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div style={{ minWidth: '160px' }}>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value as ExpenseCategory | '')
                setPage(1)
              }}
              className="form-select"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: '150px' }}>
            <select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value as ExpensePaymentMethod | '')
                setPage(1)
              }}
              className="form-select"
            >
              <option value="">All Payment Methods</option>
              <option value="petty_cash">Petty Cash Float</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="bank_transfer">Bank Transfer / EFT</option>
              <option value="cash">Direct Cash</option>
              <option value="company_card">Company Card</option>
            </select>
          </div>

          {(search || statusFilter || categoryFilter || paymentFilter) && (
            <button
              onClick={() => {
                setSearch('')
                setStatusFilter('')
                setCategoryFilter('')
                setPaymentFilter('')
                setPage(1)
              }}
              className="btn-secondary"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div className="contracts-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            Loading expense claims...
          </div>
        ) : claims.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <MdReceiptLong size={48} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
            <p style={{ fontSize: '1.125rem', fontWeight: 500, margin: '0 0 0.5rem 0' }}>No expense claims found</p>
            <p style={{ fontSize: '0.875rem', margin: 0 }}>Create a new claim for site purchases or adjust filters.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="contracts-table">
              <thead>
                <tr>
                  <th>Claim No & Title</th>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Project / Site</th>
                  <th>Claimant</th>
                  <th>Payment Method</th>
                  <th style={{ textAlign: 'right' }}>Total Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => (
                  <tr
                    key={claim.id}
                    onClick={() => navigate(`/expenses/${claim.uuid}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{claim.claim_number}</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{claim.title}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem' }}>
                        {new Date(claim.expense_date).toLocaleDateString()}
                      </span>
                    </td>
                    <td>{getCategoryBadge(claim.expense_category)}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{claim.site?.name || 'Site'}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{claim.project?.name || ''}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem' }}>{claim.claimant?.name || '—'}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', textTransform: 'capitalize' }}>
                        {claim.payment_method.replace('_', ' ')}
                      </span>
                      {claim.petty_cash_account && (
                        <div style={{ fontSize: '0.75rem', color: '#2563eb' }}>
                          Float: {claim.petty_cash_account.account_number}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      {formatCurrency(claim.total_amount, claim.currency)}
                    </td>
                    <td>{getStatusBadge(claim.status)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                        <Link
                          to={`/expenses/${claim.uuid}`}
                          className="btn-secondary"
                          style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}
                          title="View Details & Sign-Off"
                        >
                          <MdVisibility size={16} /> Details
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && claims.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Showing {claims.length} of {totalCount} claims
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
