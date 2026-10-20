import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  MdSearch,
  MdRefresh,
  MdPhoneIphone,
  MdSend,
  MdScience,
  MdCheckCircle,
  MdCancel,
  MdAccountBalanceWallet,
  MdCallMade,
  MdCallReceived,
} from 'react-icons/md'
import mobileMoneyService from '../../../services/mobile-money.service'
import {
  MobileMoneyTransaction,
  MobileMoneyGateway,
  PaymentWebhookLog,
  MobileMoneyStats,
  StkPushPayload,
  DisbursementPayload,
  SimulateWebhookPayload,
  MobileMoneyPurpose,
} from '../../../types/mobile-money.types'
import './MobileMoneyConsoleTab.css'

interface Props {
  onRefreshParent?: () => void
}

export const MobileMoneyConsoleTab: React.FC<Props> = ({ onRefreshParent }) => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'gateways' | 'webhooks'>('transactions')

  // Data states
  const [transactions, setTransactions] = useState<MobileMoneyTransaction[]>([])
  const [gateways, setGateways] = useState<MobileMoneyGateway[]>([])
  const [webhookLogs, setWebhookLogs] = useState<PaymentWebhookLog[]>([])
  const [stats, setStats] = useState<MobileMoneyStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedType, setSelectedType] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')

  // Modals
  const [showStkModal, setShowStkModal] = useState(false)
  const [showDisburseModal, setShowDisburseModal] = useState(false)
  const [showSimulateModal, setShowSimulateModal] = useState(false)
  const [inspectTx, setInspectTx] = useState<MobileMoneyTransaction | null>(null)
  const [inspectLog, setInspectLog] = useState<PaymentWebhookLog | null>(null)

  // Form states - STK Push
  const [stkForm, setStkForm] = useState<StkPushPayload>({
    phone_number: '',
    amount: 1000000,
    currency: 'UGX',
    notes: '',
  })

  // Form states - Disbursement
  const [disburseForm, setDisburseForm] = useState<DisbursementPayload>({
    phone_number: '',
    payee_name: '',
    amount: 500000,
    currency: 'UGX',
    purpose: 'contractor_payout',
    notes: '',
  })

  // Form states - Webhook Simulator
  const [simForm, setSimForm] = useState<SimulateWebhookPayload>({
    transaction_reference: '',
    status: 'SUCCESSFUL',
    failure_reason: '',
  })

  // Carrier auto-detection helper
  const detectCarrier = (phone: string): { name: string; class: string } => {
    const cleaned = phone.replace(/[^0-9]/g, '')
    if (cleaned.startsWith('25677') || cleaned.startsWith('25678') || cleaned.startsWith('077') || cleaned.startsWith('078')) {
      return { name: 'MTN Uganda (MoMo)', class: 'mtn' }
    }
    if (cleaned.startsWith('25670') || cleaned.startsWith('25675') || cleaned.startsWith('070') || cleaned.startsWith('075')) {
      return { name: 'Airtel Uganda (Airtel Money)', class: 'airtel' }
    }
    return { name: 'Auto-detecting carrier...', class: 'mock' }
  }

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [statsData, txData, gwData, logsData] = await Promise.all([
        mobileMoneyService.getStatistics().catch(() => null),
        mobileMoneyService.getTransactions({ per_page: 50 }),
        mobileMoneyService.getGateways().catch(() => []),
        mobileMoneyService.getWebhookLogs({ per_page: 30 }).catch(() => ({ data: [] })),
      ])

      if (statsData) setStats(statsData)
      setTransactions(txData?.data || [])
      setGateways(Array.isArray(gwData) ? gwData : [])
      setWebhookLogs(logsData?.data || [])
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to load mobile money data' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Clear feedback after 6 seconds
  useEffect(() => {
    if (feedbackMsg) {
      const timer = setTimeout(() => setFeedbackMsg(null), 6000)
      return () => clearTimeout(timer)
    }
  }, [feedbackMsg])

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch =
        !searchTerm ||
        tx.transaction_reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.external_reference && tx.external_reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
        tx.phone_number.includes(searchTerm) ||
        (tx.payer_or_payee_name && tx.payer_or_payee_name.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesProvider = !selectedProvider || tx.provider === selectedProvider
      const matchesType = !selectedType || tx.transaction_type === selectedType
      const matchesStatus = !selectedStatus || tx.status === selectedStatus

      return matchesSearch && matchesProvider && matchesType && matchesStatus
    })
  }, [transactions, searchTerm, selectedProvider, selectedType, selectedStatus])

  // Handle STK Push Submit
  const handleStkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setActionLoading(true)
      const res = await mobileMoneyService.initiateStkPush(stkForm)
      setFeedbackMsg({
        type: 'success',
        text: `STK Push initiated! Reference: ${res.transaction.transaction_reference}. A prompt has been sent to ${res.transaction.phone_number}.`,
      })
      setShowStkModal(false)
      setStkForm({ phone_number: '', amount: 1000000, currency: 'UGX', notes: '' })
      fetchData()
      if (onRefreshParent) onRefreshParent()
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || err.message || 'Failed to initiate STK Push' })
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Disbursement Submit
  const handleDisburseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setActionLoading(true)
      const res = await mobileMoneyService.disburse(disburseForm)
      setFeedbackMsg({
        type: 'success',
        text: `Disbursement completed successfully! Ref: ${res.transaction.transaction_reference}. Sent ${Number(res.transaction.amount).toLocaleString()} UGX to ${res.transaction.payer_or_payee_name}.`,
      })
      setShowDisburseModal(false)
      setDisburseForm({
        phone_number: '',
        payee_name: '',
        amount: 500000,
        currency: 'UGX',
        purpose: 'contractor_payout',
        notes: '',
      })
      fetchData()
      if (onRefreshParent) onRefreshParent()
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || err.message || 'Disbursement failed' })
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Webhook Simulator Submit
  const handleSimulateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setActionLoading(true)
      await mobileMoneyService.simulateCallback(simForm)
      setFeedbackMsg({
        type: 'success',
        text: `Callback processed! Transaction ${simForm.transaction_reference} marked as ${simForm.status}.`,
      })
      setShowSimulateModal(false)
      setSimForm({ transaction_reference: '', status: 'SUCCESSFUL', failure_reason: '' })
      fetchData()
      if (onRefreshParent) onRefreshParent()
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || err.message || 'Failed to simulate callback' })
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="mm-console">
      {/* Feedback Alert */}
      {feedbackMsg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontWeight: 500,
            background: feedbackMsg.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: feedbackMsg.type === 'success' ? '#15803d' : '#b91c1c',
            border: `1px solid ${feedbackMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          }}
        >
          {feedbackMsg.type === 'success' ? <MdCheckCircle size={20} /> : <MdCancel size={20} />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Gateway Status Bar & Quick Actions */}
      <div className="mm-gateway-status-bar">
        <div className="mm-gateway-badges">
          <div className="mm-provider-badge mtn">
            <span>●</span> MTN MoMo Gateway (UG)
          </div>
          <div className="mm-provider-badge airtel">
            <span>●</span> Airtel Money Gateway (UG)
          </div>
          <div className="mm-provider-badge mock">
            <span>⚡</span> Automated Waterfall & Reconciliation Active
          </div>
        </div>

        <div className="mm-actions-group">
          <button className="mm-btn mm-btn-stk" onClick={() => setShowStkModal(true)}>
            <MdPhoneIphone size={16} />
            <span>Initiate STK Push</span>
          </button>
          <button className="mm-btn mm-btn-disburse" onClick={() => setShowDisburseModal(true)}>
            <MdSend size={16} />
            <span>Disburse Funds (B2C)</span>
          </button>
          <button className="mm-btn mm-btn-sim" onClick={() => setShowSimulateModal(true)}>
            <MdScience size={16} />
            <span>Simulator</span>
          </button>
          <button className="mm-btn mm-btn-refresh" onClick={fetchData} disabled={loading}>
            <MdRefresh size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards Banner */}
      <div className="mm-kpi-grid">
        <div className="mm-kpi-card">
          <div className="mm-kpi-icon collected">
            <MdCallReceived />
          </div>
          <div>
            <div className="mm-kpi-title">Total Collections (C2B)</div>
            <div className="mm-kpi-value">
              {stats ? Number(stats.total_collected).toLocaleString() : '0'}{' '}
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>UGX</span>
            </div>
            <div className="mm-kpi-sub">
              MTN: {stats ? Number(stats.collections_by_provider?.mtn_momo || 0).toLocaleString() : 0} | Airtel:{' '}
              {stats ? Number(stats.collections_by_provider?.airtel_money || 0).toLocaleString() : 0}
            </div>
          </div>
        </div>

        <div className="mm-kpi-card">
          <div className="mm-kpi-icon disbursed">
            <MdCallMade />
          </div>
          <div>
            <div className="mm-kpi-title">Total Disbursements (B2C)</div>
            <div className="mm-kpi-value">
              {stats ? Number(stats.total_disbursed).toLocaleString() : '0'}{' '}
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>UGX</span>
            </div>
            <div className="mm-kpi-sub">Direct contractor, site petty cash & wages</div>
          </div>
        </div>

        <div className="mm-kpi-card">
          <div className="mm-kpi-icon net">
            <MdAccountBalanceWallet />
          </div>
          <div>
            <div className="mm-kpi-title">Net Gateway Cash Flow</div>
            <div className="mm-kpi-value">
              {stats ? Number(stats.net_cash_flow).toLocaleString() : '0'}{' '}
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>UGX</span>
            </div>
            <div className="mm-kpi-sub">{stats?.total_transactions || 0} total gateway operations</div>
          </div>
        </div>

        <div className="mm-kpi-card">
          <div className="mm-kpi-icon rate">
            <MdCheckCircle />
          </div>
          <div>
            <div className="mm-kpi-title">Gateway Success Rate</div>
            <div className="mm-kpi-value">{stats ? stats.success_rate : 100}%</div>
            <div className="mm-kpi-sub">
              {stats?.successful_transactions || 0} successful / {stats?.failed_transactions || 0} failed
            </div>
          </div>
        </div>
      </div>

      {/* Subtab Navigation */}
      <div className="mm-subtabs">
        <button
          className={`mm-subtab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          Transactions ({filteredTransactions.length})
        </button>
        <button
          className={`mm-subtab-btn ${activeTab === 'gateways' ? 'active' : ''}`}
          onClick={() => setActiveTab('gateways')}
        >
          Gateway Float Limits ({gateways.length})
        </button>
        <button
          className={`mm-subtab-btn ${activeTab === 'webhooks' ? 'active' : ''}`}
          onClick={() => setActiveTab('webhooks')}
        >
          IPN Webhook Logs ({webhookLogs.length})
        </button>
      </div>

      {/* TAB 1: Transactions List */}
      {activeTab === 'transactions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Filters Bar */}
          <div className="mm-filters-row">
            <div className="mm-search-box">
              <MdSearch className="mm-search-icon" />
              <input
                type="text"
                placeholder="Search reference, phone, or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="mm-filter-select"
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
            >
              <option value="">All Providers</option>
              <option value="mtn_momo">MTN MoMo</option>
              <option value="airtel_money">Airtel Money</option>
            </select>

            <select
              className="mm-filter-select"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="c2b_collection">C2B Collections (In)</option>
              <option value="b2c_disbursement">B2C Disbursements (Out)</option>
            </select>

            <select
              className="mm-filter-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="successful">Successful</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Transactions Table */}
          <div className="mm-table-wrapper">
            <table className="mm-table">
              <thead>
                <tr>
                  <th>Direction</th>
                  <th>Reference</th>
                  <th>Network</th>
                  <th>Phone / Recipient</th>
                  <th>Purpose</th>
                  <th>Amount (UGX)</th>
                  <th>Status</th>
                  <th>Date & Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="mm-empty-state">
                      No mobile money transactions found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>
                        <span
                          className={`badge-direction ${
                            tx.transaction_type === 'c2b_collection' ? 'c2b' : 'b2c'
                          }`}
                        >
                          {tx.transaction_type === 'c2b_collection' ? '↓ IN (C2B)' : '↑ OUT (B2C)'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {tx.transaction_reference}
                        </span>
                        {tx.external_reference && (
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {tx.external_reference}
                          </div>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            fontWeight: 600,
                            color: tx.provider === 'mtn_momo' ? '#d97706' : '#e11d48',
                          }}
                        >
                          {tx.provider === 'mtn_momo' ? 'MTN MoMo' : 'Airtel Money'}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{tx.phone_number}</div>
                        {tx.payer_or_payee_name && (
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {tx.payer_or_payee_name}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ textTransform: 'capitalize' }}>
                          {tx.purpose?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            color: tx.transaction_type === 'c2b_collection' ? '#166534' : '#1e40af',
                          }}
                        >
                          {tx.transaction_type === 'c2b_collection' ? '+' : '-'}
                          {Number(tx.amount).toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <span className={`badge-status ${tx.status}`}>{tx.status}</span>
                      </td>
                      <td style={{ fontSize: '12px', color: '#64748b' }}>
                        {new Date(tx.initiated_at || tx.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            style={{
                              background: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                            onClick={() => setInspectTx(tx)}
                          >
                            Details
                          </button>
                          {tx.status === 'pending' && (
                            <button
                              style={{
                                background: '#ecfdf5',
                                border: '1px solid #a7f3d0',
                                color: '#047857',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 600,
                              }}
                              onClick={() => {
                                setSimForm({
                                  transaction_reference: tx.transaction_reference,
                                  status: 'SUCCESSFUL',
                                  failure_reason: '',
                                })
                                setShowSimulateModal(true)
                              }}
                            >
                              Resolve
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
        </div>
      )}

      {/* TAB 2: Gateways & Limits */}
      {activeTab === 'gateways' && (
        <div className="mm-gateways-grid">
          {gateways.length === 0 ? (
            <div className="mm-empty-state">No configured gateways found.</div>
          ) : (
            gateways.map((gw) => {
              const pctUsed = Math.min(
                100,
                Math.round(
                  ((Number(gw.current_daily_disbursed) || 0) /
                    (Number(gw.daily_disbursement_limit) || 1)) *
                    100
                )
              )
              return (
                <div className="mm-gw-card" key={gw.id}>
                  <div className="mm-gw-card-header">
                    <div className="mm-gw-name">{gw.account_name}</div>
                    <span
                      className={`badge-status ${gw.is_active ? 'successful' : 'failed'}`}
                    >
                      {gw.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <div className="mm-gw-metric-row">
                    <span className="mm-gw-metric-label">Provider</span>
                    <span className="mm-gw-metric-val" style={{ textTransform: 'capitalize' }}>
                      {gw.provider?.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="mm-gw-metric-row">
                    <span className="mm-gw-metric-label">Environment</span>
                    <span className="mm-gw-metric-val" style={{ textTransform: 'uppercase' }}>
                      {gw.environment}
                    </span>
                  </div>

                  <div className="mm-gw-metric-row">
                    <span className="mm-gw-metric-label">Merchant Code</span>
                    <span className="mm-gw-metric-val">{gw.merchant_code || 'MOMO-DEFAULT'}</span>
                  </div>

                  <div className="mm-gw-metric-row">
                    <span className="mm-gw-metric-label">Daily Limit</span>
                    <span className="mm-gw-metric-val">
                      {Number(gw.daily_disbursement_limit).toLocaleString()} {gw.currency}
                    </span>
                  </div>

                  <div className="mm-gw-metric-row">
                    <span className="mm-gw-metric-label">Disbursed Today</span>
                    <span className="mm-gw-metric-val">
                      {Number(gw.current_daily_disbursed).toLocaleString()} {gw.currency} (
                      {pctUsed}%)
                    </span>
                  </div>

                  <div className="mm-gw-progress">
                    <div
                      className="mm-gw-progress-bar"
                      style={{
                        width: `${pctUsed}%`,
                        backgroundColor: pctUsed > 80 ? '#e11d48' : '#3b82f6',
                      }}
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* TAB 3: Webhook IPN Logs */}
      {activeTab === 'webhooks' && (
        <div className="mm-table-wrapper">
          <table className="mm-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Provider</th>
                <th>Event / Ref</th>
                <th>IP Address</th>
                <th>Timestamp</th>
                <th>Raw Payload</th>
              </tr>
            </thead>
            <tbody>
              {webhookLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="mm-empty-state">
                    No webhook audit logs recorded yet.
                  </td>
                </tr>
              ) : (
                webhookLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span className={`badge-status ${log.status}`}>{log.status}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{log.provider}</td>
                    <td style={{ fontFamily: 'monospace' }}>
                      {log.external_reference || log.event_type || 'IPN Callback'}
                    </td>
                    <td>{log.ip_address || '127.0.0.1'}</td>
                    <td style={{ fontSize: '12px', color: '#64748b' }}>
                      {new Date(log.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td>
                      <button
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '11px',
                        }}
                        onClick={() => setInspectLog(log)}
                      >
                        Inspect Payload
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL 1: Initiate STK Push */}
      {showStkModal && (
        <div className="mm-modal-overlay" onClick={() => setShowStkModal(false)}>
          <div className="mm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mm-modal-header">
              <h3>Initiate Mobile Money STK Push (C2B)</h3>
              <button className="mm-modal-close-btn" onClick={() => setShowStkModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleStkSubmit}>
              <div className="mm-modal-body">
                <div className="mm-form-group">
                  <label>Customer Mobile Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 0772123456 or 0705123456"
                    value={stkForm.phone_number}
                    onChange={(e) =>
                      setStkForm((prev) => ({ ...prev, phone_number: e.target.value }))
                    }
                  />
                  {stkForm.phone_number.length >= 4 && (
                    <div
                      className={`mm-carrier-pill ${detectCarrier(stkForm.phone_number).class}`}
                    >
                      {detectCarrier(stkForm.phone_number).name}
                    </div>
                  )}
                </div>

                <div className="mm-form-group">
                  <label>Amount (UGX) *</label>
                  <input
                    type="number"
                    min="500"
                    step="500"
                    required
                    value={stkForm.amount}
                    onChange={(e) =>
                      setStkForm((prev) => ({ ...prev, amount: Number(e.target.value) }))
                    }
                  />
                </div>

                <div className="mm-form-group">
                  <label>Notes / Deposit Description</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Milestone 1 savings deposit for Kigo Villa plot #12"
                    value={stkForm.notes || ''}
                    onChange={(e) =>
                      setStkForm((prev) => ({ ...prev, notes: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="mm-modal-footer">
                <button
                  type="button"
                  className="mm-btn mm-btn-refresh"
                  style={{ color: '#64748b' }}
                  onClick={() => setShowStkModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="mm-btn mm-btn-stk"
                  disabled={actionLoading || !stkForm.phone_number}
                >
                  {actionLoading ? 'Triggering...' : 'Send STK Prompt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: B2C Disbursement */}
      {showDisburseModal && (
        <div className="mm-modal-overlay" onClick={() => setShowDisburseModal(false)}>
          <div className="mm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mm-modal-header">
              <h3>Direct Mobile Money Disbursement (B2C)</h3>
              <button className="mm-modal-close-btn" onClick={() => setShowDisburseModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleDisburseSubmit}>
              <div className="mm-modal-body">
                <div className="mm-form-group">
                  <label>Payee / Recipient Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kampala Steel Fabricators or Site Manager Joseph"
                    value={disburseForm.payee_name}
                    onChange={(e) =>
                      setDisburseForm((prev) => ({ ...prev, payee_name: e.target.value }))
                    }
                  />
                </div>

                <div className="mm-form-group">
                  <label>Recipient Mobile Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 0772123456 or 0705123456"
                    value={disburseForm.phone_number}
                    onChange={(e) =>
                      setDisburseForm((prev) => ({ ...prev, phone_number: e.target.value }))
                    }
                  />
                  {disburseForm.phone_number.length >= 4 && (
                    <div
                      className={`mm-carrier-pill ${detectCarrier(disburseForm.phone_number).class}`}
                    >
                      {detectCarrier(disburseForm.phone_number).name}
                    </div>
                  )}
                </div>

                <div className="mm-form-group">
                  <label>Amount (UGX) *</label>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    required
                    value={disburseForm.amount}
                    onChange={(e) =>
                      setDisburseForm((prev) => ({ ...prev, amount: Number(e.target.value) }))
                    }
                  />
                </div>

                <div className="mm-form-group">
                  <label>Disbursement Purpose *</label>
                  <select
                    value={disburseForm.purpose}
                    onChange={(e) =>
                      setDisburseForm((prev) => ({
                        ...prev,
                        purpose: e.target.value as MobileMoneyPurpose,
                      }))
                    }
                  >
                    <option value="contractor_payout">Contractor Payout (Valuation/IPC)</option>
                    <option value="petty_cash_float">Petty Cash Site Float Replenishment</option>
                    <option value="labor_wage">Direct Labor / Masons Wage</option>
                    <option value="refund">Client Savings Refund</option>
                    <option value="other">General Operational Expense</option>
                  </select>
                </div>

                <div className="mm-form-group">
                  <label>Audit Memo</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Site fuel and cement float for Kigo Villa"
                    value={disburseForm.notes || ''}
                    onChange={(e) =>
                      setDisburseForm((prev) => ({ ...prev, notes: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="mm-modal-footer">
                <button
                  type="button"
                  className="mm-btn mm-btn-refresh"
                  style={{ color: '#64748b' }}
                  onClick={() => setShowDisburseModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="mm-btn mm-btn-disburse"
                  disabled={actionLoading || !disburseForm.phone_number || !disburseForm.payee_name}
                >
                  {actionLoading ? 'Disbursing...' : 'Confirm & Disburse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Webhook Callback Simulator */}
      {showSimulateModal && (
        <div className="mm-modal-overlay" onClick={() => setShowSimulateModal(false)}>
          <div className="mm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mm-modal-header">
              <h3>Gateway Webhook IPN Simulator (Dev/Staging)</h3>
              <button className="mm-modal-close-btn" onClick={() => setShowSimulateModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSimulateSubmit}>
              <div className="mm-modal-body">
                <div className="mm-form-group">
                  <label>Transaction Internal Reference *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MOMO-20261020-XXXX"
                    value={simForm.transaction_reference}
                    onChange={(e) =>
                      setSimForm((prev) => ({ ...prev, transaction_reference: e.target.value }))
                    }
                  />
                </div>

                <div className="mm-form-group">
                  <label>Simulated Callback Status *</label>
                  <select
                    value={simForm.status}
                    onChange={(e) =>
                      setSimForm((prev) => ({
                        ...prev,
                        status: e.target.value as 'SUCCESSFUL' | 'FAILED',
                      }))
                    }
                  >
                    <option value="SUCCESSFUL">SUCCESSFUL (PIN entered & funds deducted)</option>
                    <option value="FAILED">FAILED (Cancelled / Insufficient balance)</option>
                  </select>
                </div>

                {simForm.status === 'FAILED' && (
                  <div className="mm-form-group">
                    <label>Failure Reason</label>
                    <input
                      type="text"
                      placeholder="e.g. Subscriber pin timeout or cancelled prompt"
                      value={simForm.failure_reason || ''}
                      onChange={(e) =>
                        setSimForm((prev) => ({ ...prev, failure_reason: e.target.value }))
                      }
                    />
                  </div>
                )}
              </div>

              <div className="mm-modal-footer">
                <button
                  type="button"
                  className="mm-btn mm-btn-refresh"
                  style={{ color: '#64748b' }}
                  onClick={() => setShowSimulateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="mm-btn mm-btn-stk"
                  disabled={actionLoading || !simForm.transaction_reference}
                >
                  {actionLoading ? 'Simulating...' : 'Dispatch Callback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Transaction Details Inspector */}
      {inspectTx && (
        <div className="mm-modal-overlay" onClick={() => setInspectTx(null)}>
          <div className="mm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mm-modal-header">
              <h3>Transaction Details</h3>
              <button className="mm-modal-close-btn" onClick={() => setInspectTx(null)}>
                &times;
              </button>
            </div>
            <div className="mm-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>INTERNAL REFERENCE</div>
                  <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                    {inspectTx.transaction_reference}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>GATEWAY REF</div>
                  <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                    {inspectTx.external_reference || 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>DIRECTION</div>
                  <div style={{ fontWeight: 600 }}>{inspectTx.transaction_type}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>STATUS</div>
                  <div style={{ fontWeight: 600 }}>{inspectTx.status}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>PHONE NUMBER</div>
                  <div style={{ fontWeight: 600 }}>{inspectTx.phone_number}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>AMOUNT</div>
                  <div style={{ fontWeight: 700 }}>
                    {Number(inspectTx.amount).toLocaleString()} {inspectTx.currency}
                  </div>
                </div>
              </div>

              {inspectTx.failure_reason && (
                <div
                  style={{
                    background: '#fee2e2',
                    color: '#991b1b',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                >
                  <strong>Failure Reason:</strong> {inspectTx.failure_reason}
                </div>
              )}

              {inspectTx.callback_payload && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                    Raw Callback Payload
                  </div>
                  <pre
                    style={{
                      background: '#0f172a',
                      color: '#38bdf8',
                      padding: '12px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      overflowX: 'auto',
                    }}
                  >
                    {JSON.stringify(inspectTx.callback_payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            <div className="mm-modal-footer">
              <button className="mm-btn mm-btn-refresh" onClick={() => setInspectTx(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Webhook Payload Inspector */}
      {inspectLog && (
        <div className="mm-modal-overlay" onClick={() => setInspectLog(null)}>
          <div className="mm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mm-modal-header">
              <h3>Raw IPN Webhook Payload</h3>
              <button className="mm-modal-close-btn" onClick={() => setInspectLog(null)}>
                &times;
              </button>
            </div>
            <div className="mm-modal-body">
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Provider: <strong>{inspectLog.provider}</strong> | IP: {inspectLog.ip_address} | Status:{' '}
                <span className={`badge-status ${inspectLog.status}`}>{inspectLog.status}</span>
              </div>
              <pre
                style={{
                  background: '#0f172a',
                  color: '#4ade80',
                  padding: '14px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  overflowX: 'auto',
                }}
              >
                {JSON.stringify(inspectLog.payload, null, 2)}
              </pre>
            </div>
            <div className="mm-modal-footer">
              <button className="mm-btn mm-btn-refresh" onClick={() => setInspectLog(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MobileMoneyConsoleTab
