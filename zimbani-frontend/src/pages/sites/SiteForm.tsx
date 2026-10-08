import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { siteService } from '../../services/site.service';
import { projectService } from '../../services/project.service';
import { Site, CreateSiteData, UpdateSiteData } from '../../types/site.types';
import { Project } from '../../types/project.types';
import './SiteForm.css';

const SiteForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  const [formData, setFormData] = useState<CreateSiteData | UpdateSiteData>({
    site_code: '',
    site_name: '',
    project_id: 0,
    location: '',
    site_size: undefined,
    size_unit: 'acres',
    gps_coordinates: undefined,
    boundaries: undefined,
    access_roads: undefined,
    utilities_available: undefined,
    zoning_info: undefined,
    total_units: undefined,
    total_site_value: 0,
    status: 'planning',
    notes: undefined
  });

  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string[] }>({});

  useEffect(() => {
    fetchProjects();
    if (isEditMode && id) {
      fetchSite(Number(id));
    }
  }, [id]);

  const fetchProjects = async () => {
    try {
      const response = await projectService.getAll({ per_page: 1000 });
      setProjects(response.data);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const fetchSite = async (siteId: number) => {
    try {
      setLoadingData(true);
      const site = await siteService.getById(siteId);
      
      setFormData({
        site_code: site.site_code,
        site_name: site.site_name,
        project_id: site.project_id,
        location: site.location,
        site_size: site.site_size,
        size_unit: site.size_unit,
        gps_coordinates: site.gps_coordinates,
        boundaries: site.boundaries,
        access_roads: site.access_roads,
        utilities_available: site.utilities_available,
        zoning_info: site.zoning_info,
        total_units: site.total_units,
        total_site_value: site.total_site_value,
        status: site.status,
        notes: site.notes
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch site details');
    } finally {
      setLoadingData(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    let processedValue: any = value;
    
    if (type === 'number') {
      processedValue = value === '' ? undefined : Number(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setValidationErrors({});

    try {
      if (isEditMode && id) {
        await siteService.update(Number(id), formData as UpdateSiteData);
      } else {
        await siteService.create(formData as CreateSiteData);
      }
      navigate('/sites');
    } catch (err: any) {
      if (err.response?.data?.errors) {
        setValidationErrors(err.response.data.errors);
      } else {
        setError(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} site`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return <div className="loading">Loading site details...</div>;
  }

  return (
    <div className="site-form-container">
      <div className="page-header">
        <div>
          <h1>{isEditMode ? 'Edit Site' : 'Create New Site'}</h1>
          <p className="page-description">
            {isEditMode ? 'Update site information' : 'Add a new site to a project'}
          </p>
        </div>
        <button 
          onClick={() => navigate('/sites')}
          className="btn btn-secondary"
        >
          ← Back to Sites
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError(null)} className="alert-close">×</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="site-form">
        {/* Basic Information Section */}
        <div className="form-section">
          <h2 className="section-title">Basic Information</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="site_code">
                Site Code <span className="required">*</span>
              </label>
              <input
                type="text"
                id="site_code"
                name="site_code"
                value={formData.site_code}
                onChange={handleChange}
                className={validationErrors.site_code ? 'error' : ''}
                placeholder="e.g., ST-001"
                required
              />
              {validationErrors.site_code && (
                <span className="error-message">{validationErrors.site_code[0]}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="site_name">
                Site Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="site_name"
                name="site_name"
                value={formData.site_name}
                onChange={handleChange}
                className={validationErrors.site_name ? 'error' : ''}
                placeholder="e.g., Central Business District Plot"
                required
              />
              {validationErrors.site_name && (
                <span className="error-message">{validationErrors.site_name[0]}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="project_id">
                Project <span className="required">*</span>
              </label>
              <select
                id="project_id"
                name="project_id"
                value={formData.project_id}
                onChange={handleChange}
                className={validationErrors.project_id ? 'error' : ''}
                required
              >
                <option value="">Select Project</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.project_name}
                  </option>
                ))}
              </select>
              {validationErrors.project_id && (
                <span className="error-message">{validationErrors.project_id[0]}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="status">
                Status <span className="required">*</span>
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Location Information Section */}
        <div className="form-section">
          <h2 className="section-title">Location Information</h2>
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="location">
                Location <span className="required">*</span>
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className={validationErrors.location ? 'error' : ''}
                placeholder="e.g., Plot 123, Kampala Road, Kampala"
                required
              />
              {validationErrors.location && (
                <span className="error-message">{validationErrors.location[0]}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="gps_coordinates">GPS Coordinates</label>
              <input
                type="text"
                id="gps_coordinates"
                name="gps_coordinates"
                value={formData.gps_coordinates || ''}
                onChange={handleChange}
                placeholder="e.g., 0.3476° N, 32.5825° E"
              />
            </div>

            <div className="form-group">
              <label htmlFor="site_size">Site Size</label>
              <input
                type="number"
                id="site_size"
                name="site_size"
                value={formData.site_size || ''}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="e.g., 5.5"
              />
            </div>

            <div className="form-group">
              <label htmlFor="size_unit">Size Unit</label>
              <select
                id="size_unit"
                name="size_unit"
                value={formData.size_unit}
                onChange={handleChange}
              >
                <option value="acres">Acres</option>
                <option value="hectares">Hectares</option>
                <option value="sqm">Square Meters</option>
                <option value="sqft">Square Feet</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label htmlFor="boundaries">Boundaries Description</label>
              <textarea
                id="boundaries"
                name="boundaries"
                value={formData.boundaries || ''}
                onChange={handleChange}
                rows={3}
                placeholder="Describe the site boundaries..."
              />
            </div>
          </div>
        </div>

        {/* Site Details Section */}
        <div className="form-section">
          <h2 className="section-title">Site Details</h2>
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="access_roads">Access Roads</label>
              <textarea
                id="access_roads"
                name="access_roads"
                value={formData.access_roads || ''}
                onChange={handleChange}
                rows={2}
                placeholder="Describe access roads to the site..."
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="utilities_available">Utilities Available</label>
              <textarea
                id="utilities_available"
                name="utilities_available"
                value={formData.utilities_available || ''}
                onChange={handleChange}
                rows={2}
                placeholder="e.g., Water, Electricity, Sewage..."
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="zoning_info">Zoning Information</label>
              <textarea
                id="zoning_info"
                name="zoning_info"
                value={formData.zoning_info || ''}
                onChange={handleChange}
                rows={2}
                placeholder="Zoning classification and restrictions..."
              />
            </div>
          </div>
        </div>

        {/* Financial Information Section */}
        <div className="form-section">
          <h2 className="section-title">Financial & Capacity</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="total_units">Total Units Planned</label>
              <input
                type="number"
                id="total_units"
                name="total_units"
                value={formData.total_units || ''}
                onChange={handleChange}
                min="0"
                placeholder="e.g., 50"
              />
            </div>

            <div className="form-group">
              <label htmlFor="total_site_value">
                Total Site Value (UGX) <span className="required">*</span>
              </label>
              <input
                type="number"
                id="total_site_value"
                name="total_site_value"
                value={formData.total_site_value}
                onChange={handleChange}
                className={validationErrors.total_site_value ? 'error' : ''}
                min="0"
                step="0.01"
                placeholder="e.g., 500000000"
                required
              />
              {validationErrors.total_site_value && (
                <span className="error-message">{validationErrors.total_site_value[0]}</span>
              )}
            </div>

            <div className="form-group full-width">
              <label htmlFor="notes">Additional Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes || ''}
                onChange={handleChange}
                rows={4}
                placeholder="Any additional notes about this site..."
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/sites')}
            className="btn btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : isEditMode ? 'Update Site' : 'Create Site'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SiteForm;
