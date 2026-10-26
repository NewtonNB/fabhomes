import React, { useState, useEffect, useCallback } from 'react'
import {
  MdCreditCard,
  MdPhoneAndroid,
  MdAccountBalance,
  MdCheckCircle,
  MdRefresh,
  MdAdd,
  MdOpenInNew,
  MdCancel,
  MdSecurity,
  MdAssignmentReturn,
  MdSensors,
  MdFactCheck,
} from 'react-icons/md'
import paymentIntegrationService from '../../../services/payment-integration.service'
import {
  PaymentGatewayConfig,
  PaymentIntent,
  PaymentStatistics,
} from '../../../types/payment-integration.types'
import WebhookTelemetryTab from './WebhookTelemetryTab'
import PaymentRefundsDisputesTab from './PaymentRefundsDisputesTab'
import GatewayHealthMonitor from './GatewayHealthMonitor'
import UnifiedCheckoutModal from './UnifiedCheckoutModal'
import PaymentSimulationReconciliationTab from './PaymentSimulationReconciliationTab'
import { ConfirmDialog } from '../../../components/common/ConfirmDialog'
import './PaymentGatewaysTab.css'

export const PaymentGatewaysTab: React.FC = () => {
  const [subtab, setSubtab] = useState<'checkout' | 'health' | 'webhooks' | 'refunds_disputes' | 'simulation'>('checkout')
  const [gateways, setGateways] = useState<PaymentGatewayConfig[]>([])
  const [intents, setIntents] = useState<PaymentIntent[]>([])
  const [stats, setStats] = useState<PaymentStatistics | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [intentToCancel, setIntentToCancel] = useState<string | number | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Checkout Modal State
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false)

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

  // Handle Confirm Intent (Simulate Webhook / Direct Success)
  const handleConfirmIntent = async (identifier: string | number) => {
    try {
      setActionLoading(true)
      await paymentIntegrationService.confirmPaymentIntent(identifier, {
        simulated_by: 'Dashboard Quick Action',
      })
      setFeedback({ type: 'success', text: 'Payment intent confirmed and posted to ledger!' })
      loadData()
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.message || err.message || 'Confirmation failed' })
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Cancel Intent
  const handleCancelIntent = (identifier: string | number) => {
    setIntentToCancel(identifier)
  }

  const confirmCancelIntent = async () => {
    if (!intentToCancel) return
    try {
      setActionLoading(true)
      await paymentIntegrationService.cancelPaymentIntent(intentToCancel, 'Cancelled from admin dashboard')
      setFeedback({ type: 'success', text: 'Payment intent cancelled successfully' })
      setIntentToCancel(null)
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

      {/* Subtab Navigation */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '2px solid #e2e8f0', paddingBottom: '4px' }}>
        <button
          onClick={() => setSubtab('checkout')}
          style={{
            background: 'none',
            border: 'none',
            padding: '10px 14px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            color: subtab === 'checkout' ? '#0284c7' : '#64748b',
            borderBottom: subtab === 'checkout' ? '2px solid #0284c7' : '2px solid transparent',
            marginBottom: '-6px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <MdCreditCard size={18} /> Gateway Adapters & Dynamic Checkout
        </button>

        <button
          onClick={() => setSubtab('health')}
          style={{
            background: 'none',
            border: 'none',
            padding: '10px 14px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            color: subtab === 'health' ? '#0284c7' : '#64748b',
            borderBottom: subtab === 'health' ? '2px solid #0284c7' : '2px solid transparent',
            marginBottom: '-6px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <MdSensors size={18} /> Gateway Health & SLA Monitor
        </button>

        <button
          onClick={() => setSubtab('webhooks')}
          style={{
            background: 'none',
            border: 'none',
            padding: '10px 14px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            color: subtab === 'webhooks' ? '#0284c7' : '#64748b',
            borderBottom: subtab === 'webhooks' ? '2px solid #0284c7' : '2px solid transparent',
            marginBottom: '-6px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <MdSecurity size={18} /> Universal Webhook Ingestion & Cryptographic Security
        </button>

        <button
          onClick={() => setSubtab('refunds_disputes')}
          style={{
            background: 'none',
            border: 'none',
            padding: '10px 14px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            color: subtab === 'refunds_disputes' ? '#0284c7' : '#64748b',
            borderBottom: subtab === 'refunds_disputes' ? '2px solid #0284c7' : '2px solid transparent',
            marginBottom: '-6px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <MdAssignmentReturn size={18} /> Refunds & Dispute Resolution Ledger
        </button>

        <button
          onClick={() => setSubtab('simulation')}
          style={{
            background: 'none',
            border: 'none',
            padding: '10px 14px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            color: subtab === 'simulation' ? '#0284c7' : '#64748b',
            borderBottom: subtab === 'simulation' ? '2px solid #0284c7' : '2px solid transparent',
            marginBottom: '-6px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <MdFactCheck size={18} /> Sandbox Simulation & Bank Reconciliation
        </button>
      </div>

      {subtab === 'checkout' ? (
        <>
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
                onClick={() => setShowCheckoutModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <MdAdd /> Unified Multi-Channel Checkout
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
    </>
  ) : subtab === 'health' ? (
    <GatewayHealthMonitor />
  ) : subtab === 'webhooks' ? (
    <WebhookTelemetryTab />
  ) : subtab === 'refunds_disputes' ? (
    <PaymentRefundsDisputesTab />
  ) : (
    <PaymentSimulationReconciliationTab />
  )}

  {/* Unified Multi-Channel Checkout Modal */}
  <UnifiedCheckoutModal
    isOpen={showCheckoutModal}
    onClose={() => setShowCheckoutModal(false)}
    initialAmount={1500000}
    currency="UGX"
    clientName="Uganda Diaspora Client"
    clientPhone="+256772123456"
    clientEmail="homebuilder@fabhomes.ug"
    onPaymentSuccess={() => {
      loadData()
      setFeedback({
        type: 'success',
        text: 'Payment completed successfully through Unified Checkout!',
      })
    }}
  />

  <ConfirmDialog
    isOpen={!!intentToCancel}
    title="Cancel Payment Intent"
    message="Are you sure you want to cancel this pending payment intent? This action cannot be undone."
    confirmLabel="Cancel Intent"
    cancelLabel="Keep Intent"
    variant="danger"
    loading={actionLoading}
    onConfirm={confirmCancelIntent}
    onCancel={() => setIntentToCancel(null)}
  />
    </div>
  )
}

export default PaymentGatewaysTab
