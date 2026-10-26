import React, { useState, useEffect } from 'react'
import {
  MdSavings,
  MdAddCircleOutline,
  MdCheckCircle,
  MdPhoneIphone,
  MdCreditCard,
  MdReceipt,
  MdHistory,
  MdSearch,
  MdClose,
  MdAccountBalance,
  MdErrorOutline,
} from 'react-icons/md'
import { clientPortalSavingsService } from '../../../services/client-portal-savings.service'
import {
  ClientSavingsAccount,
  ClientSavingsOverviewResponse,
  ClientTransactionItem,
  DepositIntentResponse,
  DepositReceipt,
} from '../../../types/client-portal-savings.types'
import './ClientSavingsTab.css'

interface ClientSavingsTabProps {
  onNotify?: (msg: string, type: 'success' | 'error') => void
}

export const ClientSavingsTab: React.FC<ClientSavingsTabProps> = ({ onNotify }) => {
  const [data, setData] = useState<ClientSavingsOverviewResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [filterType, setFilterType] = useState<'all' | 'land_saving' | 'construction_saving'>('all')

  // Transactions State
  const [showTransactionsModal, setShowTransactionsModal] = useState<boolean>(false)
  const [transactions, setTransactions] = useState<ClientTransactionItem[]>([])
  const [txnLoading, setTxnLoading] = useState<boolean>(false)
  const [txnSearch, setTxnSearch] = useState<string>('')
  const [selectedAccountForTxn, setSelectedAccountForTxn] = useState<string | number>('')

  // Checkout Modal State
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string | number>('')
  const [depositAmount, setDepositAmount] = useState<number>(500000)
  const [gateway, setGateway] = useState<'mtn_momo' | 'airtel_money' | 'stanbic_bank' | 'flexipay'>('mtn_momo')
  const [phone, setPhone] = useState<string>('')
  const [narration, setNarration] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Confirmation / Receipt State
  const [activeIntent, setActiveIntent] = useState<DepositIntentResponse | null>(null)
  const [receipt, setReceipt] = useState<DepositReceipt | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const loadOverview = async () => {
    setLoading(true)
    try {
      const res = await clientPortalSavingsService.getSavingsOverview()
      setData(res)
      if (res.accounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(res.accounts[0].uuid)
      }
    } catch (err: any) {
      if (onNotify) onNotify(err.message || 'Failed to load savings accounts', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOverview()
  }, [])

  const loadTransactions = async (accountId?: string | number) => {
    setTxnLoading(true)
    try {
      const res = await clientPortalSavingsService.getTransactions({
        account_id: accountId || undefined,
        search: txnSearch || undefined,
      })
      setTransactions(res.transactions)
    } catch (err: any) {
      console.warn('Failed to load transactions:', err)
    } finally {
      setTxnLoading(false)
    }
  }

  const handleOpenCheckout = (account?: ClientSavingsAccount) => {
    if (account) {
      setSelectedAccountId(account.uuid)
    } else if (data?.accounts.length) {
      setSelectedAccountId(data.accounts[0].uuid)
    }
    setActiveIntent(null)
    setReceipt(null)
    setShowCheckoutModal(true)
  }

  const handleInitiateDeposit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!selectedAccountId || depositAmount < 1000) {
      setFormError('Please enter a valid deposit amount (min UGX 1,000).')
      return
    }

    setIsSubmitting(true)
    try {
      const intentRes = await clientPortalSavingsService.initiateDeposit({
        account_id: selectedAccountId,
        amount: depositAmount,
        gateway,
        phone_number: phone || undefined,
        narration: narration || undefined,
      })
      setActiveIntent(intentRes)
    } catch (err: any) {
      if (onNotify) onNotify(err.message || 'Deposit initiation failed', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDeposit = async () => {
    if (!activeIntent) return
    setIsSubmitting(true)
    try {
      const confirmRes = await clientPortalSavingsService.confirmDeposit(activeIntent.uuid)
      setReceipt(confirmRes.receipt)
      setActiveIntent(null)
      if (onNotify) onNotify(confirmRes.message, 'success')
      await loadOverview()
    } catch (err: any) {
      if (onNotify) onNotify(err.message || 'Deposit confirmation failed', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatUGX = (val: number) => {
    return 'UGX ' + Math.round(val).toLocaleString()
  }

  const filteredAccounts =
    data?.accounts.filter((acc) => {
      if (filterType === 'all') return true
      return acc.account_type === filterType
    }) || []

  if (loading && !data) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
        <MdSavings style={{ fontSize: 36, color: '#38bdf8', marginBottom: 12 }} />
        <div>Loading your savings schemes and balances...</div>
      </div>
    )
  }

  const summary = data?.summary

  return (
    <div>
      {/* KPI Hero Banner */}
      <section className="savings-kpi-banner">
        <div className="savings-kpi-row">
          <div className="savings-balance-hero">
            <span className="label">Total Client Savings Portfolio</span>
            <span className="amount">{formatUGX(summary?.total_balance || 0)}</span>
          </div>

          <button className="portal-btn-primary" style={{ padding: '12px 20px' }} onClick={() => handleOpenCheckout()}>
            <MdAddCircleOutline style={{ fontSize: 18 }} /> Make a Deposit
          </button>
        </div>

        {/* Progress Gauge */}
        <div className="savings-progress-track">
          <div
            className="savings-progress-fill"
            style={{ width: `${Math.min(100, summary?.average_progress_pct || 0)}%` }}
          />
        </div>

        <div className="savings-progress-labels">
          <span>Target Portfolio: {formatUGX(summary?.total_target || 0)}</span>
          <span>{summary?.average_progress_pct || 0}% Achieved</span>
          <span>Remaining: {formatUGX(summary?.total_remaining || 0)}</span>
        </div>
      </section>

      {/* Category Filter Chips */}
      <div className="savings-filter-bar">
        <button
          className={`savings-filter-chip ${filterType === 'all' ? 'active' : ''}`}
          onClick={() => setFilterType('all')}
        >
          All Schemes ({data?.accounts.length || 0})
        </button>
        <button
          className={`savings-filter-chip ${filterType === 'land_saving' ? 'active' : ''}`}
          onClick={() => setFilterType('land_saving')}
        >
          Land Saving Schemes ({summary?.by_type.land_saving.count || 0})
        </button>
        <button
          className={`savings-filter-chip ${filterType === 'construction_saving' ? 'active' : ''}`}
          onClick={() => setFilterType('construction_saving')}
        >
          Construction Funds ({summary?.by_type.construction_saving.count || 0})
        </button>
        <button
          className="savings-filter-chip"
          style={{ marginLeft: 'auto' }}
          onClick={() => {
            loadTransactions()
            setShowTransactionsModal(true)
          }}
        >
          <MdHistory style={{ verticalAlign: 'middle', marginRight: 4 }} /> View Transaction Ledger
        </button>
      </div>

      {/* Accounts Grid */}
      <div className="savings-grid">
        {filteredAccounts.map((acc) => (
          <div key={acc.uuid} className="savings-card">
            <div>
              <div className="savings-card-top">
                <div>
                  <h4 className="savings-scheme-title">{acc.scheme_name}</h4>
                  <span className="savings-acc-num">{acc.account_number}</span>
                </div>
                <span
                  className={`portal-badge ${
                    acc.status === 'completed'
                      ? 'portal-badge-verified'
                      : acc.status === 'active'
                      ? 'portal-badge-online'
                      : 'portal-badge-pending'
                  }`}
                >
                  {acc.status.toUpperCase()}
                </span>
              </div>

              {/* Attached Plot / Project Info */}
              {acc.plot && (
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                  Allocated Plot: <strong style={{ color: '#fff' }}>{acc.plot.unit_number}</strong>
                  {acc.project && ` • ${acc.project.name}`}
                </div>
              )}

              {/* Progress Bar */}
              <div className="savings-progress-track" style={{ height: 6, margin: '8px 0' }}>
                <div
                  className="savings-progress-fill"
                  style={{ width: `${Math.min(100, acc.progress_percentage || 0)}%` }}
                />
              </div>

              {/* Metric Box */}
              <div className="savings-metric-box">
                <div className="savings-metric-item">
                  <span className="val-label">Current Balance</span>
                  <span className="val-num" style={{ color: '#38bdf8' }}>
                    {formatUGX(acc.current_balance)}
                  </span>
                </div>
                <div className="savings-metric-item" style={{ textAlign: 'right' }}>
                  <span className="val-label">Target Amount</span>
                  <span className="val-num">{formatUGX(acc.target_amount)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
                <span>Remaining: {formatUGX(acc.remaining_amount)}</span>
                <span style={{ fontWeight: 600, color: '#10b981' }}>{acc.progress_percentage}%</span>
              </div>
            </div>

            {/* Actions */}
            <div className="savings-card-actions">
              <button
                className="portal-btn-primary"
                style={{ flex: 1, padding: '8px 12px', fontSize: 12 }}
                onClick={() => handleOpenCheckout(acc)}
              >
                <MdAddCircleOutline /> Deposit Funds
              </button>
              <button
                className="portal-btn-secondary"
                style={{ padding: '8px 12px', fontSize: 12 }}
                onClick={() => {
                  setSelectedAccountForTxn(acc.uuid)
                  loadTransactions(acc.uuid)
                  setShowTransactionsModal(true)
                }}
              >
                <MdHistory /> Statement
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* DEPOSIT CHECKOUT MODAL */}
      {showCheckoutModal && (
        <div className="checkout-modal-backdrop">
          <div className="checkout-modal-panel">
            <div className="checkout-header">
              <h3>
                <MdAddCircleOutline style={{ color: '#3b82f6', verticalAlign: 'middle', marginRight: 8 }} />
                Instant Savings Deposit
              </h3>
              <button
                className="portal-btn-icon"
                onClick={() => {
                  setShowCheckoutModal(false)
                  setActiveIntent(null)
                  setReceipt(null)
                }}
              >
                <MdClose />
              </button>
            </div>

            {/* Step 1: Input Form */}
            {!activeIntent && !receipt && (
              <form onSubmit={handleInitiateDeposit}>
                {formError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 6, background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', marginBottom: 12, fontSize: 13 }}>
                    <MdErrorOutline />
                    <span>{formError}</span>
                  </div>
                )}
                {/* Account Picker */}
                <div className="portal-input-group">
                  <label>Select Target Savings Scheme</label>
                  <select
                    className="portal-input"
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    required
                  >
                    {data?.accounts.map((acc) => (
                      <option key={acc.uuid} value={acc.uuid}>
                        {acc.scheme_name} ({acc.account_number}) - Bal: {formatUGX(acc.current_balance)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div className="portal-input-group">
                  <label>Deposit Amount (UGX)</label>
                  <input
                    type="number"
                    min={1000}
                    step={10000}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    className="portal-input"
                    style={{ fontSize: 18, fontWeight: 700, color: '#38bdf8' }}
                    required
                  />

                  {/* Preset Amount Chips */}
                  <div className="amount-chips">
                    {[500000, 1000000, 2500000, 5000000].map((amt) => (
                      <button
                        type="button"
                        key={amt}
                        className={`amount-chip ${depositAmount === amt ? 'active' : ''}`}
                        onClick={() => setDepositAmount(amt)}
                      >
                        UGX {(amt / 1000000).toFixed(1)}M
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Gateway Picker */}
                <div className="portal-input-group">
                  <label>Select Payment Channel</label>
                  <div className="gateway-picker">
                    <button
                      type="button"
                      className={`gateway-card-btn ${gateway === 'mtn_momo' ? 'active' : ''}`}
                      onClick={() => setGateway('mtn_momo')}
                    >
                      <MdPhoneIphone style={{ fontSize: 24, color: '#eab308' }} />
                      <div>
                        <div className="gw-title">MTN MoMo</div>
                        <div className="gw-sub">Instant STK Push</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`gateway-card-btn ${gateway === 'airtel_money' ? 'active' : ''}`}
                      onClick={() => setGateway('airtel_money')}
                    >
                      <MdPhoneIphone style={{ fontSize: 24, color: '#ef4444' }} />
                      <div>
                        <div className="gw-title">Airtel Money</div>
                        <div className="gw-sub">USSD Prompt</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`gateway-card-btn ${gateway === 'stanbic_bank' ? 'active' : ''}`}
                      onClick={() => setGateway('stanbic_bank')}
                    >
                      <MdCreditCard style={{ fontSize: 24, color: '#3b82f6' }} />
                      <div>
                        <div className="gw-title">Stanbic Visa</div>
                        <div className="gw-sub">Bank & Card</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`gateway-card-btn ${gateway === 'flexipay' ? 'active' : ''}`}
                      onClick={() => setGateway('flexipay')}
                    >
                      <MdAccountBalance style={{ fontSize: 24, color: '#10b981' }} />
                      <div>
                        <div className="gw-title">Flexipay</div>
                        <div className="gw-sub">Stanbic Gateway</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Phone Number for Mobile Money */}
                <div className="portal-input-group">
                  <label>Phone Number for Mobile Prompt</label>
                  <input
                    type="tel"
                    placeholder="+256 700 000 000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="portal-input"
                  />
                </div>

                {/* Optional Narration */}
                <div className="portal-input-group">
                  <label>Reference Note / Narration (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. October monthly savings deposit"
                    value={narration}
                    onChange={(e) => setNarration(e.target.value)}
                    className="portal-input"
                  />
                </div>

                {/* Submit Checkout Intent */}
                <button
                  type="submit"
                  className="portal-btn-primary"
                  style={{ width: '100%', padding: '12px', marginTop: 12 }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Initializing Checkout...' : `Proceed to Deposit ${formatUGX(depositAmount)}`}
                </button>
              </form>
            )}

            {/* Step 2: Intent Dispatched / Confirmation Prompt */}
            {activeIntent && !receipt && (
              <div>
                <div
                  style={{
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 20,
                  }}
                >
                  <h4 style={{ margin: '0 0 8px 0', color: '#60a5fa' }}>Payment Prompt Dispatched!</h4>
                  <p style={{ margin: 0, fontSize: 13, color: '#f8fafc', lineHeight: 1.5 }}>
                    {activeIntent.instructions}
                  </p>
                  <div style={{ marginTop: 10, fontSize: 11, color: '#94a3b8' }}>
                    Reference: <strong>{activeIntent.intent_reference}</strong> • Amount:{' '}
                    <strong>{formatUGX(activeIntent.amount)}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="portal-btn-primary"
                  style={{ width: '100%', padding: '12px' }}
                  onClick={handleConfirmDeposit}
                  disabled={isSubmitting}
                >
                  <MdCheckCircle /> {isSubmitting ? 'Verifying Gateway...' : 'I Have Approved Payment on My Phone'}
                </button>
              </div>
            )}

            {/* Step 3: Success Receipt Dialog */}
            {receipt && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <MdCheckCircle style={{ fontSize: 48, color: '#10b981' }} />
                  <h3 style={{ margin: '8px 0 4px 0', color: '#fff' }}>Deposit Successful!</h3>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>Funds credited instantly to your savings account</span>
                </div>

                <div className="receipt-box">
                  <div className="receipt-row">
                    <span className="r-label">Transaction Ref</span>
                    <span className="r-val">{receipt.transaction_number}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="r-label">Payment Ref</span>
                    <span className="r-val">{receipt.payment_number}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="r-label">Scheme Name</span>
                    <span className="r-val">{receipt.scheme_name}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="r-label">Amount Deposited</span>
                    <span className="r-val" style={{ color: '#34d399', fontSize: 15 }}>
                      +{formatUGX(receipt.amount)}
                    </span>
                  </div>
                  <div className="receipt-row">
                    <span className="r-label">New Account Balance</span>
                    <span className="r-val" style={{ color: '#38bdf8', fontSize: 15 }}>
                      {formatUGX(receipt.new_balance)}
                    </span>
                  </div>
                  <div className="receipt-row">
                    <span className="r-label">Target Progress</span>
                    <span className="r-val">{receipt.progress_percentage}% Complete</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="portal-btn-primary"
                  style={{ width: '100%', padding: '12px' }}
                  onClick={() => {
                    setShowCheckoutModal(false)
                    setReceipt(null)
                    setActiveIntent(null)
                  }}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TRANSACTIONS STATEMENT DRAWER / MODAL */}
      {showTransactionsModal && (
        <div className="checkout-modal-backdrop">
          <div className="checkout-modal-panel" style={{ maxWidth: 720 }}>
            <div className="checkout-header">
              <h3>
                <MdReceipt style={{ color: '#38bdf8', verticalAlign: 'middle', marginRight: 8 }} />
                Savings Account Statements & Transaction History
              </h3>
              <button className="portal-btn-icon" onClick={() => setShowTransactionsModal(false)}>
                <MdClose />
              </button>
            </div>

            {/* Filter controls */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <input
                type="text"
                placeholder="Search by transaction reference..."
                value={txnSearch}
                onChange={(e) => setTxnSearch(e.target.value)}
                className="portal-input"
                style={{ flex: 1 }}
              />
              <button
                className="portal-btn-primary"
                onClick={() => loadTransactions(selectedAccountForTxn)}
                disabled={txnLoading}
              >
                <MdSearch /> Filter
              </button>
            </div>

            {/* Ledger Table */}
            <div style={{ overflowX: 'auto', maxHeight: 420 }}>
              {txnLoading ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
                  Loading transaction ledger...
                </div>
              ) : transactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
                  No transactions recorded yet.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1e293b', color: '#94a3b8', textAlign: 'left' }}>
                      <th style={{ padding: '8px 6px' }}>Date</th>
                      <th style={{ padding: '8px 6px' }}>Txn Ref</th>
                      <th style={{ padding: '8px 6px' }}>Description</th>
                      <th style={{ padding: '8px 6px', textAlign: 'right' }}>Amount</th>
                      <th style={{ padding: '8px 6px', textAlign: 'right' }}>Running Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.uuid} style={{ borderBottom: '1px solid #131c31' }}>
                        <td style={{ padding: '10px 6px', color: '#94a3b8' }}>
                          {new Date(tx.transaction_date).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '10px 6px', fontFamily: 'monospace' }}>{tx.transaction_number}</td>
                        <td style={{ padding: '10px 6px' }}>
                          <div>{tx.description}</div>
                          {tx.reference_number && (
                            <span style={{ fontSize: 10, color: '#94a3b8' }}>Ref: {tx.reference_number}</span>
                          )}
                        </td>
                        <td
                          style={{
                            padding: '10px 6px',
                            textAlign: 'right',
                            fontWeight: 700,
                            color: tx.transaction_type === 'credit' ? '#34d399' : '#f87171',
                          }}
                        >
                          {tx.transaction_type === 'credit' ? '+' : '-'}
                          {formatUGX(tx.amount)}
                        </td>
                        <td style={{ padding: '10px 6px', textAlign: 'right', color: '#38bdf8', fontWeight: 600 }}>
                          {formatUGX(tx.balance_after)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClientSavingsTab
