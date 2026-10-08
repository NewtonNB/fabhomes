import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { unitService } from '../../services/unit.service';
import { siteService } from '../../services/site.service';
import { Unit, CreateUnitData, UpdateUnitData } from '../../types/unit.types';
import { Site } from '../../types/site.types';
import './UnitForm.css';

const UnitForm: React.FC = () => {
  const navigate = useNavigate();
  const { uuid } = useParams<{ uuid: string }>();
  const isEditMode = Boolean(uuid);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [sites, setSites] = useState<Site[]>([]);

  const [formData, setFormData] = useState<CreateUnitData | UpdateUnitData>({
    unit_number: '',
    unit_name: '',
    site_id: 0,
    unit_type: 'apartment',
    block: undefined,
    floor: undefined,
    facing: undefined,
    floor_area: undefined,
    area_unit: 'sqm',
    plot_size: undefined,
    bedrooms: undefined,
    bathrooms: undefined,
    parking_spaces: undefined,
    balcony_area: undefined,
    terrace_area: undefined,
    base_price: 0,
    current_price: 0,
    minimum_price: undefined,
    maximum_price: undefined,
    price_per_unit_area: undefined,
    discount_percentage: undefined,
    special_offer: undefined,
    status: 'available',
    completion_percentage: 0,
    construction_start_date: undefined,
    construction_end_date: undefined,
    expected_handover_date: undefined,
    warranty_end_date: undefined,
    interior_features: undefined,
    exterior_features: undefined,
    shared_amenities: undefined,
    description: undefined,
    special_conditions: undefined,
    internal_notes: undefined
  });

  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string[] }>({});

  useEffect(() => {
    fetchSites();
    if (isEditMode && uuid) {
      fetchUnit(uuid);
    }
  }, [uuid]);

  const fetchSites = async () => {
    try {
      const response = await siteService.getAll({ per_page: 1000 });
      setSites(response.data);
    } catch (err) {
      console.error('Error fetching sites:', err);
    }
  };

  const fetchUnit = async (unitUuid: string) => {
    try {
      setLoadingData(true);
      const unit = await unitService.getByUuid(unitUuid);
      
      setFormData({
        unit_number: unit.unit_number,
        unit_name: unit.unit_name,
        site_id: unit.site_id,
        unit_type: unit.unit_type,
        block: unit.block,
        floor: unit.floor,
        facing: unit.facing,
        floor_area: unit.floor_area,
        area_unit: unit.area_unit,
        plot_size: unit.plot_size,
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        parking_spaces: unit.parking_spaces,
        balcony_area: unit.balcony_area,
        terrace_area: unit.terrace_area,
        base_price: unit.base_price,
        current_price: unit.current_price,
        minimum_price: unit.minimum_price,
        maximum_price: unit.maximum_price,
        price_per_unit_area: unit.price_per_unit_area,
        discount_percentage: unit.discount_percentage,
        special_offer: unit.special_offer,
        status: unit.status,
        completion_percentage: unit.completion_percentage,
        construction_start_date: unit.construction_start_date,
        construction_end_date: unit.construction_end_date,
        expected_handover_date: unit.expected_handover_date,
        warranty_end_date: unit.warranty_end_date,
        interior_features: unit.interior_features,
        exterior_features: unit.exterior_features,
        shared_amenities: unit.shared_amenities,
        description: unit.description,
        special_conditions: unit.special_conditions,
        internal_notes: unit.internal_notes
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch unit details');
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
    } else if (type === 'date') {
      processedValue = value === '' ? undefined : value;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));

    // Auto-calculate price per unit area
    if (name === 'current_price' || name === 'floor_area') {
      const price = name === 'current_price' ? Number(value) : formData.current_price;
      const area = name === 'floor_area' ? Number(value) : formData.floor_area;
      
      if (price && area && area > 0) {
        setFormData(prev => ({
          ...prev,
          price_per_unit_area: Math.round(price / area)
        }));
      }
    }

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
      if (isEditMode && uuid) {
        await unitService.update(uuid, formData as UpdateUnitData);
      } else {
        await unitService.create(formData as CreateUnitData);
      }
      navigate('/units');
    } catch (err: any) {
      if (err.response?.data?.errors) {
        setValidationErrors(err.response.data.errors);
      } else {
        setError(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} unit`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return <div className="loading">Loading unit details...</div>;
  }

  return (
    <div className="unit-form-container">
      <div className="page-header">
        <div>
          <h1>{isEditMode ? 'Edit Unit' : 'Create New Unit'}</h1>
          <p className="page-description">
            {isEditMode ? 'Update unit information' : 'Add a new unit to a site'}
          </p>
        </div>
        <button 
          onClick={() => navigate('/units')}
          className="btn btn-secondary"
        >
          ← Back to Units
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError(null)} className="alert-close">×</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="unit-form">
        {/* Basic Information Section */}
        <div className="form-section">
          <h2 className="section-title">Basic Information</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="unit_number">
                Unit Number <span className="required">*</span>
              </label>
              <input
                type="text"
                id="unit_number"
                name="unit_number"
                value={formData.unit_number}
                onChange={handleChange}
                className={validationErrors.unit_number ? 'error' : ''}
                placeholder="e.g., A-101"
                required
              />
              {validationErrors.unit_number && (
                <span className="error-message">{validationErrors.unit_number[0]}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="unit_name">
                Unit Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="unit_name"
                name="unit_name"
                value={formData.unit_name}
                onChange={handleChange}
                className={validationErrors.unit_name ? 'error' : ''}
                placeholder="e.g., Luxury 3-Bedroom Apartment"
                required
              />
              {validationErrors.unit_name && (
                <span className="error-message">{validationErrors.unit_name[0]}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="site_id">
                Site <span className="required">*</span>
              </label>
              <select
                id="site_id"
                name="site_id"
                value={formData.site_id}
                onChange={handleChange}
                className={validationErrors.site_id ? 'error' : ''}
                required
              >
                <option value="">Select Site</option>
                {sites.map(site => (
                  <option key={site.id} value={site.id}>
                    {site.site_name}
                  </option>
                ))}
              </select>
              {validationErrors.site_id && (
                <span className="error-message">{validationErrors.site_id[0]}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="unit_type">
                Unit Type <span className="required">*</span>
              </label>
              <select
                id="unit_type"
                name="unit_type"
                value={formData.unit_type}
                onChange={handleChange}
                required
              >
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

            <div className="form-group">
              <label htmlFor="block">Block</label>
              <input
                type="text"
                id="block"
                name="block"
                value={formData.block || ''}
                onChange={handleChange}
                placeholder="e.g., Block A"
              />
            </div>

            <div className="form-group">
              <label htmlFor="floor">Floor</label>
              <input
                type="number"
                id="floor"
                name="floor"
                value={formData.floor || ''}
                onChange={handleChange}
                min="0"
                placeholder="e.g., 5"
              />
            </div>

            <div className="form-group">
              <label htmlFor="facing">Facing Direction</label>
              <select
                id="facing"
                name="facing"
                value={formData.facing || ''}
                onChange={handleChange}
              >
                <option value="">Select Direction</option>
                <option value="north">North</option>
                <option value="south">South</option>
                <option value="east">East</option>
                <option value="west">West</option>
                <option value="north_east">North East</option>
                <option value="north_west">North West</option>
                <option value="south_east">South East</option>
                <option value="south_west">South West</option>
              </select>
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
          </div>
        </div>

        {/* Size & Specifications Section */}
        <div className="form-section">
          <h2 className="section-title">Size & Specifications</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="floor_area">Floor Area</label>
              <input
                type="number"
                id="floor_area"
                name="floor_area"
                value={formData.floor_area || ''}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="e.g., 120.5"
              />
            </div>

            <div className="form-group">
              <label htmlFor="area_unit">Area Unit</label>
              <select
                id="area_unit"
                name="area_unit"
                value={formData.area_unit}
                onChange={handleChange}
              >
                <option value="sqm">Square Meters (sqm)</option>
                <option value="sqft">Square Feet (sqft)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="plot_size">Plot Size (if applicable)</label>
              <input
                type="number"
                id="plot_size"
                name="plot_size"
                value={formData.plot_size || ''}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="e.g., 250"
              />
            </div>

            <div className="form-group">
              <label htmlFor="bedrooms">Bedrooms</label>
              <input
                type="number"
                id="bedrooms"
                name="bedrooms"
                value={formData.bedrooms || ''}
                onChange={handleChange}
                min="0"
                placeholder="e.g., 3"
              />
            </div>

            <div className="form-group">
              <label htmlFor="bathrooms">Bathrooms</label>
              <input
                type="number"
                id="bathrooms"
                name="bathrooms"
                value={formData.bathrooms || ''}
                onChange={handleChange}
                min="0"
                step="0.5"
                placeholder="e.g., 2.5"
              />
            </div>

            <div className="form-group">
              <label htmlFor="parking_spaces">Parking Spaces</label>
              <input
                type="number"
                id="parking_spaces"
                name="parking_spaces"
                value={formData.parking_spaces || ''}
                onChange={handleChange}
                min="0"
                placeholder="e.g., 2"
              />
            </div>

            <div className="form-group">
              <label htmlFor="balcony_area">Balcony Area (sqm)</label>
              <input
                type="number"
                id="balcony_area"
                name="balcony_area"
                value={formData.balcony_area || ''}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="e.g., 10.5"
              />
            </div>

            <div className="form-group">
              <label htmlFor="terrace_area">Terrace Area (sqm)</label>
              <input
                type="number"
                id="terrace_area"
                name="terrace_area"
                value={formData.terrace_area || ''}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="e.g., 15.0"
              />
            </div>
          </div>
        </div>

        {/* Pricing Information Section */}
        <div className="form-section">
          <h2 className="section-title">Pricing Information</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="base_price">
                Base Price (UGX) <span className="required">*</span>
              </label>
              <input
                type="number"
                id="base_price"
                name="base_price"
                value={formData.base_price}
                onChange={handleChange}
                className={validationErrors.base_price ? 'error' : ''}
                min="0"
                step="0.01"
                placeholder="e.g., 150000000"
                required
              />
              {validationErrors.base_price && (
                <span className="error-message">{validationErrors.base_price[0]}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="current_price">
                Current Price (UGX) <span className="required">*</span>
              </label>
              <input
                type="number"
                id="current_price"
                name="current_price"
                value={formData.current_price}
                onChange={handleChange}
                className={validationErrors.current_price ? 'error' : ''}
                min="0"
                step="0.01"
                placeholder="e.g., 145000000"
                required
              />
              {validationErrors.current_price && (
                <span className="error-message">{validationErrors.current_price[0]}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="minimum_price">Minimum Price (UGX)</label>
              <input
                type="number"
                id="minimum_price"
                name="minimum_price"
                value={formData.minimum_price || ''}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="e.g., 140000000"
              />
            </div>

            <div className="form-group">
              <label htmlFor="maximum_price">Maximum Price (UGX)</label>
              <input
                type="number"
                id="maximum_price"
                name="maximum_price"
                value={formData.maximum_price || ''}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="e.g., 160000000"
              />
            </div>

            <div className="form-group">
              <label htmlFor="price_per_unit_area">
                Price Per Unit Area (auto-calculated)
              </label>
              <input
                type="number"
                id="price_per_unit_area"
                name="price_per_unit_area"
                value={formData.price_per_unit_area || ''}
                readOnly
                className="readonly-field"
                placeholder="Calculated automatically"
              />
              <small className="field-hint">Calculated from Current Price ÷ Floor Area</small>
            </div>

            <div className="form-group">
              <label htmlFor="discount_percentage">Discount Percentage</label>
              <input
                type="number"
                id="discount_percentage"
                name="discount_percentage"
                value={formData.discount_percentage || ''}
                onChange={handleChange}
                min="0"
                max="100"
                step="0.01"
                placeholder="e.g., 5.5"
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="special_offer">Special Offer Details</label>
              <textarea
                id="special_offer"
                name="special_offer"
                value={formData.special_offer || ''}
                onChange={handleChange}
                rows={2}
                placeholder="e.g., Early bird discount, Limited time offer..."
              />
            </div>
          </div>
        </div>

        {/* Construction Details Section */}
        <div className="form-section">
          <h2 className="section-title">Construction Details</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="completion_percentage">
                Completion Percentage <span className="required">*</span>
              </label>
              <input
                type="number"
                id="completion_percentage"
                name="completion_percentage"
                value={formData.completion_percentage}
                onChange={handleChange}
                min="0"
                max="100"
                step="1"
                placeholder="e.g., 75"
                required
              />
              <small className="field-hint">0-100% (auto-changes status to 'completed' at 100%)</small>
            </div>

            <div className="form-group">
              <label htmlFor="construction_start_date">Construction Start Date</label>
              <input
                type="date"
                id="construction_start_date"
                name="construction_start_date"
                value={formData.construction_start_date || ''}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="construction_end_date">Construction End Date</label>
              <input
                type="date"
                id="construction_end_date"
                name="construction_end_date"
                value={formData.construction_end_date || ''}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="expected_handover_date">Expected Handover Date</label>
              <input
                type="date"
                id="expected_handover_date"
                name="expected_handover_date"
                value={formData.expected_handover_date || ''}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="warranty_end_date">Warranty End Date</label>
              <input
                type="date"
                id="warranty_end_date"
                name="warranty_end_date"
                value={formData.warranty_end_date || ''}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Features & Amenities Section */}
        <div className="form-section">
          <h2 className="section-title">Features & Amenities</h2>
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="interior_features">Interior Features</label>
              <textarea
                id="interior_features"
                name="interior_features"
                value={formData.interior_features || ''}
                onChange={handleChange}
                rows={3}
                placeholder="e.g., Ceramic tiles, Built-in wardrobes, Modern kitchen..."
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="exterior_features">Exterior Features</label>
              <textarea
                id="exterior_features"
                name="exterior_features"
                value={formData.exterior_features || ''}
                onChange={handleChange}
                rows={3}
                placeholder="e.g., Private garden, Parking, Security fence..."
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="shared_amenities">Shared Amenities</label>
              <textarea
                id="shared_amenities"
                name="shared_amenities"
                value={formData.shared_amenities || ''}
                onChange={handleChange}
                rows={3}
                placeholder="e.g., Swimming pool, Gym, Playground, Security..."
              />
            </div>
          </div>
        </div>

        {/* Additional Details Section */}
        <div className="form-section">
          <h2 className="section-title">Additional Details</h2>
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description || ''}
                onChange={handleChange}
                rows={4}
                placeholder="Detailed description of the unit..."
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="special_conditions">Special Conditions</label>
              <textarea
                id="special_conditions"
                name="special_conditions"
                value={formData.special_conditions || ''}
                onChange={handleChange}
                rows={3}
                placeholder="e.g., Payment terms, Restrictions, Requirements..."
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="internal_notes">Internal Notes</label>
              <textarea
                id="internal_notes"
                name="internal_notes"
                value={formData.internal_notes || ''}
                onChange={handleChange}
                rows={3}
                placeholder="Internal notes (not visible to clients)..."
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/units')}
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
            {loading ? 'Saving...' : isEditMode ? 'Update Unit' : 'Create Unit'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UnitForm;
