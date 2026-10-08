import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import projectService from '../../services/project.service'
import { Project, ProjectFilters } from '../../types/project.types'
import './ProjectsList.css'

const ProjectsList = () => {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  
  const [filters, setFilters] = useState<ProjectFilters>({
    search: '',
    project_type: '',
    status: '',
    priority: '',
    per_page: 15,
  })

  const fetchProjects = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await projectService.getProjects({
        ...filters,
        page: currentPage,
      })
      setProjects(response.data)
      setTotalPages(response.meta.last_page)
      setTotal(response.meta.total)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [currentPage])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchProjects()
  }

  const handleFilterChange = (key: keyof ProjectFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleDelete = async (uuid: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) {
      return
    }

    try {
      await projectService.deleteProject(uuid)
      fetchProjects()
    } catch (err: any) {
      alert(err.message || 'Failed to delete project')
    }
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

  return (
    <div className="projects-list">
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p className="page-subtitle">Manage construction and development projects</p>
        </div>
        <Link to="/projects/create" className="btn btn-primary">
          + Add Project
        </Link>
      </div>

      <div className="filters-section">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search by name or code..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="search-input"
          />
          <button type="submit" className="btn btn-secondary">Search</button>
        </form>

        <div className="filters-row">
          <select
            value={filters.project_type}
            onChange={(e) => handleFilterChange('project_type', e.target.value)}
            className="filter-select"
          >
            <option value="">All Types</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="mixed">Mixed</option>
            <option value="industrial">Industrial</option>
            <option value="infrastructure">Infrastructure</option>
            <option value="other">Other</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="filter-select"
          >
            <option value="">All Statuses</option>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={filters.priority}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
            className="filter-select"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          <button onClick={() => fetchProjects()} className="btn btn-secondary">
            Apply Filters
          </button>
          
          <button
            onClick={() => {
              setFilters({ search: '', project_type: '', status: '', priority: '', per_page: 15 })
              setCurrentPage(1)
            }}
            className="btn btn-text"
          >
            Clear
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading projects...</p>
        </div>
      ) : (
        <>
          <div className="results-summary">
            Showing {projects.length} of {total} projects
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Progress</th>
                  <th>Sites</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="no-data">
                      No projects found. Create one to get started!
                    </td>
                  </tr>
                ) : (
                  projects.map((project) => (
                    <tr key={project.uuid}>
                      <td>
                        <span className="project-code">{project.code}</span>
                      </td>
                      <td>
                        <Link to={`/projects/${project.uuid}`} className="project-name-link">
                          {project.name}
                        </Link>
                      </td>
                      <td>{project.company?.name || '-'}</td>
                      <td>
                        <span className="badge">{project.project_type}</span>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(project.status)}`}>
                          {project.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        {project.priority && (
                          <span className={`badge ${getPriorityBadge(project.priority)}`}>
                            {project.priority}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="progress-bar-container">
                          <div 
                            className="progress-bar-fill" 
                            style={{ width: `${project.progress_percentage || 0}%` }}
                          />
                          <span className="progress-text">{project.progress_percentage || 0}%</span>
                        </div>
                      </td>
                      <td className="text-center">{project.sites_count || 0}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => navigate(`/projects/${project.uuid}`)}
                            className="btn-icon"
                            title="View"
                          >
                            👁️
                          </button>
                          <button
                            onClick={() => navigate(`/projects/${project.uuid}/edit`)}
                            className="btn-icon"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(project.uuid, project.name)}
                            className="btn-icon btn-danger"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn btn-secondary"
              >
                Previous
              </button>
              
              <span className="pagination-info">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-secondary"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ProjectsList
