import React, { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  MdSearch,
  MdAdd,
  MdRefresh,
  MdCheckCircle,
  MdEdit,
  MdClose,
  MdDoneAll,
  MdReportProblem,
  MdVerified,
  MdVisibility,
  MdWbSunny,
  MdCloud,
  MdThunderstorm,
  MdGroups,
  MdHealthAndSafety,
  MdRecordVoiceOver,
  MdAccessTime,
} from 'react-icons/md'
import {
  SiteDailyLog,
  SafetyIncident,
  SafetyToolboxTalk,
  DailyLogStatistics,
  SafetyStatistics,
  IncidentType,
  IncidentSeverity,
  ToolboxTalkCategory,
  InjuredPersonType,
  CreateSafetyIncidentInput,
  CreateToolboxTalkInput,
} from '../../types/daily-log.types'
import { Site } from '../../types/site.types'
import { Project } from '../../types/project.types'
import { AdminUser } from '../../types/admin.types'
import dailyLogService from '../../services/daily-log.service'
import { siteService } from '../../services/site.service'
import { projectService } from '../../services/project.service'
import { adminService } from '../../services/admin.service'
import './DailyLogsList.css'

export const DailyLogsList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialSiteId = searchParams.get('site_id') || ''
  const activeTabParam = (searchParams.get('tab') as 'logs' | 'incidents' | 'toolbox') || 'logs'

  // Tabs
  const [activeTab, setActiveTab] = useState<'logs' | 'incidents' | 'toolbox'>(activeTabParam)

  // Data states
  const [dailyLogs, setDailyLogs] = useState<SiteDailyLog[]>([])
  const [incidents, setIncidents] = useState<SafetyIncident[]>([])
  const [toolboxTalks, setToolboxTalks] = useState<SafetyToolboxTalk[]>([])
  const [stats, setStats] = useState<DailyLogStatistics | null>(null)
  const [safetyStats, setSafetyStats] = useState<SafetyStatistics | null>(null)

  // Lookups
  const [sites, setSites] = useState<Site[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])

  // Loading & Notifications
  const [loading, setLoading] = useState<boolean>(true)
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Filters - Daily Logs
  const [logSearch, setLogSearch] = useState<string>('')
  const [selectedSite, setSelectedSite] = useState<string>(initialSiteId)
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [delayedOnly, setDelayedOnly] = useState<boolean>(false)

  // Filters - Safety Incidents
  const [incidentSearch, setIncidentSearch] = useState<string>('')
  const [incidentSite, setIncidentSite] = useState<string>(initialSiteId)
  const [incidentTypeFilter, setIncidentTypeFilter] = useState<string>('')
  const [incidentSeverityFilter, setIncidentSeverityFilter] = useState<string>('')
  const [openIncidentsOnly, setOpenIncidentsOnly] = useState<boolean>(false)

  // Filters - Toolbox Talks
  const [toolboxSearch, setToolboxSearch] = useState<string>('')
  const [toolboxSite, setToolboxSite] = useState<string>(initialSiteId)
  const [toolboxCategory, setToolboxCategory] = useState<string>('')

  // Pagination
  const [logPage, setLogPage] = useState<number>(1)
  const [logTotal, setLogTotal] = useState<number>(0)
  const [incidentPage, setIncidentPage] = useState<number>(1)
  const [incidentTotal, setIncidentTotal] = useState<number>(0)
  const [toolboxPage, setToolboxPage] = useState<number>(1)
  const [toolboxTotal, setToolboxTotal] = useState<number>(0)

  // ==========================================
  // MODALS
  // ==========================================

  // 1. Approve Daily Log Modal
  const [approveModalOpen, setApproveModalOpen] = useState<boolean>(false)
  const [approveTarget, setApproveTarget] = useState<SiteDailyLog | null>(null)
  const [approvalNotes, setApprovalNotes] = useState<string>('')

  // 2. Quick Log Incident Modal
  const [incidentModalOpen, setIncidentModalOpen] = useState<boolean>(false)
  const [incFormSiteId, setIncFormSiteId] = useState<string>('')
  const [incFormType, setIncFormType] = useState<IncidentType>('near_miss')
  const [incFormSeverity, setIncFormSeverity] = useState<IncidentSeverity>('low')
  const [incFormTitle, setIncFormTitle] = useState<string>('')
  const [incFormLocation, setIncFormLocation] = useState<string>('')
  const [incFormDate, setIncFormDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [incFormTime, setIncFormTime] = useState<string>('09:00')
  const [incFormDesc, setIncFormDesc] = useState<string>('')
  const [incFormImmediate, setIncFormImmediate] = useState<string>('')
  const [incFormInjuredName, setIncFormInjuredName] = useState<string>('')
  const [incFormInjuredType, setIncFormInjuredType] = useState<InjuredPersonType>('none')

  // 3. Investigate Incident Modal
  const [investigateModalOpen, setInvestigateModalOpen] = useState<boolean>(false)
  const [investigateTarget, setInvestigateTarget] = useState<SafetyIncident | null>(null)
  const [investigatorId, setInvestigatorId] = useState<string>('')
  const [investigateActions, setInvestigateActions] = useState<string>('')

  // 4. Close Incident Modal
  const [closeModalOpen, setCloseModalOpen] = useState<boolean>(false)
  const [closeTarget, setCloseTarget] = useState<SafetyIncident | null>(null)
  const [rootCause, setRootCause] = useState<string>('')
  const [preventativeMeasures, setPreventativeMeasures] = useState<string>('')

  // 5. Quick Record Toolbox Talk Modal
  const [toolboxModalOpen, setToolboxModalOpen] = useState<boolean>(false)
  const [talkSiteId, setTalkSiteId] = useState<string>('')
  const [talkTopic, setTalkTopic] = useState<string>('')
  const [talkCategory, setTalkCategory] = useState<ToolboxTalkCategory>('ppe')
  const [talkDate, setTalkDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [talkDuration, setTalkDuration] = useState<number>(15)
  const [talkAttendeesCount, setTalkAttendeesCount] = useState<number>(12)
  const [talkAttendeesNames, setTalkAttendeesNames] = useState<string>('')
  const [talkPoints, setTalkPoints] = useState<string>('')
  const [talkHazards, setTalkHazards] = useState<string>('')

  // Load Lookups on mount
  useEffect(() => {
    siteService
      .getSites({ per_page: 100 })
      .then((res: any) => {
        const raw = res?.data || []
        setSites(Array.isArray(raw) ? raw : [])
      })
      .catch((e) => console.warn('Failed to load sites:', e))

    projectService
      .getProjects({ per_page: 100 })
      .then((res: any) => {
        const raw = res?.data || []
        setProjects(Array.isArray(raw) ? raw : [])
      })
      .catch((e) => console.warn('Failed to load projects:', e))

    adminService
      .getUsers({ per_page: 100 })
      .then((res: any) => {
        const raw = res?.data || []
        setUsers(Array.isArray(raw) ? raw : [])
      })
      .catch((e) => console.warn('Failed to load users:', e))
  }, [])

  // Sync tab with URL
  const handleTabChange = (tab: 'logs' | 'incidents' | 'toolbox') => {
    setActiveTab(tab)
    setSearchParams((prev) => {
      prev.set('tab', tab)
      return prev
    })
  }

  // Fetch Statistics
  const fetchStatistics = useCallback(async () => {
    try {
      const siteFilter = selectedSite || undefined
      const [logSt, safSt] = await Promise.all([
        dailyLogService.getDailyLogStatistics(siteFilter),
        dailyLogService.getSafetyStatistics(siteFilter),
      ])
      setStats(logSt)
      setSafetyStats(safSt)
    } catch (err: any) {
      console.warn('Failed to load statistics:', err)
    }
  }, [selectedSite])

  // Fetch Daily Logs
  const fetchDailyLogs = useCallback(async () => {
    try {
      setLoading(true)
      const res = await dailyLogService.getDailyLogs({
        site_id: selectedSite || undefined,
        project_id: selectedProject || undefined,
        status: selectedStatus || undefined,
        delayed_only: delayedOnly ? true : undefined,
        search: logSearch || undefined,
        page: logPage,
        per_page: 15,
      })
      const items = res?.data || []
      setDailyLogs(Array.isArray(items) ? items : [])
      setLogTotal(res?.pagination?.total ?? res?.meta?.total ?? items.length)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch daily logs')
    } finally {
      setLoading(false)
    }
  }, [selectedSite, selectedProject, selectedStatus, delayedOnly, logSearch, logPage])

  // Fetch Safety Incidents
  const fetchIncidents = useCallback(async () => {
    try {
      setLoading(true)
      const res = await dailyLogService.getIncidents({
        site_id: incidentSite || undefined,
        incident_type: incidentTypeFilter || undefined,
        severity: incidentSeverityFilter || undefined,
        open_only: openIncidentsOnly ? true : undefined,
        search: incidentSearch || undefined,
        page: incidentPage,
        per_page: 15,
      })
      const items = res?.data || []
      setIncidents(Array.isArray(items) ? items : [])
      setIncidentTotal(res?.pagination?.total ?? res?.meta?.total ?? items.length)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch safety incidents')
    } finally {
      setLoading(false)
    }
  }, [incidentSite, incidentTypeFilter, incidentSeverityFilter, openIncidentsOnly, incidentSearch, incidentPage])

  // Fetch Toolbox Talks
  const fetchToolboxTalks = useCallback(async () => {
    try {
      setLoading(true)
      const res = await dailyLogService.getToolboxTalks({
        site_id: toolboxSite || undefined,
        category: toolboxCategory || undefined,
        search: toolboxSearch || undefined,
        page: toolboxPage,
        per_page: 15,
      })
      const items = res?.data || []
      setToolboxTalks(Array.isArray(items) ? items : [])
      setToolboxTotal(res?.pagination?.total ?? res?.meta?.total ?? items.length)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch toolbox talks')
    } finally {
      setLoading(false)
    }
  }, [toolboxSite, toolboxCategory, toolboxSearch, toolboxPage])

  // Initial and reactive fetch
  useEffect(() => {
    fetchStatistics()
    if (activeTab === 'logs') fetchDailyLogs()
    else if (activeTab === 'incidents') fetchIncidents()
    else if (activeTab === 'toolbox') fetchToolboxTalks()
  }, [activeTab, fetchStatistics, fetchDailyLogs, fetchIncidents, fetchToolboxTalks])

  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg)
    setError(null)
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  // ==========================================
  // HANDLERS: APPROVE LOG
  // ==========================================

  const openApproveModal = (log: SiteDailyLog) => {
    setApproveTarget(log)
    setApprovalNotes('')
    setApproveModalOpen(true)
  }

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!approveTarget) return

    try {
      setActionLoading(true)
      await dailyLogService.approveDailyLog(approveTarget.uuid, approvalNotes)
      setApproveModalOpen(false)
      triggerSuccess(`Daily Log ${approveTarget.log_number} approved!`)
      fetchDailyLogs()
      fetchStatistics()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to approve daily log')
    } finally {
      setActionLoading(false)
    }
  }

  // ==========================================
  // HANDLERS: LOG INCIDENT
  // ==========================================

  const openIncidentModal = () => {
    setIncFormSiteId(selectedSite || (sites[0]?.uuid ?? ''))
    setIncFormType('near_miss')
    setIncFormSeverity('low')
    setIncFormTitle('')
    setIncFormLocation('')
    setIncFormDate(new Date().toISOString().split('T')[0])
    setIncFormTime('09:00')
    setIncFormDesc('')
    setIncFormImmediate('')
    setIncFormInjuredName('')
    setIncFormInjuredType('none')
    setIncidentModalOpen(true)
  }

  const handleIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!incFormTitle.trim() || !incFormSiteId) {
      setError('Title and Site are required.')
      return
    }

    try {
      setActionLoading(true)
      const input: CreateSafetyIncidentInput = {
        site_id: incFormSiteId,
        title: incFormTitle,
        incident_type: incFormType,
        severity: incFormSeverity,
        incident_date: incFormDate,
        incident_time: incFormTime || undefined,
        location_details: incFormLocation || 'General Site',
        description: incFormDesc,
        immediate_actions_taken: incFormImmediate || undefined,
        injured_person_name: incFormInjuredName || undefined,
        injured_person_type: incFormInjuredType,
      }
      const created = await dailyLogService.createIncident(input)
      setIncidentModalOpen(false)
      triggerSuccess(`Safety Incident ${created.incident_number} logged!`)
      if (activeTab === 'incidents') fetchIncidents()
      fetchStatistics()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to log safety incident')
    } finally {
      setActionLoading(false)
    }
  }

  // ==========================================
  // HANDLERS: INVESTIGATE & CLOSE INCIDENT
  // ==========================================

  const openInvestigateModal = (inc: SafetyIncident) => {
    setInvestigateTarget(inc)
    setInvestigatorId('')
    setInvestigateActions(inc.immediate_actions_taken || '')
    setInvestigateModalOpen(true)
  }

  const handleInvestigateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!investigateTarget) return

    try {
      setActionLoading(true)
      await dailyLogService.investigateIncident(investigateTarget.uuid, {
        investigator_id: investigatorId || undefined,
        immediate_actions_taken: investigateActions || undefined,
      })
      setInvestigateModalOpen(false)
      triggerSuccess(`Investigation initiated for ${investigateTarget.incident_number}`)
      fetchIncidents()
      fetchStatistics()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to start investigation')
    } finally {
      setActionLoading(false)
    }
  }

  const openCloseModal = (inc: SafetyIncident) => {
    setCloseTarget(inc)
    setRootCause('')
    setPreventativeMeasures('')
    setCloseModalOpen(true)
  }

  const handleCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!closeTarget || !rootCause.trim() || !preventativeMeasures.trim()) {
      setError('Root cause analysis and preventative measures are required.')
      return
    }

    try {
      setActionLoading(true)
      await dailyLogService.closeIncident(closeTarget.uuid, {
        root_cause_analysis: rootCause,
        preventative_measures: preventativeMeasures,
      })
      setCloseModalOpen(false)
      triggerSuccess(`Safety incident ${closeTarget.incident_number} closed with verified measures!`)
      fetchIncidents()
      fetchStatistics()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to close incident')
    } finally {
      setActionLoading(false)
    }
  }

  // ==========================================
  // HANDLERS: RECORD TOOLBOX TALK
  // ==========================================

  const openToolboxModal = () => {
    setTalkSiteId(selectedSite || (sites[0]?.uuid ?? ''))
    setTalkTopic('')
    setTalkCategory('ppe')
    setTalkDate(new Date().toISOString().split('T')[0])
    setTalkDuration(15)
    setTalkAttendeesCount(12)
    setTalkAttendeesNames('')
    setTalkPoints('')
    setTalkHazards('')
    setToolboxModalOpen(true)
  }

  const handleToolboxSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!talkTopic.trim() || !talkSiteId) {
      setError('Topic and Site are required.')
      return
    }

    try {
      setActionLoading(true)
      const namesList = talkAttendeesNames
        ? talkAttendeesNames.split(',').map((n) => n.trim()).filter((n) => n.length > 0)
        : undefined

      const input: CreateToolboxTalkInput = {
        site_id: talkSiteId,
        topic: talkTopic,
        category: talkCategory,
        conducted_at: talkDate,
        duration_minutes: talkDuration,
        attendees_count: talkAttendeesCount,
        attendees_names: namesList,
        key_discussion_points: talkPoints || 'Safety briefing conducted as scheduled.',
        hazards_identified: talkHazards || undefined,
      }
      const created = await dailyLogService.createToolboxTalk(input)
      setToolboxModalOpen(false)
      triggerSuccess(`Toolbox talk ${created.talk_number} recorded!`)
      if (activeTab === 'toolbox') fetchToolboxTalks()
      fetchStatistics()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to record toolbox talk')
    } finally {
      setActionLoading(false)
    }
  }

  // Weather Icon helper
  const renderWeatherIcon = (cond: string) => {
    switch (cond) {
      case 'clear':
      case 'sunny':
        return <MdWbSunny style={{ color: '#eab308' }} />
      case 'heavy_rain':
      case 'stormy':
        return <MdThunderstorm style={{ color: '#3b82f6' }} />
      default:
        return <MdCloud style={{ color: '#64748b' }} />
    }
  }

  return (
    <div className="daily-logs-container">
      {/* Header */}
      <div className="daily-logs-header">
        <div className="daily-logs-title-group">
          <h1>
            <MdHealthAndSafety style={{ color: '#0284c7' }} /> Site Daily Logs & Safety
          </h1>
          <p className="daily-logs-subtitle">
            Daily supervisor reports, weather & labor logs, safety incident investigations, and toolbox talks.
          </p>
        </div>
        <div className="daily-logs-header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => {
              fetchStatistics()
              if (activeTab === 'logs') fetchDailyLogs()
              else if (activeTab === 'incidents') fetchIncidents()
              else fetchToolboxTalks()
            }}
          >
            <MdRefresh /> Refresh
          </button>
          <button className="btn btn-secondary" onClick={() => openToolboxModal()}>
            <MdRecordVoiceOver style={{ color: '#0284c7' }} /> Record Toolbox Talk
          </button>
          <button className="btn btn-secondary" onClick={() => openIncidentModal()}>
            <MdReportProblem style={{ color: '#dc2626' }} /> Report Incident
          </button>
          <Link to="/daily-logs/new" className="btn btn-primary">
            <MdAdd /> Create Daily Log
          </Link>
        </div>
      </div>

      {successMessage && <div className="alert-banner success">{successMessage}</div>}
      {error && <div className="alert-banner error">{error}</div>}

      {/* KPI Cards Grid */}
      <div className="daily-logs-stats-grid">
        <div className="stat-card">
          <div className="stat-icon green">
            <MdHealthAndSafety />
          </div>
          <div className="stat-info">
            <span className="stat-label">Days Without Incident</span>
            <span className="stat-value">{stats?.days_without_lost_time ?? 0}</span>
            <span className="stat-subtext">Zero lost-time injuries streak</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            <MdGroups />
          </div>
          <div className="stat-info">
            <span className="stat-label">Avg Daily Workforce</span>
            <span className="stat-value">{stats?.average_daily_headcount ?? 0}</span>
            <span className="stat-subtext">Workers & subcontractors</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <MdThunderstorm />
          </div>
          <div className="stat-info">
            <span className="stat-label">Weather Delays</span>
            <span className="stat-value">{stats?.weather_delayed_days ?? 0} days</span>
            <span className="stat-subtext">{stats?.total_delay_hours ?? 0} hrs total lost</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon red">
            <MdReportProblem />
          </div>
          <div className="stat-info">
            <span className="stat-label">Safety Incidents</span>
            <span className="stat-value">{stats?.total_incidents ?? safetyStats?.total ?? 0}</span>
            <span className="stat-subtext">{stats?.open_incidents ?? safetyStats?.open ?? 0} Action Required</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon teal">
            <MdVerified />
          </div>
          <div className="stat-info">
            <span className="stat-label">Approved Daily Logs</span>
            <span className="stat-value">{stats?.approved_logs ?? 0}</span>
            <span className="stat-subtext">of {stats?.total_logs ?? 0} total logs</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="daily-logs-tabs">
        <button
          className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => handleTabChange('logs')}
        >
          <MdAccessTime /> Site Daily Logs
          <span className="tab-badge">{stats?.total_logs ?? 0}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'incidents' ? 'active' : ''}`}
          onClick={() => handleTabChange('incidents')}
        >
          <MdReportProblem /> Safety Incidents & Near Misses
          <span className={`tab-badge ${(stats?.open_incidents ?? 0) > 0 ? 'badge-urgent' : ''}`}>
            {stats?.open_incidents ?? 0}
          </span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'toolbox' ? 'active' : ''}`}
          onClick={() => handleTabChange('toolbox')}
        >
          <MdRecordVoiceOver /> Toolbox Safety Briefings
          <span className="tab-badge">{toolboxTotal}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SITE DAILY LOGS                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'logs' && (
        <>
          <div className="daily-logs-filters">
            <div className="filter-search-box">
              <MdSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search work performed, delays, materials..."
                value={logSearch}
                onChange={(e) => {
                  setLogSearch(e.target.value)
                  setLogPage(1)
                }}
              />
            </div>

            <select
              className="filter-select"
              value={selectedSite}
              onChange={(e) => {
                setSelectedSite(e.target.value)
                setLogPage(1)
              }}
            >
              <option value="">All Sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.uuid || s.id}>
                  {s.site_name || s.name}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value)
                setLogPage(1)
              }}
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.uuid || p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value)
                setLogPage(1)
              }}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
            </select>

            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={delayedOnly}
                onChange={(e) => {
                  setDelayedOnly(e.target.checked)
                  setLogPage(1)
                }}
              />
              Weather Delayed Only
            </label>
          </div>

          <div className="daily-logs-table-card">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Log #</th>
                    <th>Date</th>
                    <th>Weather & Temp</th>
                    <th>Workforce</th>
                    <th>Work Summary</th>
                    <th>Status</th>
                    <th>Supervisor</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && dailyLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                        Loading site daily logs...
                      </td>
                    </tr>
                  ) : dailyLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="empty-state">
                          <MdAccessTime className="empty-state-icon" />
                          <p>No site daily supervisor logs found matching filters.</p>
                          <Link to="/daily-logs/new" className="btn btn-primary btn-sm">
                            <MdAdd /> Create Today's Daily Log
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    dailyLogs.map((log) => (
                      <tr key={log.uuid}>
                        <td>
                          <div className="table-identity-cell">
                            <Link to={`/daily-logs/${log.uuid}`} className="table-entity-title">
                              {log.log_number}
                            </Link>
                            <span className="table-entity-code">{log.site?.name || 'All Sites'}</span>
                          </div>
                        </td>
                        <td>{log.log_date}</td>
                        <td>
                          <div className="weather-badge">
                            {renderWeatherIcon(log.weather_condition)}
                            <span style={{ textTransform: 'capitalize' }}>
                              {log.weather_condition.replace(/_/g, ' ')}
                            </span>
                            {log.temperature_celsius !== null && (
                              <span style={{ fontWeight: 600 }}>{log.temperature_celsius}°C</span>
                            )}
                          </div>
                          {log.work_delayed_by_weather && (
                            <div style={{ color: '#ea580c', fontSize: '0.75rem', fontWeight: 600 }}>
                              Delayed: {log.delay_hours} hrs
                            </div>
                          )}
                        </td>
                        <td>
                          <strong>{log.total_headcount}</strong> personnel
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {log.labor_headcount} labor • {log.subcontractor_headcount} sub
                          </div>
                        </td>
                        <td>
                          <div
                            style={{
                              maxWidth: '300px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={log.work_performed_summary}
                          >
                            {log.work_performed_summary}
                          </div>
                        </td>
                        <td>
                          <span className={`badge badge-${log.status}`}>{log.status}</span>
                        </td>
                        <td>
                          <div>{log.supervisor?.name || 'Unassigned'}</div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                            <Link to={`/daily-logs/${log.uuid}`} className="action-icon-btn" title="View Details">
                              <MdVisibility />
                            </Link>
                            {log.status === 'submitted' && (
                              <button
                                className="action-icon-btn btn-approve"
                                onClick={() => openApproveModal(log)}
                                title="Approve Daily Log"
                              >
                                <MdDoneAll />
                              </button>
                            )}
                            <Link to={`/daily-logs/${log.uuid}/edit`} className="action-icon-btn" title="Edit Log">
                              <MdEdit />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {logTotal > 15 && (
              <div className="pagination-controls">
                <span>
                  Showing {dailyLogs.length} of {logTotal} logs
                </span>
                <div className="pagination-pages">
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={logPage <= 1}
                    onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <span style={{ padding: '0.35rem 0.75rem', fontWeight: 600 }}>Page {logPage}</span>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={dailyLogs.length < 15}
                    onClick={() => setLogPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SAFETY INCIDENTS & NEAR MISSES                                     */}
      {/* ========================================================================= */}
      {activeTab === 'incidents' && (
        <>
          <div className="daily-logs-filters">
            <div className="filter-search-box">
              <MdSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search incident title, number, person, description..."
                value={incidentSearch}
                onChange={(e) => {
                  setIncidentSearch(e.target.value)
                  setIncidentPage(1)
                }}
              />
            </div>

            <select
              className="filter-select"
              value={incidentSite}
              onChange={(e) => {
                setIncidentSite(e.target.value)
                setIncidentPage(1)
              }}
            >
              <option value="">All Sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.uuid || s.id}>
                  {s.site_name || s.name}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={incidentTypeFilter}
              onChange={(e) => {
                setIncidentTypeFilter(e.target.value)
                setIncidentPage(1)
              }}
            >
              <option value="">All Incident Types</option>
              <option value="near_miss">Near Miss</option>
              <option value="first_aid">First Aid</option>
              <option value="medical_treatment">Medical Treatment</option>
              <option value="lost_time_injury">Lost Time Injury</option>
              <option value="property_damage">Property Damage</option>
              <option value="environmental">Environmental</option>
              <option value="security">Security</option>
              <option value="other">Other</option>
            </select>

            <select
              className="filter-select"
              value={incidentSeverityFilter}
              onChange={(e) => {
                setIncidentSeverityFilter(e.target.value)
                setIncidentPage(1)
              }}
            >
              <option value="">All Severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>

            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={openIncidentsOnly}
                onChange={(e) => {
                  setOpenIncidentsOnly(e.target.checked)
                  setIncidentPage(1)
                }}
              />
              Open Incidents Only
            </label>
          </div>

          <div className="daily-logs-table-card">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Incident</th>
                    <th>Type</th>
                    <th>Severity</th>
                    <th>Date & Time</th>
                    <th>Site / Location</th>
                    <th>Injured Person</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && incidents.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                        Loading safety incidents...
                      </td>
                    </tr>
                  ) : incidents.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="empty-state">
                          <MdCheckCircle className="empty-state-icon" style={{ color: '#16a34a' }} />
                          <p>Zero safety incidents recorded. Safe construction site!</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    incidents.map((inc) => (
                      <tr key={inc.uuid}>
                        <td>
                          <div className="table-identity-cell">
                            <span className="table-entity-title">{inc.title}</span>
                            <span className="table-entity-code">{inc.incident_number}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ textTransform: 'capitalize' }}>
                            {inc.incident_type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td>
                          <span className={`badge severity-${inc.severity}`}>{inc.severity}</span>
                        </td>
                        <td>
                          <div>{inc.incident_date}</div>
                          {inc.incident_time && (
                            <small style={{ color: '#64748b' }}>{inc.incident_time}</small>
                          )}
                        </td>
                        <td>
                          <div>{inc.site?.name || '—'}</div>
                          <small style={{ color: '#64748b' }}>{inc.location_details}</small>
                        </td>
                        <td>
                          {inc.injured_person_name ? (
                            <div>
                              <strong>{inc.injured_person_name}</strong>
                              <small style={{ color: '#64748b', display: 'block' }}>
                                ({inc.injured_person_type})
                              </small>
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>None</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge badge-${inc.status}`}>
                            {inc.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                            {inc.status === 'reported' && (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => openInvestigateModal(inc)}
                              >
                                Investigate
                              </button>
                            )}
                            {inc.is_open && (
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => openCloseModal(inc)}
                              >
                                Close Incident
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {incidentTotal > 15 && (
              <div className="pagination-controls">
                <span>
                  Showing {incidents.length} of {incidentTotal} incidents
                </span>
                <div className="pagination-pages">
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={incidentPage <= 1}
                    onClick={() => setIncidentPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <span style={{ padding: '0.35rem 0.75rem', fontWeight: 600 }}>Page {incidentPage}</span>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={incidents.length < 15}
                    onClick={() => setIncidentPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TOOLBOX TALKS                                                      */}
      {/* ========================================================================= */}
      {activeTab === 'toolbox' && (
        <>
          <div className="daily-logs-filters">
            <div className="filter-search-box">
              <MdSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search toolbox topic, discussion points, hazards..."
                value={toolboxSearch}
                onChange={(e) => {
                  setToolboxSearch(e.target.value)
                  setToolboxPage(1)
                }}
              />
            </div>

            <select
              className="filter-select"
              value={toolboxSite}
              onChange={(e) => {
                setToolboxSite(e.target.value)
                setToolboxPage(1)
              }}
            >
              <option value="">All Sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.uuid || s.id}>
                  {s.site_name || s.name}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={toolboxCategory}
              onChange={(e) => {
                setToolboxCategory(e.target.value)
                setToolboxPage(1)
              }}
            >
              <option value="">All Topics</option>
              <option value="ppe">PPE Compliance</option>
              <option value="working_at_height">Working at Height</option>
              <option value="electrical_safety">Electrical Safety</option>
              <option value="excavation">Excavation & Trenching</option>
              <option value="heavy_equipment">Heavy Machinery</option>
              <option value="fire_safety">Fire Safety</option>
              <option value="housekeeping">Site Housekeeping</option>
              <option value="heat_stress">Heat Stress & Hydration</option>
              <option value="hazardous_materials">Hazardous Chemicals</option>
              <option value="other">Other Safety Topic</option>
            </select>
          </div>

          <div className="daily-logs-table-card">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Briefing #</th>
                    <th>Topic</th>
                    <th>Category</th>
                    <th>Date</th>
                    <th>Duration</th>
                    <th>Attendees</th>
                    <th>Conducted By</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && toolboxTalks.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                        Loading toolbox safety talks...
                      </td>
                    </tr>
                  ) : toolboxTalks.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="empty-state">
                          <MdRecordVoiceOver className="empty-state-icon" style={{ color: '#0284c7' }} />
                          <p>No safety toolbox briefings recorded yet.</p>
                          <button className="btn btn-primary btn-sm" onClick={() => openToolboxModal()}>
                            <MdAdd /> Record First Toolbox Talk
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    toolboxTalks.map((talk) => (
                      <tr key={talk.uuid}>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                            {talk.talk_number}
                          </span>
                        </td>
                        <td>
                          <strong>{talk.topic}</strong>
                        </td>
                        <td>
                          <span style={{ textTransform: 'capitalize' }}>
                            {talk.category.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td>{talk.conducted_at}</td>
                        <td>{talk.duration_minutes} mins</td>
                        <td>
                          <strong>{talk.attendees_count}</strong> workers
                        </td>
                        <td>{talk.conducted_by?.name || 'Safety Supervisor'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {toolboxTotal > 15 && (
              <div className="pagination-controls">
                <span>
                  Showing {toolboxTalks.length} of {toolboxTotal} safety talks
                </span>
                <div className="pagination-pages">
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={toolboxPage <= 1}
                    onClick={() => setToolboxPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <span style={{ padding: '0.35rem 0.75rem', fontWeight: 600 }}>Page {toolboxPage}</span>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={toolboxTalks.length < 15}
                    onClick={() => setToolboxPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: APPROVE DAILY LOG                                                */}
      {/* ========================================================================= */}
      {approveModalOpen && approveTarget && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Approve Daily Log — {approveTarget.log_number}</h2>
              <button className="modal-close-btn" onClick={() => setApproveModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleApproveSubmit}>
              <div className="modal-body">
                <p>
                  Confirming approval for <strong>{approveTarget.site?.name}</strong> daily log on{' '}
                  <strong>{approveTarget.log_date}</strong>.
                </p>
                <div className="form-group">
                  <label>Approval Notes / Manager Remarks</label>
                  <textarea
                    rows={3}
                    placeholder="Enter approval confirmation remarks..."
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
                <button type="submit" className="btn btn-success" disabled={actionLoading}>
                  {actionLoading ? 'Approving...' : 'Confirm & Approve Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: LOG SAFETY INCIDENT                                              */}
      {/* ========================================================================= */}
      {incidentModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content modal-large">
            <div className="modal-header">
              <h2>Report Safety Incident / Near Miss</h2>
              <button className="modal-close-btn" onClick={() => setIncidentModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleIncidentSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Incident Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Scaffolding plank displacement during material haul"
                    value={incFormTitle}
                    onChange={(e) => setIncFormTitle(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Construction Site *</label>
                    <select
                      required
                      value={incFormSiteId}
                      onChange={(e) => setIncFormSiteId(e.target.value)}
                    >
                      <option value="">Select Site</option>
                      {sites.map((s) => (
                        <option key={s.id} value={s.uuid || s.id}>
                          {s.site_name || s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Location Details *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 2nd floor balcony perimeter"
                      value={incFormLocation}
                      onChange={(e) => setIncFormLocation(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Incident Type *</label>
                    <select
                      value={incFormType}
                      onChange={(e) => setIncFormType(e.target.value as IncidentType)}
                    >
                      <option value="near_miss">Near Miss (No Injury)</option>
                      <option value="first_aid">First Aid Case</option>
                      <option value="medical_treatment">Medical Treatment</option>
                      <option value="lost_time_injury">Lost Time Injury (LTI)</option>
                      <option value="property_damage">Property Damage</option>
                      <option value="environmental">Environmental Spill</option>
                      <option value="security">Security Breach</option>
                      <option value="other">Other Incident</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Severity Level *</label>
                    <select
                      value={incFormSeverity}
                      onChange={(e) => setIncFormSeverity(e.target.value as IncidentSeverity)}
                    >
                      <option value="low">Low (Minor cut/bruise, no delay)</option>
                      <option value="medium">Medium (First aid applied, minor delay)</option>
                      <option value="high">High (Medical clinic visit required)</option>
                      <option value="critical">Critical (Hospitalization, severe damage)</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Incident Date *</label>
                    <input
                      type="date"
                      required
                      value={incFormDate}
                      onChange={(e) => setIncFormDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Incident Time</label>
                    <input
                      type="time"
                      value={incFormTime}
                      onChange={(e) => setIncFormTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Injured Person Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="Leave blank if near miss / no injury"
                      value={incFormInjuredName}
                      onChange={(e) => setIncFormInjuredName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Person Role</label>
                    <select
                      value={incFormInjuredType}
                      onChange={(e) => setIncFormInjuredType(e.target.value as InjuredPersonType)}
                    >
                      <option value="none">None / No Injury</option>
                      <option value="worker">Direct Worker</option>
                      <option value="subcontractor">Subcontractor</option>
                      <option value="visitor">Visitor</option>
                      <option value="public">Member of Public</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Full Description of Incident *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe what occurred, sequence of events, and equipment involved..."
                    value={incFormDesc}
                    onChange={(e) => setIncFormDesc(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Immediate Actions Taken</label>
                  <textarea
                    rows={2}
                    placeholder="Immediate containment, first aid treatment, or area cordoned off..."
                    value={incFormImmediate}
                    onChange={(e) => setIncFormImmediate(e.target.value)}
                  />
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
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Logging...' : 'Submit Incident Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: INVESTIGATE INCIDENT                                             */}
      {/* ========================================================================= */}
      {investigateModalOpen && investigateTarget && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Initiate Investigation — {investigateTarget.incident_number}</h2>
              <button className="modal-close-btn" onClick={() => setInvestigateModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleInvestigateSubmit}>
              <div className="modal-body">
                <p>
                  <strong>Incident:</strong> {investigateTarget.title} ({investigateTarget.severity})
                </p>
                <div className="form-group">
                  <label>Assigned Lead Investigator</label>
                  <select value={investigatorId} onChange={(e) => setInvestigatorId(e.target.value)}>
                    <option value="">Current User (Self)</option>
                    {users.map((u) => (
                      <option key={u.uuid} value={u.uuid}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Initial Immediate Actions</label>
                  <textarea
                    rows={3}
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
                  {actionLoading ? 'Saving...' : 'Start Investigation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CLOSE INCIDENT                                                   */}
      {/* ========================================================================= */}
      {closeModalOpen && closeTarget && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Close Incident — {closeTarget.incident_number}</h2>
              <button className="modal-close-btn" onClick={() => setCloseModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleCloseSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Root Cause Analysis *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Explain why the hazard occurred and systemic breakdowns..."
                    value={rootCause}
                    onChange={(e) => setRootCause(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Preventative Measures Implemented *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Specify training, engineering guards, or SOP updates..."
                    value={preventativeMeasures}
                    onChange={(e) => setPreventativeMeasures(e.target.value)}
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
                  {actionLoading ? 'Closing...' : 'Close & Archive Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: RECORD TOOLBOX TALK                                              */}
      {/* ========================================================================= */}
      {toolboxModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content modal-large">
            <div className="modal-header">
              <h2>Record Safety Toolbox Briefing</h2>
              <button className="modal-close-btn" onClick={() => setToolboxModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleToolboxSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Briefing Topic *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Scaffolding tag verification and 100% tie-off policy"
                    value={talkTopic}
                    onChange={(e) => setTalkTopic(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Construction Site *</label>
                    <select
                      required
                      value={talkSiteId}
                      onChange={(e) => setTalkSiteId(e.target.value)}
                    >
                      <option value="">Select Site</option>
                      {sites.map((s) => (
                        <option key={s.id} value={s.uuid || s.id}>
                          {s.site_name || s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Safety Category *</label>
                    <select
                      value={talkCategory}
                      onChange={(e) => setTalkCategory(e.target.value as ToolboxTalkCategory)}
                    >
                      <option value="ppe">PPE Compliance</option>
                      <option value="working_at_height">Working at Height</option>
                      <option value="electrical_safety">Electrical Safety</option>
                      <option value="excavation">Excavation & Trenching</option>
                      <option value="heavy_equipment">Heavy Machinery</option>
                      <option value="fire_safety">Fire Safety</option>
                      <option value="housekeeping">Site Housekeeping</option>
                      <option value="heat_stress">Heat Stress & Hydration</option>
                      <option value="hazardous_materials">Hazardous Chemicals</option>
                      <option value="other">Other Safety Topic</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Date Conducted *</label>
                    <input
                      type="date"
                      required
                      value={talkDate}
                      onChange={(e) => setTalkDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Duration (Minutes)</label>
                    <input
                      type="number"
                      min="5"
                      max="120"
                      value={talkDuration}
                      onChange={(e) => setTalkDuration(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Total Attendees *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={talkAttendeesCount}
                      onChange={(e) => setTalkAttendeesCount(Number(e.target.value))}
                    />
                  </div>

                  <div className="form-group">
                    <label>Attendee Names (Comma separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. John Mukasa, David Okello, Peter Musoke"
                      value={talkAttendeesNames}
                      onChange={(e) => setTalkAttendeesNames(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Key Discussion Points</label>
                  <textarea
                    rows={3}
                    placeholder="Summary of safety pointers and practical guidance given to the workers..."
                    value={talkPoints}
                    onChange={(e) => setTalkPoints(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Hazards Identified on Site</label>
                  <input
                    type="text"
                    placeholder="e.g. Muddy ground near excavation trench, water accumulation"
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
                  {actionLoading ? 'Recording...' : 'Record Toolbox Talk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default DailyLogsList
