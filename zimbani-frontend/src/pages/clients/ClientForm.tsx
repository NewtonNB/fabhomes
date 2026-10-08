import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MdArrowBack, MdSave } from 'react-icons/md';
import { clientService } from '../../services/client.service';
import { ClientFormData } from '../../types/client.types';
import './ClientForm.css';

const ClientForm: React.FC = () => {
  const navigate = useNavigate();
  const { uuid } = useParams<{ uuid: string }>();
  const isEditMode = Boolean(uuid);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ClientFormData>({
    first_name: '',
    last_name: '',
    phone_primary: '',
    email: '',
    middle_name: '',
    date_of_birth: '',
    gender: 'male',
    phone_secondary: '',
    address_line1: '',
    address_line2: '',
    city: '',
    district: '',
    country: 'Uganda',
    postal_code: '',
    id_type: 'national_id',
    id_number: '',
    id_expiry_date: '',
    nok_name: '',
    nok_relationship: '',
    nok_phone: '',
    nok_address: '',
    status: 'active',
    notes: '',
    tags: [],
  });

  useEffect(() => {
    if (isEditMode && uuid) {
      loadClient(uuid);
    }
  }, [uuid, isEditMode]);

  const loadClient = async (clientUuid: string) => {
    try {
      setLoading(true);
      const client = await clientService.getClient(clientUuid);
      
      setFormData({
        first_name: client.first_name || '',
        last_name: client.last_name || '',
        phone_primary: client.phone_primary || '',
        email: client.email || '',
        middle_name: client.middle_name || '',
        date_of_birth: client.date_of_birth || '',
        gender: client.gender || 'male',
        phone_secondary: client.phone_secondary || '',
        address_line1: client.address_line1 || '',
        address_line2: client.address_line2 || '',
        city: client.city || '',
        district: client.district || '',
        country: client.country || 'Uganda',
        postal_code: client.postal_code || '',
        id_type: client.id_type || 'national_id',
        id_number: client.id_number || '',
        id_expiry_date: client.id_expiry_date || '',
        nok_name: client.nok_name || '',
        nok_relationship: client.nok_relationship || '',
        nok_phone: client.nok_phone || '',
        nok_address: client.nok_address || '',
        status: client.status || 'active',
        notes: client.notes || '',
        tags: client.tags || [],
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load client');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isEditMode && uuid) {
        await clientService.updateClient(uuid, formData);
      } else {
        await clientService.createClient(formData);
      }

      navigate('/clients');
    } catch (err: any) {
      setError(err.message || 'Failed to save client');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return <div className="loading">Loading client...</div>;
  }

  return (
    <div className="client-form-container">
      <div className="form-header">
        <button className="btn-back" onClick={() => navigate('/clients')}>
          <MdArrowBack size={20} />
          Back to Clients
        </button>
        <h1>{isEditMode ? 'Edit Client' : 'Add New Client'}</h1>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="client-form">
        {/* Personal Information */}
        <div className="form-section">
          <h2>Personal Information</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="first_name">First Name *</label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="middle_name">Middle Name</label>
              <input
                type="text"
                id="middle_name"
                name="middle_name"
                value={formData.middle_name}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="last_name">Last Name *</label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="date_of_birth">Date of Birth</label>
              <input
                type="date"
                id="date_of_birth"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="gender">Gender</label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="form-section">
          <h2>Contact Information</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone_primary">Primary Phone *</label>
              <input
                type="tel"
                id="phone_primary"
                name="phone_primary"
                value={formData.phone_primary}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone_secondary">Secondary Phone</label>
              <input
                type="tel"
                id="phone_secondary"
                name="phone_secondary"
                value={formData.phone_secondary}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="form-section">
          <h2>Address Information</h2>
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="address_line1">Address Line 1</label>
              <input
                type="text"
                id="address_line1"
                name="address_line1"
                value={formData.address_line1}
                onChange={handleChange}
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="address_line2">Address Line 2</label>
              <input
                type="text"
                id="address_line2"
                name="address_line2"
                value={formData.address_line2}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="city">City</label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="district">District</label>
              <input
                type="text"
                id="district"
                name="district"
                value={formData.district}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="postal_code">Postal Code</label>
              <input
                type="text"
                id="postal_code"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="country">Country</label>
              <input
                type="text"
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Identification */}
        <div className="form-section">
          <h2>Identification</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="id_type">ID Type</label>
              <select
                id="id_type"
                name="id_type"
                value={formData.id_type}
                onChange={handleChange}
              >
                <option value="national_id">National ID</option>
                <option value="passport">Passport</option>
                <option value="driving_license">Driving License</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="id_number">ID Number</label>
              <input
                type="text"
                id="id_number"
                name="id_number"
                value={formData.id_number}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="id_expiry_date">ID Expiry Date</label>
              <input
                type="date"
                id="id_expiry_date"
                name="id_expiry_date"
                value={formData.id_expiry_date}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Next of Kin */}
        <div className="form-section">
          <h2>Next of Kin</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="nok_name">Name</label>
              <input
                type="text"
                id="nok_name"
                name="nok_name"
                value={formData.nok_name}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="nok_relationship">Relationship</label>
              <input
                type="text"
                id="nok_relationship"
                name="nok_relationship"
                value={formData.nok_relationship}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="nok_phone">Phone</label>
              <input
                type="tel"
                id="nok_phone"
                name="nok_phone"
                value={formData.nok_phone}
                onChange={handleChange}
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="nok_address">Address</label>
              <input
                type="text"
                id="nok_address"
                name="nok_address"
                value={formData.nok_address}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="form-section">
          <h2>Additional Information</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
              />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={() => navigate('/clients')}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-submit"
            disabled={loading}
          >
            <MdSave size={20} />
            {loading ? 'Saving...' : isEditMode ? 'Update Client' : 'Create Client'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClientForm;
