import React, { useState, useEffect, useCallback } from 'react'
import {
  MdCheckCircle,
  MdPendingActions,
  MdVerified,
  MdAttachMoney,
  MdShield,
  MdAdd,
  MdSearch,
  MdRefresh,
  MdVisibility,
  MdThumbUp,
  MdCancel,
  MdSend,
  MdAccountBalanceWallet,
  MdClose,
  MdFactCheck,
  MdAccountTree,
  MdReceiptLong,
} from 'react-icons/md'
import milestoneReleaseService from '../../services/milestone-release.service'
import subcontractorMilestoneService from '../../services/subcontractor-milestone.service'
import contractService from '../../services/contract.service'
import projectService from '../../services/project.service'
import unitService from '../../services/unit.service'
import api from '../../config/api'
import {
  MilestoneVerification,
  MilestonePaymentRelease,
  MilestoneReleaseStatistics,
  VerificationStage,
  ReleaseStatus,
  WorkQualityRating,
  BoqComplianceStatus,
  ReleasePaymentMethod,
} from '../../types/milestone-release.types'
import { Project } from '../../types/project.types'
import { Unit } from '../../types/unit.types'
import { SubcontractorContract } from '../../types/contract.types'
import { ProjectMilestoneMatrix } from '../../types/subcontractor-milestone.types'
import './MilestoneReleases.css'

interface MilestoneOption {
  id: number
  milestone_name: string
  milestone_order: number
  status: string
}

export const MilestoneReleasesList: React.FC = () => {
  // Active Tab
  const [activeTab, setActiveTab] = useState<'verifications' | 'releases' | 'matrix'>('verifications')

  // Data states
  const [verifications, setVerifications] = useState<MilestoneVerification[]>([])
  const [releases, setReleases] = useState<MilestonePaymentRelease[]>([])
  const [matrixData, setMatrixData] = useState<ProjectMilestoneMatrix | null>(null)
  const [matrixLoading, setMatrixLoading] = useState<boolean>(false)
  const [stats, setStats] = useState<MilestoneReleaseStatistics | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [milestones, setMilestones] = useState<MilestoneOption[]>([])

  // Loading & error
  const [loading, setLoading] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState<string>('')
  const [filterProject, setFilterProject] = useState<string>('')
  const [filterStage, setFilterStage] = useState<string>('')
  const [filterReleaseStatus, setFilterReleaseStatus] = useState<string>('')

  // Pagination
  const [verificationPage, setVerificationPage] = useState<number>(1)
  const [verificationTotalPages, setVerificationTotalPages] = useState<number>(1)
  const [releasePage, setReleasePage] = useState<number>(1)
  const [releaseTotalPages, setReleaseTotalPages] = useState<number>(1)

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false)
  const [showEngineerModal, setShowEngineerModal] = useState<boolean>(false)
  const [showQsModal, setShowQsModal] = useState<boolean>(false)
  const [showClientModal, setShowClientModal] = useState<boolean>(false)
  const [showAuthorizeModal, setShowAuthorizeModal] = useState<boolean>(false)
  const [showDisburseModal, setShowDisburseModal] = useState<boolean>(false)
  const [showRetentionModal, setShowRetentionModal] = useState<boolean>(false)
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false)
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false)
  const [showSubcontractorIpcModal, setShowSubcontractorIpcModal] = useState<boolean>(false)

  // Subcontractor IPC Generation form states (Phase 8 Day 3)
  const [contractsList, setContractsList] = useState<SubcontractorContract[]>([])
  const [selectedContractId, setSelectedContractId] = useState<string>('')
  const [ipcGrossAmount, setIpcGrossAmount] = useState<number>(0)
  const [ipcMaterialsAmount, setIpcMaterialsAmount] = useState<number>(0)
  const [ipcOtherDeductions, setIpcOtherDeductions] = useState<number>(0)
  const [ipcSummary, setIpcSummary] = useState<string>('')
  const [ipcPeriodStart, setIpcPeriodStart] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  )
  const [ipcPeriodEnd, setIpcPeriodEnd] = useState<string>(
    new Date().toISOString().slice(0, 10)
  )

  // Selected records for action modals
  const [selectedVerification, setSelectedVerification] = useState<MilestoneVerification | null>(null)
  const [selectedRelease, setSelectedRelease] = useState<MilestonePaymentRelease | null>(null)

  // Form states
  const [createForm, setCreateForm] = useState({
    project_id: '',
    milestone_id: '',
    unit_id: '',
    title: '',
    physical_completion_percentage: 100,
    work_quality_rating: 'satisfactory' as WorkQualityRating,
    inspection_date: new Date().toISOString().slice(0, 10),
    inspection_notes: '',
  })

  const [engineerForm, setEngineerForm] = useState({
    structural_checks_passed: true,
    physical_completion_percentage: 100,
    work_quality_rating: 'satisfactory' as WorkQualityRating,
    inspection_date: new Date().toISOString().slice(0, 10),
    engineer_notes: '',
  })

  const [qsForm, setQsForm] = useState({
    qs_certified_amount: 0,
    boq_compliance_status: 'fully_compliant' as BoqComplianceStatus,
    retention_percentage: 5,
    qs_notes: '',
  })

  const [clientForm, setClientForm] = useState({
    status: 'approved' as 'approved' | 'disputed' | 'waived_by_admin',
    client_feedback: '',
  })

  const [disburseForm, setDisburseForm] = useState({
    payment_method: 'internal_transfer' as ReleasePaymentMethod,
    disbursement_reference: '',
  })

  const [retentionForm, setRetentionForm] = useState({
    notes: '',
  })

  const [rejectReason, setRejectReason] = useState<string>('')
  const [authorizeNotes, setAuthorizeNotes] = useState<string>('')

  // Currency helper
  const formatCurrency = (amount: number | string | undefined | null, currency: string = 'USD') => {
    const num = Number(amount) || 0
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
    }).format(num)
  }

  // Fetch Projects for filter / select
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await projectService.getProjects({ per_page: 100 })
        setProjects(res.data || [])
      } catch (err: any) {
        console.error('Failed to load projects', err)
      }
    }
    loadProjects()
  }, [])

  // When project changes in create form, load its milestones and units
  useEffect(() => {
    if (!createForm.project_id) {
      setMilestones([])
      setUnits([])
      return
    }

    const loadProjectDependencies = async () => {
      try {
        // Fetch Milestones
        const mRes = await api.get<{ data: MilestoneOption[] }>(`/milestones?project_id=${createForm.project_id}`)
        setMilestones(mRes.data.data || [])

        // Fetch Units
        const uRes = await unitService.getUnits({ project_id: createForm.project_id, per_page: 100 })
        setUnits(uRes.data || [])
      } catch (err) {
        console.error('Failed to load project dependencies', err)
      }
    }

    loadProjectDependencies()
  }, [createForm.project_id])

  // Fetch Stats
  const loadStats = useCallback(async () => {
    try {
      const data = await milestoneReleaseService.getStatistics(filterProject || undefined)
      setStats(data)
    } catch (err: any) {
      console.error('Failed to load stats', err)
    }
  }, [filterProject])

  // Fetch Verifications
  const loadVerifications = useCallback(async () => {
    try {
      setLoading(true)
      const res = await milestoneReleaseService.getVerifications({
        page: verificationPage,
        project_id: filterProject || undefined,
        stage: (filterStage as VerificationStage) || undefined,
        search: search || undefined,
      })
      setVerifications(res.data || [])
      setVerificationTotalPages(res.last_page || 1)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load verifications')
    } finally {
      setLoading(false)
    }
  }, [verificationPage, filterProject, filterStage, search])

  // Fetch Releases
  const loadReleases = useCallback(async () => {
    try {
      setLoading(true)
      const res = await milestoneReleaseService.getReleases({
        page: releasePage,
        project_id: filterProject || undefined,
        status: (filterReleaseStatus as ReleaseStatus) || undefined,
        search: search || undefined,
      })
      setReleases(res.data || [])
      setReleaseTotalPages(res.last_page || 1)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load releases')
    } finally {
      setLoading(false)
    }
  }, [releasePage, filterProject, filterReleaseStatus, search])

  // Load Project Milestone Subcontractor Matrix (Phase 8 Day 3)
  const loadMatrix = useCallback(async (projId?: string) => {
    const targetProject = projId || filterProject || (projects.length > 0 ? String(projects[0].id) : undefined)
    if (!targetProject) return
    try {
      setMatrixLoading(true)
      const data = await subcontractorMilestoneService.getProjectMilestoneSubcontractorMatrix(targetProject)
      setMatrixData(data)
    } catch (err: any) {
      console.error('Failed to load milestone subcontractor matrix', err)
    } finally {
      setMatrixLoading(false)
    }
  }, [filterProject, projects])

  // Open Subcontractor IPC modal
  const handleOpenSubcontractorIpc = async (verification: MilestoneVerification) => {
    setSelectedVerification(verification)
    setIpcGrossAmount(Number(verification.qs_certified_amount || 0))
    setIpcMaterialsAmount(0)
    setIpcOtherDeductions(0)
    setIpcSummary(
      `Interim valuation for ${verification.milestone?.milestone_name || 'milestone package'}. Verified completion: ${verification.physical_completion_percentage}%.`
    )
    setIpcPeriodStart(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
    setIpcPeriodEnd(new Date().toISOString().slice(0, 10))

    try {
      setSubmitting(true)
      const res = await contractService.getSubcontractorContracts({
        project_id: String(verification.project_id),
        status: 'active',
        per_page: 50,
      })
      const list = res.data || []
      setContractsList(list)
      if (list.length > 0) {
        setSelectedContractId(String(list[0].id))
      } else {
        setSelectedContractId('')
      }
      setShowSubcontractorIpcModal(true)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load project subcontractor contracts.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Generate Subcontractor IPC
  const handleGenerateSubcontractorIpc = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVerification || !selectedContractId) {
      setError('Please select a subcontractor contract.')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      const cert = await subcontractorMilestoneService.generateCertificateFromMilestone(
        selectedVerification.uuid,
        {
          contract_id: selectedContractId,
          certified_amount: ipcGrossAmount,
          materials_on_site_value: ipcMaterialsAmount,
          other_deductions: ipcOtherDeductions,
          measurement_summary: ipcSummary,
          valuation_period_start: ipcPeriodStart,
          valuation_period_end: ipcPeriodEnd,
        }
      )
      setSuccessMsg(
        `Interim Payment Certificate ${cert.certificate_number} generated successfully for ${formatCurrency(cert.net_certified_amount)}.`
      )
      setShowSubcontractorIpcModal(false)
      refreshAll()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to generate subcontractor payment certificate.')
    } finally {
      setSubmitting(false)
    }
  }

  // Reload data
  const refreshAll = () => {
    setError(null)
    setSuccessMsg(null)
    loadStats()
    if (activeTab === 'verifications') {
      loadVerifications()
    } else if (activeTab === 'releases') {
      loadReleases()
    } else {
      loadMatrix()
    }
  }

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    if (activeTab === 'verifications') {
      loadVerifications()
    } else if (activeTab === 'releases') {
      loadReleases()
    } else if (activeTab === 'matrix') {
      loadMatrix()
    }
  }, [activeTab, loadVerifications, loadReleases, loadMatrix])

  // Handle Create Verification
  const handleCreateVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.project_id || !createForm.milestone_id || !createForm.title) {
      setError('Please select Project, Milestone, and specify a Title.')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      await milestoneReleaseService.createVerification({
        project_id: createForm.project_id,
        milestone_id: createForm.milestone_id,
        unit_id: createForm.unit_id ? createForm.unit_id : null,
        title: createForm.title,
        physical_completion_percentage: Number(createForm.physical_completion_percentage),
        work_quality_rating: createForm.work_quality_rating,
        inspection_date: createForm.inspection_date,
        inspection_notes: createForm.inspection_notes,
      })
      setSuccessMsg('Milestone physical verification created successfully.')
      setShowCreateModal(false)
      setCreateForm({
        project_id: '',
        milestone_id: '',
        unit_id: '',
        title: '',
        physical_completion_percentage: 100,
        work_quality_rating: 'satisfactory',
        inspection_date: new Date().toISOString().slice(0, 10),
        inspection_notes: '',
      })
      refreshAll()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create verification')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Submit Verification
  const handleSubmitVerification = async (item: MilestoneVerification) => {
    try {
      setSubmitting(true)
      setError(null)
      await milestoneReleaseService.submitVerification(item.uuid)
      setSuccessMsg(`Verification ${item.verification_number} submitted for engineer sign-off.`)
      refreshAll()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit verification')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Site Engineer Sign-Off
  const handleEngineerSignOff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVerification) return

    try {
      setSubmitting(true)
      setError(null)
      await milestoneReleaseService.signOffSiteEngineer(selectedVerification.uuid, {
        structural_checks_passed: engineerForm.structural_checks_passed,
        physical_completion_percentage: Number(engineerForm.physical_completion_percentage),
        work_quality_rating: engineerForm.work_quality_rating,
        inspection_date: engineerForm.inspection_date,
        engineer_notes: engineerForm.engineer_notes,
      })
      setSuccessMsg(`Site Engineer sign-off recorded for ${selectedVerification.verification_number}.`)
      setShowEngineerModal(false)
      refreshAll()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record site engineer sign-off')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle QS Sign-Off
  const handleQsSignOff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVerification) return

    try {
      setSubmitting(true)
      setError(null)
      await milestoneReleaseService.signOffQuantitySurveyor(selectedVerification.uuid, {
        qs_certified_amount: Number(qsForm.qs_certified_amount),
        boq_compliance_status: qsForm.boq_compliance_status,
        retention_percentage: Number(qsForm.retention_percentage),
        qs_notes: qsForm.qs_notes,
      })
      setSuccessMsg(
        `Quantity Surveyor valuation completed. Milestone Payment Release created in Pending Authorization.`
      )
      setShowQsModal(false)
      refreshAll()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record QS valuation')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Client Approval
  const handleClientApproval = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVerification) return

    try {
      setSubmitting(true)
      setError(null)
      await milestoneReleaseService.clientApprove(selectedVerification.uuid, {
        status: clientForm.status,
        client_feedback: clientForm.client_feedback,
      })
      setSuccessMsg(`Client sign-off recorded for ${selectedVerification.verification_number}.`)
      setShowClientModal(false)
      refreshAll()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record client approval')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Rejection
  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVerification || !rejectReason) return

    try {
      setSubmitting(true)
      setError(null)
      await milestoneReleaseService.rejectVerification(selectedVerification.uuid, rejectReason)
      setSuccessMsg(`Verification ${selectedVerification.verification_number} rejected.`)
      setShowRejectModal(false)
      setRejectReason('')
      refreshAll()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject verification')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Authorize Release
  const handleAuthorizeRelease = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRelease) return

    try {
      setSubmitting(true)
      setError(null)
      await milestoneReleaseService.authorizeRelease(selectedRelease.uuid, authorizeNotes)
      setSuccessMsg(`Payment release ${selectedRelease.release_number} authorized for disbursement.`)
      setShowAuthorizeModal(false)
      setAuthorizeNotes('')
      refreshAll()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to authorize release')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Disburse Release
  const handleDisburseRelease = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRelease || !disburseForm.disbursement_reference) return

    try {
      setSubmitting(true)
      setError(null)
      await milestoneReleaseService.disburseRelease(selectedRelease.uuid, {
        payment_method: disburseForm.payment_method,
        disbursement_reference: disburseForm.disbursement_reference,
      })
      setSuccessMsg(
        `Payment release ${selectedRelease.release_number} disbursed successfully. Ledger transaction recorded and client escrow deducted.`
      )
      setShowDisburseModal(false)
      setDisburseForm({
        payment_method: 'internal_transfer',
        disbursement_reference: '',
      })
      refreshAll()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to disburse release')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Release Retention
  const handleReleaseRetention = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRelease || !retentionForm.notes) return

    try {
      setSubmitting(true)
      setError(null)
      await milestoneReleaseService.releaseRetention(selectedRelease.uuid, {
        notes: retentionForm.notes,
      })
      setSuccessMsg(
        `Defect liability retention fund released for ${selectedRelease.release_number}. Ledger updated.`
      )
      setShowRetentionModal(false)
      setRetentionForm({ notes: '' })
      refreshAll()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to release retention')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="milestone-releases-container">
      {/* Top Header */}
      <div className="milestone-releases-header">
        <div className="milestone-releases-title">
          <h1>Milestone Releases & Physical Verifications</h1>
          <p>
            Multi-signature construction verification workflow (Site Engineer &rarr; QS Valuation &rarr; Client
            Approval) and Escrow-backed Milestone Payment Releases.
          </p>
        </div>
        <div className="milestone-releases-actions">
          <button className="action-btn" onClick={refreshAll} title="Refresh">
            <MdRefresh /> Refresh
          </button>
          <button className="action-btn primary" onClick={() => setShowCreateModal(true)}>
            <MdAdd /> New Verification
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

      {/* KPI Cards */}
      <div className="milestone-kpi-grid">
        <div className="kpi-stat-card">
          <div className="kpi-stat-header">
            <span className="kpi-stat-title">Total Verifications</span>
            <span className="kpi-stat-icon blue">
              <MdVerified />
            </span>
          </div>
          <div className="kpi-stat-val">{stats?.total_verifications ?? 0}</div>
          <div className="kpi-stat-sub">
            {stats?.client_approved_count ?? 0} Approved &bull; {stats?.engineer_verified_count ?? 0} Eng Verified
          </div>
        </div>

        <div className="kpi-stat-card">
          <div className="kpi-stat-header">
            <span className="kpi-stat-title">Gross Certified</span>
            <span className="kpi-stat-icon purple">
              <MdAttachMoney />
            </span>
          </div>
          <div className="kpi-stat-val">{formatCurrency(stats?.total_gross_certified)}</div>
          <div className="kpi-stat-sub">Quantity Surveyor Certified Valuations</div>
        </div>

        <div className="kpi-stat-card">
          <div className="kpi-stat-header">
            <span className="kpi-stat-title">Disbursed Releases</span>
            <span className="kpi-stat-icon green">
              <MdCheckCircle />
            </span>
          </div>
          <div className="kpi-stat-val">{formatCurrency(stats?.total_disbursed)}</div>
          <div className="kpi-stat-sub">Paid out from client escrow & operational funds</div>
        </div>

        <div className="kpi-stat-card">
          <div className="kpi-stat-header">
            <span className="kpi-stat-title">Pending Release</span>
            <span className="kpi-stat-icon amber">
              <MdPendingActions />
            </span>
          </div>
          <div className="kpi-stat-val">{formatCurrency(stats?.pending_release_amount)}</div>
          <div className="kpi-stat-sub">Awaiting finance authorization or disbursement</div>
        </div>

        <div className="kpi-stat-card">
          <div className="kpi-stat-header">
            <span className="kpi-stat-title">Retention Held (5%)</span>
            <span className="kpi-stat-icon purple">
              <MdShield />
            </span>
          </div>
          <div className="kpi-stat-val">{formatCurrency(stats?.total_retention_held)}</div>
          <div className="kpi-stat-sub">
            Released: {formatCurrency(stats?.total_retention_released)} (Post Defect Liability)
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="releases-tabs-nav">
        <button
          className={`releases-tab-btn ${activeTab === 'verifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('verifications')}
        >
          <MdFactCheck /> Milestone Verifications ({verifications.length})
        </button>
        <button
          className={`releases-tab-btn ${activeTab === 'releases' ? 'active' : ''}`}
          onClick={() => setActiveTab('releases')}
        >
          <MdAccountBalanceWallet /> Payment Releases & Retention ({releases.length})
        </button>
        <button
          className={`releases-tab-btn ${activeTab === 'matrix' ? 'active' : ''}`}
          onClick={() => setActiveTab('matrix')}
        >
          <MdAccountTree /> Subcontractor Valuation Matrix
        </button>
      </div>

      {/* Toolbar / Filters */}
      <div className="releases-toolbar">
        <div className="releases-search-box">
          <MdSearch style={{ color: '#94a3b8', fontSize: '1.2rem' }} />
          <input
            type="text"
            placeholder={
              activeTab === 'verifications'
                ? 'Search by verification #, title, or project...'
                : activeTab === 'releases'
                ? 'Search by release #, milestone, or reference...'
                : 'Filter matrix milestones...'
            }
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
              fontSize: '0.875rem',
              background: '#f8fafc',
            }}
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {activeTab === 'verifications' && (
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                background: '#f8fafc',
              }}
            >
              <option value="">All Verification Stages</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="engineer_verified">Engineer Verified</option>
              <option value="qs_verified">QS Verified</option>
              <option value="client_approved">Client Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          )}

          {activeTab === 'releases' && (
            <select
              value={filterReleaseStatus}
              onChange={(e) => setFilterReleaseStatus(e.target.value)}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                background: '#f8fafc',
              }}
            >
              <option value="">All Release Statuses</option>
              <option value="pending_authorization">Pending Authorization</option>
              <option value="authorized">Authorized</option>
              <option value="disbursed">Disbursed</option>
              <option value="rejected">Rejected</option>
            </select>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          Loading {activeTab === 'verifications' ? 'verifications' : activeTab === 'releases' ? 'payment releases' : 'subcontractor milestone matrix'}...
        </div>
      ) : activeTab === 'verifications' ? (
        /* TAB 1: VERIFICATIONS TABLE */
        <div className="releases-table-card">
          <table className="releases-table">
            <thead>
              <tr>
                <th>Verification #</th>
                <th>Milestone & Title</th>
                <th>Project / Unit</th>
                <th>Progress %</th>
                <th>Multi-Sign Off Status</th>
                <th>Stage</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {verifications.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    No milestone physical verifications found. Click "New Verification" to create one.
                  </td>
                </tr>
              ) : (
                verifications.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.verification_number}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {item.inspection_date || new Date(item.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.milestone?.milestone_name || 'General Milestone'}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.title}</div>
                    </td>
                    <td>
                      <div>{item.project?.name || 'Project'}</div>
                      {item.unit && (
                        <div style={{ fontSize: '0.75rem', color: '#2563eb' }}>
                          Unit: {item.unit.unit_number || item.unit.name}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          style={{
                            flex: 1,
                            minWidth: '60px',
                            background: '#e2e8f0',
                            borderRadius: '999px',
                            height: '6px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(100, item.physical_completion_percentage)}%`,
                              background: '#2563eb',
                              height: '100%',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                          {item.physical_completion_percentage}%
                        </span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'capitalize' }}>
                        Quality: {item.work_quality_rating?.replace('_', ' ')}
                      </div>
                    </td>
                    <td>
                      {/* Sign-Off Stepper */}
                      <div className="signoff-stepper">
                        <span
                          className={`signoff-badge ${item.site_engineer_id ? 'completed' : 'pending'}`}
                          title={item.site_engineer ? `Signed by ${item.site_engineer.name}` : 'Awaiting Site Eng'}
                        >
                          ENG {item.site_engineer_id ? '✓' : '—'}
                        </span>
                        <span
                          className={`signoff-badge ${item.quantity_surveyor_id ? 'completed' : 'pending'}`}
                          title={
                            item.quantity_surveyor ? `Certified by ${item.quantity_surveyor.name}` : 'Awaiting QS'
                          }
                        >
                          QS {item.quantity_surveyor_id ? '✓' : '—'}
                        </span>
                        <span
                          className={`signoff-badge ${
                            item.client_approval_status === 'approved' || item.client_approval_status === 'waived_by_admin'
                              ? 'completed'
                              : 'pending'
                          }`}
                          title={`Client: ${item.client_approval_status}`}
                        >
                          CLIENT{' '}
                          {item.client_approval_status === 'approved' ||
                          item.client_approval_status === 'waived_by_admin'
                            ? '✓'
                            : '—'}
                        </span>
                      </div>
                      {item.qs_certified_amount > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
                          Val: {formatCurrency(item.qs_certified_amount)}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`pill ${item.stage}`}>{item.stage.replace('_', ' ')}</span>
                    </td>
                    <td className="text-right">
                      <div className="action-btn-group">
                        <button
                          className="action-btn"
                          onClick={() => {
                            setSelectedVerification(item)
                            setShowDetailModal(true)
                          }}
                          title="View Verification Details"
                        >
                          <MdVisibility /> Details
                        </button>

                        {/* Stage Progression Actions */}
                        {item.stage === 'draft' && (
                          <button
                            className="action-btn primary"
                            onClick={() => handleSubmitVerification(item)}
                            disabled={submitting}
                            title="Submit for Verification"
                          >
                            <MdSend /> Submit
                          </button>
                        )}

                        {item.stage === 'submitted' && (
                          <button
                            className="action-btn warning"
                            onClick={() => {
                              setSelectedVerification(item)
                              setEngineerForm({
                                structural_checks_passed: true,
                                physical_completion_percentage: item.physical_completion_percentage,
                                work_quality_rating: item.work_quality_rating,
                                inspection_date: new Date().toISOString().slice(0, 10),
                                engineer_notes: '',
                              })
                              setShowEngineerModal(true)
                            }}
                            title="Site Engineer Verification"
                          >
                            <MdVerified /> Engineer Sign-off
                          </button>
                        )}

                        {item.stage === 'engineer_verified' && (
                          <button
                            className="action-btn primary"
                            onClick={() => {
                              setSelectedVerification(item)
                              setQsForm({
                                qs_certified_amount: item.qs_certified_amount || 0,
                                boq_compliance_status: 'fully_compliant',
                                retention_percentage: 5,
                                qs_notes: '',
                              })
                              setShowQsModal(true)
                            }}
                            title="Quantity Surveyor Valuation"
                          >
                            <MdAttachMoney /> QS Valuation
                          </button>
                        )}

                        {item.stage === 'qs_verified' && (
                          <button
                            className="action-btn success"
                            onClick={() => {
                              setSelectedVerification(item)
                              setClientForm({
                                status: 'approved',
                                client_feedback: '',
                              })
                              setShowClientModal(true)
                            }}
                            title="Client Progress Approval"
                          >
                            <MdThumbUp /> Client Sign-off
                          </button>
                        )}

                        {/* One-Click Subcontractor IPC Linkage (Phase 8 Day 3) */}
                        {(item.stage === 'qs_verified' || item.stage === 'client_approved') &&
                          Number(item.qs_certified_amount) > 0 && (
                            <button
                              className="action-btn primary"
                              style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}
                              onClick={() => handleOpenSubcontractorIpc(item)}
                              title="Generate Subcontractor Interim Payment Certificate (IPC)"
                            >
                              <MdReceiptLong /> Subcontractor IPC
                            </button>
                          )}

                        {item.stage !== 'client_approved' && item.stage !== 'rejected' && (
                          <button
                            className="action-btn"
                            style={{ color: '#b91c1c' }}
                            onClick={() => {
                              setSelectedVerification(item)
                              setShowRejectModal(true)
                            }}
                            title="Reject Verification"
                          >
                            <MdCancel /> Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {verificationTotalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem', gap: '0.5rem' }}>
              <button
                className="action-btn"
                disabled={verificationPage <= 1}
                onClick={() => setVerificationPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.85rem', alignSelf: 'center' }}>
                Page {verificationPage} of {verificationTotalPages}
              </span>
              <button
                className="action-btn"
                disabled={verificationPage >= verificationTotalPages}
                onClick={() => setVerificationPage((p) => Math.min(verificationTotalPages, p + 1))}
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : activeTab === 'releases' ? (
        /* TAB 2: PAYMENT RELEASES TABLE */
        <div className="releases-table-card">
          <table className="releases-table">
            <thead>
              <tr>
                <th>Release #</th>
                <th>Milestone & Project</th>
                <th>Source Account / Escrow</th>
                <th>Gross Certified</th>
                <th>Retention (5%)</th>
                <th>Net Disbursable</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {releases.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    No milestone payment releases found. Releases are automatically generated when a verification is
                    certified by the Quantity Surveyor.
                  </td>
                </tr>
              ) : (
                releases.map((rel) => (
                  <tr key={rel.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{rel.release_number}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {new Date(rel.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{rel.milestone?.milestone_name || 'Milestone'}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {rel.project?.name} {rel.unit ? `• Unit ${rel.unit.unit_number}` : ''}
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          background: '#f1f5f9',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          fontWeight: 600,
                        }}
                      >
                        {rel.source_type.replace('_', ' ')}
                      </span>
                      {rel.client && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                          Client: {rel.client.name}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{formatCurrency(rel.gross_amount)}</div>
                    </td>
                    <td>
                      <div style={{ color: '#d97706', fontWeight: 600 }}>
                        {formatCurrency(rel.retention_amount)} ({rel.retention_percentage}%)
                      </div>
                      {rel.retention_released_at ? (
                        <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600 }}>Released ✓</span>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Held in Reserve</span>
                      )}
                    </td>
                    <td>
                      <div style={{ color: '#059669', fontWeight: 700, fontSize: '0.95rem' }}>
                        {formatCurrency(rel.net_release_amount)}
                      </div>
                    </td>
                    <td>
                      <span className={`pill ${rel.status}`}>{rel.status.replace('_', ' ')}</span>
                      {rel.disbursement_reference && (
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                          Ref: {rel.disbursement_reference}
                        </div>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="action-btn-group">
                        {rel.status === 'pending_authorization' && (
                          <button
                            className="action-btn primary"
                            onClick={() => {
                              setSelectedRelease(rel)
                              setShowAuthorizeModal(true)
                            }}
                            title="Authorize Release"
                          >
                            <MdCheckCircle /> Authorize
                          </button>
                        )}

                        {rel.status === 'authorized' && (
                          <button
                            className="action-btn success"
                            onClick={() => {
                              setSelectedRelease(rel)
                              setDisburseForm({
                                payment_method: 'internal_transfer',
                                disbursement_reference: `DISB-${rel.release_number.slice(-4)}-${Date.now().toString().slice(-4)}`,
                              })
                              setShowDisburseModal(true)
                            }}
                            title="Disburse Funds"
                          >
                            <MdAttachMoney /> Disburse
                          </button>
                        )}

                        {rel.status === 'disbursed' && Number(rel.retention_amount) > 0 && !rel.retention_released_at && (
                          <button
                            className="action-btn warning"
                            onClick={() => {
                              setSelectedRelease(rel)
                              setRetentionForm({ notes: 'Warranty inspection completed. No defects noted.' })
                              setShowRetentionModal(true)
                            }}
                            title="Release Retention Fund"
                          >
                            <MdShield /> Release Retention
                          </button>
                        )}

                        {rel.status === 'disbursed' && rel.retention_released_at && (
                          <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600, padding: '0.3rem' }}>
                            Settled ✓
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {releaseTotalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem', gap: '0.5rem' }}>
              <button
                className="action-btn"
                disabled={releasePage <= 1}
                onClick={() => setReleasePage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.85rem', alignSelf: 'center' }}>
                Page {releasePage} of {releaseTotalPages}
              </span>
              <button
                className="action-btn"
                disabled={releasePage >= releaseTotalPages}
                onClick={() => setReleasePage((p) => Math.min(releaseTotalPages, p + 1))}
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        /* TAB 3: SUBCONTRACTOR MILESTONE VALUATION MATRIX (Phase 8 Day 3) */
        <div className="matrix-container">
          <div className="matrix-header-bar">
            <div>
              <h3 className="matrix-title">Project Subcontractor & Milestone Valuation Matrix</h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Cross-sectional breakdown of construction milestones, allocated trade subcontractors, verified valuations, and defect retentions.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select
                value={filterProject}
                onChange={(e) => {
                  setFilterProject(e.target.value)
                  loadMatrix(e.target.value)
                }}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                  background: '#ffffff',
                }}
              >
                <option value="">Select Project for Matrix...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                className="action-btn"
                onClick={() => loadMatrix()}
                disabled={matrixLoading}
                title="Refresh Matrix"
              >
                <MdRefresh /> Refresh
              </button>
            </div>
          </div>

          {matrixLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              Loading project subcontractor matrix...
            </div>
          ) : !matrixData ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              Please select a project to display the subcontractor milestone matrix.
            </div>
          ) : (
            <div>
              {/* Matrix Top Summary KPI */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  padding: '1.25rem',
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    Total Milestones
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>
                    {matrixData.summary.total_milestones}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {matrixData.summary.total_subcontractors} Trade Subcontractors
                  </div>
                </div>

                <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    Allocated Subcontractor Sum
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#2563eb' }}>
                    {formatCurrency(matrixData.summary.total_allocated_sum)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Committed trade packages</div>
                </div>

                <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    Certified Gross Work
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#059669' }}>
                    {formatCurrency(matrixData.summary.total_certified_gross)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {matrixData.summary.total_allocated_sum > 0
                      ? `${Math.round((matrixData.summary.total_certified_gross / matrixData.summary.total_allocated_sum) * 100)}% of allocated`
                      : '0%'}
                  </div>
                </div>

                <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    Retention Held (5% Defect Pool)
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#d97706' }}>
                    {formatCurrency(matrixData.summary.total_retention_held)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Warranty reserve</div>
                </div>
              </div>

              {/* Matrix Table */}
              <div style={{ overflowX: 'auto' }}>
                <table className="matrix-table">
                  <thead>
                    <tr>
                      <th style={{ width: '25%' }}>Milestone Work Package</th>
                      <th style={{ width: '15%' }}>Progress & Status</th>
                      <th style={{ width: '40%' }}>Allocated Subcontractors & Packages</th>
                      <th style={{ width: '20%' }}>Valuation Totals</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrixData.milestones.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                          No milestones configured for this project.
                        </td>
                      </tr>
                    ) : (
                      matrixData.milestones.map((m) => (
                        <tr key={m.milestone_id} className="matrix-milestone-row">
                          <td>
                            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>
                              #{m.milestone_order} — {m.milestone_name}
                            </div>
                            {m.milestone_code && (
                              <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                                Code: {m.milestone_code}
                              </div>
                            )}
                            {m.target_date && (
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                                Target: {m.target_date}
                              </div>
                            )}
                          </td>

                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                              <div style={{ flex: 1, background: '#e2e8f0', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    width: `${Math.min(100, m.completion_percentage)}%`,
                                    background: m.completion_percentage >= 100 ? '#16a34a' : '#2563eb',
                                    height: '100%',
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{m.completion_percentage}%</span>
                            </div>
                            <span className={`pill ${m.status}`}>{m.status.replace('_', ' ')}</span>
                          </td>

                          <td>
                            {m.allocated_subcontractors.length === 0 ? (
                              <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.85rem' }}>
                                No subcontractor packages allocated yet.
                              </div>
                            ) : (
                              m.allocated_subcontractors.map((sub) => (
                                <div key={sub.contract_milestone_id} className="subcontractor-nested-card">
                                  <div>
                                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{sub.subcontractor_name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                      <span style={{ textTransform: 'capitalize' }}>{sub.trade_category}</span>
                                      <span>•</span>
                                      <span style={{ fontFamily: 'monospace' }}>{sub.contract_number}</span>
                                    </div>
                                  </div>

                                  <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 600, color: '#2563eb' }}>
                                      {formatCurrency(sub.allocated_amount)}
                                      {sub.weight_percentage && (
                                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>
                                          {' '}
                                          ({sub.weight_percentage}%)
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                                      Cert: {formatCurrency(sub.certified_amount)} ({sub.percentage_certified}%)
                                    </div>
                                    {sub.certificates_count > 0 && (
                                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                        {sub.certificates_count} IPC{sub.certificates_count > 1 ? 's' : ''} issued
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </td>

                          <td>
                            <div style={{ background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                                <span style={{ color: '#64748b' }}>Allocated:</span>
                                <strong>{formatCurrency(m.totals.allocated_sum)}</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                                <span style={{ color: '#64748b' }}>Certified:</span>
                                <strong style={{ color: '#059669' }}>{formatCurrency(m.totals.certified_amount)}</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                <span style={{ color: '#64748b' }}>Paid:</span>
                                <strong style={{ color: '#0284c7' }}>{formatCurrency(m.totals.paid_amount)}</strong>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: GENERATE SUBCONTRACTOR IPC DIRECTLY FROM MILESTONE VERIFICATION (Phase 8 Day 3) */}
      {showSubcontractorIpcModal && selectedVerification && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '640px' }}>
            <div className="modal-header-row">
              <div>
                <h3 style={{ margin: 0 }}>Issue Subcontractor Interim Payment Certificate</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Linked to Verification {selectedVerification.verification_number} ({selectedVerification.milestone?.milestone_name})
                </span>
              </div>
              <button
                onClick={() => setShowSubcontractorIpcModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleGenerateSubcontractorIpc}>
              <div className="form-group">
                <label>Subcontractor Contract *</label>
                {contractsList.length === 0 ? (
                  <div style={{ color: '#dc2626', fontSize: '0.85rem', padding: '0.5rem', background: '#fef2f2', borderRadius: '6px' }}>
                    No active subcontractor contracts found for this project. Please create or activate a contract under the Contracts module first.
                  </div>
                ) : (
                  <select
                    required
                    value={selectedContractId}
                    onChange={(e) => setSelectedContractId(e.target.value)}
                  >
                    <option value="">Select Subcontractor Contract...</option>
                    {contractsList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.contract_number} — {c.subcontractor_name} ({c.trade_category}) [{formatCurrency(c.contract_sum, c.currency)}]
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Gross Valuation Amount (USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={ipcGrossAmount}
                    onChange={(e) => setIpcGrossAmount(parseFloat(e.target.value) || 0)}
                  />
                  <small style={{ color: '#64748b', fontSize: '0.75rem' }}>
                    QS Certified: {formatCurrency(selectedVerification.qs_certified_amount)}
                  </small>
                </div>

                <div className="form-group">
                  <label>Materials On Site (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={ipcMaterialsAmount}
                    onChange={(e) => setIpcMaterialsAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Valuation Period Start</label>
                  <input
                    type="date"
                    value={ipcPeriodStart}
                    onChange={(e) => setIpcPeriodStart(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Valuation Period End</label>
                  <input
                    type="date"
                    value={ipcPeriodEnd}
                    onChange={(e) => setIpcPeriodEnd(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Other Deductions (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={ipcOtherDeductions}
                  onChange={(e) => setIpcOtherDeductions(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. advance recoupment or penalties"
                />
              </div>

              {/* Auto-Calculated Valuation & Statutory Deductions Preview */}
              <div className="ipc-calc-preview">
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Certificate Calculation & Statutory Deductions
                </div>
                <div className="ipc-calc-row">
                  <span>Gross Valuation Work Executed:</span>
                  <strong>{formatCurrency(ipcGrossAmount)}</strong>
                </div>
                <div className="ipc-calc-row" style={{ color: '#d97706' }}>
                  <span>Less: 5% Defect Liability Retention:</span>
                  <strong>- {formatCurrency(ipcGrossAmount * 0.05)}</strong>
                </div>
                <div className="ipc-calc-row" style={{ color: '#475569' }}>
                  <span>Less: 6% Statutory Uganda Revenue Authority (URA) WHT:</span>
                  <strong>- {formatCurrency(ipcGrossAmount * 0.06)}</strong>
                </div>
                {ipcOtherDeductions > 0 && (
                  <div className="ipc-calc-row" style={{ color: '#dc2626' }}>
                    <span>Less: Other Deductions / Contra Charges:</span>
                    <strong>- {formatCurrency(ipcOtherDeductions)}</strong>
                  </div>
                )}
                <div className="ipc-calc-row total" style={{ color: '#16a34a' }}>
                  <span>Net Interim Payment Payable to Subcontractor:</span>
                  <strong>
                    {formatCurrency(
                      Math.max(
                        0,
                        ipcGrossAmount -
                          ipcGrossAmount * 0.05 -
                          ipcGrossAmount * 0.06 -
                          ipcOtherDeductions
                      )
                    )}
                  </strong>
                </div>
              </div>

              <div className="form-group">
                <label>Valuation & Measurement Notes</label>
                <textarea
                  rows={2}
                  value={ipcSummary}
                  onChange={(e) => setIpcSummary(e.target.value)}
                  placeholder="Reference measurement sheet, QS valuation report, and specific work package items..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="action-btn"
                  onClick={() => setShowSubcontractorIpcModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="action-btn primary"
                  disabled={submitting || contractsList.length === 0}
                  style={{ backgroundColor: '#0284c7' }}
                >
                  {submitting ? 'Generating...' : 'Confirm & Generate IPC'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE VERIFICATION */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header-row">
              <h3>Create Milestone Physical Verification</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleCreateVerification}>
              <div className="form-group">
                <label>Project *</label>
                <select
                  required
                  value={createForm.project_id}
                  onChange={(e) => setCreateForm({ ...createForm, project_id: e.target.value })}
                >
                  <option value="">Select Project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Milestone *</label>
                <select
                  required
                  disabled={!createForm.project_id}
                  value={createForm.milestone_id}
                  onChange={(e) => setCreateForm({ ...createForm, milestone_id: e.target.value })}
                >
                  <option value="">{createForm.project_id ? 'Select Milestone' : 'Select Project First'}</option>
                  {milestones.map((m) => (
                    <option key={m.id} value={m.id}>
                      #{m.milestone_order} - {m.milestone_name} ({m.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Specific Unit (Optional)</label>
                <select
                  disabled={!createForm.project_id}
                  value={createForm.unit_id}
                  onChange={(e) => setCreateForm({ ...createForm, unit_id: e.target.value })}
                >
                  <option value="">Project-Wide / No Unit</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.unit_number} - {u.name || 'Unit'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Verification Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Substructure Foundation & Concrete Pour Verification"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Completion % (1-100) *</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={createForm.physical_completion_percentage}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, physical_completion_percentage: Number(e.target.value) })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Work Quality Rating</label>
                  <select
                    value={createForm.work_quality_rating}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, work_quality_rating: e.target.value as WorkQualityRating })
                    }
                  >
                    <option value="exceptional">Exceptional</option>
                    <option value="satisfactory">Satisfactory</option>
                    <option value="defects_noted">Defects Noted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Inspection Date</label>
                <input
                  type="date"
                  value={createForm.inspection_date}
                  onChange={(e) => setCreateForm({ ...createForm, inspection_date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Inspection Field Notes</label>
                <textarea
                  rows={3}
                  placeholder="Notes from physical on-site inspection..."
                  value={createForm.inspection_notes}
                  onChange={(e) => setCreateForm({ ...createForm, inspection_notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" className="action-btn" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="action-btn primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SITE ENGINEER SIGN-OFF */}
      {showEngineerModal && selectedVerification && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header-row">
              <h3>Site Engineer Physical Sign-Off</h3>
              <button
                onClick={() => setShowEngineerModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleEngineerSignOff}>
              <div style={{ marginBottom: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '6px' }}>
                <div style={{ fontWeight: 600 }}>{selectedVerification.verification_number}</div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{selectedVerification.title}</div>
              </div>

              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="structural_checks"
                  checked={engineerForm.structural_checks_passed}
                  onChange={(e) => setEngineerForm({ ...engineerForm, structural_checks_passed: e.target.checked })}
                />
                <label htmlFor="structural_checks" style={{ textTransform: 'none', fontSize: '0.85rem' }}>
                  Structural & Engineering integrity checks passed according to architectural drawings
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Confirmed Completion % *</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={engineerForm.physical_completion_percentage}
                    onChange={(e) =>
                      setEngineerForm({ ...engineerForm, physical_completion_percentage: Number(e.target.value) })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Quality Rating</label>
                  <select
                    value={engineerForm.work_quality_rating}
                    onChange={(e) =>
                      setEngineerForm({ ...engineerForm, work_quality_rating: e.target.value as WorkQualityRating })
                    }
                  >
                    <option value="exceptional">Exceptional</option>
                    <option value="satisfactory">Satisfactory</option>
                    <option value="defects_noted">Defects Noted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Engineer Technical Notes & Sign-Off Statement *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Record structural inspection results, concrete cube tests, rebar alignment..."
                  value={engineerForm.engineer_notes}
                  onChange={(e) => setEngineerForm({ ...engineerForm, engineer_notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" className="action-btn" onClick={() => setShowEngineerModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="action-btn primary" disabled={submitting}>
                  {submitting ? 'Signing Off...' : 'Confirm Site Engineer Sign-Off'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: QUANTITY SURVEYOR VALUATION */}
      {showQsModal && selectedVerification && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header-row">
              <h3>Quantity Surveyor (QS) Physical Valuation</h3>
              <button
                onClick={() => setShowQsModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleQsSignOff}>
              <div style={{ marginBottom: '1rem', background: '#eff6ff', padding: '0.75rem', borderRadius: '6px' }}>
                <div style={{ fontWeight: 600, color: '#1e40af' }}>{selectedVerification.verification_number}</div>
                <div style={{ fontSize: '0.85rem', color: '#3b82f6' }}>
                  Site Engineer has certified {selectedVerification.physical_completion_percentage}% physical
                  completion.
                </div>
              </div>

              <div className="form-group">
                <label>QS Certified Valuation Amount (Gross USD) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="e.g. 15000.00"
                  value={qsForm.qs_certified_amount || ''}
                  onChange={(e) => setQsForm({ ...qsForm, qs_certified_amount: Number(e.target.value) })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>BOQ Compliance</label>
                  <select
                    value={qsForm.boq_compliance_status}
                    onChange={(e) =>
                      setQsForm({ ...qsForm, boq_compliance_status: e.target.value as BoqComplianceStatus })
                    }
                  >
                    <option value="fully_compliant">Fully Compliant</option>
                    <option value="minor_variations">Minor Variations</option>
                    <option value="non_compliant">Non Compliant</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Retention % (Default 5%) *</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    required
                    value={qsForm.retention_percentage}
                    onChange={(e) => setQsForm({ ...qsForm, retention_percentage: Number(e.target.value) })}
                  />
                </div>
              </div>

              {qsForm.qs_certified_amount > 0 && (
                <div
                  style={{
                    background: '#f8fafc',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    marginBottom: '1rem',
                    fontSize: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>Gross Amount:</span>
                    <strong>{formatCurrency(qsForm.qs_certified_amount)}</strong>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '0.25rem',
                      color: '#d97706',
                    }}
                  >
                    <span>5% Defect Retention:</span>
                    <strong>
                      {formatCurrency(qsForm.qs_certified_amount * (qsForm.retention_percentage / 100))}
                    </strong>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderTop: '1px solid #cbd5e1',
                      paddingTop: '0.25rem',
                      color: '#059669',
                    }}
                  >
                    <span>Net Release Payable:</span>
                    <strong>
                      {formatCurrency(qsForm.qs_certified_amount * (1 - qsForm.retention_percentage / 100))}
                    </strong>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>QS Valuation & Audit Notes *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Record Bill of Quantities measured quantities and unit rate verifications..."
                  value={qsForm.qs_notes}
                  onChange={(e) => setQsForm({ ...qsForm, qs_notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" className="action-btn" onClick={() => setShowQsModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="action-btn primary" disabled={submitting}>
                  {submitting ? 'Certifying...' : 'Certify & Generate Payment Release'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CLIENT APPROVAL */}
      {showClientModal && selectedVerification && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header-row">
              <h3>Client Progress Sign-Off</h3>
              <button
                onClick={() => setShowClientModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleClientApproval}>
              <div style={{ marginBottom: '1rem', background: '#ecfdf5', padding: '0.75rem', borderRadius: '6px' }}>
                <div style={{ fontWeight: 600, color: '#065f46' }}>{selectedVerification.verification_number}</div>
                <div style={{ fontSize: '0.85rem', color: '#047857' }}>
                  QS Certified Amount: {formatCurrency(selectedVerification.qs_certified_amount)}
                </div>
              </div>

              <div className="form-group">
                <label>Approval Decision *</label>
                <select
                  value={clientForm.status}
                  onChange={(e) =>
                    setClientForm({
                      ...clientForm,
                      status: e.target.value as 'approved' | 'disputed' | 'waived_by_admin',
                    })
                  }
                >
                  <option value="approved">Approved by Client / Representative</option>
                  <option value="waived_by_admin">Waived by Admin (Under Contract Term)</option>
                  <option value="disputed">Disputed / Defects Identified</option>
                </select>
              </div>

              <div className="form-group">
                <label>Client Feedback / Inspection Statement</label>
                <textarea
                  rows={3}
                  placeholder="Record client comments or confirmation of site walk inspection..."
                  value={clientForm.client_feedback}
                  onChange={(e) => setClientForm({ ...clientForm, client_feedback: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" className="action-btn" onClick={() => setShowClientModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="action-btn success" disabled={submitting}>
                  {submitting ? 'Recording...' : 'Record Client Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: AUTHORIZE PAYMENT RELEASE */}
      {showAuthorizeModal && selectedRelease && (
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

            <form onSubmit={handleAuthorizeRelease}>
              <div style={{ marginBottom: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '6px' }}>
                <div style={{ fontWeight: 600 }}>{selectedRelease.release_number}</div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Net Disbursable Amount:{' '}
                  <strong style={{ color: '#059669' }}>{formatCurrency(selectedRelease.net_release_amount)}</strong>
                </div>
              </div>

              <div className="form-group">
                <label>Authorization Notes (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Add finance compliance notes..."
                  value={authorizeNotes}
                  onChange={(e) => setAuthorizeNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" className="action-btn" onClick={() => setShowAuthorizeModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="action-btn primary" disabled={submitting}>
                  {submitting ? 'Authorizing...' : 'Authorize for Disbursement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: DISBURSE RELEASE */}
      {showDisburseModal && selectedRelease && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header-row">
              <h3>Disburse Milestone Release</h3>
              <button
                onClick={() => setShowDisburseModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleDisburseRelease}>
              <div style={{ marginBottom: '1rem', background: '#ecfdf5', padding: '0.75rem', borderRadius: '6px' }}>
                <div style={{ fontWeight: 600, color: '#065f46' }}>{selectedRelease.release_number}</div>
                <div style={{ fontSize: '0.9rem', color: '#047857', marginTop: '0.25rem' }}>
                  Amount to Disburse:{' '}
                  <strong>{formatCurrency(selectedRelease.net_release_amount)}</strong>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Source: {selectedRelease.source_type.replace('_', ' ')}
                </div>
              </div>

              <div className="form-group">
                <label>Payment Method *</label>
                <select
                  value={disburseForm.payment_method}
                  onChange={(e) =>
                    setDisburseForm({ ...disburseForm, payment_method: e.target.value as ReleasePaymentMethod })
                  }
                >
                  <option value="internal_transfer">Internal Transfer (Escrow to Operations)</option>
                  <option value="bank_transfer">Bank Transfer / EFT</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div className="form-group">
                <label>Disbursement Reference *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TXN-ESCROW-20261019-01"
                  value={disburseForm.disbursement_reference}
                  onChange={(e) => setDisburseForm({ ...disburseForm, disbursement_reference: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" className="action-btn" onClick={() => setShowDisburseModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="action-btn success" disabled={submitting}>
                  {submitting ? 'Disbursing...' : 'Confirm & Disburse Funds'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: RELEASE RETENTION */}
      {showRetentionModal && selectedRelease && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header-row">
              <h3>Release 5% Defect Liability Retention</h3>
              <button
                onClick={() => setShowRetentionModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleReleaseRetention}>
              <div style={{ marginBottom: '1rem', background: '#fffbeb', padding: '0.75rem', borderRadius: '6px' }}>
                <div style={{ fontWeight: 600, color: '#92400e' }}>{selectedRelease.release_number}</div>
                <div style={{ fontSize: '0.85rem', color: '#b45309' }}>
                  Retention Fund Amount: <strong>{formatCurrency(selectedRelease.retention_amount)}</strong>
                </div>
              </div>

              <div className="form-group">
                <label>Defect Liability Expiry & Warranty Inspection Notes *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Confirm warranty inspection results and resolution of snags..."
                  value={retentionForm.notes}
                  onChange={(e) => setRetentionForm({ notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" className="action-btn" onClick={() => setShowRetentionModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="action-btn warning" disabled={submitting}>
                  {submitting ? 'Releasing...' : 'Confirm Retention Release'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: REJECT */}
      {showRejectModal && selectedVerification && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header-row">
              <h3>Reject Milestone Verification</h3>
              <button
                onClick={() => setShowRejectModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleReject}>
              <div style={{ marginBottom: '1rem', background: '#fef2f2', padding: '0.75rem', borderRadius: '6px' }}>
                <div style={{ fontWeight: 600, color: '#b91c1c' }}>{selectedVerification.verification_number}</div>
                <div style={{ fontSize: '0.85rem', color: '#7f1d1d' }}>
                  Rejecting will require the contractor or site manager to address snags and resubmit.
                </div>
              </div>

              <div className="form-group">
                <label>Reason for Rejection *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail defect observations, unapproved materials, or structural issues..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" className="action-btn" onClick={() => setShowRejectModal(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="action-btn"
                  style={{ background: '#b91c1c', color: '#ffffff' }}
                  disabled={submitting}
                >
                  {submitting ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 9: DETAIL VIEW */}
      {showDetailModal && selectedVerification && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '640px' }}>
            <div className="modal-header-row">
              <h3>Verification Details & Multi-Sign Audit Trail</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                <MdClose />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#64748b' }}>Verification Number:</span>
                <strong>{selectedVerification.verification_number}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#64748b' }}>Project:</span>
                <strong>{selectedVerification.project?.name}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#64748b' }}>Milestone:</span>
                <strong>{selectedVerification.milestone?.milestone_name}</strong>
              </div>

              {selectedVerification.unit && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: '#64748b' }}>Unit:</span>
                  <strong>{selectedVerification.unit.unit_number}</strong>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#64748b' }}>Stage / Status:</span>
                <span className={`pill ${selectedVerification.stage}`}>{selectedVerification.stage.replace('_', ' ')}</span>
              </div>

              {/* Sign-off trail */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: '#334155' }}>
                  Multi-Signature Verification Trail
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                      <span className={`signoff-badge ${selectedVerification.site_engineer_id ? 'completed' : 'pending'}`}>
                        1. Site Engineer
                      </span>
                      <span>{selectedVerification.site_engineer?.name || 'Pending Sign-Off'}</span>
                    </div>
                    {selectedVerification.engineer_notes && (
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem', marginLeft: '1rem' }}>
                        Notes: {selectedVerification.engineer_notes}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                      <span className={`signoff-badge ${selectedVerification.quantity_surveyor_id ? 'completed' : 'pending'}`}>
                        2. Quantity Surveyor
                      </span>
                      <span>{selectedVerification.quantity_surveyor?.name || 'Pending Valuation'}</span>
                    </div>
                    {selectedVerification.qs_certified_amount > 0 && (
                      <div style={{ fontSize: '0.8rem', color: '#059669', marginTop: '0.2rem', marginLeft: '1rem' }}>
                        Certified Valuation: {formatCurrency(selectedVerification.qs_certified_amount)} ({selectedVerification.boq_compliance_status.replace('_', ' ')})
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                      <span
                        className={`signoff-badge ${
                          selectedVerification.client_approval_status === 'approved' ||
                          selectedVerification.client_approval_status === 'waived_by_admin'
                            ? 'completed'
                            : 'pending'
                        }`}
                      >
                        3. Client Sign-Off
                      </span>
                      <span style={{ textTransform: 'capitalize' }}>{selectedVerification.client_approval_status}</span>
                    </div>
                    {selectedVerification.client_feedback && (
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem', marginLeft: '1rem' }}>
                        Feedback: {selectedVerification.client_feedback}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedVerification.rejection_reason && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '0.75rem', borderRadius: '6px', color: '#b91c1c' }}>
                  <strong>Rejection Reason:</strong> {selectedVerification.rejection_reason}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button className="action-btn" onClick={() => setShowDetailModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MilestoneReleasesList
