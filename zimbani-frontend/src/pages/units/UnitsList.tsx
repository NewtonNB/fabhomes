import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { MdVisibility, MdEdit, MdDelete, MdCheckCircle, MdWarning } from 'react-icons/md';
import { unitService } from '../../services/unit.service';
import { Unit, UnitFilters } from '../../types/unit.types';
import { PaginationMeta } from '../../types/common.types';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import './UnitsList.css';

const UnitsList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const isPlots = location.pathname.startsWith('/plots');
  const [units, setUnits] = useState<Unit[]>([]);
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

  const [filters, setFilters] = useState<UnitFilters>({
    search: '',
    site_id: searchParams.get('site_id') || undefined,
    unit_type: undefined,
    status: undefined,
    page: 1,
    per_page: 15
  });

  // Soft Replies & Confirm Modal States
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchUnits();
  }, [filters]);

  const fetchUnits = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await unitService.getUnits(filters);
      setUnits(response.data);
      setPagination(response.meta);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch units');
      console.error('Error fetching units:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFilters({ ...filters, page: 1 });
  };

  const handleConfirmDelete = async () => {
    if (!unitToDelete) return;

    setDeletingUnit(true);
    try {
      await unitService.deleteUnit(unitToDelete.uuid || String(unitToDelete.id));
      setActionFeedback({
        type: 'success',
        message: `${isPlots ? 'Plot' : 'Unit'} "${unitToDelete.unit_number}" was deleted successfully.`,
      });
      setUnitToDelete(null);
      fetchUnits();
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to delete unit. It may be attached to active sales or reservations.',
      });
    } finally {
      setDeletingUnit(false);
    }
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  const getStatusBadgeClass = (status: string) => {
    const statusClasses: { [key: string]: string } = {
      'available': 'badge-success',
      'reserved': 'badge-warning',
      'sold': 'badge-info',
      'under_construction': 'badge-secondary',
      'completed': 'badge-success',
      'on_hold': 'badge-warning',
      'cancelled': 'badge-danger',
      'maintenance': 'badge-warning',
      'defect_liability': 'badge-info'
    };
    return `badge ${statusClasses[status] || 'badge-secondary'}`;
  };

  const formatStatus = (status: string) => {
    if (status === 'planned') return 'Draft / Planned';
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

  if (loading && units.length === 0) {
    return <div className="loading">Loading units...</div>;
  }

  return (
    <div className="units-list-container">
      <div className="page-header">
        <div>
          <h1>{isPlots ? 'Plots & Estate Allocations' : 'Units Management'}</h1>
          <p className="page-description">{isPlots ? 'Manage land parcels, demarcations, reservation statuses, and client allocations across Fab Homes estates' : 'Manage property units and inventory'}</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => navigate(isPlots ? '/plots/new' : '/units/new')}
        >
          <span className="icon">+</span> {isPlots ? 'Add New Plot' : 'Add New Unit'}
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
          All {isPlots ? 'Plots' : 'Units'} ({pagination.total || units.length})
        </button>
        <button
          type="button"
          onClick={() => setFilters({ ...filters, status: 'available', page: 1 })}
          style={{
            padding: '7px 14px',
            borderRadius: '20px',
            border: `1px solid ${filters.status === 'available' ? '#16a34a' : '#cbd5e1'}`,
            background: filters.status === 'available' ? '#16a34a' : '#ffffff',
            color: filters.status === 'available' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Available
        </button>
        <button
          type="button"
          onClick={() => setFilters({ ...filters, status: 'planned', page: 1 })}
          style={{
            padding: '7px 14px',
            borderRadius: '20px',
            border: `1px solid ${filters.status === 'planned' ? '#d97706' : '#cbd5e1'}`,
            background: filters.status === 'planned' ? '#d97706' : '#ffffff',
            color: filters.status === 'planned' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Draft / Planned Section
        </button>
        <button
          type="button"
          onClick={() => setFilters({ ...filters, status: 'reserved', page: 1 })}
          style={{
            padding: '7px 14px',
            borderRadius: '20px',
            border: `1px solid ${filters.status === 'reserved' ? '#eab308' : '#cbd5e1'}`,
            background: filters.status === 'reserved' ? '#eab308' : '#ffffff',
            color: filters.status === 'reserved' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Reserved
        </button>
        <button
          type="button"
          onClick={() => setFilters({ ...filters, status: 'sold', page: 1 })}
          style={{
            padding: '7px 14px',
            borderRadius: '20px',
            border: `1px solid ${filters.status === 'sold' ? '#0284c7' : '#cbd5e1'}`,
            background: filters.status === 'sold' ? '#0284c7' : '#ffffff',
            color: filters.status === 'sold' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Sold
        </button>
        <button
          type="button"
          onClick={() => setFilters({ ...filters, status: 'under_construction', page: 1 })}
          style={{
            padding: '7px 14px',
            borderRadius: '20px',
            border: `1px solid ${filters.status === 'under_construction' ? '#64748b' : '#cbd5e1'}`,
            background: filters.status === 'under_construction' ? '#64748b' : '#ffffff',
            color: filters.status === 'under_construction' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Under Construction
        </button>
      </div>

      <div className="filters-card">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-group">
            <input
              type="text"
              placeholder={isPlots ? 'Search plots by number, name, or block...' : 'Search units by number, name, or block...'}
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
            <label>Unit Type</label>
            <select
              value={filters.unit_type || ''}
              onChange={(e) => setFilters({ 
                ...filters, 
                unit_type: e.target.value as Unit['unit_type'] | undefined,
                page: 1 
              })}
              className="filter-select"
            >
              <option value="">All Types</option>
              <option value="apartment">Apartment</option>
              <option value="villa">Villa</option>
              <option value="townhouse">Townhouse</option>
              <option value="penthouse">Penthouse</option>
              <option value="studio">Studio</option>
              <option value="duplex">Duplex</option>
              <option value="maisonette">Maisonette</option>
              <option value="bungalow">Bungalow</option>
              <option value="cottage">Cottage</option>
              <option value="loft">Loft</option>
              <option value="commercial">Commercial</option>
              <option value="office">Office</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters({ 
                ...filters, 
                status: e.target.value as Unit['status'] | undefined,
                page: 1 
              })}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              <option value="sold">Sold</option>
              <option value="under_construction">Under Construction</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
              <option value="cancelled">Cancelled</option>
              <option value="maintenance">Maintenance</option>
              <option value="defect_liability">Defect Liability</option>
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

          {(filters.search || filters.unit_type || filters.status) && (
            <button
              onClick={() => setFilters({ 
                search: '', 
                site_id: undefined,
                unit_type: undefined,
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
          <h2>{isPlots ? 'Plots Inventory' : 'Units List'}</h2>
          <span className="record-count">
            Showing {pagination.from} to {pagination.to} of {pagination.total} {isPlots ? 'plots' : 'units'}
          </span>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>{isPlots ? 'Plot No.' : 'Unit No.'}</th>
                <th>{isPlots ? 'Plot Name' : 'Unit Name'}</th>
                <th>{isPlots ? 'Plot Type' : 'Type'}</th>
                <th>Size</th>
                <th>Bedrooms</th>
                <th>{isPlots ? 'Plot Price' : 'Price'}</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {units.length === 0 ? (
                <tr>
                  <td colSpan={9} className="no-data">
                    {isPlots ? 'No plots found. Click "Add New Plot" to create one.' : 'No units found. Click "Add New Unit" to create one.'}
                  </td>
                </tr>
              ) : (
                units.map((unit, idx) => (
                  <tr key={unit.uuid || unit.id || idx}>
                    <td>
                      <span className="code-badge">{unit.unit_number}</span>
                    </td>
                    <td>
                      <div className="cell-main">{unit.unit_name}</div>
                      {unit.block && (
                        <div className="cell-sub">Block: {unit.block}</div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-secondary">
                        {formatStatus(unit.unit_type)}
                      </span>
                    </td>
                    <td>
                      {unit.floor_area ? (
                        <div>
                          <div className="cell-main">{unit.floor_area}</div>
                          <div className="cell-sub">{unit.area_unit}</div>
                        </div>
                      ) : (
                        <span className="text-muted">N/A</span>
                      )}
                    </td>
                    <td className="text-center">
                      {unit.bedrooms || '-'}
                    </td>
                    <td>
                      <div className="cell-main">
                        {formatCurrency(unit.current_price || 0)}
                      </div>
                    </td>
                    <td>
                      <span className={getStatusBadgeClass(unit.status)}>
                        {formatStatus(unit.status)}
                      </span>
                    </td>
                    <td>
                      <div className="progress-container">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill" 
                            style={{ width: `${unit.completion_percentage || 0}%` }}
                          />
                        </div>
                        <span className="progress-text">
                          {unit.completion_percentage || 0}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => navigate(isPlots ? `/plots/${unit.uuid || unit.id}` : `/units/${unit.uuid || unit.id}`)}
                          className="btn-icon"
                          title="View Details"
                        >
                          <MdVisibility size={18} />
                        </button>
                        <button
                          onClick={() => navigate(isPlots ? `/plots/${unit.uuid || unit.id}/edit` : `/units/${unit.uuid || unit.id}/edit`)}
                          className="btn-icon"
                          title="Edit"
                        >
                          <MdEdit size={18} />
                        </button>
                        <button
                          onClick={() => setUnitToDelete(unit)}
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

      {/* Soft Confirmation Modal for Unit Deletion */}
      <ConfirmDialog
        isOpen={Boolean(unitToDelete)}
        title={`Delete ${isPlots ? 'Plot' : 'Unit'}`}
        message={`Are you sure you want to delete ${isPlots ? 'plot' : 'unit'} "${unitToDelete?.unit_number}"? This will permanently remove the parcel record.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deletingUnit}
        onConfirm={handleConfirmDelete}
        onClose={() => setUnitToDelete(null)}
      />
    </div>
  );
};

export default UnitsList;
