import React, { useState, useEffect, useRef, useMemo } from 'react'
import { 
  MdHistory, 
  MdRefresh, 
  MdSearch, 
  MdPerson, 
  MdEventNote, 
  MdTimeline, 
  MdChevronRight, 
  MdExpandMore, 
  MdDateRange, 
  MdContentCopy, 
  MdCheck, 
  MdPlayArrow, 
  MdPause,
  MdClose
} from 'react-icons/md'
import adminService from '../../services/admin.service'
import { Activity, ActivityStatistics } from '../../types/admin.types'
import './ActivityLogs.css'

const ActivityLogs: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([])
  const [stats, setStats] = useState<ActivityStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dynamic Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null)

  // Live Auto-Polling
  const [autoPolling, setAutoPolling] = useState(true)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date())
  const pollingIntervalRef = useRef<any>(null)

  // Copy to Clipboard Feedback
  const [copiedId, setCopiedId] = useState<number | null>(null)

  // Dynamic Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  const fetchData = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true)
      setError(null)
      const [logsResponse, statsResponse] = await Promise.all([
        adminService.getActivities({
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          per_page: 100,
        }),
        adminService.getActivityStatistics(30).catch(() => null),
      ])

      setActivities(logsResponse.data || [])
      if (statsResponse) {
        setStats(statsResponse)
      }
      setLastRefreshedAt(new Date())
    } catch (err: any) {
      if (!isBackground) {
        setError(err.message || 'Failed to load activity logs')
      }
    } finally {
      if (!isBackground) setLoading(false)
    }
  }

  // Initial & Filter change fetch
  useEffect(() => {
    fetchData()
  }, [dateFrom, dateTo])

  // Live Auto-Polling Interval (every 10 seconds)
  useEffect(() => {
    if (autoPolling) {
      pollingIntervalRef.current = setInterval(() => {
        fetchData(true)
      }, 10000)
    } else {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
    }

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
    }
  }, [autoPolling, dateFrom, dateTo])

  const toggleExpand = (id: number) => {
    setExpandedLogId(prev => (prev === id ? null : id))
  }

  const handleCopyPayload = (id: number, properties: any) => {
    navigator.clipboard.writeText(JSON.stringify(properties, null, 2))
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  const getEventBadgeClass = (event?: string) => {
    switch (event?.toLowerCase()) {
      case 'created':
      case 'create':
        return 'badge-event-created'
      case 'updated':
      case 'update':
        return 'badge-event-updated'
      case 'deleted':
      case 'delete':
        return 'badge-event-deleted'
      case 'login':
        return 'badge-event-login'
      default:
        return 'badge-event-default'
    }
  }

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: activities.length,
      login: 0,
      created: 0,
      updated: 0,
      deleted: 0,
    }
    activities.forEach(a => {
      const ev = (a.event || '').toLowerCase()
      if (ev.includes('login')) counts.login++
      else if (ev.includes('created') || ev.includes('create')) counts.created++
      else if (ev.includes('updated') || ev.includes('update')) counts.updated++
      else if (ev.includes('deleted') || ev.includes('delete')) counts.deleted++
    })
    return counts
  }, [activities])

  // Dynamic Multi-field Filtering
  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      // Category filter
      if (activeCategory !== 'all') {
        const ev = (activity.event || '').toLowerCase()
        if (activeCategory === 'login' && !ev.includes('login')) return false
        if (activeCategory === 'created' && !(ev.includes('created') || ev.includes('create'))) return false
        if (activeCategory === 'updated' && !(ev.includes('updated') || ev.includes('update'))) return false
        if (activeCategory === 'deleted' && !(ev.includes('deleted') || ev.includes('delete'))) return false
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const actorName = (activity.user?.name || '').toLowerCase()
        const actorEmail = (activity.user?.email || '').toLowerCase()
        const desc = (activity.description || '').toLowerCase()
        const subject = (activity.subject_type || '').toLowerCase()
        const event = (activity.event || '').toLowerCase()

        return (
          actorName.includes(q) ||
          actorEmail.includes(q) ||
          desc.includes(q) ||
          subject.includes(q) ||
          event.includes(q)
        )
      }

      return true
    })
  }, [activities, activeCategory, searchQuery])

  // Pagination calculation
  const totalPages = Math.ceil(filteredActivities.length / pageSize) || 1
  const paginatedActivities = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredActivities.slice(start, start + pageSize)
  }, [filteredActivities, currentPage, pageSize])

  return (
    <div className="activities-container">
      {/* Header with Live Sync Controls */}
      <div className="activities-header">
        <div>
          <h1>Activity Logs & Audit Trail</h1>
          <p className="page-subtitle">Inspect historical system operations, security events, and user interactions</p>
        </div>
        <div className="activities-actions">
          {/* Live Polling Stream Switch */}
          <div className="live-sync-pill" onClick={() => setAutoPolling(prev => !prev)} title="Toggle Real-Time Stream">
            <span className={`pulse-dot ${autoPolling ? 'pulsing' : 'inactive'}`}></span>
            <span className="sync-text">{autoPolling ? 'Live Stream Active' : 'Polling Paused'}</span>
            <button className="sync-toggle-btn">
              {autoPolling ? <MdPause /> : <MdPlayArrow />}
            </button>
          </div>

          <button className="btn-secondary" onClick={() => fetchData(false)} title="Force Refresh">
            <MdRefresh /> Refresh
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="alert-box alert-error">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Dynamic Stats Cards */}
      <div className="activities-stats-grid">
        <div className="stat-card total">
          <div className="stat-icon-wrapper">
            <MdTimeline />
          </div>
          <div>
            <div className="stat-label">Total Audit Events</div>
            <div className="stat-value">{stats?.total_activities ?? activities.length}</div>
            <div className="stat-sub">Updated {lastRefreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
          </div>
        </div>
        <div className="stat-card active">
          <div className="stat-icon-wrapper">
            <MdPerson />
          </div>
          <div>
            <div className="stat-label">Active System Actors</div>
            <div className="stat-value">{stats?.by_user?.length ?? 2}</div>
            <div className="stat-sub">Recording audit signatures</div>
          </div>
        </div>
        <div className="stat-card pending">
          <div className="stat-icon-wrapper">
            <MdEventNote />
          </div>
          <div>
            <div className="stat-label">Dominant Operation</div>
            <div className="stat-value">
              {stats?.by_type ? Object.keys(stats.by_type)[0] || 'Updates' : 'Auth Login'}
            </div>
            <div className="stat-sub">Primary security traffic</div>
          </div>
        </div>
      </div>

      {/* Dynamic Filter Controls Bar */}
      <div className="dynamic-filter-section">
        {/* Category Quick Chips */}
        <div className="category-chips-row">
          {[
            { id: 'all', label: 'All Events', count: categoryCounts.all },
            { id: 'login', label: 'User Logins', count: categoryCounts.login },
            { id: 'created', label: 'Created Items', count: categoryCounts.created },
            { id: 'updated', label: 'Updates', count: categoryCounts.updated },
            { id: 'deleted', label: 'Deletions', count: categoryCounts.deleted },
          ].map(cat => (
            <button
              key={cat.id}
              className={`filter-chip ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => {
                setActiveCategory(cat.id)
                setCurrentPage(1)
              }}
            >
              <span>{cat.label}</span>
              <span className="chip-badge">{cat.count}</span>
            </button>
          ))}
        </div>

        {/* Search & Custom Range Row */}
        <div className="activities-filters-bar">
          <div className="search-box-activities">
            <MdSearch className="search-icon" />
            <input
              type="text"
              placeholder="Live search by actor, email, action, subject, or description..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                <MdClose />
              </button>
            )}
          </div>

          <div className="date-filter-group">
            <MdDateRange className="date-icon" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              placeholder="From"
              title="Start date"
            />
            <span className="date-sep">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              placeholder="To"
              title="End date"
            />
          </div>
        </div>
      </div>

      {/* Activities Table Card */}
      <div className="activities-card">
        <div className="table-responsive">
          <table className="activities-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target Subject</th>
                <th>Description</th>
                <th style={{ width: '90px' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="state-cell">
                    <div className="spinner"></div>
                    <p>Loading audit trail...</p>
                  </td>
                </tr>
              ) : paginatedActivities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="state-cell">
                    <MdHistory className="empty-state-icon" />
                    <h3>No Matching Audit Events</h3>
                    <p>No logged activities match your current search and filter criteria.</p>
                  </td>
                </tr>
              ) : (
                paginatedActivities.map(activity => {
                  const isExpanded = expandedLogId === activity.id
                  const hasProperties = activity.properties && Object.keys(activity.properties).length > 0
                  
                  return (
                    <React.Fragment key={activity.id}>
                      <tr 
                        className={`activity-row ${isExpanded ? 'expanded' : ''}`}
                        onClick={() => hasProperties && toggleExpand(activity.id)}
                        style={{ cursor: hasProperties ? 'pointer' : 'default' }}
                      >
                        <td>
                          {hasProperties && (
                            <button className="btn-expand-icon">
                              {isExpanded ? <MdExpandMore /> : <MdChevronRight />}
                            </button>
                          )}
                        </td>
                        <td>
                          <div className="timestamp-cell">
                            <span className="timestamp-date">
                              {new Date(activity.created_at).toLocaleDateString()}
                            </span>
                            <span className="timestamp-time">
                              {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="actor-cell">
                            <span className="actor-name">
                              {activity.user?.name || 'System Operator'}
                            </span>
                            {activity.user?.email && (
                              <span className="actor-email">{activity.user.email}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`badge-event ${getEventBadgeClass(activity.event)}`}>
                            {activity.event || activity.log_name || 'Action'}
                          </span>
                        </td>
                        <td>
                          <span className="subject-type-badge">
                            {activity.subject_type ? activity.subject_type.split('\\').pop() : 'General'}
                          </span>
                        </td>
                        <td>
                          <span className="description-text">
                            {activity.description}
                          </span>
                        </td>
                        <td>
                          {hasProperties && (
                            <button 
                              className="btn-inspect-pill" 
                              onClick={e => {
                                e.stopPropagation()
                                toggleExpand(activity.id)
                              }}
                            >
                              {isExpanded ? 'Hide' : 'Inspect'}
                            </button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && hasProperties && (
                        <tr className="details-expanded-row">
                          <td colSpan={7}>
                            <div className="payload-inspect-box">
                              <div className="payload-top-bar">
                                <span className="payload-title">Event Payload & Audit Properties</span>
                                <button 
                                  className="btn-copy-payload" 
                                  onClick={() => handleCopyPayload(activity.id, activity.properties)}
                                >
                                  {copiedId === activity.id ? (
                                    <>
                                      <MdCheck /> Copied!
                                    </>
                                  ) : (
                                    <>
                                      <MdContentCopy /> Copy JSON
                                    </>
                                  )}
                                </button>
                              </div>
                              <pre className="payload-pre">
                                {JSON.stringify(activity.properties, null, 2)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination Footer */}
        {filteredActivities.length > 0 && (
          <div className="pagination-bar">
            <div className="pagination-info">
              Showing {Math.min((currentPage - 1) * pageSize + 1, filteredActivities.length)} - {Math.min(currentPage * pageSize, filteredActivities.length)} of {filteredActivities.length} events
            </div>

            <div className="pagination-controls">
              <div className="page-size-selector">
                <span>Per page:</span>
                <select 
                  value={pageSize} 
                  onChange={e => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="pagination-buttons">
                <button
                  className="page-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                >
                  Previous
                </button>
                <span className="page-indicator">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="page-btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ActivityLogs
