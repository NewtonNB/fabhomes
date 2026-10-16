import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  MdArrowBack,
  MdAdd,
  MdRemove,
  MdEdit,
  MdClose,
  MdPerson,
  MdReceipt,
  MdHistory,
} from 'react-icons/md'
import pettyCashService from '../../services/petty-cash.service'
import {
  PettyCashAccount,
  PettyCashTransaction,
  PettyCashTransactionType,
  PettyCashAccountStatus,
} from '../../types/petty-cash.types'
import '../contracts/ContractsList.css'
import '../contracts/ContractDetails.css'
import './PettyCash.css'

export const PettyCashDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [account, setAccount] = useState<PettyCashAccount | null>(null)
  const [transactions, setTransactions] = useState<PettyCashTransaction[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Modals state
  const [topUpModalOpen, setTopUpModalOpen] = useState<boolean>(false)
  const [topUpAmount, setTopUpAmount] = useState<number | string>(500000)
  const [topUpDescription, setTopUpDescription] = useState<string>('Float replenishment')
  const [topUpRef, setTopUpRef] = useState<string>('')

  const [returnModalOpen, setReturnModalOpen] = useState<boolean>(false)
  const [returnAmount, setReturnAmount] = useState<number | string>(100000)
  const [returnReason, setReturnReason] = useState<string>('Surplus float returned to treasury')
  const [returnRef, setReturnRef] = useState<string>('')

  const notifySuccess = (msg: string) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  const fetchAccount = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      setError(null)
      const data = await pettyCashService.getPettyCashAccount(id)
      setAccount(data)

      const txns = await pettyCashService.getTransactions(id, { per_page: 50 })
      setTransactions(txns.data || [])
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load petty cash account details.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchAccount()
  }, [fetchAccount])

  const formatCurrency = (val: number, currency: string = 'UGX') => {
    return `${currency} ${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!account) return

    const amt = Number(topUpAmount)
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid replenishment amount.')
      return
    }

    try {
      setActionLoading(true)
      const res = await pettyCashService.topUpPettyCashAccount(account.uuid, {
        amount: amt,
        description: topUpDescription.trim() || 'Float replenishment',
        reference_number: topUpRef.trim() || undefined,
      })
      setAccount(res.account)
      setTopUpModalOpen(false)
      setTopUpAmount(500000)
      setTopUpRef('')
      notifySuccess(`Successfully topped up ${formatCurrency(amt, account.currency)} to float.`)
      // Refresh transactions
      const txns = await pettyCashService.getTransactions(account.uuid, { per_page: 50 })
      setTransactions(txns.data || [])
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to top-up petty cash account.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReturnFunds = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!account) return

    const amt = Number(returnAmount)
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid return amount.')
      return
    }

    if (amt > account.current_balance) {
      alert(`Cannot return more than current float balance: ${formatCurrency(account.current_balance, account.currency)}`)
      return
    }

    try {
      setActionLoading(true)
      const res = await pettyCashService.returnFunds(account.uuid, {
        amount: amt,
        reason: returnReason.trim() || 'Surplus float returned',
        reference_number: returnRef.trim() || undefined,
      })
      setAccount(res.account)
      setReturnModalOpen(false)
      setReturnAmount(100000)
      setReturnRef('')
      notifySuccess(`Successfully returned ${formatCurrency(amt, account.currency)} to treasury.`)
      // Refresh transactions
      const txns = await pettyCashService.getTransactions(account.uuid, { per_page: 50 })
      setTransactions(txns.data || [])
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to return float funds.')
    } finally {
      setActionLoading(false)
    }
  }

  const getTxnBadge = (type: PettyCashTransactionType) => {
    switch (type) {
      case 'initial_allocation':
        return <span className="status-badge badge-active">Initial Allocation</span>
      case 'replenishment':
        return <span className="status-badge badge-deposit">+ Replenishment</span>
      case 'expense_disbursement':
        return <span className="status-badge badge-disbursement">- Expense Disbursed</span>
      case 'return_of_funds':
        return <span className="status-badge badge-suspended">Surplus Return</span>
      default:
        return <span className="status-badge badge-closed">{type}</span>
    }
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

  if (loading) {
    return (
      <div className="petty-cash-page" style={{ textAlign: 'center', padding: '4rem' }}>
        <p style={{ color: '#64748b' }}>Loading float account details...</p>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="petty-cash-page" style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>Account Not Found</h2>
        <button onClick={() => navigate('/petty-cash')} className="btn-secondary" style={{ marginTop: '1rem' }}>
          Back to Petty Cash
        </button>
      </div>
    )
  }

  const pct = account.float_limit > 0 ? Math.min(100, Math.round((account.current_balance / account.float_limit) * 100)) : 0
  const isLow = pct < 20

  return (
    <div className="contract-details-page">
      {/* Top Bar */}
      <div className="contract-details-topbar">
        <Link to="/petty-cash" className="btn-back">
          <MdArrowBack size={20} /> Back to Petty Cash Accounts
        </Link>
        <div className="topbar-actions">
          {account.status === 'active' && (
            <>
              <button
                onClick={() => setTopUpModalOpen(true)}
                className="btn-primary"
                style={{ backgroundColor: '#16a34a' }}
              >
                <MdAdd size={20} /> Top-Up Float
              </button>
              <button
                onClick={() => setReturnModalOpen(true)}
                className="btn-secondary"
                disabled={account.current_balance <= 0}
              >
                <MdRemove size={20} /> Return to Treasury
              </button>
            </>
          )}
          <Link to={`/petty-cash/${account.uuid}/edit`} className="btn-secondary">
            <MdEdit size={18} /> Edit
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div style={{ backgroundColor: '#ecfdf5', color: '#065f46', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', border: '1px solid #a7f3d0' }}>
          {successMessage}
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      {/* Account Header Hero */}
      <div className="details-header-card">
        <div className="header-meta">
          <span className="contract-number-tag">{account.account_number}</span>
          {getStatusBadge(account.status)}
          {isLow && (
            <span className="status-badge" style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}>
              Low Balance (&lt; 20%)
            </span>
          )}
        </div>
        <h1 className="contract-title">{account.name}</h1>
        <p className="contract-subtext">
          Assigned to <strong>{account.site?.name || 'All Sites'}</strong> ({account.project?.name || 'Unassigned Project'})
        </p>

        {/* Float Balance Big Widget */}
        <div style={{ marginTop: '1.5rem', padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Live Available Float
              </span>
              <div style={{ fontSize: '2.25rem', fontWeight: 800, color: isLow ? '#dc2626' : '#0f172a', lineHeight: 1.2 }}>
                {formatCurrency(account.current_balance, account.currency)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Maximum Float Limit</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#334155' }}>
                {formatCurrency(account.float_limit, account.currency)}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>
              <span>Float Holding: {pct}%</span>
              <span>Available Capacity: {formatCurrency(Math.max(0, account.float_limit - account.current_balance), account.currency)}</span>
            </div>
            <div className="float-progress-container" style={{ height: '10px' }}>
              <div
                className={`float-progress-bar ${isLow ? 'progress-danger' : pct < 40 ? 'progress-warning' : 'progress-safe'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Overview */}
      <div className="details-grid">
        {/* Left Column: Custody & Location */}
        <div className="details-col">
          <div className="details-card">
            <h2 className="card-section-title">
              <MdPerson size={20} /> Custody & Responsibility
            </h2>
            <div className="card-kv-list">
              <div className="kv-item">
                <span className="kv-key">Custodian:</span>
                <span className="kv-val" style={{ fontWeight: 600 }}>
                  {account.custodian?.name || 'Unassigned'}
                </span>
              </div>
              <div className="kv-item">
                <span className="kv-key">Email:</span>
                <span className="kv-val">{account.custodian?.email || '—'}</span>
              </div>
              <div className="kv-item">
                <span className="kv-key">Assigned Site:</span>
                <span className="kv-val">{account.site?.name || '—'}</span>
              </div>
              <div className="kv-item">
                <span className="kv-key">Project:</span>
                <span className="kv-val">{account.project?.name || '—'}</span>
              </div>
              <div className="kv-item">
                <span className="kv-key">Created Date:</span>
                <span className="kv-val">{new Date(account.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Policies & Notes */}
        <div className="details-col">
          <div className="details-card">
            <h2 className="card-section-title">
              <MdReceipt size={20} /> Custody Terms & Direct Purchasing
            </h2>
            <div style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6 }}>
              {account.notes ? (
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{account.notes}</p>
              ) : (
                <p style={{ margin: 0, color: '#94a3b8', fontStyle: 'italic' }}>
                  No custom custody terms recorded. Governed by company standard site petty cash policy (strict receipt vetting, emergency materials & travel only).
                </p>
              )}
            </div>

            <div style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', backgroundColor: '#eff6ff', borderRadius: '0.5rem', border: '1px solid #bfdbfe', fontSize: '0.85rem', color: '#1e40af' }}>
              <strong>Automatic Reconciliation:</strong> All authorized expense claims reimbursed via petty cash are automatically deducted from this float ledger in real time.
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History Single-Entry Ledger */}
      <div className="details-card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 className="card-section-title" style={{ margin: 0 }}>
            <MdHistory size={20} /> Float Transaction Ledger ({transactions.length})
          </h2>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Single-entry immutable audit trail
          </span>
        </div>

        {transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
            No transactions recorded for this float yet.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="contracts-table">
              <thead>
                <tr>
                  <th>Date & Txn No</th>
                  <th>Type</th>
                  <th>Description & Reference</th>
                  <th>Recorded By</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'right' }}>Balance After</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => {
                  const isPositive = txn.amount > 0
                  return (
                    <tr key={txn.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{txn.transaction_number}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {new Date(txn.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td>{getTxnBadge(txn.transaction_type)}</td>
                      <td>
                        <div style={{ fontWeight: 500, color: '#1e293b' }}>{txn.description}</div>
                        {txn.reference_number && (
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            Ref: <code>{txn.reference_number}</code>
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem' }}>
                          {txn.created_by_user?.name || `User #${txn.created_by || '—'}`}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: isPositive ? '#16a34a' : '#dc2626' }}>
                        {isPositive ? '+' : ''}{formatCurrency(txn.amount, txn.currency)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                        {formatCurrency(txn.balance_after, txn.currency)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top-Up Modal */}
      {topUpModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Top-Up / Replenish Float</h3>
              <button onClick={() => setTopUpModalOpen(false)} className="modal-close-btn">
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleTopUp}>
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label>Replenishment Amount (UGX) *</label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    className="form-input"
                    required
                  />
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Current holding: {formatCurrency(account.current_balance)} (Limit: {formatCurrency(account.float_limit)})
                  </span>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label>Description / Purpose *</label>
                  <input
                    type="text"
                    value={topUpDescription}
                    onChange={(e) => setTopUpDescription(e.target.value)}
                    placeholder="e.g. Mid-month replenishment for emergency blockwork"
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Bank Cheque / Mobile Money / Transfer Reference</label>
                  <input
                    type="text"
                    value={topUpRef}
                    onChange={(e) => setTopUpRef(e.target.value)}
                    placeholder="e.g. CHQ-99214 / MM-88129"
                    className="form-input"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setTopUpModalOpen(false)}
                  className="btn-secondary"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ backgroundColor: '#16a34a' }}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Allocating...' : 'Confirm Replenishment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Funds Modal */}
      {returnModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Return Surplus Float to Treasury</h3>
              <button onClick={() => setReturnModalOpen(false)} className="modal-close-btn">
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleReturnFunds}>
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label>Return Amount (UGX) *</label>
                  <input
                    type="number"
                    min="1000"
                    max={account.current_balance}
                    step="1000"
                    value={returnAmount}
                    onChange={(e) => setReturnAmount(e.target.value)}
                    className="form-input"
                    required
                  />
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Available float balance: {formatCurrency(account.current_balance)}
                  </span>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label>Reason for Return *</label>
                  <input
                    type="text"
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="e.g. Surplus cash returned upon project milestone completion"
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Bank Deposit Slip / Treasury Voucher Reference</label>
                  <input
                    type="text"
                    value={returnRef}
                    onChange={(e) => setReturnRef(e.target.value)}
                    placeholder="e.g. DEP-STANBIC-9012"
                    className="form-input"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(false)}
                  className="btn-secondary"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Returning...' : 'Confirm Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
