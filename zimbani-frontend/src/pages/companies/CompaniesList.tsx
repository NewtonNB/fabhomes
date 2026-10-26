import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MdVisibility, MdEdit, MdDelete, MdWarning, MdCheckCircle } from 'react-icons/md'
import companyService from '../../services/company.service'
import { Company, CompanyFilters } from '../../types/company.types'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import './CompaniesList.css'

const CompaniesList = () => {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  
  // Soft Replies & Confirm Modal States
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null)
  const [deletingCompany, setDeletingCompany] = useState(false)
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

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

  const handleConfirmDelete = async () => {
    if (!companyToDelete) return

    setDeletingCompany(true)
    try {
      await companyService.deleteCompany(companyToDelete.uuid)
      setActionFeedback({
        type: 'success',
        message: `Company "${companyToDelete.name}" was successfully deleted.`
      })
      setCompanyToDelete(null)
      fetchCompanies()
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Failed to delete company. It may be linked to active projects or users.'
      })
    } finally {
      setDeletingCompany(false)
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

      {actionFeedback && (
        <div
          className={`alert ${actionFeedback.type === 'success' ? 'alert-success' : 'alert-error'}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: actionFeedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: actionFeedback.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${actionFeedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
            {actionFeedback.type === 'success' ? <MdCheckCircle size={18} color="#059669" /> : <MdWarning size={18} color="#dc2626" />}
            {actionFeedback.message}
          </span>
          <button
            onClick={() => setActionFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'bold' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Status Filter Chips */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={() => {
            setFilters(prev => ({ ...prev, status: '' }))
            setCurrentPage(1)
          }}
          style={{
            padding: '7px 14px',
            borderRadius: '20px',
            border: `1px solid ${!filters.status ? '#0d9488' : '#cbd5e1'}`,
            background: !filters.status ? '#0d9488' : '#ffffff',
            color: !filters.status ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          All Companies ({total || companies.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setFilters(prev => ({ ...prev, status: 'active' }))
            setCurrentPage(1)
          }}
          style={{
            padding: '7px 14px',
            borderRadius: '20px',
            border: `1px solid ${filters.status === 'active' ? '#16a34a' : '#cbd5e1'}`,
            background: filters.status === 'active' ? '#16a34a' : '#ffffff',
            color: filters.status === 'active' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Active
        </button>
        <button
          type="button"
          onClick={() => {
            setFilters(prev => ({ ...prev, status: 'inactive' }))
            setCurrentPage(1)
          }}
          style={{
            padding: '7px 14px',
            borderRadius: '20px',
            border: `1px solid ${filters.status === 'inactive' ? '#64748b' : '#cbd5e1'}`,
            background: filters.status === 'inactive' ? '#64748b' : '#ffffff',
            color: filters.status === 'inactive' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Inactive
        </button>
        <button
          type="button"
          onClick={() => {
            setFilters(prev => ({ ...prev, status: 'suspended' }))
            setCurrentPage(1)
          }}
          style={{
            padding: '7px 14px',
            borderRadius: '20px',
            border: `1px solid ${filters.status === 'suspended' ? '#dc2626' : '#cbd5e1'}`,
            background: filters.status === 'suspended' ? '#dc2626' : '#ffffff',
            color: filters.status === 'suspended' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Suspended
        </button>
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
          <MdWarning size={18} />
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
                            <MdVisibility size={18} />
                          </button>
                          <button
                            onClick={() => navigate(`/companies/${company.uuid}/edit`)}
                            className="btn-icon"
                            title="Edit"
                          >
                            <MdEdit size={18} />
                          </button>
                          <button
                            onClick={() => setCompanyToDelete(company)}
                            className="btn-icon btn-danger"
                            title="Delete"
                          >
                            <MdDelete size={18} />
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

      {/* Soft Confirmation Modal for Company Deletion */}
      <ConfirmDialog
        isOpen={Boolean(companyToDelete)}
        title="Delete Company"
        message={`Are you sure you want to delete company "${companyToDelete?.name}"? All associated settings will be removed.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deletingCompany}
        onConfirm={handleConfirmDelete}
        onClose={() => setCompanyToDelete(null)}
      />
    </div>
  )
}

export default CompaniesList
