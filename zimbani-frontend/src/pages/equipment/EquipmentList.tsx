import React, { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  MdSearch,
  MdAdd,
  MdRefresh,
  MdPrecisionManufacturing,
  MdWarning,
  MdCheckCircle,
  MdLocalShipping,
  MdEdit,
  MdDelete,
  MdBuild,
  MdEngineering,
  MdTimer,
  MdClose,
  MdAssignmentReturn,
  MdDoneAll,
  MdSpeed,
} from 'react-icons/md'
import {
  Equipment,
  EquipmentDispatch,
  EquipmentMaintenanceLog,
  EquipmentUtilizationLog,
  EquipmentStatistics,
  EquipmentStatus,
  EquipmentCondition,
  DispatchStatus,
  MaintenanceType,
  MaintenanceStatus,
  CreateEquipmentDispatchInput,
  CreateMaintenanceLogInput,
  CreateUtilizationLogInput,
} from '../../types/equipment.types'
import { Site } from '../../types/site.types'
import { Project } from '../../types/project.types'
import { Task } from '../../types/task.types'
import { AdminUser } from '../../types/admin.types'
import equipmentService from '../../services/equipment.service'
import { siteService } from '../../services/site.service'
import { projectService } from '../../services/project.service'
import taskService from '../../services/task.service'
import { adminService } from '../../services/admin.service'
import './EquipmentList.css'

export const EquipmentList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialSiteId = searchParams.get('site_id') || ''
  const activeTabParam =
    (searchParams.get('tab') as 'fleet' | 'dispatches' | 'maintenance' | 'utilization') || 'fleet'

  // Tabs
  const [activeTab, setActiveTab] = useState<'fleet' | 'dispatches' | 'maintenance' | 'utilization'>(activeTabParam)

  // Data states
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([])
  const [dispatches, setDispatches] = useState<EquipmentDispatch[]>([])
  const [maintenanceLogs, setMaintenanceLogs] = useState<EquipmentMaintenanceLog[]>([])
  const [utilizationLogs, setUtilizationLogs] = useState<EquipmentUtilizationLog[]>([])
  const [stats, setStats] = useState<EquipmentStatistics | null>(null)

  // Lookups
  const [sites, setSites] = useState<Site[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])

  // Loading & Action states
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<boolean>(false)

  // Filters - Fleet
  const [fleetSearch, setFleetSearch] = useState<string>('')
  const [selectedSite, setSelectedSite] = useState<string>(initialSiteId)
  const [selectedType, setSelectedType] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [selectedCondition, setSelectedCondition] = useState<string>('')
  const [needsServiceOnly, setNeedsServiceOnly] = useState<boolean>(false)

  // Filters - Dispatches
  const [dispatchSearch, setDispatchSearch] = useState<string>('')
  const [dispatchStatus, setDispatchStatus] = useState<string>('')

  // Filters - Maintenance
  const [maintenanceSearch, setMaintenanceSearch] = useState<string>('')
  const [maintenanceTypeFilter, setMaintenanceTypeFilter] = useState<string>('')
  const [maintenanceStatusFilter, setMaintenanceStatusFilter] = useState<string>('')

  // Filters - Utilization
  const [utilizationSearch, setUtilizationSearch] = useState<string>('')
  const [utilizationSite, setUtilizationSite] = useState<string>('')

  // Pagination
  const [fleetPage, setFleetPage] = useState<number>(1)
  const [fleetTotal, setFleetTotal] = useState<number>(0)
  const [dispatchPage, setDispatchPage] = useState<number>(1)
  const [dispatchTotal, setDispatchTotal] = useState<number>(0)
  const [maintPage, setMaintPage] = useState<number>(1)
  const [maintTotal, setMaintTotal] = useState<number>(0)
  const [utilPage, setUtilPage] = useState<number>(1)
  const [utilTotal, setUtilTotal] = useState<number>(0)

  // Modals state
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState<boolean>(false)
  const [isReturnModalOpen, setIsReturnModalOpen] = useState<boolean>(false)
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState<boolean>(false)
  const [isCompleteMaintModalOpen, setIsCompleteMaintModalOpen] = useState<boolean>(false)
  const [isUtilizationModalOpen, setIsUtilizationModalOpen] = useState<boolean>(false)

  // Target item for modals
  const [selectedItemForAction, setSelectedItemForAction] = useState<any>(null)

  // Modal Forms
  const [dispatchForm, setDispatchForm] = useState<CreateEquipmentDispatchInput>({
    equipment_id: '',
    to_site_id: '',
    from_site_id: '',
    project_id: '',
    operator_id: '',
    dispatched_at: new Date().toISOString().split('T')[0],
    expected_return_date: '',
    purpose: '',
    transport_cost: 0,
    notes: '',
  })

  const [returnForm, setReturnForm] = useState({
    actual_return_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const [maintenanceForm, setMaintenanceForm] = useState<CreateMaintenanceLogInput>({
    equipment_id: '',
    maintenance_type: 'routine_service',
    scheduled_date: new Date().toISOString().split('T')[0],
    service_provider: '',
    cost: 0,
    description: '',
    next_service_due_date: '',
    notes: '',
  })

  const [completeMaintForm, setCompleteMaintForm] = useState({
    completed_date: new Date().toISOString().split('T')[0],
    cost: 0,
    parts_replaced: '',
    next_service_due_date: '',
    notes: '',
  })

  const [utilizationForm, setUtilizationForm] = useState<CreateUtilizationLogInput>({
    equipment_id: '',
    site_id: '',
    project_id: '',
    task_id: '',
    operator_id: '',
    date: new Date().toISOString().split('T')[0],
    start_meter_reading: 0,
    end_meter_reading: 0,
    hours_operated: 0,
    hourly_rate: 0,
    fuel_litres_used: 0,
    purpose: '',
    notes: '',
  })

  // Load Lookups (sites, projects, tasks, users)
  useEffect(() => {
    siteService
      .getSites({ per_page: 100 })
      .then((res) => {
        const raw = (res as any)?.data || []
        setSites(Array.isArray(raw) ? raw : [])
      })
      .catch((e) => console.warn('Failed to load sites:', e))

    projectService
      .getProjects({ per_page: 100 })
      .then((res) => {
        const raw = (res as any)?.data || []
        setProjects(Array.isArray(raw) ? raw : [])
      })
      .catch((e) => console.warn('Failed to load projects:', e))

    taskService
      .getTasks({ per_page: 100 })
      .then((res) => {
        const raw = (res as any)?.data || []
        setTasks(Array.isArray(raw) ? raw : [])
      })
      .catch((e) => console.warn('Failed to load tasks:', e))

    adminService
      .getUsers({ per_page: 100 })
      .then((res) => {
        const raw = (res as any)?.data || []
        setUsers(Array.isArray(raw) ? raw : [])
      })
      .catch((e) => console.warn('Failed to load users:', e))
  }, [])

  // Sync tab with URL query parameter
  const handleTabChange = (tab: 'fleet' | 'dispatches' | 'maintenance' | 'utilization') => {
    setActiveTab(tab)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('tab', tab)
      return next
    })
  }

  // Load KPI Stats
  const loadStats = useCallback(async () => {
    try {
      const data = await equipmentService.getEquipmentStatistics(selectedSite || undefined)
      setStats(data)
    } catch (err) {
      console.warn('Failed to load equipment statistics:', err)
    }
  }, [selectedSite])

  // Load Fleet Catalog
  const loadFleet = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await equipmentService.getEquipment({
        site_id: selectedSite || undefined,
        type: selectedType || undefined,
        status: (selectedStatus as EquipmentStatus) || undefined,
        condition: (selectedCondition as EquipmentCondition) || undefined,
        needs_service: needsServiceOnly,
        search: fleetSearch || undefined,
        page: fleetPage,
        per_page: 15,
      })
      setEquipmentList(res.data || [])
      setFleetTotal(res.pagination?.total || 0)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load equipment fleet')
    } finally {
      setLoading(false)
    }
  }, [selectedSite, selectedType, selectedStatus, selectedCondition, needsServiceOnly, fleetSearch, fleetPage])

  // Load Dispatches
  const loadDispatches = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await equipmentService.getDispatches({
        site_id: selectedSite || undefined,
        status: (dispatchStatus as DispatchStatus) || undefined,
        search: dispatchSearch || undefined,
        page: dispatchPage,
        per_page: 15,
      })
      setDispatches(res.data || [])
      setDispatchTotal(res.pagination?.total || 0)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load dispatches')
    } finally {
      setLoading(false)
    }
  }, [selectedSite, dispatchStatus, dispatchSearch, dispatchPage])

  // Load Maintenance Logs
  const loadMaintenance = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await equipmentService.getMaintenanceLogs({
        maintenance_type: (maintenanceTypeFilter as MaintenanceType) || undefined,
        status: (maintenanceStatusFilter as MaintenanceStatus) || undefined,
        search: maintenanceSearch || undefined,
        page: maintPage,
        per_page: 15,
      })
      setMaintenanceLogs(res.data || [])
      setMaintTotal(res.pagination?.total || 0)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load maintenance logs')
    } finally {
      setLoading(false)
    }
  }, [maintenanceTypeFilter, maintenanceStatusFilter, maintenanceSearch, maintPage])

  // Load Utilization Logs
  const loadUtilization = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await equipmentService.getUtilizationLogs({
        site_id: utilizationSite || undefined,
        search: utilizationSearch || undefined,
        page: utilPage,
        per_page: 15,
      })
      setUtilizationLogs(res.data || [])
      setUtilTotal(res.pagination?.total || 0)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load utilization logs')
    } finally {
      setLoading(false)
    }
  }, [utilizationSite, utilizationSearch, utilPage])

  // Trigger loads based on active tab
  useEffect(() => {
    loadStats()
    if (activeTab === 'fleet') loadFleet()
    else if (activeTab === 'dispatches') loadDispatches()
    else if (activeTab === 'maintenance') loadMaintenance()
    else if (activeTab === 'utilization') loadUtilization()
  }, [activeTab, loadStats, loadFleet, loadDispatches, loadMaintenance, loadUtilization])

  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  // Format currency helper
  const formatMoney = (val?: number | null, curr = 'UGX') => {
    if (val === undefined || val === null) return '-'
    return `${curr} ${Number(val).toLocaleString()}`
  }

  // ==========================================
  // DISPATCH HANDLERS
  // ==========================================
  const handleOpenDispatchModal = (item?: Equipment) => {
    setDispatchForm({
      equipment_id: item?.id ? String(item.id) : '',
      to_site_id: '',
      from_site_id: item?.current_site?.id ? String(item.current_site.id) : '',
      project_id: '',
      operator_id: item?.assigned_operator?.id ? String(item.assigned_operator.id) : '',
      dispatched_at: new Date().toISOString().split('T')[0],
      expected_return_date: '',
      purpose: '',
      transport_cost: 0,
      notes: '',
    })
    setIsDispatchModalOpen(true)
  }

  const handleSubmitDispatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dispatchForm.equipment_id || !dispatchForm.to_site_id || !dispatchForm.purpose) {
      setError('Please fill in Equipment, Destination Site, and Purpose.')
      return
    }

    setActionLoading(true)
    setError(null)
    try {
      await equipmentService.createDispatch(dispatchForm)
      setSuccessMessage('Equipment dispatch scheduled successfully.')
      setIsDispatchModalOpen(false)
      loadStats()
      if (activeTab === 'dispatches') loadDispatches()
      else if (activeTab === 'fleet') loadFleet()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create dispatch')
    } finally {
      setActionLoading(false)
    }
  }

  const handleActivateDispatch = async (dispatchItem: EquipmentDispatch) => {
    if (!window.confirm(`Confirm delivery and activation of ${dispatchItem.equipment?.name} at ${dispatchItem.to_site?.name}?`)) {
      return
    }
    setActionLoading(true)
    try {
      await equipmentService.activateDispatch(dispatchItem.uuid)
      setSuccessMessage(`Equipment marked as Active On-Site at ${dispatchItem.to_site?.name}.`)
      loadDispatches()
      loadStats()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to activate dispatch')
    } finally {
      setActionLoading(false)
    }
  }

  const handleOpenReturnModal = (dispatchItem: EquipmentDispatch) => {
    setSelectedItemForAction(dispatchItem)
    setReturnForm({
      actual_return_date: new Date().toISOString().split('T')[0],
      notes: '',
    })
    setIsReturnModalOpen(true)
  }

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItemForAction) return

    setActionLoading(true)
    try {
      await equipmentService.returnDispatch(
        selectedItemForAction.uuid,
        returnForm.actual_return_date,
        returnForm.notes
      )
      setSuccessMessage('Equipment returned successfully and marked available.')
      setIsReturnModalOpen(false)
      loadDispatches()
      loadStats()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to return equipment')
    } finally {
      setActionLoading(false)
    }
  }

  // ==========================================
  // MAINTENANCE HANDLERS
  // ==========================================
  const handleOpenMaintenanceModal = (item?: Equipment) => {
    setMaintenanceForm({
      equipment_id: item?.id ? String(item.id) : '',
      maintenance_type: 'routine_service',
      scheduled_date: new Date().toISOString().split('T')[0],
      service_provider: '',
      cost: 0,
      description: '',
      next_service_due_date: '',
      notes: '',
    })
    setIsMaintenanceModalOpen(true)
  }

  const handleSubmitMaintenance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!maintenanceForm.equipment_id || !maintenanceForm.description) {
      setError('Please select Equipment and describe the maintenance work.')
      return
    }

    setActionLoading(true)
    setError(null)
    try {
      await equipmentService.createMaintenanceLog(maintenanceForm)
      setSuccessMessage('Maintenance service scheduled successfully.')
      setIsMaintenanceModalOpen(false)
      loadStats()
      if (activeTab === 'maintenance') loadMaintenance()
      else if (activeTab === 'fleet') loadFleet()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to schedule maintenance')
    } finally {
      setActionLoading(false)
    }
  }

  const handleStartMaintenance = async (log: EquipmentMaintenanceLog) => {
    if (!window.confirm(`Start maintenance for ${log.equipment?.name}? This will mark it Under Maintenance.`)) {
      return
    }
    setActionLoading(true)
    try {
      await equipmentService.startMaintenance(log.uuid)
      setSuccessMessage('Maintenance started. Equipment is now under maintenance.')
      loadMaintenance()
      loadStats()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to start maintenance')
    } finally {
      setActionLoading(false)
    }
  }

  const handleOpenCompleteMaintModal = (log: EquipmentMaintenanceLog) => {
    setSelectedItemForAction(log)
    setCompleteMaintForm({
      completed_date: new Date().toISOString().split('T')[0],
      cost: log.cost || 0,
      parts_replaced: log.parts_replaced || '',
      next_service_due_date: log.next_service_due_date || '',
      notes: log.notes || '',
    })
    setIsCompleteMaintModalOpen(true)
  }

  const handleSubmitCompleteMaint = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItemForAction) return

    setActionLoading(true)
    try {
      await equipmentService.completeMaintenance(selectedItemForAction.uuid, completeMaintForm)
      setSuccessMessage('Maintenance marked as completed. Equipment is now Available.')
      setIsCompleteMaintModalOpen(false)
      loadMaintenance()
      loadStats()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to complete maintenance')
    } finally {
      setActionLoading(false)
    }
  }

  // ==========================================
  // UTILIZATION HANDLERS
  // ==========================================
  const handleOpenUtilizationModal = (item?: Equipment) => {
    setUtilizationForm({
      equipment_id: item?.id ? String(item.id) : '',
      site_id: item?.current_site?.id ? String(item.current_site.id) : (selectedSite || ''),
      project_id: '',
      task_id: '',
      operator_id: item?.assigned_operator?.id ? String(item.assigned_operator.id) : '',
      date: new Date().toISOString().split('T')[0],
      start_meter_reading: 0,
      end_meter_reading: 0,
      hours_operated: 0,
      hourly_rate: item?.hourly_rate ? Number(item.hourly_rate) : 0,
      fuel_litres_used: 0,
      purpose: '',
      notes: '',
    })
    setIsUtilizationModalOpen(true)
  }

  const handleMeterReadingChange = (start: number, end: number) => {
    const hours = end >= start ? Math.round((end - start) * 10) / 10 : 0
    setUtilizationForm((prev) => ({
      ...prev,
      start_meter_reading: start,
      end_meter_reading: end,
      hours_operated: hours > 0 ? hours : prev.hours_operated,
    }))
  }

  const handleSubmitUtilization = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!utilizationForm.equipment_id || !utilizationForm.site_id || !utilizationForm.hours_operated || !utilizationForm.purpose) {
      setError('Please provide Equipment, Site, Operating Hours, and Purpose.')
      return
    }

    setActionLoading(true)
    setError(null)
    try {
      await equipmentService.createUtilizationLog(utilizationForm)
      setSuccessMessage('Operating hours logged successfully. Total machine hours updated.')
      setIsUtilizationModalOpen(false)
      loadStats()
      if (activeTab === 'utilization') loadUtilization()
      else if (activeTab === 'fleet') loadFleet()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to log operating hours')
    } finally {
      setActionLoading(false)
    }
  }

  // Delete Equipment Handler
  const handleDeleteEquipment = async (item: Equipment) => {
    if (!window.confirm(`Are you sure you want to remove ${item.name} (${item.equipment_code}) from the fleet?`)) {
      return
    }
    setActionLoading(true)
    try {
      await equipmentService.deleteEquipment(item.uuid)
      setSuccessMessage(`Equipment ${item.name} deleted successfully.`)
      loadFleet()
      loadStats()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete equipment')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="equipment-container">
      {/* Header */}
      <div className="equipment-header">
        <div className="equipment-title-group">
          <h1>
            <MdPrecisionManufacturing /> Equipment & Machinery
          </h1>
          <p className="equipment-subtitle">
            Manage heavy plant, fleet registry, site dispatches, scheduled maintenance, and operating hours.
          </p>
        </div>
        <div className="equipment-header-actions">
          <button className="btn-secondary" onClick={() => { loadStats(); if (activeTab === 'fleet') loadFleet(); else if (activeTab === 'dispatches') loadDispatches(); else if (activeTab === 'maintenance') loadMaintenance(); else loadUtilization(); }} title="Refresh">
            <MdRefresh /> Refresh
          </button>
          <button className="btn-secondary" onClick={() => handleOpenDispatchModal()} title="Dispatch Machinery">
            <MdLocalShipping /> Dispatch
          </button>
          <button className="btn-secondary" onClick={() => handleOpenUtilizationModal()} title="Log Operating Hours">
            <MdTimer /> Log Hours
          </button>
          <button className="btn-secondary" onClick={() => handleOpenMaintenanceModal()} title="Schedule Maintenance">
            <MdBuild /> Service
          </button>
          <Link to="/equipment/new" className="btn-primary">
            <MdAdd /> Add Machinery
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert-box alert-danger">
          <MdWarning /> {error}
        </div>
      )}
      {successMessage && (
        <div className="alert-box alert-success">
          <MdCheckCircle /> {successMessage}
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="equipment-stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <MdPrecisionManufacturing />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Fleet</span>
            <span className="stat-value">{stats?.total_fleet ?? '-'}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <MdCheckCircle />
          </div>
          <div className="stat-info">
            <span className="stat-label">Available</span>
            <span className="stat-value">{stats?.available ?? '-'}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <MdEngineering />
          </div>
          <div className="stat-info">
            <span className="stat-label">In Use on Sites</span>
            <span className="stat-value">{stats?.in_use ?? '-'}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <MdBuild />
          </div>
          <div className="stat-info">
            <span className="stat-label">Maintenance</span>
            <span className="stat-value">{stats?.under_maintenance ?? '-'}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon red">
            <MdWarning />
          </div>
          <div className="stat-info">
            <span className="stat-label">Service Overdue</span>
            <span className="stat-value">{stats?.service_overdue ?? '-'}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon teal">
            <MdSpeed />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Operating Hours</span>
            <span className="stat-value">
              {stats?.total_operating_hours !== undefined ? `${stats.total_operating_hours} hrs` : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="equipment-tabs">
        <button
          className={`tab-btn ${activeTab === 'fleet' ? 'active' : ''}`}
          onClick={() => handleTabChange('fleet')}
        >
          <MdPrecisionManufacturing /> Fleet Registry
          <span className="tab-badge">{stats?.total_fleet ?? 0}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'dispatches' ? 'active' : ''}`}
          onClick={() => handleTabChange('dispatches')}
        >
          <MdLocalShipping /> Dispatches & Allocations
          <span className="tab-badge">{stats?.active_dispatches_count ?? 0}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'maintenance' ? 'active' : ''}`}
          onClick={() => handleTabChange('maintenance')}
        >
          <MdBuild /> Maintenance & Servicing
          {stats && stats.service_overdue > 0 && (
            <span className="badge-alert" style={{ marginLeft: '4px' }}>
              {stats.service_overdue} Overdue
            </span>
          )}
        </button>

        <button
          className={`tab-btn ${activeTab === 'utilization' ? 'active' : ''}`}
          onClick={() => handleTabChange('utilization')}
        >
          <MdTimer /> Utilization & Operating Hours
        </button>
      </div>

      {/* TAB 1: FLEET REGISTRY */}
      {activeTab === 'fleet' && (
        <div>
          {/* Controls Bar */}
          <div className="equipment-controls-bar">
            <div className="search-input-wrapper">
              <MdSearch className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search by code, name, model, serial, plate..."
                value={fleetSearch}
                onChange={(e) => setFleetSearch(e.target.value)}
              />
            </div>

            <div className="filters-group">
              <select
                className="filter-select"
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
              >
                <option value="">All Sites</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <select
                className="filter-select"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="">All Machinery Types</option>
                <option value="earthmoving">Earthmoving</option>
                <option value="lifting">Lifting</option>
                <option value="concrete">Concrete</option>
                <option value="transport">Transport</option>
                <option value="compaction">Compaction</option>
                <option value="generators">Generators</option>
                <option value="power_tools">Power Tools</option>
                <option value="other">Other</option>
              </select>

              <select
                className="filter-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="available">Available</option>
                <option value="in_use">In Use</option>
                <option value="under_maintenance">Under Maintenance</option>
                <option value="decommissioned">Decommissioned</option>
              </select>

              <select
                className="filter-select"
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
              >
                <option value="">All Conditions</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="needs_repair">Needs Repair</option>
              </select>

              <label className="checkbox-filter-label">
                <input
                  type="checkbox"
                  checked={needsServiceOnly}
                  onChange={(e) => setNeedsServiceOnly(e.target.checked)}
                />
                Needs Service
              </label>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <span>Loading fleet records...</span>
            </div>
          ) : equipmentList.length === 0 ? (
            <div className="empty-state">
              <MdPrecisionManufacturing className="empty-state-icon" />
              <h3>No equipment records found</h3>
              <p>Add machinery to your fleet catalog to start tracking allocations and hours.</p>
              <Link to="/equipment/new" className="btn-primary">
                <MdAdd /> Add First Machine
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code & Machine</th>
                    <th>Type</th>
                    <th>Plate / Serial</th>
                    <th>Current Site</th>
                    <th>Operator</th>
                    <th>Status</th>
                    <th>Condition</th>
                    <th>Total Hours</th>
                    <th>Next Service</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {equipmentList.map((item) => (
                    <tr key={item.uuid}>
                      <td>
                        <div className="table-code">{item.equipment_code}</div>
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                        {item.model_number && <div className="table-subtext">{item.model_number}</div>}
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{item.type.replace('_', ' ')}</td>
                      <td>
                        <div>{item.registration_number || item.serial_number || '-'}</div>
                        <div className="table-subtext" style={{ textTransform: 'capitalize' }}>
                          {item.ownership_type}
                        </div>
                      </td>
                      <td>
                        {item.current_site ? (
                          <span style={{ fontWeight: 500 }}>{item.current_site.name}</span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>Central Yard</span>
                        )}
                      </td>
                      <td>{item.assigned_operator?.name || '-'}</td>
                      <td>
                        <span className={`badge badge-${item.status}`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${item.condition}`}>
                          {item.condition.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{item.total_hours_operated} hrs</td>
                      <td>
                        <div>{item.next_service_due_date || '-'}</div>
                        {item.is_service_overdue && (
                          <span className="badge-alert">Overdue</span>
                        )}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="btn-icon"
                            title="Dispatch to Site"
                            onClick={() => handleOpenDispatchModal(item)}
                          >
                            <MdLocalShipping />
                          </button>
                          <button
                            className="btn-icon"
                            title="Log Operating Hours"
                            onClick={() => handleOpenUtilizationModal(item)}
                          >
                            <MdTimer />
                          </button>
                          <button
                            className="btn-icon"
                            title="Schedule Service"
                            onClick={() => handleOpenMaintenanceModal(item)}
                          >
                            <MdBuild />
                          </button>
                          <Link
                            to={`/equipment/${item.uuid}/edit`}
                            className="btn-icon"
                            title="Edit Equipment"
                          >
                            <MdEdit />
                          </Link>
                          <button
                            className="btn-icon"
                            style={{ color: '#dc2626' }}
                            title="Delete"
                            onClick={() => handleDeleteEquipment(item)}
                          >
                            <MdDelete />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {fleetTotal > 15 && (
            <div className="pagination-container">
              <span className="pagination-info">
                Showing {equipmentList.length} of {fleetTotal} equipment
              </span>
              <div className="pagination-actions">
                <button
                  className="btn-secondary btn-sm"
                  disabled={fleetPage <= 1}
                  onClick={() => setFleetPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  className="btn-secondary btn-sm"
                  disabled={fleetListHasMore(fleetPage, fleetTotal, 15)}
                  onClick={() => setFleetPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DISPATCHES & ALLOCATIONS */}
      {activeTab === 'dispatches' && (
        <div>
          <div className="equipment-controls-bar">
            <div className="search-input-wrapper">
              <MdSearch className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search dispatch number, purpose, site..."
                value={dispatchSearch}
                onChange={(e) => setDispatchSearch(e.target.value)}
              />
            </div>
            <div className="filters-group">
              <select
                className="filter-select"
                value={dispatchStatus}
                onChange={(e) => setDispatchStatus(e.target.value)}
              >
                <option value="">All Dispatch Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_transit">In Transit</option>
                <option value="active_on_site">Active On-Site</option>
                <option value="returned">Returned</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <button className="btn-primary" onClick={() => handleOpenDispatchModal()}>
                <MdAdd /> Create Dispatch
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <span>Loading dispatches...</span>
            </div>
          ) : dispatches.length === 0 ? (
            <div className="empty-state">
              <MdLocalShipping className="empty-state-icon" />
              <h3>No machinery dispatches found</h3>
              <p>Dispatch fleet units to construction sites to track movements and custody.</p>
              <button className="btn-primary" onClick={() => handleOpenDispatchModal()}>
                <MdAdd /> New Site Dispatch
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Dispatch #</th>
                    <th>Equipment</th>
                    <th>Destination Site</th>
                    <th>From Site</th>
                    <th>Operator</th>
                    <th>Dispatched Date</th>
                    <th>Expected Return</th>
                    <th>Status</th>
                    <th>Cost</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dispatches.map((disp) => (
                    <tr key={disp.uuid}>
                      <td className="table-code">{disp.dispatch_number}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{disp.equipment?.name || '-'}</div>
                        <div className="table-subtext">{disp.equipment?.equipment_code}</div>
                      </td>
                      <td style={{ fontWeight: 500 }}>{disp.to_site?.name || '-'}</td>
                      <td>{disp.from_site?.name || 'Central Yard'}</td>
                      <td>{disp.operator?.name || '-'}</td>
                      <td>{disp.dispatched_at ? new Date(disp.dispatched_at).toLocaleDateString() : '-'}</td>
                      <td>{disp.expected_return_date || '-'}</td>
                      <td>
                        <span className={`badge badge-${disp.status}`}>
                          {disp.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>{disp.transport_cost ? formatMoney(disp.transport_cost) : '-'}</td>
                      <td>
                        <div className="table-actions">
                          {disp.status !== 'active_on_site' && disp.status !== 'returned' && disp.status !== 'cancelled' && (
                            <button
                              className="btn-secondary btn-sm"
                              title="Activate On-Site"
                              onClick={() => handleActivateDispatch(disp)}
                            >
                              <MdDoneAll /> Activate
                            </button>
                          )}
                          {disp.status === 'active_on_site' && (
                            <button
                              className="btn-secondary btn-sm"
                              title="Return Machinery"
                              onClick={() => handleOpenReturnModal(disp)}
                            >
                              <MdAssignmentReturn /> Return
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {dispatchTotal > 15 && (
            <div className="pagination-container">
              <span className="pagination-info">
                Showing {dispatches.length} of {dispatchTotal} dispatches
              </span>
              <div className="pagination-actions">
                <button
                  className="btn-secondary btn-sm"
                  disabled={dispatchPage <= 1}
                  onClick={() => setDispatchPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  className="btn-secondary btn-sm"
                  disabled={fleetListHasMore(dispatchPage, dispatchTotal, 15)}
                  onClick={() => setDispatchPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MAINTENANCE & SERVICING */}
      {activeTab === 'maintenance' && (
        <div>
          <div className="equipment-controls-bar">
            <div className="search-input-wrapper">
              <MdSearch className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search maintenance #, description, provider..."
                value={maintenanceSearch}
                onChange={(e) => setMaintenanceSearch(e.target.value)}
              />
            </div>
            <div className="filters-group">
              <select
                className="filter-select"
                value={maintenanceTypeFilter}
                onChange={(e) => setMaintenanceTypeFilter(e.target.value)}
              >
                <option value="">All Maintenance Types</option>
                <option value="routine_service">Routine Service</option>
                <option value="preventative">Preventative</option>
                <option value="breakdown_repair">Breakdown Repair</option>
                <option value="safety_inspection">Safety Inspection</option>
                <option value="oil_change">Oil Change</option>
                <option value="tire_replacement">Tire / Track Replacement</option>
              </select>

              <select
                className="filter-select"
                value={maintenanceStatusFilter}
                onChange={(e) => setMaintenanceStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <button className="btn-primary" onClick={() => handleOpenMaintenanceModal()}>
                <MdAdd /> Schedule Service
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <span>Loading maintenance records...</span>
            </div>
          ) : maintenanceLogs.length === 0 ? (
            <div className="empty-state">
              <MdBuild className="empty-state-icon" />
              <h3>No maintenance records found</h3>
              <p>Schedule servicing or log repairs to keep your machinery fleet operating safely.</p>
              <button className="btn-primary" onClick={() => handleOpenMaintenanceModal()}>
                <MdAdd /> Schedule First Service
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Maintenance #</th>
                    <th>Equipment</th>
                    <th>Type</th>
                    <th>Scheduled Date</th>
                    <th>Completed Date</th>
                    <th>Status</th>
                    <th>Cost</th>
                    <th>Service Provider</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceLogs.map((log) => (
                    <tr key={log.uuid}>
                      <td className="table-code">{log.maintenance_number}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{log.equipment?.name || '-'}</div>
                        <div className="table-subtext">{log.equipment?.equipment_code}</div>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{log.maintenance_type}</td>
                      <td>{log.scheduled_date}</td>
                      <td>{log.completed_date || '-'}</td>
                      <td>
                        <span className={`badge badge-${log.status}`}>
                          {log.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatMoney(log.cost, log.currency)}</td>
                      <td>{log.service_provider || '-'}</td>
                      <td style={{ maxWidth: '200px', whiteSpace: 'normal' }}>{log.description}</td>
                      <td>
                        <div className="table-actions">
                          {log.status === 'scheduled' && (
                            <button
                              className="btn-secondary btn-sm"
                              title="Start Maintenance"
                              onClick={() => handleStartMaintenance(log)}
                            >
                              Start
                            </button>
                          )}
                          {log.status === 'in_progress' && (
                            <button
                              className="btn-primary btn-sm"
                              title="Complete Maintenance"
                              onClick={() => handleOpenCompleteMaintModal(log)}
                            >
                              <MdCheckCircle /> Complete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {maintTotal > 15 && (
            <div className="pagination-container">
              <span className="pagination-info">
                Showing {maintenanceLogs.length} of {maintTotal} service records
              </span>
              <div className="pagination-actions">
                <button
                  className="btn-secondary btn-sm"
                  disabled={maintPage <= 1}
                  onClick={() => setMaintPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  className="btn-secondary btn-sm"
                  disabled={fleetListHasMore(maintPage, maintTotal, 15)}
                  onClick={() => setMaintPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: UTILIZATION & OPERATING HOURS */}
      {activeTab === 'utilization' && (
        <div>
          <div className="equipment-controls-bar">
            <div className="search-input-wrapper">
              <MdSearch className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search log number, purpose, machinery..."
                value={utilizationSearch}
                onChange={(e) => setUtilizationSearch(e.target.value)}
              />
            </div>
            <div className="filters-group">
              <select
                className="filter-select"
                value={utilizationSite}
                onChange={(e) => setUtilizationSite(e.target.value)}
              >
                <option value="">All Sites</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <button className="btn-primary" onClick={() => handleOpenUtilizationModal()}>
                <MdAdd /> Log Operating Hours
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <span>Loading utilization logs...</span>
            </div>
          ) : utilizationLogs.length === 0 ? (
            <div className="empty-state">
              <MdTimer className="empty-state-icon" />
              <h3>No utilization logs recorded</h3>
              <p>Log machine hours, fuel consumption, and project activities daily.</p>
              <button className="btn-primary" onClick={() => handleOpenUtilizationModal()}>
                <MdAdd /> Log Machine Hours
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Log #</th>
                    <th>Date</th>
                    <th>Equipment</th>
                    <th>Site / Project</th>
                    <th>Meter Range</th>
                    <th>Hours</th>
                    <th>Fuel (L)</th>
                    <th>Total Cost</th>
                    <th>Purpose</th>
                    <th>Logged By</th>
                  </tr>
                </thead>
                <tbody>
                  {utilizationLogs.map((u) => (
                    <tr key={u.uuid}>
                      <td className="table-code">{u.log_number}</td>
                      <td>{u.date}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{u.equipment?.name || '-'}</div>
                        <div className="table-subtext">{u.equipment?.equipment_code}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{u.site?.name || '-'}</div>
                        {u.project && <div className="table-subtext">{u.project.name}</div>}
                      </td>
                      <td>
                        {u.start_meter_reading !== null && u.end_meter_reading !== null
                          ? `${u.start_meter_reading} → ${u.end_meter_reading}`
                          : '-'}
                      </td>
                      <td style={{ fontWeight: 700, color: '#059669' }}>{u.hours_operated} hrs</td>
                      <td>{u.fuel_litres_used ? `${u.fuel_litres_used} L` : '-'}</td>
                      <td style={{ fontWeight: 600 }}>{u.total_cost ? formatMoney(u.total_cost) : '-'}</td>
                      <td style={{ maxWidth: '180px', whiteSpace: 'normal' }}>{u.purpose}</td>
                      <td>{u.logged_by?.name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {utilTotal > 15 && (
            <div className="pagination-container">
              <span className="pagination-info">
                Showing {utilizationLogs.length} of {utilTotal} utilization logs
              </span>
              <div className="pagination-actions">
                <button
                  className="btn-secondary btn-sm"
                  disabled={utilPage <= 1}
                  onClick={() => setUtilPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  className="btn-secondary btn-sm"
                  disabled={fleetListHasMore(utilPage, utilTotal, 15)}
                  onClick={() => setUtilPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          MODALS
      ========================================== */}

      {/* 1. DISPATCH MODAL */}
      {isDispatchModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content wide">
            <div className="modal-header">
              <h2>
                <MdLocalShipping /> Dispatch Equipment to Site
              </h2>
              <button className="modal-close-btn" onClick={() => setIsDispatchModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleSubmitDispatch}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>
                      Select Machinery <span className="required">*</span>
                    </label>
                    <select
                      className="form-control"
                      value={dispatchForm.equipment_id}
                      onChange={(e) => {
                        const eqId = e.target.value
                        const eq = equipmentList.find((x) => String(x.id) === eqId)
                        setDispatchForm((prev) => ({
                          ...prev,
                          equipment_id: eqId,
                          from_site_id: eq?.current_site?.id ? String(eq.current_site.id) : '',
                          operator_id: eq?.assigned_operator?.id ? String(eq.assigned_operator.id) : prev.operator_id,
                        }))
                      }}
                      required
                    >
                      <option value="">-- Choose Machinery --</option>
                      {equipmentList.map((eq) => (
                        <option key={eq.id} value={eq.id}>
                          {eq.name} ({eq.equipment_code}) - {eq.status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>
                      Destination Site <span className="required">*</span>
                    </label>
                    <select
                      className="form-control"
                      value={dispatchForm.to_site_id}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, to_site_id: e.target.value })}
                      required
                    >
                      <option value="">-- Choose Destination Site --</option>
                      {sites.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code || s.site_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Origin Site (Optional)</label>
                    <select
                      className="form-control"
                      value={dispatchForm.from_site_id || ''}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, from_site_id: e.target.value })}
                    >
                      <option value="">Central Yard</option>
                      {sites.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Project (Optional)</label>
                    <select
                      className="form-control"
                      value={dispatchForm.project_id || ''}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, project_id: e.target.value })}
                    >
                      <option value="">-- Select Project --</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Assigned Operator (Optional)</label>
                    <select
                      className="form-control"
                      value={dispatchForm.operator_id || ''}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, operator_id: e.target.value })}
                    >
                      <option value="">-- Choose Operator --</option>
                      {users.map((u) => (
                        <option key={u.uuid} value={u.uuid}>
                          {u.name} ({u.roles?.join(', ') || u.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Dispatched Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={dispatchForm.dispatched_at?.split('T')[0] || ''}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, dispatched_at: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Expected Return Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={dispatchForm.expected_return_date || ''}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, expected_return_date: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Transport Cost (UGX)</label>
                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      value={dispatchForm.transport_cost || 0}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, transport_cost: Number(e.target.value) })}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>
                      Dispatch Purpose / Scope <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Foundation earth excavation and trenching"
                      value={dispatchForm.purpose}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, purpose: e.target.value })}
                      required
                    >
                    </input>
                  </div>

                  <div className="form-group full-width">
                    <label>Notes</label>
                    <textarea
                      className="form-control"
                      placeholder="Additional logistical or custody remarks..."
                      value={dispatchForm.notes || ''}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, notes: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsDispatchModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Dispatching...' : 'Confirm Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. RETURN MODAL */}
      {isReturnModalOpen && selectedItemForAction && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>
                <MdAssignmentReturn /> Return Equipment to Yard
              </h2>
              <button className="modal-close-btn" onClick={() => setIsReturnModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleSubmitReturn}>
              <div className="modal-body">
                <p style={{ marginTop: 0 }}>
                  Confirm receipt of <strong>{selectedItemForAction.equipment?.name}</strong> back from site{' '}
                  <strong>{selectedItemForAction.to_site?.name}</strong>. The machine will be set back to Available.
                </p>
                <div className="form-group">
                  <label>Return Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={returnForm.actual_return_date}
                    onChange={(e) => setReturnForm({ ...returnForm, actual_return_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Inspection & Handover Notes</label>
                  <textarea
                    className="form-control"
                    placeholder="Machine condition upon return, meter inspection..."
                    value={returnForm.notes}
                    onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsReturnModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Confirm Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. SCHEDULE MAINTENANCE MODAL */}
      {isMaintenanceModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content wide">
            <div className="modal-header">
              <h2>
                <MdBuild /> Schedule Service & Maintenance
              </h2>
              <button className="modal-close-btn" onClick={() => setIsMaintenanceModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleSubmitMaintenance}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>
                      Machinery <span className="required">*</span>
                    </label>
                    <select
                      className="form-control"
                      value={maintenanceForm.equipment_id}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, equipment_id: e.target.value })}
                      required
                    >
                      <option value="">-- Choose Machinery --</option>
                      {equipmentList.map((eq) => (
                        <option key={eq.id} value={eq.id}>
                          {eq.name} ({eq.equipment_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>
                      Maintenance Type <span className="required">*</span>
                    </label>
                    <select
                      className="form-control"
                      value={maintenanceForm.maintenance_type}
                      onChange={(e) =>
                        setMaintenanceForm({
                          ...maintenanceForm,
                          maintenance_type: e.target.value as MaintenanceType,
                        })
                      }
                      required
                    >
                      <option value="routine_service">Routine Service (250hr / 500hr)</option>
                      <option value="preventative">Preventative Maintenance</option>
                      <option value="breakdown_repair">Breakdown / Emergency Repair</option>
                      <option value="safety_inspection">Safety & Regulatory Inspection</option>
                      <option value="oil_change">Oil & Filter Change</option>
                      <option value="tire_replacement">Tire / Track Replacement</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>
                      Scheduled Date <span className="required">*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={maintenanceForm.scheduled_date}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, scheduled_date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Estimated Cost (UGX)</label>
                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      value={maintenanceForm.cost || 0}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: Number(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Service Provider / Workshop</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Caterpillar Authorized Service Center"
                      value={maintenanceForm.service_provider || ''}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, service_provider: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Next Service Target Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={maintenanceForm.next_service_due_date || ''}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, next_service_due_date: e.target.value })}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>
                      Work Description <span className="required">*</span>
                    </label>
                    <textarea
                      className="form-control"
                      placeholder="Details of maintenance, oil change, hydraulic hoses, filter replacements..."
                      value={maintenanceForm.description}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsMaintenanceModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Scheduling...' : 'Schedule Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. COMPLETE MAINTENANCE MODAL */}
      {isCompleteMaintModalOpen && selectedItemForAction && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>
                <MdDoneAll /> Complete Maintenance Service
              </h2>
              <button className="modal-close-btn" onClick={() => setIsCompleteMaintModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleSubmitCompleteMaint}>
              <div className="modal-body">
                <p style={{ marginTop: 0 }}>
                  Finalize service for <strong>{selectedItemForAction.equipment?.name}</strong>. Machine status will
                  reset to Available and next service due dates will be logged.
                </p>
                <div className="form-group">
                  <label>Completion Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={completeMaintForm.completed_date}
                    onChange={(e) => setCompleteMaintForm({ ...completeMaintForm, completed_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Final Cost (UGX)</label>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    value={completeMaintForm.cost}
                    onChange={(e) => setCompleteMaintForm({ ...completeMaintForm, cost: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Parts Replaced</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Engine oil 15W40, Air filter, Hydraulic seals"
                    value={completeMaintForm.parts_replaced}
                    onChange={(e) => setCompleteMaintForm({ ...completeMaintForm, parts_replaced: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Next Service Due Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={completeMaintForm.next_service_due_date}
                    onChange={(e) => setCompleteMaintForm({ ...completeMaintForm, next_service_due_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Mechanic Notes</label>
                  <textarea
                    className="form-control"
                    placeholder="Post-service engine performance, test run remarks..."
                    value={completeMaintForm.notes}
                    onChange={(e) => setCompleteMaintForm({ ...completeMaintForm, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsCompleteMaintModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Finalizing...' : 'Complete Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. UTILIZATION MODAL */}
      {isUtilizationModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content wide">
            <div className="modal-header">
              <h2>
                <MdTimer /> Log Machinery Operating Hours
              </h2>
              <button className="modal-close-btn" onClick={() => setIsUtilizationModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleSubmitUtilization}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>
                      Machinery <span className="required">*</span>
                    </label>
                    <select
                      className="form-control"
                      value={utilizationForm.equipment_id}
                      onChange={(e) => {
                        const eqId = e.target.value
                        const eq = equipmentList.find((x) => String(x.id) === eqId)
                        setUtilizationForm((prev) => ({
                          ...prev,
                          equipment_id: eqId,
                          site_id: eq?.current_site?.id ? String(eq.current_site.id) : prev.site_id,
                          hourly_rate: eq?.hourly_rate ? Number(eq.hourly_rate) : prev.hourly_rate,
                          operator_id: eq?.assigned_operator?.id ? String(eq.assigned_operator.id) : prev.operator_id,
                        }))
                      }}
                      required
                    >
                      <option value="">-- Choose Machinery --</option>
                      {equipmentList.map((eq) => (
                        <option key={eq.id} value={eq.id}>
                          {eq.name} ({eq.equipment_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>
                      Site <span className="required">*</span>
                    </label>
                    <select
                      className="form-control"
                      value={utilizationForm.site_id}
                      onChange={(e) => setUtilizationForm({ ...utilizationForm, site_id: e.target.value })}
                      required
                    >
                      <option value="">-- Choose Site --</option>
                      {sites.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Project (Optional)</label>
                    <select
                      className="form-control"
                      value={utilizationForm.project_id || ''}
                      onChange={(e) => setUtilizationForm({ ...utilizationForm, project_id: e.target.value })}
                    >
                      <option value="">-- Select Project --</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Task / Milestone (Optional)</label>
                    <select
                      className="form-control"
                      value={utilizationForm.task_id || ''}
                      onChange={(e) => setUtilizationForm({ ...utilizationForm, task_id: e.target.value })}
                    >
                      <option value="">-- Select Task --</option>
                      {tasks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title} ({t.task_number})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Date Operated</label>
                    <input
                      type="date"
                      className="form-control"
                      value={utilizationForm.date}
                      onChange={(e) => setUtilizationForm({ ...utilizationForm, date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Operator</label>
                    <select
                      className="form-control"
                      value={utilizationForm.operator_id || ''}
                      onChange={(e) => setUtilizationForm({ ...utilizationForm, operator_id: e.target.value })}
                    >
                      <option value="">-- Choose Operator --</option>
                      {users.map((u) => (
                        <option key={u.uuid} value={u.uuid}>
                          {u.name} ({u.roles?.join(', ') || u.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Start Hour Meter</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={utilizationForm.start_meter_reading || 0}
                      onChange={(e) =>
                        handleMeterReadingChange(
                          Number(e.target.value),
                          utilizationForm.end_meter_reading || 0
                        )
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>End Hour Meter</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={utilizationForm.end_meter_reading || 0}
                      onChange={(e) =>
                        handleMeterReadingChange(
                          utilizationForm.start_meter_reading || 0,
                          Number(e.target.value)
                        )
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Hours Operated <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      className="form-control"
                      value={utilizationForm.hours_operated || 0}
                      onChange={(e) =>
                        setUtilizationForm({ ...utilizationForm, hours_operated: Number(e.target.value) })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Fuel Used (Litres)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      className="form-control"
                      value={utilizationForm.fuel_litres_used || 0}
                      onChange={(e) =>
                        setUtilizationForm({ ...utilizationForm, fuel_litres_used: Number(e.target.value) })
                      }
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>
                      Operation Purpose <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Block A pad footing foundation compaction"
                      value={utilizationForm.purpose}
                      onChange={(e) => setUtilizationForm({ ...utilizationForm, purpose: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Notes</label>
                    <textarea
                      className="form-control"
                      placeholder="Weather delays, idle hours, machine performance observations..."
                      value={utilizationForm.notes || ''}
                      onChange={(e) => setUtilizationForm({ ...utilizationForm, notes: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsUtilizationModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Logging...' : 'Log Operating Hours'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function fleetListHasMore(page: number, total: number, perPage: number) {
  return page * perPage >= total
}

export default EquipmentList
