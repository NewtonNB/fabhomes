import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { siteService } from '../../services/site.service';
import { Site } from '../../types/site.types';
import './SiteDetails.css';

const SiteDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchSiteDetails(Number(id));
    }
  }, [id]);

  const fetchSiteDetails = async (siteId: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await siteService.getById(siteId);
      setSite(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch site details');
      console.error('Error fetching site:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!site || !window.confirm('Are you sure you want to delete this site?')) {
      return;
    }

    try {
      await siteService.delete(site.id);
      navigate('/sites');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete site');
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getStatusBadgeClass = (status: string) => {
    const statusClasses: { [key: string]: string } = {
      'planning': 'badge-warning',
      'active': 'badge-success',
      'on_hold': 'badge-secondary',
      'completed': 'badge-info',
      'cancelled': 'badge-danger'
    };
    return `badge ${statusClasses[status] || 'badge-secondary'}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return <div className="loading">Loading site details...</div>;
  }

  if (error || !site) {
    return (
      <div className="error-container">
        <div className="error-message">
          {error || 'Site not found'}
        </div>
        <button onClick={() => navigate('/sites')} className="btn btn-primary">
          ← Back to Sites
        </button>
      </div>
    );
  }

  return (
    <div className="site-details-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="header-breadcrumb">
            <span className="breadcrumb-link" onClick={() => navigate('/sites')}>
              Sites
            </span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">{site.site_name}</span>
          </div>
          <h1>{site.site_name}</h1>
          <div className="header-meta">
            <span className="code-badge">{site.site_code}</span>
            <span className={getStatusBadgeClass(site.status)}>
              {formatStatus(site.status)}
            </span>
          </div>
        </div>
        <div className="header-actions">
          <button 
            onClick={() => navigate(`/sites/${site.id}/edit`)}
            className="btn btn-primary"
          >
            ✏️ Edit Site
          </button>
          <button 
            onClick={handleDelete}
            className="btn btn-danger"
          >
            🗑️ Delete
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📍</div>
          <div className="stat-content">
            <div className="stat-label">Location</div>
            <div className="stat-value">{site.location}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📏</div>
          <div className="stat-content">
            <div className="stat-label">Site Size</div>
            <div className="stat-value">
              {site.site_size ? `${site.site_size} ${site.size_unit}` : 'N/A'}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🏢</div>
          <div className="stat-content">
            <div className="stat-label">Total Units</div>
            <div className="stat-value">{site.total_units || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-label">Site Value</div>
            <div className="stat-value">{formatCurrency(site.total_site_value)}</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="content-grid">
        {/* Basic Information */}
        <div className="info-section">
          <h2 className="section-title">Basic Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Site Code</span>
              <span className="info-value">{site.site_code}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Site Name</span>
              <span className="info-value">{site.site_name}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Project</span>
              <span className="info-value">
                {site.project ? (
                  <span 
                    className="link-value"
                    onClick={() => navigate(`/projects/${site.project_id}`)}
                  >
                    {site.project.project_name}
                  </span>
                ) : (
                  'N/A'
                )}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Status</span>
              <span className={getStatusBadgeClass(site.status)}>
                {formatStatus(site.status)}
              </span>
            </div>
          </div>
        </div>

        {/* Location Information */}
        <div className="info-section">
          <h2 className="section-title">Location Information</h2>
          <div className="info-grid">
            <div className="info-item full-width">
              <span className="info-label">Location</span>
              <span className="info-value">{site.location}</span>
            </div>
            {site.gps_coordinates && (
              <div className="info-item full-width">
                <span className="info-label">GPS Coordinates</span>
                <span className="info-value">{site.gps_coordinates}</span>
              </div>
            )}
            <div className="info-item">
              <span className="info-label">Site Size</span>
              <span className="info-value">
                {site.site_size ? `${site.site_size} ${site.size_unit}` : 'Not specified'}
              </span>
            </div>
            {site.boundaries && (
              <div className="info-item full-width">
                <span className="info-label">Boundaries</span>
                <span className="info-value">{site.boundaries}</span>
              </div>
            )}
          </div>
        </div>

        {/* Site Details */}
        <div className="info-section full-width">
          <h2 className="section-title">Site Details</h2>
          <div className="info-grid">
            {site.access_roads && (
              <div className="info-item full-width">
                <span className="info-label">Access Roads</span>
                <span className="info-value">{site.access_roads}</span>
              </div>
            )}
            {site.utilities_available && (
              <div className="info-item full-width">
                <span className="info-label">Utilities Available</span>
                <span className="info-value">{site.utilities_available}</span>
              </div>
            )}
            {site.zoning_info && (
              <div className="info-item full-width">
                <span className="info-label">Zoning Information</span>
                <span className="info-value">{site.zoning_info}</span>
              </div>
            )}
          </div>
        </div>

        {/* Financial Information */}
        <div className="info-section">
          <h2 className="section-title">Financial & Capacity</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Total Units Planned</span>
              <span className="info-value">{site.total_units || 'Not specified'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Total Site Value</span>
              <span className="info-value">{formatCurrency(site.total_site_value)}</span>
            </div>
          </div>
        </div>

        {/* Additional Notes */}
        {site.notes && (
          <div className="info-section full-width">
            <h2 className="section-title">Additional Notes</h2>
            <div className="notes-content">
              {site.notes}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="info-section full-width">
          <h2 className="section-title">Record Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Created</span>
              <span className="info-value">{formatDate(site.created_at)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Last Updated</span>
              <span className="info-value">{formatDate(site.updated_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Related Actions */}
      <div className="related-actions">
        <h2 className="section-title">Related Actions</h2>
        <div className="action-buttons-grid">
          <button 
            className="action-button"
            onClick={() => navigate(`/units?site_id=${site.id}`)}
          >
            <span className="action-icon">🏠</span>
            <div>
              <div className="action-title">View Units</div>
              <div className="action-description">Manage units in this site</div>
            </div>
          </button>
          <button 
            className="action-button"
            onClick={() => navigate(`/projects/${site.project_id}`)}
          >
            <span className="action-icon">📊</span>
            <div>
              <div className="action-title">View Project</div>
              <div className="action-description">Go to parent project</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SiteDetails;
