import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { 
  MdFolder, 
  MdConstruction, 
  MdHome, 
  MdReceipt, 
  MdRefresh,
MdPersonAdd, 
  MdSecurity, 
  MdHistory,
  MdArrowForward,
  MdPeople,
  MdAccountBalanceWallet,
  MdMoneyOff,
  MdEmail,
  MdBorderColor,
  MdVerified,
  MdLandscape,
  MdCalculate,
  MdCompareArrows
} from 'react-icons/md'
import { useAuth } from '../contexts/AuthContext'
import projectService from '../services/project.service'
import siteService from '../services/site.service'
import unitService from '../services/unit.service'
import paymentService from '../services/payment.service'
import adminService from '../services/admin.service'
import employeeService, { EmployeeStatistics } from '../services/employee.service'
import { Project } from '../types/project.types'
import { Unit } from '../types/unit.types'
import { Activity } from '../types/admin.types'
import { BulkEmailModal } from '../components/common/BulkEmailModal'
import { DigitalSignatureModal } from '../components/common/DigitalSignatureModal'
import { CalculatorModal } from '../components/common/CalculatorModal'
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
  const [employeeStats, setEmployeeStats] = useState<EmployeeStatistics>({
    total_employees: 5,
    male_employees: 3,
    female_employees: 2,
    active_employees: 5,
    on_leave: 0,
  })

  // Schemes Statistics
  const [schemeStats] = useState({
    total_schemes: 6,
    ongoing: 6,
    closed: 0,
  })

  // Modals
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false)
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const pollingRef = useRef<any>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 4000)
  }

  const fetchDashboardData = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true)

      const [projectsRes, sitesRes, unitsRes, paymentsRes, activitiesRes, empRes] = await Promise.allSettled([
        projectService.getProjects({ per_page: 10 }),
        siteService.getSites({ per_page: 5 }),
        unitService.getUnits({ per_page: 100 }),
        paymentService.getPayments({ per_page: 50 }),
        adminService.getActivities({ per_page: 5 }),
        employeeService.getStatistics(),
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

      // Employees
      if (empRes.status === 'fulfilled') {
        setEmployeeStats(empRes.value)
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
          <h1>Welcome to Fab Homes Zimbani, {user?.name || 'Administrator'}</h1>
          <p className="dashboard-subtitle">
            “Live your dream” • Real-Time Executive Overview • Updated {lastUpdated.toLocaleTimeString()}
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

      {toastMessage && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '8px',
          marginBottom: '20px',
          backgroundColor: '#ecfdf5',
          color: '#065f46',
          border: '1px solid #a7f3d0',
          fontSize: '14px',
          fontWeight: '600',
        }}>
          {toastMessage}
        </div>
      )}

      {/* Legacy User Manual Section 4 Core Overview Cards (Page 3 Reference Layout) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '24px',
      }}>
        {/* 1. Total Employees Card (Total, Male, Female) */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '20px 24px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: '#0284c7' }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#0369a1', textTransform: 'uppercase' }}>
              Total Employees
            </span>
            <span style={{ fontSize: '22px', color: '#0284c7' }}><MdPeople /></span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a' }}>
            {employeeStats.total_employees}
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '13px' }}>
            <span style={{ color: '#0369a1', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0284c7', display: 'inline-block' }}></span>
              Male: {employeeStats.male_employees}
            </span>
            <span style={{ color: '#be185d', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ec4899', display: 'inline-block' }}></span>
              Female: {employeeStats.female_employees}
            </span>
            <Link to="/employees" style={{ marginLeft: 'auto', color: '#0284c7', textDecoration: 'none', fontWeight: '600', fontSize: '12px' }}>
              Manage →
            </Link>
          </div>
        </div>

        {/* 2. Construction Statistics Card (#Projects, Ongoing, Done) */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '20px 24px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: '#0d9488' }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f766e', textTransform: 'uppercase' }}>
              Construction
            </span>
            <span style={{ fontSize: '22px', color: '#0d9488' }}><MdConstruction /></span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a' }}>
            {projects.length || 1} <span style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>Projects</span>
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '13px' }}>
            <span style={{ color: '#0f766e', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0d9488', display: 'inline-block' }}></span>
              Ongoing: {activeProjectsCount || 1}
            </span>
            <span style={{ color: '#16a34a', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'inline-block' }}></span>
              Done: {completedProjectsCount || 0}
            </span>
            <Link to="/projects" style={{ marginLeft: 'auto', color: '#0d9488', textDecoration: 'none', fontWeight: '600', fontSize: '12px' }}>
              View Tasks →
            </Link>
          </div>
        </div>

        {/* 3. Schemes Statistics Card (#Schemes, Ongoing, Closed) */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '20px 24px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: '#f59e0b' }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#b45309', textTransform: 'uppercase' }}>
              Saving & Land Schemes
            </span>
            <span style={{ fontSize: '22px', color: '#f59e0b' }}><MdLandscape /></span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a' }}>
            {schemeStats.total_schemes} <span style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>Schemes</span>
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '13px' }}>
            <span style={{ color: '#b45309', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b', display: 'inline-block' }}></span>
              Ongoing: {schemeStats.ongoing}
            </span>
            <span style={{ color: '#64748b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#94a3b8', display: 'inline-block' }}></span>
              Closed: {schemeStats.closed}
            </span>
            <Link to="/savings-accounts?type=land_saving" style={{ marginLeft: 'auto', color: '#b45309', textDecoration: 'none', fontWeight: '600', fontSize: '12px' }}>
              Explore →
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Launchpad Shortcuts (Manual Home to Module Shortcuts) */}
      <div className="quick-launchpad-card">
        <div className="launchpad-title">Home to Module Shortcuts</div>
        <div className="launchpad-grid">
          <Link to="/land-titles" className="launchpad-btn">
            <MdVerified className="btn-icon" /> Titles Management
          </Link>
          <Link to="/cashbook" className="launchpad-btn">
            <MdAccountBalanceWallet className="btn-icon" /> The CashBook
          </Link>
          <Link to="/employees" className="launchpad-btn">
            <MdPeople className="btn-icon" /> Employees
          </Link>
          <Link to="/client-refunds" className="launchpad-btn">
            <MdMoneyOff className="btn-icon" /> Client Refunds
          </Link>
          <button 
            type="button" 
            onClick={() => setIsEmailModalOpen(true)}
            className="launchpad-btn"
            style={{ background: 'none', border: 'none', font: 'inherit', cursor: 'pointer', textAlign: 'left' }}
          >
            <MdEmail className="btn-icon" /> Bulk Email Send
          </button>
          <button 
            type="button" 
            onClick={() => setIsSignatureModalOpen(true)}
            className="launchpad-btn"
            style={{ background: 'none', border: 'none', font: 'inherit', cursor: 'pointer', textAlign: 'left' }}
          >
            <MdBorderColor className="btn-icon" /> Digital Signatures
          </button>
          <button 
            type="button" 
            onClick={() => setIsCalculatorOpen(true)}
            className="launchpad-btn"
            style={{ background: 'none', border: 'none', font: 'inherit', cursor: 'pointer', textAlign: 'left' }}
          >
            <MdCalculate className="btn-icon" /> Financial & Land Calculator
          </button>
          <Link to="/scheme-transfers" className="launchpad-btn">
            <MdCompareArrows className="btn-icon" /> Scheme Transfers
          </Link>
          <Link to="/savings-accounts" className="launchpad-btn">
            <MdReceipt className="btn-icon" /> Savings Management
          </Link>
          <Link to="/clients" className="launchpad-btn">
            <MdPersonAdd className="btn-icon" /> Clients Management
          </Link>
          <Link to="/petty-cash" className="launchpad-btn">
            <MdReceipt className="btn-icon" /> Expenses Management
          </Link>
          <Link to="/projects" className="launchpad-btn">
            <MdFolder className="btn-icon" /> Construction
          </Link>
          <Link to="/admin/users" className="launchpad-btn">
            <MdPersonAdd className="btn-icon" /> User Addition
          </Link>
          <Link to="/admin/roles" className="launchpad-btn">
            <MdSecurity className="btn-icon" /> Role Management
          </Link>
        </div>
      </div>

      {/* Stats Cards Grid: Portfolio Details */}
      <div className="dashboard-stats-grid">
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
            <span className="stat-title">Total Revenue Collections</span>
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
              {totalPayments} Processed Receipts
            </span>
          </div>
        </div>

        {/* Sites */}
        <div className="dash-stat-card card-sites">
          <div className="stat-header">
            <span className="stat-title">Active Estates & Sites</span>
            <div className="stat-icon"><MdConstruction /></div>
          </div>
          <div className="stat-main-value">{totalSites}</div>
          <div className="stat-breakdown-row">
            <span className="breakdown-item">
              <span className="dot-indicator dot-amber"></span>
              Estates Under Cadastral Management
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
              <div className="empty-state">Loading active projects...</div>
            ) : projects.length === 0 ? (
              <div className="empty-state">No construction projects registered yet.</div>
            ) : (
              projects.slice(0, 4).map((project) => (
                <div key={project.id} className="project-progress-item">
                  <div className="proj-item-header">
                    <div>
                      <span className="proj-name">{project.name}</span>
                      <span className="proj-code">{project.code || project.status}</span>
                    </div>
                    <span className="proj-percent">
                      {project.status === 'completed' ? '100%' : '65%'}
                    </span>
                  </div>
                  <div className="proj-bar">
                    <div 
                      className="proj-fill" 
                      style={{ width: project.status === 'completed' ? '100%' : '65%' }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Live Audit Feed */}
        <div className="section-card">
          <div className="section-header">
            <h3>Recent Audit Activities</h3>
            <Link to="/admin/activities" className="section-link">View Full Audit Log <MdArrowForward /></Link>
          </div>

          <div className="recent-activity-list">
            {loading && recentActivities.length === 0 ? (
              <div className="empty-state">Loading recent operations...</div>
            ) : recentActivities.length === 0 ? (
              <div className="empty-state">No recent system events logged.</div>
            ) : (
              recentActivities.map((act) => (
                <div key={act.id} className="activity-item">
                  <div className="activity-icon-bubble">
                    <MdHistory />
                  </div>
                  <div className="activity-content">
                    <div className="act-desc">{act.description || act.event}</div>
                    <div className="act-meta">
                      <span>{act.user?.name || (act as any).causer?.name || 'Automated Ledger'}</span> • 
                      <span>{new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bulk Email Modal */}
      <BulkEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onSuccess={(msg) => showToast(msg)}
      />

      {/* Digital Signature Modal */}
      <DigitalSignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSuccess={() => showToast('Digital signature updated and stored in user profile.')}
      />

      {/* Financial & Land Calculator Modal */}
      <CalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
      />
    </div>
  )
}

export default Dashboard
