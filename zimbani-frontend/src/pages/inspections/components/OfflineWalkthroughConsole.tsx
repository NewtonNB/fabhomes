import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  MdCloudDone,
  MdCloudOff,
  MdSync,
  MdCloudDownload,
  MdMyLocation,
  MdCheckCircle,
  MdWarning,
  MdPlaylistAddCheck,
  MdBugReport,
} from 'react-icons/md'
import offlineStorageService from '../../../services/offline-storage.service'
import offlineSyncService from '../../../services/offline-sync.service'
import {
  OfflineCachePackage,
  OfflineInspectionPayload,
  OfflinePunchPayload,
  OfflineSyncLog,
  QAInspectionChecklistItem,
} from '../../../types/offline-audit.types'
import './OfflineWalkthroughConsole.css'

interface Props {
  onInspectionSaved?: () => void
}

export const OfflineWalkthroughConsole: React.FC<Props> = ({ onInspectionSaved }) => {
  const [activeSubtab, setActiveSubtab] = useState<'audit_form' | 'offline_queue' | 'sync_logs'>(
    'audit_form'
  )
  const [isOnline, setIsOnline] = useState<boolean>(offlineSyncService.isOnline())
  const [offlinePackage, setOfflinePackage] = useState<OfflineCachePackage | null>(null)
  const [queueCount, setQueueCount] = useState<{ inspections: number; punch_items: number; total: number }>({
    inspections: 0,
    punch_items: 0,
    total: 0,
  })
  const [queuedInspections, setQueuedInspections] = useState<OfflineInspectionPayload[]>([])
  const [queuedPunchItems, setQueuedPunchItems] = useState<OfflinePunchPayload[]>([])
  const [syncLogs, setSyncLogs] = useState<OfflineSyncLog[]>([])

  const [isSyncing, setIsSyncing] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Audit Form States
  const [siteId, setSiteId] = useState<number>(0)
  const [projectId, setProjectId] = useState<number>(0)
  const [milestoneId, setMilestoneId] = useState<number>(0)
  const [inspectionType, setInspectionType] = useState<string>('foundation')
  const [title, setTitle] = useState<string>('Site Walk-Through Inspection')
  const [status, setStatus] = useState<'passed' | 'failed' | 'passed_with_conditions'>('passed')
  const [verifiedPct, setVerifiedPct] = useState<number>(100)
  const [weatherCondition, setWeatherCondition] = useState<string>('sunny')
  const [workAuthorized, setWorkAuthorized] = useState<boolean>(true)
  const [summaryNotes, setSummaryNotes] = useState<string>('')

  // GPS State
  const [gps, setGps] = useState<{
    lat: number | null
    lng: number | null
    accuracy: number | null
    capturing: boolean
    error: string | null
  }>({
    lat: null,
    lng: null,
    accuracy: null,
    capturing: false,
    error: null,
  })

  // Dynamic QA Checklist Answers
  const [checklistAnswers, setChecklistAnswers] = useState<
    Record<string, { status: 'pass' | 'fail' | 'na'; notes: string }>
  >({})

  // Defect Logger
  const [includeDefect, setIncludeDefect] = useState<boolean>(false)
  const [defectForm, setDefectForm] = useState<{
    title: string
    category: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    location_details: string
    description: string
  }>({
    title: '',
    category: 'finishing',
    severity: 'low',
    location_details: '',
    description: '',
  })

  // Listen to network changes
  useEffect(() => {
    const unsub = offlineSyncService.onNetworkChange((online) => {
      setIsOnline(online)
    })
    return () => unsub()
  }, [])

  // Load local storage items
  const reloadLocalState = useCallback(async () => {
    const [pkg, summary, insps, punchs] = await Promise.all([
      offlineStorageService.getOfflinePackage(),
      offlineStorageService.getQueueSummary(),
      offlineStorageService.getQueuedInspections(),
      offlineStorageService.getQueuedPunchItems(),
    ])
    setOfflinePackage(pkg)
    setQueueCount(summary)
    setQueuedInspections(insps)
    setQueuedPunchItems(punchs)

    if (pkg && pkg.sites.length > 0 && siteId === 0) {
      setSiteId(pkg.sites[0].id)
    }
  }, [siteId])

  useEffect(() => {
    reloadLocalState()
  }, [reloadLocalState])

  // Load sync logs when tab changes
  useEffect(() => {
    if (activeSubtab === 'sync_logs' && isOnline) {
      offlineSyncService
        .getSyncLogs(20)
        .then((logs) => setSyncLogs(logs))
        .catch(() => {})
    }
  }, [activeSubtab, isOnline])

  // Sites & Projects list from cache or fallbacks
  const availableSites = useMemo(() => {
    return offlinePackage?.sites || []
  }, [offlinePackage])

  const availableProjects = useMemo(() => {
    if (!offlinePackage) return []
    if (siteId) {
      return offlinePackage.projects.filter((p) => p.site_id === siteId)
    }
    return offlinePackage.projects
  }, [offlinePackage, siteId])

  // Available Milestones
  const selectedProjectObj = useMemo(() => {
    return availableProjects.find((p) => p.id === projectId)
  }, [availableProjects, projectId])

  const availableMilestones = useMemo(() => {
    return selectedProjectObj?.milestones || []
  }, [selectedProjectObj])

  // Current QA Checklist template for active inspectionType
  const currentChecklistTemplate: QAInspectionChecklistItem[] = useMemo(() => {
    if (!offlinePackage?.checklist_templates) return []
    return offlinePackage.checklist_templates[inspectionType] || []
  }, [offlinePackage, inspectionType])

  // Initialize checklist answers when template or type changes
  useEffect(() => {
    if (currentChecklistTemplate.length > 0) {
      const initial: Record<string, { status: 'pass' | 'fail' | 'na'; notes: string }> = {}
      currentChecklistTemplate.forEach((item) => {
        initial[item.id] = { status: 'pass', notes: '' }
      })
      setChecklistAnswers(initial)
    }
  }, [currentChecklistTemplate])

  // GPS Capture
  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      setGps((prev) => ({ ...prev, error: 'Geolocation is not supported by your device.' }))
      return
    }

    setGps((prev) => ({ ...prev, capturing: true, error: null }))
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({
          lat: Number(pos.coords.latitude.toFixed(7)),
          lng: Number(pos.coords.longitude.toFixed(7)),
          accuracy: Number(pos.coords.accuracy.toFixed(1)),
          capturing: false,
          error: null,
        })
      },
      (err) => {
        setGps((prev) => ({ ...prev, capturing: false, error: err.message }))
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    )
  }

  // Download Offline Site Bundle
  const handleDownloadBundle = async () => {
    try {
      setIsDownloading(true)
      const pkg = await offlineSyncService.downloadOfflinePackage()
      setOfflinePackage(pkg)
      setFeedback({
        type: 'success',
        text: `Offline package downloaded! Cached ${pkg.projects.length} projects and ${Object.keys(pkg.checklist_templates).length} checklist categories.`,
      })
      reloadLocalState()
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to download offline package' })
    } finally {
      setIsDownloading(false)
    }
  }

  // Flush Sync Queue to Cloud
  const handleSyncQueue = async () => {
    if (!isOnline) {
      setFeedback({ type: 'error', text: 'Device is currently offline. Connect to network to sync.' })
      return
    }

    try {
      setIsSyncing(true)
      const res = await offlineSyncService.syncOfflineQueue()
      if (res.result) {
        setFeedback({
          type: 'success',
          text: `Synchronization complete! Uploaded ${res.syncedCount} items to Fab Homes Cloud.`,
        })
        reloadLocalState()
        if (onInspectionSaved) onInspectionSaved()
      } else {
        setFeedback({ type: 'success', text: 'Queue is already empty. All items synced.' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.message || err.message || 'Sync failed' })
    } finally {
      setIsSyncing(false)
    }
  }

  // Submit Audit Form
  const handleSubmitAudit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!siteId) {
      setFeedback({ type: 'error', text: 'Please select a construction site.' })
      return
    }

    const clientSyncId = 'OFFLINE-INS-' + Math.random().toString(36).substring(2, 9).toUpperCase()
    const nowIso = new Date().toISOString()

    // Find linked milestone savings pool if available
    const linkedMilestone = availableMilestones.find((m) => m.id === milestoneId)
    const milestonePoolId = linkedMilestone?.savings_pool?.id

    const checklistPayload = Object.entries(checklistAnswers).map(([id, val]) => ({
      id,
      status: val.status,
      notes: val.notes,
    }))

    const inspectionPayload: OfflineInspectionPayload = {
      client_sync_id: clientSyncId,
      site_id: siteId,
      project_id: projectId || undefined,
      milestone_id: milestoneId || undefined,
      milestone_savings_pool_id: milestonePoolId,
      title: title || `${inspectionType.replace('_', ' ')} Site Walkthrough`,
      inspection_type: inspectionType,
      scheduled_date: nowIso.substring(0, 10),
      inspected_at: nowIso,
      offline_created_at: nowIso,
      status,
      score: verifiedPct,
      verified_milestone_percentage: verifiedPct,
      checklist_items: checklistPayload,
      summary_notes: summaryNotes,
      gps_latitude: gps.lat || undefined,
      gps_longitude: gps.lng || undefined,
      gps_accuracy: gps.accuracy || undefined,
      weather_condition: weatherCondition,
      work_authorized: workAuthorized,
    }

    await offlineStorageService.enqueueInspection(inspectionPayload)

    // If defect attached, queue punch item
    if (includeDefect && defectForm.title.trim()) {
      const punchSyncId = 'OFFLINE-PUNCH-' + Math.random().toString(36).substring(2, 9).toUpperCase()
      const punchPayload: OfflinePunchPayload = {
        client_sync_id: punchSyncId,
        inspection_client_sync_id: clientSyncId,
        site_id: siteId,
        project_id: projectId || undefined,
        title: defectForm.title,
        description: defectForm.description,
        location_details: defectForm.location_details,
        category: defectForm.category,
        severity: defectForm.severity,
        status: 'open',
        gps_latitude: gps.lat || undefined,
        gps_longitude: gps.lng || undefined,
        offline_created_at: nowIso,
      }
      await offlineStorageService.enqueuePunchItem(punchPayload)
    }

    setFeedback({
      type: 'success',
      text: `Walk-through audit saved locally! ${
        isOnline ? 'Uploading to cloud now...' : 'Stored in IndexedDB offline queue.'
      }`,
    })

    // Auto-sync if online
    if (isOnline) {
      handleSyncQueue()
    } else {
      reloadLocalState()
    }

    // Reset Form
    setTitle('Site Walk-Through Inspection')
    setSummaryNotes('')
    setIncludeDefect(false)
    setDefectForm({
      title: '',
      category: 'finishing',
      severity: 'low',
      location_details: '',
      description: '',
    })
  }

  return (
    <div className="pwa-console">
      {/* Feedback Alert */}
      {feedback && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontWeight: 600,
            background: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: feedback.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${feedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          }}
        >
          {feedback.type === 'success' ? <MdCheckCircle size={22} /> : <MdWarning size={22} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Status Bar */}
      <div className="pwa-top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div className={`pwa-status-pill ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? <MdCloudDone size={18} /> : <MdCloudOff size={18} />}
            <span>{isOnline ? 'Online (Cloud Connected)' : 'Offline (Field Mode)'}</span>
          </div>

          <div className="pwa-queue-pill">
            <MdPlaylistAddCheck size={18} />
            <span>
              {queueCount.total} queued ({queueCount.inspections} audits, {queueCount.punch_items} defects)
            </span>
          </div>
        </div>

        <div className="pwa-actions-group">
          <button
            className="pwa-btn pwa-btn-download"
            onClick={handleDownloadBundle}
            disabled={isDownloading || !isOnline}
            title="Download sites, projects, milestones and QA templates for remote field work"
          >
            <MdCloudDownload size={16} />
            <span>{isDownloading ? 'Downloading...' : 'Download Site Bundle'}</span>
          </button>

          <button
            className="pwa-btn pwa-btn-sync"
            onClick={handleSyncQueue}
            disabled={isSyncing || queueCount.total === 0 || !isOnline}
          >
            <MdSync size={16} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="pwa-subtabs">
        <button
          className={`pwa-subtab-btn ${activeSubtab === 'audit_form' ? 'active' : ''}`}
          onClick={() => setActiveSubtab('audit_form')}
        >
          New Site Walk-Through Audit
        </button>
        <button
          className={`pwa-subtab-btn ${activeSubtab === 'offline_queue' ? 'active' : ''}`}
          onClick={() => setActiveSubtab('offline_queue')}
        >
          Offline Sync Queue ({queueCount.total})
        </button>
        <button
          className={`pwa-subtab-btn ${activeSubtab === 'sync_logs' ? 'active' : ''}`}
          onClick={() => setActiveSubtab('sync_logs')}
        >
          Sync History Logs
        </button>
      </div>

      {/* SUBTAB 1: Walk-Through Audit Form */}
      {activeSubtab === 'audit_form' && (
        <form onSubmit={handleSubmitAudit} className="pwa-form-card">
          <div className="pwa-form-grid">
            <div className="pwa-field">
              <label>Construction Site *</label>
              <select
                value={siteId}
                onChange={(e) => {
                  setSiteId(Number(e.target.value))
                  setProjectId(0)
                  setMilestoneId(0)
                }}
                required
              >
                <option value={0}>-- Select Site --</option>
                {availableSites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="pwa-field">
              <label>Project / Villa</label>
              <select
                value={projectId}
                onChange={(e) => {
                  setProjectId(Number(e.target.value))
                  setMilestoneId(0)
                }}
              >
                <option value={0}>-- General Site Audit --</option>
                {availableProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="pwa-field">
              <label>Target Milestone / Pool</label>
              <select
                value={milestoneId}
                onChange={(e) => setMilestoneId(Number(e.target.value))}
              >
                <option value={0}>-- No Milestone Link --</option>
                {availableMilestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    Tier {m.milestone_order}: {m.milestone_name} ({m.completion_percentage}% done)
                  </option>
                ))}
              </select>
            </div>

            <div className="pwa-field">
              <label>Inspection QA Discipline *</label>
              <select
                value={inspectionType}
                onChange={(e) => setInspectionType(e.target.value)}
              >
                <option value="foundation">Substructure & Foundation</option>
                <option value="structural_framing">Structural Columns & Ring Beams</option>
                <option value="roofing">Roofing Trusses & Covering</option>
                <option value="plumbing_rough_in">Plumbing Rough-In & Pressure Test</option>
                <option value="electrical_rough_in">Electrical Rough-In & Earthing</option>
                <option value="finishing">Finishing, Plastering & Tiling</option>
                <option value="handover_audit">Handover & Final Commissioning</option>
              </select>
            </div>
          </div>

          {/* GPS Verification Box */}
          <div className="pwa-gps-box">
            <div className="pwa-gps-info">
              <MdMyLocation size={22} color="#2563eb" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                  GPS Site Authentication
                </div>
                {gps.lat !== null && gps.lng !== null ? (
                  <div className="pwa-gps-coords">
                    Lat: {gps.lat}°, Lng: {gps.lng}° (Accuracy: ±{gps.accuracy}m)
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Capture coordinates to authenticate physical presence on site.
                  </div>
                )}
                {gps.error && (
                  <div style={{ fontSize: '12px', color: '#dc2626' }}>{gps.error}</div>
                )}
              </div>
            </div>

            <button
              type="button"
              className="pwa-btn pwa-btn-ghost"
              style={{ color: '#0f172a', borderColor: '#cbd5e1' }}
              onClick={handleCaptureGps}
              disabled={gps.capturing}
            >
              <MdMyLocation size={16} />
              <span>{gps.capturing ? 'Acquiring GPS...' : 'Capture Site GPS'}</span>
            </button>
          </div>

          {/* Dynamic QA Checklist Items */}
          <div className="pwa-checklist-section">
            <div className="pwa-checklist-title">
              <MdPlaylistAddCheck size={20} color="#2563eb" />
              <span>Milestone Quality Assurance Checklist ({currentChecklistTemplate.length} items)</span>
            </div>

            <div className="pwa-checklist-card">
              {currentChecklistTemplate.length === 0 ? (
                <div style={{ padding: '20px', color: '#64748b', textAlign: 'center' }}>
                  Download the offline site bundle to view quality assurance checklists.
                </div>
              ) : (
                currentChecklistTemplate.map((item) => {
                  const currentAnswer = checklistAnswers[item.id] || { status: 'pass', notes: '' }
                  return (
                    <div className="pwa-check-row" key={item.id}>
                      <div className="pwa-check-text">
                        <div className="pwa-check-name">
                          <span>{item.title}</span>
                          {item.critical && (
                            <span
                              style={{
                                fontSize: '10px',
                                background: '#fee2e2',
                                color: '#991b1b',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: 700,
                              }}
                            >
                              CRITICAL
                            </span>
                          )}
                        </div>
                        <div className="pwa-check-desc">{item.description}</div>
                      </div>

                      <div className="pwa-btn-group-toggle">
                        <button
                          type="button"
                          className={`pwa-toggle-btn pass ${
                            currentAnswer.status === 'pass' ? 'active' : ''
                          }`}
                          onClick={() =>
                            setChecklistAnswers((prev) => ({
                              ...prev,
                              [item.id]: { ...currentAnswer, status: 'pass' },
                            }))
                          }
                        >
                          PASS
                        </button>
                        <button
                          type="button"
                          className={`pwa-toggle-btn fail ${
                            currentAnswer.status === 'fail' ? 'active' : ''
                          }`}
                          onClick={() =>
                            setChecklistAnswers((prev) => ({
                              ...prev,
                              [item.id]: { ...currentAnswer, status: 'fail' },
                            }))
                          }
                        >
                          FAIL
                        </button>
                        <button
                          type="button"
                          className={`pwa-toggle-btn na ${
                            currentAnswer.status === 'na' ? 'active' : ''
                          }`}
                          onClick={() =>
                            setChecklistAnswers((prev) => ({
                              ...prev,
                              [item.id]: { ...currentAnswer, status: 'na' },
                            }))
                          }
                        >
                          N/A
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Verified Milestone Progress Slider */}
          <div className="pwa-slider-box">
            <div className="pwa-slider-header">
              <span>Verified Physical Completion Percentage</span>
              <span style={{ color: '#2563eb', fontSize: '16px' }}>{verifiedPct}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={verifiedPct}
              onChange={(e) => setVerifiedPct(Number(e.target.value))}
              className="pwa-slider"
            />
          </div>

          {/* Environmental & Authorization Row */}
          <div className="pwa-form-grid">
            <div className="pwa-field">
              <label>Overall Assessment *</label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as 'passed' | 'failed' | 'passed_with_conditions')
                }
              >
                <option value="passed">Passed (Work Conforms to Specs)</option>
                <option value="passed_with_conditions">Passed with Conditions (Minor Punch)</option>
                <option value="failed">Failed (Non-Compliant - Remediation Required)</option>
              </select>
            </div>

            <div className="pwa-field">
              <label>Weather Condition</label>
              <select
                value={weatherCondition}
                onChange={(e) => setWeatherCondition(e.target.value)}
              >
                <option value="sunny">Sunny</option>
                <option value="cloudy">Cloudy</option>
                <option value="rainy">Rainy</option>
                <option value="muddy">Wet / Muddy</option>
              </select>
            </div>

            <div className="pwa-field" style={{ justifyContent: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={workAuthorized}
                  onChange={(e) => setWorkAuthorized(e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontWeight: 600 }}>Authorize Next Construction Stage</span>
              </label>
            </div>
          </div>

          <div className="pwa-field">
            <label>Field Notes / Verification Summary</label>
            <textarea
              rows={2}
              placeholder="e.g. Concrete poured under dry weather. Vibrator compaction verified without voids."
              value={summaryNotes}
              onChange={(e) => setSummaryNotes(e.target.value)}
            />
          </div>

          {/* Quick Defect / Punch Item Toggle */}
          <div className="pwa-defect-quick">
            <div className="pwa-defect-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MdBugReport size={20} />
                <span>Log Site Defect / Punch List Item</span>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={includeDefect}
                  onChange={(e) => setIncludeDefect(e.target.checked)}
                />
                Add Defect Item
              </label>
            </div>

            {includeDefect && (
              <div className="pwa-form-grid" style={{ marginTop: '8px' }}>
                <div className="pwa-field">
                  <label>Defect Title *</label>
                  <input
                    type="text"
                    required={includeDefect}
                    placeholder="e.g. Honeycombing on footing C4"
                    value={defectForm.title}
                    onChange={(e) => setDefectForm((prev) => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div className="pwa-field">
                  <label>Severity</label>
                  <select
                    value={defectForm.severity}
                    onChange={(e) =>
                      setDefectForm((prev) => ({
                        ...prev,
                        severity: e.target.value as 'low' | 'medium' | 'high' | 'critical',
                      }))
                    }
                  >
                    <option value="low">Low (Cosmetic)</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical (Structural)</option>
                  </select>
                </div>

                <div className="pwa-field">
                  <label>Location Details</label>
                  <input
                    type="text"
                    placeholder="e.g. Grid line 2-B, Basement column"
                    value={defectForm.location_details}
                    onChange={(e) =>
                      setDefectForm((prev) => ({ ...prev, location_details: e.target.value }))
                    }
                  />
                </div>

                <div className="pwa-field">
                  <label>Required Remediation</label>
                  <input
                    type="text"
                    placeholder="e.g. Chisel off loose aggregate and apply Sika non-shrink grout"
                    value={defectForm.description}
                    onChange={(e) =>
                      setDefectForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="submit"
              className="pwa-btn pwa-btn-sync"
              style={{ padding: '12px 24px', fontSize: '14px' }}
            >
              {isOnline ? 'Save & Sync to Cloud' : 'Save Offline in Queue'}
            </button>
          </div>
        </form>
      )}

      {/* SUBTAB 2: Offline Queue */}
      {activeSubtab === 'offline_queue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="pwa-table-wrapper">
            <table className="pwa-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Client Sync ID</th>
                  <th>Title</th>
                  <th>Score / Severity</th>
                  <th>Offline Timestamp</th>
                  <th>GPS Coordinates</th>
                </tr>
              </thead>
              <tbody>
                {queuedInspections.length === 0 && queuedPunchItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                      No pending items in offline queue. All records are synchronized with Fab Homes Cloud.
                    </td>
                  </tr>
                ) : (
                  <>
                    {queuedInspections.map((insp) => (
                      <tr key={insp.client_sync_id}>
                        <td>
                          <span
                            style={{
                              background: '#dcfce7',
                              color: '#166534',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                          >
                            AUDIT
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace' }}>{insp.client_sync_id}</td>
                        <td style={{ fontWeight: 600 }}>{insp.title}</td>
                        <td>{insp.score}%</td>
                        <td style={{ fontSize: '12px', color: '#64748b' }}>
                          {new Date(insp.offline_created_at).toLocaleString()}
                        </td>
                        <td style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                          {insp.gps_latitude ? `${insp.gps_latitude}, ${insp.gps_longitude}` : 'No GPS'}
                        </td>
                      </tr>
                    ))}
                    {queuedPunchItems.map((punch) => (
                      <tr key={punch.client_sync_id}>
                        <td>
                          <span
                            style={{
                              background: '#fee2e2',
                              color: '#991c1c',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                          >
                            DEFECT
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace' }}>{punch.client_sync_id}</td>
                        <td style={{ fontWeight: 600 }}>{punch.title}</td>
                        <td>
                          <span style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700 }}>
                            {punch.severity}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: '#64748b' }}>
                          {new Date(punch.offline_created_at).toLocaleString()}
                        </td>
                        <td style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                          {punch.gps_latitude ? `${punch.gps_latitude}, ${punch.gps_longitude}` : 'No GPS'}
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: Sync History Logs */}
      {activeSubtab === 'sync_logs' && (
        <div className="pwa-table-wrapper">
          <table className="pwa-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Device ID</th>
                <th>Sync Type</th>
                <th>Items Synced</th>
                <th>Conflicts</th>
                <th>IP Address</th>
                <th>Sync Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {syncLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    No sync telemetry records found.
                  </td>
                </tr>
              ) : (
                syncLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span
                        style={{
                          background: log.status === 'success' ? '#dcfce7' : '#fee2e2',
                          color: log.status === 'success' ? '#166534' : '#991c1c',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{log.device_id}</td>
                    <td>{log.sync_type}</td>
                    <td style={{ fontWeight: 700 }}>{log.total_items_processed}</td>
                    <td>{log.total_conflicts}</td>
                    <td>{log.ip_address || '127.0.0.1'}</td>
                    <td style={{ fontSize: '12px', color: '#64748b' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default OfflineWalkthroughConsole
