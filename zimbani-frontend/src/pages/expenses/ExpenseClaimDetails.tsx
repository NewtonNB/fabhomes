import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  MdArrowBack,
  MdCheckCircle,
  MdFactCheck,
  MdAccountBalance,
  MdVerifiedUser,
  MdPayments,
  MdCancel,
  MdEdit,
  MdClose,
  MdReceipt,
  MdPerson,
} from 'react-icons/md'
import expenseService from '../../services/expense.service'
import { ExpenseClaim, ExpenseClaimStatus, ExpenseCategory } from '../../types/expense.types'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import '../contracts/ContractsList.css'
import '../contracts/ContractDetails.css'
import './Expenses.css'

export const ExpenseClaimDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [claim, setClaim] = useState<ExpenseClaim | null>(null)
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

  const [reimburseModalOpen, setReimburseModalOpen] = useState<boolean>(false)
  const [paymentReference, setPaymentReference] = useState<string>('')

  const [rejectModalOpen, setRejectModalOpen] = useState<boolean>(false)
  const [rejectReason, setRejectReason] = useState<string>('')

  const notifySuccess = (msg: string) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  const fetchClaim = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      setError(null)
      const data = await expenseService.getExpenseClaim(id)
      setClaim(data)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load expense claim.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchClaim()
  }, [fetchClaim])

  const formatCurrency = (val: number, currency: string = 'UGX') => {
    return `${currency} ${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  // Workflow Handlers
  const handleSubmitClaim = () => {
    setShowSubmitConfirm(true)
  }

  const executeSubmitClaim = async () => {
    if (!claim) return
    try {
      setActionLoading(true)
      const updated = await expenseService.submitExpenseClaim(claim.uuid)
      setClaim(updated)
      setShowSubmitConfirm(false)
      notifySuccess('Claim submitted successfully for site manager verification.')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to submit claim.')
      setShowSubmitConfirm(false)
    } finally {
      setActionLoading(false)
    }
  }

  const handleVerifySite = async () => {
    if (!claim) return
    try {
      setActionLoading(true)
      const updated = await expenseService.verifyExpenseClaim(claim.uuid, { notes: verifyNotes })
      setClaim(updated)
      setVerifyModalOpen(false)
      setVerifyNotes('')
      notifySuccess('Claim successfully verified by Site Manager.')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to verify claim.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleApproveFinance = async () => {
    if (!claim) return
    try {
      setActionLoading(true)
      const updated = await expenseService.approveExpenseClaim(claim.uuid, { notes: approveNotes })
      setClaim(updated)
      setApproveModalOpen(false)
      setApproveNotes('')
      notifySuccess('Claim approved by Finance Officer for administrative sign-off.')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to approve claim.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAuthorizeAdmin = async () => {
    if (!claim) return
    try {
      setActionLoading(true)
      const updated = await expenseService.authorizeExpenseClaim(claim.uuid, { notes: authorizeNotes })
      setClaim(updated)
      setAuthorizeModalOpen(false)
      setAuthorizeNotes('')
      notifySuccess('Claim authorized by Admin for disbursement.')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to authorize claim.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReimburse = async () => {
    if (!claim) return
    try {
      setActionLoading(true)
      const updated = await expenseService.reimburseExpenseClaim(claim.uuid, {
        payment_reference: paymentReference.trim() || undefined,
      })
      setClaim(updated)
      setReimburseModalOpen(false)
      setPaymentReference('')
      notifySuccess(
        claim.payment_method === 'petty_cash'
          ? 'Claim reimbursed and automatically deducted from Site Petty Cash Float!'
          : 'Claim reimbursement disbursement recorded successfully.'
      )
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to reimburse claim.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!claim || !rejectReason.trim()) return
    try {
      setActionLoading(true)
      const updated = await expenseService.rejectExpenseClaim(claim.uuid, { reason: rejectReason })
      setClaim(updated)
      setRejectModalOpen(false)
      setRejectReason('')
      notifySuccess('Expense claim has been rejected.')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to reject claim.')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status: ExpenseClaimStatus) => {
    switch (status) {
      case 'draft':
        return <span className="status-badge badge-draft">Draft</span>
      case 'submitted':
        return <span className="status-badge badge-suspended">Submitted</span>
      case 'verified_by_site_manager':
        return <span className="status-badge badge-trade">Site Verified</span>
      case 'approved_by_finance':
        return <span className="status-badge badge-active">Finance Approved</span>
      case 'authorized_by_admin':
        return <span className="status-badge badge-completed">Admin Authorized</span>
      case 'reimbursed':
        return <span className="status-badge badge-active">Reimbursed</span>
      case 'rejected':
        return <span className="status-badge badge-terminated">Rejected</span>
      default:
        return <span className="status-badge badge-draft">{status}</span>
    }
  }

  const getCategoryBadge = (cat: ExpenseCategory) => {
    return <span className={`badge-category cat-${cat}`}>{cat.replace('_', ' ')}</span>
  }

  if (loading) {
    return (
      <div className="expenses-page" style={{ textAlign: 'center', padding: '4rem' }}>
        <p style={{ color: '#64748b' }}>Loading expense claim details...</p>
      </div>
    )
  }

  if (!claim) {
    return (
      <div className="expenses-page" style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>Expense Claim Not Found</h2>
        <button onClick={() => navigate('/expenses')} className="btn-secondary" style={{ marginTop: '1rem' }}>
          Back to Expense Claims
        </button>
      </div>
    )
  }

  // Stepper logic
  const steps: { key: ExpenseClaimStatus; label: string; date?: string | null; who?: string | null }[] = [
    { key: 'draft', label: '1. Draft', date: claim.created_at, who: claim.claimant?.name },
    { key: 'submitted', label: '2. Submitted', date: claim.created_at, who: 'Claimant' },
    { key: 'verified_by_site_manager', label: '3. Site Verified', date: claim.site_manager_signed_at, who: claim.site_manager?.name },
    { key: 'approved_by_finance', label: '4. Finance Approved', date: claim.finance_officer_approved_at, who: claim.finance_officer?.name },
    { key: 'authorized_by_admin', label: '5. Admin Authorized', date: claim.admin_authorized_at, who: claim.admin?.name },
    { key: 'reimbursed', label: '6. Reimbursed', date: claim.paid_at, who: claim.paid_by_user?.name },
  ]

  const statusOrder: Record<ExpenseClaimStatus, number> = {
    draft: 0,
    submitted: 1,
    verified_by_site_manager: 2,
    approved_by_finance: 3,
    authorized_by_admin: 4,
    reimbursed: 5,
    rejected: -1,
  }

  const currentIdx = statusOrder[claim.status]

  return (
    <div className="contract-details-page">
      {/* Top Bar */}
      <div className="contract-details-topbar">
        <Link to="/expenses" className="btn-back">
          <MdArrowBack size={20} /> Back to Expense Claims
        </Link>
        <div className="topbar-actions">
          {claim.status === 'draft' && (
            <>
              <button
                onClick={handleSubmitClaim}
                className="btn-primary"
                disabled={actionLoading}
              >
                <MdCheckCircle size={18} /> Submit Claim
              </button>
              <Link to={`/expenses/${claim.uuid}/edit`} className="btn-secondary">
                <MdEdit size={18} /> Edit
              </Link>
            </>
          )}

          {claim.status === 'submitted' && (
            <>
              <button
                onClick={() => setVerifyModalOpen(true)}
                className="btn-primary"
                style={{ backgroundColor: '#0284c7' }}
                disabled={actionLoading}
              >
                <MdFactCheck size={18} /> Site Manager Sign-Off
              </button>
              <button
                onClick={() => setRejectModalOpen(true)}
                className="btn-secondary"
                style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                disabled={actionLoading}
              >
                <MdCancel size={18} /> Reject
              </button>
            </>
          )}

          {claim.status === 'verified_by_site_manager' && (
            <>
              <button
                onClick={() => setApproveModalOpen(true)}
                className="btn-primary"
                style={{ backgroundColor: '#2563eb' }}
                disabled={actionLoading}
              >
                <MdAccountBalance size={18} /> Finance Approval
              </button>
              <button
                onClick={() => setRejectModalOpen(true)}
                className="btn-secondary"
                style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                disabled={actionLoading}
              >
                <MdCancel size={18} /> Reject
              </button>
            </>
          )}

          {claim.status === 'approved_by_finance' && (
            <>
              <button
                onClick={() => setAuthorizeModalOpen(true)}
                className="btn-primary"
                style={{ backgroundColor: '#7c3aed' }}
                disabled={actionLoading}
              >
                <MdVerifiedUser size={18} /> Admin Authorization
              </button>
              <button
                onClick={() => setRejectModalOpen(true)}
                className="btn-secondary"
                style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                disabled={actionLoading}
              >
                <MdCancel size={18} /> Reject
              </button>
            </>
          )}

          {claim.status === 'authorized_by_admin' && (
            <button
              onClick={() => setReimburseModalOpen(true)}
              className="btn-primary"
              style={{ backgroundColor: '#16a34a' }}
              disabled={actionLoading}
            >
              <MdPayments size={18} /> Disburse / Reimburse Cash
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div style={{ backgroundColor: '#ecfdf5', color: '#065f46', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', border: '1px solid #a7f3d0' }}>
          {successMessage}
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      {/* Rejection Banner */}
      {claim.status === 'rejected' && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #f87171', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b91c1c', fontWeight: 600, marginBottom: '0.5rem' }}>
            <MdCancel size={22} /> Claim Rejected
          </div>
          <p style={{ margin: 0, color: '#7f1d1d', fontSize: '0.925rem' }}>
            <strong>Reason:</strong> {claim.rejection_reason || 'No specific rejection reason provided.'}
          </p>
        </div>
      )}

      {/* Multi-Tier Approval Stepper */}
      <div className="workflow-stepper">
        {steps.map((st, idx) => {
          let stateClass = 'step-pending'
          if (claim.status === 'rejected') {
            stateClass = idx <= 1 ? 'step-done' : 'step-pending'
          } else if (currentIdx >= idx) {
            stateClass = 'step-done'
          } else if (currentIdx === idx - 1) {
            stateClass = 'step-active'
          }

          return (
            <React.Fragment key={st.key}>
              <div className="step-item">
                <div className={`step-icon-circle ${stateClass}`}>
                  {stateClass === 'step-done' ? <MdCheckCircle /> : idx + 1}
                </div>
                <span className="step-title">{st.label}</span>
                {st.who && <span className="step-date" style={{ fontWeight: 500 }}>{st.who}</span>}
                {st.date && (
                  <span className="step-date">{new Date(st.date).toLocaleDateString()}</span>
                )}
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`step-connector ${currentIdx > idx ? 'step-connector-done' : ''}`}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Hero Summary Card */}
      <div className="details-header-card">
        <div className="header-meta">
          <span className="contract-number-tag">{claim.claim_number}</span>
          {getStatusBadge(claim.status)}
          {getCategoryBadge(claim.expense_category)}
          <span className="status-badge badge-closed" style={{ textTransform: 'capitalize' }}>
            {claim.payment_method.replace('_', ' ')}
          </span>
        </div>
        <h1 className="contract-title">{claim.title}</h1>
        <p className="contract-subtext">
          Direct purchase for <strong>{claim.site?.name || 'Site'}</strong> ({claim.project?.name || 'Project'}) on {new Date(claim.expense_date).toLocaleDateString()}
        </p>

        {/* Big Amount Card */}
        <div style={{ marginTop: '1.5rem', padding: '1.25rem 1.5rem', backgroundColor: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Total Claim Value
            </span>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {formatCurrency(claim.total_amount, claim.currency)}
            </div>
          </div>
          {claim.petty_cash_account && (
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Assigned Petty Cash Float</span>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#2563eb' }}>
                <Link to={`/petty-cash/${claim.petty_cash_account.uuid}`}>
                  {claim.petty_cash_account.account_number} ({claim.petty_cash_account.name})
                </Link>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Float Balance: {formatCurrency(claim.petty_cash_account.current_balance, claim.petty_cash_account.currency)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Line Items Table */}
      <div className="details-card" style={{ marginBottom: '1.5rem' }}>
        <h2 className="card-section-title">
          <MdReceipt size={20} /> Itemized Expense Items ({claim.items?.length || 0})
        </h2>
        <div className="table-responsive">
          <table className="contracts-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Item Description</th>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th>Unit</th>
                <th style={{ textAlign: 'right' }}>Unit Price</th>
                <th style={{ textAlign: 'right' }}>Total Price</th>
                <th>Receipt Ref</th>
              </tr>
            </thead>
            <tbody>
              {claim.items && claim.items.length > 0 ? (
                claim.items.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td>{idx + 1}</td>
                    <td style={{ fontWeight: 600, color: '#1e293b' }}>{item.item_description}</td>
                    <td>{getCategoryBadge(item.expense_category || claim.expense_category)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>{item.quantity}</td>
                    <td>{item.unit_of_measure}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(item.unit_price, claim.currency)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      {formatCurrency(item.total_price, claim.currency)}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        {item.receipt_reference || '—'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8', padding: '1.5rem' }}>
                    No line items attached.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700 }}>
                <td colSpan={6} style={{ textAlign: 'right', padding: '1rem' }}>
                  Grand Total:
                </td>
                <td style={{ textAlign: 'right', padding: '1rem', color: '#0f172a', fontSize: '1.1rem' }}>
                  {formatCurrency(claim.total_amount, claim.currency)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 2-Column: Vendor Details & Sign-Off Audit Trail */}
      <div className="details-grid">
        {/* Left Column: Vendor & Claimant */}
        <div className="details-col">
          <div className="details-card">
            <h2 className="card-section-title">
              <MdPerson size={20} /> Vendor & Claimant Details
            </h2>
            <div className="card-kv-list">
              <div className="kv-item">
                <span className="kv-key">Claimant:</span>
                <span className="kv-val" style={{ fontWeight: 600 }}>
                  {claim.claimant?.name || '—'} ({claim.claimant?.email || ''})
                </span>
              </div>
              <div className="kv-item">
                <span className="kv-key">Supplier / Vendor:</span>
                <span className="kv-val">{claim.vendor_name || 'Direct / Market Purchase'}</span>
              </div>
              <div className="kv-item">
                <span className="kv-key">Vendor TIN:</span>
                <span className="kv-val">{claim.vendor_tin || 'N/A'}</span>
              </div>
              <div className="kv-item">
                <span className="kv-key">Receipt / Cash Sale #:</span>
                <span className="kv-val" style={{ fontWeight: 600 }}>{claim.receipt_number || 'None'}</span>
              </div>
              <div className="kv-item">
                <span className="kv-key">Claim Type:</span>
                <span className="kv-val">{claim.claim_type.replace('_', ' ')}</span>
              </div>
            </div>

            {claim.description && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                  Justification Notes
                </span>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#334155' }}>
                  {claim.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Multi-Tier Sign-Off History */}
        <div className="details-col">
          <div className="details-card">
            <h2 className="card-section-title">
              <MdVerifiedUser size={20} /> Multi-Tier Sign-Off Audit
            </h2>

            {/* Site Manager */}
            <div style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>1. Site Manager Physical Verification</strong>
                {claim.site_manager_signed_at ? (
                  <span className="status-badge badge-active" style={{ fontSize: '0.75rem' }}>Verified</span>
                ) : (
                  <span className="status-badge badge-draft" style={{ fontSize: '0.75rem' }}>Pending</span>
                )}
              </div>
              {claim.site_manager_signed_at && (
                <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '0.25rem' }}>
                  By {claim.site_manager?.name || `User #${claim.site_manager_id}`} on {new Date(claim.site_manager_signed_at).toLocaleString()}
                  {claim.site_manager_notes && (
                    <div style={{ fontStyle: 'italic', marginTop: '0.2rem', color: '#334155' }}>
                      &ldquo;{claim.site_manager_notes}&rdquo;
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Finance Officer */}
            <div style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>2. Finance Compliance & Rate Audit</strong>
                {claim.finance_officer_approved_at ? (
                  <span className="status-badge badge-active" style={{ fontSize: '0.75rem' }}>Approved</span>
                ) : (
                  <span className="status-badge badge-draft" style={{ fontSize: '0.75rem' }}>Pending</span>
                )}
              </div>
              {claim.finance_officer_approved_at && (
                <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '0.25rem' }}>
                  By {claim.finance_officer?.name || `User #${claim.finance_officer_id}`} on {new Date(claim.finance_officer_approved_at).toLocaleString()}
                  {claim.finance_officer_notes && (
                    <div style={{ fontStyle: 'italic', marginTop: '0.2rem', color: '#334155' }}>
                      &ldquo;{claim.finance_officer_notes}&rdquo;
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Admin Authorization */}
            <div style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>3. Company Admin Authorization</strong>
                {claim.admin_authorized_at ? (
                  <span className="status-badge badge-completed" style={{ fontSize: '0.75rem' }}>Authorized</span>
                ) : (
                  <span className="status-badge badge-draft" style={{ fontSize: '0.75rem' }}>Pending</span>
                )}
              </div>
              {claim.admin_authorized_at && (
                <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '0.25rem' }}>
                  By {claim.admin?.name || `User #${claim.admin_id}`} on {new Date(claim.admin_authorized_at).toLocaleString()}
                  {claim.admin_notes && (
                    <div style={{ fontStyle: 'italic', marginTop: '0.2rem', color: '#334155' }}>
                      &ldquo;{claim.admin_notes}&rdquo;
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cashier / Payment */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>4. Cash Disbursement & Ledger Settlement</strong>
                {claim.paid_at ? (
                  <span className="status-badge badge-active" style={{ fontSize: '0.75rem' }}>Disbursed</span>
                ) : (
                  <span className="status-badge badge-draft" style={{ fontSize: '0.75rem' }}>Pending</span>
                )}
              </div>
              {claim.paid_at && (
                <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Disbursed by {claim.paid_by_user?.name || `User #${claim.paid_by}`} on {new Date(claim.paid_at).toLocaleString()}
                  {claim.payment_reference && (
                    <div style={{ marginTop: '0.2rem', color: '#0f172a', fontWeight: 500 }}>
                      Payment Ref / Voucher: <code>{claim.payment_reference}</code>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Verify Modal */}
      {verifyModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Site Manager Physical Verification</h3>
              <button onClick={() => setVerifyModalOpen(false)} className="modal-close-btn">
                <MdClose />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '1rem' }}>
                Confirm that the items/services claimed were physically received on site in satisfactory quality.
              </p>
              <div className="form-group">
                <label>Verification Notes / Observations</label>
                <textarea
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  placeholder="e.g. Inspected 10 bags of cement delivered and offloaded into site store in sound condition."
                  rows={3}
                  className="form-textarea"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setVerifyModalOpen(false)} className="btn-secondary" disabled={actionLoading}>
                Cancel
              </button>
              <button
                onClick={handleVerifySite}
                className="btn-primary"
                style={{ backgroundColor: '#0284c7' }}
                disabled={actionLoading}
              >
                {actionLoading ? 'Verifying...' : 'Sign & Verify Claim'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {approveModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Finance Officer Audit & Approval</h3>
              <button onClick={() => setApproveModalOpen(false)} className="modal-close-btn">
                <MdClose />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '1rem' }}>
                Verify merchant receipts, price rates against market benchmarks, and correct cost code categorization.
              </p>
              <div className="form-group">
                <label>Finance Audit Notes</label>
                <textarea
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  placeholder="e.g. Unit prices benchmarked against approved Kampala materials index. Receipts compliant."
                  rows={3}
                  className="form-textarea"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setApproveModalOpen(false)} className="btn-secondary" disabled={actionLoading}>
                Cancel
              </button>
              <button
                onClick={handleApproveFinance}
                className="btn-primary"
                style={{ backgroundColor: '#2563eb' }}
                disabled={actionLoading}
              >
                {actionLoading ? 'Approving...' : 'Confirm Finance Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Authorize Modal */}
      {authorizeModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Company Admin Authorization</h3>
              <button onClick={() => setAuthorizeModalOpen(false)} className="modal-close-btn">
                <MdClose />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '1rem' }}>
                Authorize final disbursement of funds ({formatCurrency(claim.total_amount, claim.currency)}) to claimant / petty cash float.
              </p>
              <div className="form-group">
                <label>Authorization Remarks</label>
                <textarea
                  value={authorizeNotes}
                  onChange={(e) => setAuthorizeNotes(e.target.value)}
                  placeholder="e.g. Approved under emergency site contingency allocation."
                  rows={3}
                  className="form-textarea"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setAuthorizeModalOpen(false)} className="btn-secondary" disabled={actionLoading}>
                Cancel
              </button>
              <button
                onClick={handleAuthorizeAdmin}
                className="btn-primary"
                style={{ backgroundColor: '#7c3aed' }}
                disabled={actionLoading}
              >
                {actionLoading ? 'Authorizing...' : 'Authorize Disbursement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reimburse Modal */}
      {reimburseModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Cashier / Float Disbursement</h3>
              <button onClick={() => setReimburseModalOpen(false)} className="modal-close-btn">
                <MdClose />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '1rem' }}>
                Record the disbursement of <strong>{formatCurrency(claim.total_amount, claim.currency)}</strong> via {claim.payment_method.replace('_', ' ')}.
                {claim.payment_method === 'petty_cash' && (
                  <span style={{ display: 'block', marginTop: '0.5rem', color: '#2563eb', fontWeight: 500 }}>
                    This will automatically deduct {formatCurrency(claim.total_amount)} from float {claim.petty_cash_account?.account_number}.
                  </span>
                )}
              </p>
              <div className="form-group">
                <label>Payment Reference / Voucher / Transaction ID</label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. PC-VOUCHER-0091 or MM-REF-99214"
                  className="form-input"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setReimburseModalOpen(false)} className="btn-secondary" disabled={actionLoading}>
                Cancel
              </button>
              <button
                onClick={handleReimburse}
                className="btn-primary"
                style={{ backgroundColor: '#16a34a' }}
                disabled={actionLoading}
              >
                {actionLoading ? 'Recording...' : 'Confirm Reimbursement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Reject Expense Claim</h3>
              <button onClick={() => setRejectModalOpen(false)} className="modal-close-btn">
                <MdClose />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Reason for Rejection *</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why this expense claim or receipt is unacceptable..."
                  rows={3}
                  className="form-textarea"
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setRejectModalOpen(false)} className="btn-secondary" disabled={actionLoading}>
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="btn-primary"
                style={{ backgroundColor: '#dc2626' }}
                disabled={actionLoading || !rejectReason.trim()}
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Soft Confirmation Modal for Expense Claim Submission */}
      <ConfirmDialog
        isOpen={showSubmitConfirm}
        title="Submit Expense Claim"
        message={`Are you sure you want to submit claim "${claim?.claim_number}" (${formatCurrency(claim?.total_amount ?? 0, claim?.currency)}) for Site Manager verification?`}
        confirmText="Submit Claim"
        cancelText="Cancel"
        variant="primary"
        isLoading={actionLoading}
        onConfirm={executeSubmitClaim}
        onClose={() => setShowSubmitConfirm(false)}
      />
    </div>
  )
}
