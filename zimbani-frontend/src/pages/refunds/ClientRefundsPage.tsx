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
  MdShare,
  MdClose,
  MdVerified,
  MdHourglassTop,
  MdAttachMoney,
  MdReceiptLong,
} from 'react-icons/md'
import refundService, { PaymentRefund } from '../../services/refund.service'
import clientService from '../../services/client.service'
import paymentService from '../../services/payment.service'
import { Client } from '../../types/client.types'
import { Payment } from '../../types/payment.types'
import { useAuth } from '../../contexts/AuthContext'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { formatAmountInWords } from '../../utils/numberToWords'
import './ClientRefundsPage.css'

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
  const [showVoucherModal, setShowVoucherModal] = useState(false)

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
    if (!selectedRefund) {
      showNotice('Please select a refund record first.', 'error')
      return
    }
    setShowVoucherModal(true)
  }

  const handleWhatsAppShare = () => {
    if (!selectedRefund) return
    const clientName = (selectedRefund.client as any)?.name || (selectedRefund.client as any)?.full_name || selectedClient?.full_name || 'Client'
    const text =
      `*FAB HOMES UGANDA - REFUND DISBURSEMENT VOUCHER*\n\n` +
      `*Voucher No:* ${selectedRefund.refund_number}\n` +
      `*Client:* ${clientName}\n` +
      `*Gross Amount Requested:* UGX ${Number(selectedRefund.amount).toLocaleString()}\n` +
      `*Administrative Deduction (${selectedRefund.deduction_percentage || 10}%):* UGX ${Number(selectedRefund.deduction_amount || 0).toLocaleString()}\n` +
      `*Net Payable Disbursement:* UGX ${(Number(selectedRefund.amount) - Number(selectedRefund.deduction_amount || 0)).toLocaleString()}\n` +
      `*Status:* ${(selectedRefund.status || '').toUpperCase()}\n` +
      `*Date:* ${selectedRefund.notice_date || new Date().toISOString().split('T')[0]}\n\n` +
      `Official verification completed by Fab Homes Uganda Finance Department.`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const formatUGX = (val: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(val || 0)
  }

  const selectedClient = clients.find(c => c.id === Number(selectedClientId))

  const pendingRefunds = refunds.filter(r => r.status === 'requested')
  const approvedRefunds = refunds.filter(r => r.status === 'approved')
  const completedRefunds = refunds.filter(r => r.status === 'completed')
  const rejectedRefunds = refunds.filter(r => r.status === 'rejected')

  const totalRequestedAmount = refunds.reduce((sum, r) => sum + Number(r.amount || 0), 0)
  const pendingAmount = pendingRefunds.reduce((sum, r) => sum + Number(r.amount || 0), 0)
  const approvedNetDisbursement = approvedRefunds.reduce((sum, r) => sum + (Number(r.amount || 0) - Number(r.deduction_amount || 0)), 0)

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

      {/* KPI Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: '#f0fdfa',
            color: '#0d9488',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
          }}>
            <MdReceiptLong />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Total Refund Log</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{refunds.length} Requests</div>
            <div style={{ fontSize: '12px', color: '#0d9488', fontWeight: '600' }}>UGX {totalRequestedAmount.toLocaleString()}</div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '16px 20px',
          border: '1px solid #fed7aa',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: '#fff7ed',
            color: '#ea580c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
          }}>
            <MdHourglassTop />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#9a3412', fontWeight: '600', textTransform: 'uppercase' }}>Draft / Pending Review</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#ea580c', marginTop: '2px' }}>{pendingRefunds.length} Pending</div>
            <div style={{ fontSize: '12px', color: '#9a3412', fontWeight: '600' }}>UGX {pendingAmount.toLocaleString()}</div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '16px 20px',
          border: '1px solid #bbf7d0',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: '#f0fdf4',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
          }}>
            <MdCheckCircle />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#166534', fontWeight: '600', textTransform: 'uppercase' }}>Approved for Payout</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#16a34a', marginTop: '2px' }}>{approvedRefunds.length} Approved</div>
            <div style={{ fontSize: '12px', color: '#166534', fontWeight: '600' }}>UGX {approvedNetDisbursement.toLocaleString()} Net</div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: '#f8fafc',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
          }}>
            <MdAttachMoney />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Completed Payouts</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{completedRefunds.length} Completed</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Settled via CashBook</div>
          </div>
        </div>
      </div>

      {/* Draft Section & Status Navigation Filter Chips */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => setStatusFilter('')}
          style={{
            padding: '7px 14px',
            borderRadius: '20px',
            border: `1px solid ${statusFilter === '' ? '#0d9488' : '#cbd5e1'}`,
            background: statusFilter === '' ? '#0d9488' : '#ffffff',
            color: statusFilter === '' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          All Requests ({refunds.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('requested')}
          style={{
            padding: '7px 14px',
            borderRadius: '20px',
            border: `1px solid ${statusFilter === 'requested' ? '#ea580c' : '#cbd5e1'}`,
            background: statusFilter === 'requested' ? '#ea580c' : '#ffffff',
            color: statusFilter === 'requested' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Draft / Pending Review ({pendingRefunds.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('approved')}
          style={{
            padding: '7px 14px',
            borderRadius: '20px',
            border: `1px solid ${statusFilter === 'approved' ? '#16a34a' : '#cbd5e1'}`,
            background: statusFilter === 'approved' ? '#16a34a' : '#ffffff',
            color: statusFilter === 'approved' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Approved for Payout ({approvedRefunds.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('completed')}
          style={{
            padding: '7px 14px',
            borderRadius: '20px',
            border: `1px solid ${statusFilter === 'completed' ? '#0f766e' : '#cbd5e1'}`,
            background: statusFilter === 'completed' ? '#0f766e' : '#ffffff',
            color: statusFilter === 'completed' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Completed ({completedRefunds.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('rejected')}
          style={{
            padding: '7px 14px',
            borderRadius: '20px',
            border: `1px solid ${statusFilter === 'rejected' ? '#dc2626' : '#cbd5e1'}`,
            background: statusFilter === 'rejected' ? '#dc2626' : '#ffffff',
            color: statusFilter === 'rejected' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Rejected ({rejectedRefunds.length})
        </button>
      </div>

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

      {/* Official Printable Refund Disbursement Voucher Modal */}
      {showVoucherModal && selectedRefund && (
        <div
          className="modal-overlay no-print-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '1.5rem',
            overflowY: 'auto',
          }}
        >
          <div
            className="voucher-modal-card"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #cbd5e1',
              overflow: 'hidden',
            }}
          >
            {/* Modal Control Header */}
            <div
              className="modal-header no-print"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#0f172a' }}>
                <MdReceiptLong size={22} color="#0d9488" />
                <span>Official Refund Voucher Preview</span>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem 0.85rem',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  title="Share breakdown on WhatsApp"
                >
                  <MdShare /> Share WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem 0.85rem',
                    backgroundColor: '#0d9488',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <MdPrint /> Print Voucher
                </button>
                <button
                  type="button"
                  onClick={() => setShowVoucherModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.25rem',
                    cursor: 'pointer',
                    color: '#64748b',
                    padding: '0.25rem',
                    display: 'flex',
                  }}
                >
                  <MdClose />
                </button>
              </div>
            </div>

            {/* Printable Voucher Body */}
            <div
              className="voucher-printable-body"
              style={{
                padding: '2.5rem',
                overflowY: 'auto',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              }}
            >
              {/* Corporate Letterhead Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  borderBottom: '3px solid #0d9488',
                  paddingBottom: '1.25rem',
                  marginBottom: '1.5rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        backgroundColor: '#0d9488',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '1.25rem',
                        letterSpacing: '-1px',
                      }}
                    >
                      FH
                    </div>
                    <div>
                      <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
                        FAB HOMES UGANDA LIMITED
                      </h1>
                      <div style={{ fontSize: '0.78rem', color: '#0d9488', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                        Land Development • Housing Schemes • Tuzimbe Collective
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4, marginTop: '0.5rem' }}>
                    Plot 48 Kampala Road • P.O. Box 7123 Kampala, Uganda<br />
                    Tel: +256 700 000 000 / +256 770 000 000 • Email: finance@fabhomes.ug
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      display: 'inline-block',
                      backgroundColor: '#f0fdfa',
                      color: '#0f766e',
                      border: '1px solid #99f6e4',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                      marginBottom: '0.4rem',
                    }}
                  >
                    Disbursement Voucher
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    {selectedRefund.refund_number}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Date: {selectedRefund.notice_date || new Date().toISOString().split('T')[0]}
                  </div>
                  <div style={{ marginTop: '0.35rem' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        backgroundColor:
                          selectedRefund.status === 'approved' || selectedRefund.status === 'completed'
                            ? '#dcfce7'
                            : selectedRefund.status === 'rejected'
                            ? '#fee2e2'
                            : '#fef9c3',
                        color:
                          selectedRefund.status === 'approved' || selectedRefund.status === 'completed'
                            ? '#15803d'
                            : selectedRefund.status === 'rejected'
                            ? '#b91c1c'
                            : '#a16207',
                      }}
                    >
                      Status: {selectedRefund.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Client KYC & Scheme Identity Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  fontSize: '0.85rem',
                }}
              >
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Client Name</span>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                    {(selectedRefund.client as any)?.name || (selectedRefund.client as any)?.full_name || selectedClient?.full_name || 'Client'}
                  </div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Client Number</span>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>
                    {selectedRefund.client?.client_number || selectedClient?.client_number || 'N/A'}
                  </div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Scheme & Phase</span>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>
                    {selectedRefund.scheme_name || 'Mukono Greenfield'} ({selectedRefund.phase_name || 'Phase 1'})
                  </div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Contact Phone</span>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>
                    {selectedRefund.client?.phone || selectedClient?.phone_primary || (selectedClient as any)?.phone || '-'}
                  </div>
                </div>
              </div>

              {/* Itemized Financial Computation Ledger */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Audited Financial Breakdown
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 700 }}>Description</th>
                      <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Percentage / Basis</th>
                      <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Amount (UGX)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>Gross Accumulated Savings / Deposit</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>Account Ledger</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                        {formatUGX(amountPaid)}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>Gross Refund Amount Requested</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>Claimed Principle</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                        {formatUGX(Number(selectedRefund.amount))}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#dc2626' }}>
                      <td style={{ padding: '10px 12px' }}>
                        Less: Administrative Processing & Termination Penalty
                        <div style={{ fontSize: '0.75rem', color: '#991b1b' }}>Deducted in accordance with Fab Homes Uganda Land Regulations</div>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {selectedRefund.deduction_percentage || 10}%
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                        ({formatUGX(Number(selectedRefund.deduction_amount))})
                      </td>
                    </tr>
                    <tr style={{ backgroundColor: '#f0fdf4', borderTop: '2px solid #86efac', borderBottom: '2px solid #86efac' }}>
                      <td style={{ padding: '12px 12px', fontWeight: 800, color: '#14532d', fontSize: '1rem' }}>
                        NET PAYABLE DISBURSEMENT
                      </td>
                      <td style={{ padding: '12px 12px', textAlign: 'right', color: '#166534', fontWeight: 600 }}>
                        Payable to Client
                      </td>
                      <td style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 800, color: '#15803d', fontSize: '1.15rem' }}>
                        {formatUGX(Number(selectedRefund.amount) - Number(selectedRefund.deduction_amount))}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '10px 12px', color: '#64748b', fontStyle: 'italic' }}>
                        Residual Balance Retained in Account
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>Post-Disbursement</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b', fontWeight: 600 }}>
                        {formatUGX(Number(selectedRefund.balance_after_refund || 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Amount In Words Strip */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '0.75rem 1rem',
                  marginBottom: '1.5rem',
                  fontSize: '0.85rem',
                }}
              >
                <span style={{ fontWeight: 700, color: '#0f172a', marginRight: '0.5rem' }}>Amount in Words:</span>
                <span style={{ fontWeight: 600, color: '#0d9488', fontStyle: 'italic' }}>
                  {formatAmountInWords(Number(selectedRefund.amount) - Number(selectedRefund.deduction_amount), 'UGX')}
                </span>
              </div>

              {/* Disbursement Particulars */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  marginBottom: '1.75rem',
                  fontSize: '0.85rem',
                }}
              >
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem 1rem' }}>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Disbursement Method</span>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '0.2rem', textTransform: 'capitalize' }}>
                    {selectedRefund.payment_method?.replace('_', ' ') || 'Bank Transfer'}
                  </div>
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem 1rem' }}>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Reason / Purpose of Refund</span>
                  <div style={{ fontWeight: 600, color: '#334155', marginTop: '0.2rem' }}>
                    {selectedRefund.withdrawal_reason || selectedRefund.reason_description || 'Voluntary client withdrawal from savings scheme'}
                  </div>
                </div>
              </div>

              {/* Triple Certification & Sign-off Signatures Strip */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1.25rem',
                  borderTop: '1px dashed #cbd5e1',
                  paddingTop: '1.5rem',
                  marginBottom: '1.5rem',
                  fontSize: '0.8rem',
                }}
              >
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem', backgroundColor: '#fcfcfc' }}>
                  <div style={{ color: '#64748b', fontWeight: 600, marginBottom: '2.5rem' }}>Prepared By (Accounts Officer):</div>
                  <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '0.25rem', fontWeight: 700, color: '#0f172a' }}>
                    {user?.name || 'Treasury Staff'}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Date: {new Date().toLocaleDateString()}</div>
                </div>

                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem', backgroundColor: '#fcfcfc' }}>
                  <div style={{ color: '#64748b', fontWeight: 600, marginBottom: '2.5rem' }}>Authorized By (CFO / Audit):</div>
                  <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '0.25rem', fontWeight: 700, color: '#0f172a' }}>
                    {selectedRefund.approved_by_user?.name || 'Chief Financial Officer'}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.72rem' }}>
                    Signed: {selectedRefund.approved_at ? new Date(selectedRefund.approved_at).toLocaleDateString() : 'Digitally Certified'}
                  </div>
                </div>

                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem', backgroundColor: '#fcfcfc' }}>
                  <div style={{ color: '#64748b', fontWeight: 600, marginBottom: '2.5rem' }}>Client Recipient Acknowledgment:</div>
                  <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '0.25rem', fontWeight: 700, color: '#0f172a' }}>
                    {(selectedRefund.client as any)?.name || selectedClient?.full_name || 'Client'}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.72rem' }}>NIN / Identification Verified</div>
                </div>
              </div>

              {/* Digital Footer Security Strip */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '2px solid #0d9488',
                  paddingTop: '0.75rem',
                  fontSize: '0.75rem',
                  color: '#64748b',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0d9488', fontWeight: 600 }}>
                  <MdVerified size={16} />
                  <span>Officially Verified & Recorded in Fab Homes General CashBook</span>
                </div>
                <div>
                  Security Audit Stamp: REF-{selectedRefund.id}-{Math.abs(Number(selectedRefund.amount)).toString().slice(0, 4)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClientRefundsPage
