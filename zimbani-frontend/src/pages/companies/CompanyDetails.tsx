import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import companyService from '../../services/company.service'
import { Company } from '../../types/company.types'
import './CompanyDetails.css'

const CompanyDetails = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      fetchCompany()
    }
  }, [id])

  const fetchCompany = async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)
      const data = await companyService.getCompany(id, {
        with_subsidiaries: true,
        with_users: true,
      })
      setCompany(data)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch company')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!company || !window.confirm(`Are you sure you want to delete "${company.name}"?`)) {
      return
    }

    try {
      await companyService.deleteCompany(company.uuid)
      navigate('/companies')
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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading company...</p>
      </div>
    )
  }

  if (error || !company) {
    return (
      <div className="error-container">
        <div className="alert alert-error">
          <span>⚠️</span>
          <span>{error || 'Company not found'}</span>
        </div>
        <button onClick={() => navigate('/companies')} className="btn btn-secondary">
          ← Back to List
        </button>
      </div>
    )
  }

  return (
    <div className="company-details">
      {/* Header */}
      <div className="details-header">
        <div className="header-content">
          <div className="header-title">
            <h1>{company.name}</h1>
            <div className="header-badges">
              <span className={`badge ${getTypeBadge(company.company_type)}`}>
                {company.company_type}
              </span>
              <span className={`badge ${getStatusBadge(company.status)}`}>
                {company.status}
              </span>
            </div>
          </div>
          <p className="company-code">Code: {company.code}</p>
        </div>
        
        <div className="header-actions">
          <button onClick={() => navigate('/companies')} className="btn btn-secondary">
            ← Back
          </button>
          <Link to={`/companies/${company.uuid}/edit`} className="btn btn-primary">
            ✏️ Edit
          </Link>
          <button onClick={handleDelete} className="btn btn-danger">
            🗑️ Delete
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📁</div>
          <div className="stat-content">
            <div className="stat-value">{company.projects_count || 0}</div>
            <div className="stat-label">Projects</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-value">{company.users_count || 0}</div>
            <div className="stat-label">Users</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏢</div>
          <div className="stat-content">
            <div className="stat-value">{company.subsidiaries_count || 0}</div>
            <div className="stat-label">Subsidiaries</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👔</div>
          <div className="stat-content">
            <div className="stat-value">{company.employee_count || 0}</div>
            <div className="stat-label">Employees</div>
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
              <span className="detail-label">Company Name</span>
              <span className="detail-value">{company.name}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Company Code</span>
              <span className="detail-value">{company.code}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Company Type</span>
              <span className="detail-value capitalize">{company.company_type}</span>
            </div>
            {company.industry && (
              <div className="detail-item">
                <span className="detail-label">Industry</span>
                <span className="detail-value">{company.industry}</span>
              </div>
            )}
            {company.founded_date && (
              <div className="detail-item">
                <span className="detail-label">Founded Date</span>
                <span className="detail-value">
                  {new Date(company.founded_date).toLocaleDateString()}
                </span>
              </div>
            )}
            {company.employee_count && (
              <div className="detail-item">
                <span className="detail-label">Employee Count</span>
                <span className="detail-value">{company.employee_count}</span>
              </div>
            )}
          </div>
        </div>

        {/* Registration & Legal */}
        {(company.registration_number || company.tax_number) && (
          <div className="details-card">
            <h2>Registration & Legal</h2>
            <div className="details-list">
              {company.registration_number && (
                <div className="detail-item">
                  <span className="detail-label">Registration Number</span>
                  <span className="detail-value">{company.registration_number}</span>
                </div>
              )}
              {company.tax_number && (
                <div className="detail-item">
                  <span className="detail-label">Tax Number</span>
                  <span className="detail-value">{company.tax_number}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contact Information */}
        {(company.email || company.phone || company.website) && (
          <div className="details-card">
            <h2>Contact Information</h2>
            <div className="details-list">
              {company.email && (
                <div className="detail-item">
                  <span className="detail-label">Email</span>
                  <a href={`mailto:${company.email}`} className="detail-value link">
                    {company.email}
                  </a>
                </div>
              )}
              {company.phone && (
                <div className="detail-item">
                  <span className="detail-label">Phone</span>
                  <a href={`tel:${company.phone}`} className="detail-value link">
                    {company.phone}
                  </a>
                </div>
              )}
              {company.website && (
                <div className="detail-item">
                  <span className="detail-label">Website</span>
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="detail-value link"
                  >
                    {company.website}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Address */}
        {(company.address || company.city || company.country) && (
          <div className="details-card">
            <h2>Address</h2>
            <div className="details-list">
              {company.address && (
                <div className="detail-item">
                  <span className="detail-label">Street Address</span>
                  <span className="detail-value">{company.address}</span>
                </div>
              )}
              {company.city && (
                <div className="detail-item">
                  <span className="detail-label">City</span>
                  <span className="detail-value">{company.city}</span>
                </div>
              )}
              {company.region && (
                <div className="detail-item">
                  <span className="detail-label">Region</span>
                  <span className="detail-value">{company.region}</span>
                </div>
              )}
              <div className="detail-item">
                <span className="detail-label">Country</span>
                <span className="detail-value">{company.country}</span>
              </div>
              {company.postal_code && (
                <div className="detail-item">
                  <span className="detail-label">Postal Code</span>
                  <span className="detail-value">{company.postal_code}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Description */}
        {company.description && (
          <div className="details-card full-width">
            <h2>Description</h2>
            <p className="description-text">{company.description}</p>
          </div>
        )}

        {/* Parent Company */}
        {company.parent && (
          <div className="details-card">
            <h2>Parent Company</h2>
            <div className="details-list">
              <div className="detail-item">
                <span className="detail-label">Name</span>
                <Link
                  to={`/companies/${company.parent.uuid}`}
                  className="detail-value link"
                >
                  {company.parent.name}
                </Link>
              </div>
              <div className="detail-item">
                <span className="detail-label">Code</span>
                <span className="detail-value">{company.parent.code}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Timestamps */}
      <div className="timestamps">
        <div className="timestamp-item">
          <span className="timestamp-label">Created:</span>
          <span className="timestamp-value">
            {new Date(company.created_at).toLocaleString()}
          </span>
        </div>
        <div className="timestamp-item">
          <span className="timestamp-label">Last Updated:</span>
          <span className="timestamp-value">
            {new Date(company.updated_at).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
}

export default CompanyDetails
