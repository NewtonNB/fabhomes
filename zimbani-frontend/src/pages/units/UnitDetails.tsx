import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { unitService } from '../../services/unit.service';
import ReserveUnitModal from './modals/ReserveUnitModal';
import SellUnitModal from './modals/SellUnitModal';
import UpdateProgressModal from './modals/UpdateProgressModal';
import UpdatePaymentModal from './modals/UpdatePaymentModal';
import UpdateInspectionModal from './modals/UpdateInspectionModal';
import './UnitDetails.css';

// Simple type for unit details (matching backend response)
interface UnitDetailsType {
  id: number;
  uuid: string;
  unit_number: string;
  unit_name: string;
  site_id: number;
  unit_type: string;
  status: string;
  block?: string;
  floor?: number;
  facing?: string;
  floor_area?: number;
  area_unit: string;
  plot_size?: number;
  bedrooms?: number;
  bathrooms?: number;
  parking_spaces?: number;
  balcony_area?: number;
  terrace_area?: number;
  base_price: number;
  current_price: number;
  minimum_price?: number;
  maximum_price?: number;
  price_per_unit_area?: number;
  discount_percentage?: number;
  special_offer?: string;
  completion_percentage: number;
  construction_start_date?: string;
  construction_end_date?: string;
  expected_handover_date?: string;
  warranty_end_date?: string;
  interior_features?: string;
  exterior_features?: string;
  shared_amenities?: string;
  description?: string;
  special_conditions?: string;
  internal_notes?: string;
  client_id?: number;
  amount_paid?: number;
  balance?: number;
  sold_date?: string;
  reserved_date?: string;
  created_at: string;
  updated_at: string;
  site?: {
    id: number;
    site_name: string;
    site_code: string;
  };
  project?: {
    id: number;
    project_name: string;
    project_code: string;
  };
  client?: {
    id: number;
    name: string;
  };
}

const UnitDetails: React.FC = () => {
  const navigate = useNavigate();
  const { uuid } = useParams<{ uuid: string }>();
  const [unit, setUnit] = useState<UnitDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);

  useEffect(() => {
    if (uuid) {
      fetchUnitDetails(uuid);
    }
  }, [uuid]);

  const fetchUnitDetails = async (unitUuid: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await unitService.getByUuid(unitUuid);
      setUnit(data as any);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch unit details');
      console.error('Error fetching unit:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!unit || !window.confirm('Are you sure you want to delete this unit?')) {
      return;
    }

    try {
      await unitService.delete(unit.id);
      navigate('/units');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete unit');
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
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
    return <div className="loading">Loading unit details...</div>;
  }

  if (error || !unit) {
    return (
      <div className="error-container">
        <div className="error-message">
          {error || 'Unit not found'}
        </div>
        <button onClick={() => navigate('/units')} className="btn btn-primary">
          ← Back to Units
        </button>
      </div>
    );
  }

  const canReserve = unit.status === 'available' || unit.status === 'completed';
  const canSell = unit.status === 'available' || unit.status === 'reserved' || unit.status === 'completed';
  const canUpdateProgress = unit.status === 'under_construction' || unit.status === 'completed';
  const canUpdatePayment = unit.status === 'sold' && (unit.balance ?? 0) > 0;
  const isSoldOrReserved = unit.status === 'sold' || unit.status === 'reserved';

  return (
    <div className="unit-details-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="header-breadcrumb">
            <span className="breadcrumb-link" onClick={() => navigate('/units')}>
              Units
            </span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">{unit.unit_name}</span>
          </div>
          <h1>{unit.unit_name}</h1>
          <div className="header-meta">
            <span className="code-badge">{unit.unit_number}</span>
            <span className={getStatusBadgeClass(unit.status)}>
              {formatStatus(unit.status)}
            </span>
            <span className="badge badge-secondary">
              {formatStatus(unit.unit_type)}
            </span>
          </div>
        </div>
        <div className="header-actions">
          <button 
            onClick={() => navigate(`/units/${unit.uuid}/edit`)}
            className="btn btn-primary"
          >
            ✏️ Edit Unit
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
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-label">Current Price</div>
            <div className="stat-value">{formatCurrency(unit.current_price)}</div>
            {unit.price_per_unit_area && (
              <div className="stat-sub">
                {formatCurrency(unit.price_per_unit_area)}/{unit.area_unit}
              </div>
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-label">Completion Progress</div>
            <div className="stat-value">{unit.completion_percentage}%</div>
            <div className="progress-bar-small">
              <div 
                className="progress-fill-small" 
                style={{ width: `${unit.completion_percentage}%` }}
              />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📏</div>
          <div className="stat-content">
            <div className="stat-label">Floor Area</div>
            <div className="stat-value">
              {unit.floor_area ? `${unit.floor_area} ${unit.area_unit}` : 'N/A'}
            </div>
            {unit.bedrooms !== undefined && (
              <div className="stat-sub">{unit.bedrooms} BD • {unit.bathrooms || 0} BA</div>
            )}
          </div>
        </div>

        {unit.status === 'sold' && (
          <div className="stat-card">
            <div className="stat-icon">💳</div>
            <div className="stat-content">
              <div className="stat-label">Payment Status</div>
              <div className="stat-value">
                {unit.balance === 0 ? 'Fully Paid' : formatCurrency(unit.balance ?? 0)}
              </div>
              {unit.balance !== 0 && <div className="stat-sub">Balance Remaining</div>}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2 className="section-title">Quick Actions</h2>
        <div className="action-buttons-grid">
          {canReserve && (
            <button 
              className="action-button action-reserve"
              onClick={() => setShowReserveModal(true)}
            >
              <span className="action-icon">🔒</span>
              <div>
                <div className="action-title">Reserve Unit</div>
                <div className="action-description">Reserve for a client</div>
              </div>
            </button>
          )}
          
          {canSell && (
            <button 
              className="action-button action-sell"
              onClick={() => setShowSellModal(true)}
            >
              <span className="action-icon">✅</span>
              <div>
                <div className="action-title">Sell Unit</div>
                <div className="action-description">Complete sale to client</div>
              </div>
            </button>
          )}
          
          {canUpdateProgress && (
            <button 
              className="action-button"
              onClick={() => setShowProgressModal(true)}
            >
              <span className="action-icon">🏗️</span>
              <div>
                <div className="action-title">Update Progress</div>
                <div className="action-description">Update construction status</div>
              </div>
            </button>
          )}
          
          {canUpdatePayment && (
            <button 
              className="action-button action-payment"
              onClick={() => setShowPaymentModal(true)}
            >
              <span className="action-icon">💵</span>
              <div>
                <div className="action-title">Record Payment</div>
                <div className="action-description">Add client payment</div>
              </div>
            </button>
          )}
          
          <button 
            className="action-button"
            onClick={() => setShowInspectionModal(true)}
          >
            <span className="action-icon">🔍</span>
            <div>
              <div className="action-title">Record Inspection</div>
              <div className="action-description">Log inspection details</div>
            </div>
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="content-grid">
        {/* Basic Information */}
        <div className="info-section">
          <h2 className="section-title">Basic Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Unit Number</span>
              <span className="info-value">{unit.unit_number}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Unit Name</span>
              <span className="info-value">{unit.unit_name}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Site</span>
              <span className="info-value">
                {unit.site ? (
                  <span 
                    className="link-value"
                    onClick={() => navigate(`/sites/${unit.site_id}`)}
                  >
                    {unit.site.site_name}
                  </span>
                ) : 'N/A'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Unit Type</span>
              <span className="badge badge-secondary">
                {formatStatus(unit.unit_type)}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Status</span>
              <span className={getStatusBadgeClass(unit.status)}>
                {formatStatus(unit.status)}
              </span>
            </div>
            {unit.block && (
              <div className="info-item">
                <span className="info-label">Block</span>
                <span className="info-value">{unit.block}</span>
              </div>
            )}
            {unit.floor !== undefined && (
              <div className="info-item">
                <span className="info-label">Floor</span>
                <span className="info-value">{unit.floor}</span>
              </div>
            )}
            {unit.facing && (
              <div className="info-item">
                <span className="info-label">Facing</span>
                <span className="info-value">{formatStatus(unit.facing)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Specifications */}
        <div className="info-section">
          <h2 className="section-title">Specifications</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Floor Area</span>
              <span className="info-value">
                {unit.floor_area ? `${unit.floor_area} ${unit.area_unit}` : 'Not specified'}
              </span>
            </div>
            {unit.plot_size && (
              <div className="info-item">
                <span className="info-label">Plot Size</span>
                <span className="info-value">{unit.plot_size} {unit.area_unit}</span>
              </div>
            )}
            {unit.bedrooms !== undefined && (
              <div className="info-item">
                <span className="info-label">Bedrooms</span>
                <span className="info-value">{unit.bedrooms}</span>
              </div>
            )}
            {unit.bathrooms !== undefined && (
              <div className="info-item">
                <span className="info-label">Bathrooms</span>
                <span className="info-value">{unit.bathrooms}</span>
              </div>
            )}
            {unit.parking_spaces !== undefined && (
              <div className="info-item">
                <span className="info-label">Parking Spaces</span>
                <span className="info-value">{unit.parking_spaces}</span>
              </div>
            )}
            {unit.balcony_area && (
              <div className="info-item">
                <span className="info-label">Balcony Area</span>
                <span className="info-value">{unit.balcony_area} sqm</span>
              </div>
            )}
            {unit.terrace_area && (
              <div className="info-item">
                <span className="info-label">Terrace Area</span>
                <span className="info-value">{unit.terrace_area} sqm</span>
              </div>
            )}
          </div>
        </div>

        {/* Pricing Information */}
        <div className="info-section full-width">
          <h2 className="section-title">Pricing Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Base Price</span>
              <span className="info-value">{formatCurrency(unit.base_price)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Current Price</span>
              <span className="info-value highlight">{formatCurrency(unit.current_price)}</span>
            </div>
            {unit.minimum_price && (
              <div className="info-item">
                <span className="info-label">Minimum Price</span>
                <span className="info-value">{formatCurrency(unit.minimum_price)}</span>
              </div>
            )}
            {unit.maximum_price && (
              <div className="info-item">
                <span className="info-label">Maximum Price</span>
                <span className="info-value">{formatCurrency(unit.maximum_price)}</span>
              </div>
            )}
            {unit.price_per_unit_area && (
              <div className="info-item">
                <span className="info-label">Price Per {unit.area_unit}</span>
                <span className="info-value">{formatCurrency(unit.price_per_unit_area)}</span>
              </div>
            )}
            {unit.discount_percentage && (
              <div className="info-item">
                <span className="info-label">Discount</span>
                <span className="info-value">{unit.discount_percentage}%</span>
              </div>
            )}
          </div>
          {unit.special_offer && (
            <div className="special-offer-box">
              <strong>Special Offer:</strong> {unit.special_offer}
            </div>
          )}
        </div>

        {/* Client & Payment Information (if sold/reserved) */}
        {isSoldOrReserved && (
          <div className="info-section full-width highlight-section">
            <h2 className="section-title">
              {unit.status === 'sold' ? 'Sale Information' : 'Reservation Information'}
            </h2>
            <div className="info-grid">
              {unit.client && (
                <div className="info-item">
                  <span className="info-label">Client</span>
                  <span className="info-value link-value">{unit.client.name}</span>
                </div>
              )}
              {unit.sold_date && (
                <div className="info-item">
                  <span className="info-label">Sale Date</span>
                  <span className="info-value">{formatDate(unit.sold_date)}</span>
                </div>
              )}
              {unit.reserved_date && (
                <div className="info-item">
                  <span className="info-label">Reserved Date</span>
                  <span className="info-value">{formatDate(unit.reserved_date)}</span>
                </div>
              )}
              {unit.status === 'sold' && (
                <>
                  <div className="info-item">
                    <span className="info-label">Amount Paid</span>
                    <span className="info-value">{formatCurrency(unit.amount_paid ?? 0)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Balance</span>
                    <span className="info-value highlight">
                      {formatCurrency(unit.balance ?? 0)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Construction Details */}
        <div className="info-section">
          <h2 className="section-title">Construction Details</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Completion</span>
              <span className="info-value">{unit.completion_percentage}%</span>
            </div>
            {unit.construction_start_date && (
              <div className="info-item">
                <span className="info-label">Start Date</span>
                <span className="info-value">{formatDate(unit.construction_start_date)}</span>
              </div>
            )}
            {unit.construction_end_date && (
              <div className="info-item">
                <span className="info-label">End Date</span>
                <span className="info-value">{formatDate(unit.construction_end_date)}</span>
              </div>
            )}
            {unit.expected_handover_date && (
              <div className="info-item">
                <span className="info-label">Expected Handover</span>
                <span className="info-value">{formatDate(unit.expected_handover_date)}</span>
              </div>
            )}
            {unit.warranty_end_date && (
              <div className="info-item">
                <span className="info-label">Warranty End</span>
                <span className="info-value">{formatDate(unit.warranty_end_date)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Features */}
        {(unit.interior_features || unit.exterior_features || unit.shared_amenities) && (
          <div className="info-section full-width">
            <h2 className="section-title">Features & Amenities</h2>
            {unit.interior_features && (
              <div className="features-section">
                <h3>Interior Features</h3>
                <p>{unit.interior_features}</p>
              </div>
            )}
            {unit.exterior_features && (
              <div className="features-section">
                <h3>Exterior Features</h3>
                <p>{unit.exterior_features}</p>
              </div>
            )}
            {unit.shared_amenities && (
              <div className="features-section">
                <h3>Shared Amenities</h3>
                <p>{unit.shared_amenities}</p>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {unit.description && (
          <div className="info-section full-width">
            <h2 className="section-title">Description</h2>
            <div className="description-content">
              {unit.description}
            </div>
          </div>
        )}

        {/* Special Conditions */}
        {unit.special_conditions && (
          <div className="info-section full-width">
            <h2 className="section-title">Special Conditions</h2>
            <div className="conditions-content">
              {unit.special_conditions}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="info-section full-width">
          <h2 className="section-title">Record Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Created</span>
              <span className="info-value">{formatDate(unit.created_at)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Last Updated</span>
              <span className="info-value">{formatDate(unit.updated_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ReserveUnitModal
        isOpen={showReserveModal}
        onClose={() => setShowReserveModal(false)}
        unitUuid={unit.uuid}
        onSuccess={() => fetchUnitDetails(unit.uuid)}
      />
      
      <SellUnitModal
        isOpen={showSellModal}
        onClose={() => setShowSellModal(false)}
        unitUuid={unit.uuid}
        currentPrice={unit.current_price}
        onSuccess={() => fetchUnitDetails(unit.uuid)}
      />
      
      <UpdateProgressModal
        isOpen={showProgressModal}
        onClose={() => setShowProgressModal(false)}
        unitUuid={unit.uuid}
        currentProgress={unit.completion_percentage}
        onSuccess={() => fetchUnitDetails(unit.uuid)}
      />
      
      <UpdatePaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        unitUuid={unit.uuid}
        currentBalance={unit.balance ?? 0}
        onSuccess={() => fetchUnitDetails(unit.uuid)}
      />
      
      <UpdateInspectionModal
        isOpen={showInspectionModal}
        onClose={() => setShowInspectionModal(false)}
        unitUuid={unit.uuid}
        onSuccess={() => fetchUnitDetails(unit.uuid)}
      />
    </div>
  );
};

export default UnitDetails;
