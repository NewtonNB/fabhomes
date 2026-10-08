import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import companyService from '../../services/company.service'
import { Company, CompanyFilters } from '../../types/company.types'
import './CompaniesList.css'

const CompaniesList = () => {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  
  // Filters
  const [filters, setFilters] = useState<CompanyFilters>({
    search: '',
    company_type: '',
    status: '',
    per_page: 15,
  })

  const fetchCompanies = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await companyService.getCompanies({
        ...filters,
        page: currentPage,
      })
      setCompanies(response.data)
      setTotalPages(response.meta.last_page)
      setTotal(response.meta.total)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch companies')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCompanies()
  }, [currentPage])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchCompanies()
  }

  const handleFilterChange = (key: keyof CompanyFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleDelete = async (uuid: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) {
      return
    }

    try {
      await companyService.deleteCompany(uuid)
      fetchCompanies()
    } catch (err: any) {
      alert(err.message || 'Failed to delete company')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      active: 'status-active',
      inactive: 'status-inactive',
      suspended: 'status-suspended',
    }
    return statusColors[status] || 'status-default'
  }

  const getTypeBadge = (type: string) => {
    const typeColors: Record<string, string> = {
      parent: 'type-parent',
      subsidiary: 'type-subsidiary',
    }
    return typeColors[type] || 'type-default'
  }

  return (
    <div className="companies-list">
      <div className="page-header">
        <div>
          <h1>Companies</h1>
          <p className="page-subtitle">Manage companies and subsidiaries</p>
        </div>
        <Link to="/companies/create" className="btn btn-primary">
          + Add Company
        </Link>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search by name or code..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="search-input"
          />
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
        </form>

        <div className="filters-row">
          <select
            value={filters.company_type}
            onChange={(e) => handleFilterChange('company_type', e.target.value)}
            className="filter-select"
          >
            <option value="">All Types</option>
            <option value="parent">Parent</option>
            <option value="subsidiary">Subsidiary</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="filter-select"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>

          <button onClick={() => fetchCompanies()} className="btn btn-secondary">
            Apply Filters
          </button>
          
          <button
            onClick={() => {
              setFilters({ search: '', company_type: '', status: '', per_page: 15 })
              setCurrentPage(1)
            }}
            className="btn btn-text"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading companies...</p>
        </div>
      ) : (
        <>
          {/* Results Summary */}
          <div className="results-summary">
            Showing {companies.length} of {total} companies
          </div>

          {/* Companies Table */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Country</th>
                  <th>Status</th>
                  <th>Projects</th>
                  <th>Users</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="no-data">
                      No companies found. Create one to get started!
                    </td>
                  </tr>
                ) : (
                  companies.map((company) => (
                    <tr key={company.uuid}>
                      <td>
                        <span className="company-code">{company.code}</span>
                      </td>
                      <td>
                        <Link
                          to={`/companies/${company.uuid}`}
                          className="company-name-link"
                        >
                          {company.name}
                        </Link>
                      </td>
                      <td>
                        <span className={`badge ${getTypeBadge(company.company_type)}`}>
                          {company.company_type}
                        </span>
                      </td>
                      <td>{company.country}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(company.status)}`}>
                          {company.status}
                        </span>
                      </td>
                      <td className="text-center">{company.projects_count || 0}</td>
                      <td className="text-center">{company.users_count || 0}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => navigate(`/companies/${company.uuid}`)}
                            className="btn-icon"
                            title="View"
                          >
                            👁️
                          </button>
                          <button
                            onClick={() => navigate(`/companies/${company.uuid}/edit`)}
                            className="btn-icon"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(company.uuid, company.name)}
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

          {/* Pagination */}
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

export default CompaniesList
