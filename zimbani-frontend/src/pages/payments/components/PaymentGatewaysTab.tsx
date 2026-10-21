import React, { useState, useEffect, useCallback } from 'react'
import {
  MdCreditCard,
  MdPhoneAndroid,
  MdAccountBalance,
  MdCheckCircle,
  MdRefresh,
  MdAdd,
  MdClose,
  MdOpenInNew,
  MdCancel,
} from 'react-icons/md'
import paymentIntegrationService from '../../../services/payment-integration.service'
import {
  PaymentGatewayConfig,
  PaymentIntent,
  PaymentStatistics,
  CreatePaymentIntentPayload,
} from '../../../types/payment-integration.types'
import './PaymentGatewaysTab.css'

export const PaymentGatewaysTab: React.FC = () => {
  const [gateways, setGateways] = useState<PaymentGatewayConfig[]>([])
  const [intents, setIntents] = useState<PaymentIntent[]>([])
  const [stats, setStats] = useState<PaymentStatistics | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // New Intent Modal State
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false)
  const [createdIntent, setCreatedIntent] = useState<PaymentIntent | null>(null)
  const [checkoutForm, setCheckoutForm] = useState<CreatePaymentIntentPayload>({
    amount: 1500000,
    currency: 'UGX',
    gateway_name: 'flutterwave',
    payment_method: 'card',
    client_phone: '+256772123456',
    client_email: 'homebuilder@fabhomes.ug',
    client_name: 'Uganda Diaspora Client',
  })

  // Load Gateways, Intents, and Stats
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [gatewaysRes, intentsRes, statsRes] = await Promise.all([
        paymentIntegrationService.getGateways(),
        paymentIntegrationService.getPaymentIntents({ per_page: 30 }),
        paymentIntegrationService.getStatistics().catch(() => null),
      ])

      setGateways(gatewaysRes || [])
      setIntents(intentsRes.data || [])
      if (statsRes) setStats(statsRes)
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.message || err.message || 'Failed to load gateway data' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Clear feedback after 6s
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 6000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  // Handle Intent Creation
  const handleCreateIntent = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setActionLoading(true)
      const res = await paymentIntegrationService.createPaymentIntent(checkoutForm)
      setCreatedIntent(res)
      setFeedback({ type: 'success', text: `Payment Intent ${res.intent_reference} generated successfully!` })
      loadData()
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.message || err.message || 'Payment initiation failed' })
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Confirm Intent (Simulate Webhook / Direct Success)
  const handleConfirmIntent = async (identifier: string | number) => {
    try {
      setActionLoading(true)
      await paymentIntegrationService.confirmPaymentIntent(identifier, {
        simulated_by: 'Dashboard Quick Action',
      })
      setFeedback({ type: 'success', text: 'Payment intent confirmed and posted to ledger!' })
      if (createdIntent && (createdIntent.id === identifier || createdIntent.uuid === identifier)) {
        setCreatedIntent(null)
        setShowCheckoutModal(false)
      }
      loadData()
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.message || err.message || 'Confirmation failed' })
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Cancel Intent
  const handleCancelIntent = async (identifier: string | number) => {
    if (!window.confirm('Are you sure you want to cancel this payment intent?')) return
    try {
      setActionLoading(true)
      await paymentIntegrationService.cancelPaymentIntent(identifier, 'Cancelled from admin dashboard')
      setFeedback({ type: 'success', text: 'Payment intent cancelled' })
      loadData()
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.message || err.message || 'Cancellation failed' })
    } finally {
      setActionLoading(false)
    }
  }

  const formatUGX = (val?: number | null) => {
    if (val === undefined || val === null || isNaN(val)) return '0 UGX'
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(val)
  }

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'card':
        return <MdCreditCard />
      case 'mobile_money':
        return <MdPhoneAndroid />
      case 'bank_transfer':
        return <MdAccountBalance />
      default:
        return <MdCreditCard />
    }
  }

  return (
    <div className="pgw-container">
      {/* Feedback Banner */}
      {feedback && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '13px',
            background: feedback.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: feedback.type === 'success' ? '#15803d' : '#b91c1c',
            border: `1px solid ${feedback.type === 'success' ? '#86efac' : '#fca5a5'}`,
          }}
        >
          {feedback.text}
        </div>
      )}

      {/* KPI Bar */}
      {stats && (
        <div className="pgw-kpi-grid">
          <div className="pgw-kpi-card">
            <div className="pgw-kpi-header">
              <span className="pgw-kpi-title">Total Gateway Volume</span>
              <span style={{ color: '#16a34a', fontSize: '20px' }}><MdCheckCircle /></span>
            </div>
            <div className="pgw-kpi-val">{formatUGX(stats.total_volume)}</div>
            <div className="pgw-kpi-subtext">Settled across all adapters</div>
          </div>

          <div className="pgw-kpi-card">
            <div className="pgw-kpi-header">
              <span className="pgw-kpi-title">Processing Fees Collected</span>
              <span style={{ color: '#0284c7', fontSize: '20px' }}><MdAccountBalance /></span>
            </div>
            <div className="pgw-kpi-val">{formatUGX(stats.total_fees)}</div>
            <div className="pgw-kpi-subtext">Aggregator & gateway revenue</div>
          </div>

          <div className="pgw-kpi-card">
            <div className="pgw-kpi-header">
              <span className="pgw-kpi-title">Transactions Settled</span>
              <span style={{ color: '#9333ea', fontSize: '20px' }}><MdCheckCircle /></span>
            </div>
            <div className="pgw-kpi-val">{stats.successful_transactions_count}</div>
            <div className="pgw-kpi-subtext">{stats.success_rate_percentage}% success rate</div>
          </div>

          <div className="pgw-kpi-card">
            <div className="pgw-kpi-header">
              <span className="pgw-kpi-title">Pending / In-Flight</span>
              <span style={{ color: '#d97706', fontSize: '20px' }}><MdRefresh /></span>
            </div>
            <div className="pgw-kpi-val">{stats.pending_transactions_count}</div>
            <div className="pgw-kpi-subtext">Awaiting STK or 3DS completion</div>
          </div>
        </div>
      )}

      {/* Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#0f172a' }}>
            Production Gateway Adapters & Dynamic Checkout
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Multi-provider routing: Flutterwave, Pesapal, MTN MoMo, Airtel Money, Stanbic Bank
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn-secondary"
            onClick={loadData}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <MdRefresh /> Refresh
          </button>

          <button
            className="btn-primary"
            onClick={() => {
              setCreatedIntent(null)
              setShowCheckoutModal(true)
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <MdAdd /> Initiate Payment Intent
          </button>
        </div>
      </div>

      {/* Gateway Cards Grid */}
      <div className="gateways-cards-grid">
        {gateways.map((gw) => (
          <div key={gw.name} className={`gateway-card ${gw.is_active ? 'active' : ''}`}>
            <div className="gateway-header">
              <div>
                <div className="gateway-name">{gw.display_name}</div>
                <div className="gateway-type">
                  Driver: <code>{gw.name}</code> | {gw.provider_type}
                </div>
              </div>
              <span className={`gateway-env-badge ${gw.environment}`}>{gw.environment}</span>
            </div>

            <div className="gateway-methods-tags">
              {gw.supported_methods.map((m) => (
                <span key={m} className="method-tag">
                  {getMethodIcon(m)} {m.replace('_', ' ')}
                </span>
              ))}
            </div>

            <div className="gateway-fee-row">
              <span>Transaction Fee:</span>
              <strong>
                {gw.transaction_fee_percentage}% + {formatUGX(gw.flat_fee)}
              </strong>
            </div>

            <div className="gateway-fee-row">
              <span>Transaction Range:</span>
              <span>
                {formatUGX(gw.min_transaction_amount)} - {formatUGX(gw.max_transaction_amount)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Intents History Ledger */}
      <div className="intents-table-card">
        <div className="intents-table-header">
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              Dynamic Payment Intents & Checkouts ({intents.length})
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Real-time multi-channel payment lifecycle tracking
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="intents-table">
            <thead>
              <tr>
                <th>Intent Reference</th>
                <th>Client / Payer</th>
                <th>Gateway Driver</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Fee</th>
                <th>Total Charge</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {intents.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    No payment intents created yet. Click "Initiate Payment Intent" to test checkout.
                  </td>
                </tr>
              ) : (
                intents.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                      {item.intent_reference}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.client_name || 'Homebuilder'}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{item.client_phone || '—'}</div>
                    </td>
                    <td>
                      <code style={{ fontSize: '12px' }}>{item.gateway_name}</code>
                    </td>
                    <td>
                      <span style={{ textTransform: 'capitalize' }}>
                        {item.payment_method.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatUGX(item.amount)}</td>
                    <td style={{ color: '#64748b' }}>{formatUGX(item.fee_amount)}</td>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>
                      {formatUGX(item.total_charge_amount)}
                    </td>
                    <td>
                      <span className={`status-badge ${item.status}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: '#64748b' }}>
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {item.status !== 'succeeded' && item.status !== 'cancelled' && (
                          <>
                            <button
                              className="btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                              onClick={() => handleConfirmIntent(item.id)}
                              title="Simulate Webhook Success & Settle"
                              disabled={actionLoading}
                            >
                              <MdCheckCircle style={{ color: '#16a34a' }} /> Confirm
                            </button>

                            <button
                              className="btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                              onClick={() => handleCancelIntent(item.id)}
                              title="Cancel Intent"
                              disabled={actionLoading}
                            >
                              <MdCancel style={{ color: '#b91c1c' }} />
                            </button>
                          </>
                        )}
                        {item.gateway_checkout_url && (
                          <a
                            href={item.gateway_checkout_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                            title="Open Hosted Checkout"
                          >
                            <MdOpenInNew />
                          </a>
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

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="checkout-modal-overlay">
          <div className="checkout-modal-card">
            <div className="checkout-modal-header">
              <h3 style={{ margin: 0, fontSize: '16px' }}>
                {createdIntent ? 'Payment Intent Initialized' : 'Initiate Multi-Channel Payment'}
              </h3>
              <button
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '20px' }}
                onClick={() => {
                  setShowCheckoutModal(false)
                  setCreatedIntent(null)
                }}
              >
                <MdClose />
              </button>
            </div>

            {!createdIntent ? (
              <form onSubmit={handleCreateIntent}>
                <div className="checkout-modal-body">
                  <div className="filter-group">
                    <label>Select Payment Gateway Provider</label>
                    <select
                      className="dossier-input"
                      value={checkoutForm.gateway_name}
                      onChange={(e) =>
                        setCheckoutForm({ ...checkoutForm, gateway_name: e.target.value })
                      }
                    >
                      {gateways.map((g) => (
                        <option key={g.name} value={g.name}>
                          {g.display_name} ({g.transaction_fee_percentage}%)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Payment Method</label>
                    <select
                      className="dossier-input"
                      value={checkoutForm.payment_method}
                      onChange={(e) =>
                        setCheckoutForm({ ...checkoutForm, payment_method: e.target.value })
                      }
                    >
                      <option value="card">Credit / Debit Card (Visa, Mastercard)</option>
                      <option value="mobile_money">Mobile Money (MTN, Airtel)</option>
                      <option value="bank_transfer">Stanbic Direct Bank Transfer</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Amount (UGX)</label>
                    <input
                      type="number"
                      min="1000"
                      step="1000"
                      required
                      className="dossier-input"
                      value={checkoutForm.amount}
                      onChange={(e) =>
                        setCheckoutForm({ ...checkoutForm, amount: Number(e.target.value) })
                      }
                    />
                  </div>

                  <div className="filter-group">
                    <label>Client Payer Name</label>
                    <input
                      type="text"
                      required
                      className="dossier-input"
                      value={checkoutForm.client_name}
                      onChange={(e) =>
                        setCheckoutForm({ ...checkoutForm, client_name: e.target.value })
                      }
                    />
                  </div>

                  <div className="filter-group">
                    <label>Client Mobile Phone Number</label>
                    <input
                      type="text"
                      className="dossier-input"
                      value={checkoutForm.client_phone}
                      onChange={(e) =>
                        setCheckoutForm({ ...checkoutForm, client_phone: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="checkout-modal-footer">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowCheckoutModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={actionLoading}>
                    {actionLoading ? 'Initializing...' : 'Generate Payment Intent'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="checkout-modal-body">
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <MdCheckCircle style={{ fontSize: '48px', color: '#16a34a', margin: '0 auto' }} />
                  <h4 style={{ margin: '10px 0 4px 0', fontSize: '18px', color: '#0f172a' }}>
                    {createdIntent.intent_reference}
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    Gateway Reference: <code>{createdIntent.gateway_reference}</code>
                  </p>
                </div>

                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '13px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Amount:</span>
                    <strong>{formatUGX(createdIntent.amount)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Processing Fee:</span>
                    <span>{formatUGX(createdIntent.fee_amount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
                    <span>Total Charge:</span>
                    <strong style={{ color: '#0f172a' }}>{formatUGX(createdIntent.total_charge_amount)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Prompt Action:</span>
                    <span style={{ textTransform: 'capitalize' }}>
                      {createdIntent.gateway_response?.action_type || 'Prompt sent'}
                    </span>
                  </div>
                </div>

                {createdIntent.gateway_checkout_url && (
                  <div style={{ textAlign: 'center' }}>
                    <a
                      href={createdIntent.gateway_checkout_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
                    >
                      <MdOpenInNew /> Proceed to Hosted Checkout
                    </a>
                  </div>
                )}

                <div className="checkout-modal-footer" style={{ margin: '-16px -24px -24px -24px' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setShowCheckoutModal(false)
                      setCreatedIntent(null)
                    }}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => handleConfirmIntent(createdIntent.id)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Simulating...' : 'Simulate Instant Webhook Success'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentGatewaysTab
