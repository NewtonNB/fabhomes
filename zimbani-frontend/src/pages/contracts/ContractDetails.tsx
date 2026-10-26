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
  MdShield,
  MdLayers,
  MdDelete,
} from 'react-icons/md'
import contractService from '../../services/contract.service'
import subcontractorMilestoneService from '../../services/subcontractor-milestone.service'
import api from '../../config/api'
import { SubcontractorContract } from '../../types/contract.types'
import { PaymentCertificate } from '../../types/certificate.types'
import { ContractMilestone, ContractMilestoneProgress } from '../../types/subcontractor-milestone.types'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import './ContractDetails.css'

export const ContractDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [contract, setContract] = useState<SubcontractorContract | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showActivateConfirm, setShowActivateConfirm] = useState<boolean>(false)

  // Subcontractor Milestone Valuation States (Phase 8 Day 3)
  const [contractMilestones, setContractMilestones] = useState<ContractMilestone[]>([])
  const [milestoneProgress, setMilestoneProgress] = useState<ContractMilestoneProgress | null>(null)
  const [availableMilestones, setAvailableMilestones] = useState<any[]>([])
  const [allocateModalOpen, setAllocateModalOpen] = useState<boolean>(false)
  const [allocationItems, setAllocationItems] = useState<Array<{
    milestone_id: number
    allocated_amount: number
    weight_percentage: number
    notes: string
  }>>([])
  const [retentionModalOpen, setRetentionModalOpen] = useState<boolean>(false)
  const [retentionNotes, setRetentionNotes] = useState<string>(
    'Defect liability inspection completed with QS and Site Engineer. All minor snags rectified.'
  )

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

      try {
        const milestones = await subcontractorMilestoneService.getContractMilestones(data.uuid)
        setContractMilestones(milestones)
        const progress = await subcontractorMilestoneService.getContractMilestoneProgress(data.uuid)
        setMilestoneProgress(progress)
      } catch (mErr) {
        console.warn('Could not fetch contract milestone progress', mErr)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load subcontractor contract.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchContract()
  }, [fetchContract])

  const handleActivate = () => {
    setShowActivateConfirm(true)
  }

  const executeActivate = async () => {
    if (!contract) return
    try {
      setActionLoading(true)
      const updated = await contractService.activateSubcontractorContract(contract.uuid)
      setContract(updated)
      setShowActivateConfirm(false)
      notifySuccess(`Contract ${updated.contract_number} has been activated.`)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to activate contract.')
      setShowActivateConfirm(false)
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
      setError('Termination reason is required.')
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

  // Handle opening Allocate Milestones Modal
  const handleOpenAllocateModal = async () => {
    if (!contract) return
    try {
      setActionLoading(true)
      const res = await api.get<{ data: any[] }>(`/milestones?project_id=${contract.project_id}`)
      const pMilestones = res.data.data || []
      setAvailableMilestones(pMilestones)

      if (contractMilestones.length > 0) {
        setAllocationItems(
          contractMilestones.map((cm) => ({
            milestone_id: cm.milestone_id,
            allocated_amount: Number(cm.allocated_amount),
            weight_percentage: Number(cm.weight_percentage || 0),
            notes: cm.notes || '',
          }))
        )
      } else if (pMilestones.length > 0) {
        setAllocationItems([
          {
            milestone_id: pMilestones[0].id,
            allocated_amount: Number(contract.contract_sum),
            weight_percentage: 100,
            notes: 'Primary trade work package',
          },
        ])
      }
      setAllocateModalOpen(true)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load project milestones.')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Saving Milestone Allocations
  const handleSaveAllocations = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contract) return

    const validItems = allocationItems.filter((i) => i.milestone_id > 0 && i.allocated_amount > 0)
    if (validItems.length === 0) {
      setError('Please select at least one milestone and enter an allocated amount.')
      return
    }

    try {
      setActionLoading(true)
      await subcontractorMilestoneService.allocateMilestones(contract.uuid, {
        milestones: validItems,
      })
      notifySuccess('Work package milestones allocated to contract successfully.')
      setAllocateModalOpen(false)
      fetchContract()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to allocate milestones.')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Generating 5% Defect Liability Retention Release Certificate
  const handleReleaseRetention = async () => {
    if (!contract) return
    try {
      setActionLoading(true)
      const cert = await subcontractorMilestoneService.generateRetentionReleaseCertificate(contract.uuid, {
        notes: retentionNotes,
      })
      notifySuccess(`Retention Release Certificate ${cert.certificate_number} generated successfully.`)
      setRetentionModalOpen(false)
      fetchContract()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to release retention.')
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
              <button
                className="btn-secondary"
                style={{ color: '#2563eb', borderColor: '#bfdbfe' }}
                onClick={handleOpenAllocateModal}
                disabled={actionLoading}
                title="Allocate Project Milestones"
              >
                <MdLayers /> Allocate Milestones
              </button>
              <Link to={`/certificates/new?contract_id=${contract.uuid}`} className="btn-primary">
                <MdAdd /> Issue Valuation Certificate
              </Link>
              {Number(contract.total_retention_held) > 0 && (
                <button
                  className="btn-secondary"
                  style={{ color: '#059669', borderColor: '#a7f3d0' }}
                  onClick={() => setRetentionModalOpen(true)}
                  disabled={actionLoading}
                  title="Generate Defect Liability Retention Release Certificate"
                >
                  <MdShield /> Release 5% Retention
                </button>
              )}
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

          {/* Allocated Construction Milestones Card (Phase 8 Day 3) */}
          <div className="content-card">
            <div className="content-card-title">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MdLayers style={{ color: '#2563eb', fontSize: '1.2rem' }} />
                <span>Allocated Milestone Work Packages ({contractMilestones.length})</span>
              </div>
              {contract.status === 'active' && (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                  onClick={handleOpenAllocateModal}
                >
                  <MdAdd /> {contractMilestones.length > 0 ? 'Edit Allocations' : 'Allocate Milestones'}
                </button>
              )}
            </div>

            {milestoneProgress && (
              <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                  <span style={{ color: '#475569', fontWeight: 600 }}>Allocation Coverage:</span>
                  <span style={{ fontWeight: 700, color: milestoneProgress.total_allocated >= milestoneProgress.contract_sum ? '#16a34a' : '#d97706' }}>
                    {formatCurrency(milestoneProgress.total_allocated, contract.currency)} / {formatCurrency(milestoneProgress.contract_sum, contract.currency)} (
                    {Math.round((milestoneProgress.total_allocated / (milestoneProgress.contract_sum || 1)) * 100)}%)
                  </span>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, Math.round((milestoneProgress.total_allocated / (milestoneProgress.contract_sum || 1)) * 100))}%`,
                      backgroundColor: milestoneProgress.total_allocated >= milestoneProgress.contract_sum ? '#16a34a' : '#2563eb',
                    }}
                  />
                </div>
              </div>
            )}

            {contractMilestones.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                <p style={{ margin: '0 0 0.5rem 0' }}>No construction milestones have been allocated to this contract yet.</p>
                <p style={{ fontSize: '0.8rem', margin: 0, color: '#94a3b8' }}>
                  Link this contract to project construction milestones to track certified progress and enable one-click Interim Payment Certificates.
                </p>
                {contract.status === 'active' && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}
                    onClick={handleOpenAllocateModal}
                  >
                    <MdAdd /> Allocate Milestones Now
                  </button>
                )}
              </div>
            ) : (
              <div className="table-responsive">
                <table className="cert-table">
                  <thead>
                    <tr>
                      <th>Order & Milestone</th>
                      <th>Allocated Sum</th>
                      <th>Weight</th>
                      <th>QS Certified</th>
                      <th>Paid Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contractMilestones.map((cm) => (
                      <tr key={cm.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>
                            #{cm.milestone?.milestone_order || '—'} {cm.milestone?.milestone_name || 'Work Package'}
                          </div>
                          {cm.notes && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{cm.notes}</div>
                          )}
                        </td>
                        <td style={{ fontWeight: 600 }}>{formatCurrency(cm.allocated_amount, contract.currency)}</td>
                        <td>{cm.weight_percentage ? `${cm.weight_percentage}%` : '—'}</td>
                        <td>
                          <div style={{ color: '#0284c7', fontWeight: 600 }}>
                            {formatCurrency(cm.certified_amount, contract.currency)}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            {cm.percentage_certified}% of allocated
                          </div>
                        </td>
                        <td style={{ color: '#16a34a', fontWeight: 600 }}>
                          {formatCurrency(cm.paid_amount, contract.currency)}
                        </td>
                        <td>
                          <span className={`badge badge-${cm.status}`}>{cm.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

      {/* Allocate Milestones Modal (Phase 8 Day 3) */}
      {allocateModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '750px', width: '95%' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>Allocate Construction Milestones</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Assign trade work packages to contract {contract.contract_number} ({formatCurrency(contract.contract_sum, contract.currency)})
                </span>
              </div>
              <button className="modal-close" onClick={() => setAllocateModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleSaveAllocations}>
              <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                <p style={{ color: '#475569', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  Allocate project milestones to track execution progress, enable QS milestone certifications, and issue interim valuations.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {allocationItems.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        display: 'grid',
                        gridTemplateColumns: '2fr 1.2fr 0.8fr 1.5fr auto',
                        gap: '0.5rem',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', display: 'block' }}>
                          Milestone Package
                        </label>
                        <select
                          className="form-control"
                          style={{ fontSize: '0.825rem', padding: '0.35rem 0.5rem' }}
                          value={item.milestone_id}
                          onChange={(e) => {
                            const val = Number(e.target.value)
                            setAllocationItems((items) =>
                              items.map((it, i) => (i === idx ? { ...it, milestone_id: val } : it))
                            )
                          }}
                          required
                        >
                          <option value="">Select Milestone...</option>
                          {availableMilestones.map((m) => (
                            <option key={m.id} value={m.id}>
                              #{m.milestone_order} - {m.milestone_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', display: 'block' }}>
                          Allocated Amount ({contract.currency})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="form-control"
                          style={{ fontSize: '0.825rem', padding: '0.35rem 0.5rem' }}
                          value={item.allocated_amount}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0
                            setAllocationItems((items) =>
                              items.map((it, i) => (i === idx ? { ...it, allocated_amount: val } : it))
                            )
                          }}
                          required
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', display: 'block' }}>
                          Weight %
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          className="form-control"
                          style={{ fontSize: '0.825rem', padding: '0.35rem 0.5rem' }}
                          value={item.weight_percentage}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0
                            setAllocationItems((items) =>
                              items.map((it, i) => (i === idx ? { ...it, weight_percentage: val } : it))
                            )
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', display: 'block' }}>
                          Notes / Scope
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ fontSize: '0.825rem', padding: '0.35rem 0.5rem' }}
                          placeholder="e.g. Footings package"
                          value={item.notes}
                          onChange={(e) => {
                            const val = e.target.value
                            setAllocationItems((items) =>
                              items.map((it, i) => (i === idx ? { ...it, notes: val } : it))
                            )
                          }}
                        />
                      </div>

                      <div style={{ paddingTop: '1rem' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setAllocationItems((items) => items.filter((_, i) => i !== idx))
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#dc2626',
                            cursor: 'pointer',
                            fontSize: '1.2rem',
                          }}
                          title="Remove item"
                        >
                          <MdDelete />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                    onClick={() => {
                      const firstAvailable =
                        availableMilestones.find((m) => !allocationItems.some((ai) => ai.milestone_id === m.id)) ||
                        availableMilestones[0]
                      setAllocationItems((items) => [
                        ...items,
                        {
                          milestone_id: firstAvailable ? firstAvailable.id : 0,
                          allocated_amount: 0,
                          weight_percentage: 0,
                          notes: '',
                        },
                      ])
                    }}
                  >
                    <MdAdd /> Add Milestone Package
                  </button>

                  <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                    <span style={{ color: '#64748b' }}>Total Allocated: </span>
                    <strong
                      style={{
                        color:
                          allocationItems.reduce((acc, curr) => acc + (Number(curr.allocated_amount) || 0), 0) ===
                          Number(contract.contract_sum)
                            ? '#16a34a'
                            : '#d97706',
                      }}
                    >
                      {formatCurrency(
                        allocationItems.reduce((acc, curr) => acc + (Number(curr.allocated_amount) || 0), 0),
                        contract.currency
                      )}
                    </strong>
                    <span style={{ color: '#94a3b8' }}> / {formatCurrency(contract.contract_sum, contract.currency)}</span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setAllocateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Save Milestone Allocations'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Retention Release Certificate Modal (Phase 8 Day 3) */}
      {retentionModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MdShield style={{ color: '#059669', fontSize: '1.25rem' }} />
                <h3 style={{ margin: 0 }}>Release 5% Defect Liability Retention</h3>
              </div>
              <button className="modal-close" onClick={() => setRetentionModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <div className="modal-body">
              <div
                style={{
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#047857', textTransform: 'uppercase' }}>
                  Total Retention Held in Reserve
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#065f46' }}>
                  {formatCurrency(contract.total_retention_held, contract.currency)}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#047857', marginTop: '0.25rem' }}>
                  5% of total certified works to date
                </div>
              </div>

              <p style={{ color: '#475569', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Generating this certificate authorizes final payout of held warranty retention to{' '}
                <strong>{contract.subcontractor_name}</strong> following completion of the defect liability period.
              </p>

              <div className="form-group">
                <label>Warranty Inspection Notes & Defect Clearance</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={retentionNotes}
                  onChange={(e) => setRetentionNotes(e.target.value)}
                  placeholder="Record final warranty site inspection date, QS approval notes, and snag clearance..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setRetentionModalOpen(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                style={{ backgroundColor: '#059669' }}
                onClick={handleReleaseRetention}
                disabled={actionLoading}
              >
                {actionLoading ? 'Generating...' : 'Confirm & Issue Release Certificate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Soft Confirmation Modal for Contract Activation */}
      <ConfirmDialog
        isOpen={showActivateConfirm}
        title="Activate Subcontractor Contract"
        message={`Are you sure you want to activate contract ${contract?.contract_number} for ${contract?.subcontractor_name}? This will lock baseline terms and allow payment certificates.`}
        confirmText="Activate Contract"
        cancelText="Cancel"
        variant="primary"
        isLoading={actionLoading}
        onConfirm={executeActivate}
        onClose={() => setShowActivateConfirm(false)}
      />
    </div>
  )
}

export default ContractDetails
