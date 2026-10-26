import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MdVisibility, MdEdit, MdDelete, MdCheckCircle, MdWarning } from 'react-icons/md';
import { siteService } from '../../services/site.service';
import { Site, SiteFilters } from '../../types/site.types';
import { PaginationMeta } from '../../types/common.types';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import './SitesList.css';

const SitesList: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isEstates = location.pathname.startsWith('/estates');
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

  // Soft Replies & Confirm Modal States
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);
  const [deletingSite, setDeletingSite] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchSites();
  }, [filters]);

  const fetchSites = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await siteService.getSites(filters);
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

  const handleConfirmDelete = async () => {
    if (!siteToDelete) return;

    setDeletingSite(true);
    try {
      await siteService.deleteSite(String(siteToDelete.id));
      setActionFeedback({
        type: 'success',
        message: `${isEstates ? 'Estate' : 'Site'} "${siteToDelete.name}" (${siteToDelete.site_code}) was deleted successfully.`,
      });
      setSiteToDelete(null);
      fetchSites();
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to delete site. It may have linked active units.',
      });
    } finally {
      setDeletingSite(false);
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
    if (status === 'planning') return 'Draft / Planning';
    if (status === 'preparation') return 'Preparation';
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
          <h1>{isEstates ? 'Estates & Land Developments' : 'Sites Management'}</h1>
          <p className="page-description">{isEstates ? 'Manage Fab Homes estates, acreage zonings, cadastral locations, and masterplans' : 'Manage project sites and locations'}</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => navigate(isEstates ? '/estates/new' : '/sites/new')}
        >
          <span className="icon">+</span> {isEstates ? 'Add New Estate' : 'Add New Site'}
        </button>
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

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError(null)} className="alert-close">×</button>
        </div>
      )}

      {/* Category / Status & Draft Filter Chips */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={() => setFilters({ ...filters, status: undefined, page: 1 })}
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
          All {isEstates ? 'Estates' : 'Sites'} ({pagination.total || sites.length})
        </button>
        <button
          type="button"
          onClick={() => setFilters({ ...filters, status: 'active', page: 1 })}
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
          onClick={() => setFilters({ ...filters, status: 'planning', page: 1 })}
          style={{
            padding: '7px 14px',
            borderRadius: '20px',
            border: `1px solid ${filters.status === 'planning' ? '#d97706' : '#cbd5e1'}`,
            background: filters.status === 'planning' ? '#d97706' : '#ffffff',
            color: filters.status === 'planning' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Draft / Planning Section
        </button>
        <button
          type="button"
          onClick={() => setFilters({ ...filters, status: 'on_hold', page: 1 })}
          style={{
            padding: '7px 14px',
            borderRadius: '20px',
            border: `1px solid ${filters.status === 'on_hold' ? '#64748b' : '#cbd5e1'}`,
            background: filters.status === 'on_hold' ? '#64748b' : '#ffffff',
            color: filters.status === 'on_hold' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          On Hold
        </button>
        <button
          type="button"
          onClick={() => setFilters({ ...filters, status: 'completed', page: 1 })}
          style={{
            padding: '7px 14px',
            borderRadius: '20px',
            border: `1px solid ${filters.status === 'completed' ? '#0284c7' : '#cbd5e1'}`,
            background: filters.status === 'completed' ? '#0284c7' : '#ffffff',
            color: filters.status === 'completed' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Completed
        </button>
      </div>

      <div className="filters-card">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-group">
            <input
              type="text"
              placeholder={isEstates ? "Search estates by name, code, or location..." : "Search sites by name, code, or location..."}
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
          <h2>{isEstates ? 'Estates Directory' : 'Sites List'}</h2>
          <span className="record-count">
            Showing {pagination.from} to {pagination.to} of {pagination.total} {isEstates ? 'estates' : 'sites'}
          </span>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>{isEstates ? 'Estate Code' : 'Site Code'}</th>
                <th>{isEstates ? 'Estate Name' : 'Site Name'}</th>
                <th>Project</th>
                <th>Location</th>
                <th>Size</th>
                <th>{isEstates ? 'Total Plots' : 'Total Units'}</th>
                <th>{isEstates ? 'Estate Value' : 'Site Value'}</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sites.length === 0 ? (
                <tr>
                  <td colSpan={9} className="no-data">
                    {isEstates ? 'No estates found. Click "Add New Estate" to create one.' : 'No sites found. Click "Add New Site" to create one.'}
                  </td>
                </tr>
              ) : (
                sites.map((site, idx) => (
                  <tr key={site.id ?? (site as any).uuid ?? idx}>
                    <td>
                      <span className="code-badge">{site.site_code}</span>
                    </td>
                    <td>
                      <div className="cell-main">{site.site_name}</div>
                    </td>
                    <td>
                      <div className="cell-sub">{(site.project as any)?.project_name || site.project?.name || 'N/A'}</div>
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
                        {formatCurrency(site.total_site_value || 0)}
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
                          onClick={() => navigate(isEstates ? `/estates/${site.id}` : `/sites/${site.id}`)}
                          className="btn-icon"
                          title="View Details"
                        >
                          <MdVisibility size={18} />
                        </button>
                        <button
                          onClick={() => navigate(isEstates ? `/estates/${site.id}/edit` : `/sites/${site.id}/edit`)}
                          className="btn-icon"
                          title="Edit"
                        >
                          <MdEdit size={18} />
                        </button>
                        <button
                          onClick={() => setSiteToDelete(site)}
                          className="btn-icon btn-icon-danger"
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

      {/* Soft Confirmation Modal for Deletion */}
      <ConfirmDialog
        isOpen={Boolean(siteToDelete)}
        title={`Delete ${isEstates ? 'Estate' : 'Site'}`}
        message={`Are you sure you want to delete "${siteToDelete?.name}" (${siteToDelete?.site_code})? This will permanently remove the record and unlink associated units.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deletingSite}
        onConfirm={handleConfirmDelete}
        onClose={() => setSiteToDelete(null)}
      />
    </div>
  );
};

export default SitesList;
