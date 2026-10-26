import React, { useState, useEffect } from 'react'
import {
  MdClose,
  MdLock,
  MdCreditCard,
  MdPhoneAndroid,
  MdAccountBalance,
  MdCheckCircle,
  MdArrowForward,
} from 'react-icons/md'
import paymentIntegrationService from '../../../services/payment-integration.service'
import {
  PaymentGatewayConfig,
  PaymentIntent,
  CreatePaymentIntentPayload,
} from '../../../types/payment-integration.types'
import './UnifiedCheckoutModal.css'

interface UnifiedCheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  initialAmount?: number
  currency?: string
  clientId?: number
  clientName?: string
  clientPhone?: string
  clientEmail?: string
  projectId?: number
  unitId?: number
  savingsAccountId?: number
  milestoneSavingsPoolId?: number
  onPaymentSuccess?: (intent: PaymentIntent) => void
}

export const UnifiedCheckoutModal: React.FC<UnifiedCheckoutModalProps> = ({
  isOpen,
  onClose,
  initialAmount = 2500000,
  currency = 'UGX',
  clientId,
  clientName = 'Zimbani Investor',
  clientPhone = '+256772987654',
  clientEmail = 'investor@fabhomes.ug',
  projectId,
  unitId,
  savingsAccountId,
  milestoneSavingsPoolId,
  onPaymentSuccess,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<'card' | 'mobile_money' | 'bank_transfer'>('card')
  const [amount, setAmount] = useState<number>(initialAmount)
  const [phone, setPhone] = useState<string>(clientPhone)
  const [email, setEmail] = useState<string>(clientEmail)
  const [name, setName] = useState<string>(clientName)

  // Card specific state
  const [cardNumber, setCardNumber] = useState<string>('4242 4242 4242 4242')
  const [cardExpiry, setCardExpiry] = useState<string>('12/28')
  const [cardCvv, setCardCvv] = useState<string>('888')

  // Mobile Money network state
  const [momoProvider, setMomoProvider] = useState<'mtn_momo' | 'airtel_money'>('mtn_momo')

  // Lifecycle states
  const [status, setStatus] = useState<'input' | 'processing_stk' | 'succeeded' | 'failed'>('input')
  const [countdown, setCountdown] = useState<number>(45)
  const [createdIntent, setCreatedIntent] = useState<PaymentIntent | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [gateways, setGateways] = useState<PaymentGatewayConfig[]>([])

  // Load gateway configs for fee rules
  useEffect(() => {
    if (isOpen) {
      paymentIntegrationService.getGateways().then(setGateways).catch(() => {})
      setStatus('input')
      setCountdown(45)
      setErrorMessage(null)
      setCreatedIntent(null)
    }
  }, [isOpen])

  // Countdown timer for STK prompt
  useEffect(() => {
    let timer: any = null
    if (status === 'processing_stk' && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    } else if (countdown === 0 && status === 'processing_stk') {
      // Auto-simulate user authorization when countdown reaches 0
      handleConfirmCurrentIntent()
    }
    return () => clearTimeout(timer)
  }, [status, countdown])

  if (!isOpen) return null

  // Calculate dynamic fees
  const getSelectedGatewayName = () => {
    if (selectedChannel === 'card') return 'flutterwave'
    if (selectedChannel === 'mobile_money') return momoProvider
    return 'bank_transfer'
  }

  const activeGwConfig = gateways.find((g) => g.name === getSelectedGatewayName())
  const feeRate = activeGwConfig ? Number(activeGwConfig.transaction_fee_percentage) : (selectedChannel === 'card' ? 2.5 : selectedChannel === 'mobile_money' ? 1.5 : 0)
  const convenienceFee = Math.round((amount * feeRate) / 100)
  const totalAmount = amount + convenienceFee

  const formatUGX = (val: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: currency || 'UGX',
      maximumFractionDigits: 0,
    }).format(val)
  }

  // Handle Initiation
  const handleInitiatePayment = async () => {
    try {
      setStatus('processing_stk')
      setErrorMessage(null)

      const payload: CreatePaymentIntentPayload = {
        amount,
        currency,
        gateway_name: getSelectedGatewayName(),
        payment_method: selectedChannel,
        client_id: clientId,
        client_name: name,
        client_phone: phone,
        client_email: email,
        project_id: projectId,
        unit_id: unitId,
        savings_account_id: savingsAccountId,
        milestone_savings_pool_id: milestoneSavingsPoolId,
      }

      const intent = await paymentIntegrationService.createPaymentIntent(payload)
      setCreatedIntent(intent)

      if (selectedChannel === 'card' || selectedChannel === 'bank_transfer') {
        // Fast-path confirm simulation for demo
        setTimeout(async () => {
          await handleConfirmCurrentIntent(intent.id)
        }, 1800)
      }
    } catch (err: any) {
      setStatus('failed')
      setErrorMessage(err.response?.data?.message || err.message || 'Payment initialization failed')
    }
  }

  // Handle Confirmation
  const handleConfirmCurrentIntent = async (intentIdOverride?: number | string) => {
    const id = intentIdOverride || createdIntent?.id
    if (!id) return

    try {
      const confirmed = await paymentIntegrationService.confirmPaymentIntent(id, {
        channel: selectedChannel,
        confirmed_at: new Date().toISOString(),
      })
      setCreatedIntent(confirmed)
      setStatus('succeeded')
      if (onPaymentSuccess) {
        onPaymentSuccess(confirmed)
      }
    } catch (err: any) {
      setStatus('failed')
      setErrorMessage(err.response?.data?.message || err.message || 'Payment confirmation failed')
    }
  }

  return (
    <div className="ucm-overlay" onClick={onClose}>
      <div className="ucm-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ucm-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h3 className="ucm-title">
              <MdLock size={20} color="#38bdf8" /> ZIMBANI Unified Checkout
            </h3>
            <span className="ucm-security-badge">
              <MdLock size={12} /> 256-Bit Bank Grade SSL Encrypted
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '20px',
            }}
          >
            <MdClose />
          </button>
        </div>

        {/* Amount Banner */}
        <div className="ucm-amount-banner">
          <div>
            <div className="ucm-amount-label">Total Payable</div>
            <div className="ucm-amount-val">{formatUGX(totalAmount)}</div>
          </div>
          <div className="ucm-fee-note">
            Includes {feeRate}% processing fee ({formatUGX(convenienceFee)})<br />
            Base Amount: {formatUGX(amount)}
          </div>
        </div>

        {/* Status: Succeeded View */}
        {status === 'succeeded' && createdIntent ? (
          <div className="ucm-success-view">
            <div className="ucm-success-icon">
              <MdCheckCircle />
            </div>

            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '20px', color: '#0f172a' }}>
                Payment Succeeded & Verified!
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                Funds have been cleared and credited to the construction/land savings ledger.
              </p>
            </div>

            <div className="ucm-receipt-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Intent Reference:</span>
                <strong style={{ fontFamily: 'monospace', color: '#0284c7' }}>
                  {createdIntent.intent_reference}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Amount Settled:</span>
                <strong style={{ color: '#059669' }}>{formatUGX(createdIntent.amount)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Gateway Channel:</span>
                <strong style={{ textTransform: 'uppercase' }}>{createdIntent.gateway_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Payer:</span>
                <span>{name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Settlement Date:</span>
                <span>{new Date().toLocaleString()}</span>
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={onClose}
              style={{ width: '100%', maxWidth: '300px', padding: '12px', fontWeight: 700 }}
            >
              Done / Return to Platform
            </button>
          </div>
        ) : status === 'processing_stk' ? (
          /* Status: Processing / Waiting for STK PIN */
          <div className="ucm-body">
            <div className="ucm-stk-screen">
              <MdPhoneAndroid size={48} color="#38bdf8" />
              <h4 style={{ margin: 0, fontSize: '16px' }}>
                {selectedChannel === 'mobile_money'
                  ? 'Awaiting Mobile Money PIN Prompt'
                  : 'Processing Bank & 3D-Secure Clearance'}
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', maxWidth: '400px' }}>
                {selectedChannel === 'mobile_money'
                  ? `Please check your phone (${phone}). Enter your 5-digit MoMo PIN to authorize ${formatUGX(totalAmount)} to FAB HOMES.`
                  : 'Contacting issuing bank network for card 3D-Secure 2.0 authorization...'}
              </p>

              {selectedChannel === 'mobile_money' && (
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Timeout Countdown</div>
                  <div className="ucm-countdown">{countdown}s</div>
                </div>
              )}

              <button
                className="btn-primary"
                onClick={() => handleConfirmCurrentIntent()}
                style={{ background: '#059669', borderColor: '#059669', marginTop: '10px' }}
              >
                Simulate Immediate Authorization
              </button>
            </div>
          </div>
        ) : (
          /* Status: Input View */
          <>
            {/* Channel Tabs */}
            <div className="ucm-channel-selector">
              <button
                type="button"
                className={`ucm-channel-tab ${selectedChannel === 'card' ? 'active' : ''}`}
                onClick={() => setSelectedChannel('card')}
              >
                <MdCreditCard size={20} />
                <span>Card (Visa/MC)</span>
              </button>

              <button
                type="button"
                className={`ucm-channel-tab ${selectedChannel === 'mobile_money' ? 'active' : ''}`}
                onClick={() => setSelectedChannel('mobile_money')}
              >
                <MdPhoneAndroid size={20} />
                <span>Mobile Money</span>
              </button>

              <button
                type="button"
                className={`ucm-channel-tab ${selectedChannel === 'bank_transfer' ? 'active' : ''}`}
                onClick={() => setSelectedChannel('bank_transfer')}
              >
                <MdAccountBalance size={20} />
                <span>Bank Transfer</span>
              </button>
            </div>

            <div className="ucm-body">
              {errorMessage && (
                <div style={{ padding: '10px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '13px' }}>
                  {errorMessage}
                </div>
              )}

              {/* Amount Customization */}
              <div className="ucm-form-group">
                <label className="ucm-label">Payment Amount ({currency})</label>
                <input
                  type="number"
                  className="ucm-input"
                  min={1000}
                  step={10000}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(1000, parseFloat(e.target.value) || 0))}
                />
              </div>

              {/* CARD CHANNEL */}
              {selectedChannel === 'card' && (
                <>
                  <div className="ucm-form-group">
                    <label className="ucm-label">Cardholder Name</label>
                    <input
                      type="text"
                      className="ucm-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="ucm-form-group">
                    <label className="ucm-label">Receipt Email Address</label>
                    <input
                      type="email"
                      className="ucm-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="client@fabhomes.ug"
                    />
                  </div>

                  <div className="ucm-form-group">
                    <label className="ucm-label">Card Number (Visa / Mastercard)</label>
                    <input
                      type="text"
                      className="ucm-input"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4242 4242 4242 4242"
                    />
                  </div>

                  <div className="ucm-input-row">
                    <div className="ucm-form-group">
                      <label className="ucm-label">Expires</label>
                      <input
                        type="text"
                        className="ucm-input"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                      />
                    </div>
                    <div className="ucm-form-group">
                      <label className="ucm-label">CVV / CVC</label>
                      <input
                        type="password"
                        maxLength={4}
                        className="ucm-input"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="888"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* MOBILE MONEY CHANNEL */}
              {selectedChannel === 'mobile_money' && (
                <>
                  <div className="ucm-form-group">
                    <label className="ucm-label">Telco Network</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: '8px',
                          border: `2px solid ${momoProvider === 'mtn_momo' ? '#eab308' : '#e2e8f0'}`,
                          background: momoProvider === 'mtn_momo' ? '#fefce8' : '#ffffff',
                          fontWeight: 700,
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                        onClick={() => setMomoProvider('mtn_momo')}
                      >
                        <MdPhoneAndroid size={16} color="#ca8a04" /> MTN Mobile Money
                      </button>
                      <button
                        type="button"
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: '8px',
                          border: `2px solid ${momoProvider === 'airtel_money' ? '#dc2626' : '#e2e8f0'}`,
                          background: momoProvider === 'airtel_money' ? '#fef2f2' : '#ffffff',
                          fontWeight: 700,
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                        onClick={() => setMomoProvider('airtel_money')}
                      >
                        <MdPhoneAndroid size={16} color="#dc2626" /> Airtel Money
                      </button>
                    </div>
                  </div>

                  <div className="ucm-form-group">
                    <label className="ucm-label">Uganda Mobile Number (+256)</label>
                    <input
                      type="tel"
                      className="ucm-input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+256 772 123456"
                    />
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      An STK PIN prompt will be sent directly to this phone number.
                    </span>
                  </div>
                </>
              )}

              {/* BANK TRANSFER CHANNEL */}
              {selectedChannel === 'bank_transfer' && (
                <div className="ucm-bank-details">
                  <div className="ucm-bank-row">
                    <span className="ucm-bank-label">Bank Name:</span>
                    <span className="ucm-bank-val">Stanbic Bank Uganda Ltd</span>
                  </div>
                  <div className="ucm-bank-row">
                    <span className="ucm-bank-label">Account Name:</span>
                    <span className="ucm-bank-val">FAB HOMES UGANDA LTD</span>
                  </div>
                  <div className="ucm-bank-row">
                    <span className="ucm-bank-label">Account Number (UGX):</span>
                    <span className="ucm-bank-val">9030018274619</span>
                  </div>
                  <div className="ucm-bank-row">
                    <span className="ucm-bank-label">Branch / SWIFT:</span>
                    <span className="ucm-bank-val">Forest Mall / SBICUGKX</span>
                  </div>
                  <div className="ucm-bank-row" style={{ borderTop: '1px solid #cbd5e1', paddingTop: '6px' }}>
                    <span className="ucm-bank-label">Payment Narration:</span>
                    <span className="ucm-bank-val" style={{ color: '#0284c7' }}>
                      REF-FAB-{Math.floor(100000 + Math.random() * 900000)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="ucm-footer">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleInitiatePayment}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', fontWeight: 700 }}
              >
                Pay {formatUGX(totalAmount)} <MdArrowForward />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default UnifiedCheckoutModal
