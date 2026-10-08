import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import projectService from '../../services/project.service'
import companyService from '../../services/company.service'
import { Project, ProjectFormData } from '../../types/project.types'
import { Company } from '../../types/company.types'
import '../companies/CompanyForm.css'

interface ProjectFormProps {
  isEdit?: boolean
}

const ProjectForm = ({ isEdit = false }: ProjectFormProps) => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    code: '',
    company_id: '',
    project_type: 'residential',
    country: 'Uganda',
    status: 'planning',
    currency: 'UGX',
  })

  useEffect(() => {
    if (isEdit && id) {
      fetchProject()
    }
    fetchCompanies()
  }, [id, isEdit])

  const fetchProject = async () => {
    if (!id) return
    
    try {
      setLoading(true)
      const project = await projectService.getProject(id)
      setFormData({
        name: project.name,
        code: project.code,
        company_id: project.company_id,
        project_type: project.project_type,
        status: project.status,
        description: project.description,
        start_date: project.start_date,
        expected_end_date: project.expected_end_date,
        actual_end_date: project.actual_end_date,
        total_budget: project.total_budget,
        spent_budget: project.spent_budget,
        currency: project.currency,
        location: project.location,
        city: project.city,
        region: project.region,
        country: project.country,
        client_name: project.client_name,
        client_contact: project.client_contact,
        contract_value: project.contract_value,
        progress_percentage: project.progress_percentage,
        priority: project.priority,
        tags: project.tags,
      })
    } catch (err: any) {
      setError(err.message || 'Failed to fetch project')
    } finally {
      setLoading(false)
    }
  }

  const fetchCompanies = async () => {
    try {
      const response = await companyService.getCompanies({
        status: 'active',
        per_page: 100,
      })
      setCompanies(response.data)
    } catch (err) {
      console.error('Failed to fetch companies:', err)
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
        await projectService.updateProject(id, formData)
      } else {
        await projectService.createProject(formData)
      }
      navigate('/projects')
    } catch (err: any) {
      setError(err.message || `Failed to ${isEdit ? 'update' : 'create'} project`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading project...</p>
      </div>
    )
  }

  return (
    <div className="company-form-page">
      <div className="form-header">
        <div>
          <h1>{isEdit ? 'Edit Project' : 'Create New Project'}</h1>
          <p className="form-subtitle">
            {isEdit ? 'Update project information' : 'Add a new project to the system'}
          </p>
        </div>
        <button onClick={() => navigate('/projects')} className="btn btn-secondary">
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
              <label htmlFor="name" className="required">Project Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="e.g., Green Hills Estate"
              />
            </div>

            <div className="form-group">
              <label htmlFor="code" className="required">Project Code</label>
              <input
                type="text"
                id="code"
                name="code"
                value={formData.code}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="e.g., GHE-2024"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="company_id" className="required">Company</label>
              <select
                id="company_id"
                name="company_id"
                value={formData.company_id}
                onChange={handleChange}
                required
                className="form-input"
              >
                <option value="">Select Company</option>
                {companies.map((company) => (
                  <option key={company.uuid} value={company.uuid}>
                    {company.name} ({company.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="project_type" className="required">Project Type</label>
              <select
                id="project_type"
                name="project_type"
                value={formData.project_type}
                onChange={handleChange}
                required
                className="form-input"
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="mixed">Mixed Use</option>
                <option value="industrial">Industrial</option>
                <option value="infrastructure">Infrastructure</option>
                <option value="other">Other</option>
              </select>
            </div>

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
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                name="priority"
                value={formData.priority || ''}
                onChange={handleChange}
                className="form-input"
              >
                <option value="">Select Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="progress_percentage">Progress (%)</label>
              <input
                type="number"
                id="progress_percentage"
                name="progress_percentage"
                value={formData.progress_percentage || ''}
                onChange={handleChange}
                className="form-input"
                min="0"
                max="100"
              />
            </div>
          </div>
        </div>

        {/* Budget & Timeline */}
        <div className="form-section">
          <h2 className="section-title">Budget & Timeline</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start_date">Start Date</label>
              <input
                type="date"
                id="start_date"
                name="start_date"
                value={formData.start_date || ''}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="expected_end_date">Expected End Date</label>
              <input
                type="date"
                id="expected_end_date"
                name="expected_end_date"
                value={formData.expected_end_date || ''}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="actual_end_date">Actual End Date</label>
              <input
                type="date"
                id="actual_end_date"
                name="actual_end_date"
                value={formData.actual_end_date || ''}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="total_budget">Total Budget</label>
              <input
                type="number"
                id="total_budget"
                name="total_budget"
                value={formData.total_budget || ''}
                onChange={handleChange}
                className="form-input"
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label htmlFor="spent_budget">Spent Budget</label>
              <input
                type="number"
                id="spent_budget"
                name="spent_budget"
                value={formData.spent_budget || ''}
                onChange={handleChange}
                className="form-input"
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label htmlFor="currency" className="required">Currency</label>
              <input
                type="text"
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="UGX"
              />
            </div>

            <div className="form-group">
              <label htmlFor="contract_value">Contract Value</label>
              <input
                type="number"
                id="contract_value"
                name="contract_value"
                value={formData.contract_value || ''}
                onChange={handleChange}
                className="form-input"
                min="0"
                step="0.01"
              />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="form-section">
          <h2 className="section-title">Location</h2>
          
          <div className="form-group">
            <label htmlFor="location">Location Description</label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location || ''}
              onChange={handleChange}
              className="form-input"
              placeholder="e.g., Plot 10, Nakasero Hill"
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
              <label htmlFor="region">Region</label>
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
          </div>
        </div>

        {/* Client Information */}
        <div className="form-section">
          <h2 className="section-title">Client Information</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="client_name">Client Name</label>
              <input
                type="text"
                id="client_name"
                name="client_name"
                value={formData.client_name || ''}
                onChange={handleChange}
                className="form-input"
                placeholder="Client or Organization Name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="client_contact">Client Contact</label>
              <input
                type="text"
                id="client_contact"
                name="client_contact"
                value={formData.client_contact || ''}
                onChange={handleChange}
                className="form-input"
                placeholder="Email or Phone"
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="form-section">
          <h2 className="section-title">Description</h2>
          
          <div className="form-group">
            <label htmlFor="description">Project Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              className="form-textarea"
              rows={4}
              placeholder="Brief description of the project..."
            />
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/projects')}
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
            {submitting ? 'Saving...' : isEdit ? 'Update Project' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ProjectForm
