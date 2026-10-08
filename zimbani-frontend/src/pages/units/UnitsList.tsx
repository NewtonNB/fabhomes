import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { unitService } from '../../services/unit.service';
import { Unit, UnitFilters } from '../../types/unit.types';
import { PaginationMeta } from '../../types/common.types';
import './UnitsList.css';

const UnitsList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
    site_id: searchParams.get('site_id') ? Number(searchParams.get('site_id')) : undefined,
    unit_type: undefined,
    status: undefined,
    page: 1,
    per_page: 15
  });

  useEffect(() => {
    fetchUnits();
  }, [filters]);

  const fetchUnits = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await unitService.getAll(filters);
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

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this unit?')) {
      return;
    }

    try {
      await unitService.delete(id);
      fetchUnits();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete unit');
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
          <h1>Units Management</h1>
          <p className="page-description">Manage property units and inventory</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/units/new')}
        >
          <span className="icon">+</span> Add New Unit
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
              placeholder="Search units by number, name, or block..."
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
          <h2>Units List</h2>
          <span className="record-count">
            Showing {pagination.from} to {pagination.to} of {pagination.total} units
          </span>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Unit No.</th>
                <th>Unit Name</th>
                <th>Type</th>
                <th>Size</th>
                <th>Bedrooms</th>
                <th>Price</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {units.length === 0 ? (
                <tr>
                  <td colSpan={9} className="no-data">
                    No units found. Click "Add New Unit" to create one.
                  </td>
                </tr>
              ) : (
                units.map((unit) => (
                  <tr key={unit.id}>
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
                        {formatCurrency(unit.current_price)}
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
                          onClick={() => navigate(`/units/${unit.uuid}`)}
                          className="btn-icon"
                          title="View Details"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => navigate(`/units/${unit.uuid}/edit`)}
                          className="btn-icon"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(unit.id)}
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

export default UnitsList;
