import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  MdSearch,
  MdAdd,
  MdReceipt,
  MdCheckCircle,
  MdPendingActions,
  MdWarning,
  MdVisibility,
  MdCheck,
  MdVerified,
  MdRefresh,
  MdPayment,
  MdPhoneIphone,
} from 'react-icons/md'
import { paymentService } from '../../services/payment.service'
import { Payment, PaymentStatistics } from '../../types/payment.types'
import { MobileMoneyConsoleTab } from './components/MobileMoneyConsoleTab'
import { PaymentGatewaysTab } from './components/PaymentGatewaysTab'
import './PaymentsList.css'

const PaymentsList: React.FC = () => {
  const [mainTab, setMainTab] = useState<'standard' | 'mobile_money' | 'gateways'>('standard')
  const [payments, setPayments] = useState<Payment[]>([])
  const [statistics, setStatistics] = useState<PaymentStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [, setStatsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Dynamic Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'verified' | 'confirmed' | 'pending' | 'overdue'>('all')
  const [selectedType, setSelectedType] = useState<string>('')
  const [selectedMethod, setSelectedMethod] = useState<string>('')

  // Live Auto-Polling
  const [autoPolling, setAutoPolling] = useState(true)
  const pollingRef = useRef<any>(null)

  // Dynamic Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  const fetchPayments = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true)
      setError(null)
      const response = await paymentService.getPayments({ per_page: 100 })
      
      const rawList = (response as any)?.data?.data || (response as any)?.data || (Array.isArray(response) ? response : [])
      setPayments(Array.isArray(rawList) ? rawList : [])
    } catch (err: any) {
      if (!isBackground) {
        setError(err.message || 'Failed to fetch payments')
      }
    } finally {
      if (!isBackground) setLoading(false)
    }
  }

  const fetchStatistics = async () => {
    try {
      setStatsLoading(true)
      const stats = await paymentService.getStatistics()
      setStatistics(stats)
    } catch (err: any) {
      // Gracefully silent; computed stats will take over
    } finally {
      setStatsLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
    fetchStatistics()
  }, [])

  // Auto-polling (every 12 seconds)
  useEffect(() => {
    if (autoPolling) {
      pollingRef.current = setInterval(() => {
        fetchPayments(true)
        fetchStatistics()
      }, 12000)
    } else {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [autoPolling])

  // Optimistic Confirm Action
  const handleConfirm = async (uuid: string) => {
    try {
      setActionLoading(uuid)
      setPayments(prev => prev.map(p => p.uuid === uuid ? { ...p, status: 'confirmed' } : p))
      await paymentService.confirmPayment(uuid)
      fetchStatistics()
    } catch (err: any) {
      fetchPayments(true)
      setError(err.message || 'Failed to confirm payment')
    } finally {
      setActionLoading(null)
    }
  }

  // Optimistic Verify Action
  const handleVerify = async (uuid: string) => {
    try {
      setActionLoading(uuid)
      setPayments(prev => prev.map(p => p.uuid === uuid ? { ...p, status: 'verified' } : p))
      await paymentService.verifyPayment(uuid)
      fetchStatistics()
    } catch (err: any) {
      fetchPayments(true)
      setError(err.message || 'Failed to verify payment')
    } finally {
      setActionLoading(null)
    }
  }

  // Dynamic Live Category Counts
  const counts = useMemo(() => {
    return {
      all: payments.length,
      verified: payments.filter(p => p.status === 'verified').length,
      confirmed: payments.filter(p => p.status === 'confirmed').length,
      pending: payments.filter(p => p.status === 'pending').length,
      overdue: payments.filter(p => p.is_overdue || (p.due_date && new Date(p.due_date) < new Date() && p.status !== 'verified')).length,
    }
  }, [payments])

  // Resilient Computed Financial Stats (combines API statistics with client-side calculation)
  const stats = useMemo(() => {
    const verifiedPayments = payments.filter(p => p.status === 'verified')
    const pendingPayments = payments.filter(p => p.status === 'pending')
    const confirmedPayments = payments.filter(p => p.status === 'confirmed')
    const overduePayments = payments.filter(p => p.is_overdue || (p.due_date && new Date(p.due_date) < new Date() && p.status !== 'verified'))

    const verifiedAmount = verifiedPayments.reduce((sum, p) => sum + Number(p.total_amount || 0), 0)
    const pendingAmount = pendingPayments.reduce((sum, p) => sum + Number(p.total_amount || 0), 0)
    const confirmedAmount = confirmedPayments.reduce((sum, p) => sum + Number(p.total_amount || 0), 0)

    return {
      total_amount: statistics?.total_amount ?? verifiedAmount,
      verified_payments: statistics?.verified_payments ?? verifiedPayments.length,
      pending_amount: statistics?.pending_amount ?? pendingAmount,
      pending_payments: statistics?.pending_payments ?? pendingPayments.length,
      confirmed_amount: statistics?.confirmed_amount ?? confirmedAmount,
      confirmed_payments: statistics?.confirmed_payments ?? confirmedPayments.length,
      overdue_payments: statistics?.overdue_payments ?? overduePayments.length,
    }
  }, [payments, statistics])

  // Instant Multi-Field Filter
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      // Category filter
      if (selectedCategory === 'verified' && p.status !== 'verified') return false
      if (selectedCategory === 'confirmed' && p.status !== 'confirmed') return false
      if (selectedCategory === 'pending' && p.status !== 'pending') return false
      if (selectedCategory === 'overdue' && !(p.is_overdue || (p.due_date && new Date(p.due_date) < new Date() && p.status !== 'verified'))) return false

      // Type & Method
      if (selectedType && p.payment_type !== selectedType) return false
      if (selectedMethod && p.payment_method !== selectedMethod) return false

      // Instant search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase()
        const pNum = (p.payment_number || '').toLowerCase()
        const refNum = (p.reference_number || '').toLowerCase()
        const clientName = (p.client?.full_name || '').toLowerCase()
        const unitNum = (p.unit?.unit_number || '').toLowerCase()

        return pNum.includes(query) || refNum.includes(query) || clientName.includes(query) || unitNum.includes(query)
      }

      return true
    })
  }, [payments, selectedCategory, selectedType, selectedMethod, searchTerm])

  // Pagination Slice
  const totalPages = Math.ceil(filteredPayments.length / pageSize) || 1
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredPayments.slice(start, start + pageSize)
  }, [filteredPayments, currentPage, pageSize])

  const startIndex = filteredPayments.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, filteredPayments.length)

  const formatCurrency = (amount: number, currency: string = 'UGX') => {
    return `${currency} ${Number(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <span className="badge badge-success">Verified</span>
      case 'confirmed':
        return <span className="badge badge-info">Confirmed</span>
      case 'pending':
        return <span className="badge badge-warning">Pending</span>
      case 'rejected':
        return <span className="badge badge-danger">Rejected</span>
      case 'refunded':
        return <span className="badge badge-secondary">Refunded</span>
      case 'cancelled':
        return <span className="badge badge-dark">Cancelled</span>
      default:
        return <span className="badge badge-secondary">{status}</span>
    }
  }

  const formatType = (type: string) => {
    return (type || '')
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

  return (
    <div className="payments-container">
      {/* Header */}
      <div className="payments-header">
        <div>
          <h1>Payment Management</h1>
          <p className="page-subtitle">Track receipts, client installments, and financial collections in real-time</p>
        </div>
        <div className="payments-actions">
          <button 
            className="live-poll-toggle"
            onClick={() => setAutoPolling(prev => !prev)}
            title="Toggle Live Real-Time Auto-Polling"
          >
            <span className={`live-dot ${!autoPolling ? 'paused' : ''}`}></span>
            {autoPolling ? 'Live Streaming' : 'Polling Paused'}
          </button>
          <button onClick={() => { fetchPayments(); fetchStatistics(); }} className="btn-secondary" title="Refresh">
            <MdRefresh /> Refresh
          </button>
          <Link to="/payments/new" className="btn-add-payment">
            <MdAdd /> Record Payment
          </Link>
        </div>
      </div>

      {/* Module Switcher Tabs */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', borderBottom: '2px solid #e2e8f0' }}>
        <button
          onClick={() => setMainTab('standard')}
          style={{
            background: 'none',
            border: 'none',
            padding: '12px 6px',
            fontSize: '15px',
            fontWeight: 700,
            cursor: 'pointer',
            color: mainTab === 'standard' ? '#2563eb' : '#64748b',
            borderBottom: mainTab === 'standard' ? '2px solid #2563eb' : '2px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <MdReceipt size={18} />
          Standard Collections & Invoices
        </button>

        <button
          onClick={() => setMainTab('mobile_money')}
          style={{
            background: 'none',
            border: 'none',
            padding: '12px 6px',
            fontSize: '15px',
            fontWeight: 700,
            cursor: 'pointer',
            color: mainTab === 'mobile_money' ? '#2563eb' : '#64748b',
            borderBottom: mainTab === 'mobile_money' ? '2px solid #2563eb' : '2px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <MdPhoneIphone size={18} />
          Mobile Money Console (MTN & Airtel)
        </button>

        <button
          onClick={() => setMainTab('gateways')}
          style={{
            background: 'none',
            border: 'none',
            padding: '12px 6px',
            fontSize: '15px',
            fontWeight: 700,
            cursor: 'pointer',
            color: mainTab === 'gateways' ? '#2563eb' : '#64748b',
            borderBottom: mainTab === 'gateways' ? '2px solid #2563eb' : '2px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <MdPayment size={18} />
          Payment Gateways & Checkout
        </button>
      </div>

      {mainTab === 'mobile_money' ? (
        <MobileMoneyConsoleTab
          onRefreshParent={() => {
            fetchPayments(true)
            fetchStatistics()
          }}
        />
      ) : mainTab === 'gateways' ? (
        <PaymentGatewaysTab />
      ) : (
        <>
          {/* Resilient KPI Stats Header */}
          <div className="payments-stats">
        <div className="stat-card total">
          <div className="stat-icon-wrapper">
            <MdReceipt />
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Verified Revenue</div>
            <div className="stat-value">
              {formatCurrency(stats.total_amount)}
            </div>
            <div className="stat-sub">
              {stats.verified_payments} verified transactions
            </div>
          </div>
        </div>

        <div className="stat-card pending">
          <div className="stat-icon-wrapper">
            <MdPendingActions />
          </div>
          <div className="stat-content">
            <div className="stat-label">Pending Approval</div>
            <div className="stat-value">
              {formatCurrency(stats.pending_amount)}
            </div>
            <div className="stat-sub">
              {stats.pending_payments} awaiting confirmation
            </div>
          </div>
        </div>

        <div className="stat-card confirmed">
          <div className="stat-icon-wrapper">
            <MdCheckCircle />
          </div>
          <div className="stat-content">
            <div className="stat-label">Confirmed (Unverified)</div>
            <div className="stat-value">
              {formatCurrency(stats.confirmed_amount)}
            </div>
            <div className="stat-sub">
              {stats.confirmed_payments} ready for audit
            </div>
          </div>
        </div>

        <div className="stat-card overdue">
          <div className="stat-icon-wrapper">
            <MdWarning />
          </div>
          <div className="stat-content">
            <div className="stat-label">Overdue Payments</div>
            <div className="stat-value">
              {stats.overdue_payments}
            </div>
            <div className="stat-sub">Requires follow-up</div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert-box alert-error">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <MdWarning size={18} /> {error}
          </span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Dynamic Category Filter Chips */}
      <div className="payments-category-chips">
        <button
          className={`category-chip ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => { setSelectedCategory('all'); setCurrentPage(1); }}
        >
          All Payments <span className="chip-count">{counts.all}</span>
        </button>
        <button
          className={`category-chip ${selectedCategory === 'verified' ? 'active' : ''}`}
          onClick={() => { setSelectedCategory('verified'); setCurrentPage(1); }}
        >
          Verified <span className="chip-count">{counts.verified}</span>
        </button>
        <button
          className={`category-chip ${selectedCategory === 'confirmed' ? 'active' : ''}`}
          onClick={() => { setSelectedCategory('confirmed'); setCurrentPage(1); }}
        >
          Confirmed <span className="chip-count">{counts.confirmed}</span>
        </button>
        <button
          className={`category-chip ${selectedCategory === 'pending' ? 'active' : ''}`}
          onClick={() => { setSelectedCategory('pending'); setCurrentPage(1); }}
        >
          Draft / Pending <span className="chip-count">{counts.pending}</span>
        </button>
        <button
          className={`category-chip ${selectedCategory === 'overdue' ? 'active' : ''}`}
          onClick={() => { setSelectedCategory('overdue'); setCurrentPage(1); }}
        >
          Overdue <span className="chip-count">{counts.overdue}</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="payments-filters">
        <div className="search-box">
          <MdSearch className="search-icon" />
          <input
            type="text"
            placeholder="Instant search by Payment #, Reference, Client, Unit..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>

        <div className="filter-group">
          <select
            value={selectedType}
            onChange={(e) => { setSelectedType(e.target.value); setCurrentPage(1); }}
          >
            <option value="">All Types</option>
            <option value="booking_fee">Booking Fee</option>
            <option value="deposit">Deposit</option>
            <option value="installment">Installment</option>
            <option value="balance">Balance</option>
            <option value="full_payment">Full Payment</option>
            <option value="legal_fee">Legal & Documentation Fee</option>
            <option value="survey_fee">Survey & Boundary Fee</option>
            <option value="title_fee">Land Title Processing Fee</option>
            <option value="site_visit_fee">Site Visit & Inspection Fee</option>
            <option value="membership_fee">Scheme Membership Fee</option>
            <option value="penalty">Penalty</option>
            <option value="refund">Refund</option>
          </select>

          <select
            value={selectedMethod}
            onChange={(e) => { setSelectedMethod(e.target.value); setCurrentPage(1); }}
          >
            <option value="">All Methods</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="cash">Cash</option>
            <option value="check">Check</option>
            <option value="card">Card</option>
          </select>

          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
          >
            <option value="10">10 per page</option>
            <option value="15">15 per page</option>
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="payments-table-container">
        <table className="payments-table">
          <thead>
            <tr>
              <th>Payment #</th>
              <th>Date</th>
              <th>Client</th>
              <th>Unit</th>
              <th>Type & Method</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center loading-cell">
                  <div className="spinner"></div>
                  <p>Loading payments...</p>
                </td>
              </tr>
            ) : filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center empty-cell">
                  <MdReceipt className="empty-icon" />
                  <h3>No payments found</h3>
                  <p>{payments.length === 0 ? 'Record your first transaction using the button above.' : 'No payments match your filter criteria.'}</p>
                </td>
              </tr>
            ) : (
              paginatedPayments.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    <Link to={`/payments/${payment.uuid}`} className="payment-number">
                      {payment.payment_number}
                    </Link>
                    {payment.reference_number && (
                      <div className="ref-sub">Ref: {payment.reference_number}</div>
                    )}
                  </td>
                  <td>
                    <div className="date-main">{payment.payment_date}</div>
                    {payment.due_date && (
                      <div className={`date-due ${payment.is_overdue ? 'overdue-text' : ''}`}>
                        Due: {payment.due_date}
                      </div>
                    )}
                  </td>
                  <td>
                    {payment.client ? (
                      <Link to={`/clients/${payment.client.uuid}`} className="client-link">
                        <div className="client-name">{payment.client.full_name}</div>
                        <div className="client-num">{payment.client.client_number}</div>
                      </Link>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td>
                    {payment.unit ? (
                      <Link to={`/units/${payment.unit.uuid}`} className="unit-link">
                        <strong>{payment.unit.unit_number}</strong>
                        <div className="unit-type">{payment.unit.type}</div>
                      </Link>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td>
                    <div className="payment-type-badge">{formatType(payment.payment_type)}</div>
                    <div className="payment-method-text">{formatType(payment.payment_method)}</div>
                  </td>
                  <td>
                    <div className="amount-main">
                      {formatCurrency(payment.total_amount, payment.currency)}
                    </div>
                    {payment.has_penalty && (
                      <div className="penalty-tag">+{formatCurrency(payment.penalty_amount, payment.currency)} pen</div>
                    )}
                    {payment.has_discount && (
                      <div className="discount-tag">-{formatCurrency(payment.discount_amount, payment.currency)} disc</div>
                    )}
                  </td>
                  <td>{getStatusBadge(payment.status)}</td>
                  <td>
                    <div className="action-buttons">
                      <Link
                        to={`/payments/${payment.uuid}`}
                        className="btn-icon"
                        title="View Receipt"
                      >
                        <MdVisibility />
                      </Link>
                      {payment.status === 'pending' && (
                        <button
                          onClick={() => handleConfirm(payment.uuid)}
                          disabled={actionLoading === payment.uuid}
                          className="btn-icon btn-confirm"
                          title="Confirm Payment"
                        >
                          <MdCheck />
                        </button>
                      )}
                      {payment.status === 'confirmed' && (
                        <button
                          onClick={() => handleVerify(payment.uuid)}
                          disabled={actionLoading === payment.uuid}
                          className="btn-icon btn-verify"
                          title="Verify Payment"
                        >
                          <MdVerified />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {!loading && filteredPayments.length > 0 && (
          <div className="pagination">
            <div className="pagination-info">
              Showing {startIndex} to {endIndex} of {filteredPayments.length} records
            </div>
            <div className="pagination-controls">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="page-btn"
              >
                Previous
              </button>
              <span className="page-current">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="page-btn"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  )
}

export default PaymentsList
