import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import projectService from '../../services/project.service'
import { Project } from '../../types/project.types'
import { Site } from '../../types/site.types'
import './ProjectDetails.css'

const ProjectDetails = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      fetchProjectDetails()
    }
  }, [id])

  const fetchProjectDetails = async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)
      const data = await projectService.getProject(id, {
        with_company: true,
        with_sites: true,
      })
      setProject(data)

      // Fetch sites for this project
      try {
        const sitesResponse = await projectService.getSites(id)
        if (sitesResponse && sitesResponse.data) {
          setSites(sitesResponse.data)
        }
      } catch (siteErr) {
        console.warn('Could not load separate sites list:', siteErr)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch project details')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!project || !window.confirm(`Are you sure you want to delete "${project.name}"?`)) {
      return
    }

    try {
      await projectService.deleteProject(project.uuid)
      navigate('/projects')
    } catch (err: any) {
      alert(err.message || 'Failed to delete project')
    }
  }

  const formatCurrency = (amount?: number, currency = 'UGX') => {
    if (amount === undefined || amount === null) return '-'
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: currency || 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      planning: 'status-planning',
      active: 'status-active',
      on_hold: 'status-hold',
      completed: 'status-completed',
      cancelled: 'status-cancelled',
    }
    return colors[status] || 'status-default'
  }

  const getPriorityBadge = (priority?: string) => {
    const colors: Record<string, string> = {
      low: 'priority-low',
      medium: 'priority-medium',
      high: 'priority-high',
      critical: 'priority-critical',
    }
    return priority ? colors[priority] || 'badge' : 'badge'
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading project details...</p>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="error-container">
        <div className="alert alert-error">
          <span>⚠️</span>
          <span>{error || 'Project not found'}</span>
        </div>
        <button onClick={() => navigate('/projects')} className="btn btn-secondary">
          ← Back to Projects
        </button>
      </div>
    )
  }

  const remainingBudget =
    project.total_budget !== undefined && project.spent_budget !== undefined
      ? project.total_budget - project.spent_budget
      : undefined

  const budgetUsagePercent =
    project.total_budget && project.total_budget > 0 && project.spent_budget
      ? Math.min(100, Math.round((project.spent_budget / project.total_budget) * 100))
      : 0

  return (
    <div className="project-details">
      {/* Header */}
      <div className="details-header">
        <div className="header-content">
          <div className="header-title">
            <h1>{project.name}</h1>
            <div className="header-badges">
              <span className={`badge ${getStatusBadge(project.status)}`}>
                {project.status.replace('_', ' ')}
              </span>
              {project.priority && (
                <span className={`badge ${getPriorityBadge(project.priority)}`}>
                  {project.priority} priority
                </span>
              )}
              <span className="badge badge-type">{project.project_type}</span>
            </div>
          </div>
          <p className="project-code">Code: {project.code}</p>
        </div>

        <div className="header-actions">
          <button onClick={() => navigate('/projects')} className="btn btn-secondary">
            ← Back
          </button>
          <Link to={`/projects/${project.uuid}/edit`} className="btn btn-primary">
            ✏️ Edit Project
          </Link>
          <button onClick={handleDelete} className="btn btn-danger">
            🗑️ Delete
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-value">{formatCurrency(project.total_budget, project.currency)}</div>
            <div className="stat-label">Total Budget</div>
            {project.spent_budget !== undefined && (
              <div className="stat-subtext">
                Spent: {formatCurrency(project.spent_budget, project.currency)} ({budgetUsagePercent}%)
              </div>
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <div className="stat-value">{project.progress_percentage || 0}%</div>
            <div className="stat-label">Project Progress</div>
            <div className="progress-bar-container mt-1">
              <div
                className="progress-bar-fill"
                style={{ width: `${project.progress_percentage || 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🏗️</div>
          <div className="stat-content">
            <div className="stat-value">{project.sites_count !== undefined ? project.sites_count : sites.length}</div>
            <div className="stat-label">Associated Sites</div>
            <div className="stat-subtext">Construction locations</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🏢</div>
          <div className="stat-content">
            <div className="stat-value">{project.units_count || 0}</div>
            <div className="stat-label">Total Units Planned</div>
            <div className="stat-subtext">Across all sites</div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="details-grid">
        {/* Basic Information */}
        <div className="details-card">
          <h2>Basic Information</h2>
          <div className="details-list">
            <div className="detail-item">
              <span className="detail-label">Project Name</span>
              <span className="detail-value">{project.name}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Project Code</span>
              <span className="detail-value font-mono">{project.code}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Managing Company</span>
              <span className="detail-value">
                {project.company ? (
                  <Link to={`/companies/${project.company.uuid}`} className="link">
                    {project.company.name} ({project.company.code})
                  </Link>
                ) : (
                  '-'
                )}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Project Type</span>
              <span className="detail-value capitalize">{project.project_type}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Priority</span>
              <span className="detail-value capitalize">{project.priority || 'Normal'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Status</span>
              <span className="detail-value capitalize">{project.status.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        {/* Budget & Financials */}
        <div className="details-card">
          <h2>Budget & Financials</h2>
          <div className="details-list">
            <div className="detail-item">
              <span className="detail-label">Total Budget</span>
              <span className="detail-value font-semibold">
                {formatCurrency(project.total_budget, project.currency)}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Spent Budget</span>
              <span className="detail-value text-amber-600">
                {formatCurrency(project.spent_budget, project.currency)}
              </span>
            </div>
            {remainingBudget !== undefined && (
              <div className="detail-item">
                <span className="detail-label">Remaining Budget</span>
                <span className={`detail-value font-semibold ${remainingBudget < 0 ? 'text-danger' : 'text-success'}`}>
                  {formatCurrency(remainingBudget, project.currency)}
                </span>
              </div>
            )}
            {project.contract_value !== undefined && (
              <div className="detail-item">
                <span className="detail-label">Contract Value</span>
                <span className="detail-value">
                  {formatCurrency(project.contract_value, project.currency)}
                </span>
              </div>
            )}
            <div className="detail-item">
              <span className="detail-label">Currency</span>
              <span className="detail-value">{project.currency || 'UGX'}</span>
            </div>
          </div>
        </div>

        {/* Timeline & Schedule */}
        <div className="details-card">
          <h2>Timeline & Schedule</h2>
          <div className="details-list">
            <div className="detail-item">
              <span className="detail-label">Start Date</span>
              <span className="detail-value">{formatDate(project.start_date)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Expected End Date</span>
              <span className="detail-value">{formatDate(project.expected_end_date)}</span>
            </div>
            {project.actual_end_date && (
              <div className="detail-item">
                <span className="detail-label">Actual End Date</span>
                <span className="detail-value">{formatDate(project.actual_end_date)}</span>
              </div>
            )}
            <div className="detail-item">
              <span className="detail-label">Progress Percentage</span>
              <span className="detail-value font-semibold">{project.progress_percentage || 0}%</span>
            </div>
          </div>
        </div>

        {/* Location & Geography */}
        <div className="details-card">
          <h2>Location & Geography</h2>
          <div className="details-list">
            {project.location && (
              <div className="detail-item">
                <span className="detail-label">Address / Location</span>
                <span className="detail-value">{project.location}</span>
              </div>
            )}
            {project.city && (
              <div className="detail-item">
                <span className="detail-label">City</span>
                <span className="detail-value">{project.city}</span>
              </div>
            )}
            {project.region && (
              <div className="detail-item">
                <span className="detail-label">Region</span>
                <span className="detail-value">{project.region}</span>
              </div>
            )}
            <div className="detail-item">
              <span className="detail-label">Country</span>
              <span className="detail-value">{project.country || 'Uganda'}</span>
            </div>
          </div>
        </div>

        {/* Client & Contract */}
        {(project.client_name || project.client_contact) && (
          <div className="details-card">
            <h2>Client & Contract</h2>
            <div className="details-list">
              {project.client_name && (
                <div className="detail-item">
                  <span className="detail-label">Client Name</span>
                  <span className="detail-value">{project.client_name}</span>
                </div>
              )}
              {project.client_contact && (
                <div className="detail-item">
                  <span className="detail-label">Client Contact</span>
                  <span className="detail-value">{project.client_contact}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Project Description */}
        {project.description && (
          <div className="details-card full-width">
            <h2>Description</h2>
            <p className="description-text">{project.description}</p>
          </div>
        )}

        {/* Associated Sites */}
        <div className="details-card full-width">
          <div className="flex justify-between items-center mb-4">
            <h2>Associated Sites ({sites.length})</h2>
            <Link to="/sites/new" className="btn btn-secondary text-sm">
              + Add Site to Project
            </Link>
          </div>

          {sites.length === 0 ? (
            <p className="text-muted py-4">No sites currently associated with this project.</p>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Site Code</th>
                    <th>Site Name</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Units Planned</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sites.map((site: any) => (
                    <tr key={site.uuid || site.id}>
                      <td className="font-mono">{site.site_code || site.code}</td>
                      <td>
                        <Link to={`/sites/${site.id || site.uuid}`} className="link font-medium">
                          {site.site_name || site.name}
                        </Link>
                      </td>
                      <td>{site.location || '-'}</td>
                      <td>
                        <span className="badge badge-site-status">
                          {site.status || 'planning'}
                        </span>
                      </td>
                      <td>{site.total_units || 0}</td>
                      <td>
                        <Link
                          to={`/sites/${site.id || site.uuid}`}
                          className="btn-icon"
                          title="View Site"
                        >
                          👁️
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Timestamps */}
      <div className="timestamps">
        <div className="timestamp-item">
          <span className="timestamp-label">Created:</span>
          <span className="timestamp-value">{new Date(project.created_at).toLocaleString()}</span>
        </div>
        <div className="timestamp-item">
          <span className="timestamp-label">Last Updated:</span>
          <span className="timestamp-value">{new Date(project.updated_at).toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}

export default ProjectDetails
