import React, { useState, useEffect, useCallback } from 'react'
import {
  MdAssignmentReturn,
  MdGavel,
  MdCheckCircle,
  MdWarning,
  MdRefresh,
  MdAdd,
  MdClose,
  MdCloudUpload,
  MdThumbUp,
  MdCancel,
  MdInfo,
  MdAttachMoney,
  MdSearch,
} from 'react-icons/md'
import paymentIntegrationService from '../../../services/payment-integration.service'
import {
  PaymentRefund,
  PaymentDispute,
  RefundsDisputesStatistics,
  CreateRefundPayload,
  OpenDisputePayload,
  SubmitEvidencePayload,
  ResolveDisputePayload,
} from '../../../types/payment-integration.types'
import './PaymentRefundsDisputesTab.css'

export const PaymentRefundsDisputesTab: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'refunds' | 'disputes'>('refunds')
  const [refunds, setRefunds] = useState<PaymentRefund[]>([])
  const [disputes, setDisputes] = useState<PaymentDispute[]>([])
  const [stats, setStats] = useState<RefundsDisputesStatistics | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Filters
  const [refundStatusFilter, setRefundStatusFilter] = useState<string>('')
  const [refundSearch, setRefundSearch] = useState<string>('')
  const [disputeStatusFilter, setDisputeStatusFilter] = useState<string>('')
  const [disputeSourceFilter, setDisputeSourceFilter] = useState<string>('')
  const [disputeSearch, setDisputeSearch] = useState<string>('')

  // Modals
  const [showRefundModal, setShowRefundModal] = useState<boolean>(false)
  const [showDisputeModal, setShowDisputeModal] = useState<boolean>(false)
  const [showEvidenceModal, setShowEvidenceModal] = useState<boolean>(false)
  const [showResolveModal, setShowResolveModal] = useState<boolean>(false)
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false)
  const [selectedRefund, setSelectedRefund] = useState<PaymentRefund | null>(null)
  const [selectedDispute, setSelectedDispute] = useState<PaymentDispute | null>(null)

  // Form states
  const [refundForm, setRefundForm] = useState<CreateRefundPayload>({
    payment_id: '',
    amount: 500000,
    currency: 'UGX',
    reason_category: 'duplicate_payment',
    reason_description: '',
    fee_refunded: 0,
  })

  const [disputeForm, setDisputeForm] = useState<OpenDisputePayload>({
    payment_id: '',
    disputed_amount: 1000000,
    currency: 'UGX',
    dispute_source: 'chargeback_visa_mc',
    reason: '',
    evidence_deadline: '',
  })

  const [evidenceForm, setEvidenceForm] = useState<SubmitEvidencePayload>({
    title: 'Signed Milestone Completion Certificate',
    file_path: '/storage/disputes/evidence_doc.pdf',
    file_type: 'application/pdf',
    notes: 'GPS tagged and client signed verification record',
  })

  const [resolveForm, setResolveForm] = useState<ResolveDisputePayload>({
    resolution: 'won',
    resolution_notes: 'Evidence verified by arbitration panel',
    create_refund: false,
  })

  const [rejectionReason, setRejectionReason] = useState<string>('')

  // Load Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [statsRes, refundsRes, disputesRes] = await Promise.all([
        paymentIntegrationService.getRefundsDisputesStatistics().catch(() => null),
        paymentIntegrationService.getRefunds({
          status: refundStatusFilter || undefined,
          search: refundSearch || undefined,
          per_page: 50,
        }),
        paymentIntegrationService.getDisputes({
          status: disputeStatusFilter || undefined,
          dispute_source: disputeSourceFilter || undefined,
          search: disputeSearch || undefined,
          per_page: 50,
        }),
      ])

      if (statsRes) setStats(statsRes)
      setRefunds(refundsRes.data || [])
      setDisputes(disputesRes.data || [])
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to load refunds & disputes data',
      })
    } finally {
      setLoading(false)
    }
  }, [refundStatusFilter, refundSearch, disputeStatusFilter, disputeSourceFilter, disputeSearch])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 6000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  const formatUGX = (val?: number | null) => {
    if (val === undefined || val === null || isNaN(val)) return '0 UGX'
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(val)
  }

  // Action: Request Refund
  const handleRequestRefund = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setActionLoading(true)
      const res = await paymentIntegrationService.requestRefund(refundForm)
      setFeedback({
        type: 'success',
        text: `Refund request ${res.refund_number} successfully registered for finance review!`,
      })
      setShowRefundModal(false)
      setRefundForm({
        payment_id: '',
        amount: 500000,
        currency: 'UGX',
        reason_category: 'duplicate_payment',
        reason_description: '',
        fee_refunded: 0,
      })
      loadData()
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Refund request failed',
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Action: Approve Refund
  const handleApproveRefund = async (id: number | string) => {
    try {
      setActionLoading(true)
      const res = await paymentIntegrationService.approveRefund(id, true)
      setFeedback({
        type: 'success',
        text: `Refund ${res.refund_number} approved and reversing debit transaction executed!`,
      })
      loadData()
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Approval failed',
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Action: Reject Refund
  const handleRejectRefund = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRefund) return
    try {
      setActionLoading(true)
      await paymentIntegrationService.rejectRefund(selectedRefund.id, rejectionReason)
      setFeedback({
        type: 'success',
        text: `Refund ${selectedRefund.refund_number} rejected.`,
      })
      setShowRejectModal(false)
      setSelectedRefund(null)
      setRejectionReason('')
      loadData()
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Rejection failed',
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Action: Open Dispute
  const handleOpenDispute = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setActionLoading(true)
      const res = await paymentIntegrationService.openDispute(disputeForm)
      setFeedback({
        type: 'success',
        text: `Dispute case ${res.dispute_number} opened successfully!`,
      })
      setShowDisputeModal(false)
      setDisputeForm({
        payment_id: '',
        disputed_amount: 1000000,
        currency: 'UGX',
        dispute_source: 'chargeback_visa_mc',
        reason: '',
        evidence_deadline: '',
      })
      loadData()
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Dispute creation failed',
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Action: Submit Evidence
  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDispute) return
    try {
      setActionLoading(true)
      await paymentIntegrationService.submitDisputeEvidence(selectedDispute.id, evidenceForm)
      setFeedback({
        type: 'success',
        text: `Arbitration evidence submitted for dispute ${selectedDispute.dispute_number}!`,
      })
      setShowEvidenceModal(false)
      setSelectedDispute(null)
      loadData()
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to submit evidence',
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Action: Resolve Dispute
  const handleResolveDispute = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDispute) return
    try {
      setActionLoading(true)
      await paymentIntegrationService.resolveDispute(selectedDispute.id, resolveForm)
      setFeedback({
        type: 'success',
        text: `Dispute ${selectedDispute.dispute_number} resolved as ${resolveForm.resolution.toUpperCase()}!`,
      })
      setShowResolveModal(false)
      setSelectedDispute(null)
      loadData()
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Dispute resolution failed',
      })
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="prd-container">
      {/* Toast Feedback */}
      {feedback && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            backgroundColor: feedback.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: feedback.type === 'success' ? '#15803d' : '#b91c1c',
            border: `1px solid ${feedback.type === 'success' ? '#86efac' : '#fca5a5'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <MdClose size={18} />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      {stats && (
        <div className="prd-kpi-grid">
          <div className="prd-kpi-card">
            <div className="prd-kpi-header">
              <span className="prd-kpi-title">Total Refunded Volume</span>
              <span style={{ color: '#0284c7', fontSize: '20px' }}>
                <MdAttachMoney />
              </span>
            </div>
            <div className="prd-kpi-val">{formatUGX(stats.refunds.total_refunded_amount)}</div>
            <div className="prd-kpi-subtext">
              {stats.refunds.total_count} total refund requests recorded
            </div>
          </div>

          <div className="prd-kpi-card">
            <div className="prd-kpi-header">
              <span className="prd-kpi-title">Pending Approvals</span>
              <span style={{ color: '#d97706', fontSize: '20px' }}>
                <MdWarning />
              </span>
            </div>
            <div className="prd-kpi-val" style={{ color: stats.refunds.pending_approval_count > 0 ? '#d97706' : '#0f172a' }}>
              {stats.refunds.pending_approval_count}
            </div>
            <div className="prd-kpi-subtext">Requires Finance Officer authorization</div>
          </div>

          <div className="prd-kpi-card">
            <div className="prd-kpi-header">
              <span className="prd-kpi-title">Active Disputes</span>
              <span style={{ color: '#dc2626', fontSize: '20px' }}>
                <MdGavel />
              </span>
            </div>
            <div className="prd-kpi-val">{stats.disputes.active_open_count}</div>
            <div className="prd-kpi-subtext">
              {formatUGX(stats.disputes.total_disputed_amount)} challenged volume
            </div>
          </div>

          <div className="prd-kpi-card">
            <div className="prd-kpi-header">
              <span className="prd-kpi-title">Dispute Win Rate</span>
              <span style={{ color: '#059669', fontSize: '20px' }}>
                <MdThumbUp />
              </span>
            </div>
            <div className="prd-kpi-val">{stats.disputes.win_rate_percentage}%</div>
            <div className="prd-kpi-subtext">
              {stats.disputes.won_count} won · {stats.disputes.settled_count} settled · {stats.disputes.lost_count} lost
            </div>
          </div>
        </div>
      )}

      {/* Top Header & Section Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div className="prd-view-toggle">
          <button
            className={`prd-toggle-btn ${activeSection === 'refunds' ? 'active' : ''}`}
            onClick={() => setActiveSection('refunds')}
          >
            <MdAssignmentReturn size={16} /> Refunds Ledger ({refunds.length})
          </button>
          <button
            className={`prd-toggle-btn ${activeSection === 'disputes' ? 'active' : ''}`}
            onClick={() => setActiveSection('disputes')}
          >
            <MdGavel size={16} /> Dispute Resolution & Chargebacks ({disputes.length})
          </button>
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

          {activeSection === 'refunds' ? (
            <button
              className="btn-primary"
              onClick={() => setShowRefundModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <MdAdd /> Request Refund
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={() => setShowDisputeModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <MdAdd /> Log Dispute / Chargeback
            </button>
          )}
        </div>
      </div>

      {/* Section A: Refunds Ledger */}
      {activeSection === 'refunds' && (
        <>
          <div className="prd-filter-bar">
            <div className="prd-filter-group">
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Status:</span>
              <select
                className="prd-select"
                value={refundStatusFilter}
                onChange={(e) => setRefundStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="requested">Requested (Pending)</option>
                <option value="approved">Approved</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="prd-filter-group" style={{ flex: 1, maxWidth: '350px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="text"
                  className="prd-input"
                  placeholder="Search refund number, notes, gateway..."
                  value={refundSearch}
                  onChange={(e) => setRefundSearch(e.target.value)}
                  style={{ width: '100%', paddingLeft: '32px' }}
                />
                <MdSearch
                  size={18}
                  style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
                />
              </div>
            </div>
          </div>

          <div className="prd-table-container">
            {refunds.length === 0 ? (
              <div className="prd-empty-state">
                <MdAssignmentReturn size={48} style={{ opacity: 0.4, marginBottom: '8px' }} />
                <p style={{ margin: 0, fontWeight: 600 }}>No refund records found</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
                  Use "Request Refund" to initiate a payment reversal or adjustment.
                </p>
              </div>
            ) : (
              <table className="prd-table">
                <thead>
                  <tr>
                    <th>Refund Number</th>
                    <th>Payment / Client</th>
                    <th>Amount (UGX)</th>
                    <th>Reason Category</th>
                    <th>Status</th>
                    <th>Reversal Tx</th>
                    <th>Requested At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {refunds.map((refund) => (
                    <tr key={refund.id}>
                      <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#0284c7' }}>
                        {refund.refund_number}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {refund.payment?.payment_number || `Payment #${refund.payment_id}`}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {refund.client ? `${refund.client.first_name} ${refund.client.last_name}` : 'Diaspora Client'}
                        </div>
                      </td>
                      <td style={{ fontWeight: 700 }}>{formatUGX(refund.amount)}</td>
                      <td>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                          {refund.reason_category.replace('_', ' ').toUpperCase()}
                        </span>
                        <div style={{ fontSize: '11px', color: '#64748b', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {refund.reason_description}
                        </div>
                      </td>
                      <td>
                        <span className={`prd-badge prd-badge-${refund.status}`}>
                          {refund.status}
                        </span>
                      </td>
                      <td>
                        {refund.reversal_transaction ? (
                          <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#059669', fontWeight: 600 }}>
                            {refund.reversal_transaction.transaction_number}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                      <td style={{ fontSize: '12px', color: '#64748b' }}>
                        {new Date(refund.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {refund.status === 'requested' && (
                            <>
                              <button
                                className="prd-action-btn prd-btn-approve"
                                onClick={() => handleApproveRefund(refund.id)}
                                disabled={actionLoading}
                                title="Approve and execute ledger reversal"
                              >
                                <MdCheckCircle /> Approve
                              </button>
                              <button
                                className="prd-action-btn prd-btn-reject"
                                onClick={() => {
                                  setSelectedRefund(refund)
                                  setShowRejectModal(true)
                                }}
                                disabled={actionLoading}
                                title="Reject refund request"
                              >
                                <MdCancel /> Reject
                              </button>
                            </>
                          )}
                          <button
                            className="prd-action-btn prd-btn-view"
                            onClick={() => setSelectedRefund(refund)}
                            title="View details"
                          >
                            <MdInfo /> Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Section B: Disputes & Chargeback Resolution */}
      {activeSection === 'disputes' && (
        <>
          <div className="prd-filter-bar">
            <div className="prd-filter-group">
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Status:</span>
              <select
                className="prd-select"
                value={disputeStatusFilter}
                onChange={(e) => setDisputeStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="opened">Opened (Action Required)</option>
                <option value="evidence_submitted">Evidence Submitted</option>
                <option value="won">Won (No Loss)</option>
                <option value="lost">Lost</option>
                <option value="settled">Settled</option>
              </select>

              <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginLeft: '12px' }}>
                Channel:
              </span>
              <select
                className="prd-select"
                value={disputeSourceFilter}
                onChange={(e) => setDisputeSourceFilter(e.target.value)}
              >
                <option value="">All Sources</option>
                <option value="chargeback_visa_mc">Visa / Mastercard Chargeback</option>
                <option value="momo_fraud_claim">Mobile Money Fraud Claim</option>
                <option value="client_portal_inquiry">Client Portal Inquiry</option>
              </select>
            </div>

            <div className="prd-filter-group" style={{ flex: 1, maxWidth: '350px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="text"
                  className="prd-input"
                  placeholder="Search dispute number, reason..."
                  value={disputeSearch}
                  onChange={(e) => setDisputeSearch(e.target.value)}
                  style={{ width: '100%', paddingLeft: '32px' }}
                />
                <MdSearch
                  size={18}
                  style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
                />
              </div>
            </div>
          </div>

          <div className="prd-table-container">
            {disputes.length === 0 ? (
              <div className="prd-empty-state">
                <MdGavel size={48} style={{ opacity: 0.4, marginBottom: '8px' }} />
                <p style={{ margin: 0, fontWeight: 600 }}>No dispute or chargeback cases found</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
                  All customer payments and escrow milestones are uncontested.
                </p>
              </div>
            ) : (
              <table className="prd-table">
                <thead>
                  <tr>
                    <th>Dispute Number</th>
                    <th>Payment / Client</th>
                    <th>Disputed Amount</th>
                    <th>Dispute Source</th>
                    <th>Evidence Deadline</th>
                    <th>Status</th>
                    <th>Evidence Items</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {disputes.map((dispute) => (
                    <tr key={dispute.id}>
                      <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#9333ea' }}>
                        {dispute.dispute_number}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {dispute.payment?.payment_number || `Payment #${dispute.payment_id}`}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {dispute.client ? `${dispute.client.first_name} ${dispute.client.last_name}` : 'Client'}
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, color: '#dc2626' }}>
                        {formatUGX(dispute.disputed_amount)}
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                          {dispute.dispute_source === 'chargeback_visa_mc'
                            ? 'Visa/Mastercard 3DS'
                            : dispute.dispute_source === 'momo_fraud_claim'
                            ? 'MTN/Airtel MoMo Claim'
                            : 'Client Portal Dispute'}
                        </span>
                      </td>
                      <td>
                        {dispute.evidence_deadline ? (
                          <span style={{ fontSize: '12px', color: '#e11d48', fontWeight: 600 }}>
                            {new Date(dispute.evidence_deadline).toLocaleDateString()}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span className={`prd-badge prd-badge-${dispute.status}`}>
                          {dispute.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>
                          {dispute.evidence_files?.length || 0} files
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {['opened', 'evidence_submitted', 'under_review'].includes(dispute.status) && (
                            <>
                              <button
                                className="prd-action-btn prd-btn-evidence"
                                onClick={() => {
                                  setSelectedDispute(dispute)
                                  setShowEvidenceModal(true)
                                }}
                                disabled={actionLoading}
                                title="Submit arbitration evidence"
                              >
                                <MdCloudUpload /> Evidence
                              </button>
                              <button
                                className="prd-action-btn prd-btn-resolve"
                                onClick={() => {
                                  setSelectedDispute(dispute)
                                  setShowResolveModal(true)
                                }}
                                disabled={actionLoading}
                                title="Resolve dispute"
                              >
                                <MdGavel /> Resolve
                              </button>
                            </>
                          )}
                          <button
                            className="prd-action-btn prd-btn-view"
                            onClick={() => setSelectedDispute(dispute)}
                            title="View case details"
                          >
                            <MdInfo /> Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* MODAL 1: Request Refund Modal */}
      {showRefundModal && (
        <div className="prd-modal-overlay">
          <div className="prd-modal-card">
            <div className="prd-modal-header">
              <h3 className="prd-modal-title">Request Payment Refund / Reversal</h3>
              <button
                onClick={() => setShowRefundModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <MdClose size={20} />
              </button>
            </div>
            <form onSubmit={handleRequestRefund}>
              <div className="prd-modal-body">
                <div className="prd-form-group">
                  <label className="prd-form-label">Payment ID or Number *</label>
                  <input
                    type="text"
                    required
                    className="prd-input"
                    placeholder="Enter Payment ID or Number (e.g. 1)"
                    value={refundForm.payment_id}
                    onChange={(e) => setRefundForm({ ...refundForm, payment_id: e.target.value })}
                  />
                  <span className="prd-form-help">
                    Only confirmed or verified payments are eligible for refund.
                  </span>
                </div>

                <div className="prd-form-group">
                  <label className="prd-form-label">Refund Amount (UGX) *</label>
                  <input
                    type="number"
                    required
                    min={100}
                    step={1000}
                    className="prd-input"
                    value={refundForm.amount}
                    onChange={(e) => setRefundForm({ ...refundForm, amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="prd-form-group">
                  <label className="prd-form-label">Reason Classification *</label>
                  <select
                    className="prd-select"
                    value={refundForm.reason_category}
                    onChange={(e) => setRefundForm({ ...refundForm, reason_category: e.target.value })}
                  >
                    <option value="duplicate_payment">Duplicate Payment by Client</option>
                    <option value="escrow_surplus">Escrow Surplus / Construction Cost Savings</option>
                    <option value="client_cancellation">Client Cancellation / Mutual Termination</option>
                    <option value="milestone_variation">Milestone Scope Variation Downward</option>
                    <option value="disputed_chargeback">Disputed Chargeback Settlement</option>
                    <option value="other">Other Administrative Adjustment</option>
                  </select>
                </div>

                <div className="prd-form-group">
                  <label className="prd-form-label">Reason Narrative *</label>
                  <textarea
                    required
                    rows={3}
                    className="prd-input"
                    placeholder="Provide full financial and operational context for this refund request..."
                    value={refundForm.reason_description}
                    onChange={(e) => setRefundForm({ ...refundForm, reason_description: e.target.value })}
                  />
                </div>
              </div>

              <div className="prd-modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowRefundModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Log Dispute Modal */}
      {showDisputeModal && (
        <div className="prd-modal-overlay">
          <div className="prd-modal-card">
            <div className="prd-modal-header">
              <h3 className="prd-modal-title">Log Contested Payment Dispute</h3>
              <button
                onClick={() => setShowDisputeModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <MdClose size={20} />
              </button>
            </div>
            <form onSubmit={handleOpenDispute}>
              <div className="prd-modal-body">
                <div className="prd-form-group">
                  <label className="prd-form-label">Contested Payment ID *</label>
                  <input
                    type="text"
                    required
                    className="prd-input"
                    placeholder="Enter Payment ID (e.g. 1)"
                    value={disputeForm.payment_id}
                    onChange={(e) => setDisputeForm({ ...disputeForm, payment_id: e.target.value })}
                  />
                </div>

                <div className="prd-form-group">
                  <label className="prd-form-label">Disputed Amount (UGX) *</label>
                  <input
                    type="number"
                    required
                    min={100}
                    step={1000}
                    className="prd-input"
                    value={disputeForm.disputed_amount}
                    onChange={(e) =>
                      setDisputeForm({ ...disputeForm, disputed_amount: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>

                <div className="prd-form-group">
                  <label className="prd-form-label">Dispute Channel / Source *</label>
                  <select
                    className="prd-select"
                    value={disputeForm.dispute_source}
                    onChange={(e) => setDisputeForm({ ...disputeForm, dispute_source: e.target.value })}
                  >
                    <option value="chargeback_visa_mc">Card Issuer Chargeback (Visa / Mastercard)</option>
                    <option value="momo_fraud_claim">Telco Fraud Claim (MTN / Airtel Mobile Money)</option>
                    <option value="client_portal_inquiry">Client Portal Informal Inquiry</option>
                  </select>
                </div>

                <div className="prd-form-group">
                  <label className="prd-form-label">Evidence Submission Deadline</label>
                  <input
                    type="date"
                    className="prd-input"
                    value={disputeForm.evidence_deadline}
                    onChange={(e) => setDisputeForm({ ...disputeForm, evidence_deadline: e.target.value })}
                  />
                </div>

                <div className="prd-form-group">
                  <label className="prd-form-label">Dispute Reason / Claim Narrative *</label>
                  <textarea
                    required
                    rows={3}
                    className="prd-input"
                    placeholder="Document the client's contention or chargeback reason code..."
                    value={disputeForm.reason}
                    onChange={(e) => setDisputeForm({ ...disputeForm, reason: e.target.value })}
                  />
                </div>
              </div>

              <div className="prd-modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowDisputeModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Logging...' : 'Log Dispute Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Submit Evidence Modal */}
      {showEvidenceModal && selectedDispute && (
        <div className="prd-modal-overlay">
          <div className="prd-modal-card">
            <div className="prd-modal-header">
              <h3 className="prd-modal-title">
                Submit Evidence: {selectedDispute.dispute_number}
              </h3>
              <button
                onClick={() => setShowEvidenceModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <MdClose size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmitEvidence}>
              <div className="prd-modal-body">
                <div className="prd-form-group">
                  <label className="prd-form-label">Evidence Title *</label>
                  <input
                    type="text"
                    required
                    className="prd-input"
                    value={evidenceForm.title}
                    onChange={(e) => setEvidenceForm({ ...evidenceForm, title: e.target.value })}
                  />
                </div>

                <div className="prd-form-group">
                  <label className="prd-form-label">Document / File Path</label>
                  <input
                    type="text"
                    className="prd-input"
                    value={evidenceForm.file_path}
                    onChange={(e) => setEvidenceForm({ ...evidenceForm, file_path: e.target.value })}
                  />
                  <span className="prd-form-help">
                    Path to signed contract, milestone inspection certificate, or client correspondence.
                  </span>
                </div>

                <div className="prd-form-group">
                  <label className="prd-form-label">Arbitration Notes</label>
                  <textarea
                    rows={3}
                    className="prd-input"
                    value={evidenceForm.notes}
                    onChange={(e) => setEvidenceForm({ ...evidenceForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="prd-modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowEvidenceModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="prd-action-btn prd-btn-evidence"
                  disabled={actionLoading}
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  {actionLoading ? 'Submitting...' : 'Upload & Submit Evidence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Resolve Dispute Modal */}
      {showResolveModal && selectedDispute && (
        <div className="prd-modal-overlay">
          <div className="prd-modal-card">
            <div className="prd-modal-header">
              <h3 className="prd-modal-title">
                Resolve Dispute: {selectedDispute.dispute_number}
              </h3>
              <button
                onClick={() => setShowResolveModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <MdClose size={20} />
              </button>
            </div>
            <form onSubmit={handleResolveDispute}>
              <div className="prd-modal-body">
                <div className="prd-form-group">
                  <label className="prd-form-label">Resolution Outcome *</label>
                  <select
                    className="prd-select"
                    value={resolveForm.resolution}
                    onChange={(e) =>
                      setResolveForm({
                        ...resolveForm,
                        resolution: e.target.value as 'won' | 'lost' | 'settled',
                      })
                    }
                  >
                    <option value="won">WON (Favor of Contractor FAB HOMES - No Loss)</option>
                    <option value="settled">SETTLED (Mutual Compromise / Reversal)</option>
                    <option value="lost">LOST (Full Chargeback to Payer)</option>
                  </select>
                </div>

                {['lost', 'settled'].includes(resolveForm.resolution) && (
                  <div
                    style={{
                      background: '#f8fafc',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <input
                      type="checkbox"
                      id="create_refund_cb"
                      checked={resolveForm.create_refund}
                      onChange={(e) => setResolveForm({ ...resolveForm, create_refund: e.target.checked })}
                    />
                    <label htmlFor="create_refund_cb" style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                      Automatically execute double-entry ledger refund and debit savings account ({formatUGX(selectedDispute.disputed_amount)})
                    </label>
                  </div>
                )}

                <div className="prd-form-group">
                  <label className="prd-form-label">Resolution Narrative & Findings</label>
                  <textarea
                    rows={3}
                    className="prd-input"
                    value={resolveForm.resolution_notes}
                    onChange={(e) => setResolveForm({ ...resolveForm, resolution_notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="prd-modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowResolveModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="prd-action-btn prd-btn-resolve"
                  disabled={actionLoading}
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  {actionLoading ? 'Finalizing...' : 'Finalize Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Reject Refund Modal */}
      {showRejectModal && selectedRefund && (
        <div className="prd-modal-overlay">
          <div className="prd-modal-card">
            <div className="prd-modal-header">
              <h3 className="prd-modal-title">Reject Refund Request</h3>
              <button
                onClick={() => setShowRejectModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <MdClose size={20} />
              </button>
            </div>
            <form onSubmit={handleRejectRefund}>
              <div className="prd-modal-body">
                <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748b' }}>
                  Provide an explanation for declining refund request{' '}
                  <strong>{selectedRefund.refund_number}</strong> for{' '}
                  <strong>{formatUGX(selectedRefund.amount)}</strong>.
                </p>

                <div className="prd-form-group">
                  <label className="prd-form-label">Rejection Reason *</label>
                  <textarea
                    required
                    rows={3}
                    className="prd-input"
                    placeholder="Explain why this refund request cannot be approved..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>
              </div>

              <div className="prd-modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowRejectModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="prd-action-btn prd-btn-reject"
                  disabled={actionLoading}
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: View Details (Refund or Dispute) */}
      {selectedRefund && !showRejectModal && (
        <div className="prd-modal-overlay">
          <div className="prd-modal-card">
            <div className="prd-modal-header">
              <h3 className="prd-modal-title">
                Refund Details: {selectedRefund.refund_number}
              </h3>
              <button
                onClick={() => setSelectedRefund(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <MdClose size={20} />
              </button>
            </div>
            <div className="prd-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Amount:</span>{' '}
                  <strong>{formatUGX(selectedRefund.amount)}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Status:</span>{' '}
                  <span className={`prd-badge prd-badge-${selectedRefund.status}`}>
                    {selectedRefund.status}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Category:</span>{' '}
                  <strong>{selectedRefund.reason_category}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Reversal Tx:</span>{' '}
                  <strong>
                    {selectedRefund.reversal_transaction?.transaction_number || 'None'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Requested By:</span>{' '}
                  {selectedRefund.requested_by_user?.name || 'Staff'}
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Processed At:</span>{' '}
                  {selectedRefund.processed_at
                    ? new Date(selectedRefund.processed_at).toLocaleString()
                    : 'Pending'}
                </div>
              </div>

              <div>
                <span style={{ color: '#64748b', fontSize: '13px' }}>Reason Description:</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', background: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                  {selectedRefund.reason_description}
                </p>
              </div>

              {selectedRefund.gateway_response && (
                <div>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>Gateway Response Payload:</span>
                  <pre
                    style={{
                      background: '#0f172a',
                      color: '#f8fafc',
                      padding: '10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      maxHeight: '150px',
                      overflowY: 'auto',
                    }}
                  >
                    {JSON.stringify(selectedRefund.gateway_response, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            <div className="prd-modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedRefund(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedDispute && !showEvidenceModal && !showResolveModal && (
        <div className="prd-modal-overlay">
          <div className="prd-modal-card">
            <div className="prd-modal-header">
              <h3 className="prd-modal-title">
                Dispute Case: {selectedDispute.dispute_number}
              </h3>
              <button
                onClick={() => setSelectedDispute(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <MdClose size={20} />
              </button>
            </div>
            <div className="prd-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Disputed Amount:</span>{' '}
                  <strong style={{ color: '#dc2626' }}>
                    {formatUGX(selectedDispute.disputed_amount)}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Status:</span>{' '}
                  <span className={`prd-badge prd-badge-${selectedDispute.status}`}>
                    {selectedDispute.status}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Source:</span>{' '}
                  <strong>{selectedDispute.dispute_source}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Resolved At:</span>{' '}
                  {selectedDispute.resolved_at
                    ? new Date(selectedDispute.resolved_at).toLocaleString()
                    : 'Under Review'}
                </div>
              </div>

              <div>
                <span style={{ color: '#64748b', fontSize: '13px' }}>Dispute Reason:</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', background: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                  {selectedDispute.reason}
                </p>
              </div>

              {selectedDispute.resolution_notes && (
                <div>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>Resolution Findings:</span>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', background: '#ecfdf5', color: '#065f46', padding: '10px', borderRadius: '6px' }}>
                    {selectedDispute.resolution_notes}
                  </p>
                </div>
              )}

              {selectedDispute.evidence_files && selectedDispute.evidence_files.length > 0 && (
                <div>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>Submitted Evidence Files:</span>
                  <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedDispute.evidence_files.map((file, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: '#f1f5f9',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                        }}
                      >
                        <strong>{file.title}</strong> · {file.submitted_by || 'Officer'}
                        <div style={{ color: '#64748b', fontSize: '11px' }}>{file.file_path}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="prd-modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedDispute(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentRefundsDisputesTab
