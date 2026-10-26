import React, { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  MdSearch,
  MdRefresh,
  MdCheckCircle,
  MdWarning,
  MdArrowDownward,
  MdArrowUpward,
  MdAccountBalanceWallet,
  MdClose,
  MdUndo,
  MdAdd,
  MdVerified,
  MdReceiptLong,
} from 'react-icons/md'
import {
  Transaction,
  TransactionStatistics,
  ReconciliationReport,
  TransactionType,
} from '../../types/transaction.types'
import transactionService from '../../services/transaction.service'
import clientService from '../../services/client.service'
import savingsAccountService from '../../services/savings-account.service'
import { Client } from '../../types/client.types'
import { SavingsAccount } from '../../types/savings-account.types'
import './TransactionsList.css'

export const TransactionsList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const initialClientId = searchParams.get('client_id') || ''
  const initialAccountId = searchParams.get('account_id') || ''
  const initialType = searchParams.get('transaction_type') || ''
  const initialStatus = searchParams.get('status') || ''

  // State
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stats, setStats] = useState<TransactionStatistics | null>(null)
  const [reconciliation, setReconciliation] = useState<ReconciliationReport | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [reconciling, setReconciling] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Filter States
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState(initialType)
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [flowFilter, setFlowFilter] = useState<'all' | 'credit' | 'debit'>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [clientId, setClientId] = useState(initialClientId)
  const [accountId, setAccountId] = useState(initialAccountId)

  // Clients & Accounts for Filters/Creation
  const [clients, setClients] = useState<Client[]>([])
  const [accounts, setAccounts] = useState<SavingsAccount[]>([])

  // Modals
  const [reversalTarget, setReversalTarget] = useState<Transaction | null>(null)
  const [reversalReason, setReversalReason] = useState('')
  const [reversalSubmitting, setReversalSubmitting] = useState(false)

  const [showPostModal, setShowPostModal] = useState(false)
  const [postClientId, setPostClientId] = useState('')
  const [postAccountId, setPostAccountId] = useState('')
  const [postType, setPostType] = useState<TransactionType>('adjustment')
  const [postAmount, setPostAmount] = useState('')
  const [postDescription, setPostDescription] = useState('')
  const [postNarration, setPostNarration] = useState('')
  const [postReference, setPostReference] = useState('')
  const [postSubmitting, setPostSubmitting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const filters: any = {
        page: 1,
        per_page: 50,
      }
      if (search) filters.search = search
      if (typeFilter) filters.transaction_type = typeFilter
      if (statusFilter) filters.status = statusFilter
      if (flowFilter !== 'all') filters.flow = flowFilter
      if (startDate) filters.start_date = startDate
      if (endDate) filters.end_date = endDate
      if (clientId) filters.client_id = clientId
      if (accountId) filters.account_id = accountId

      const [txnRes, statsRes] = await Promise.all([
        transactionService.getTransactions(filters),
        transactionService.getStatistics({ client_id: clientId || undefined, account_id: accountId || undefined }),
      ])

      setTransactions(txnRes.data || [])
      setStats(statsRes)
    } catch (err: any) {
      console.error('Failed to load ledger transactions:', err)
      setError(err?.response?.data?.message || err?.message || 'Failed to load ledger transactions')
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter, statusFilter, flowFilter, startDate, endDate, clientId, accountId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    // Load clients and accounts for selection dropdowns
    const loadLookups = async () => {
      try {
        const [cliRes, accRes] = await Promise.all([
          clientService.getClients({ per_page: 100 }),
          savingsAccountService.getSavingsAccounts({ per_page: 100 }),
        ])
        setClients(cliRes.data || [])
        setAccounts(accRes.data || [])
      } catch (err) {
        console.error('Failed to load lookups:', err)
      }
    }
    loadLookups()
  }, [])

  const handleRunReconciliation = async () => {
    setReconciling(true)
    try {
      const report = await transactionService.getReconciliation()
      setReconciliation(report)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to perform ledger reconciliation')
    } finally {
      setReconciling(false)
    }
  }

  const handleReverseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reversalTarget) return
    if (!reversalReason.trim() || reversalReason.length < 5) {
      setError('A detailed justification (min 5 characters) is required to reverse a posted transaction.')
      return
    }

    setReversalSubmitting(true)
    try {
      await transactionService.reverseTransaction(reversalTarget.uuid, {
        reason: reversalReason.trim(),
      })
      setReversalTarget(null)
      setReversalReason('')
      loadData()
      if (reconciliation) {
        handleRunReconciliation()
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Reversal failed')
    } finally {
      setReversalSubmitting(false)
    }
  }

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!postClientId) {
      setError('Please select a client account owner')
      return
    }
    const amt = parseFloat(postAmount)
    if (isNaN(amt) || amt === 0) {
      setError('Please enter a valid non-zero amount')
      return
    }
    if (!postDescription.trim()) {
      setError('Description is required')
      return
    }

    setPostSubmitting(true)
    try {
      await transactionService.createTransaction({
        client_id: postClientId,
        account_id: postAccountId || null,
        transaction_type: postType,
        amount: amt,
        description: postDescription.trim(),
        narration: postNarration.trim() || undefined,
        reference_number: postReference.trim() || undefined,
      })
      setShowPostModal(false)
      setPostAmount('')
      setPostDescription('')
      setPostNarration('')
      setPostReference('')
      loadData()
      if (reconciliation) {
        handleRunReconciliation()
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to post transaction')
    } finally {
      setPostSubmitting(false)
    }
  }

  const resetFilters = () => {
    setSearch('')
    setTypeFilter('')
    setStatusFilter('')
    setFlowFilter('all')
    setStartDate('')
    setEndDate('')
    setClientId('')
    setAccountId('')
    setSearchParams({})
  }

  // Filtered accounts for post modal
  const clientAccounts = postClientId
    ? accounts.filter((a) => String(a.client_id) === String(postClientId) || a.client?.uuid === postClientId)
    : accounts

  return (
    <div className="transactions-page">
      {/* Header */}
      <div className="transactions-header">
        <div className="header-title">
          <h1>Financial Ledger & Transactions</h1>
          <p>Double-verified, immutable transaction audit trail and automated account reconciliation</p>
        </div>
        <div className="header-actions">
          <button className="btn-reconcile" onClick={handleRunReconciliation} disabled={reconciling}>
            <MdVerified />
            {reconciling ? 'Verifying Balances...' : 'Reconciliation Check'}
          </button>
          <button className="btn-primary" onClick={() => setShowPostModal(true)}>
            <MdAdd />
            Post Entry
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-box green">
            <MdArrowDownward />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Credits (Inflow)</span>
            <span className="kpi-value">UGX {Number(stats?.total_inflow || 0).toLocaleString()}</span>
            <span className="kpi-subtext">All posted deposits</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-box red">
            <MdArrowUpward />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Debits (Outflow)</span>
            <span className="kpi-value">UGX {Number(stats?.total_outflow || 0).toLocaleString()}</span>
            <span className="kpi-subtext">Withdrawals & refunds</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-box blue">
            <MdAccountBalanceWallet />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Net Movement</span>
            <span className="kpi-value">UGX {Number(stats?.net_movement || 0).toLocaleString()}</span>
            <span className="kpi-subtext">{stats?.total_transactions || 0} active entries</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-box purple">
            <MdUndo />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Audit Reversals</span>
            <span className="kpi-value">{stats?.total_reversals || 0}</span>
            <span className="kpi-subtext">Offsetting audit records</span>
          </div>
        </div>
      </div>

      {/* Reconciliation Banner */}
      {reconciliation && (
        <div className={`reconciliation-banner ${reconciliation.is_healthy ? 'healthy' : 'unhealthy'}`}>
          <div className="reconcile-header">
            <h3>
              {reconciliation.is_healthy ? (
                <>
                  <MdCheckCircle color="#059669" size={20} />
                  Ledger Perfectly Balanced
                </>
              ) : (
                <>
                  <MdWarning color="#dc2626" size={20} />
                  Balance Discrepancies Detected ({reconciliation.discrepancy_count})
                </>
              )}
            </h3>
            <button
              onClick={() => setReconciliation(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
            >
              <MdClose size={18} />
            </button>
          </div>

          <div className="reconcile-stats">
            <div>
              Total Accounts Verified: <strong>{reconciliation.total_accounts_checked}</strong>
            </div>
            <div>
              Balanced Accounts: <strong>{reconciliation.matched_count}</strong>
            </div>
            <div>
              Discrepancies: <strong>{reconciliation.discrepancy_count}</strong>
            </div>
            <div>
              Verified At: <strong>{new Date(reconciliation.verified_at).toLocaleTimeString()}</strong>
            </div>
          </div>

          {!reconciliation.is_healthy && reconciliation.discrepancies.length > 0 && (
            <table className="discrepancies-table">
              <thead>
                <tr>
                  <th>Account #</th>
                  <th>Client</th>
                  <th>Scheme</th>
                  <th>Stored Balance</th>
                  <th>Ledger Sum</th>
                  <th>Difference</th>
                </tr>
              </thead>
              <tbody>
                {reconciliation.discrepancies.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <Link to={`/savings-accounts/${d.uuid}`} style={{ color: '#0284c7', fontWeight: 600 }}>
                        {d.account_number}
                      </Link>
                    </td>
                    <td>
                      {d.first_name} {d.last_name}
                    </td>
                    <td>{d.scheme_name}</td>
                    <td>UGX {Number(d.stored_balance).toLocaleString()}</td>
                    <td>UGX {Number(d.calculated_balance).toLocaleString()}</td>
                    <td style={{ color: '#dc2626', fontWeight: 700 }}>
                      UGX {Number(d.difference).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Filter Card */}
      <div className="filter-card">
        <div className="filter-row">
          <div className="search-input-wrap">
            <MdSearch size={20} />
            <input
              type="text"
              placeholder="Search TXN #, reference, client name, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="payment">Payments</option>
            <option value="adjustment">Adjustments</option>
            <option value="reversal">Reversals</option>
            <option value="refund">Refunds</option>
            <option value="transfer">Transfers</option>
            <option value="withdrawal">Withdrawals</option>
          </select>

          <select
            className="filter-select"
            value={flowFilter}
            onChange={(e) => setFlowFilter(e.target.value as any)}
          >
            <option value="all">All Cashflow</option>
            <option value="credit">Credits Only (+ Inflow)</option>
            <option value="debit">Debits Only (- Outflow)</option>
          </select>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="posted">Posted</option>
            <option value="reversed">Reversed</option>
          </select>

          <div className="date-filter">
            <span>From:</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <span>To:</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>

          <button className="btn-reset" onClick={resetFilters}>
            <MdRefresh /> Reset
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '16px', borderRadius: '8px', color: '#dc2626', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div className="ledger-table-wrap">
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Transaction #</th>
              <th>Date & Time</th>
              <th>Client</th>
              <th>Account</th>
              <th>Type</th>
              <th>Description</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th>Balance Progression</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  Loading ledger transactions...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No transactions found matching the selected filters.
                </td>
              </tr>
            ) : (
              transactions.map((txn) => (
                <tr key={txn.id}>
                  <td>
                    <Link to={`/transactions/${txn.uuid}`} className="txn-number-link">
                      {txn.transaction_number}
                    </Link>
                  </td>
                  <td>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>
                      {new Date(txn.transaction_date).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {new Date(txn.transaction_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{txn.client?.full_name || 'N/A'}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {txn.client?.client_number || txn.client?.phone_primary}
                    </div>
                  </td>
                  <td>
                    {txn.savings_account ? (
                      <Link to={`/savings-accounts/${txn.savings_account.uuid}`} style={{ color: '#0284c7', fontSize: '13px' }}>
                        {txn.savings_account.account_number}
                      </Link>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>General</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-type ${txn.transaction_type}`}>
                      {txn.transaction_type}
                    </span>
                  </td>
                  <td>
                    <div style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {txn.description}
                    </div>
                    {txn.reference_number && (
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Ref: {txn.reference_number}</div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={txn.is_credit ? 'amount-credit' : 'amount-debit'}>
                      {txn.is_credit ? '+' : ''}UGX {Number(txn.amount).toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <span className="balance-flow">
                      {Number(txn.balance_before).toLocaleString()} &rarr; {Number(txn.balance_after).toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${txn.status}`}>
                      {txn.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <Link
                        to={`/transactions/${txn.uuid}`}
                        style={{
                          background: '#f1f5f9',
                          color: '#0284c7',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          fontSize: '12px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <MdReceiptLong /> View
                      </Link>
                      {txn.status === 'posted' && (
                        <button
                          onClick={() => {
                            setReversalTarget(txn)
                            setReversalReason('')
                          }}
                          style={{
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: 'none',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <MdUndo /> Reverse
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

      {/* Modal: Reverse Transaction */}
      {reversalTarget && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Reverse Transaction {reversalTarget.transaction_number}</h3>
              <button className="btn-close-modal" onClick={() => setReversalTarget(null)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleReverseSubmit}>
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                <div>Original Amount: <strong>UGX {Number(reversalTarget.amount).toLocaleString()}</strong></div>
                <div>Account: <strong>{reversalTarget.savings_account?.account_number || 'General'}</strong></div>
                <div>Client: <strong>{reversalTarget.client?.full_name}</strong></div>
              </div>

              <div className="form-group">
                <label>Audit Justification / Reversal Reason * (Min 5 chars)</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why this transaction is being reversed (e.g. client duplicate payment, bank error, cancelled deposit)..."
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                />
              </div>

              <div style={{ fontSize: '12px', color: '#64748b', background: '#eff6ff', padding: '10px 12px', borderRadius: '6px' }}>
                <strong>Immutable Ledger Principle:</strong> This transaction will NOT be erased from history. An offsetting transaction with amount <strong>{reversalTarget.is_credit ? '-' : '+'}UGX {Math.abs(Number(reversalTarget.amount)).toLocaleString()}</strong> will be permanently linked and posted to preserve financial auditability.
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setReversalTarget(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-danger" disabled={reversalSubmitting}>
                  {reversalSubmitting ? 'Processing Reversal...' : 'Confirm Reversal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Post Manual Transaction */}
      {showPostModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Post Ledger Entry</h3>
              <button className="btn-close-modal" onClick={() => setShowPostModal(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handlePostSubmit}>
              <div className="form-group">
                <label>Client Account Owner *</label>
                <select
                  required
                  value={postClientId}
                  onChange={(e) => {
                    setPostClientId(e.target.value)
                    setPostAccountId('')
                  }}
                >
                  <option value="">Select Client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.uuid || c.id}>
                      {c.first_name} {c.last_name} ({c.client_number || c.phone_primary})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Linked Savings Account (Optional)</label>
                <select
                  value={postAccountId}
                  onChange={(e) => setPostAccountId(e.target.value)}
                >
                  <option value="">Select Savings Account (or General)</option>
                  {clientAccounts.map((a) => (
                    <option key={a.id} value={a.uuid || a.id}>
                      {a.account_number} - {a.scheme_name} (Bal: UGX {Number(a.current_balance).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Transaction Type *</label>
                  <select
                    required
                    value={postType}
                    onChange={(e) => setPostType(e.target.value as any)}
                  >
                    <option value="adjustment">Manual Adjustment</option>
                    <option value="payment">Direct Payment Deposit</option>
                    <option value="refund">Client Refund</option>
                    <option value="transfer">Account Transfer</option>
                    <option value="withdrawal">Withdrawal</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Amount (UGX) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 500000 or -200000"
                    value={postAmount}
                    onChange={(e) => setPostAmount(e.target.value)}
                  />
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    Positive for credit (deposit), negative for debit (deduction)
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Opening deposit, Bank adjustment correction"
                  value={postDescription}
                  onChange={(e) => setPostDescription(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Reference Number (Bank slip / MoMo ID)</label>
                <input
                  type="text"
                  placeholder="e.g. STANBIC-REC-001"
                  value={postReference}
                  onChange={(e) => setPostReference(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Internal Audit Narration</label>
                <textarea
                  rows={2}
                  placeholder="Additional context or authorization details..."
                  value={postNarration}
                  onChange={(e) => setPostNarration(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowPostModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={postSubmitting}>
                  {postSubmitting ? 'Posting Entry...' : 'Post to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default TransactionsList
