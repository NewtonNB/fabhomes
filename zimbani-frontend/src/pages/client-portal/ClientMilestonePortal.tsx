import React, { useState, useEffect, useCallback } from 'react'
import {
  MdCheckCircle,
  MdPendingActions,
  MdVerified,
  MdAttachMoney,
  MdShield,
  MdSearch,
  MdRefresh,
  MdThumbUp,
  MdThumbDown,
  MdPhotoCamera,
  MdClose,
  MdWarning,
  MdGpsFixed,
  MdFlag,
  MdHome,
  MdInsertDriveFile,
} from 'react-icons/md'
import clientPortalService from '../../services/client-portal.service'
import projectService from '../../services/project.service'
import unitService from '../../services/unit.service'
import {
  ClientMilestoneVerification,
  ClientMilestoneSummary,
  MilestoneProgressPhoto,
  PhotoStage,
} from '../../types/client-milestone.types'
import { Project } from '../../types/project.types'
import { Unit } from '../../types/unit.types'
import './ClientMilestonePortal.css'

export const ClientMilestonePortal: React.FC = () => {
  // Data states
  const [verifications, setVerifications] = useState<ClientMilestoneVerification[]>([])
  const [summary, setSummary] = useState<ClientMilestoneSummary | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [units, setUnits] = useState<Unit[]>([])

  // Loading & error
  const [loading, setLoading] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState<string>('')
  const [filterProject, setFilterProject] = useState<string>('')
  const [filterUnit, setFilterUnit] = useState<string>('')
  const [filterApprovalStatus, setFilterApprovalStatus] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)

  // Modals
  const [showAuthorizeModal, setShowAuthorizeModal] = useState<boolean>(false)
  const [showDisputeModal, setShowDisputeModal] = useState<boolean>(false)
  const [showPhotoModal, setShowPhotoModal] = useState<boolean>(false)
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false)
  const [showFlagModal, setShowFlagModal] = useState<boolean>(false)

  // Selected records
  const [selectedVerification, setSelectedVerification] = useState<ClientMilestoneVerification | null>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<MilestoneProgressPhoto | null>(null)

  // Forms
  const [authorizeFeedback, setAuthorizeFeedback] = useState<string>('')
  const [disputeForm, setDisputeForm] = useState({
    reason: '',
    category: 'finishing' as 'structural' | 'architectural' | 'plumbing' | 'electrical' | 'finishing' | 'safety' | 'other',
    flaggedPhotoIds: [] as string[],
  })
  const [uploadForm, setUploadForm] = useState({
    title: '',
    caption: '',
    photo_url: '',
    photo_stage: 'during_construction' as PhotoStage,
    gps_latitude: 0.3654,
    gps_longitude: 32.5987,
    camera_make_model: 'Mobile Camera',
  })
  const [flagNotes, setFlagNotes] = useState<string>('')

  // Currency Formatter
  const formatCurrency = (val: number | string | undefined | null) => {
    const num = Number(val) || 0
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(num)
  }

  // Load Reference Projects & Units
  useEffect(() => {
    const loadReferences = async () => {
      try {
        const [projRes, unitRes] = await Promise.all([
          projectService.getProjects({ per_page: 50 }),
          unitService.getUnits({ per_page: 100 }),
        ])
        setProjects(projRes.data || [])
        setUnits(unitRes.data || [])
      } catch (err) {
        console.error('Failed to load portal references', err)
      }
    }
    loadReferences()
  }, [])

  // Load Summary KPIs
  const loadSummary = useCallback(async () => {
    try {
      const data = await clientPortalService.getSummary()
      setSummary(data)
    } catch (err) {
      console.error('Failed to load client summary', err)
    }
  }, [])

  // Load Verifications
  const loadVerifications = useCallback(async () => {
    try {
      setLoading(true)
      const res = await clientPortalService.getVerifications({
        page,
        project_id: filterProject || undefined,
        unit_id: filterUnit || undefined,
        client_approval_status: (filterApprovalStatus as any) || undefined,
        search: search || undefined,
      })
      setVerifications(res.data || [])
      setTotalPages(res.last_page || 1)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load milestone verifications')
    } finally {
      setLoading(false)
    }
  }, [page, filterProject, filterUnit, filterApprovalStatus, search])

  const refreshAll = () => {
    setError(null)
    setSuccessMsg(null)
    loadSummary()
    loadVerifications()
  }

  useEffect(() => {
    loadSummary()
    loadVerifications()
  }, [loadSummary, loadVerifications])

  // Handle Client Authorize
  const handleAuthorize = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVerification) return

    try {
      setSubmitting(true)
      setError(null)
      await clientPortalService.authorizeVerification(selectedVerification.uuid, {
        feedback: authorizeFeedback,
      })
      setSuccessMsg(`Milestone payment release for ${selectedVerification.verification_number} authorized successfully.`)
      setShowAuthorizeModal(false)
      setAuthorizeFeedback('')
      refreshAll()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to authorize milestone release')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Client Dispute
  const handleDispute = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVerification || !disputeForm.reason) return

    try {
      setSubmitting(true)
      setError(null)
      await clientPortalService.disputeVerification(selectedVerification.uuid, {
        reason: disputeForm.reason,
        category: disputeForm.category,
        flagged_photo_ids: disputeForm.flaggedPhotoIds,
      })
      setSuccessMsg('Milestone dispute registered. Punch list snag items have been forwarded to site engineering team.')
      setShowDisputeModal(false)
      setDisputeForm({
        reason: '',
        category: 'finishing',
        flaggedPhotoIds: [],
      })
      refreshAll()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register dispute')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Upload Photo
  const handleUploadPhoto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVerification || !uploadForm.title || !uploadForm.photo_url) return

    try {
      setSubmitting(true)
      setError(null)
      await clientPortalService.uploadPhoto(selectedVerification.uuid, uploadForm)
      setSuccessMsg('Progress photo uploaded successfully.')
      setShowUploadModal(false)
      setUploadForm({
        title: '',
        caption: '',
        photo_url: '',
        photo_stage: 'during_construction',
        gps_latitude: 0.3654,
        gps_longitude: 32.5987,
        camera_make_model: 'Mobile Camera',
      })
      refreshAll()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload photo')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Flag Photo
  const handleFlagPhoto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPhoto || !flagNotes) return

    try {
      setSubmitting(true)
      setError(null)
      await clientPortalService.flagPhoto(selectedPhoto.uuid, flagNotes)
      setSuccessMsg('Photo defect note logged for inspection walk-through.')
      setShowFlagModal(false)
      setFlagNotes('')
      refreshAll()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to flag photo')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="client-portal-container">
      {/* Top Header */}
      <div className="client-portal-header">
        <div className="client-portal-title">
          <h1>My Construction Milestones & Progress Authorisations</h1>
          <p>
            Track certified construction stages, inspect geotagged on-site progress photos, and authorize milestone
            payment releases from your property escrow account.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="portal-btn secondary" onClick={refreshAll} title="Refresh">
            <MdRefresh /> Refresh
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div
          style={{
            background: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer' }}
          >
            <MdClose />
          </button>
        </div>
      )}

      {successMsg && (
        <div
          style={{
            background: '#ecfdf5',
            color: '#059669',
            border: '1px solid #a7f3d0',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{successMsg}</span>
          <button
            onClick={() => setSuccessMsg(null)}
            style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer' }}
          >
            <MdClose />
          </button>
        </div>
      )}

      {/* Action Required Banner if Pending Sign-Offs */}
      {summary && summary.pending_approval_count > 0 && (
        <div className="action-required-banner">
          <div className="action-banner-content">
            <MdWarning className="action-banner-icon" />
            <div className="action-banner-text">
              <strong>Action Required: {summary.pending_approval_count} Milestone Verification(s) Awaiting Your Review</strong>
              <span>
                Quantity Surveyor and Site Engineers have verified physical completion. Please review inspection photos and authorize payment release.
              </span>
            </div>
          </div>
          <button
            className="portal-btn primary"
            onClick={() => setFilterApprovalStatus('pending')}
          >
            View Pending ({summary.pending_approval_count})
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="client-kpi-grid">
        <div className="client-kpi-card">
          <div className="client-kpi-header">
            <span className="client-kpi-title">Properties / Units</span>
            <span className="client-kpi-icon blue"><MdHome /></span>
          </div>
          <div className="client-kpi-val">{summary?.active_units_count ?? 0}</div>
          <div className="client-kpi-sub">Active units under construction</div>
        </div>

        <div className="client-kpi-card">
          <div className="client-kpi-header">
            <span className="client-kpi-title">Overall Progress</span>
            <span className="client-kpi-icon purple"><MdVerified /></span>
          </div>
          <div className="client-kpi-val">{summary?.overall_completion_avg ?? 0}%</div>
          <div className="client-kpi-sub">Average across verified stages</div>
        </div>

        <div className="client-kpi-card">
          <div className="client-kpi-header">
            <span className="client-kpi-title">Awaiting Approval</span>
            <span className="client-kpi-icon amber"><MdPendingActions /></span>
          </div>
          <div className="client-kpi-val" style={{ color: (summary?.pending_approval_count ?? 0) > 0 ? '#d97706' : '#0f172a' }}>
            {summary?.pending_approval_count ?? 0}
          </div>
          <div className="client-kpi-sub">{summary?.approved_verifications_count ?? 0} milestones approved to date</div>
        </div>

        <div className="client-kpi-card">
          <div className="client-kpi-header">
            <span className="client-kpi-title">Escrow Released</span>
            <span className="client-kpi-icon green"><MdAttachMoney /></span>
          </div>
          <div className="client-kpi-val">{formatCurrency(summary?.total_escrow_authorized)}</div>
          <div className="client-kpi-sub">Funds disbursed to construction</div>
        </div>

        <div className="client-kpi-card">
          <div className="client-kpi-header">
            <span className="client-kpi-title">5% Retention Held</span>
            <span className="client-kpi-icon purple"><MdShield /></span>
          </div>
          <div className="client-kpi-val">{formatCurrency(summary?.total_retention_held)}</div>
          <div className="client-kpi-sub">Defect liability warranty reserve</div>
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div className="client-portal-toolbar">
        <div className="client-search-input">
          <MdSearch style={{ color: '#94a3b8', fontSize: '1.2rem' }} />
          <input
            type="text"
            placeholder="Search by verification number, milestone, or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              background: '#f8fafc',
            }}
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={filterUnit}
            onChange={(e) => setFilterUnit(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              background: '#f8fafc',
            }}
          >
            <option value="">All Units</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.unit_number} - {u.name || 'Unit'}</option>
            ))}
          </select>

          <select
            value={filterApprovalStatus}
            onChange={(e) => setFilterApprovalStatus(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              background: '#f8fafc',
            }}
          >
            <option value="">All Approval Statuses</option>
            <option value="pending">Awaiting My Sign-Off</option>
            <option value="approved">Approved</option>
            <option value="disputed">Disputed / Defects Raised</option>
            <option value="waived_by_admin">Waived by Admin</option>
          </select>
        </div>
      </div>

      {/* Main Content: Verifications List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          Loading construction milestone verifications...
        </div>
      ) : verifications.length === 0 ? (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          <MdInsertDriveFile style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '0.75rem' }} />
          <h3>No Milestone Verifications Found</h3>
          <p>There are no construction milestone inspection records matching your selected filters.</p>
        </div>
      ) : (
        <div className="verification-cards-grid">
          {verifications.map((ver) => {
            const isPending = ver.client_approval_status === 'pending'
            const isApproved = ver.client_approval_status === 'approved' || ver.client_approval_status === 'waived_by_admin'
            const isDisputed = ver.client_approval_status === 'disputed'

            const statusClass = isPending ? 'pending-signoff' : isApproved ? 'approved-signoff' : 'disputed-signoff'
            const release = ver.payment_releases && ver.payment_releases.length > 0 ? ver.payment_releases[0] : null

            return (
              <div key={ver.id} className={`verification-card ${statusClass}`}>
                {/* Card Header */}
                <div className="verification-card-header">
                  <div className="ver-card-title-group">
                    <h3>{ver.milestone?.milestone_name || ver.title}</h3>
                    <div className="ver-card-meta">
                      <strong>{ver.verification_number}</strong>
                      <span>&bull;</span>
                      <span>Project: {ver.project?.name}</span>
                      {ver.unit && (
                        <>
                          <span>&bull;</span>
                          <span style={{ color: '#2563eb', fontWeight: 600 }}>Unit: {ver.unit.unit_number}</span>
                        </>
                      )}
                      <span>&bull;</span>
                      <span>Inspection Date: {ver.inspection_date || new Date(ver.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: isApproved ? '#ecfdf5' : isDisputed ? '#fef2f2' : '#fffbeb',
                        color: isApproved ? '#059669' : isDisputed ? '#dc2626' : '#d97706',
                        border: isApproved ? '1px solid #a7f3d0' : isDisputed ? '1px solid #fecaca' : '1px solid #fde68a',
                      }}
                    >
                      {ver.client_approval_status === 'pending' ? 'Pending Your Sign-Off' : ver.client_approval_status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Card Body: Technical & Financial */}
                <div className="ver-card-body">
                  {/* Technical Sign-Off Reviews */}
                  <div className="technical-review-box">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155', textTransform: 'uppercase' }}>
                        Physical Engineering Audit
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2563eb' }}>
                        {ver.physical_completion_percentage}% Complete
                      </span>
                    </div>

                    <div className="tech-step-item">
                      <MdCheckCircle className={`tech-step-icon ${ver.structural_checks_passed ? 'pass' : 'warn'}`} />
                      <div>
                        <strong>Site Structural Engineer Check:</strong> Passed
                        {ver.site_engineer && <span style={{ color: '#64748b' }}> ({ver.site_engineer.name})</span>}
                        {ver.engineer_notes && (
                          <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>
                            "{ver.engineer_notes}"
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="tech-step-item">
                      <MdCheckCircle className={`tech-step-icon ${ver.quantity_surveyor_id ? 'pass' : 'pending'}`} />
                      <div>
                        <strong>Quantity Surveyor Valuation:</strong> Certified
                        {ver.quantity_surveyor && <span style={{ color: '#64748b' }}> ({ver.quantity_surveyor.name})</span>}
                        {ver.qs_notes && (
                          <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>
                            "{ver.qs_notes}"
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="tech-step-item">
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Work Quality Rating: <strong style={{ color: '#0f172a', textTransform: 'capitalize' }}>{ver.work_quality_rating?.replace('_', ' ')}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Financial Escrow Breakdown */}
                  <div className="escrow-breakdown-box">
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#065f46', textTransform: 'uppercase' }}>
                      Milestone Payment Release Breakdown
                    </div>

                    <div className="escrow-row">
                      <span>Gross QS Valuation:</span>
                      <strong>{formatCurrency(ver.qs_certified_amount || release?.gross_amount)}</strong>
                    </div>

                    <div className="escrow-row" style={{ color: '#b45309' }}>
                      <span>5% Defect Retention Reserve (Held):</span>
                      <strong>
                        {formatCurrency(release?.retention_amount || (Number(ver.qs_certified_amount || 0) * 0.05))}
                      </strong>
                    </div>

                    <div className="escrow-row highlight">
                      <span>Net Escrow Disbursement:</span>
                      <span>
                        {formatCurrency(release?.net_release_amount || (Number(ver.qs_certified_amount || 0) * 0.95))}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: '4px' }}>
                      Fund Source: <strong>Client Savings Escrow Account</strong>
                    </div>
                  </div>
                </div>

                {/* Photos Strip Gallery */}
                <div className="photos-strip-container">
                  <div className="photos-strip-header">
                    <h4>On-Site Physical Inspection Photos ({ver.progress_photos?.length || 0})</h4>
                    <button
                      className="portal-btn secondary"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      onClick={() => {
                        setSelectedVerification(ver)
                        setShowUploadModal(true)
                      }}
                    >
                      <MdPhotoCamera /> Add Photo
                    </button>
                  </div>

                  {(!ver.progress_photos || ver.progress_photos.length === 0) ? (
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      No photos attached yet. Inspection photos will appear here after site walks.
                    </div>
                  ) : (
                    <div className="photos-thumbnail-grid">
                      {ver.progress_photos.map((photo) => (
                        <div
                          key={photo.id}
                          className="photo-thumb-card"
                          onClick={() => {
                            setSelectedPhoto(photo)
                            setSelectedVerification(ver)
                            setShowPhotoModal(true)
                          }}
                        >
                          <img src={photo.thumbnail_url || photo.photo_url} alt={photo.title} />
                          <span className="photo-stage-tag">{photo.photo_stage.replace('_', ' ')}</span>
                          {photo.client_flagged && <span className="photo-flagged-tag">FLAGGED</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="verification-card-footer">
                  <div className="client-status-indicator">
                    {isApproved && (
                      <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <MdCheckCircle /> Approved by You on {ver.client_signed_at ? new Date(ver.client_signed_at).toLocaleDateString() : 'Portal'}
                      </span>
                    )}
                    {isDisputed && (
                      <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <MdWarning /> Disputed &bull; Snag logged: "{ver.client_feedback}"
                      </span>
                    )}
                    {isPending && (
                      <span style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <MdPendingActions /> Ready for Client Progress Approval
                      </span>
                    )}
                  </div>

                  <div className="portal-action-group">
                    {isPending && (
                      <>
                        <button
                          className="portal-btn outline-red"
                          onClick={() => {
                            setSelectedVerification(ver)
                            setDisputeForm({
                              reason: '',
                              category: 'finishing',
                              flaggedPhotoIds: [],
                            })
                            setShowDisputeModal(true)
                          }}
                        >
                          <MdThumbDown /> Report Snag / Dispute
                        </button>

                        <button
                          className="portal-btn primary"
                          onClick={() => {
                            setSelectedVerification(ver)
                            setAuthorizeFeedback('I have reviewed the engineering cube tests and on-site progress photos. Workmanship is confirmed.')
                            setShowAuthorizeModal(true)
                          }}
                        >
                          <MdThumbUp /> Authorize Release
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                className="portal-btn secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.85rem', alignSelf: 'center' }}>
                Page {page} of {totalPages}
              </span>
              <button
                className="portal-btn secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: AUTHORIZE RELEASE */}
      {showAuthorizeModal && selectedVerification && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header-row">
              <h3>Authorize Milestone Payment Release</h3>
              <button
                onClick={() => setShowAuthorizeModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleAuthorize}>
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700, color: '#065f46', marginBottom: '0.35rem' }}>
                  {selectedVerification.verification_number} - {selectedVerification.milestone?.milestone_name}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#047857' }}>
                  Net Escrow Release Amount:{' '}
                  <strong>{formatCurrency(Number(selectedVerification.qs_certified_amount || 0) * 0.95)}</strong>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                  A 5% retention ({formatCurrency(Number(selectedVerification.qs_certified_amount || 0) * 0.05)}) will be withheld until the post-handover warranty defects liability period expires.
                </div>
              </div>

              <div className="form-group">
                <label>Client Confirmation Notes</label>
                <textarea
                  rows={3}
                  value={authorizeFeedback}
                  onChange={(e) => setAuthorizeFeedback(e.target.value)}
                  placeholder="Record your satisfaction or sign-off remarks..."
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <input type="checkbox" id="confirm_auth" required />
                <label htmlFor="confirm_auth" style={{ fontSize: '0.8rem', color: '#334155' }}>
                  I confirm that I have inspected the physical photos and engineering checks, and authorize the release of construction funds.
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="portal-btn secondary" onClick={() => setShowAuthorizeModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="portal-btn primary" disabled={submitting}>
                  {submitting ? 'Authorizing...' : 'Confirm & Authorize Release'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DISPUTE & REPORT SNAG */}
      {showDisputeModal && selectedVerification && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header-row">
              <h3>Report Snag / Dispute Milestone</h3>
              <button
                onClick={() => setShowDisputeModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleDispute}>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: '0.25rem' }}>
                  {selectedVerification.verification_number} - {selectedVerification.milestone?.milestone_name}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#b91c1c' }}>
                  Reporting a snag halts payment release and creates an official punch list defect item for the site engineers.
                </div>
              </div>

              <div className="form-group">
                <label>Defect Category *</label>
                <select
                  value={disputeForm.category}
                  onChange={(e) => setDisputeForm({ ...disputeForm, category: e.target.value as any })}
                >
                  <option value="finishing">Finishing & Surfaces</option>
                  <option value="structural">Structural & Concrete</option>
                  <option value="plumbing">Plumbing & Drainage</option>
                  <option value="electrical">Electrical & Conduits</option>
                  <option value="architectural">Architectural / Dimensions</option>
                  <option value="other">Other Workmanship Issue</option>
                </select>
              </div>

              <div className="form-group">
                <label>Snag Description & Reason for Dispute *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe the defects observed, missing finishes, or substandard work..."
                  value={disputeForm.reason}
                  onChange={(e) => setDisputeForm({ ...disputeForm, reason: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="portal-btn secondary" onClick={() => setShowDisputeModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="portal-btn outline-red" disabled={submitting}>
                  {submitting ? 'Submitting Dispute...' : 'Submit Defect & Halt Release'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PHOTO LIGHTBOX VIEWER */}
      {showPhotoModal && selectedPhoto && (
        <div className="modal-overlay" onClick={() => setShowPhotoModal(false)}>
          <div
            className="modal-dialog"
            style={{ maxWidth: '800px', padding: '1rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header-row" style={{ marginBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', margin: '0 0 2px 0' }}>{selectedPhoto.title}</h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Stage: <strong>{selectedPhoto.photo_stage.replace('_', ' ')}</strong> &bull; Captured: {new Date(selectedPhoto.captured_at).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => setShowPhotoModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                <MdClose />
              </button>
            </div>

            <div style={{ borderRadius: '8px', overflow: 'hidden', maxHeight: '500px', background: '#0f172a', textAlign: 'center' }}>
              <img
                src={selectedPhoto.photo_url}
                alt={selectedPhoto.title}
                style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }}
              />
            </div>

            {selectedPhoto.caption && (
              <p style={{ fontSize: '0.85rem', color: '#334155', margin: '0.75rem 0' }}>
                {selectedPhoto.caption}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', fontSize: '0.8rem', color: '#64748b', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                {selectedPhoto.gps_latitude && selectedPhoto.gps_longitude && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <MdGpsFixed style={{ color: '#059669' }} /> GPS Geotag: {selectedPhoto.gps_latitude}, {selectedPhoto.gps_longitude}
                  </span>
                )}
                {selectedPhoto.camera_make_model && (
                  <span style={{ marginLeft: '0.75rem' }}>Device: {selectedPhoto.camera_make_model}</span>
                )}
              </div>

              <div>
                {!selectedPhoto.client_flagged ? (
                  <button
                    className="portal-btn outline-red"
                    style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                    onClick={() => {
                      setShowPhotoModal(false)
                      setFlagNotes('')
                      setShowFlagModal(true)
                    }}
                  >
                    <MdFlag /> Flag Defect on this Photo
                  </button>
                ) : (
                  <span style={{ color: '#dc2626', fontWeight: 700 }}>
                    Flagged: {selectedPhoto.client_flag_notes}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: UPLOAD PHOTO */}
      {showUploadModal && selectedVerification && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header-row">
              <h3>Upload Construction Progress Photo</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleUploadPhoto}>
              <div className="form-group">
                <label>Photo Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Living room suspended slab reinforcement"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Image URL (or Cloud Storage Path) *</label>
                <input
                  type="url"
                  required
                  placeholder="https://storage.zimbani.com/progress/..."
                  value={uploadForm.photo_url}
                  onChange={(e) => setUploadForm({ ...uploadForm, photo_url: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Construction Stage</label>
                <select
                  value={uploadForm.photo_stage}
                  onChange={(e) => setUploadForm({ ...uploadForm, photo_stage: e.target.value as PhotoStage })}
                >
                  <option value="pre_work">Pre-Work / Preparation</option>
                  <option value="during_construction">During Construction</option>
                  <option value="reinforcement_check">Reinforcement & Rebar Check</option>
                  <option value="concrete_pour">Concrete Pouring</option>
                  <option value="masonry_framing">Masonry / Framing</option>
                  <option value="mep_installation">MEP (Plumbing/Electrical)</option>
                  <option value="finishes">Finishes & Tiling</option>
                  <option value="completed_stage">Completed Stage</option>
                  <option value="defect_snag">Defect / Snag Detail</option>
                </select>
              </div>

              <div className="form-group">
                <label>Description / Technical Notes</label>
                <textarea
                  rows={2}
                  placeholder="Additional context about this inspection photo..."
                  value={uploadForm.caption}
                  onChange={(e) => setUploadForm({ ...uploadForm, caption: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>GPS Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={uploadForm.gps_latitude}
                    onChange={(e) => setUploadForm({ ...uploadForm, gps_latitude: Number(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>GPS Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={uploadForm.gps_longitude}
                    onChange={(e) => setUploadForm({ ...uploadForm, gps_longitude: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="portal-btn secondary" onClick={() => setShowUploadModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="portal-btn primary" disabled={submitting}>
                  {submitting ? 'Uploading...' : 'Save Progress Photo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: FLAG PHOTO */}
      {showFlagModal && selectedPhoto && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header-row">
              <h3>Flag Defect on Photo</h3>
              <button
                onClick={() => setShowFlagModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleFlagPhoto}>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedPhoto.title}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Stage: {selectedPhoto.photo_stage.replace('_', ' ')}
                </div>
              </div>

              <div className="form-group">
                <label>Observation / Snag Note *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Noticeable crack near window lintel or unlevel tiles..."
                  value={flagNotes}
                  onChange={(e) => setFlagNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="portal-btn secondary" onClick={() => setShowFlagModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="portal-btn outline-red" disabled={submitting}>
                  {submitting ? 'Flagging...' : 'Save Flag Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClientMilestonePortal
