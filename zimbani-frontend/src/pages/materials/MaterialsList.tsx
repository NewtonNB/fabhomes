import React, { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  MdSearch,
  MdAdd,
  MdRefresh,
  MdInventory2,
  MdWarning,
  MdCheckCircle,
  MdCancel,
  MdLocalShipping,
  MdEdit,
  MdDelete,
  MdTune,
  MdHistoryEdu,
  MdPostAdd,
  MdClose,
  MdTrendingDown,
  MdHourglassTop,
} from 'react-icons/md'
import {
  Material,
  MaterialRequisition,
  MaterialUsage,
  MaterialStatistics,
  MaterialStatus,
  RequisitionStatus,
  RequisitionPriority,
  RequisitionItem,
} from '../../types/material.types'
import { Site } from '../../types/site.types'
import { Project } from '../../types/project.types'
import { Task } from '../../types/task.types'
import materialService from '../../services/material.service'
import { siteService } from '../../services/site.service'
import { projectService } from '../../services/project.service'
import taskService from '../../services/task.service'
import './MaterialsList.css'

export const MaterialsList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialSiteId = searchParams.get('site_id') || ''
  const activeTabParam = (searchParams.get('tab') as 'inventory' | 'requisitions' | 'usages') || 'inventory'

  // Tabs
  const [activeTab, setActiveTab] = useState<'inventory' | 'requisitions' | 'usages'>(activeTabParam)

  // Data states
  const [materials, setMaterials] = useState<Material[]>([])
  const [requisitions, setRequisitions] = useState<MaterialRequisition[]>([])
  const [usages, setUsages] = useState<MaterialUsage[]>([])
  const [stats, setStats] = useState<MaterialStatistics | null>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])

  // Loading & Error
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<boolean>(false)

  // Filters - Inventory
  const [inventorySearch, setInventorySearch] = useState<string>('')
  const [selectedSite, setSelectedSite] = useState<string>(initialSiteId)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [lowStockOnly, setLowStockOnly] = useState<boolean>(false)

  // Filters - Requisitions
  const [reqSearch, setReqSearch] = useState<string>('')
  const [reqStatus, setReqStatus] = useState<string>('')
  const [reqPriority, setReqPriority] = useState<string>('')

  // Filters - Usages
  const [usageSearch, setUsageSearch] = useState<string>('')

  // Modals state
  const [adjustModalMaterial, setAdjustModalMaterial] = useState<Material | null>(null)
  const [adjustDelta, setAdjustDelta] = useState<number>(0)
  const [adjustReason, setAdjustReason] = useState<string>('')

  // Usage Modal
  const [showUsageModal, setShowUsageModal] = useState<boolean>(false)
  const [usageForm, setUsageForm] = useState({
    material_id: '',
    site_id: selectedSite,
    project_id: '',
    task_id: '',
    quantity_used: '',
    purpose: '',
    used_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  // Requisition Modal
  const [showReqModal, setShowReqModal] = useState<boolean>(false)
  const [reqForm, setReqForm] = useState({
    site_id: selectedSite,
    project_id: '',
    priority: 'medium' as RequisitionPriority,
    required_by_date: '',
    notes: '',
    items: [
      { material_name: '', unit_of_measure: 'units', quantity: 1, estimated_unit_cost: 0 },
    ] as RequisitionItem[],
  })

  // Rejection modal
  const [rejectingReq, setRejectingReq] = useState<MaterialRequisition | null>(null)
  const [rejectionReason, setRejectionReason] = useState<string>('')

  // Fetch lookups (sites, projects) once
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [sitesRes, projectsRes] = await Promise.all([
          siteService.getSites({ per_page: 100 }),
          projectService.getProjects({ per_page: 100 }),
        ])
        const sList = (sitesRes as any)?.data || []
        const pList = (projectsRes as any)?.data || []
        setSites(Array.isArray(sList) ? sList : [])
        setProjects(Array.isArray(pList) ? pList : [])
      } catch (e) {
        console.warn('Could not load sites/projects lookups:', e)
      }
    }
    fetchLookups()
  }, [])

  // Sync tab with URL
  const handleTabChange = (tab: 'inventory' | 'requisitions' | 'usages') => {
    setActiveTab(tab)
    const newParams = new URLSearchParams(searchParams)
    newParams.set('tab', tab)
    setSearchParams(newParams)
  }

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    try {
      const data = await materialService.getMaterialStatistics(selectedSite || undefined)
      setStats(data)
    } catch (e) {
      console.warn('Failed to load material statistics:', e)
    }
  }, [selectedSite])

  // Fetch Inventory
  const fetchMaterials = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await materialService.getMaterials({
        site_id: selectedSite || undefined,
        category: selectedCategory || undefined,
        status: (selectedStatus as MaterialStatus) || undefined,
        low_stock_only: lowStockOnly || undefined,
        search: inventorySearch || undefined,
        per_page: 50,
      })
      setMaterials(res.data || [])
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load materials')
    } finally {
      setLoading(false)
    }
  }, [selectedSite, selectedCategory, selectedStatus, lowStockOnly, inventorySearch])

  // Fetch Requisitions
  const fetchRequisitions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await materialService.getRequisitions({
        site_id: selectedSite || undefined,
        status: (reqStatus as RequisitionStatus) || undefined,
        priority: (reqPriority as RequisitionPriority) || undefined,
        search: reqSearch || undefined,
        per_page: 50,
      })
      setRequisitions(res.data || [])
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load requisitions')
    } finally {
      setLoading(false)
    }
  }, [selectedSite, reqStatus, reqPriority, reqSearch])

  // Fetch Usages
  const fetchUsages = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await materialService.getUsages({
        site_id: selectedSite || undefined,
        search: usageSearch || undefined,
        per_page: 50,
      })
      setUsages(res.data || [])
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load material usages')
    } finally {
      setLoading(false)
    }
  }, [selectedSite, usageSearch])

  // Refresh active tab
  const refreshActiveTab = () => {
    fetchStats()
    if (activeTab === 'inventory') fetchMaterials()
    if (activeTab === 'requisitions') fetchRequisitions()
    if (activeTab === 'usages') fetchUsages()
  }

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    if (activeTab === 'inventory') fetchMaterials()
    if (activeTab === 'requisitions') fetchRequisitions()
    if (activeTab === 'usages') fetchUsages()
  }, [activeTab, fetchMaterials, fetchRequisitions, fetchUsages])

  // Load tasks for usage modal when site/project changes
  useEffect(() => {
    if (usageForm.project_id || usageForm.site_id) {
      taskService.getTasks({
        project_id: usageForm.project_id || undefined,
        site_id: usageForm.site_id || undefined,
        per_page: 50,
      }).then((res) => {
        const rawList = (res as any)?.data?.data || (res as any)?.data || []
        setTasks(Array.isArray(rawList) ? rawList : [])
      }).catch(() => setTasks([]))
    }
  }, [usageForm.project_id, usageForm.site_id])

  // Format currency
  const formatMoney = (val?: number | null, curr = 'UGX') => {
    if (val === undefined || val === null || isNaN(val)) return '0 ' + curr
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: curr,
      maximumFractionDigits: 0,
    }).format(val)
  }

  // Handle Stock Adjustment
  const handleStockAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adjustModalMaterial || adjustDelta === 0) return
    if (!adjustReason.trim()) {
      alert('Please enter a reason for stock adjustment')
      return
    }

    try {
      setActionLoading(true)
      await materialService.adjustStock(adjustModalMaterial.uuid, {
        quantity_delta: adjustDelta,
        reason: adjustReason,
      })
      setAdjustModalMaterial(null)
      setAdjustDelta(0)
      setAdjustReason('')
      fetchMaterials()
      fetchStats()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to adjust stock')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Delete Material
  const handleDeleteMaterial = async (mat: Material) => {
    if (!window.confirm(`Are you sure you want to delete material "${mat.name}"?`)) return
    try {
      await materialService.deleteMaterial(mat.uuid)
      fetchMaterials()
      fetchStats()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete material')
    }
  }

  // Requisitions Handlers
  const handleApproveReq = async (req: MaterialRequisition) => {
    if (!window.confirm(`Approve requisition ${req.requisition_number}?`)) return
    try {
      setActionLoading(true)
      await materialService.approveRequisition(req.uuid)
      fetchRequisitions()
      fetchStats()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to approve requisition')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeliverReq = async (req: MaterialRequisition) => {
    if (!window.confirm(`Mark requisition ${req.requisition_number} as delivered? This will automatically restock items in the site inventory.`)) return
    try {
      setActionLoading(true)
      await materialService.deliverRequisition(req.uuid)
      fetchRequisitions()
      fetchMaterials()
      fetchStats()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to deliver requisition')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectReqSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectingReq || !rejectionReason.trim()) return
    try {
      setActionLoading(true)
      await materialService.rejectRequisition(rejectingReq.uuid, rejectionReason)
      setRejectingReq(null)
      setRejectionReason('')
      fetchRequisitions()
      fetchStats()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to reject requisition')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Create Usage
  const handleUsageSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usageForm.material_id || !usageForm.site_id || !usageForm.quantity_used || !usageForm.purpose) {
      alert('Please fill in all required fields.')
      return
    }

    try {
      setActionLoading(true)
      await materialService.createUsage({
        material_id: usageForm.material_id,
        site_id: usageForm.site_id,
        project_id: usageForm.project_id || null,
        task_id: usageForm.task_id || null,
        quantity_used: parseFloat(usageForm.quantity_used),
        purpose: usageForm.purpose,
        used_date: usageForm.used_date,
        notes: usageForm.notes || null,
      })
      setShowUsageModal(false)
      setUsageForm({
        material_id: '',
        site_id: selectedSite,
        project_id: '',
        task_id: '',
        quantity_used: '',
        purpose: '',
        used_date: new Date().toISOString().split('T')[0],
        notes: '',
      })
      if (activeTab === 'usages') fetchUsages()
      if (activeTab === 'inventory') fetchMaterials()
      fetchStats()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to record usage')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Delete Usage
  const handleDeleteUsage = async (usage: MaterialUsage) => {
    if (!window.confirm(`Cancel usage record #${usage.usage_number}? This will restore ${usage.quantity_used} ${usage.unit_of_measure} back to inventory stock.`)) return
    try {
      setActionLoading(true)
      await materialService.deleteUsage(usage.uuid)
      fetchUsages()
      fetchMaterials()
      fetchStats()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete usage record')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Create Requisition Submit
  const handleRequisitionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reqForm.site_id) {
      alert('Please select a site.')
      return
    }
    if (!reqForm.items.length || !reqForm.items.some((i) => i.material_name.trim() && i.quantity > 0)) {
      alert('Please add at least one valid material line item.')
      return
    }

    try {
      setActionLoading(true)
      await materialService.createRequisition({
        site_id: reqForm.site_id,
        project_id: reqForm.project_id || null,
        priority: reqForm.priority,
        required_by_date: reqForm.required_by_date || null,
        notes: reqForm.notes || null,
        items: reqForm.items.filter((i) => i.material_name.trim() && i.quantity > 0),
      })
      setShowReqModal(false)
      setReqForm({
        site_id: selectedSite,
        project_id: '',
        priority: 'medium',
        required_by_date: '',
        notes: '',
        items: [{ material_name: '', unit_of_measure: 'units', quantity: 1, estimated_unit_cost: 0 }],
      })
      fetchRequisitions()
      fetchStats()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to submit requisition')
    } finally {
      setActionLoading(false)
    }
  }

  const addReqItem = () => {
    setReqForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { material_name: '', unit_of_measure: 'units', quantity: 1, estimated_unit_cost: 0 },
      ],
    }))
  }

  const removeReqItem = (index: number) => {
    if (reqForm.items.length <= 1) return
    setReqForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }))
  }

  return (
    <div className="materials-container">
      {/* Header */}
      <div className="materials-header">
        <div className="materials-title-group">
          <h1>
            <MdInventory2 style={{ color: '#2563eb' }} />
            Materials & Inventory Tracking
          </h1>
          <p className="materials-subtitle">
            Site catalog, real-time stock levels, requisitions approvals, and material consumption tracking
          </p>
        </div>
        <div className="materials-header-actions">
          <button className="btn btn-secondary" onClick={refreshActiveTab} title="Refresh">
            <MdRefresh /> Refresh
          </button>
          <button className="btn btn-outline-primary" onClick={() => setShowUsageModal(true)}>
            <MdHistoryEdu /> Log Usage
          </button>
          <button className="btn btn-outline-primary" onClick={() => setShowReqModal(true)}>
            <MdPostAdd /> New Requisition
          </button>
          <Link to="/materials/new" className="btn btn-primary">
            <MdAdd /> Add Material
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      {stats && (
        <div className="materials-stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">
              <MdInventory2 />
            </div>
            <div className="stat-info">
              <span className="stat-label">Catalog Items</span>
              <span className="stat-value">{stats.total_items}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">
              <MdCheckCircle />
            </div>
            <div className="stat-info">
              <span className="stat-label">In-Stock</span>
              <span className="stat-value">{stats.in_stock}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon yellow">
              <MdWarning />
            </div>
            <div className="stat-info">
              <span className="stat-label">Low Stock</span>
              <span className="stat-value">{stats.low_stock}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red">
              <MdTrendingDown />
            </div>
            <div className="stat-info">
              <span className="stat-label">Out of Stock</span>
              <span className="stat-value">{stats.out_of_stock}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple">
              <MdHourglassTop />
            </div>
            <div className="stat-info">
              <span className="stat-label">Total Valuation</span>
              <span className="stat-value" style={{ fontSize: '1.15rem' }}>
                {formatMoney(stats.total_valuation, stats.currency)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="error-alert">
          <span>{error}</span>
          <button className="btn-icon" onClick={() => setError(null)}>
            <MdClose />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="materials-tabs">
        <button
          className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => handleTabChange('inventory')}
        >
          <MdInventory2 /> Catalog & Inventory
          {stats && <span className="tab-badge">{stats.total_items}</span>}
        </button>
        <button
          className={`tab-btn ${activeTab === 'requisitions' ? 'active' : ''}`}
          onClick={() => handleTabChange('requisitions')}
        >
          <MdPostAdd /> Site Requisitions
          {stats?.pending_requisitions_count ? (
            <span className="tab-badge" style={{ background: '#fef3c7', color: '#b45309' }}>
              {stats.pending_requisitions_count} pending
            </span>
          ) : null}
        </button>
        <button
          className={`tab-btn ${activeTab === 'usages' ? 'active' : ''}`}
          onClick={() => handleTabChange('usages')}
        >
          <MdHistoryEdu /> Consumption Logs
        </button>
      </div>

      {/* TAB 1: INVENTORY */}
      {activeTab === 'inventory' && (
        <>
          <div className="filter-bar">
            <div className="search-box">
              <MdSearch />
              <input
                type="text"
                className="search-input"
                placeholder="Search material code, name, supplier..."
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
              />
            </div>

            <select
              className="filter-select"
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
            >
              <option value="">All Sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="cement">Cement</option>
              <option value="steel">Steel</option>
              <option value="aggregates">Aggregates</option>
              <option value="timber">Timber</option>
              <option value="plumbing">Plumbing</option>
              <option value="electrical">Electrical</option>
              <option value="finishing">Finishing</option>
              <option value="masonry">Masonry</option>
              <option value="tools">Tools</option>
              <option value="paint">Paint</option>
              <option value="other">Other</option>
            </select>

            <select
              className="filter-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => setLowStockOnly(e.target.checked)}
              />
              Low Stock Only
            </label>
          </div>

          <div className="table-card">
            {loading ? (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading inventory...</p>
              </div>
            ) : materials.length === 0 ? (
              <div className="empty-state">
                <MdInventory2 className="empty-icon" />
                <h3>No materials found</h3>
                <p>Try adjusting your search filters or create a new material entry.</p>
                <Link to="/materials/new" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                  <MdAdd /> Add Material
                </Link>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="materials-table">
                  <thead>
                    <tr>
                      <th>Code & Name</th>
                      <th>Category</th>
                      <th>Site / Location</th>
                      <th>Stock Level</th>
                      <th>Unit Cost</th>
                      <th>Total Value</th>
                      <th>Status</th>
                      <th>Supplier</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((mat) => {
                      const maxStock = Math.max(mat.current_stock, mat.minimum_stock_level * 2, 1)
                      const stockPct = Math.min(100, Math.round((mat.current_stock / maxStock) * 100))
                      const barColor =
                        mat.status === 'out_of_stock'
                          ? 'red'
                          : mat.status === 'low_stock'
                          ? 'yellow'
                          : 'green'

                      return (
                        <tr key={mat.id}>
                          <td>
                            <div>
                              <strong style={{ display: 'block', color: '#0f172a' }}>{mat.name}</strong>
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{mat.material_code}</span>
                            </div>
                          </td>
                          <td>
                            <span className="category-tag">{mat.category}</span>
                          </td>
                          <td>
                            <div>
                              <strong>{mat.site?.name || 'Central Warehouse'}</strong>
                              {mat.storage_location && (
                                <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>
                                  Loc: {mat.storage_location}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="stock-cell">
                              <span className="stock-numbers">
                                {mat.current_stock} {mat.unit_of_measure}
                              </span>
                              <div className="stock-bar-container">
                                <div
                                  className={`stock-bar ${barColor}`}
                                  style={{ width: `${stockPct}%` }}
                                ></div>
                              </div>
                              <span className="stock-min-hint">Min: {mat.minimum_stock_level} {mat.unit_of_measure}</span>
                            </div>
                          </td>
                          <td>{formatMoney(mat.unit_cost, mat.currency)}</td>
                          <td>
                            <strong>{formatMoney(mat.total_valuation, mat.currency)}</strong>
                          </td>
                          <td>
                            <span className={`status-badge ${mat.status}`}>
                              {mat.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td>
                            <div>
                              <span>{mat.supplier_name || '—'}</span>
                              {mat.supplier_contact && (
                                <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>
                                  {mat.supplier_contact}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="table-actions">
                              <button
                                className="btn btn-secondary btn-sm"
                                title="Adjust Stock"
                                onClick={() => {
                                  setAdjustModalMaterial(mat)
                                  setAdjustDelta(0)
                                  setAdjustReason('')
                                }}
                              >
                                <MdTune /> Adjust
                              </button>
                              <Link
                                to={`/materials/${mat.uuid}/edit`}
                                className="btn-icon"
                                title="Edit Material"
                              >
                                <MdEdit />
                              </Link>
                              <button
                                className="btn-icon delete"
                                title="Delete"
                                onClick={() => handleDeleteMaterial(mat)}
                              >
                                <MdDelete />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB 2: REQUISITIONS */}
      {activeTab === 'requisitions' && (
        <>
          <div className="filter-bar">
            <div className="search-box">
              <MdSearch />
              <input
                type="text"
                className="search-input"
                placeholder="Search requisition number, notes..."
                value={reqSearch}
                onChange={(e) => setReqSearch(e.target.value)}
              />
            </div>

            <select
              className="filter-select"
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
            >
              <option value="">All Sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={reqStatus}
              onChange={(e) => setReqStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="delivered">Delivered</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              className="filter-select"
              value={reqPriority}
              onChange={(e) => setReqPriority(e.target.value)}
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="table-card">
            {loading ? (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading requisitions...</p>
              </div>
            ) : requisitions.length === 0 ? (
              <div className="empty-state">
                <MdPostAdd className="empty-icon" />
                <h3>No requisitions found</h3>
                <p>Create a requisition to request site materials and initiate approvals.</p>
                <button
                  className="btn btn-primary"
                  style={{ marginTop: '1rem' }}
                  onClick={() => setShowReqModal(true)}
                >
                  <MdPostAdd /> Create Requisition
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="materials-table">
                  <thead>
                    <tr>
                      <th>Req Number</th>
                      <th>Site / Project</th>
                      <th>Items Requested</th>
                      <th>Est. Cost</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Requested By</th>
                      <th>Required By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requisitions.map((req) => (
                      <tr key={req.id}>
                        <td>
                          <strong>{req.requisition_number}</strong>
                          <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>
                            {new Date(req.created_at).toLocaleDateString()}
                          </span>
                        </td>
                        <td>
                          <strong>{req.site?.name || '—'}</strong>
                          {req.project && (
                            <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>
                              Project: {req.project.name}
                            </span>
                          )}
                        </td>
                        <td>
                          <div>
                            <span style={{ fontWeight: 600 }}>{req.items_count} items</span>
                            <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.2rem' }}>
                              {req.items.slice(0, 2).map((item, idx) => (
                                <div key={idx}>
                                  • {item.quantity} {item.unit_of_measure} {item.material_name}
                                </div>
                              ))}
                              {req.items.length > 2 && (
                                <span style={{ color: '#94a3b8' }}>+{req.items.length - 2} more...</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <strong>{formatMoney(req.total_estimated_cost, req.currency)}</strong>
                        </td>
                        <td>
                          <span className={`priority-badge ${req.priority}`}>{req.priority}</span>
                        </td>
                        <td>
                          <span className={`status-badge ${req.status}`}>
                            {req.status.replace('_', ' ')}
                          </span>
                          {req.rejection_reason && (
                            <span style={{ display: 'block', fontSize: '0.7rem', color: '#dc2626' }}>
                              Reason: {req.rejection_reason}
                            </span>
                          )}
                        </td>
                        <td>{req.requested_by?.name || '—'}</td>
                        <td>{req.required_by_date || 'Not set'}</td>
                        <td>
                          <div className="table-actions">
                            {req.status === 'pending_approval' && (
                              <>
                                <button
                                  className="btn btn-success btn-sm"
                                  title="Approve"
                                  disabled={actionLoading}
                                  onClick={() => handleApproveReq(req)}
                                >
                                  <MdCheckCircle /> Approve
                                </button>
                                <button
                                  className="btn btn-danger btn-sm"
                                  title="Reject"
                                  disabled={actionLoading}
                                  onClick={() => {
                                    setRejectingReq(req)
                                    setRejectionReason('')
                                  }}
                                >
                                  <MdCancel /> Reject
                                </button>
                              </>
                            )}
                            {req.status === 'approved' && (
                              <button
                                className="btn btn-primary btn-sm"
                                title="Mark Delivered & Restock Inventory"
                                disabled={actionLoading}
                                onClick={() => handleDeliverReq(req)}
                              >
                                <MdLocalShipping /> Deliver & Restock
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
          </div>
        </>
      )}

      {/* TAB 3: CONSUMPTION LOGS */}
      {activeTab === 'usages' && (
        <>
          <div className="filter-bar">
            <div className="search-box">
              <MdSearch />
              <input
                type="text"
                className="search-input"
                placeholder="Search usage number, purpose, material..."
                value={usageSearch}
                onChange={(e) => setUsageSearch(e.target.value)}
              />
            </div>

            <select
              className="filter-select"
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
            >
              <option value="">All Sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div className="table-card">
            {loading ? (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading consumption logs...</p>
              </div>
            ) : usages.length === 0 ? (
              <div className="empty-state">
                <MdHistoryEdu className="empty-icon" />
                <h3>No consumption logs</h3>
                <p>Log materials consumed on sites or assigned to tasks and milestones.</p>
                <button
                  className="btn btn-primary"
                  style={{ marginTop: '1rem' }}
                  onClick={() => setShowUsageModal(true)}
                >
                  <MdHistoryEdu /> Log Usage
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="materials-table">
                  <thead>
                    <tr>
                      <th>Log Number</th>
                      <th>Material</th>
                      <th>Quantity Consumed</th>
                      <th>Total Cost</th>
                      <th>Site & Allocation</th>
                      <th>Purpose</th>
                      <th>Date</th>
                      <th>Logged By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usages.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <strong>{u.usage_number}</strong>
                        </td>
                        <td>
                          <strong>{u.material?.name || '—'}</strong>
                          <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>
                            {u.material?.material_code}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: '#dc2626' }}>
                            - {u.quantity_used} {u.unit_of_measure}
                          </span>
                        </td>
                        <td>
                          <strong>{formatMoney(u.total_cost)}</strong>
                        </td>
                        <td>
                          <strong>{u.site?.name || '—'}</strong>
                          {u.task && (
                            <span style={{ display: 'block', fontSize: '0.75rem', color: '#2563eb' }}>
                              Task: {u.task.task_number} - {u.task.title}
                            </span>
                          )}
                          {u.unit && (
                            <span style={{ display: 'block', fontSize: '0.75rem', color: '#475569' }}>
                              Unit: {u.unit.unit_number}
                            </span>
                          )}
                        </td>
                        <td>{u.purpose}</td>
                        <td>{u.used_date}</td>
                        <td>{u.logged_by?.name || '—'}</td>
                        <td>
                          <button
                            className="btn-icon delete"
                            title="Cancel Usage & Restore Stock"
                            onClick={() => handleDeleteUsage(u)}
                          >
                            <MdDelete />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* MODAL 1: ADJUST STOCK */}
      {adjustModalMaterial && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 className="modal-title">Adjust Inventory Stock</h3>
              <button
                className="modal-close-btn"
                onClick={() => setAdjustModalMaterial(null)}
              >
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleStockAdjustmentSubmit}>
              <div className="modal-body">
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                  <strong>{adjustModalMaterial.name}</strong> ({adjustModalMaterial.material_code})
                  <div style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: '#475569' }}>
                    Current Stock: <strong>{adjustModalMaterial.current_stock} {adjustModalMaterial.unit_of_measure}</strong>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Stock Quantity Delta (+ to add stock, - to subtract)
                  </label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    value={adjustDelta}
                    onChange={(e) => setAdjustDelta(parseFloat(e.target.value) || 0)}
                    required
                  />
                  <div className="form-help">
                    Resulting stock:{' '}
                    <strong>
                      {Math.max(0, (adjustModalMaterial.current_stock || 0) + adjustDelta)}{' '}
                      {adjustModalMaterial.unit_of_measure}
                    </strong>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Reason for Adjustment *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Received new shipment, Damaged goods write-off, Audit correction"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setAdjustModalMaterial(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading || adjustDelta === 0 || !adjustReason.trim()}
                >
                  {actionLoading ? 'Saving...' : 'Apply Stock Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LOG CONSUMPTION */}
      {showUsageModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 className="modal-title">Record Material Consumption</h3>
              <button className="modal-close-btn" onClick={() => setShowUsageModal(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleUsageSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Site *</label>
                  <select
                    className="form-select"
                    value={usageForm.site_id}
                    onChange={(e) => setUsageForm({ ...usageForm, site_id: e.target.value })}
                    required
                  >
                    <option value="">Select Site</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Material *</label>
                  <select
                    className="form-select"
                    value={usageForm.material_id}
                    onChange={(e) => setUsageForm({ ...usageForm, material_id: e.target.value })}
                    required
                  >
                    <option value="">Select Material from Inventory</option>
                    {materials
                      .filter((m) => !usageForm.site_id || String(m.site?.id) === String(usageForm.site_id))
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} (Stock: {m.current_stock} {m.unit_of_measure})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Quantity Consumed *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="form-input"
                    value={usageForm.quantity_used}
                    onChange={(e) => setUsageForm({ ...usageForm, quantity_used: e.target.value })}
                    placeholder="Enter quantity"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Linked Project (Optional)</label>
                  <select
                    className="form-select"
                    value={usageForm.project_id}
                    onChange={(e) => setUsageForm({ ...usageForm, project_id: e.target.value })}
                  >
                    <option value="">None</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Linked Task (Optional)</label>
                  <select
                    className="form-select"
                    value={usageForm.task_id}
                    onChange={(e) => setUsageForm({ ...usageForm, task_id: e.target.value })}
                  >
                    <option value="">None</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.task_number}: {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Purpose / Description *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Foundation concrete casting Phase 1"
                    value={usageForm.purpose}
                    onChange={(e) => setUsageForm({ ...usageForm, purpose: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Consumption Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={usageForm.used_date}
                    onChange={(e) => setUsageForm({ ...usageForm, used_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowUsageModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Recording...' : 'Record Consumption'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: NEW REQUISITION */}
      {showReqModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog large">
            <div className="modal-header">
              <h3 className="modal-title">Create Site Material Requisition</h3>
              <button className="modal-close-btn" onClick={() => setShowReqModal(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleRequisitionSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Site *</label>
                    <select
                      className="form-select"
                      value={reqForm.site_id}
                      onChange={(e) => setReqForm({ ...reqForm, site_id: e.target.value })}
                      required
                    >
                      <option value="">Select Destination Site</option>
                      {sites.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Project (Optional)</label>
                    <select
                      className="form-select"
                      value={reqForm.project_id}
                      onChange={(e) => setReqForm({ ...reqForm, project_id: e.target.value })}
                    >
                      <option value="">None</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select
                      className="form-select"
                      value={reqForm.priority}
                      onChange={(e) =>
                        setReqForm({ ...reqForm, priority: e.target.value as RequisitionPriority })
                      }
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Required By Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={reqForm.required_by_date}
                      onChange={(e) => setReqForm({ ...reqForm, required_by_date: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ margin: '1rem 0 0.5rem 0', fontWeight: 600, color: '#1e293b' }}>
                  Requested Line Items
                </div>

                {reqForm.items.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr 1.5fr auto',
                      gap: '0.5rem',
                      alignItems: 'center',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Material item name"
                      value={item.material_name}
                      onChange={(e) => {
                        const next = [...reqForm.items]
                        next[index].material_name = e.target.value
                        setReqForm({ ...reqForm, items: next })
                      }}
                      required
                    />
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      className="form-input"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => {
                        const next = [...reqForm.items]
                        next[index].quantity = parseFloat(e.target.value) || 0
                        setReqForm({ ...reqForm, items: next })
                      }}
                      required
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Unit (bags/kg)"
                      value={item.unit_of_measure}
                      onChange={(e) => {
                        const next = [...reqForm.items]
                        next[index].unit_of_measure = e.target.value
                        setReqForm({ ...reqForm, items: next })
                      }}
                      required
                    />
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="form-input"
                      placeholder="Est Unit Cost"
                      value={item.estimated_unit_cost || ''}
                      onChange={(e) => {
                        const next = [...reqForm.items]
                        next[index].estimated_unit_cost = parseFloat(e.target.value) || 0
                        setReqForm({ ...reqForm, items: next })
                      }}
                    />
                    <button
                      type="button"
                      className="btn-icon delete"
                      title="Remove Item"
                      onClick={() => removeReqItem(index)}
                      disabled={reqForm.items.length <= 1}
                    >
                      <MdDelete />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={addReqItem}
                  style={{ marginTop: '0.5rem' }}
                >
                  <MdAdd /> Add Another Item
                </button>

                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Requisition Notes</label>
                  <textarea
                    rows={2}
                    className="form-textarea"
                    placeholder="Provide any instructions, delivery location details, or vendor preferences..."
                    value={reqForm.notes}
                    onChange={(e) => setReqForm({ ...reqForm, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowReqModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Submitting...' : 'Submit Requisition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: REJECTION PROMPT */}
      {rejectingReq && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 className="modal-title">Reject Requisition</h3>
              <button className="modal-close-btn" onClick={() => setRejectingReq(null)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleRejectReqSubmit}>
              <div className="modal-body">
                <p>
                  Rejecting requisition <strong>{rejectingReq.requisition_number}</strong>. Please provide a clear explanation for the requester:
                </p>
                <div className="form-group">
                  <label className="form-label">Rejection Reason *</label>
                  <textarea
                    rows={3}
                    className="form-textarea"
                    placeholder="e.g. Budget exceeded for this milestone, items already on site in storage..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setRejectingReq(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={actionLoading || !rejectionReason.trim()}
                >
                  {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default MaterialsList
