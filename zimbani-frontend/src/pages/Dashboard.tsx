import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { 
  MdFolder, 
  MdConstruction, 
  MdHome, 
  MdReceipt, 
  MdRefresh, 
  MdAdd, 
  MdPersonAdd, 
  MdSecurity, 
  MdHistory,
  MdArrowForward,
  MdDescription
} from 'react-icons/md'
import { useAuth } from '../contexts/AuthContext'
import projectService from '../services/project.service'
import siteService from '../services/site.service'
import unitService from '../services/unit.service'
import paymentService from '../services/payment.service'
import adminService from '../services/admin.service'
import { Project } from '../types/project.types'
import { Unit } from '../types/unit.types'
import { Activity } from '../types/admin.types'
import './Dashboard.css'

const Dashboard: React.FC = () => {
  const { user } = useAuth()

  // State
  const [loading, setLoading] = useState(true)
  const [autoPolling, setAutoPolling] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Data
  const [projects, setProjects] = useState<Project[]>([])
  const [totalSites, setTotalSites] = useState<number>(0)
  const [units, setUnits] = useState<Unit[]>([])
  const [totalPayments, setTotalPayments] = useState<number>(0)
  const [totalCollections, setTotalCollections] = useState<number>(0)
  const [recentActivities, setRecentActivities] = useState<Activity[]>([])

  const pollingRef = useRef<any>(null)

  const fetchDashboardData = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true)

      const [projectsRes, sitesRes, unitsRes, paymentsRes, activitiesRes] = await Promise.allSettled([
        projectService.getProjects({ per_page: 10 }),
        siteService.getSites({ per_page: 5 }),
        unitService.getUnits({ per_page: 100 }),
        paymentService.getPayments({ per_page: 50 }),
        adminService.getActivities({ per_page: 5 }),
      ])

      // Projects
      if (projectsRes.status === 'fulfilled') {
        const pList = projectsRes.value.data || []
        setProjects(pList)
      }

      // Sites
      if (sitesRes.status === 'fulfilled') {
        setTotalSites(sitesRes.value.meta?.total || (sitesRes.value.data?.length || 0))
      }

      // Units
      if (unitsRes.status === 'fulfilled') {
        const uList = unitsRes.value.data || []
        setUnits(uList)
      }

      // Payments
      if (paymentsRes.status === 'fulfilled') {
        const payList = paymentsRes.value.data || []
        setTotalPayments(paymentsRes.value.meta?.total || payList.length)
        const sum = payList.reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
        setTotalCollections(sum)
      }

      // Activities
      if (activitiesRes.status === 'fulfilled') {
        const val: any = activitiesRes.value
        const actList = Array.isArray(val)
          ? val
          : Array.isArray(val?.data)
          ? val.data
          : Array.isArray(val?.data?.data)
          ? val.data.data
          : []
        setRecentActivities(actList.slice(0, 5))
      }

      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to load dashboard data', err)
    } finally {
      if (!isBackground) setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  // Auto-polling (every 12 seconds)
  useEffect(() => {
    if (autoPolling) {
      pollingRef.current = setInterval(() => {
        fetchDashboardData(true)
      }, 12000)
    } else {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [autoPolling])

  // Computed Metrics
  const activeProjectsCount = projects.filter(p => p.status === 'active' || p.status === 'planning').length
  const completedProjectsCount = projects.filter(p => p.status === 'completed').length

  const totalUnitsCount = units.length
  const availableUnitsCount = units.filter(u => u.status === 'available').length
  const reservedUnitsCount = units.filter(u => u.status === 'reserved').length
  const soldUnitsCount = units.filter(u => u.status === 'sold').length

  const availablePercent = totalUnitsCount > 0 ? Math.round((availableUnitsCount / totalUnitsCount) * 100) : 0
  const reservedPercent = totalUnitsCount > 0 ? Math.round((reservedUnitsCount / totalUnitsCount) * 100) : 0
  const soldPercent = totalUnitsCount > 0 ? Math.round((soldUnitsCount / totalUnitsCount) * 100) : 0

  return (
    <div className="executive-dashboard">
      {/* Top Bar Greeting */}
      <div className="dashboard-top-bar">
        <div className="dashboard-greeting">
          <h1>Welcome back, {user?.name || 'Administrator'}</h1>
          <p className="dashboard-subtitle">
            Operations & Real-Time Executive Overview • Updated {lastUpdated.toLocaleTimeString()}
          </p>
        </div>

        <div className="dashboard-controls">
          <button 
            className="live-poll-toggle"
            onClick={() => setAutoPolling(prev => !prev)}
            title="Toggle Real-Time Stream Auto-Polling"
          >
            <span className={`live-dot ${!autoPolling ? 'paused' : ''}`}></span>
            {autoPolling ? 'Live Streaming' : 'Polling Paused'}
          </button>

          <button className="refresh-btn" onClick={() => fetchDashboardData()} title="Refresh Data">
            <MdRefresh /> Refresh
          </button>
        </div>
      </div>

      {/* Quick Launchpad Shortcuts */}
      <div className="quick-launchpad-card">
        <div className="launchpad-title">Executive Action Launchpad</div>
        <div className="launchpad-grid">
          <Link to="/units/new" className="launchpad-btn">
            <MdAdd className="btn-icon" /> Add New Unit
          </Link>
          <Link to="/projects/create" className="launchpad-btn">
            <MdFolder className="btn-icon" /> New Project
          </Link>
          <Link to="/sites/new" className="launchpad-btn">
            <MdConstruction className="btn-icon" /> Create Site
          </Link>
          <Link to="/clients/new" className="launchpad-btn">
            <MdPersonAdd className="btn-icon" /> Register Client
          </Link>
          <Link to="/payments/new" className="launchpad-btn">
            <MdReceipt className="btn-icon" /> Record Payment
          </Link>
          <Link to="/documents" className="launchpad-btn">
            <MdDescription className="btn-icon" /> Documents
          </Link>
          <Link to="/admin/activities" className="launchpad-btn">
            <MdSecurity className="btn-icon" /> Audit Trail
          </Link>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="dashboard-stats-grid">
        {/* Projects */}
        <div className="dash-stat-card card-projects">
          <div className="stat-header">
            <span className="stat-title">Active Projects</span>
            <div className="stat-icon"><MdFolder /></div>
          </div>
          <div className="stat-main-value">{projects.length}</div>
          <div className="stat-breakdown-row">
            <span className="breakdown-item">
              <span className="dot-indicator dot-blue"></span>
              {activeProjectsCount} Active
            </span>
            <span className="breakdown-item">
              <span className="dot-indicator dot-green"></span>
              {completedProjectsCount} Completed
            </span>
          </div>
        </div>

        {/* Sites */}
        <div className="dash-stat-card card-sites">
          <div className="stat-header">
            <span className="stat-title">Construction Sites</span>
            <div className="stat-icon"><MdConstruction /></div>
          </div>
          <div className="stat-main-value">{totalSites}</div>
          <div className="stat-breakdown-row">
            <span className="breakdown-item">
              <span className="dot-indicator dot-amber"></span>
              Active Site Locations
            </span>
          </div>
        </div>

        {/* Units Inventory */}
        <div className="dash-stat-card card-units">
          <div className="stat-header">
            <span className="stat-title">Units Portfolio</span>
            <div className="stat-icon"><MdHome /></div>
          </div>
          <div className="stat-main-value">{totalUnitsCount}</div>
          <div className="stat-breakdown-row">
            <span className="breakdown-item">
              <span className="dot-indicator dot-green"></span>
              {availableUnitsCount} Available
            </span>
            <span className="breakdown-item">
              <span className="dot-indicator dot-amber"></span>
              {reservedUnitsCount} Reserved
            </span>
            <span className="breakdown-item">
              <span className="dot-indicator dot-blue"></span>
              {soldUnitsCount} Sold
            </span>
          </div>
        </div>

        {/* Financials */}
        <div className="dash-stat-card card-financials">
          <div className="stat-header">
            <span className="stat-title">Total Revenue Inflow</span>
            <div className="stat-icon"><MdReceipt /></div>
          </div>
          <div className="stat-main-value">
            {totalCollections > 0 
              ? `UGX ${(totalCollections / 1000000).toFixed(1)}M`
              : 'UGX 0'}
          </div>
          <div className="stat-breakdown-row">
            <span className="breakdown-item">
              <span className="dot-indicator dot-blue"></span>
              {totalPayments} Processed Transactions
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Projects Overview + Live Activity */}
      <div className="dashboard-columns-grid">
        {/* Left Column: Progress & Inventory Distribution */}
        <div className="section-card">
          <div className="section-header">
            <h3>Inventory & Project Execution</h3>
            <Link to="/projects" className="section-link">View All Projects <MdArrowForward /></Link>
          </div>

          {/* Multi-Segment Inventory Bar */}
          <div className="inventory-bar-wrapper">
            <div className="inventory-bar-labels">
              <span>Unit Inventory Breakdown</span>
              <span>{totalUnitsCount} Total Units</span>
            </div>
            <div className="multi-progress-bar">
              <div 
                className="progress-segment segment-available" 
                style={{ width: `${availablePercent}%` }} 
                title={`Available: ${availableUnitsCount} (${availablePercent}%)`}
              />
              <div 
                className="progress-segment segment-reserved" 
                style={{ width: `${reservedPercent}%` }} 
                title={`Reserved: ${reservedUnitsCount} (${reservedPercent}%)`}
              />
              <div 
                className="progress-segment segment-sold" 
                style={{ width: `${soldPercent}%` }} 
                title={`Sold: ${soldUnitsCount} (${soldPercent}%)`}
              />
            </div>
            <div className="legend-row">
              <span className="breakdown-item">
                <span className="dot-indicator dot-green"></span> Available: {availableUnitsCount} ({availablePercent}%)
              </span>
              <span className="breakdown-item">
                <span className="dot-indicator dot-amber"></span> Reserved: {reservedUnitsCount} ({reservedPercent}%)
              </span>
              <span className="breakdown-item">
                <span className="dot-indicator dot-blue"></span> Sold: {soldUnitsCount} ({soldPercent}%)
              </span>
            </div>
          </div>

          {/* Project Progress Items */}
          <div className="projects-progress-list">
            {loading && projects.length === 0 ? (
              <div className="loading-dashboard">
                <div className="spinner"></div>
                <p>Loading projects...</p>
              </div>
            ) : projects.length === 0 ? (
              <div className="empty-state">No active projects found.</div>
            ) : (
              projects.slice(0, 4).map(p => {
                const progress = p.progress_percentage || 0
                return (
                  <div key={p.id || p.uuid} className="project-progress-item">
                    <div className="item-top">
                      <span className="item-title">{p.name}</span>
                      <span className={`item-badge ${p.status}`}>{p.status}</span>
                    </div>
                    <div className="item-bar-wrapper">
                      <div className="item-bar-bg">
                        <div 
                          className="item-bar-fill" 
                          style={{ width: `${Math.min(progress, 100)}%` }} 
                        />
                      </div>
                      <span className="item-percentage">{progress}%</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column: Live Stream Audit Feed */}
        <div className="section-card">
          <div className="section-header">
            <h3>Live Security & Activity</h3>
            <Link to="/admin/activities" className="section-link">Audit Trail <MdArrowForward /></Link>
          </div>

          <div className="live-activity-list">
            {recentActivities.length === 0 ? (
              <div className="empty-state">No recent activity detected.</div>
            ) : (
              recentActivities.map(act => (
                <div key={act.id} className="activity-feed-item">
                  <div className="feed-icon-circle">
                    <MdHistory />
                  </div>
                  <div className="feed-content">
                    <div className="feed-desc" title={act.description}>
                      {act.description}
                    </div>
                    <div className="feed-meta">
                      <span>{act.user?.name || 'System Operator'}</span>
                      <span>•</span>
                      <span>{new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
