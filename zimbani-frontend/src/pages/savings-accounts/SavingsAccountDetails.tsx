import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  MdArrowBack,
  MdEdit,
  MdCheckCircle,
  MdPauseCircle,
  MdCancel,
  MdAttachMoney,
  MdCloudUpload,
  MdLandscape,
  MdHomeRepairService,
  MdPerson,
  MdCalendarToday,
  MdClose,
  MdReceipt,
  MdOpenInNew,
} from 'react-icons/md'
import { SavingsAccount } from '../../types/savings-account.types'
import { Document } from '../../types/document.types'
import savingsAccountService from '../../services/savings-account.service'
import documentService from '../../services/document.service'
import { DocumentUploadModal } from '../../components/documents/DocumentUploadModal'
import { DocumentsTable } from '../../components/documents/DocumentsTable'
import './SavingsAccountDetails.css'

export const SavingsAccountDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [account, setAccount] = useState<SavingsAccount | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Modals
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false)

  const [adjustModalOpen, setAdjustModalOpen] = useState<boolean>(false)
  const [adjustType, setAdjustType] = useState<'credit' | 'debit' | 'set_exact'>('credit')
  const [adjustAmount, setAdjustAmount] = useState<number | string>('')
  const [adjustReason, setAdjustReason] = useState<string>('')

  const [suspendModalOpen, setSuspendModalOpen] = useState<boolean>(false)
  const [suspendReason, setSuspendReason] = useState<string>('')

  const [closeModalOpen, setCloseModalOpen] = useState<boolean>(false)
  const [closeNotes, setCloseNotes] = useState<string>('')

  const fetchAccount = async () => {
    if (!id) return
    try {
      setLoading(true)
      setError(null)
      const data = await savingsAccountService.getSavingsAccount(id)
      setAccount(data)

      // Fetch Documents
      if (data.id) {
        documentService
          .getDocuments({
            documentable_type: 'savings_accounts',
            documentable_id: data.id.toString(),
            per_page: 50,
          })
          .then((res: any) => {
            const raw = res?.data?.data || res?.data || (Array.isArray(res) ? res : [])
            setDocuments(Array.isArray(raw) ? raw : [])
          })
          .catch(() => {})
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load savings account details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccount()
  }, [id])

  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(null), 5000)
  }

  const handleActivate = async () => {
    if (!account) return
    if (!window.confirm('Reactivate this savings account?')) return
    try {
      setActionLoading(true)
      await savingsAccountService.activateSavingsAccount(account.uuid)
      triggerSuccess('Savings account successfully reactivated!')
      fetchAccount()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to reactivate account.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!account) return
    const amt = Number(adjustAmount)
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid positive adjustment amount.')
      return
    }

    try {
      setActionLoading(true)
      await savingsAccountService.adjustBalance(account.uuid, {
        adjustment_type: adjustType,
        amount: amt,
        reason: adjustReason,
      })
      setAdjustModalOpen(false)
      setAdjustAmount('')
      setAdjustReason('')
      triggerSuccess('Account balance adjusted successfully!')
      fetchAccount()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to adjust balance.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSuspendSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!account) return
    try {
      setActionLoading(true)
      await savingsAccountService.suspendSavingsAccount(account.uuid, suspendReason)
      setSuspendModalOpen(false)
      setSuspendReason('')
      triggerSuccess('Savings account suspended.')
      fetchAccount()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to suspend account.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!account) return
    try {
      setActionLoading(true)
      await savingsAccountService.closeSavingsAccount(account.uuid, closeNotes)
      setCloseModalOpen(false)
      setCloseNotes('')
      triggerSuccess('Savings account closed successfully.')
      fetchAccount()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to close account.')
    } finally {
      setActionLoading(false)
    }
  }

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 100) return 'bar-teal'
    if (percentage >= 70) return 'bar-green'
    if (percentage >= 30) return 'bar-blue'
    return 'bar-amber'
  }

  if (loading) {
    return (
      <div className="savings-details-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading savings account details...</p>
        </div>
      </div>
    )
  }

  if (error || !account) {
    return (
      <div className="savings-details-container">
        <div className="error-banner">
          <p>{error || 'Savings account not found.'}</p>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/savings-accounts')}>
            Back to Savings Accounts
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="savings-details-container">
      {successMessage && <div className="success-banner">{successMessage}</div>}

      {/* Header */}
      <div className="details-header">
        <div className="details-title-group">
          <button
            className="action-icon-btn"
            onClick={() => navigate('/savings-accounts')}
            title="Back to Savings Accounts"
            style={{ marginRight: '0.25rem' }}
          >
            <MdArrowBack />
          </button>
          <div>
            <h1>
              <span>{account.account_number}</span>
              <span className={`status-badge badge-${account.status}`}>
                {account.status.toUpperCase()}
              </span>
              <span
                className={`scheme-type-badge ${
                  account.account_type === 'land_saving' ? 'scheme-land' : 'scheme-construction'
                }`}
              >
                {account.account_type === 'land_saving' ? <MdLandscape /> : <MdHomeRepairService />}
                {account.account_type === 'land_saving' ? 'Land Saving' : 'Construction Saving'}
              </span>
            </h1>
            <p className="details-subtitle">
              Client: <strong>{account.client?.name}</strong> ({account.client?.client_number}) • Scheme:{' '}
              <strong>{account.scheme_name || 'Standard Savings Scheme'}</strong>
            </p>
          </div>
        </div>

        <div className="details-header-actions">
          <button
            className="btn btn-success"
            onClick={() => {
              setAdjustType('credit')
              setAdjustAmount('')
              setAdjustReason('')
              setAdjustModalOpen(true)
            }}
          >
            <MdAttachMoney /> Deposit / Adjust
          </button>

          {account.status === 'suspended' && (
            <button
              className="btn btn-primary"
              onClick={handleActivate}
              disabled={actionLoading}
            >
              <MdCheckCircle /> Activate
            </button>
          )}

          {account.status === 'active' && (
            <button
              className="btn btn-warning"
              onClick={() => {
                setSuspendReason('')
                setSuspendModalOpen(true)
              }}
            >
              <MdPauseCircle /> Suspend
            </button>
          )}

          {account.status !== 'closed' && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                setCloseNotes('')
                setCloseModalOpen(true)
              }}
            >
              <MdCancel /> Close Account
            </button>
          )}

          <Link to={`/savings-accounts/${account.uuid}/edit`} className="btn btn-secondary">
            <MdEdit /> Edit
          </Link>

          <button className="btn btn-secondary" onClick={() => setUploadModalOpen(true)}>
            <MdCloudUpload /> Attach Files
          </button>
        </div>
      </div>

      {/* Financial Progress Hero Card */}
      <div className="savings-progress-hero">
        <div className="hero-balance-row">
          <div className="hero-balance-main">
            <span className="label">Current Accumulated Balance</span>
            <div className="val">
              {account.currency} {account.current_balance.toLocaleString()}
            </div>
          </div>

          <div className="hero-target-side">
            <span className="label">Target Scheme Goal</span>
            <div className="val">
              {account.currency} {account.target_amount.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Progress Bar Track */}
        <div className="hero-progress-track">
          <div
            className={`hero-progress-fill ${getProgressBarColor(account.progress_percentage)}`}
            style={{ width: `${account.progress_percentage}%` }}
          ></div>
        </div>

        <div className="hero-meta-row">
          <div>
            <strong>{account.progress_percentage}%</strong> Completed
          </div>
          <div>
            {account.remaining_amount > 0 ? (
              <span>
                Remaining to Target:{' '}
                <strong>
                  {account.currency} {account.remaining_amount.toLocaleString()}
                </strong>
              </span>
            ) : (
              <strong style={{ color: '#0d9488' }}>Target Goal Achieved! 🎉</strong>
            )}
          </div>
        </div>
      </div>

      {/* Two-Column Grid */}
      <div className="details-grid">
        {/* Main Column */}
        <div className="details-main-col">
          {/* Associated Real Estate Asset / Target */}
          {account.account_type === 'land_saving' ? (
            <div className="details-card">
              <div className="details-card-header">
                <h2>
                  <MdLandscape /> Linked Plot / Land Unit
                </h2>
                {account.plot && (
                  <Link
                    to={`/units/${account.plot.uuid || account.plot.id}`}
                    className="btn btn-secondary btn-sm"
                  >
                    View Plot <MdOpenInNew />
                  </Link>
                )}
              </div>

              {account.plot ? (
                <div className="linked-asset-box">
                  <div className="linked-asset-info">
                    <h3>
                      Plot {account.plot.unit_number}{' '}
                      {account.plot.block_number ? `(Block ${account.plot.block_number})` : ''}
                    </h3>
                    <p>
                      Type: <strong>{account.plot.unit_type || 'Residential Plot'}</strong> • Price:{' '}
                      <strong>UGX {Number(account.plot.current_price || 0).toLocaleString()}</strong> • Status:{' '}
                      <span className="status-badge" style={{ textTransform: 'capitalize' }}>
                        {account.plot.status || 'Reserved'}
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="details-empty-state" style={{ padding: '1.5rem', textAlign: 'center' }}>
                  <p style={{ color: '#64748b', margin: 0 }}>
                    No specific plot pre-allocated. Savings can be applied to any available plot in Fab Homes estates upon scheme completion.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="details-card">
              <div className="details-card-header">
                <h2>
                  <MdHomeRepairService /> Linked Construction Project
                </h2>
                {account.project && (
                  <Link
                    to={`/projects/${account.project.uuid || account.project.id}`}
                    className="btn btn-secondary btn-sm"
                  >
                    View Project <MdOpenInNew />
                  </Link>
                )}
              </div>

              {account.project ? (
                <div className="linked-asset-box">
                  <div className="linked-asset-info">
                    <h3>{account.project.name}</h3>
                    <p>
                      Project Code: <strong>{account.project.code || 'N/A'}</strong>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="details-empty-state" style={{ padding: '1.5rem', textAlign: 'center' }}>
                  <p style={{ color: '#64748b', margin: 0 }}>
                    General construction savings pool. Funds can be allocated to construction milestones when site work commences.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Recent Deposits & Payments */}
          <div className="details-card">
            <div className="details-card-header">
              <h2>
                <MdReceipt /> Recent Payments & Deposits
              </h2>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setAdjustType('credit')
                  setAdjustAmount('')
                  setAdjustReason('')
                  setAdjustModalOpen(true)
                }}
              >
                <MdAttachMoney /> Record Payment
              </button>
            </div>

            {!account.payments || account.payments.length === 0 ? (
              <div className="details-empty-state" style={{ padding: '2rem', textAlign: 'center' }}>
                <MdReceipt style={{ fontSize: '2.5rem', color: '#cbd5e1' }} />
                <h3 style={{ margin: '0.5rem 0 0.25rem 0' }}>No Payments Logged Yet</h3>
                <p style={{ color: '#64748b' }}>
                  Record the first installment or mobile money deposit for this savings account.
                </p>
              </div>
            ) : (
              <div className="embedded-table-wrap">
                <table className="embedded-table">
                  <thead>
                    <tr>
                      <th>Payment #</th>
                      <th>Date</th>
                      <th>Method</th>
                      <th>Amount (UGX)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {account.payments.map((p: any) => (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.payment_number}</strong>
                        </td>
                        <td>{p.payment_date}</td>
                        <td style={{ textTransform: 'capitalize' }}>
                          {p.payment_method?.replace('_', ' ') || 'Cash / Mobile Money'}
                        </td>
                        <td>
                          <strong>UGX {Number(p.amount).toLocaleString()}</strong>
                        </td>
                        <td>
                          <span className={`status-badge badge-${p.status || 'confirmed'}`}>
                            {(p.status || 'confirmed').toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Attached Documents */}
          <div className="details-card">
            <div className="details-card-header">
              <h2>
                <MdCloudUpload /> Scheme Contracts & Documents
              </h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setUploadModalOpen(true)}>
                <MdCloudUpload /> Upload Document
              </button>
            </div>

            <DocumentsTable
              documents={documents}
              onRefresh={fetchAccount}
            />
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="details-side-col">
          {/* Client Owner Card */}
          <div className="details-card">
            <div className="details-card-header">
              <h2>
                <MdPerson /> Account Owner
              </h2>
              {account.client && (
                <Link
                  to={`/clients/${account.client.uuid || account.client.id}`}
                  className="btn btn-secondary btn-sm"
                >
                  Profile
                </Link>
              )}
            </div>

            <div className="info-row">
              <span className="label">Full Name:</span>
              <span className="val">{account.client?.name}</span>
            </div>
            <div className="info-row">
              <span className="label">Client Ref:</span>
              <span className="val">{account.client?.client_number}</span>
            </div>
            {account.client?.phone && (
              <div className="info-row">
                <span className="label">Phone:</span>
                <span className="val">{account.client.phone}</span>
              </div>
            )}
            {account.client?.email && (
              <div className="info-row">
                <span className="label">Email:</span>
                <span className="val">{account.client.email}</span>
              </div>
            )}
          </div>

          {/* Scheme Meta & Dates */}
          <div className="details-card">
            <div className="details-card-header">
              <h2>
                <MdCalendarToday /> Scheme Terms & Audit
              </h2>
            </div>

            <div className="info-row">
              <span className="label">Account Number:</span>
              <span className="val">{account.account_number}</span>
            </div>
            <div className="info-row">
              <span className="label">Opening Date:</span>
              <span className="val">{account.opened_date}</span>
            </div>
            {account.target_date && (
              <div className="info-row">
                <span className="label">Target Date:</span>
                <span className="val">{account.target_date}</span>
              </div>
            )}
            {account.closed_date && (
              <div className="info-row">
                <span className="label">Closure Date:</span>
                <span className="val">{account.closed_date}</span>
              </div>
            )}
            <div className="info-row">
              <span className="label">Currency:</span>
              <span className="val">{account.currency}</span>
            </div>
            <div className="info-row">
              <span className="label">Created By:</span>
              <span className="val">{account.created_by?.name || 'Finance Desk'}</span>
            </div>
          </div>

          {/* Account Notes */}
          {account.notes && (
            <div className="details-card">
              <div className="details-card-header">
                <h2>Account Notes</h2>
              </div>
              <div
                style={{
                  fontSize: '0.875rem',
                  color: '#334155',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.6',
                  background: '#f8fafc',
                  padding: '0.85rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #f1f5f9',
                }}
              >
                {account.notes}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODALS                                                                    */}
      {/* ========================================================================= */}

      {/* Adjust Balance / Deposit Modal */}
      {adjustModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Adjust Balance — {account.account_number}</h2>
              <button className="modal-close-btn" onClick={() => setAdjustModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleAdjustSubmit}>
              <div className="modal-body">
                <p>
                  Current Balance: <strong>UGX {account.current_balance.toLocaleString()}</strong>
                </p>

                <div className="form-group">
                  <label>Adjustment Type *</label>
                  <select
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value as any)}
                    required
                  >
                    <option value="credit">Credit (+) Deposit Funds to Account</option>
                    <option value="debit">Debit (-) Disburse / Deduct Funds</option>
                    <option value="set_exact">Set Exact Reconciled Balance</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Amount (UGX) *</label>
                  <input
                    type="number"
                    step="1000"
                    min="1000"
                    required
                    placeholder="e.g. 5000000"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Reason / Audit Note *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. Client deposited cash via finance desk / mobile money reconciliation"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setAdjustModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Apply Balance Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {suspendModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Suspend Account — {account.account_number}</h2>
              <button className="modal-close-btn" onClick={() => setSuspendModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleSuspendSubmit}>
              <div className="modal-body">
                <p>
                  Suspend savings account for <strong>{account.client?.name}</strong>.
                </p>
                <div className="form-group">
                  <label>Suspension Reason</label>
                  <textarea
                    rows={3}
                    placeholder="Reason for temporary suspension..."
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSuspendModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-warning" disabled={actionLoading}>
                  {actionLoading ? 'Suspending...' : 'Suspend Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Modal */}
      {closeModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Close Savings Account — {account.account_number}</h2>
              <button className="modal-close-btn" onClick={() => setCloseModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleCloseSubmit}>
              <div className="modal-body">
                <p>
                  Closing savings account for <strong>{account.client?.name}</strong> (Balance: UGX{' '}
                  {account.current_balance.toLocaleString()}).
                </p>
                <div className="form-group">
                  <label>Closing Notes / Handover Details</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Target reached, plot deed handed over to client..."
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setCloseModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger" disabled={actionLoading}>
                  {actionLoading ? 'Closing...' : 'Confirm Account Closure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Polymorphic Document Upload Modal */}
      {uploadModalOpen && (
        <DocumentUploadModal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          onSuccess={() => {
            setUploadModalOpen(false)
            fetchAccount()
            triggerSuccess('Savings account document uploaded successfully!')
          }}
          defaultDocumentableType="savings_accounts"
          defaultDocumentableId={account.id.toString()}
          title="Upload Savings Scheme Contract or Receipt"
        />
      )}
    </div>
  )
}

export default SavingsAccountDetails
