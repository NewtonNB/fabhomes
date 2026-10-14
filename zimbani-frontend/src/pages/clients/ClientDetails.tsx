import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  MdArrowBack,
  MdEdit,
  MdDelete,
  MdCheckCircle,
  MdCancel,
  MdEmail,
  MdLocationOn,
  MdBusiness,
  MdPerson,
  MdContactEmergency,
  MdReceipt,
} from 'react-icons/md';
import { clientService } from '../../services/client.service';
import { paymentService } from '../../services/payment.service';
import { Client, ClientUnit } from '../../types/client.types';
import { Payment } from '../../types/payment.types';
import './ClientDetails.css';

const ClientDetails: React.FC = () => {
  const navigate = useNavigate();
  const { uuid } = useParams<{ uuid: string }>();

  const [client, setClient] = useState<Client | null>(null);
  const [units, setUnits] = useState<ClientUnit[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (uuid) {
      loadClientData(uuid);
    }
  }, [uuid]);

  const loadClientData = async (clientUuid: string) => {
    try {
      setLoading(true);
      const clientData = await clientService.getClient(clientUuid);
      setClient(clientData);
      
      // Load units if available
      try {
        const unitsResponse = await clientService.getClientUnits(clientUuid);
        // Handle both array and paginated response
        if (Array.isArray(unitsResponse)) {
          setUnits(unitsResponse);
        } else if (unitsResponse.data) {
          setUnits(unitsResponse.data);
        }
      } catch (err) {
        console.log('No units found for client');
        setUnits([]);
      }

      // Load client payments
      try {
        const paymentsResponse = await paymentService.getPayments({ client_id: clientUuid, per_page: 50 });
        setPayments(paymentsResponse.data || []);
      } catch (err) {
        console.log('No payments found for client');
        setPayments([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load client');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyKyc = async () => {
    if (!uuid || !window.confirm('Are you sure you want to verify this client\'s KYC?')) return;

    try {
      setActionLoading(true);
      await clientService.verifyKyc(uuid);
      if (uuid) loadClientData(uuid);
    } catch (err: any) {
      alert(err.message || 'Failed to verify KYC');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectKyc = async () => {
    const reason = window.prompt('Enter reason for KYC rejection:');
    if (!reason || !uuid) return;

    try {
      setActionLoading(true);
      await clientService.rejectKyc(uuid);
      if (uuid) loadClientData(uuid);
    } catch (err: any) {
      alert(err.message || 'Failed to reject KYC');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!uuid || !window.confirm('Are you sure you want to delete this client?')) return;

    try {
      setActionLoading(true);
      await clientService.deleteClient(uuid);
      navigate('/clients');
    } catch (err: any) {
      alert(err.message || 'Failed to delete client');
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading client details...</div>;
  }

  if (error || !client) {
    return (
      <div className="error">
        <p>{error || 'Client not found'}</p>
        <button onClick={() => navigate('/clients')}>Back to Clients</button>
      </div>
    );
  }

  const getKycBadgeClass = (status: string) => {
    switch (status) {
      case 'verified': return 'kyc-badge verified';
      case 'pending': return 'kyc-badge pending';
      case 'rejected': return 'kyc-badge rejected';
      default: return 'kyc-badge not-submitted';
    }
  };

  return (
    <div className="client-details-container">
      {/* Header */}
      <div className="details-header">
        <button className="btn-back" onClick={() => navigate('/clients')}>
          <MdArrowBack size={20} />
          Back to Clients
        </button>

        <div className="header-actions">
          {client.kyc_status === 'pending' && (
            <>
              <button
                className="btn-action verify"
                onClick={handleVerifyKyc}
                disabled={actionLoading}
              >
                <MdCheckCircle size={20} />
                Verify KYC
              </button>
              <button
                className="btn-action reject"
                onClick={handleRejectKyc}
                disabled={actionLoading}
              >
                <MdCancel size={20} />
                Reject KYC
              </button>
            </>
          )}
          <button
            className="btn-action edit"
            onClick={() => navigate(`/clients/edit/${uuid}`)}
            disabled={actionLoading}
          >
            <MdEdit size={20} />
            Edit
          </button>
          <button
            className="btn-action delete"
            onClick={handleDelete}
            disabled={actionLoading}
          >
            <MdDelete size={20} />
            Delete
          </button>
        </div>
      </div>

      {/* Client Overview */}
      <div className="client-overview">
        <div className="client-avatar">
          <MdPerson size={64} />
        </div>
        <div className="client-info">
          <h1>{client.full_name}</h1>
          <p className="client-number">{client.client_number}</p>
          <div className="client-meta">
            <span className={getKycBadgeClass(client.kyc_status)}>
              {client.kyc_status}
            </span>
            <span className="client-type">{client.status}</span>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="details-section">
        <h2><MdEmail size={24} /> Contact Information</h2>
        <div className="info-grid">
          <div className="info-item">
            <label>Email</label>
            <p>{client.email || 'N/A'}</p>
          </div>
          <div className="info-item">
            <label>Primary Phone</label>
            <p>{client.phone_primary}</p>
          </div>
          {client.phone_secondary && (
            <div className="info-item">
              <label>Secondary Phone</label>
              <p>{client.phone_secondary}</p>
            </div>
          )}
        </div>
      </div>

      {/* Personal Information */}
      <div className="details-section">
        <h2><MdPerson size={24} /> Personal Information</h2>
        <div className="info-grid">
          <div className="info-item">
            <label>Date of Birth</label>
            <p>{client.date_of_birth || 'N/A'}</p>
          </div>
          <div className="info-item">
            <label>Gender</label>
            <p>{client.gender || 'N/A'}</p>
          </div>
          {client.id_type && (
            <>
              <div className="info-item">
                <label>ID Type</label>
                <p>{client.id_type.replace('_', ' ')}</p>
              </div>
              <div className="info-item">
                <label>ID Number</label>
                <p>{client.id_number}</p>
              </div>
              {client.id_expiry_date && (
                <div className="info-item">
                  <label>ID Expiry</label>
                  <p>{client.id_expiry_date}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Address */}
      {client.full_address && (
        <div className="details-section">
          <h2><MdLocationOn size={24} /> Address</h2>
          <div className="info-grid">
            <div className="info-item full-width">
              <label>Address</label>
              <p>{client.full_address}</p>
            </div>
            {client.city && (
              <div className="info-item">
                <label>City</label>
                <p>{client.city}</p>
              </div>
            )}
            {client.district && (
              <div className="info-item">
                <label>District</label>
                <p>{client.district}</p>
              </div>
            )}
            <div className="info-item">
              <label>Country</label>
              <p>{client.country}</p>
            </div>
            {client.postal_code && (
              <div className="info-item">
                <label>Postal Code</label>
                <p>{client.postal_code}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Next of Kin */}
      {client.nok_name && (
        <div className="details-section">
          <h2><MdContactEmergency size={24} /> Next of Kin</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Name</label>
              <p>{client.nok_name}</p>
            </div>
            {client.nok_phone && (
              <div className="info-item">
                <label>Phone</label>
                <p>{client.nok_phone}</p>
              </div>
            )}
            {client.nok_relationship && (
              <div className="info-item">
                <label>Relationship</label>
                <p>{client.nok_relationship}</p>
              </div>
            )}
            {client.nok_address && (
              <div className="info-item full-width">
                <label>Address</label>
                <p>{client.nok_address}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Units */}
      {units.length > 0 && (
        <div className="details-section">
          <h2><MdBusiness size={24} /> Purchased Units ({units.length})</h2>
          <div className="units-list">
            {units.map((unit) => (
              <div key={unit.uuid} className="unit-card">
                <h3>{unit.unit_number}</h3>
                {unit.project && <p className="unit-project">{unit.project.name}</p>}
                {unit.site && <p className="unit-site">{unit.site.name}</p>}
                <div className="unit-meta">
                  <span className="unit-type">{unit.type}</span>
                  <span className="unit-status">{unit.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="details-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0 }}><MdReceipt size={24} /> Payment History ({payments.length})</h2>
          <button
            className="btn-action edit"
            onClick={() => navigate(`/payments/new?client_id=${client.uuid}`)}
          >
            + Record Payment
          </button>
        </div>

        {payments.length === 0 ? (
          <p style={{ color: '#6b7280', margin: 0 }}>No payment records found for this client.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', color: '#4b5563' }}>
                  <th style={{ padding: '8px 12px' }}>Payment #</th>
                  <th style={{ padding: '8px 12px' }}>Date</th>
                  <th style={{ padding: '8px 12px' }}>Type</th>
                  <th style={{ padding: '8px 12px' }}>Method</th>
                  <th style={{ padding: '8px 12px' }}>Amount</th>
                  <th style={{ padding: '8px 12px' }}>Status</th>
                  <th style={{ padding: '8px 12px' }}>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 600, color: '#059669' }}>
                      {p.payment_number}
                    </td>
                    <td style={{ padding: '10px 12px' }}>{p.payment_date}</td>
                    <td style={{ padding: '10px 12px', textTransform: 'capitalize' }}>
                      {p.payment_type.replace('_', ' ')}
                    </td>
                    <td style={{ padding: '10px 12px', textTransform: 'capitalize' }}>
                      {p.payment_method.replace('_', ' ')}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>
                      UGX {Number(p.total_amount).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className={`badge badge-${p.status === 'verified' ? 'success' : p.status === 'confirmed' ? 'info' : 'warning'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <button
                        className="btn-action edit"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        onClick={() => navigate(`/payments/${p.uuid}`)}
                      >
                        View Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Additional Information */}
      {(client.notes || (client.tags && client.tags.length > 0)) && (
        <div className="details-section">
          <h2>Additional Information</h2>
          <div className="info-grid">
            {client.tags && client.tags.length > 0 && (
              <div className="info-item full-width">
                <label>Tags</label>
                <div className="tags-list">
                  {client.tags.map((tag, index) => (
                    <span key={index} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            )}
            {client.notes && (
              <div className="info-item full-width">
                <label>Notes</label>
                <p>{client.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* KYC Information */}
      {client.kyc_verified_at && (
        <div className="details-section">
          <h2>KYC Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>KYC Status</label>
              <span className={getKycBadgeClass(client.kyc_status)}>
                {client.kyc_status}
              </span>
            </div>
            <div className="info-item">
              <label>Verified At</label>
              <p>{new Date(client.kyc_verified_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="details-section">
        <h2>System Information</h2>
        <div className="info-grid">
          <div className="info-item">
            <label>Created At</label>
            <p>{new Date(client.created_at).toLocaleString()}</p>
          </div>
          <div className="info-item">
            <label>Updated At</label>
            <p>{new Date(client.updated_at).toLocaleString()}</p>
          </div>
          {client.deleted_at && (
            <div className="info-item">
              <label>Deleted At</label>
              <p>{new Date(client.deleted_at).toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientDetails;
