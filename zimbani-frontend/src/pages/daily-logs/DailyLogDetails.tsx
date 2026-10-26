import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  MdArrowBack,
  MdEdit,
  MdCheckCircle,
  MdCloudUpload,
  MdWbSunny,
  MdWbCloudy,
  MdThunderstorm,
  MdGrain,
  MdAir,
  MdPeople,
  MdWarning,
  MdAccessTime,
  MdAssignmentTurnedIn,
  MdEngineering,
  MdSecurity,
  MdRecordVoiceOver,
  MdClose,
  MdHelpOutline,
} from 'react-icons/md'
import {
  SiteDailyLog,
  SafetyIncident,
  IncidentType,
  IncidentSeverity,
  InjuredPersonType,
  ToolboxTalkCategory,
} from '../../types/daily-log.types'
import { Document } from '../../types/document.types'
import dailyLogService from '../../services/daily-log.service'
import documentService from '../../services/document.service'
import { DocumentUploadModal } from '../../components/documents/DocumentUploadModal'
import { DocumentsTable } from '../../components/documents/DocumentsTable'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import './DailyLogDetails.css'

export const DailyLogDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [log, setLog] = useState<SiteDailyLog | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'incidents' | 'toolbox' | 'documents'>('overview')
  const [showSubmitConfirm, setShowSubmitConfirm] = useState<boolean>(false)

  // Modals & Action States
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false)
  const [approveModalOpen, setApproveModalOpen] = useState<boolean>(false)
  const [approvalNotes, setApprovalNotes] = useState<string>('')

  // Incident Modal
  const [incidentModalOpen, setIncidentModalOpen] = useState<boolean>(false)
  const [incTitle, setIncTitle] = useState<string>('')
  const [incType, setIncType] = useState<IncidentType>('near_miss')
  const [incSeverity, setIncSeverity] = useState<IncidentSeverity>('medium')
  const [incTime, setIncTime] = useState<string>('')
  const [incLocation, setIncLocation] = useState<string>('')
  const [incDesc, setIncDesc] = useState<string>('')
  const [incActions, setIncActions] = useState<string>('')
  const [injuredType, setInjuredType] = useState<InjuredPersonType>('none')
  const [injuredName, setInjuredName] = useState<string>('')

  // Toolbox Talk Modal
  const [toolboxModalOpen, setToolboxModalOpen] = useState<boolean>(false)
  const [talkTopic, setTalkTopic] = useState<string>('')
  const [talkCategory, setTalkCategory] = useState<ToolboxTalkCategory>('ppe')
  const [talkDuration, setTalkDuration] = useState<number>(15)
  const [talkAttendeesCount, setTalkAttendeesCount] = useState<number>(10)
  const [talkAttendeesNames, setTalkAttendeesNames] = useState<string>('')
  const [talkDiscussion, setTalkDiscussion] = useState<string>('')
  const [talkHazards, setTalkHazards] = useState<string>('')

  // Incident Resolution Modals
  const [activeIncidentForAction, setActiveIncidentForAction] = useState<SafetyIncident | null>(null)
  const [investigateModalOpen, setInvestigateModalOpen] = useState<boolean>(false)
  const [investigateActions, setInvestigateActions] = useState<string>('')
  const [closeModalOpen, setCloseModalOpen] = useState<boolean>(false)
  const [closeRootCause, setCloseRootCause] = useState<string>('')
  const [closePreventative, setClosePreventative] = useState<string>('')

  const fetchLog = async () => {
    if (!id) return
    try {
      setLoading(true)
      setError(null)
      const data = await dailyLogService.getDailyLog(id)
      setLog(data)

      // Fetch Documents
      if (data.id) {
        documentService
          .getDocuments({
            documentable_type: 'site_daily_logs',
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
      setError(err?.response?.data?.message || 'Failed to load site daily log details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLog()
  }, [id])

  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(null), 5000)
  }

  const handleSubmitLog = () => {
    setShowSubmitConfirm(true)
  }

  const executeSubmitLog = async () => {
    if (!log) return
    try {
      setActionLoading(true)
      await dailyLogService.submitDailyLog(log.uuid)
      setShowSubmitConfirm(false)
      triggerSuccess('Daily log successfully submitted for manager approval!')
      fetchLog()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to submit log.')
      setShowSubmitConfirm(false)
    } finally {
      setActionLoading(false)
    }
  }

  const handleApproveLog = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!log) return
    try {
      setActionLoading(true)
      await dailyLogService.approveDailyLog(log.uuid, approvalNotes)
      setApproveModalOpen(false)
      setApprovalNotes('')
      triggerSuccess('Daily log successfully approved!')
      fetchLog()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to approve log.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!log) return
    try {
      setActionLoading(true)
      await dailyLogService.createIncident({
        site_id: log.site?.id || 1,
        project_id: log.project?.id,
        site_daily_log_id: log.id,
        incident_type: incType,
        severity: incSeverity,
        incident_date: log.log_date,
        incident_time: incTime || undefined,
        location_details: incLocation || 'On site',
        title: incTitle,
        description: incDesc,
        immediate_actions_taken: incActions || undefined,
        injured_person_type: injuredType,
        injured_person_name: injuredName || undefined,
      })

      setIncidentModalOpen(false)
      setIncTitle('')
      setIncDesc('')
      setIncActions('')
      setInjuredName('')
      triggerSuccess('Safety incident reported and linked to this daily log!')
      fetchLog()
      setActiveTab('incidents')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to report safety incident.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreateToolboxTalk = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!log) return
    try {
      setActionLoading(true)
      const namesList = talkAttendeesNames
        ? talkAttendeesNames.split(',').map((n) => n.trim()).filter(Boolean)
        : []

      await dailyLogService.createToolboxTalk({
        site_id: log.site?.id || 1,
        project_id: log.project?.id,
        site_daily_log_id: log.id,
        topic: talkTopic,
        category: talkCategory,
        conducted_at: log.log_date,
        duration_minutes: talkDuration,
        attendees_count: talkAttendeesCount,
        attendees_names: namesList,
        key_discussion_points: talkDiscussion,
        hazards_identified: talkHazards || undefined,
      })

      setToolboxModalOpen(false)
      setTalkTopic('')
      setTalkDiscussion('')
      setTalkHazards('')
      setTalkAttendeesNames('')
      triggerSuccess('Safety toolbox talk recorded and linked to this daily log!')
      fetchLog()
      setActiveTab('toolbox')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to record toolbox talk.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleInvestigateIncident = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeIncidentForAction) return
    try {
      setActionLoading(true)
      await dailyLogService.investigateIncident(activeIncidentForAction.uuid, {
        immediate_actions_taken: investigateActions,
      })
      setInvestigateModalOpen(false)
      setActiveIncidentForAction(null)
      setInvestigateActions('')
      triggerSuccess('Investigation officially launched for incident!')
      fetchLog()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to start investigation.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCloseIncident = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeIncidentForAction) return
    try {
      setActionLoading(true)
      await dailyLogService.closeIncident(activeIncidentForAction.uuid, {
        root_cause_analysis: closeRootCause,
        preventative_measures: closePreventative,
      })
      setCloseModalOpen(false)
      setActiveIncidentForAction(null)
      setCloseRootCause('')
      setClosePreventative('')
      triggerSuccess('Safety incident closed with root cause analysis and preventative measures!')
      fetchLog()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to close incident.')
    } finally {
      setActionLoading(false)
    }
  }

  const getWeatherIcon = (cond: string) => {
    switch (cond) {
      case 'clear':
      case 'sunny':
        return <MdWbSunny style={{ color: '#eab308' }} />
      case 'partly_cloudy':
      case 'cloudy':
        return <MdWbCloudy style={{ color: '#94a3b8' }} />
      case 'light_rain':
      case 'heavy_rain':
        return <MdGrain style={{ color: '#0284c7' }} />
      case 'stormy':
        return <MdThunderstorm style={{ color: '#6366f1' }} />
      case 'high_winds':
        return <MdAir style={{ color: '#0d9488' }} />
      default:
        return <MdWbSunny style={{ color: '#eab308' }} />
    }
  }

  if (loading) {
    return (
      <div className="daily-log-details-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading site daily log details...</p>
        </div>
      </div>
    )
  }

  if (error || !log) {
    return (
      <div className="daily-log-details-container">
        <div className="error-banner">
          <p>{error || 'Site daily log not found.'}</p>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/daily-logs')}>
            Back to Daily Logs
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="daily-log-details-container">
      {/* Notifications */}
      {successMessage && <div className="success-banner">{successMessage}</div>}

      {/* Header */}
      <div className="details-header">
        <div className="details-title-group">
          <button
            className="action-icon-btn"
            onClick={() => navigate('/daily-logs')}
            title="Back to Daily Logs"
            style={{ marginRight: '0.25rem' }}
          >
            <MdArrowBack />
          </button>
          <div>
            <h1>
              <span>{log.log_number}</span>
              <span className={`status-badge badge-${log.status}`}>
                {log.status.toUpperCase()}
              </span>
            </h1>
            <p className="details-subtitle">
              Site: <strong>{log.site?.name}</strong> • Project: <strong>{log.project?.name || 'General Site Ops'}</strong> • Log Date: <strong>{log.log_date}</strong>
            </p>
          </div>
        </div>

        <div className="details-header-actions">
          {log.status === 'draft' && (
            <button
              className="btn btn-success"
              onClick={handleSubmitLog}
              disabled={actionLoading}
            >
              <MdAssignmentTurnedIn /> Submit for Approval
            </button>
          )}

          {log.status === 'submitted' && (
            <button
              className="btn btn-primary"
              onClick={() => setApproveModalOpen(true)}
              disabled={actionLoading}
            >
              <MdCheckCircle /> Approve Log
            </button>
          )}

          <Link to={`/daily-logs/${log.uuid}/edit`} className="btn btn-secondary">
            <MdEdit /> Edit Log
          </Link>

          <button
            className="btn btn-secondary"
            onClick={() => setUploadModalOpen(true)}
          >
            <MdCloudUpload /> Attach Photos
          </button>

          <button
            className="btn btn-warning"
            onClick={() => setIncidentModalOpen(true)}
          >
            <MdWarning /> Report Incident
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => setToolboxModalOpen(true)}
          >
            <MdRecordVoiceOver /> Toolbox Talk
          </button>
        </div>
      </div>

      {/* Weather Delay Banner */}
      {log.work_delayed_by_weather && (
        <div className="weather-delay-banner">
          <MdWarning className="banner-icon" />
          <div>
            <strong>Weather Delay Recorded: </strong>
            Operations were delayed by {log.delay_hours} hours due to adverse {log.weather_condition.replace('_', ' ')} conditions.
            {log.delays_or_impediments && <span> Details: {log.delays_or_impediments}</span>}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="daily-log-kpis">
        <div className="kpi-card">
          <div className="kpi-icon blue">{getWeatherIcon(log.weather_condition)}</div>
          <div className="kpi-content">
            <span className="kpi-label">Weather Condition</span>
            <span className="kpi-val" style={{ textTransform: 'capitalize' }}>
              {log.weather_condition.replace('_', ' ')}
            </span>
            <span className="kpi-sub">
              {log.temperature_celsius !== null && log.temperature_celsius !== undefined
                ? `${log.temperature_celsius}°C`
                : 'Ambient'}
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon green">
            <MdPeople />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Labor On Site</span>
            <span className="kpi-val">{log.total_headcount || (log.labor_headcount + (log.subcontractor_headcount || 0))}</span>
            <span className="kpi-sub">
              {log.labor_headcount} Direct + {log.subcontractor_headcount || 0} Subcontractors
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className={`kpi-icon ${log.incidents_count && log.incidents_count > 0 ? 'red' : 'green'}`}>
            <MdSecurity />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Safety Incidents</span>
            <span className="kpi-val">{log.incidents_count ?? (log.safety_incidents?.length || 0)}</span>
            <span className="kpi-sub">
              {(log.incidents_count ?? 0) === 0 ? 'Zero safety incidents' : 'Requires attention'}
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon purple">
            <MdRecordVoiceOver />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Toolbox Talks</span>
            <span className="kpi-val">{log.toolbox_talks_count ?? (log.toolbox_talks?.length || 0)}</span>
            <span className="kpi-sub">Site safety briefings held</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="daily-log-tabs">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <MdEngineering /> Work & Site Log
        </button>
        <button
          className={`tab-btn ${activeTab === 'incidents' ? 'active' : ''}`}
          onClick={() => setActiveTab('incidents')}
        >
          <MdWarning /> Safety Incidents
          {(log.safety_incidents?.length || 0) > 0 && (
            <span className="tab-count-badge">{log.safety_incidents?.length}</span>
          )}
        </button>
        <button
          className={`tab-btn ${activeTab === 'toolbox' ? 'active' : ''}`}
          onClick={() => setActiveTab('toolbox')}
        >
          <MdRecordVoiceOver /> Toolbox Talks
          {(log.toolbox_talks?.length || 0) > 0 && (
            <span className="tab-count-badge">{log.toolbox_talks?.length}</span>
          )}
        </button>
        <button
          className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          <MdCloudUpload /> Photos & Attachments
          {documents.length > 0 && <span className="tab-count-badge">{documents.length}</span>}
        </button>
      </div>

      {/* TAB 1: WORK & SITE LOG */}
      {activeTab === 'overview' && (
        <div className="details-grid">
          <div className="details-main-col">
            <div className="details-card">
              <div className="details-card-header">
                <h2>
                  <MdEngineering /> Work Performed Summary
                </h2>
              </div>
              <div className="log-section-content">
                {log.work_performed_summary || 'No detailed work summary entered.'}
              </div>
            </div>

            {log.delays_or_impediments && (
              <div className="details-card">
                <div className="details-card-header">
                  <h2>
                    <MdAccessTime style={{ color: '#ea580c' }} /> Delays & Impediments
                  </h2>
                </div>
                <div className="log-section-content" style={{ borderColor: '#fed7aa', background: '#fffbeb' }}>
                  {log.delays_or_impediments}
                </div>
              </div>
            )}

            <div className="details-card">
              <div className="details-card-header">
                <h2>Materials Received On Site</h2>
              </div>
              <div className={`log-section-content ${!log.materials_received_notes ? 'empty' : ''}`}>
                {log.materials_received_notes || 'No materials delivery recorded for this shift.'}
              </div>
            </div>

            <div className="details-card">
              <div className="details-card-header">
                <h2>Active Equipment & Machinery On Site</h2>
              </div>
              <div className={`log-section-content ${!log.equipment_on_site_notes ? 'empty' : ''}`}>
                {log.equipment_on_site_notes || 'No equipment usage notes recorded for this shift.'}
              </div>
            </div>

            <div className="details-card">
              <div className="details-card-header">
                <h2>Site Visitors Log</h2>
              </div>
              <div className={`log-section-content ${!log.visitors_log ? 'empty' : ''}`}>
                {log.visitors_log || 'No external visitors or inspectors recorded today.'}
              </div>
            </div>
          </div>

          <div className="details-side-col">
            <div className="details-card">
              <div className="details-card-header">
                <h2>Log Meta & Audit</h2>
              </div>
              <div className="info-row">
                <span className="label">Log Reference:</span>
                <span className="val">{log.log_number}</span>
              </div>
              <div className="info-row">
                <span className="label">Log Date:</span>
                <span className="val">{log.log_date}</span>
              </div>
              <div className="info-row">
                <span className="label">Supervisor:</span>
                <span className="val">{log.supervisor?.name || 'Assigned Site Supervisor'}</span>
              </div>
              <div className="info-row">
                <span className="label">Direct Labor:</span>
                <span className="val">{log.labor_headcount} workers</span>
              </div>
              <div className="info-row">
                <span className="label">Subcontractors:</span>
                <span className="val">{log.subcontractor_headcount || 0} workers</span>
              </div>
              <div className="info-row">
                <span className="label">Total Headcount:</span>
                <span className="val">{log.total_headcount || (log.labor_headcount + (log.subcontractor_headcount || 0))}</span>
              </div>
              <div className="info-row">
                <span className="label">Approval Status:</span>
                <span className="val">
                  <span className={`status-badge badge-${log.status}`}>
                    {log.status.toUpperCase()}
                  </span>
                </span>
              </div>
              {log.approved_at && (
                <>
                  <div className="info-row">
                    <span className="label">Approved At:</span>
                    <span className="val">{new Date(log.approved_at).toLocaleString()}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Approved By:</span>
                    <span className="val">{log.approved_by?.name || 'Site Manager'}</span>
                  </div>
                </>
              )}
            </div>

            {log.notes && (
              <div className="details-card">
                <div className="details-card-header">
                  <h2>Additional Supervisor Notes</h2>
                </div>
                <div className="log-section-content">
                  {log.notes}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SAFETY INCIDENTS */}
      {activeTab === 'incidents' && (
        <div className="details-card">
          <div className="details-card-header">
            <h2>
              <MdSecurity /> Safety Incidents & Near Misses Recorded Today
            </h2>
            <button
              className="btn btn-warning btn-sm"
              onClick={() => setIncidentModalOpen(true)}
            >
              <MdWarning /> Report Incident
            </button>
          </div>

          {!log.safety_incidents || log.safety_incidents.length === 0 ? (
            <div className="details-empty-state">
              <MdCheckCircle style={{ color: '#16a34a' }} />
              <h3>Zero Incidents Reported</h3>
              <p>No safety incidents or near misses were logged on this date. Safety protocol maintained.</p>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setIncidentModalOpen(true)}
              >
                Log Near Miss or Incident
              </button>
            </div>
          ) : (
            <div className="embedded-table-wrap">
              <table className="embedded-table">
                <thead>
                  <tr>
                    <th>Ref #</th>
                    <th>Type</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Incident Details</th>
                    <th>Injured Person</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {log.safety_incidents.map((inc) => (
                    <tr key={inc.uuid}>
                      <td>
                        <strong>{inc.incident_number}</strong>
                        {inc.incident_time && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {inc.incident_time}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ textTransform: 'capitalize' }}>
                          {inc.incident_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge severity-${inc.severity}`}>
                          {inc.severity.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge badge-${inc.status}`}>
                          {inc.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <strong>{inc.title}</strong>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                          {inc.description}
                        </div>
                        {inc.immediate_actions_taken && (
                          <div style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: '0.2rem' }}>
                            Action: {inc.immediate_actions_taken}
                          </div>
                        )}
                      </td>
                      <td>
                        {inc.injured_person_type !== 'none' ? (
                          <div>
                            <strong>{inc.injured_person_name || 'Person'}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'capitalize' }}>
                              ({inc.injured_person_type})
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>None</span>
                        )}
                      </td>
                      <td>
                        <div className="table-actions">
                          {inc.status === 'reported' && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setActiveIncidentForAction(inc)
                                setInvestigateActions(inc.immediate_actions_taken || '')
                                setInvestigateModalOpen(true)
                              }}
                            >
                              Investigate
                            </button>
                          )}
                          {(inc.status === 'reported' || inc.status === 'investigating' || inc.status === 'action_required') && (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => {
                                setActiveIncidentForAction(inc)
                                setCloseRootCause(inc.root_cause_analysis || '')
                                setClosePreventative(inc.preventative_measures || '')
                                setCloseModalOpen(true)
                              }}
                            >
                              Close Out
                            </button>
                          )}
                          {inc.status === 'closed' && (
                            <span style={{ color: '#16a34a', fontSize: '0.8rem', fontWeight: 600 }}>
                              Closed Out
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TOOLBOX TALKS */}
      {activeTab === 'toolbox' && (
        <div className="details-card">
          <div className="details-card-header">
            <h2>
              <MdRecordVoiceOver /> Safety Toolbox Talks & Briefings
            </h2>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setToolboxModalOpen(true)}
            >
              <MdRecordVoiceOver /> Record Toolbox Talk
            </button>
          </div>

          {!log.toolbox_talks || log.toolbox_talks.length === 0 ? (
            <div className="details-empty-state">
              <MdHelpOutline />
              <h3>No Toolbox Talks Logged</h3>
              <p>Record daily safety talks or pre-shift briefings held with site workers.</p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setToolboxModalOpen(true)}
              >
                Record Safety Briefing
              </button>
            </div>
          ) : (
            <div className="embedded-table-wrap">
              <table className="embedded-table">
                <thead>
                  <tr>
                    <th>Talk Ref</th>
                    <th>Topic</th>
                    <th>Category</th>
                    <th>Duration</th>
                    <th>Attendees</th>
                    <th>Key Discussion Points</th>
                  </tr>
                </thead>
                <tbody>
                  {log.toolbox_talks.map((talk) => (
                    <tr key={talk.uuid}>
                      <td>
                        <strong>{talk.talk_number}</strong>
                      </td>
                      <td>
                        <strong>{talk.topic}</strong>
                        {talk.conducted_by && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Conducted by: {talk.conducted_by.name}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="status-badge" style={{ background: '#f1f5f9', color: '#334155' }}>
                          {talk.category.toUpperCase().replace('_', ' ')}
                        </span>
                      </td>
                      <td>{talk.duration_minutes} mins</td>
                      <td>
                        <strong>{talk.attendees_count}</strong> workers
                        {Array.isArray(talk.attendees_names) && talk.attendees_names.length > 0 && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {talk.attendees_names.slice(0, 3).join(', ')}
                            {talk.attendees_names.length > 3 && ` +${talk.attendees_names.length - 3} more`}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>{talk.key_discussion_points}</div>
                        {talk.hazards_identified && (
                          <div style={{ fontSize: '0.75rem', color: '#ea580c', marginTop: '0.2rem' }}>
                            Hazards: {talk.hazards_identified}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PHOTOS & DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="details-card">
          <div className="details-card-header">
            <h2>
              <MdCloudUpload /> Site Photos & Document Attachments
            </h2>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setUploadModalOpen(true)}
            >
              <MdCloudUpload /> Upload Photo / Document
            </button>
          </div>

          <DocumentsTable
            documents={documents}
            onRefresh={fetchLog}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* Approve Modal */}
      {approveModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Approve Site Daily Log</h2>
              <button className="modal-close-btn" onClick={() => setApproveModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleApproveLog}>
              <div className="modal-body">
                <p>
                  Confirming manager approval for log <strong>{log.log_number}</strong> dated{' '}
                  <strong>{log.log_date}</strong>.
                </p>
                <div className="form-group">
                  <label>Approval Notes / Manager Endorsement</label>
                  <textarea
                    rows={4}
                    placeholder="Enter approval feedback or notes..."
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setApproveModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Approving...' : 'Approve Daily Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Incident Modal */}
      {incidentModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content modal-large">
            <div className="modal-header">
              <h2>Report Safety Incident / Near Miss</h2>
              <button className="modal-close-btn" onClick={() => setIncidentModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleCreateIncident}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Incident Type *</label>
                    <select
                      value={incType}
                      onChange={(e) => setIncType(e.target.value as IncidentType)}
                      required
                    >
                      <option value="near_miss">Near Miss</option>
                      <option value="first_aid">First Aid Case</option>
                      <option value="medical_treatment">Medical Treatment</option>
                      <option value="lost_time_injury">Lost Time Injury (LTI)</option>
                      <option value="property_damage">Property Damage</option>
                      <option value="environmental">Environmental Spill / Issue</option>
                      <option value="security">Security Incident</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Severity Level *</label>
                    <select
                      value={incSeverity}
                      onChange={(e) => setIncSeverity(e.target.value as IncidentSeverity)}
                      required
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical / Life Threatening</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Incident Time</label>
                    <input
                      type="time"
                      value={incTime}
                      onChange={(e) => setIncTime(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Specific Location On Site *</label>
                    <input
                      type="text"
                      placeholder="e.g. Scaffolding east elevation, level 2"
                      value={incLocation}
                      onChange={(e) => setIncLocation(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Incident Headline / Title *</label>
                  <input
                    type="text"
                    placeholder="Brief description of what occurred"
                    value={incTitle}
                    onChange={(e) => setIncTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Detailed Incident Description *</label>
                  <textarea
                    rows={3}
                    placeholder="Comprehensive description of the incident..."
                    value={incDesc}
                    onChange={(e) => setIncDesc(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Immediate Actions Taken</label>
                  <textarea
                    rows={2}
                    placeholder="First aid administered, area cordoned off, equipment tagged out..."
                    value={incActions}
                    onChange={(e) => setIncActions(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Injured Person Type</label>
                    <select
                      value={injuredType}
                      onChange={(e) => setInjuredType(e.target.value as InjuredPersonType)}
                    >
                      <option value="none">None (No Injury)</option>
                      <option value="worker">Direct Worker</option>
                      <option value="subcontractor">Subcontractor</option>
                      <option value="visitor">Site Visitor</option>
                      <option value="public">Member of Public</option>
                    </select>
                  </div>

                  {injuredType !== 'none' && (
                    <div className="form-group">
                      <label>Injured Person Name</label>
                      <input
                        type="text"
                        placeholder="Full name of affected individual"
                        value={injuredName}
                        onChange={(e) => setInjuredName(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIncidentModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-warning" disabled={actionLoading}>
                  {actionLoading ? 'Logging Incident...' : 'Save Safety Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Toolbox Talk Modal */}
      {toolboxModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content modal-large">
            <div className="modal-header">
              <h2>Record Safety Toolbox Talk</h2>
              <button className="modal-close-btn" onClick={() => setToolboxModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleCreateToolboxTalk}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Topic / Briefing Title *</label>
                    <input
                      type="text"
                      placeholder="e.g. Scaffolding safety & harness checks"
                      value={talkTopic}
                      onChange={(e) => setTalkTopic(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Safety Category *</label>
                    <select
                      value={talkCategory}
                      onChange={(e) => setTalkCategory(e.target.value as ToolboxTalkCategory)}
                      required
                    >
                      <option value="ppe">PPE & Personal Safety</option>
                      <option value="working_at_height">Working at Heights</option>
                      <option value="electrical_safety">Electrical Safety</option>
                      <option value="excavation">Excavation & Trenching</option>
                      <option value="heavy_equipment">Heavy Machinery & Cranes</option>
                      <option value="fire_safety">Fire Safety & Extinguishers</option>
                      <option value="housekeeping">Good Housekeeping</option>
                      <option value="heat_stress">Heat Stress & Hydration</option>
                      <option value="hazardous_materials">Hazardous Chemicals / COSHH</option>
                      <option value="other">Other Site Protocol</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Duration (Minutes) *</label>
                    <input
                      type="number"
                      min={5}
                      max={120}
                      value={talkDuration}
                      onChange={(e) => setTalkDuration(Number(e.target.value))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Attendees Count *</label>
                    <input
                      type="number"
                      min={1}
                      value={talkAttendeesCount}
                      onChange={(e) => setTalkAttendeesCount(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Attendees Names (Comma separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe, James Moyo, David Ncube"
                    value={talkAttendeesNames}
                    onChange={(e) => setTalkAttendeesNames(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Key Discussion Points *</label>
                  <textarea
                    rows={3}
                    placeholder="Summary of safety points covered during the talk..."
                    value={talkDiscussion}
                    onChange={(e) => setTalkDiscussion(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Hazards Identified / Worker Concerns Raised</label>
                  <textarea
                    rows={2}
                    placeholder="Any site hazards flagged by workers..."
                    value={talkHazards}
                    onChange={(e) => setTalkHazards(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setToolboxModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Record Toolbox Talk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Investigate Incident Modal */}
      {investigateModalOpen && activeIncidentForAction && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Launch Incident Investigation</h2>
              <button className="modal-close-btn" onClick={() => setInvestigateModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleInvestigateIncident}>
              <div className="modal-body">
                <p>
                  Start investigation for incident{' '}
                  <strong>{activeIncidentForAction.incident_number}: {activeIncidentForAction.title}</strong>.
                </p>
                <div className="form-group">
                  <label>Immediate Actions Taken / Initial Findings</label>
                  <textarea
                    rows={4}
                    placeholder="Describe immediate countermeasures taken..."
                    value={investigateActions}
                    onChange={(e) => setInvestigateActions(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setInvestigateModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Starting Investigation...' : 'Start Investigation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Incident Modal */}
      {closeModalOpen && activeIncidentForAction && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Close Out Safety Incident</h2>
              <button className="modal-close-btn" onClick={() => setCloseModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleCloseIncident}>
              <div className="modal-body">
                <p>
                  Completing close-out for{' '}
                  <strong>{activeIncidentForAction.incident_number} ({activeIncidentForAction.title})</strong>.
                </p>
                <div className="form-group">
                  <label>Root Cause Analysis (RCA) *</label>
                  <textarea
                    rows={3}
                    placeholder="State primary and secondary causes identified during investigation..."
                    value={closeRootCause}
                    onChange={(e) => setCloseRootCause(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Preventative & Corrective Measures *</label>
                  <textarea
                    rows={3}
                    placeholder="Actions enacted to eliminate recurrence..."
                    value={closePreventative}
                    onChange={(e) => setClosePreventative(e.target.value)}
                    required
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
                <button type="submit" className="btn btn-success" disabled={actionLoading}>
                  {actionLoading ? 'Closing Incident...' : 'Close Out Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Polymorphic Document Upload Modal */}
      {uploadModalOpen && log && (
        <DocumentUploadModal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          onSuccess={() => {
            setUploadModalOpen(false)
            fetchLog()
            triggerSuccess('Daily log photo / document uploaded!')
          }}
          defaultDocumentableType="site_daily_logs"
          defaultDocumentableId={log.id.toString()}
          title="Upload Daily Site Photo or Report"
        />
      )}

      {/* Soft Confirmation Modal for Log Submission */}
      <ConfirmDialog
        isOpen={showSubmitConfirm}
        title="Submit Daily Log"
        message={`Are you sure you want to submit daily log #${log?.log_number} (${log?.log_date}) for site manager review and formal sign-off?`}
        confirmText="Submit Daily Log"
        cancelText="Cancel"
        variant="primary"
        isLoading={actionLoading}
        onConfirm={executeSubmitLog}
        onClose={() => setShowSubmitConfirm(false)}
      />
    </div>
  )
}

export default DailyLogDetails
