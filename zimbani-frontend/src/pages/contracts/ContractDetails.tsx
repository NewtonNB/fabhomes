import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  MdArrowBack,
  MdEdit,
  MdPlayArrow,
  MdPauseCircle,
  MdCancel,
  MdAdd,
  MdVisibility,
  MdClose,
} from 'react-icons/md'
import contractService from '../../services/contract.service'
import { SubcontractorContract } from '../../types/contract.types'
import { PaymentCertificate } from '../../types/certificate.types'
import './ContractDetails.css'

export const ContractDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [contract, setContract] = useState<SubcontractorContract | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Modals
  const [suspendModalOpen, setSuspendModalOpen] = useState<boolean>(false)
  const [suspendReason, setSuspendReason] = useState<string>('')
  const [terminateModalOpen, setTerminateModalOpen] = useState<boolean>(false)
  const [terminateReason, setTerminateReason] = useState<string>('')

  const notifySuccess = (msg: string) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  const fetchContract = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      setError(null)
      const data = await contractService.getSubcontractorContract(id)
      setContract(data)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load subcontractor contract.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchContract()
  }, [fetchContract])

  const handleActivate = async () => {
    if (!contract) return
    if (!window.confirm(`Activate contract ${contract.contract_number}?`)) return
    try {
      setActionLoading(true)
      const updated = await contractService.activateSubcontractorContract(contract.uuid)
      setContract(updated)
      notifySuccess(`Contract ${updated.contract_number} has been activated.`)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to activate contract.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSuspend = async () => {
    if (!contract) return
    try {
      setActionLoading(true)
      const updated = await contractService.suspendSubcontractorContract(contract.uuid, suspendReason)
      setContract(updated)
      setSuspendModalOpen(false)
      setSuspendReason('')
      notifySuccess(`Contract ${updated.contract_number} has been suspended.`)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to suspend contract.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleTerminate = async () => {
    if (!contract || !terminateReason.trim()) {
      alert('Termination reason is required.')
      return
    }
    try {
      setActionLoading(true)
      const updated = await contractService.terminateSubcontractorContract(contract.uuid, terminateReason)
      setContract(updated)
      setTerminateModalOpen(false)
      setTerminateReason('')
      notifySuccess(`Contract ${updated.contract_number} has been terminated.`)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to terminate contract.')
    } finally {
      setActionLoading(false)
    }
  }

  const formatCurrency = (val: number, currency: string = 'UGX') => {
    return `${currency} ${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  if (loading) {
    return (
      <div className="contract-details-page">
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div className="spinner"></div>
          <p>Loading contract details...</p>
        </div>
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="contract-details-page">
        <div className="alert-error">Contract not found.</div>
        <button className="btn-secondary" onClick={() => navigate('/contracts')}>
          <MdArrowBack /> Return to Contracts
        </button>
      </div>
    )
  }

  const certificates: PaymentCertificate[] = contract.payment_certificates || []

  return (
    <div className="contract-details-page">
      {/* Header */}
      <div className="details-header">
        <div>
          <div className="title-badge-group">
            <h1>{contract.title}</h1>
            <span className={`badge badge-${contract.status}`}>{contract.status}</span>
            <span className="badge badge-trade">{contract.trade_category}</span>
          </div>
          <div className="contract-meta-line">
            <span>Contract No: <strong>{contract.contract_number}</strong></span>
            <span>Subcontractor: <strong>{contract.subcontractor_name}</strong></span>
            <span>Site: <strong>{contract.site?.name || 'Site'}</strong></span>
            <span>Project: <strong>{contract.project?.name || 'Project'}</strong></span>
          </div>
        </div>

        <div className="header-button-group">
          <button className="btn-secondary" onClick={() => navigate('/contracts')}>
            <MdArrowBack /> Back
          </button>

          {contract.status === 'draft' && (
            <button className="btn-primary" style={{ backgroundColor: '#16a34a' }} onClick={handleActivate} disabled={actionLoading}>
              <MdPlayArrow /> Activate Contract
            </button>
          )}

          {contract.status === 'active' && (
            <>
              <Link to={`/certificates/new?contract_id=${contract.uuid}`} className="btn-primary">
                <MdAdd /> Issue Valuation Certificate
              </Link>
              <button
                className="btn-secondary"
                style={{ color: '#d97706', borderColor: '#fde68a' }}
                onClick={() => setSuspendModalOpen(true)}
                disabled={actionLoading}
              >
                <MdPauseCircle /> Suspend
              </button>
            </>
          )}

          {['draft', 'active', 'suspended'].includes(contract.status) && (
            <button
              className="btn-secondary"
              style={{ color: '#dc2626', borderColor: '#fecaca' }}
              onClick={() => setTerminateModalOpen(true)}
              disabled={actionLoading}
            >
              <MdCancel /> Terminate
            </button>
          )}

          {!['terminated', 'completed'].includes(contract.status) && (
            <Link to={`/contracts/${contract.uuid}/edit`} className="btn-secondary">
              <MdEdit /> Edit
            </Link>
          )}
        </div>
      </div>

      {successMessage && <div className="alert-success">{successMessage}</div>}
      {error && <div className="alert-error">{error}</div>}

      {/* Financial Metrics Cards */}
      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-title">Contract Sum</div>
          <div className="metric-value">{formatCurrency(contract.contract_sum, contract.currency)}</div>
          <div className="metric-subtitle">Retention Rate: {contract.retention_percentage}%</div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Certified Gross Work</div>
          <div className="metric-value" style={{ color: '#0284c7' }}>
            {formatCurrency(contract.total_certified_gross, contract.currency)}
          </div>
          <div className="metric-subtitle">
            {contract.percentage_completed}% of total contract sum
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Total Retention Held</div>
          <div className="metric-value" style={{ color: '#d97706' }}>
            {formatCurrency(contract.total_retention_held, contract.currency)}
          </div>
          <div className="metric-subtitle">Held pool to date</div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Total Paid (Disbursed)</div>
          <div className="metric-value" style={{ color: '#16a34a' }}>
            {formatCurrency(contract.total_paid, contract.currency)}
          </div>
          <div className="metric-subtitle">
            Net certified payable: {formatCurrency(contract.total_net_payable, contract.currency)}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Remaining Balance</div>
          <div className="metric-value">{formatCurrency(contract.remaining_balance, contract.currency)}</div>
          <div className="metric-subtitle">Uncertified contract sum</div>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="details-grid">
        {/* Left Column: Scope, Dates, & Terms */}
        <div>
          <div className="content-card">
            <h3 className="content-card-title">Scope of Work & Specifications</h3>
            <div className="scope-text-box">{contract.scope_of_work}</div>
          </div>

          <div className="content-card">
            <h3 className="content-card-title">Commercial Terms & Timeline</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-item-label">Start Date</span>
                <span className="info-item-value">{contract.start_date}</span>
              </div>
              <div className="info-item">
                <span className="info-item-label">Expected Completion</span>
                <span className="info-item-value">{contract.expected_completion_date}</span>
              </div>
              <div className="info-item">
                <span className="info-item-label">Actual Completion</span>
                <span className="info-item-value">{contract.actual_completion_date || 'Pending'}</span>
              </div>
              <div className="info-item">
                <span className="info-item-label">Budgeted Retention Pool</span>
                <span className="info-item-value">{formatCurrency(contract.retention_amount, contract.currency)}</span>
              </div>
            </div>

            {contract.payment_terms && (
              <div style={{ marginTop: '1.25rem' }}>
                <span className="info-item-label">Payment Terms & Milestones</span>
                <p style={{ margin: '0.25rem 0 0 0', color: '#334155', fontSize: '0.875rem' }}>
                  {contract.payment_terms}
                </p>
              </div>
            )}

            {contract.notes && (
              <div style={{ marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                <span className="info-item-label">Administrative Notes & Audit</span>
                <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                  {contract.notes}
                </p>
              </div>
            )}
          </div>

          {/* Payment Certificates Table */}
          <div className="content-card">
            <div className="content-card-title">
              <span>Valuation & Payment Certificates ({certificates.length})</span>
              {contract.status === 'active' && (
                <Link to={`/certificates/new?contract_id=${contract.uuid}`} className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                  <MdAdd /> Issue Certificate
                </Link>
              )}
            </div>

            {certificates.length === 0 ? (
              <p style={{ color: '#64748b', margin: '1rem 0' }}>No valuation certificates have been submitted for this contract yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="cert-table">
                  <thead>
                    <tr>
                      <th>Certificate #</th>
                      <th>Type</th>
                      <th>Period End</th>
                      <th>Gross Valuation</th>
                      <th>Retention (5%)</th>
                      <th>WHT (6%)</th>
                      <th>Net Certified</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certificates.map((cert) => (
                      <tr key={cert.uuid}>
                        <td style={{ fontWeight: 600, color: '#2563eb' }}>{cert.certificate_number}</td>
                        <td style={{ textTransform: 'capitalize' }}>{cert.certificate_type?.replace('_', ' ')}</td>
                        <td>{cert.valuation_period_end}</td>
                        <td>{formatCurrency(cert.gross_amount, cert.currency)}</td>
                        <td style={{ color: '#d97706' }}>{formatCurrency(cert.retention_deducted, cert.currency)}</td>
                        <td style={{ color: '#475569' }}>{formatCurrency(cert.withholding_tax_amount, cert.currency)}</td>
                        <td style={{ fontWeight: 600, color: '#16a34a' }}>{formatCurrency(cert.net_certified_amount, cert.currency)}</td>
                        <td>
                          <span className={`badge badge-${cert.status}`}>{cert.status?.replace(/_/g, ' ')}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="action-btn view"
                            onClick={() => navigate(`/certificates/${cert.uuid}`)}
                            title="View Certificate"
                          >
                            <MdVisibility />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Subcontractor & Audit Info */}
        <div>
          <div className="content-card">
            <h3 className="content-card-title">Subcontractor Contact Profile</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div className="info-item">
                <span className="info-item-label">Trading Entity</span>
                <span className="info-item-value" style={{ fontWeight: 600 }}>{contract.subcontractor_name}</span>
              </div>
              {contract.subcontractor_contact_person && (
                <div className="info-item">
                  <span className="info-item-label">Contact Person</span>
                  <span className="info-item-value">{contract.subcontractor_contact_person}</span>
                </div>
              )}
              <div className="info-item">
                <span className="info-item-label">Phone</span>
                <span className="info-item-value">{contract.subcontractor_phone}</span>
              </div>
              {contract.subcontractor_email && (
                <div className="info-item">
                  <span className="info-item-label">Email</span>
                  <span className="info-item-value">{contract.subcontractor_email}</span>
                </div>
              )}
              {contract.tax_identification_number && (
                <div className="info-item">
                  <span className="info-item-label">Tax ID Number (TIN)</span>
                  <span className="info-item-value" style={{ fontFamily: 'monospace' }}>
                    {contract.tax_identification_number}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="content-card">
            <h3 className="content-card-title">Contract Governance & Sign-off</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div className="info-item">
                <span className="info-item-label">Created By</span>
                <span className="info-item-value">{contract.created_by_user?.name || `User #${contract.created_by}`}</span>
              </div>
              <div className="info-item">
                <span className="info-item-label">Created At</span>
                <span className="info-item-value">{new Date(contract.created_at).toLocaleString()}</span>
              </div>
              {contract.signed_at && (
                <div className="info-item">
                  <span className="info-item-label">Signed / Activated At</span>
                  <span className="info-item-value" style={{ color: '#16a34a' }}>
                    {new Date(contract.signed_at).toLocaleString()}
                  </span>
                </div>
              )}
              {contract.signed_by_user && (
                <div className="info-item">
                  <span className="info-item-label">Activated By</span>
                  <span className="info-item-value">{contract.signed_by_user.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Suspend Modal */}
      {suspendModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Suspend Contract</h3>
              <button className="modal-close" onClick={() => setSuspendModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#475569', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Temporarily suspend active works under contract <strong>{contract.contract_number}</strong>.
              </p>
              <div className="form-group">
                <label>Reason for Suspension</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="e.g. Inclement weather, delayed material supply, or structural redesign..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSuspendModalOpen(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                style={{ backgroundColor: '#d97706' }}
                onClick={handleSuspend}
                disabled={actionLoading}
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terminate Modal */}
      {terminateModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Terminate Contract</h3>
              <button className="modal-close" onClick={() => setTerminateModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Warning: Terminating this contract will cancel all open works. This action is irreversible.
              </p>
              <div className="form-group">
                <label>Termination Cause & Justification (Required)</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={terminateReason}
                  onChange={(e) => setTerminateReason(e.target.value)}
                  placeholder="State non-performance, breach of safety covenants, or mutual agreement..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setTerminateModalOpen(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                style={{ backgroundColor: '#dc2626' }}
                onClick={handleTerminate}
                disabled={actionLoading || !terminateReason.trim()}
              >
                Confirm Termination
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ContractDetails
