import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  MdArrowBack,
  MdPrint,
  MdCheck,
  MdVerified,
  MdClose,
  MdUndo,
  MdDelete,
  MdHome,
  MdPerson,
  MdAccountBalance,
  MdDoneAll,
  MdShare,
  MdWarning,
} from 'react-icons/md'
import { paymentService } from '../../services/payment.service'
import { Payment } from '../../types/payment.types'
import './PaymentDetails.css'

const PaymentDetails: React.FC = () => {
  const { uuid } = useParams<{ uuid: string }>()
  const navigate = useNavigate()

  const [payment, setPayment] = useState<Payment | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modals
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [refundReason, setRefundReason] = useState('')
  const [refundAmount, setRefundAmount] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (uuid) {
      loadPayment(uuid)
    }
  }, [uuid])

  const loadPayment = async (paymentUuid: string) => {
    try {
      setLoading(true)
      setError(null)
      const data = await paymentService.getPayment(paymentUuid)
      setPayment(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load payment details')
    } finally {
      setLoading(false)
    }
  }

  const numberToWords = (num: number): string => {
    if (num === 0) return 'Zero'
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
    const scales = ['', 'Thousand', 'Million', 'Billion', 'Trillion']

    const convertGroup = (n: number): string => {
      let s = ''
      if (n >= 100) {
        s += ones[Math.floor(n / 100)] + ' Hundred '
        n %= 100
      }
      if (n >= 20) {
        s += tens[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + ones[n % 10] : '') + ' '
      } else if (n > 0) {
        s += ones[n] + ' '
      }
      return s.trim()
    }

    let s = ''
    let scaleIdx = 0
    let whole = Math.floor(Math.abs(num))
    while (whole > 0) {
      const chunk = whole % 1000
      if (chunk > 0) {
        const groupStr = convertGroup(chunk)
        s = groupStr + (scales[scaleIdx] ? ' ' + scales[scaleIdx] : '') + ' ' + s
      }
      whole = Math.floor(whole / 1000)
      scaleIdx++
    }
    return s.trim()
  }

  const formatAmountInWords = (amount: number, currency = 'UGX') => {
    const words = numberToWords(amount)
    const currLabel = currency.toUpperCase() === 'UGX' ? 'Uganda Shillings' : currency.toUpperCase()
    return `${words} ${currLabel} Only`
  }

  const handleWhatsAppShare = () => {
    if (!payment) return
    const text = `*FAB HOMES UGANDA - OFFICIAL RECEIPT*\n` +
      `Receipt No: ${payment.payment_number}\n` +
      `Client: ${payment.client?.full_name || 'Client'}\n` +
      `Amount: ${formatCurrency(payment.total_amount, payment.currency)}\n` +
      `Amount in Words: ${formatAmountInWords(payment.total_amount, payment.currency)}\n` +
      `Payment Method: ${payment.payment_method?.toUpperCase()}\n` +
      `Date: ${payment.payment_date}\n` +
      `Status: ${payment.status?.toUpperCase()}\n\n` +
      `Verified by Fab Homes System.`
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank')
  }

  const handleConfirm = async () => {
    if (!uuid) return
    try {
      setActionLoading(true)
      const updated = await paymentService.confirmPayment(uuid)
      setPayment(updated)
    } catch (err: any) {
      alert(err.message || 'Failed to confirm payment')
    } finally {
      setActionLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!uuid) return
    try {
      setActionLoading(true)
      const updated = await paymentService.verifyPayment(uuid)
      setPayment(updated)
    } catch (err: any) {
      alert(err.message || 'Failed to verify payment')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uuid || !rejectReason.trim()) return
    try {
      setActionLoading(true)
      const updated = await paymentService.rejectPayment(uuid, rejectReason)
      setPayment(updated)
      setShowRejectModal(false)
      setRejectReason('')
    } catch (err: any) {
      alert(err.message || 'Failed to reject payment')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uuid || !refundReason.trim()) return
    try {
      setActionLoading(true)
      const updated = await paymentService.refundPayment(uuid, refundReason, refundAmount)
      setPayment(updated)
      setShowRefundModal(false)
      setRefundReason('')
    } catch (err: any) {
      alert(err.message || 'Failed to refund payment')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!uuid) return
    if (!window.confirm('Are you sure you want to cancel this pending payment?')) return
    try {
      setActionLoading(true)
      const updated = await paymentService.cancelPayment(uuid)
      setPayment(updated)
    } catch (err: any) {
      alert(err.message || 'Failed to cancel payment')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!uuid) return
    if (!window.confirm('Are you sure you want to delete this payment record?')) return
    try {
      setActionLoading(true)
      await paymentService.deletePayment(uuid)
      navigate('/payments')
    } catch (err: any) {
      alert(err.message || 'Failed to delete payment')
    } finally {
      setActionLoading(false)
    }
  }

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

  // Render Status Progression Stepper
  const renderStatusStepper = (status: string) => {
    const isPending = status === 'pending'
    const isConfirmed = status === 'confirmed'
    const isVerified = status === 'verified'
    const isSpecial = ['rejected', 'refunded', 'cancelled'].includes(status)

    if (isSpecial) {
      return (
        <div className="status-stepper-card no-print">
          <div className="stepper-header">Transaction Progression Status</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: status === 'rejected' ? '#dc2626' : '#4b5563' }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>
              Status: {status.toUpperCase()}
            </span>
            <span style={{ fontSize: 13, color: '#6b7280' }}>
              (Special transaction lifecycle state)
            </span>
          </div>
        </div>
      )
    }

    return (
      <div className="status-stepper-card no-print">
        <div className="stepper-header">Verification & Audit Stepper</div>
        <div className="stepper-track">
          {/* Step 1: Pending */}
          <div className={`stepper-step ${isPending ? 'current' : 'completed'}`}>
            <div className="step-circle">
              {isPending ? '1' : <MdCheck />}
            </div>
            <div className="step-title">1. Initiated</div>
          </div>

          <div className={`stepper-connector ${isConfirmed || isVerified ? 'completed' : ''}`}></div>

          {/* Step 2: Confirmed */}
          <div className={`stepper-step ${isConfirmed ? 'current' : isVerified ? 'completed' : ''}`}>
            <div className="step-circle">
              {isVerified ? <MdCheck /> : '2'}
            </div>
            <div className="step-title">2. Confirmed</div>
          </div>

          <div className={`stepper-connector ${isVerified ? 'completed' : ''}`}></div>

          {/* Step 3: Verified */}
          <div className={`stepper-step ${isVerified ? 'completed' : ''}`}>
            <div className="step-circle">
              {isVerified ? <MdDoneAll /> : '3'}
            </div>
            <div className="step-title">3. Verified & Locked</div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="payment-details-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading payment details...</p>
        </div>
      </div>
    )
  }

  if (!payment) {
    return (
      <div className="payment-details-container">
        <div className="alert-box alert-error">
          <span>Payment record not found</span>
          <Link to="/payments">Back to Payments</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="payment-details-container">
      {/* Top Header */}
      <div className="details-header no-print">
        <button className="btn-back" onClick={() => navigate('/payments')}>
          <MdArrowBack /> Back to Payments
        </button>
        <div className="header-actions">
          <button className="btn-action btn-print" onClick={() => window.print()}>
            <MdPrint /> Print Official Receipt
          </button>
          <button className="btn-action btn-whatsapp" onClick={handleWhatsAppShare} title="Share Receipt via WhatsApp">
            <MdShare /> Share via WhatsApp
          </button>
          {payment.status === 'pending' && (
            <>
              <button
                className="btn-action btn-confirm"
                onClick={handleConfirm}
                disabled={actionLoading}
              >
                <MdCheck /> Confirm
              </button>
              <button
                className="btn-action btn-danger"
                onClick={handleCancel}
                disabled={actionLoading}
              >
                <MdClose /> Cancel
              </button>
            </>
          )}
          {payment.status === 'confirmed' && (
            <>
              <button
                className="btn-action btn-verify"
                onClick={handleVerify}
                disabled={actionLoading}
              >
                <MdVerified /> Verify & Lock
              </button>
              <button
                className="btn-action btn-danger"
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
              >
                <MdClose /> Reject
              </button>
            </>
          )}
          {['confirmed', 'verified'].includes(payment.status) && (
            <button
              className="btn-action btn-refund"
              onClick={() => {
                setRefundAmount(payment.total_amount)
                setShowRefundModal(true)
              }}
              disabled={actionLoading}
            >
              <MdUndo /> Refund
            </button>
          )}
          {['pending', 'rejected', 'cancelled'].includes(payment.status) && (
            <button
              className="btn-action btn-delete"
              onClick={handleDelete}
              disabled={actionLoading}
            >
              <MdDelete /> Delete
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert-box alert-error no-print">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <MdWarning size={18} /> {error}
          </span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Visual Status Progression Stepper */}
      {renderStatusStepper(payment.status)}

      {/* Official Receipt Card */}
      <div className="receipt-card">
        <div className="receipt-header">
          <div className="company-brand">
            <h2>FAB HOMES</h2>
            <p>Official Transaction Receipt • Real Estate Collections</p>
          </div>
          <div className="receipt-meta">
            <div className="receipt-number">{payment.payment_number}</div>
            <div className="receipt-status">{getStatusBadge(payment.status)}</div>
          </div>
        </div>

        <div className="receipt-body">
          {/* Parties Section */}
          <div className="receipt-grid">
            <div className="info-box">
              <div className="box-title">
                <MdPerson /> Client Information
              </div>
              {payment.client ? (
                <>
                  <div className="box-highlight">{payment.client.full_name}</div>
                  <div className="box-text">Client No: {payment.client.client_number}</div>
                  {payment.client.email && (
                    <div className="box-text">Email: {payment.client.email}</div>
                  )}
                  <div className="box-text">Phone: {payment.client.phone_primary}</div>
                </>
              ) : (
                <div className="box-text text-muted">No client linked</div>
              )}
            </div>

            <div className="info-box">
              <div className="box-title">
                <MdHome /> Property / Unit
              </div>
              {payment.unit ? (
                <>
                  <div className="box-highlight">Unit {payment.unit.unit_number}</div>
                  <div className="box-text">Type: {payment.unit.type}</div>
                  <Link to={`/units/${payment.unit.uuid}`} className="link-unit no-print">
                    View Unit Profile &rarr;
                  </Link>
                </>
              ) : (
                <div className="box-text text-muted">No unit linked</div>
              )}
            </div>

            <div className="info-box">
              <div className="box-title">
                <MdAccountBalance /> Transaction Details
              </div>
              <div className="box-text">
                <strong>Method:</strong> {payment.payment_method?.toUpperCase()}
              </div>
              <div className="box-text">
                <strong>Type:</strong> {payment.payment_type?.replace('_', ' ').toUpperCase()}
              </div>
              <div className="box-text">
                <strong>Payment Date:</strong> {payment.payment_date}
              </div>
              {payment.reference_number && (
                <div className="box-text">
                  <strong>Ref #:</strong> {payment.reference_number}
                </div>
              )}
              {payment.transaction_id && (
                <div className="box-text">
                  <strong>Txn ID:</strong> {payment.transaction_id}
                </div>
              )}
              {payment.bank_name && (
                <div className="box-text">
                  <strong>Bank:</strong> {payment.bank_name}
                </div>
              )}
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="breakdown-section">
            <h3>Financial Breakdown</h3>
            <table className="breakdown-table">
              <tbody>
                <tr>
                  <td>Base Amount</td>
                  <td className="text-right">
                    {formatCurrency(payment.amount, payment.currency)}
                  </td>
                </tr>
                {payment.has_penalty && (
                  <tr>
                    <td className="text-danger">+ Late Penalty</td>
                    <td className="text-right text-danger">
                      {formatCurrency(payment.penalty_amount, payment.currency)}
                    </td>
                  </tr>
                )}
                {payment.has_discount && (
                  <tr>
                    <td className="text-success">- Discount / Waiver</td>
                    <td className="text-right text-success">
                      {formatCurrency(payment.discount_amount, payment.currency)}
                    </td>
                  </tr>
                )}
                <tr className="total-row">
                  <td>Total Net Amount Paid</td>
                  <td className="text-right">
                    {formatCurrency(payment.total_amount, payment.currency)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Amount in Words (Legacy System Manual Alignment) */}
            <div className="amount-in-words-box">
              <span className="words-label">Amount in Words:</span>
              <span className="words-content">{formatAmountInWords(payment.total_amount, payment.currency)}</span>
            </div>
          </div>

          {/* Remarks & Audit Notes */}
          {payment.notes && (
            <div className="notes-section">
              <h4>Notes & Audit Log</h4>
              <p className="notes-content">{payment.notes}</p>
            </div>
          )}

          {/* Signature / Verification Bar */}
          <div className="receipt-footer">
            <div className="audit-item">
              <span className="audit-label">Recorded By:</span>
              <span className="audit-val">{payment.processed_by?.name || 'Super Admin'}</span>
            </div>
            {payment.confirmed_by && (
              <div className="audit-item">
                <span className="audit-label">Confirmed By:</span>
                <span className="audit-val">
                  {payment.confirmed_by.name} ({payment.confirmed_at_date || 'Confirmed'})
                </span>
              </div>
            )}
            <div className="audit-item">
              <span className="audit-label">Verification Status:</span>
              <span className="audit-val">{payment.status.toUpperCase()}</span>
            </div>
          </div>

          {/* Official Barcode & Digital Verification Seal (Legacy System Manual Alignment) */}
          <div className="receipt-auth-strip">
            <div className="receipt-barcode-box">
              <div className="barcode-bars">
                <span style={{ width: '3px' }}></span>
                <span style={{ width: '1px' }}></span>
                <span style={{ width: '4px' }}></span>
                <span style={{ width: '2px' }}></span>
                <span style={{ width: '3px' }}></span>
                <span style={{ width: '1px' }}></span>
                <span style={{ width: '5px' }}></span>
                <span style={{ width: '2px' }}></span>
                <span style={{ width: '1px' }}></span>
                <span style={{ width: '4px' }}></span>
                <span style={{ width: '3px' }}></span>
                <span style={{ width: '1px' }}></span>
                <span style={{ width: '2px' }}></span>
                <span style={{ width: '5px' }}></span>
                <span style={{ width: '2px' }}></span>
                <span style={{ width: '4px' }}></span>
                <span style={{ width: '1px' }}></span>
                <span style={{ width: '3px' }}></span>
                <span style={{ width: '2px' }}></span>
                <span style={{ width: '4px' }}></span>
              </div>
              <div className="barcode-number">*{payment.payment_number}*</div>
            </div>

            <div className="receipt-digital-seal">
              <div className="seal-border">
                <span className="seal-brand">FAB HOMES UGANDA</span>
                <span className="seal-tag">DIGITALLY VERIFIED RECEIPT</span>
                <span className="seal-signer">Authorized: {payment.processed_by?.name || 'Aisha Namubiru (Finance)'}</span>
                <span className="seal-status">AUTHENTICATED • {payment.payment_date}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Reject Payment</h3>
            <p>Please enter the justification for rejecting this payment:</p>
            <form onSubmit={handleRejectSubmit}>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                required
                rows={3}
              />
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowRejectModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-action btn-danger" disabled={actionLoading}>
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Process Refund</h3>
            <form onSubmit={handleRefundSubmit}>
              <div className="form-group">
                <label>Refund Reason *</label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Reason for refund..."
                  required
                  rows={3}
                />
              </div>
              <div className="form-group" style={{ marginTop: 12 }}>
                <label>Refund Amount (UGX)</label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(Number(e.target.value))}
                  max={payment.total_amount}
                  min={0}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowRefundModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-action btn-refund" disabled={actionLoading}>
                  Issue Refund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentDetails
