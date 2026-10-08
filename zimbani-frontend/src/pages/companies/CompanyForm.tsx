import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import companyService from '../../services/company.service'
import { Company, CompanyFormData } from '../../types/company.types'
import './CompanyForm.css'

interface CompanyFormProps {
  isEdit?: boolean
}

const CompanyForm = ({ isEdit = false }: CompanyFormProps) => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parentCompanies, setParentCompanies] = useState<Company[]>([])
  
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    code: '',
    company_type: 'parent',
    country: 'Uganda',
    status: 'active',
  })

  useEffect(() => {
    if (isEdit && id) {
      fetchCompany()
    }
    fetchParentCompanies()
  }, [id, isEdit])

  const fetchCompany = async () => {
    if (!id) return
    
    try {
      setLoading(true)
      const company = await companyService.getCompany(id)
      setFormData({
        name: company.name,
        code: company.code,
        company_type: company.company_type,
        parent_id: company.parent_id,
        registration_number: company.registration_number,
        tax_number: company.tax_number,
        industry: company.industry,
        employee_count: company.employee_count,
        website: company.website,
        email: company.email,
        phone: company.phone,
        address: company.address,
        city: company.city,
        region: company.region,
        country: company.country,
        postal_code: company.postal_code,
        description: company.description,
        founded_date: company.founded_date,
        status: company.status,
      })
    } catch (err: any) {
      setError(err.message || 'Failed to fetch company')
    } finally {
      setLoading(false)
    }
  }

  const fetchParentCompanies = async () => {
    try {
      const response = await companyService.getCompanies({
        company_type: 'parent',
        status: 'active',
        per_page: 100,
      })
      setParentCompanies(response.data)
    } catch (err) {
      console.error('Failed to fetch parent companies:', err)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value === '' ? undefined : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      if (isEdit && id) {
        await companyService.updateCompany(id, formData)
      } else {
        await companyService.createCompany(formData)
      }
      navigate('/companies')
    } catch (err: any) {
      setError(err.message || `Failed to ${isEdit ? 'update' : 'create'} company`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading company...</p>
      </div>
    )
  }

  return (
    <div className="company-form-page">
      <div className="form-header">
        <div>
          <h1>{isEdit ? 'Edit Company' : 'Create New Company'}</h1>
          <p className="form-subtitle">
            {isEdit ? 'Update company information' : 'Add a new company to the system'}
          </p>
        </div>
        <button onClick={() => navigate('/companies')} className="btn btn-secondary">
          ← Back to List
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="company-form">
        {/* Basic Information */}
        <div className="form-section">
          <h2 className="section-title">Basic Information</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name" className="required">Company Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="e.g., FAB Homes Uganda Ltd"
              />
            </div>

            <div className="form-group">
              <label htmlFor="code" className="required">Company Code</label>
              <input
                type="text"
                id="code"
                name="code"
                value={formData.code}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="e.g., FABUG"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="company_type" className="required">Company Type</label>
              <select
                id="company_type"
                name="company_type"
                value={formData.company_type}
                onChange={handleChange}
                required
                className="form-input"
              >
                <option value="parent">Parent Company</option>
                <option value="subsidiary">Subsidiary</option>
              </select>
            </div>

            {formData.company_type === 'subsidiary' && (
              <div className="form-group">
                <label htmlFor="parent_id">Parent Company</label>
                <select
                  id="parent_id"
                  name="parent_id"
                  value={formData.parent_id || ''}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="">Select Parent Company</option>
                  {parentCompanies.map((company) => (
                    <option key={company.uuid} value={company.uuid}>
                      {company.name} ({company.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="status" className="required">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="form-input"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="industry">Industry</label>
              <input
                type="text"
                id="industry"
                name="industry"
                value={formData.industry || ''}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., Real Estate, Construction"
              />
            </div>

            <div className="form-group">
              <label htmlFor="founded_date">Founded Date</label>
              <input
                type="date"
                id="founded_date"
                name="founded_date"
                value={formData.founded_date || ''}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="employee_count">Employee Count</label>
              <input
                type="number"
                id="employee_count"
                name="employee_count"
                value={formData.employee_count || ''}
                onChange={handleChange}
                className="form-input"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Registration & Legal */}
        <div className="form-section">
          <h2 className="section-title">Registration & Legal</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="registration_number">Registration Number</label>
              <input
                type="text"
                id="registration_number"
                name="registration_number"
                value={formData.registration_number || ''}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="tax_number">Tax Number (TIN)</label>
              <input
                type="text"
                id="tax_number"
                name="tax_number"
                value={formData.tax_number || ''}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="form-section">
          <h2 className="section-title">Contact Information</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email || ''}
                onChange={handleChange}
                className="form-input"
                placeholder="info@company.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone || ''}
                onChange={handleChange}
                className="form-input"
                placeholder="+256700000000"
              />
            </div>

            <div className="form-group">
              <label htmlFor="website">Website</label>
              <input
                type="url"
                id="website"
                name="website"
                value={formData.website || ''}
                onChange={handleChange}
                className="form-input"
                placeholder="https://www.company.com"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="form-section">
          <h2 className="section-title">Address</h2>
          
          <div className="form-group">
            <label htmlFor="address">Street Address</label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address || ''}
              onChange={handleChange}
              className="form-input"
              placeholder="Plot 123, Industrial Area"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="city">City</label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city || ''}
                onChange={handleChange}
                className="form-input"
                placeholder="Kampala"
              />
            </div>

            <div className="form-group">
              <label htmlFor="region">Region/State</label>
              <input
                type="text"
                id="region"
                name="region"
                value={formData.region || ''}
                onChange={handleChange}
                className="form-input"
                placeholder="Central"
              />
            </div>

            <div className="form-group">
              <label htmlFor="country" className="required">Country</label>
              <input
                type="text"
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="postal_code">Postal Code</label>
              <input
                type="text"
                id="postal_code"
                name="postal_code"
                value={formData.postal_code || ''}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="form-section">
          <h2 className="section-title">Description</h2>
          
          <div className="form-group">
            <label htmlFor="description">Company Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              className="form-textarea"
              rows={4}
              placeholder="Brief description of the company..."
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/companies')}
            className="btn btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : isEdit ? 'Update Company' : 'Create Company'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CompanyForm
