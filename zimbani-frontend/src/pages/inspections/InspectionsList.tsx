import React, { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  MdSearch,
  MdAdd,
  MdRefresh,
  MdFactCheck,
  MdCheckCircle,
  MdEdit,
  MdDelete,
  MdClose,
  MdDoneAll,
  MdAssignmentTurnedIn,
  MdPlaylistAddCheck,
  MdReportProblem,
  MdVerified,
  MdVisibility,
  MdSync,
} from 'react-icons/md'
import {
  SiteInspection,
  PunchListItem,
  InspectionStatistics,
  DefectStatistics,
  PunchSeverity,
  PunchCategory,
  ChecklistItem,
  CompleteInspectionInput,
  SignOffInspectionInput,
  CreatePunchListItemInput,
  RectifyPunchListItemInput,
  VerifyPunchListItemInput,
} from '../../types/inspection.types'
import { Site } from '../../types/site.types'
import { Project } from '../../types/project.types'
import { AdminUser } from '../../types/admin.types'
import inspectionService from '../../services/inspection.service'
import { siteService } from '../../services/site.service'
import { projectService } from '../../services/project.service'
import { adminService } from '../../services/admin.service'
import OfflineWalkthroughConsole from './components/OfflineWalkthroughConsole'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import './InspectionsList.css'

export const InspectionsList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialSiteId = searchParams.get('site_id') || ''
  const activeTabParam =
    (searchParams.get('tab') as 'inspections' | 'defects' | 'signoffs' | 'walkthrough') ||
    'inspections'

  // Tabs
  const [activeTab, setActiveTab] = useState<'inspections' | 'defects' | 'signoffs' | 'walkthrough'>(
    activeTabParam
  )

  // Data states
  const [inspections, setInspections] = useState<SiteInspection[]>([])
  const [punchItems, setPunchItems] = useState<PunchListItem[]>([])
  const [signOffQueue, setSignOffQueue] = useState<SiteInspection[]>([])
  const [stats, setStats] = useState<InspectionStatistics | null>(null)
  const [defectStats, setDefectStats] = useState<DefectStatistics | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    variant: 'danger' | 'warning' | 'primary'
    confirmText?: string
    onConfirm: () => void
  } | null>(null)

  // Lookups
  const [sites, setSites] = useState<Site[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])

  // Loading & notification states
  const [loading, setLoading] = useState<boolean>(true)
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Inspection Filters
  const [inspectionSearch, setInspectionSearch] = useState<string>('')
  const [selectedSite, setSelectedSite] = useState<string>(initialSiteId)
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [selectedType, setSelectedType] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')

  // Defect Filters
  const [defectSearch, setDefectSearch] = useState<string>('')
  const [defectSite, setDefectSite] = useState<string>(initialSiteId)
  const [defectCategory, setDefectCategory] = useState<string>('')
  const [defectSeverity, setDefectSeverity] = useState<string>('')
  const [defectStatus, setDefectStatus] = useState<string>('')
  const [openDefectsOnly, setOpenDefectsOnly] = useState<boolean>(false)
  const [overdueDefectsOnly, setOverdueDefectsOnly] = useState<boolean>(false)

  // Pagination
  const [inspectionPage, setInspectionPage] = useState<number>(1)
  const [inspectionTotal, setInspectionTotal] = useState<number>(0)
  const [defectPage, setDefectPage] = useState<number>(1)
  const [defectTotal, setDefectTotal] = useState<number>(0)

  // ==========================================
  // MODAL STATES
  // ==========================================

  // 1. Complete Assessment Modal
  const [completeModalOpen, setCompleteModalOpen] = useState<boolean>(false)
  const [targetInspection, setTargetInspection] = useState<SiteInspection | null>(null)
  const [assessmentStatus, setAssessmentStatus] = useState<'passed' | 'failed' | 'passed_with_conditions'>('passed')
  const [assessmentScore, setAssessmentScore] = useState<number>(100)
  const [assessmentChecklist, setAssessmentChecklist] = useState<ChecklistItem[]>([])
  const [assessmentNotes, setAssessmentNotes] = useState<string>('')
  const [assessmentConditions, setAssessmentConditions] = useState<string>('')

  // 2. Sign-off Modal
  const [signOffModalOpen, setSignOffModalOpen] = useState<boolean>(false)
  const [signOffTarget, setSignOffTarget] = useState<SiteInspection | null>(null)
  const [signOffNotes, setSignOffNotes] = useState<string>('')

  // 3. Quick Defect Modal
  const [createDefectModalOpen, setCreateDefectModalOpen] = useState<boolean>(false)
  const [defectFormTitle, setDefectFormTitle] = useState<string>('')
  const [defectFormSiteId, setDefectFormSiteId] = useState<string>('')
  const [defectFormInspectionId, setDefectFormInspectionId] = useState<string>('')
  const [defectFormCategory, setDefectFormCategory] = useState<PunchCategory>('structural')
  const [defectFormSeverity, setDefectFormSeverity] = useState<PunchSeverity>('medium')
  const [defectFormDueDate, setDefectFormDueDate] = useState<string>('')
  const [defectFormAssignedTo, setDefectFormAssignedTo] = useState<string>('')
  const [defectFormLocation, setDefectFormLocation] = useState<string>('')
  const [defectFormDesc, setDefectFormDesc] = useState<string>('')

  // 4. Rectify Defect Modal
  const [rectifyModalOpen, setRectifyModalOpen] = useState<boolean>(false)
  const [rectifyTarget, setRectifyTarget] = useState<PunchListItem | null>(null)
  const [rectificationNotes, setRectificationNotes] = useState<string>('')

  // 5. Verify Defect Modal
  const [verifyModalOpen, setVerifyModalOpen] = useState<boolean>(false)
  const [verifyTarget, setVerifyTarget] = useState<PunchListItem | null>(null)
  const [verifyAction, setVerifyAction] = useState<'close' | 'waive'>('close')
  const [verificationNotes, setVerificationNotes] = useState<string>('')

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
  const handleTabChange = (tab: 'inspections' | 'defects' | 'signoffs' | 'walkthrough') => {
    setActiveTab(tab)
    setSearchParams((prev) => {
      prev.set('tab', tab)
      return prev
    })
  }

  // Fetch Stats
  const fetchStatistics = useCallback(async () => {
    try {
      const siteFilter = selectedSite || undefined
      const [inspStats, defStats] = await Promise.all([
        inspectionService.getInspectionStatistics(siteFilter),
        inspectionService.getPunchStatistics(siteFilter),
      ])
      setStats(inspStats)
      setDefectStats(defStats)
    } catch (err: any) {
      console.warn('Failed to load statistics:', err)
    }
  }, [selectedSite])

  // Fetch Inspections
  const fetchInspections = useCallback(async () => {
    try {
      setLoading(true)
      const res = await inspectionService.getInspections({
        site_id: selectedSite || undefined,
        project_id: selectedProject || undefined,
        inspection_type: selectedType || undefined,
        status: selectedStatus || undefined,
        search: inspectionSearch || undefined,
        page: inspectionPage,
        per_page: 15,
      })
      const items = res?.data || []
      setInspections(Array.isArray(items) ? items : [])
      setInspectionTotal(res?.pagination?.total ?? res?.meta?.total ?? items.length)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch inspections')
    } finally {
      setLoading(false)
    }
  }, [selectedSite, selectedProject, selectedType, selectedStatus, inspectionSearch, inspectionPage])

  // Fetch Punch Items / Defects
  const fetchPunchItems = useCallback(async () => {
    try {
      setLoading(true)
      const res = await inspectionService.getPunchList({
        site_id: defectSite || undefined,
        category: defectCategory || undefined,
        severity: defectSeverity || undefined,
        status: defectStatus || undefined,
        open_only: openDefectsOnly ? true : undefined,
        overdue_only: overdueDefectsOnly ? true : undefined,
        search: defectSearch || undefined,
        page: defectPage,
        per_page: 15,
      })
      const items = res?.data || []
      setPunchItems(Array.isArray(items) ? items : [])
      setDefectTotal(res?.pagination?.total ?? res?.meta?.total ?? items.length)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch punch list defects')
    } finally {
      setLoading(false)
    }
  }, [
    defectSite,
    defectCategory,
    defectSeverity,
    defectStatus,
    openDefectsOnly,
    overdueDefectsOnly,
    defectSearch,
    defectPage,
  ])

  // Fetch Sign-off Queue
  const fetchSignOffQueue = useCallback(async () => {
    try {
      setLoading(true)
      const res = await inspectionService.getInspections({
        needs_sign_off: true,
        site_id: selectedSite || undefined,
        per_page: 30,
      })
      const items = res?.data || []
      setSignOffQueue(Array.isArray(items) ? items : [])
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch pending sign-offs')
    } finally {
      setLoading(false)
    }
  }, [selectedSite])

  // Trigger data load when tab or filters change
  useEffect(() => {
    fetchStatistics()
    if (activeTab === 'inspections') {
      fetchInspections()
    } else if (activeTab === 'defects') {
      fetchPunchItems()
    } else if (activeTab === 'signoffs') {
      fetchSignOffQueue()
    }
  }, [activeTab, fetchStatistics, fetchInspections, fetchPunchItems, fetchSignOffQueue])

  // Helper auto-dismiss notification
  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg)
    setError(null)
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  // ==========================================
  // HANDLERS: COMPLETE INSPECTION
  // ==========================================

  const openCompleteModal = (insp: SiteInspection) => {
    setTargetInspection(insp)
    setAssessmentStatus(insp.status === 'scheduled' || insp.status === 'in_progress' ? 'passed' : (insp.status as any))
    setAssessmentScore(insp.score ?? 100)
    setAssessmentConditions(insp.conditions || '')
    setAssessmentNotes(insp.summary_notes || '')

    // Deep copy checklist items or provide default
    const existing = Array.isArray(insp.checklist_items) && insp.checklist_items.length > 0
      ? JSON.parse(JSON.stringify(insp.checklist_items))
      : [
          { item_text: 'Adherence to architectural & structural drawings', status: 'pass', notes: '' },
          { item_text: 'Materials quality specification compliance', status: 'pass', notes: '' },
          { item_text: 'Workmanship standards & surface alignment', status: 'pass', notes: '' },
          { item_text: 'Safety precautions & site housekeeping', status: 'pass', notes: '' },
        ]
    setAssessmentChecklist(existing)
    setCompleteModalOpen(true)
  }

  const updateChecklistItemStatus = (idx: number, status: 'pass' | 'fail' | 'na' | 'pending') => {
    const updated = [...assessmentChecklist]
    updated[idx] = { ...updated[idx], status }
    setAssessmentChecklist(updated)

    // Auto-calculate suggested score & status
    const answered = updated.filter((i) => i.status !== 'na' && i.status !== 'pending')
    if (answered.length > 0) {
      const passes = updated.filter((i) => i.status === 'pass').length
      const calculatedScore = Math.round((passes / answered.length) * 100)
      setAssessmentScore(calculatedScore)
      if (calculatedScore === 100) {
        setAssessmentStatus('passed')
      } else if (calculatedScore >= 75) {
        setAssessmentStatus('passed_with_conditions')
      } else {
        setAssessmentStatus('failed')
      }
    }
  }

  const handleSaveAssessment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetInspection) return

    try {
      setActionLoading(true)
      const input: CompleteInspectionInput = {
        status: assessmentStatus,
        score: assessmentScore,
        checklist_items: assessmentChecklist,
        summary_notes: assessmentNotes,
        conditions: assessmentStatus === 'passed_with_conditions' ? assessmentConditions : undefined,
      }
      await inspectionService.completeInspection(targetInspection.uuid, input)
      setCompleteModalOpen(false)
      triggerSuccess(`Inspection ${targetInspection.inspection_number} assessment recorded!`)
      fetchInspections()
      fetchStatistics()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to complete inspection assessment')
    } finally {
      setActionLoading(false)
    }
  }

  // ==========================================
  // HANDLERS: SUPERVISOR SIGN-OFF
  // ==========================================

  const openSignOffModal = (insp: SiteInspection) => {
    setSignOffTarget(insp)
    setSignOffNotes(insp.sign_off_notes || '')
    setSignOffModalOpen(true)
  }

  const handleSignOffSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signOffTarget) return

    try {
      setActionLoading(true)
      const input: SignOffInspectionInput = {
        sign_off_notes: signOffNotes,
      }
      await inspectionService.signOffInspection(signOffTarget.uuid, input)
      setSignOffModalOpen(false)
      triggerSuccess(`Inspection ${signOffTarget.inspection_number} signed off successfully!`)
      if (activeTab === 'signoffs') fetchSignOffQueue()
      else fetchInspections()
      fetchStatistics()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to sign off inspection')
    } finally {
      setActionLoading(false)
    }
  }

  // ==========================================
  // HANDLERS: LOG DEFECT
  // ==========================================

  const openCreateDefectModal = (presetInsp?: SiteInspection) => {
    setDefectFormTitle('')
    setDefectFormDesc('')
    setDefectFormLocation('')
    setDefectFormCategory('structural')
    setDefectFormSeverity('medium')
    setDefectFormDueDate('')
    setDefectFormAssignedTo('')
    if (presetInsp) {
      setDefectFormSiteId(presetInsp.site?.uuid || presetInsp.site?.id?.toString() || '')
      setDefectFormInspectionId(presetInsp.uuid)
    } else {
      setDefectFormSiteId(selectedSite || (sites[0]?.uuid ?? ''))
      setDefectFormInspectionId('')
    }
    setCreateDefectModalOpen(true)
  }

  const handleCreateDefectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!defectFormTitle.trim() || !defectFormSiteId) {
      setError('Title and Site are required for defect logging.')
      return
    }

    try {
      setActionLoading(true)
      const input: CreatePunchListItemInput = {
        title: defectFormTitle,
        site_id: defectFormSiteId,
        site_inspection_id: defectFormInspectionId || undefined,
        category: defectFormCategory,
        severity: defectFormSeverity,
        due_date: defectFormDueDate || undefined,
        assigned_to: defectFormAssignedTo || undefined,
        location_details: defectFormLocation || undefined,
        description: defectFormDesc || undefined,
      }
      const created = await inspectionService.createPunchItem(input)
      setCreateDefectModalOpen(false)
      triggerSuccess(`Defect ${created.item_number} logged successfully!`)
      if (activeTab === 'defects') fetchPunchItems()
      else fetchInspections()
      fetchStatistics()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to log defect item')
    } finally {
      setActionLoading(false)
    }
  }

  // ==========================================
  // HANDLERS: RECTIFY DEFECT
  // ==========================================

  const openRectifyModal = (item: PunchListItem) => {
    setRectifyTarget(item)
    setRectificationNotes(item.rectification_notes || '')
    setRectifyModalOpen(true)
  }

  const handleRectifySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rectifyTarget || !rectificationNotes.trim()) {
      setError('Rectification notes describing the corrective actions are required.')
      return
    }

    try {
      setActionLoading(true)
      const input: RectifyPunchListItemInput = {
        rectification_notes: rectificationNotes,
      }
      await inspectionService.rectifyPunchItem(rectifyTarget.uuid, input)
      setRectifyModalOpen(false)
      triggerSuccess(`Defect ${rectifyTarget.item_number} marked as rectified! Ready for supervisor verification.`)
      fetchPunchItems()
      fetchStatistics()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to rectify defect item')
    } finally {
      setActionLoading(false)
    }
  }

  // ==========================================
  // HANDLERS: VERIFY DEFECT
  // ==========================================

  const openVerifyModal = (item: PunchListItem) => {
    setVerifyTarget(item)
    setVerifyAction('close')
    setVerificationNotes(item.verification_notes || '')
    setVerifyModalOpen(true)
  }

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!verifyTarget) return

    try {
      setActionLoading(true)
      const input: VerifyPunchListItemInput = {
        action: verifyAction,
        verification_notes: verificationNotes,
      }
      await inspectionService.verifyPunchItem(verifyTarget.uuid, input)
      setVerifyModalOpen(false)
      triggerSuccess(
        `Defect ${verifyTarget.item_number} ${verifyAction === 'close' ? 'verified & closed' : 'waived'}!`,
      )
      fetchPunchItems()
      fetchStatistics()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to verify defect item')
    } finally {
      setActionLoading(false)
    }
  }

  // Delete Handlers
  const handleDeleteInspection = (uuid: string, num: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Site Inspection',
      message: `Are you sure you want to delete inspection ${num}? This action cannot be undone.`,
      variant: 'danger',
      confirmText: 'Delete Inspection',
      onConfirm: async () => {
        try {
          await inspectionService.deleteInspection(uuid)
          triggerSuccess(`Inspection ${num} deleted.`)
          setConfirmDialog(null)
          fetchInspections()
          fetchStatistics()
        } catch (err: any) {
          setError(err?.response?.data?.message || 'Failed to delete inspection')
          setConfirmDialog(null)
        }
      }
    })
  }

  const handleDeleteDefect = (uuid: string, num: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Defect Item',
      message: `Are you sure you want to delete defect item ${num}?`,
      variant: 'danger',
      confirmText: 'Delete Defect',
      onConfirm: async () => {
        try {
          await inspectionService.deletePunchItem(uuid)
          triggerSuccess(`Defect ${num} deleted.`)
          setConfirmDialog(null)
          fetchPunchItems()
          fetchStatistics()
        } catch (err: any) {
          setError(err?.response?.data?.message || 'Failed to delete defect')
          setConfirmDialog(null)
        }
      }
    })
  }

  return (
    <div className="inspections-container">
      {/* Header */}
      <div className="inspections-header">
        <div className="inspections-title-group">
          <h1>
            <MdFactCheck style={{ color: '#0284c7' }} /> Site Quality Control & Inspections
          </h1>
          <p className="inspections-subtitle">
            Quality checklists, supervisor sign-offs, defect rectification workflows, and punch-list tracking.
          </p>
        </div>
        <div className="inspections-header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => {
              fetchStatistics()
              if (activeTab === 'inspections') fetchInspections()
              else if (activeTab === 'defects') fetchPunchItems()
              else fetchSignOffQueue()
            }}
            title="Refresh current view"
          >
            <MdRefresh /> Refresh
          </button>
          <button className="btn btn-secondary" onClick={() => openCreateDefectModal()}>
            <MdReportProblem style={{ color: '#ea580c' }} /> Log Defect
          </button>
          <Link to="/inspections/new" className="btn btn-primary">
            <MdAdd /> Schedule Inspection
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && <div className="alert-banner success">{successMessage}</div>}
      {error && <div className="alert-banner error">{error}</div>}

      {/* KPI Stats Grid */}
      <div className="inspections-stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <MdFactCheck />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Inspections</span>
            <span className="stat-value">{stats?.total_inspections ?? 0}</span>
            <span className="stat-subtext">Avg Score: {stats?.average_score ?? 0}%</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <MdCheckCircle />
          </div>
          <div className="stat-info">
            <span className="stat-label">Passed</span>
            <span className="stat-value">{stats?.passed ?? 0}</span>
            <span className="stat-subtext">{stats?.passed_with_conditions ?? 0} with conditions</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon red">
            <MdReportProblem />
          </div>
          <div className="stat-info">
            <span className="stat-label">Open Defects</span>
            <span className="stat-value">{defectStats?.open ?? stats?.defects?.open ?? 0}</span>
            <span className="stat-subtext">
              {defectStats?.critical_open ?? stats?.defects?.critical ?? 0} Critical
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon teal">
            <MdVerified />
          </div>
          <div className="stat-info">
            <span className="stat-label">Rectified / Closed</span>
            <span className="stat-value">
              {(defectStats?.rectified ?? 0) + (defectStats?.closed ?? 0)}
            </span>
            <span className="stat-subtext">{defectStats?.closed ?? 0} Verified Closed</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon amber">
            <MdAssignmentTurnedIn />
          </div>
          <div className="stat-info">
            <span className="stat-label">Needs Sign-off</span>
            <span className="stat-value">{stats?.needs_sign_off ?? 0}</span>
            <span className="stat-subtext">Pending supervisor review</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="inspections-tabs">
        <button
          className={`tab-btn ${activeTab === 'inspections' ? 'active' : ''}`}
          onClick={() => handleTabChange('inspections')}
        >
          <MdPlaylistAddCheck /> Inspections & Checklists
          <span className="tab-badge">{stats?.total_inspections ?? 0}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'defects' ? 'active' : ''}`}
          onClick={() => handleTabChange('defects')}
        >
          <MdReportProblem /> Punch List & Defects
          <span className={`tab-badge ${(defectStats?.open ?? 0) > 0 ? 'badge-urgent' : ''}`}>
            {defectStats?.open ?? 0}
          </span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'signoffs' ? 'active' : ''}`}
          onClick={() => handleTabChange('signoffs')}
        >
          <MdAssignmentTurnedIn /> Sign-off Queue
          <span className={`tab-badge ${(stats?.needs_sign_off ?? 0) > 0 ? 'badge-urgent' : ''}`}>
            {stats?.needs_sign_off ?? 0}
          </span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'walkthrough' ? 'active' : ''}`}
          onClick={() => handleTabChange('walkthrough')}
          style={{
            background: activeTab === 'walkthrough' ? '#ecfdf5' : undefined,
            color: activeTab === 'walkthrough' ? '#047857' : undefined,
          }}
        >
          <MdSync /> Offline PWA Walkthrough & Sync
          <span className="tab-badge" style={{ background: '#10b981', color: 'white' }}>
            PWA
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SITE INSPECTIONS                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'inspections' && (
        <>
          {/* Filter Bar */}
          <div className="inspections-filters">
            <div className="filter-search-box">
              <MdSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search by title, number, notes..."
                value={inspectionSearch}
                onChange={(e) => {
                  setInspectionSearch(e.target.value)
                  setInspectionPage(1)
                }}
              />
            </div>

            <select
              className="filter-select"
              value={selectedSite}
              onChange={(e) => {
                setSelectedSite(e.target.value)
                setInspectionPage(1)
              }}
            >
              <option value="">All Sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.uuid || s.id}>
                  {s.site_name || s.name} ({s.site_code || s.code})
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value)
                setInspectionPage(1)
              }}
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.uuid || p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value)
                setInspectionPage(1)
              }}
            >
              <option value="">All Inspection Types</option>
              <option value="foundation">Foundation</option>
              <option value="structural_framing">Structural Framing</option>
              <option value="masonry">Masonry</option>
              <option value="plumbing_rough_in">Plumbing Rough-in</option>
              <option value="electrical_rough_in">Electrical Rough-in</option>
              <option value="concrete_pre_pour">Concrete Pre-pour</option>
              <option value="waterproofing">Waterproofing</option>
              <option value="finishing">Finishing</option>
              <option value="handover_audit">Handover Audit</option>
              <option value="safety_environmental">Safety & Environmental</option>
              <option value="other">Other</option>
            </select>

            <select
              className="filter-select"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value)
                setInspectionPage(1)
              }}
            >
              <option value="">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="passed">Passed</option>
              <option value="passed_with_conditions">Passed w/ Conditions</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Table */}
          <div className="inspections-table-card">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Inspection</th>
                    <th>Type</th>
                    <th>Site / Project</th>
                    <th>Inspector & Supervisor</th>
                    <th>Scheduled Date</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Defects</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && inspections.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>
                        Loading site inspections...
                      </td>
                    </tr>
                  ) : inspections.length === 0 ? (
                    <tr>
                      <td colSpan={9}>
                        <div className="empty-state">
                          <MdFactCheck className="empty-state-icon" />
                          <p>No site inspections found matching your filters.</p>
                          <Link to="/inspections/new" className="btn btn-primary btn-sm">
                            <MdAdd /> Schedule First Inspection
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    inspections.map((insp) => (
                      <tr key={insp.uuid}>
                        <td>
                          <div className="table-identity-cell">
                            <Link to={`/inspections/${insp.uuid}`} className="table-entity-title">
                              {insp.title}
                            </Link>
                            <span className="table-entity-code">{insp.inspection_number}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ textTransform: 'capitalize' }}>
                            {insp.inspection_type?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td>
                          <div>{insp.site?.name || 'All Sites'}</div>
                          {insp.unit && (
                            <small style={{ color: '#64748b' }}>Unit: {insp.unit.unit_number}</small>
                          )}
                        </td>
                        <td>
                          <div>{insp.inspector?.name || 'Unassigned'}</div>
                          {insp.supervisor ? (
                            <small style={{ color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              Sup: {insp.supervisor.name} {insp.is_signed_off ? <MdCheckCircle size={12} color="#16a34a" /> : '(pending)'}
                            </small>
                          ) : (
                            <small style={{ color: '#94a3b8' }}>No supervisor</small>
                          )}
                        </td>
                        <td>
                          {insp.scheduled_date || '—'}
                          {insp.is_overdue && (
                            <div style={{ color: '#dc2626', fontSize: '0.75rem', fontWeight: 600 }}>
                              Overdue
                            </div>
                          )}
                        </td>
                        <td>
                          {insp.score !== null && insp.score !== undefined ? (
                            <span
                              className={`score-badge ${
                                insp.score >= 80 ? 'high' : insp.score >= 50 ? 'mid' : 'low'
                              }`}
                            >
                              {insp.score}%
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge badge-${insp.status}`}>
                            {insp.status?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td>
                          {insp.defects_count && insp.defects_count > 0 ? (
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.15rem 0.4rem', fontSize: '0.75rem' }}
                              onClick={() => {
                                setDefectSite(insp.site?.uuid || '')
                                handleTabChange('defects')
                              }}
                            >
                              {insp.defects_count} defect{insp.defects_count > 1 ? 's' : ''}
                            </button>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>0</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                            <Link
                              to={`/inspections/${insp.uuid}`}
                              className="action-icon-btn"
                              title="View Details"
                            >
                              <MdVisibility />
                            </Link>

                            <button
                              className="action-icon-btn btn-assess"
                              onClick={() => openCompleteModal(insp)}
                              title="Run Checklist / Complete Assessment"
                            >
                              <MdPlaylistAddCheck />
                            </button>

                            {insp.supervisor && !insp.is_signed_off && (
                              <button
                                className="action-icon-btn btn-sign"
                                onClick={() => openSignOffModal(insp)}
                                title="Supervisor Sign-off"
                              >
                                <MdAssignmentTurnedIn />
                              </button>
                            )}

                            <Link
                              to={`/inspections/${insp.uuid}/edit`}
                              className="action-icon-btn"
                              title="Edit Inspection Details"
                            >
                              <MdEdit />
                            </Link>

                            <button
                              className="action-icon-btn btn-del"
                              onClick={() => handleDeleteInspection(insp.uuid, insp.inspection_number)}
                              title="Delete Inspection"
                            >
                              <MdDelete />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {inspectionTotal > 15 && (
              <div className="pagination-controls">
                <span>
                  Showing {inspections.length} of {inspectionTotal} inspections
                </span>
                <div className="pagination-pages">
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={inspectionPage <= 1}
                    onClick={() => setInspectionPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <span style={{ padding: '0.35rem 0.75rem', fontWeight: 600 }}>
                    Page {inspectionPage}
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={inspections.length < 15}
                    onClick={() => setInspectionPage((p) => p + 1)}
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
      {/* TAB 2: PUNCH LIST & DEFECTS                                               */}
      {/* ========================================================================= */}
      {activeTab === 'defects' && (
        <>
          {/* Defect Filter Bar */}
          <div className="inspections-filters">
            <div className="filter-search-box">
              <MdSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search defect title, item #, subcontractor..."
                value={defectSearch}
                onChange={(e) => {
                  setDefectSearch(e.target.value)
                  setDefectPage(1)
                }}
              />
            </div>

            <select
              className="filter-select"
              value={defectSite}
              onChange={(e) => {
                setDefectSite(e.target.value)
                setDefectPage(1)
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
              value={defectCategory}
              onChange={(e) => {
                setDefectCategory(e.target.value)
                setDefectPage(1)
              }}
            >
              <option value="">All Categories</option>
              <option value="structural">Structural</option>
              <option value="architectural">Architectural</option>
              <option value="plumbing">Plumbing</option>
              <option value="electrical">Electrical</option>
              <option value="finishing">Finishing</option>
              <option value="safety">Safety</option>
              <option value="other">Other</option>
            </select>

            <select
              className="filter-select"
              value={defectSeverity}
              onChange={(e) => {
                setDefectSeverity(e.target.value)
                setDefectPage(1)
              }}
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              className="filter-select"
              value={defectStatus}
              onChange={(e) => {
                setDefectStatus(e.target.value)
                setDefectPage(1)
              }}
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="rectified">Rectified</option>
              <option value="verified_closed">Verified Closed</option>
              <option value="waived">Waived</option>
            </select>

            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={openDefectsOnly}
                onChange={(e) => {
                  setOpenDefectsOnly(e.target.checked)
                  setDefectPage(1)
                }}
              />
              Open Only
            </label>

            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={overdueDefectsOnly}
                onChange={(e) => {
                  setOverdueDefectsOnly(e.target.checked)
                  setDefectPage(1)
                }}
              />
              Overdue Only
            </label>
          </div>

          {/* Table */}
          <div className="inspections-table-card">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Defect Item</th>
                    <th>Category</th>
                    <th>Severity</th>
                    <th>Site / Location</th>
                    <th>Assigned To</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && punchItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                        Loading punch list items...
                      </td>
                    </tr>
                  ) : punchItems.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="empty-state">
                          <MdCheckCircle className="empty-state-icon" style={{ color: '#16a34a' }} />
                          <p>No defects found matching current filters!</p>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => openCreateDefectModal()}
                          >
                            <MdAdd /> Log New Defect
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    punchItems.map((item) => (
                      <tr key={item.uuid}>
                        <td>
                          <div className="table-identity-cell">
                            <span className="table-entity-title">{item.title}</span>
                            <span className="table-entity-code">{item.item_number}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ textTransform: 'capitalize' }}>{item.category}</span>
                        </td>
                        <td>
                          <span className={`badge severity-${item.severity}`}>{item.severity}</span>
                        </td>
                        <td>
                          <div>{item.site?.name || '—'}</div>
                          {item.location_details && (
                            <small style={{ color: '#64748b' }}>{item.location_details}</small>
                          )}
                        </td>
                        <td>
                          <div>{item.assigned_to?.name || item.subcontractor_name || 'Unassigned'}</div>
                        </td>
                        <td>
                          {item.due_date || '—'}
                          {item.is_overdue && (
                            <div style={{ color: '#dc2626', fontSize: '0.75rem', fontWeight: 600 }}>
                              Overdue
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={`badge badge-${item.status}`}>
                            {item.status?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                            {item.is_open && (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => openRectifyModal(item)}
                                title="Mark Defect Rectified"
                              >
                                Rectify
                              </button>
                            )}

                            {item.is_rectified && (
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => openVerifyModal(item)}
                                title="Verify Rectification & Close"
                              >
                                Verify / Close
                              </button>
                            )}

                            <button
                              className="action-icon-btn btn-del"
                              onClick={() => handleDeleteDefect(item.uuid, item.item_number)}
                              title="Delete Defect"
                            >
                              <MdDelete />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {defectTotal > 15 && (
              <div className="pagination-controls">
                <span>
                  Showing {punchItems.length} of {defectTotal} defect items
                </span>
                <div className="pagination-pages">
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={defectPage <= 1}
                    onClick={() => setDefectPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <span style={{ padding: '0.35rem 0.75rem', fontWeight: 600 }}>
                    Page {defectPage}
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={punchItems.length < 15}
                    onClick={() => setDefectPage((p) => p + 1)}
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
      {/* TAB 3: SIGN-OFF QUEUE                                                     */}
      {/* ========================================================================= */}
      {activeTab === 'signoffs' && (
        <div className="inspections-table-card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Inspection</th>
                  <th>Type</th>
                  <th>Site</th>
                  <th>Inspector</th>
                  <th>Result</th>
                  <th>Score</th>
                  <th>Inspected At</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && signOffQueue.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                      Loading sign-off queue...
                    </td>
                  </tr>
                ) : signOffQueue.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state">
                        <MdDoneAll className="empty-state-icon" style={{ color: '#16a34a' }} />
                        <p>All completed inspections have been signed off! Zero pending approvals.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  signOffQueue.map((insp) => (
                    <tr key={insp.uuid}>
                      <td>
                        <div className="table-identity-cell">
                          <Link to={`/inspections/${insp.uuid}`} className="table-entity-title">
                            {insp.title}
                          </Link>
                          <span className="table-entity-code">{insp.inspection_number}</span>
                        </div>
                      </td>
                      <td>{insp.inspection_type?.replace(/_/g, ' ')}</td>
                      <td>{insp.site?.name || '—'}</td>
                      <td>{insp.inspector?.name || 'Unassigned'}</td>
                      <td>
                        <span className={`badge badge-${insp.status}`}>
                          {insp.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        {insp.score !== null ? (
                          <span className="score-badge high">{insp.score}%</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{insp.inspected_at ? new Date(insp.inspected_at).toLocaleDateString() : '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => openSignOffModal(insp)}
                        >
                          <MdAssignmentTurnedIn /> Review & Sign Off
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: OFFLINE SITE WALKTHROUGH & PWA SYNC                               */}
      {/* ========================================================================= */}
      {activeTab === 'walkthrough' && (
        <OfflineWalkthroughConsole
          onInspectionSaved={() => {
            fetchInspections()
            fetchStatistics()
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: COMPLETE CHECKLIST ASSESSMENT                                    */}
      {/* ========================================================================= */}
      {completeModalOpen && targetInspection && (
        <div className="modal-overlay">
          <div className="modal-content modal-large">
            <div className="modal-header">
              <h2>Run Checklist Assessment — {targetInspection.inspection_number}</h2>
              <button className="modal-close-btn" onClick={() => setCompleteModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleSaveAssessment}>
              <div className="modal-body">
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#1e293b' }}>
                    {targetInspection.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                    Verify each checklist criteria below. Setting items to 'Fail' will decrease the quality
                    score and prompt for defect logging.
                  </p>
                </div>

                {/* Checklist runner items */}
                <div className="checklist-runner-container">
                  {assessmentChecklist.map((item, idx) => (
                    <div key={idx} className="checklist-runner-row">
                      <div className="checklist-runner-header">
                        <span className="checklist-runner-text">{item.item_text}</span>
                        <div className="checklist-status-buttons">
                          <button
                            type="button"
                            className={`status-btn-opt pass ${item.status === 'pass' ? 'active' : ''}`}
                            onClick={() => updateChecklistItemStatus(idx, 'pass')}
                          >
                            Pass
                          </button>
                          <button
                            type="button"
                            className={`status-btn-opt fail ${item.status === 'fail' ? 'active' : ''}`}
                            onClick={() => updateChecklistItemStatus(idx, 'fail')}
                          >
                            Fail
                          </button>
                          <button
                            type="button"
                            className={`status-btn-opt na ${item.status === 'na' ? 'active' : ''}`}
                            onClick={() => updateChecklistItemStatus(idx, 'na')}
                          >
                            N/A
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Add notes or defect details for this item..."
                        value={item.notes || ''}
                        onChange={(e) => {
                          const updated = [...assessmentChecklist]
                          updated[idx] = { ...updated[idx], notes: e.target.value }
                          setAssessmentChecklist(updated)
                        }}
                        style={{
                          fontSize: '0.8rem',
                          padding: '0.35rem 0.6rem',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.35rem',
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* Status & Score */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Overall Inspection Result</label>
                    <select
                      value={assessmentStatus}
                      onChange={(e) => setAssessmentStatus(e.target.value as any)}
                    >
                      <option value="passed">Passed</option>
                      <option value="passed_with_conditions">Passed with Conditions</option>
                      <option value="failed">Failed / Action Required</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Quality Score (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={assessmentScore}
                      onChange={(e) => setAssessmentScore(Number(e.target.value))}
                    />
                  </div>
                </div>

                {assessmentStatus === 'passed_with_conditions' && (
                  <div className="form-group">
                    <label>Conditions Required for Final Clearance</label>
                    <textarea
                      rows={2}
                      placeholder="Specify remediation conditions that must be satisfied..."
                      value={assessmentConditions}
                      onChange={(e) => setAssessmentConditions(e.target.value)}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Inspector Summary Notes</label>
                  <textarea
                    rows={3}
                    placeholder="General observations, environmental factors, or testing tools used..."
                    value={assessmentNotes}
                    onChange={(e) => setAssessmentNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setCompleteModalOpen(false)
                    openCreateDefectModal(targetInspection)
                  }}
                >
                  <MdReportProblem style={{ color: '#ea580c' }} /> Log Defect For This Inspection
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setCompleteModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Submit Assessment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SUPERVISOR SIGN-OFF                                              */}
      {/* ========================================================================= */}
      {signOffModalOpen && signOffTarget && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Supervisor Sign-off — {signOffTarget.inspection_number}</h2>
              <button className="modal-close-btn" onClick={() => setSignOffModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleSignOffSubmit}>
              <div className="modal-body">
                <div>
                  <strong>Inspection:</strong> {signOffTarget.title} ({signOffTarget.inspection_type})
                </div>
                <div>
                  <strong>Current Status:</strong>{' '}
                  <span className={`badge badge-${signOffTarget.status}`}>
                    {signOffTarget.status?.replace(/_/g, ' ')}
                  </span>{' '}
                  {signOffTarget.score !== null && `(Score: ${signOffTarget.score}%)`}
                </div>
                {signOffTarget.conditions && (
                  <div style={{ background: '#fef3c7', padding: '0.75rem', borderRadius: '0.375rem' }}>
                    <strong>Conditions:</strong> {signOffTarget.conditions}
                  </div>
                )}
                <div className="form-group">
                  <label>Supervisor Approval & Compliance Notes</label>
                  <textarea
                    rows={4}
                    placeholder="Enter formal sign-off confirmation notes, warranty remarks, or authority approval..."
                    value={signOffNotes}
                    onChange={(e) => setSignOffNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSignOffModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Signing off...' : 'Sign Off & Approve'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: QUICK CREATE DEFECT                                              */}
      {/* ========================================================================= */}
      {createDefectModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content modal-large">
            <div className="modal-header">
              <h2>Log Site Defect / Punch Item</h2>
              <button className="modal-close-btn" onClick={() => setCreateDefectModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleCreateDefectSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Defect Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Honeycombing on foundation beam column C4"
                    value={defectFormTitle}
                    onChange={(e) => setDefectFormTitle(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Construction Site *</label>
                    <select
                      required
                      value={defectFormSiteId}
                      onChange={(e) => setDefectFormSiteId(e.target.value)}
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
                    <label>Location Details</label>
                    <input
                      type="text"
                      placeholder="e.g. Block B, 2nd floor, master bedroom ceiling"
                      value={defectFormLocation}
                      onChange={(e) => setDefectFormLocation(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Category *</label>
                    <select
                      value={defectFormCategory}
                      onChange={(e) => setDefectFormCategory(e.target.value as any)}
                    >
                      <option value="structural">Structural</option>
                      <option value="architectural">Architectural</option>
                      <option value="plumbing">Plumbing</option>
                      <option value="electrical">Electrical</option>
                      <option value="finishing">Finishing</option>
                      <option value="safety">Safety</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Severity *</label>
                    <select
                      value={defectFormSeverity}
                      onChange={(e) => setDefectFormSeverity(e.target.value as any)}
                    >
                      <option value="low">Low (Minor blemish/cleanup)</option>
                      <option value="medium">Medium (Standard rectification)</option>
                      <option value="high">High (Impacting other trades)</option>
                      <option value="critical">Critical (Structural / Safety risk)</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Assigned Worker / Subcontractor</label>
                    <select
                      value={defectFormAssignedTo}
                      onChange={(e) => setDefectFormAssignedTo(e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {users.map((u) => (
                        <option key={u.uuid} value={u.uuid}>
                          {u.name} ({u.roles?.join(', ') || 'Staff'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Rectification Due Date</label>
                    <input
                      type="date"
                      value={defectFormDueDate}
                      onChange={(e) => setDefectFormDueDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Defect Description</label>
                  <textarea
                    rows={3}
                    placeholder="Provide full description of the defect and required remediation standard..."
                    value={defectFormDesc}
                    onChange={(e) => setDefectFormDesc(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setCreateDefectModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Logging...' : 'Log Defect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: RECTIFY DEFECT                                                   */}
      {/* ========================================================================= */}
      {rectifyModalOpen && rectifyTarget && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Mark Rectified — {rectifyTarget.item_number}</h2>
              <button className="modal-close-btn" onClick={() => setRectifyModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleRectifySubmit}>
              <div className="modal-body">
                <div>
                  <strong>Defect:</strong> {rectifyTarget.title} ({rectifyTarget.category})
                </div>
                {rectifyTarget.location_details && (
                  <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                    Location: {rectifyTarget.location_details}
                  </div>
                )}
                <div className="form-group">
                  <label>Corrective Actions Taken *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Explain repairs completed, materials applied, or rework performed..."
                    value={rectificationNotes}
                    onChange={(e) => setRectificationNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setRectifyModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Mark as Rectified'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: VERIFY & CLOSE DEFECT                                            */}
      {/* ========================================================================= */}
      {verifyModalOpen && verifyTarget && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Supervisor Verification — {verifyTarget.item_number}</h2>
              <button className="modal-close-btn" onClick={() => setVerifyModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleVerifySubmit}>
              <div className="modal-body">
                <div>
                  <strong>Defect:</strong> {verifyTarget.title}
                </div>
                {verifyTarget.rectification_notes && (
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      padding: '0.75rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                    }}
                  >
                    <strong>Rectification Notes:</strong> {verifyTarget.rectification_notes}
                  </div>
                )}
                <div className="form-row">
                  <div className="form-group">
                    <label>Action</label>
                    <select
                      value={verifyAction}
                      onChange={(e) => setVerifyAction(e.target.value as any)}
                    >
                      <option value="close">Verify & Close Defect (Approved)</option>
                      <option value="waive">Waive Defect (Accepted Variance)</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Verification Notes / Observations</label>
                  <textarea
                    rows={3}
                    placeholder="Add verification notes or re-inspection feedback..."
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setVerifyModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-success" disabled={actionLoading}>
                  {actionLoading ? 'Processing...' : 'Confirm Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Soft Confirmation Modal */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText || 'Confirm'}
          cancelText="Cancel"
          variant={confirmDialog.variant}
          isLoading={false}
          onConfirm={confirmDialog.onConfirm}
          onClose={() => setConfirmDialog(null)}
        />
      )}
    </div>
  )
}

export default InspectionsList
