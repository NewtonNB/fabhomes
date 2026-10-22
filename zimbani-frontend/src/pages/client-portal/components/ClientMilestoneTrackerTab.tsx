import React, { useState, useEffect } from 'react'
import {
  MdConstruction,
  MdPhotoCamera,
  MdRefresh,
  MdCheckCircle,
  MdWarning,
  MdClose,
  MdVpnKey,
  MdFlag,
  MdLocationOn,
  MdGpsFixed,
  MdAddCircleOutline,
} from 'react-icons/md'
import { clientPortalSavingsService } from '../../../services/client-portal-savings.service'
import { clientPortalService } from '../../../services/client-portal.service'
import { MilestoneProgressTracker } from '../../../types/client-portal-savings.types'
import {
  ClientMilestoneVerification,
  MilestoneProgressPhoto,
} from '../../../types/client-milestone.types'
import { PunchListDefectItem } from '../../../types/client-portal-defects.types'
import './ClientSavingsTab.css'

interface ClientMilestoneTrackerTabProps {
  onNotify?: (msg: string, type: 'success' | 'error') => void
}

export const ClientMilestoneTrackerTab: React.FC<ClientMilestoneTrackerTabProps> = ({ onNotify }) => {
  const [activeSubTab, setActiveSubTab] = useState<'trackers' | 'photos' | 'defects'>('trackers')
  const [trackers, setTrackers] = useState<MilestoneProgressTracker[]>([])
  const [verifications, setVerifications] = useState<ClientMilestoneVerification[]>([])
  const [punchItems, setPunchItems] = useState<PunchListDefectItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // PIN Sign-Off Modal State
  const [showAuthorizeModal, setShowAuthorizeModal] = useState<boolean>(false)
  const [targetVerification, setTargetVerification] = useState<ClientMilestoneVerification | null>(null)
  const [pinInput, setPinInput] = useState<string>('')
  const [feedback, setFeedback] = useState<string>('')
  const [isAuthorizing, setIsAuthorizing] = useState<boolean>(false)

  // Photo Lightbox & Snag Flagging State
  const [selectedPhoto, setSelectedPhoto] = useState<MilestoneProgressPhoto | null>(null)
  const [showFlagModal, setShowFlagModal] = useState<boolean>(false)
  const [flagNotes, setFlagNotes] = useState<string>('')
  const [isFlagging, setIsFlagging] = useState<boolean>(false)

  // Direct Defect Punch-List Reporting Modal
  const [showDefectModal, setShowDefectModal] = useState<boolean>(false)
  const [defectForm, setDefectForm] = useState({
    title: '',
    description: '',
    category: 'finishing' as 'structural' | 'architectural' | 'plumbing' | 'electrical' | 'finishing' | 'safety' | 'other',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    location_details: '',
    unit_id: '' as string | number,
  })
  const [isSubmittingDefect, setIsSubmittingDefect] = useState<boolean>(false)

  const loadAllMilestoneData = async () => {
    setLoading(true)
    try {
      const [trackersRes, verifsRes, defectsRes] = await Promise.all([
        clientPortalSavingsService.getMilestoneTrackers(),
        clientPortalService.getVerifications(),
        clientPortalService.getPunchListItems(),
      ])
      setTrackers(trackersRes.trackers)
      setVerifications(verifsRes.data || [])
      setPunchItems(defectsRes.punch_items || [])
    } catch (err: any) {
      if (onNotify) onNotify(err.message || 'Failed to load milestone data', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllMilestoneData()
  }, [])

  // Quick-PIN Sign-Off Handler
  const handleAuthorizeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetVerification) return

    setIsAuthorizing(true)
    try {
      await clientPortalService.authorizeVerification(targetVerification.uuid, {
        feedback: feedback || 'Milestone verified and signed off via Client Portal PWA.',
        pin: pinInput,
      })
      if (onNotify) onNotify('Milestone successfully verified! Escrow payment release authorized with your Quick-PIN signature.', 'success')
      setShowAuthorizeModal(false)
      setPinInput('')
      setFeedback('')
      await loadAllMilestoneData()
    } catch (err: any) {
      if (onNotify) onNotify(err.response?.data?.message || err.message || 'Sign-off authorization failed', 'error')
    } finally {
      setIsAuthorizing(false)
    }
  }

  // Photo Flagging Snag Handler
  const handleFlagPhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPhoto || !flagNotes) return

    setIsFlagging(true)
    try {
      await clientPortalService.flagPhoto(selectedPhoto.uuid, flagNotes)
      if (onNotify) onNotify('Photo flagged with snag notes. Site engineering team alerted.', 'success')
      setShowFlagModal(false)
      setFlagNotes('')
      await loadAllMilestoneData()
    } catch (err: any) {
      if (onNotify) onNotify(err.response?.data?.message || err.message || 'Failed to flag photo', 'error')
    } finally {
      setIsFlagging(false)
    }
  }

  // Defect Punch-List Reporting Handler
  const handleSubmitDefect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!defectForm.title || !defectForm.description) return

    setIsSubmittingDefect(true)
    try {
      await clientPortalService.reportDefect({
        ...defectForm,
        unit_id: defectForm.unit_id ? Number(defectForm.unit_id) : undefined,
      })
      if (onNotify) onNotify('Defect snag logged successfully. Site manager notified for inspection.', 'success')
      setShowDefectModal(false)
      setDefectForm({
        title: '',
        description: '',
        category: 'finishing',
        severity: 'medium',
        location_details: '',
        unit_id: '',
      })
      await loadAllMilestoneData()
    } catch (err: any) {
      if (onNotify) onNotify(err.response?.data?.message || err.message || 'Failed to submit defect', 'error')
    } finally {
      setIsSubmittingDefect(false)
    }
  }

  const formatUGX = (val: number) => {
    return 'UGX ' + Math.round(val).toLocaleString()
  }

  if (loading && trackers.length === 0 && verifications.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
        <MdConstruction style={{ fontSize: 40, color: '#fbbf24', marginBottom: 12 }} />
        <div>Loading your construction milestones & site audits...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header & Sub-Tab Navigation */}
      <div className="plots-toolbar">
        <div>
          <h3 style={{ margin: 0, fontSize: 16, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdConstruction style={{ color: '#fbbf24' }} /> Construction Milestones & Quality Verification
          </h3>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
            Inspect on-site photo audits, authorize milestone releases with Quick-PIN, and log snag defects.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="plots-view-toggle">
            <button
              className={`plots-toggle-btn ${activeSubTab === 'trackers' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('trackers')}
            >
              Progress Trackers
            </button>
            <button
              className={`plots-toggle-btn ${activeSubTab === 'photos' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('photos')}
            >
              <MdPhotoCamera /> Photo Audits ({verifications.reduce((sum, v) => sum + (v.progress_photos?.length || 0), 0)})
            </button>
            <button
              className={`plots-toggle-btn ${activeSubTab === 'defects' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('defects')}
            >
              <MdFlag /> Punch List ({punchItems.length})
            </button>
          </div>

          <button
            className="portal-btn-primary"
            style={{ padding: '6px 12px', fontSize: 12 }}
            onClick={() => setShowDefectModal(true)}
          >
            <MdAddCircleOutline /> Report Snag / Defect
          </button>

          <button
            className="portal-btn-icon"
            onClick={() => loadAllMilestoneData()}
            title="Refresh Milestones"
          >
            <MdRefresh />
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: PROGRESS TRACKERS & VERIFICATIONS */}
      {activeSubTab === 'trackers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Pending Authorizations Hero Alert */}
          {verifications.filter((v) => v.client_approval_status === 'pending').map((v) => (
            <div
              key={v.uuid}
              style={{
                background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.15), rgba(30, 58, 138, 0.25))',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: 14,
                padding: 20,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="portal-badge portal-badge-pending">
                      <MdWarning /> Action Required
                    </span>
                    <strong style={{ fontSize: 16, color: '#fff' }}>{v.title}</strong>
                  </div>
                  <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 6 }}>
                    Milestone Ref: <strong>{v.verification_number}</strong> • Unit: <strong>{v.unit?.unit_number}</strong> ({v.project?.name})
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    QS Certified Valuation: <strong style={{ color: '#38bdf8' }}>{formatUGX(v.qs_certified_amount)}</strong> • Physical Completion: <strong>{v.physical_completion_percentage}%</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="portal-btn-primary"
                    onClick={() => {
                      setTargetVerification(v)
                      setShowAuthorizeModal(true)
                    }}
                  >
                    <MdVpnKey /> Sign Off with Quick-PIN
                  </button>
                  <button
                    className="portal-btn-secondary"
                    onClick={() => setActiveSubTab('photos')}
                  >
                    <MdPhotoCamera /> Inspect Photos
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Unit Milestone Progress Cards */}
          {trackers.map((t) => (
            <div key={t.unit_uuid} className="portal-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                      {t.project_name} • Plot {t.unit_number}
                    </span>
                    <span className="portal-badge portal-badge-online">
                      {t.unit_status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    {t.unit_name || 'Residential Unit'} • {t.project_location}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#38bdf8' }}>
                    {t.completion_pct}%
                  </div>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Physical Completion</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="savings-progress-track" style={{ height: 8, margin: '16px 0 10px 0' }}>
                <div
                  className="savings-progress-fill"
                  style={{ width: `${Math.min(100, t.completion_pct)}%` }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>
                <span>Completed: {t.completed_milestones} of {t.total_milestones} Milestones</span>
                <span>In Progress: {t.in_progress_milestones} Stage(s)</span>
              </div>

              {/* Active Milestone Card */}
              {t.current_milestone && (
                <div
                  style={{
                    background: '#090d16',
                    border: '1px solid #1e293b',
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontSize: 11, color: '#fbbf24', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>
                    Current Active Stage
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
                    {t.current_milestone.title}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    Planned Completion: {t.current_milestone.target_completion_date || 'Pending Schedule'} • Status: {t.current_milestone.status}
                  </div>
                </div>
              )}

              {/* Latest QS Valuation Status */}
              {t.latest_verification && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '10px 14px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: 8 }}>
                  <div>
                    <strong style={{ color: '#60a5fa' }}>Latest Inspection:</strong> {t.latest_verification.stage} ({t.latest_verification.inspection_date})
                  </div>
                  <div>
                    QS Certified Value: <strong>{formatUGX(t.latest_verification.qs_certified_amount)}</strong>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* SUB-TAB 2: PROGRESS PHOTO AUDITS & LIGHTBOX */}
      {activeSubTab === 'photos' && (
        <div className="portal-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h4 style={{ margin: 0, fontSize: 15, color: '#fff' }}>
              On-Site HD Photographic Verification Evidence
            </h4>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              Timestamped & GPS geotagged by site engineers
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {verifications.flatMap((v) => v.progress_photos || []).map((photo) => (
              <div
                key={photo.uuid}
                style={{
                  background: '#090d16',
                  border: '1px solid var(--portal-border)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  position: 'relative',
                }}
                onClick={() => setSelectedPhoto(photo)}
              >
                <div style={{ height: 180, background: '#1e293b', position: 'relative' }}>
                  <img
                    src={photo.photo_url}
                    alt={photo.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e: any) => {
                      e.target.src = 'https://images.unsplash.com/photo-1541888946425-d0fbb18615f8?auto=format&fit=crop&w=600&q=80'
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      background: 'rgba(15, 23, 42, 0.85)',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 10,
                      color: '#38bdf8',
                      fontWeight: 600,
                    }}
                  >
                    {photo.photo_stage.replace('_', ' ').toUpperCase()}
                  </span>
                  {photo.client_flagged && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: '#ef4444',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 10,
                        color: '#fff',
                        fontWeight: 700,
                      }}
                    >
                      FLAGGED SNAG
                    </span>
                  )}
                </div>

                <div style={{ padding: 12 }}>
                  <strong style={{ fontSize: 13, color: '#fff', display: 'block' }}>{photo.title}</strong>
                  <p style={{ margin: '4px 0 8px 0', fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>
                    {photo.caption || 'Inspection photo'}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b' }}>
                    <span>{new Date(photo.captured_at).toLocaleDateString()}</span>
                    {photo.gps_latitude && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <MdGpsFixed /> Geotagged
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: PUNCH LIST & DEFECT SNAGS */}
      {activeSubTab === 'defects' && (
        <div className="portal-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 15, color: '#fff' }}>Punch List Defect Tracking</h4>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                Snags reported by you or logged during site inspections
              </span>
            </div>
            <button
              className="portal-btn-primary"
              style={{ fontSize: 12, padding: '6px 14px' }}
              onClick={() => setShowDefectModal(true)}
            >
              + Log New Snag
            </button>
          </div>

          {punchItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
              <MdCheckCircle style={{ fontSize: 36, color: '#10b981', marginBottom: 8 }} />
              <div>No open defect snags reported for your properties. Excellent build quality!</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {punchItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: 'var(--portal-bg-card-subtle)',
                    border: '1px solid var(--portal-border)',
                    borderRadius: 10,
                    padding: 14,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <strong style={{ fontSize: 14, color: '#fff' }}>{item.title}</strong>
                      <span
                        style={{
                          fontSize: 10,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: item.status === 'open' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          color: item.status === 'open' ? '#f87171' : '#34d399',
                          fontWeight: 600,
                        }}
                      >
                        {item.status.toUpperCase()}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: '#334155',
                          color: '#cbd5e1',
                        }}
                      >
                        {item.category.toUpperCase()}
                      </span>
                    </div>

                    <p style={{ margin: '6px 0 0 0', fontSize: 12, color: '#cbd5e1' }}>
                      {item.description}
                    </p>

                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                      Snag ID: <strong>{item.item_number}</strong> • Location: <strong>{item.location_details || 'Site'}</strong> • Reported: <strong>{new Date(item.created_at).toLocaleDateString()}</strong>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: 11,
                      padding: '4px 8px',
                      borderRadius: 6,
                      background: item.severity === 'high' || item.severity === 'critical' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                      color: item.severity === 'high' || item.severity === 'critical' ? '#f87171' : '#fbbf24',
                      fontWeight: 600,
                    }}
                  >
                    Severity: {item.severity.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* QUICK-PIN SIGN-OFF AUTHORIZATION MODAL */}
      {showAuthorizeModal && targetVerification && (
        <div className="checkout-modal-overlay">
          <div className="checkout-modal" style={{ maxWidth: 440 }}>
            <div className="checkout-modal-header">
              <h3 style={{ margin: 0, fontSize: 18, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <MdVpnKey style={{ color: '#38bdf8' }} /> Authorize Milestone Release
              </h3>
              <button
                className="modal-close-btn"
                onClick={() => setShowAuthorizeModal(false)}
              >
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleAuthorizeSubmit}>
              <div
                style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 16,
                  fontSize: 12,
                  color: '#cbd5e1',
                  lineHeight: 1.5,
                }}
              >
                <div>Milestone: <strong>{targetVerification.title}</strong></div>
                <div>Release Amount: <strong style={{ color: '#10b981' }}>{formatUGX(targetVerification.qs_certified_amount)}</strong></div>
                <div style={{ marginTop: 4, color: '#94a3b8' }}>
                  Signing off certifies that you have inspected photo audits and authorize the release of escrow funds
                  to the contractor.
                </div>
              </div>

              <div className="portal-input-group">
                <label>Enter 4-Digit Quick-PIN</label>
                <input
                  type="password"
                  maxLength={6}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  placeholder="••••"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                  className="portal-input"
                  style={{ textAlign: 'center', letterSpacing: 8, fontSize: 20 }}
                  required
                />
                <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                  Your secure Quick-PIN verifies digital sign-off authority.
                </span>
              </div>

              <div className="portal-input-group">
                <label>Sign-Off Feedback / Comments (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Slump tests and column alignments verified satisfactory."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="portal-input"
                />
              </div>

              <button
                type="submit"
                className="portal-btn-primary"
                style={{ width: '100%', padding: 12, marginTop: 12 }}
                disabled={isAuthorizing || pinInput.length < 4}
              >
                {isAuthorizing ? 'Cryptographically Signing...' : 'Authorize Escrow Fund Release'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PHOTO LIGHTBOX & SNAG FLAGGING MODAL */}
      {selectedPhoto && (
        <div className="checkout-modal-overlay">
          <div className="checkout-modal" style={{ maxWidth: 600 }}>
            <div className="checkout-modal-header">
              <div>
                <h4 style={{ margin: 0, fontSize: 16, color: '#fff' }}>{selectedPhoto.title}</h4>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                  Stage: {selectedPhoto.photo_stage.replace('_', ' ').toUpperCase()} • {new Date(selectedPhoto.captured_at).toLocaleString()}
                </span>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedPhoto(null)}
              >
                <MdClose />
              </button>
            </div>

            <div style={{ borderRadius: 10, overflow: 'hidden', maxHeight: 360, background: '#090d16', marginBottom: 14 }}>
              <img
                src={selectedPhoto.photo_url}
                alt={selectedPhoto.title}
                style={{ width: '100%', height: 'auto', display: 'block' }}
                onError={(e: any) => {
                  e.target.src = 'https://images.unsplash.com/photo-1541888946425-d0fbb18615f8?auto=format&fit=crop&w=800&q=80'
                }}
              />
            </div>

            <p style={{ margin: '0 0 14px 0', fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>
              {selectedPhoto.caption || 'Site progress photo record'}
            </p>

            {selectedPhoto.gps_latitude && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#38bdf8', marginBottom: 14 }}>
                <MdLocationOn />
                <span>
                  GPS Geotag: {selectedPhoto.gps_latitude.toFixed(5)}° N, {selectedPhoto.gps_longitude?.toFixed(5)}° E (Camera: {selectedPhoto.camera_make_model || 'Certified Site Device'})
                </span>
              </div>
            )}

            {!showFlagModal ? (
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="portal-btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => setSelectedPhoto(null)}
                >
                  Close Photo
                </button>
                <button
                  className="portal-btn-secondary"
                  style={{ color: '#f87171' }}
                  onClick={() => setShowFlagModal(true)}
                >
                  <MdFlag /> Flag as Defect Snag
                </button>
              </div>
            ) : (
              <form onSubmit={handleFlagPhotoSubmit} style={{ marginTop: 10 }}>
                <div className="portal-input-group">
                  <label>Describe the Defect / Issue Observed</label>
                  <input
                    type="text"
                    placeholder="e.g. Inadequate cover on bottom reinforcement bars"
                    value={flagNotes}
                    onChange={(e) => setFlagNotes(e.target.value)}
                    className="portal-input"
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="submit"
                    className="portal-btn-primary"
                    style={{ flex: 1, background: '#ef4444' }}
                    disabled={isFlagging}
                  >
                    {isFlagging ? 'Flagging...' : 'Confirm Snag Flag'}
                  </button>
                  <button
                    type="button"
                    className="portal-btn-secondary"
                    onClick={() => setShowFlagModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* REPORT DEFECT MODAL */}
      {showDefectModal && (
        <div className="checkout-modal-overlay">
          <div className="checkout-modal" style={{ maxWidth: 480 }}>
            <div className="checkout-modal-header">
              <h3 style={{ margin: 0, fontSize: 18, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <MdFlag style={{ color: '#f87171' }} /> Log Snag / Punch List Defect
              </h3>
              <button
                className="modal-close-btn"
                onClick={() => setShowDefectModal(false)}
              >
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleSubmitDefect}>
              <div className="portal-input-group">
                <label>Defect Title / Summary</label>
                <input
                  type="text"
                  placeholder="e.g. Paint peeling on balcony ceiling"
                  value={defectForm.title}
                  onChange={(e) => setDefectForm({ ...defectForm, title: e.target.value })}
                  className="portal-input"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="portal-input-group">
                  <label>Category</label>
                  <select
                    value={defectForm.category}
                    onChange={(e: any) => setDefectForm({ ...defectForm, category: e.target.value })}
                    className="portal-input"
                  >
                    <option value="finishing">Finishing / Painting</option>
                    <option value="structural">Structural Concrete/Steel</option>
                    <option value="architectural">Architectural / Masonry</option>
                    <option value="plumbing">Plumbing & Drainage</option>
                    <option value="electrical">Electrical & Lighting</option>
                    <option value="safety">Safety / Guardrails</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="portal-input-group">
                  <label>Severity</label>
                  <select
                    value={defectForm.severity}
                    onChange={(e: any) => setDefectForm({ ...defectForm, severity: e.target.value })}
                    className="portal-input"
                  >
                    <option value="low">Low (Minor Blemish)</option>
                    <option value="medium">Medium (Requires Touchup)</option>
                    <option value="high">High (Contractor Fix)</option>
                    <option value="critical">Critical (Blocks Release)</option>
                  </select>
                </div>
              </div>

              <div className="portal-input-group">
                <label>Location Details on Property</label>
                <input
                  type="text"
                  placeholder="e.g. Master Bedroom Balcony, West Corner"
                  value={defectForm.location_details}
                  onChange={(e) => setDefectForm({ ...defectForm, location_details: e.target.value })}
                  className="portal-input"
                />
              </div>

              <div className="portal-input-group">
                <label>Detailed Description</label>
                <textarea
                  rows={3}
                  placeholder="Provide precise details of the snag..."
                  value={defectForm.description}
                  onChange={(e) => setDefectForm({ ...defectForm, description: e.target.value })}
                  className="portal-input"
                  style={{ resize: 'vertical' }}
                  required
                />
              </div>

              <button
                type="submit"
                className="portal-btn-primary"
                style={{ width: '100%', padding: 12, marginTop: 10 }}
                disabled={isSubmittingDefect}
              >
                {isSubmittingDefect ? 'Submitting Snag...' : 'Submit Defect to Site Team'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClientMilestoneTrackerTab
