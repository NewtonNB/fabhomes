import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  MdArrowBack,
  MdCheckCircle,
  MdFactCheck,
  MdAccountBalance,
  MdVerifiedUser,
  MdPayment,
  MdCancel,
  MdEdit,
  MdClose,
} from 'react-icons/md'
import certificateService from '../../services/certificate.service'
import { PaymentCertificate, CertificateStatus } from '../../types/certificate.types'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import '../contracts/ContractsList.css'
import '../contracts/ContractDetails.css'
import './CertificateDetails.css'

export const CertificateDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [cert, setCert] = useState<PaymentCertificate | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState<boolean>(false)

  // Modals
  const [verifyModalOpen, setVerifyModalOpen] = useState<boolean>(false)
  const [verifyNotes, setVerifyNotes] = useState<string>('')

  const [approveModalOpen, setApproveModalOpen] = useState<boolean>(false)
  const [approveNotes, setApproveNotes] = useState<string>('')

  const [authorizeModalOpen, setAuthorizeModalOpen] = useState<boolean>(false)
  const [authorizeNotes, setAuthorizeNotes] = useState<string>('')

  const [payModalOpen, setPayModalOpen] = useState<boolean>(false)
  const [payReference, setPayReference] = useState<string>('')

  const [rejectModalOpen, setRejectModalOpen] = useState<boolean>(false)
  const [rejectReason, setRejectReason] = useState<string>('')

  const notifySuccess = (msg: string) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  const fetchCertificate = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      setError(null)
      const data = await certificateService.getPaymentCertificate(id)
      setCert(data)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load payment certificate.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchCertificate()
  }, [fetchCertificate])

  const formatCurrency = (val: number, currency: string = 'UGX') => {
    return `${currency} ${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  // Workflow Handlers
  const handleSubmitCertificate = () => {
    setShowSubmitConfirm(true)
  }

  const executeSubmitCertificate = async () => {
    if (!cert) return
    try {
      setActionLoading(true)
      const updated = await certificateService.submitPaymentCertificate(cert.uuid)
      setCert(updated)
      setShowSubmitConfirm(false)
      notifySuccess('Certificate submitted successfully for Site Manager verification.')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to submit certificate.')
      setShowSubmitConfirm(false)
    } finally {
      setActionLoading(false)
    }
  }

  const handleVerifySite = async () => {
    if (!cert) return
    try {
      setActionLoading(true)
      const updated = await certificateService.verifySitePaymentCertificate(cert.uuid, { notes: verifyNotes })
      setCert(updated)
      setVerifyModalOpen(false)
      setVerifyNotes('')
      notifySuccess('Payment certificate verified and approved by Site Manager.')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to verify certificate.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleApproveFinance = async () => {
    if (!cert) return
    try {
      setActionLoading(true)
      const updated = await certificateService.approveFinancePaymentCertificate(cert.uuid, { notes: approveNotes })
      setCert(updated)
      setApproveModalOpen(false)
      setApproveNotes('')
      notifySuccess('Payment certificate approved by Finance Officer.')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to approve certificate.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAuthorizeAdmin = async () => {
    if (!cert) return
    try {
      setActionLoading(true)
      const updated = await certificateService.authorizeAdminPaymentCertificate(cert.uuid, { notes: authorizeNotes })
      setCert(updated)
      setAuthorizeModalOpen(false)
      setAuthorizeNotes('')
      notifySuccess('Payment certificate authorized by Administrator for bank disbursement.')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to authorize certificate.')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePay = async () => {
    if (!cert || !payReference.trim()) {
      setError('Bank / EFT Transaction Payment Reference is required.')
      return
    }
    try {
      setActionLoading(true)
      const updated = await certificateService.payPaymentCertificate(cert.uuid, { payment_reference: payReference })
      setCert(updated)
      setPayModalOpen(false)
      setPayReference('')
      notifySuccess(`Payment certificate marked as PAID with reference: ${payReference}`)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to record payment.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!cert || !rejectReason.trim()) {
      setError('Please state a valid reason for rejecting this valuation.')
      return
    }
    try {
      setActionLoading(true)
      const updated = await certificateService.rejectPaymentCertificate(cert.uuid, { rejection_reason: rejectReason })
      setCert(updated)
      setRejectModalOpen(false)
      setRejectReason('')
      notifySuccess('Payment certificate has been rejected.')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to reject certificate.')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="cert-details-page">
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div className="spinner"></div>
          <p>Loading certificate details...</p>
        </div>
      </div>
    )
  }

  if (!cert) {
    return (
      <div className="cert-details-page">
        <div className="alert-error">Payment Certificate not found.</div>
        <button className="btn-secondary" onClick={() => navigate('/payment-certificates')}>
          <MdArrowBack /> Return to List
        </button>
      </div>
    )
  }

  // Stepper helper
  const stages: { key: CertificateStatus; label: string; step: number }[] = [
    { key: 'draft', label: '1. Drafted', step: 1 },
    { key: 'submitted', label: '2. Submitted', step: 2 },
    { key: 'verified_by_site_manager', label: '3. Site Verified', step: 3 },
    { key: 'approved_by_finance', label: '4. Finance Approved', step: 4 },
    { key: 'authorized_by_admin', label: '5. Admin Authorized', step: 5 },
    { key: 'paid', label: '6. Paid / Disbursed', step: 6 },
  ]

  const statusOrder: Record<CertificateStatus, number> = {
    draft: 1,
    submitted: 2,
    verified_by_site_manager: 3,
    approved_by_finance: 4,
    authorized_by_admin: 5,
    paid: 6,
    rejected: -1,
  }

  const currentLevel = statusOrder[cert.status]

  return (
    <div className="cert-details-page">
      {/* Header */}
      <div className="details-header">
        <div>
          <div className="title-badge-group">
            <h1>{cert.certificate_number}</h1>
            <span className={`badge badge-${cert.status}`}>{cert.status.replace(/_/g, ' ')}</span>
            <span className="badge badge-trade">{cert.certificate_type.replace('_', ' ')}</span>
          </div>
          <div className="contract-meta-line">
            <span>
              Contract: <strong>{cert.contract?.contract_number}</strong> ({cert.contract?.subcontractor_name})
            </span>
            <span>Site: <strong>{cert.site?.name || 'Site'}</strong></span>
            <span>Valuation Date: <strong>{cert.valuation_date}</strong></span>
          </div>
        </div>

        <div className="header-button-group">
          <button className="btn-secondary" onClick={() => navigate('/payment-certificates')}>
            <MdArrowBack /> Back
          </button>

          {/* Workflow Stage Action Buttons */}
          {['draft', 'rejected'].includes(cert.status) && (
            <button className="btn-primary" onClick={handleSubmitCertificate} disabled={actionLoading}>
              <MdFactCheck /> Submit for Site Verification
            </button>
          )}

          {cert.status === 'submitted' && (
            <button className="btn-primary" style={{ backgroundColor: '#16a34a' }} onClick={() => setVerifyModalOpen(true)} disabled={actionLoading}>
              <MdCheckCircle /> Site Manager Verify
            </button>
          )}

          {cert.status === 'verified_by_site_manager' && (
            <button className="btn-primary" style={{ backgroundColor: '#2563eb' }} onClick={() => setApproveModalOpen(true)} disabled={actionLoading}>
              <MdVerifiedUser /> Finance Officer Approve
            </button>
          )}

          {cert.status === 'approved_by_finance' && (
            <button className="btn-primary" style={{ backgroundColor: '#9333ea' }} onClick={() => setAuthorizeModalOpen(true)} disabled={actionLoading}>
              <MdAccountBalance /> Admin Authorize Payment
            </button>
          )}

          {cert.status === 'authorized_by_admin' && (
            <button className="btn-primary" style={{ backgroundColor: '#059669' }} onClick={() => setPayModalOpen(true)} disabled={actionLoading}>
              <MdPayment /> Record Payment (Mark Paid)
            </button>
          )}

          {!['paid', 'rejected'].includes(cert.status) && (
            <button
              className="btn-secondary"
              style={{ color: '#dc2626', borderColor: '#fecaca' }}
              onClick={() => setRejectModalOpen(true)}
              disabled={actionLoading}
            >
              <MdCancel /> Reject
            </button>
          )}

          {['draft', 'rejected'].includes(cert.status) && (
            <Link to={`/certificates/${cert.uuid}/edit`} className="btn-secondary">
              <MdEdit /> Edit
            </Link>
          )}
        </div>
      </div>

      {successMessage && <div className="alert-success">{successMessage}</div>}
      {error && <div className="alert-error">{error}</div>}

      {/* Multi-tier Approval Stepper */}
      <div className="workflow-stepper">
        <div className="stepper-track">
          {stages.map((stage) => {
            const isCompleted = cert.status !== 'rejected' && currentLevel > stage.step
            const isCurrent = cert.status !== 'rejected' && currentLevel === stage.step
            const isRejected = cert.status === 'rejected' && stage.step === 2

            let stepClass = ''
            if (isCompleted) stepClass = 'completed'
            else if (isCurrent) stepClass = 'current'
            else if (isRejected) stepClass = 'rejected'

            return (
              <div key={stage.key} className={`stepper-step ${stepClass}`}>
                <div className="step-circle">
                  {isCompleted ? <MdCheckCircle /> : isRejected ? <MdCancel /> : stage.step}
                </div>
                <div className="step-title">{stage.label}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Rejection Alert Box */}
      {cert.status === 'rejected' && cert.rejection_reason && (
        <div className="alert-error" style={{ marginBottom: '1.5rem' }}>
          <strong>Certificate Rejected:</strong> {cert.rejection_reason}
        </div>
      )}

      {/* Financial Metrics Cards */}
      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-title">Cumulative Gross Valuation</div>
          <div className="metric-value">{formatCurrency(cert.gross_amount, cert.currency)}</div>
          <div className="metric-subtitle">Previous: {formatCurrency(cert.previous_gross_amount, cert.currency)}</div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Current Period Gross</div>
          <div className="metric-value" style={{ color: '#0284c7' }}>
            {formatCurrency(cert.current_gross_amount, cert.currency)}
          </div>
          <div className="metric-subtitle">Materials: +{formatCurrency(cert.materials_on_site_value, cert.currency)}</div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Retention Deducted ({cert.retention_rate}%)</div>
          <div className="metric-value" style={{ color: '#d97706' }}>
            {formatCurrency(cert.retention_deducted, cert.currency)}
          </div>
          <div className="metric-subtitle">Held in reserve pool</div>
        </div>

        <div className="metric-card">
          <div className="metric-title">URA WHT Deducted ({cert.withholding_tax_rate}%)</div>
          <div className="metric-value" style={{ color: '#64748b' }}>
            {formatCurrency(cert.withholding_tax_amount, cert.currency)}
          </div>
          <div className="metric-subtitle">Statutory remittance</div>
        </div>

        <div className="metric-card">
          <div className="metric-title">NET PAYABLE TO CONTRACTOR</div>
          <div className="metric-value" style={{ color: '#16a34a' }}>
            {formatCurrency(cert.net_certified_amount, cert.currency)}
          </div>
          <div className="metric-subtitle">Disbursed amount</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="details-grid">
        {/* Left Column: Valuation Sheet & Narrative */}
        <div>
          <div className="content-card">
            <h3 className="content-card-title">Valuation Sheet & Deductions Schedule</h3>
            <div className="valuation-calculator-box" style={{ margin: 0 }}>
              <div className="calc-sheet">
                <div className="calc-row">
                  <span className="calc-label">Cumulative Gross Work Done to Date</span>
                  <span className="calc-val">{formatCurrency(cert.gross_amount, cert.currency)}</span>
                </div>
                <div className="calc-row">
                  <span className="calc-label">Less Previous Certified Gross</span>
                  <span className="calc-val">- {formatCurrency(cert.previous_gross_amount, cert.currency)}</span>
                </div>
                <div className="calc-row">
                  <span className="calc-label">Current Valuation Period Gross Work</span>
                  <span className="calc-val" style={{ color: '#38bdf8' }}>{formatCurrency(cert.current_gross_amount, cert.currency)}</span>
                </div>
                <div className="calc-row">
                  <span className="calc-label">Plus Materials on Site (Unincorporated)</span>
                  <span className="calc-val">+ {formatCurrency(cert.materials_on_site_value, cert.currency)}</span>
                </div>
                <div className="calc-row subtotal">
                  <span className="calc-label">Gross Certified Subtotal</span>
                  <span className="calc-val">{formatCurrency(cert.current_gross_amount + cert.materials_on_site_value, cert.currency)}</span>
                </div>
                <div className="calc-row">
                  <span className="calc-label">Less Retention Deducted ({cert.retention_rate}%)</span>
                  <span className="calc-val" style={{ color: '#fbbf24' }}>- {formatCurrency(cert.retention_deducted, cert.currency)}</span>
                </div>
                <div className="calc-row">
                  <span className="calc-label">Less Statutory URA Withholding Tax ({cert.withholding_tax_rate}%)</span>
                  <span className="calc-val" style={{ color: '#f87171' }}>- {formatCurrency(cert.withholding_tax_amount, cert.currency)}</span>
                </div>
                {cert.other_deductions > 0 && (
                  <div className="calc-row">
                    <span className="calc-label">Less Other Allowable Deductions</span>
                    <span className="calc-val" style={{ color: '#f87171' }}>- {formatCurrency(cert.other_deductions, cert.currency)}</span>
                  </div>
                )}
                <div className="calc-row net">
                  <span className="calc-label">NET CERTIFIED PAYABLE</span>
                  <span className="calc-val">{formatCurrency(cert.net_certified_amount, cert.currency)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="content-card">
            <h3 className="content-card-title">Works Description & Site Measurement Details</h3>
            <div style={{ marginBottom: '1rem' }}>
              <span className="info-item-label">Description of Valued Works</span>
              <p style={{ margin: '0.25rem 0', color: '#1e293b', fontSize: '0.95rem' }}>{cert.description}</p>
            </div>
            {cert.measurement_sheet_summary && (
              <div>
                <span className="info-item-label">Measurement Sheet / Inspection Remarks</span>
                <div className="scope-text-box">{cert.measurement_sheet_summary}</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Multi-tier Sign-off Audit Boxes */}
        <div>
          <div className="content-card">
            <h3 className="content-card-title">Multi-tier Governance & Sign-off Audit</h3>

            {/* 1. Site Manager Verification */}
            <div className="audit-box">
              <div className="audit-box-header">
                <span className="audit-officer">1. Site Manager Physical Verification</span>
                {cert.site_manager_signed_at && (
                  <span className="audit-timestamp">{new Date(cert.site_manager_signed_at).toLocaleString()}</span>
                )}
              </div>
              <div>
                Status:{' '}
                {cert.site_manager_id ? (
                  <strong style={{ color: '#16a34a' }}>Verified & Signed</strong>
                ) : (
                  <span style={{ color: '#94a3b8' }}>Awaiting Verification</span>
                )}
              </div>
              {cert.site_manager && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>By: {cert.site_manager.name}</div>}
              {cert.site_manager_notes && <div className="audit-notes">{cert.site_manager_notes}</div>}
            </div>

            {/* 2. Finance Approval */}
            <div className="audit-box">
              <div className="audit-box-header">
                <span className="audit-officer">2. Finance Officer Valuation Audit</span>
                {cert.finance_officer_approved_at && (
                  <span className="audit-timestamp">{new Date(cert.finance_officer_approved_at).toLocaleString()}</span>
                )}
              </div>
              <div>
                Status:{' '}
                {cert.finance_officer_id ? (
                  <strong style={{ color: '#16a34a' }}>Approved (WHT & Retention Verified)</strong>
                ) : (
                  <span style={{ color: '#94a3b8' }}>Pending Finance Review</span>
                )}
              </div>
              {cert.finance_officer && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>By: {cert.finance_officer.name}</div>}
              {cert.finance_officer_notes && <div className="audit-notes">{cert.finance_officer_notes}</div>}
            </div>

            {/* 3. Admin Authorization */}
            <div className="audit-box">
              <div className="audit-box-header">
                <span className="audit-officer">3. Administrator Disbursement Authorization</span>
                {cert.admin_authorized_at && (
                  <span className="audit-timestamp">{new Date(cert.admin_authorized_at).toLocaleString()}</span>
                )}
              </div>
              <div>
                Status:{' '}
                {cert.admin_id ? (
                  <strong style={{ color: '#16a34a' }}>Authorized for Payment</strong>
                ) : (
                  <span style={{ color: '#94a3b8' }}>Pending Authorization</span>
                )}
              </div>
              {cert.admin && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>By: {cert.admin.name}</div>}
              {cert.admin_notes && <div className="audit-notes">{cert.admin_notes}</div>}
            </div>

            {/* 4. Payment Execution */}
            <div className="audit-box" style={{ backgroundColor: cert.status === 'paid' ? '#f0fdf4' : '#f8fafc' }}>
              <div className="audit-box-header">
                <span className="audit-officer">4. Treasury Disbursement / Cashier</span>
                {cert.paid_at && <span className="audit-timestamp">{new Date(cert.paid_at).toLocaleString()}</span>}
              </div>
              <div>
                Payment Status:{' '}
                {cert.status === 'paid' ? (
                  <strong style={{ color: '#15803d' }}>Disbursed (PAID)</strong>
                ) : (
                  <span style={{ color: '#94a3b8' }}>Awaiting Disbursement</span>
                )}
              </div>
              {cert.paid_by_user && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Disbursed By: {cert.paid_by_user.name}</div>}
              {cert.payment_reference && (
                <div style={{ marginTop: '0.5rem', fontFamily: 'monospace', fontWeight: 600, color: '#047857' }}>
                  EFT / Bank Ref: {cert.payment_reference}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Verify Site Modal */}
      {verifyModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Site Manager Physical Sign-off</h3>
              <button className="modal-close" onClick={() => setVerifyModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#475569', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Confirm that physical works and materials for Certificate <strong>{cert.certificate_number}</strong> have been inspected and meet specifications.
              </p>
              <div className="form-group">
                <label>Site Manager Remarks / Verification Notes</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  placeholder="e.g. Dimensions confirmed on site. Work conforms to project drawings."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setVerifyModalOpen(false)}>
                Cancel
              </button>
              <button className="btn-primary" style={{ backgroundColor: '#16a34a' }} onClick={handleVerifySite} disabled={actionLoading}>
                Sign & Verify
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Finance Modal */}
      {approveModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Finance Officer Audit & Approval</h3>
              <button className="modal-close" onClick={() => setApproveModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#475569', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Confirm that contract bill rates, 5% retention, and 6% statutory withholding tax calculations are correct.
              </p>
              <div className="form-group">
                <label>Finance Audit Notes</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  placeholder="e.g. Verified against contract rates and URA withholding tax schedule."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setApproveModalOpen(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleApproveFinance} disabled={actionLoading}>
                Approve Valuation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Authorize Admin Modal */}
      {authorizeModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Administrator Payment Authorization</h3>
              <button className="modal-close" onClick={() => setAuthorizeModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#475569', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Authorize bank disbursement of <strong>{formatCurrency(cert.net_certified_amount, cert.currency)}</strong> to {cert.contract?.subcontractor_name}.
              </p>
              <div className="form-group">
                <label>Executive Authorization Notes</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={authorizeNotes}
                  onChange={(e) => setAuthorizeNotes(e.target.value)}
                  placeholder="e.g. Approved for immediate electronic bank transfer."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setAuthorizeModalOpen(false)}>
                Cancel
              </button>
              <button className="btn-primary" style={{ backgroundColor: '#9333ea' }} onClick={handleAuthorizeAdmin} disabled={actionLoading}>
                Authorize Disbursement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {payModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Disburse & Record Payment</h3>
              <button className="modal-close" onClick={() => setPayModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#475569', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Disbursing <strong>{formatCurrency(cert.net_certified_amount, cert.currency)}</strong> to {cert.contract?.subcontractor_name}.
              </p>
              <div className="form-group">
                <label>
                  Bank / EFT / Cheque Payment Reference <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. EFT-STN-20261016-0994 or CHEQUE #0045"
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setPayModalOpen(false)}>
                Cancel
              </button>
              <button className="btn-primary" style={{ backgroundColor: '#059669' }} onClick={handlePay} disabled={actionLoading || !payReference.trim()}>
                Confirm Payment Disbursement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Reject Payment Certificate</h3>
              <button className="modal-close" onClick={() => setRejectModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Please specify the reason for rejecting this payment certificate. The contractor/initiator can rectify and re-submit.
              </p>
              <div className="form-group">
                <label>
                  Rejection Reason / Rectification Required <span className="required">*</span>
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Unverified truss quantity in Block B; bill rates exceed contract schedule..."
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setRejectModalOpen(false)}>
                Cancel
              </button>
              <button className="btn-primary" style={{ backgroundColor: '#dc2626' }} onClick={handleReject} disabled={actionLoading || !rejectReason.trim()}>
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Soft Confirmation Modal for Certificate Submission */}
      <ConfirmDialog
        isOpen={showSubmitConfirm}
        title="Submit Payment Certificate"
        message={`Are you sure you want to submit certificate "${cert?.certificate_number}" for Site Manager measurement verification?`}
        confirmText="Submit Certificate"
        cancelText="Cancel"
        variant="primary"
        isLoading={actionLoading}
        onConfirm={executeSubmitCertificate}
        onClose={() => setShowSubmitConfirm(false)}
      />
    </div>
  )
}

export default CertificateDetails
