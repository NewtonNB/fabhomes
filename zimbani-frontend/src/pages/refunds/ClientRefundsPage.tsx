import React, { useState, useEffect } from 'react'
import {
  MdMoneyOff,
  MdCalculate,
  MdCheckCircle,
  MdCancel,
  MdPrint,
  MdSearch,
  MdRefresh,
  MdAdd,
} from 'react-icons/md'
import refundService, { PaymentRefund } from '../../services/refund.service'
import clientService from '../../services/client.service'
import paymentService from '../../services/payment.service'
import { Client } from '../../types/client.types'
import { Payment } from '../../types/payment.types'
import { useAuth } from '../../contexts/AuthContext'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'

export const ClientRefundsPage: React.FC = () => {
  const { user } = useAuth()
  const [refunds, setRefunds] = useState<PaymentRefund[]>([])
  const [loading, setLoading] = useState(true); void loading;
  const [selectedRefund, setSelectedRefund] = useState<PaymentRefund | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Form State (New Refund / Selected Refund Details)
  const [clients, setClients] = useState<Client[]>([])
  const [clientPayments, setClientPayments] = useState<Payment[]>([])
  const [selectedClientId, setSelectedClientId] = useState<number | string>('')
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | string>('')
  const [phaseName, setPhaseName] = useState('Phase 1')
  const [schemeName, setSchemeName] = useState('Mukono Greenfield')
  const [amountPaid, setAmountPaid] = useState<number>(0)
  const [refundRequested, setRefundRequested] = useState<number>(0)
  const [noticeDate, setNoticeDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [withdrawalReason, setWithdrawalReason] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [notes, setNotes] = useState('')

  // Deduction Calculator
  const [deductionPercentage, setDeductionPercentage] = useState<number>(10)
  const [deductionAmount, setDeductionAmount] = useState<number>(0)
  const [netPayable, setNetPayable] = useState<number>(0)
  const [balanceAfterRefund, setBalanceAfterRefund] = useState<number>(0)
  const [calculating, setCalculating] = useState(false)
  const [approving, setApproving] = useState(false)
  const [showApproveConfirm, setShowApproveConfirm] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const showNotice = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 4000)
  }

  const fetchRefunds = async () => {
    try {
      setLoading(true)
      const res = await refundService.getRefunds({
        search: searchTerm || undefined,
        status: statusFilter || undefined,
      })
      const list = res.data || []
      setRefunds(list)
      if (list.length > 0 && !selectedRefund && !isCreating) {
        selectRefundRecord(list[0])
      }
    } catch (err: any) {
      showNotice(err.message || 'Failed to load refunds', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchClients = async () => {
    try {
      const res = await clientService.getClients({ per_page: 100 })
      setClients(res.data || [])
    } catch (err) {
      console.warn('Could not load clients', err)
    }
  }

  useEffect(() => {
    fetchRefunds()
    fetchClients()
  }, [statusFilter])

  const selectRefundRecord = (refund: PaymentRefund) => {
    setIsCreating(false)
    setSelectedRefund(refund)
    setSelectedClientId(refund.client_id)
    setSelectedPaymentId(refund.payment_id || '')
    setPhaseName(refund.phase_name || 'Phase 1')
    setSchemeName(refund.scheme_name || 'Mukono Greenfield')
    setAmountPaid(refund.payment ? Number(refund.payment.amount) : Number(refund.amount))
    setRefundRequested(Number(refund.amount))
    setNoticeDate(refund.notice_date || (refund.created_at ? refund.created_at.split('T')[0] : ''))
    setWithdrawalReason(refund.withdrawal_reason || refund.reason_description || '')
    setPaymentMethod(refund.payment_method || 'bank_transfer')
    setNotes(refund.notes || '')
    setDeductionPercentage(Number(refund.deduction_percentage) || 10)
    setDeductionAmount(Number(refund.deduction_amount) || (Number(refund.amount) * 0.1))
    setNetPayable(Number(refund.amount) - (Number(refund.deduction_amount) || (Number(refund.amount) * 0.1)))
    setBalanceAfterRefund(Number(refund.balance_after_refund) || 0)
  }

  const handleStartNewRequest = () => {
    setIsCreating(true)
    setSelectedRefund(null)
    setSelectedClientId(clients.length > 0 ? clients[0].id : '')
    setSelectedPaymentId('')
    setAmountPaid(5000000)
    setRefundRequested(3000000)
    setNoticeDate(new Date().toISOString().split('T')[0])
    setWithdrawalReason('')
    setDeductionPercentage(10)
    setDeductionAmount(300000)
    setNetPayable(2700000)
    setBalanceAfterRefund(2000000)
    setNotes('')
  }

  const handleClientChange = async (clientId: number | string) => {
    setSelectedClientId(clientId)
    try {
      const paymentsRes = await paymentService.getPayments({ client_id: String(clientId), per_page: 20 })
      const pList = paymentsRes.data || []
      setClientPayments(pList)
      if (pList.length > 0) {
        setSelectedPaymentId(pList[0].id)
        setAmountPaid(Number(pList[0].amount))
        setRefundRequested(Math.min(Number(pList[0].amount), 2000000))
      }
    } catch (err) {
      console.warn('Could not load client payments', err)
    }
  }

  const handleCalculateDeduction = async () => {
    try {
      setCalculating(true)
      const res = await refundService.calculateDeduction({
        amount_paid: amountPaid,
        requested_amount: refundRequested,
        deduction_percentage: deductionPercentage,
      })
      setDeductionAmount(res.deduction_amount)
      setNetPayable(res.net_payable_to_client)
      setBalanceAfterRefund(res.balance_after_refund)
      showNotice('Deduction & Net Refund calculated successfully.')
    } catch (err: any) {
      // Fallback local calc
      const ded = (refundRequested * deductionPercentage) / 100
      setDeductionAmount(ded)
      setNetPayable(refundRequested - ded)
      setBalanceAfterRefund(Math.max(0, amountPaid - refundRequested))
    } finally {
      setCalculating(false)
    }
  }

  const handleSubmitRefund = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPaymentId && clientPayments.length > 0) {
      setSelectedPaymentId(clientPayments[0].id)
    }

    try {
      setApproving(true)
      const payload = {
        payment_id: Number(selectedPaymentId) || (clientPayments[0] ? Number(clientPayments[0].id) : 1),
        client_id: Number(selectedClientId) || (clients[0]?.id || 1),
        amount: refundRequested,
        currency: 'UGX',
        phase_name: phaseName,
        scheme_name: schemeName,
        notice_date: noticeDate,
        deduction_percentage: deductionPercentage,
        deduction_amount: deductionAmount,
        balance_after_refund: balanceAfterRefund,
        withdrawal_reason: withdrawalReason || 'Client savings withdrawal request',
        payment_method: paymentMethod,
        notes: notes,
      }

      const res = await refundService.requestRefund(payload)
      showNotice('Client refund request submitted successfully!')
      fetchRefunds()
      if (res.data) {
        selectRefundRecord(res.data)
      }
    } catch (err: any) {
      showNotice(err.message || 'Failed to submit refund request', 'error')
    } finally {
      setApproving(false)
    }
  }

  const handleApprove = () => {
    if (!selectedRefund) return
    setShowApproveConfirm(true)
  }

  const executeApprove = async () => {
    if (!selectedRefund) return
    try {
      setApproving(true)
      await refundService.approveRefund(selectedRefund.id, true)
      showNotice(`Refund ${selectedRefund.refund_number} approved and payment voucher posted!`)
      setShowApproveConfirm(false)
      fetchRefunds()
    } catch (err: any) {
      showNotice(err.message || 'Approval failed', 'error')
    } finally {
      setApproving(false)
    }
  }

  const handleReject = () => {
    if (!selectedRefund) return
    setShowRejectModal(true)
  }

  const executeReject = async () => {
    if (!selectedRefund || !rejectReason.trim()) return
    try {
      setApproving(true)
      await refundService.rejectRefund(selectedRefund.id, rejectReason.trim())
      showNotice(`Refund ${selectedRefund.refund_number} rejected.`)
      setShowRejectModal(false)
      setRejectReason('')
      fetchRefunds()
    } catch (err: any) {
      showNotice(err.message || 'Rejection failed', 'error')
    } finally {
      setApproving(false)
    }
  }

  const handlePrintVoucher = () => {
    window.print()
  }

  const formatUGX = (val: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(val || 0)
  }

  const selectedClient = clients.find(c => c.id === Number(selectedClientId))

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '26px', color: '#0d9488' }}><MdMoneyOff /></span>
            <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              Client Refunds & Savings Withdrawal Desk
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px', margin: 0 }}>
            Process refund requests, calculate policy deduction penalties, and authorize disbursements
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleStartNewRequest}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              backgroundColor: '#0d9488',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            <MdAdd /> New Refund Request
          </button>
          <button
            onClick={fetchRefunds}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            <MdRefresh /> Refresh
          </button>
        </div>
      </div>

      {notification && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '8px',
          marginBottom: '20px',
          backgroundColor: notification.type === 'success' ? '#ecfdf5' : '#fef2f2',
          color: notification.type === 'success' ? '#065f46' : '#991b1b',
          border: `1px solid ${notification.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          fontSize: '14px',
          fontWeight: '500',
        }}>
          {notification.msg}
        </div>
      )}

      {/* Main Two-Column Panel (Page 10 Reference Layout) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.1fr 0.9fr',
        gap: '24px',
        marginBottom: '32px',
      }}>
        {/* Left Column: Refund Details */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          padding: '24px',
        }}>
          <div style={{ borderBottom: '2px solid #0d9488', paddingBottom: '12px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              Refund Details
            </h2>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
              {selectedRefund ? `Ref: ${selectedRefund.refund_number}` : 'Draft Application'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                Client Name & ID
              </label>
              {isCreating ? (
                <select
                  value={selectedClientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.full_name || `${c.first_name} ${c.last_name}`} ({c.client_number || `CL-${c.id}`})
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                  {(selectedRefund?.client as any)?.name || (selectedRefund?.client as any)?.full_name || selectedClient?.full_name || 'Selected Client'}
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                Phone Number
              </label>
              <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#475569' }}>
                {(selectedRefund?.client as any)?.phone || (selectedRefund?.client as any)?.phone_primary || selectedClient?.phone_primary || '+256 701 234 567'}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                Phase
              </label>
              <select
                value={phaseName}
                disabled={!isCreating}
                onChange={(e) => setPhaseName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: isCreating ? '#fff' : '#f8fafc' }}
              >
                <option value="Phase 1">Phase 1</option>
                <option value="Phase 2">Phase 2</option>
                <option value="Phase 3">Phase 3</option>
                <option value="Phase 4">Phase 4</option>
                <option value="Jinja">Jinja</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                Scheme
              </label>
              <select
                value={schemeName}
                disabled={!isCreating}
                onChange={(e) => setSchemeName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: isCreating ? '#fff' : '#f8fafc' }}
              >
                <option value="Mukono Greenfield">Mukono Greenfield</option>
                <option value="Royal Palms Kajjansi">Royal Palms Kajjansi</option>
                <option value="Nile Vista Estate Jinja">Nile Vista Estate Jinja</option>
                <option value="Busega Commercial">Busega Commercial</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                Total Amount Paid (UGX)
              </label>
              <input
                type="number"
                value={amountPaid}
                disabled={!isCreating}
                onChange={(e) => setAmountPaid(Number(e.target.value))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600', backgroundColor: isCreating ? '#fff' : '#f8fafc' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                Refund Requested (UGX)
              </label>
              <input
                type="number"
                value={refundRequested}
                disabled={!isCreating}
                onChange={(e) => setRefundRequested(Number(e.target.value))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #0d9488', fontSize: '13px', fontWeight: '700', color: '#0f766e', backgroundColor: isCreating ? '#fff' : '#f8fafc' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                Notice Date
              </label>
              <input
                type="date"
                value={noticeDate}
                disabled={!isCreating}
                onChange={(e) => setNoticeDate(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: isCreating ? '#fff' : '#f8fafc' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                Payment Method
              </label>
              <select
                value={paymentMethod}
                disabled={!isCreating}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: isCreating ? '#fff' : '#f8fafc' }}
              >
                <option value="bank_transfer">Bank Transfer (Centenary / Stanbic)</option>
                <option value="mobile_money">MTN / Airtel Mobile Money</option>
                <option value="cash">Petty Cash Voucher</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
              Withdrawal Reason
            </label>
            <textarea
              rows={3}
              value={withdrawalReason}
              disabled={!isCreating}
              onChange={(e) => setWithdrawalReason(e.target.value)}
              placeholder="Reason stated by client for withdrawing savings..."
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: isCreating ? '#fff' : '#f8fafc' }}
            />
          </div>

          {isCreating && (
            <div style={{ marginTop: '18px', textAlign: 'right' }}>
              <button
                type="button"
                onClick={handleSubmitRefund}
                disabled={approving}
                style={{
                  padding: '10px 22px',
                  backgroundColor: '#0d9488',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: approving ? 'not-allowed' : 'pointer',
                }}
              >
                {approving ? 'Submitting...' : 'Submit Refund Request'}
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Approval Details & Deduction Calculator */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ borderBottom: '2px solid #0d9488', paddingBottom: '12px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                Approval Details
              </h2>
              <span style={{
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '700',
                textTransform: 'uppercase',
                backgroundColor: selectedRefund?.status === 'approved' || selectedRefund?.status === 'completed' ? '#dcfce7' : selectedRefund?.status === 'rejected' ? '#fee2e2' : '#fef9c3',
                color: selectedRefund?.status === 'approved' || selectedRefund?.status === 'completed' ? '#15803d' : selectedRefund?.status === 'rejected' ? '#b91c1c' : '#a16207',
              }}>
                {selectedRefund?.status || 'Pending Review'}
              </span>
            </div>

            {/* Deduction % Calculator */}
            <div style={{ backgroundColor: '#f0fdfa', border: '1px solid #ccfbf1', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f766e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MdCalculate /> Policy Deduction Calculation
                </span>
                <button
                  type="button"
                  onClick={handleCalculateDeduction}
                  disabled={calculating}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: '#0d9488',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  Calc
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#134e4a', marginBottom: '2px' }}>
                    Deduction Rate (%)
                  </label>
                  <input
                    type="number"
                    value={deductionPercentage}
                    onChange={(e) => setDeductionPercentage(Number(e.target.value))}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #99f6e4', fontSize: '13px', fontWeight: '700' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#134e4a', marginBottom: '2px' }}>
                    Deduction Amount
                  </label>
                  <div style={{ padding: '6px 10px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #99f6e4', fontSize: '13px', fontWeight: '700', color: '#dc2626' }}>
                    {formatUGX(deductionAmount)}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#134e4a', marginBottom: '2px' }}>
                    Net Refund Payable
                  </label>
                  <div style={{ padding: '6px 10px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #99f6e4', fontSize: '14px', fontWeight: '800', color: '#0f766e' }}>
                    {formatUGX(netPayable)}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#134e4a', marginBottom: '2px' }}>
                    Bal After Refund
                  </label>
                  <div style={{ padding: '6px 10px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #99f6e4', fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                    {formatUGX(balanceAfterRefund)}
                  </div>
                </div>
              </div>
            </div>

            {/* Approval Metadata */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Approval Date:</span>
                <span style={{ fontWeight: '600', color: '#1e293b' }}>
                  {selectedRefund?.approved_at ? new Date(selectedRefund.approved_at).toLocaleDateString() : 'Awaiting Sign-off'}
                </span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Approver Name:</span>
                <span style={{ fontWeight: '600', color: '#1e293b' }}>
                  {selectedRefund?.approved_by_user?.name || (user?.name || 'Authorized Finance Officer')}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginTop: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                Management Notes / Audit Remarks
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Disbursement authorization note..."
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handlePrintVoucher}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                color: '#334155',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontSize: '13px',
              }}
            >
              <MdPrint /> Print Voucher
            </button>

            {selectedRefund?.status === 'requested' && (
              <>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={approving}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #fecaca',
                    backgroundColor: '#fef2f2',
                    color: '#b91c1c',
                    fontWeight: '600',
                    cursor: approving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '13px',
                  }}
                >
                  <MdCancel /> Reject
                </button>

                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={approving}
                  style={{
                    flex: 1.2,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    fontWeight: '600',
                    cursor: approving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '13px',
                  }}
                >
                  <MdCheckCircle /> {approving ? 'Approving...' : 'Approve & Post'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Refunds History Table */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
            Client Refund Requests & Audit Trail
          </h3>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search refund no, client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchRefunds()}
                style={{ padding: '8px 12px 8px 32px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', width: '220px' }}
              />
              <span style={{ position: 'absolute', left: '10px', top: '9px', color: '#94a3b8' }}><MdSearch /></span>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
            >
              <option value="">All Statuses</option>
              <option value="requested">Pending</option>
              <option value="approved">Approved</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '600' }}>
              <th style={{ padding: '12px 16px' }}>Request ID</th>
              <th style={{ padding: '12px 16px' }}>Client</th>
              <th style={{ padding: '12px 16px' }}>Scheme / Phase</th>
              <th style={{ padding: '12px 16px' }}>Requested</th>
              <th style={{ padding: '12px 16px' }}>Deduction</th>
              <th style={{ padding: '12px 16px' }}>Net Payable</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {refunds.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                  No refund records found. Click "New Refund Request" to initiate a client withdrawal.
                </td>
              </tr>
            ) : (
              refunds.map((refund) => {
                const isSelected = selectedRefund?.id === refund.id
                return (
                  <tr
                    key={refund.id}
                    onClick={() => selectRefundRecord(refund)}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#f0fdfa' : '#ffffff',
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: '700', color: '#0f766e' }}>
                      {refund.refund_number}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{refund.client?.name || 'Client'}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{refund.client?.phone || '-'}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>
                      {refund.scheme_name || 'Mukono'} <span style={{ fontSize: '11px', color: '#94a3b8' }}>({refund.phase_name || 'P1'})</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: '600' }}>
                      {formatUGX(Number(refund.amount))}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#dc2626' }}>
                      {formatUGX(Number(refund.deduction_amount))} ({refund.deduction_percentage}%)
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: '700', color: '#047857' }}>
                      {formatUGX(Number(refund.amount) - Number(refund.deduction_amount))}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        backgroundColor: refund.status === 'approved' || refund.status === 'completed' ? '#dcfce7' : refund.status === 'rejected' ? '#fee2e2' : '#fef9c3',
                        color: refund.status === 'approved' || refund.status === 'completed' ? '#15803d' : refund.status === 'rejected' ? '#b91c1c' : '#a16207',
                      }}>
                        {refund.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          selectRefundRecord(refund)
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Soft Confirmation for Approval */}
      <ConfirmDialog
        isOpen={showApproveConfirm}
        title="Approve Refund Voucher"
        message={`Are you sure you want to approve refund ${selectedRefund?.refund_number} for client ${selectedRefund?.client?.name}? This will generate a payment voucher and debit escrow ledger.`}
        confirmLabel="Approve Voucher"
        cancelLabel="Cancel"
        variant="primary"
        loading={approving}
        onConfirm={executeApprove}
        onCancel={() => setShowApproveConfirm(false)}
      />

      {/* Soft Reject Modal */}
      {showRejectModal && (
        <div className="confirm-modal-backdrop">
          <div className="confirm-modal-card">
            <div className="confirm-modal-header">
              <div className="confirm-modal-icon-badge warning">
                <MdCancel size={22} color="#dc2626" />
              </div>
              <h3 className="confirm-modal-title">Reject Refund Request</h3>
            </div>
            <p className="confirm-modal-message">
              Please enter the specific reason for rejecting refund request <strong>{selectedRefund?.refund_number}</strong>:
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Terms of cooling-off period lapsed, outstanding infrastructure liabilities..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                marginBottom: '1rem',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="confirm-modal-btn cancel"
                onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
                disabled={approving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="confirm-modal-btn danger"
                onClick={executeReject}
                disabled={approving || !rejectReason.trim()}
              >
                {approving ? 'Rejecting...' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClientRefundsPage
