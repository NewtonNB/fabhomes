import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { siteService } from '../../services/site.service';
import { Site, SiteFilters } from '../../types/site.types';
import { PaginationMeta } from '../../types/common.types';
import './SitesList.css';

const SitesList: React.FC = () => {
  const navigate = useNavigate();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
    from: 0,
    to: 0
  });

  const [filters, setFilters] = useState<SiteFilters>({
    search: '',
    project_id: undefined,
    status: undefined,
    page: 1,
    per_page: 15
  });

  useEffect(() => {
    fetchSites();
  }, [filters]);

  const fetchSites = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await siteService.getAll(filters);
      setSites(response.data);
      setPagination(response.meta);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch sites');
      console.error('Error fetching sites:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFilters({ ...filters, page: 1 });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this site?')) {
      return;
    }

    try {
      await siteService.delete(id);
      fetchSites();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete site');
    }
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
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

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading && sites.length === 0) {
    return <div className="loading">Loading sites...</div>;
  }

  return (
    <div className="sites-list-container">
      <div className="page-header">
        <div>
          <h1>Sites Management</h1>
          <p className="page-description">Manage project sites and locations</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/sites/new')}
        >
          <span className="icon">+</span> Add New Site
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError(null)} className="alert-close">×</button>
        </div>
      )}

      <div className="filters-card">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-group">
            <input
              type="text"
              placeholder="Search sites by name, code, or location..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="search-input"
            />
            <button type="submit" className="btn btn-secondary">
              Search
            </button>
          </div>
        </form>

        <div className="filters-row">
          <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters({ 
                ...filters, 
                status: e.target.value as Site['status'] | undefined,
                page: 1 
              })}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Per Page</label>
            <select
              value={filters.per_page}
              onChange={(e) => setFilters({ 
                ...filters, 
                per_page: Number(e.target.value),
                page: 1 
              })}
              className="filter-select"
            >
              <option value="10">10</option>
              <option value="15">15</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </div>

          {(filters.search || filters.status) && (
            <button
              onClick={() => setFilters({ 
                search: '', 
                project_id: undefined,
                status: undefined, 
                page: 1, 
                per_page: 15 
              })}
              className="btn btn-ghost"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="table-card">
        <div className="table-header">
          <h2>Sites List</h2>
          <span className="record-count">
            Showing {pagination.from} to {pagination.to} of {pagination.total} sites
          </span>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Site Code</th>
                <th>Site Name</th>
                <th>Project</th>
                <th>Location</th>
                <th>Size</th>
                <th>Total Units</th>
                <th>Site Value</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sites.length === 0 ? (
                <tr>
                  <td colSpan={9} className="no-data">
                    No sites found. Click "Add New Site" to create one.
                  </td>
                </tr>
              ) : (
                sites.map((site) => (
                  <tr key={site.id}>
                    <td>
                      <span className="code-badge">{site.site_code}</span>
                    </td>
                    <td>
                      <div className="cell-main">{site.site_name}</div>
                    </td>
                    <td>
                      <div className="cell-sub">{site.project?.project_name || 'N/A'}</div>
                    </td>
                    <td>
                      <div className="cell-main">{site.location}</div>
                      {site.gps_coordinates && (
                        <div className="cell-sub">{site.gps_coordinates}</div>
                      )}
                    </td>
                    <td>
                      {site.site_size ? (
                        <div>
                          <div className="cell-main">{site.site_size}</div>
                          <div className="cell-sub">{site.size_unit}</div>
                        </div>
                      ) : (
                        <span className="text-muted">N/A</span>
                      )}
                    </td>
                    <td>
                      <div className="text-center">
                        <span className="badge badge-info">{site.total_units || 0}</span>
                      </div>
                    </td>
                    <td>
                      <div className="cell-main">
                        {formatCurrency(site.total_site_value)}
                      </div>
                    </td>
                    <td>
                      <span className={getStatusBadgeClass(site.status)}>
                        {formatStatus(site.status)}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => navigate(`/sites/${site.id}`)}
                          className="btn-icon"
                          title="View Details"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => navigate(`/sites/${site.id}/edit`)}
                          className="btn-icon"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(site.id)}
                          className="btn-icon btn-icon-danger"
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

        {pagination.last_page > 1 && (
          <div className="pagination">
            <button
              onClick={() => handlePageChange(pagination.current_page - 1)}
              disabled={pagination.current_page === 1}
              className="btn btn-secondary"
            >
              Previous
            </button>
            
            <div className="pagination-info">
              Page {pagination.current_page} of {pagination.last_page}
            </div>

            <button
              onClick={() => handlePageChange(pagination.current_page + 1)}
              disabled={pagination.current_page === pagination.last_page}
              className="btn btn-secondary"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SitesList;
