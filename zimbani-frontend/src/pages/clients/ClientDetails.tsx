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
  MdAccountBalance,
  MdBadge,
  MdPrint,
  MdVerified,
  MdClose,
} from 'react-icons/md';
import { clientService } from '../../services/client.service';
import { paymentService } from '../../services/payment.service';
import { Client, ClientUnit } from '../../types/client.types';
import { Payment } from '../../types/payment.types';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
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

  // Soft Replies & Confirm Dialog states
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'primary' | 'warning' | 'success';
    confirmText?: string;
    onConfirm: () => void;
  } | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showCardModal, setShowCardModal] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  const executeVerifyKyc = async () => {
    if (!uuid) return;
    try {
      setActionLoading(true);
      await clientService.verifyKyc(uuid);
      setActionFeedback({
        type: 'success',
        message: `KYC for "${client?.full_name}" has been verified successfully.`
      });
      setConfirmModal(null);
      loadClientData(uuid);
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Failed to verify KYC'
      });
      setConfirmModal(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyKyc = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Verify Client KYC',
      message: `Are you sure you want to mark KYC documentation as verified for "${client?.full_name}"? This will permit land deed allocations and contract signing.`,
      variant: 'primary',
      confirmText: 'Verify KYC',
      onConfirm: executeVerifyKyc,
    });
  };

  const executeRejectKyc = async () => {
    if (!uuid) return;
    try {
      setActionLoading(true);
      await clientService.rejectKyc(uuid);
      setActionFeedback({
        type: 'success',
        message: `KYC for "${client?.full_name}" has been rejected: ${rejectReason || 'Document criteria not met'}.`
      });
      setShowRejectModal(false);
      setRejectReason('');
      loadClientData(uuid);
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Failed to reject KYC'
      });
      setShowRejectModal(false);
    } finally {
      setActionLoading(false);
    }
  };

  const executeDelete = async () => {
    if (!uuid) return;
    try {
      setActionLoading(true);
      await clientService.deleteClient(uuid);
      setConfirmModal(null);
      navigate('/clients');
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Failed to delete client. Please check active units or ledger accounts.'
      });
      setConfirmModal(null);
      setActionLoading(false);
    }
  };

  const handleDelete = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Client',
      message: `Are you sure you want to delete "${client?.full_name}" (${client?.client_number})? This action cannot be undone.`,
      variant: 'danger',
      confirmText: 'Delete Client',
      onConfirm: executeDelete,
    });
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
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
              >
                <MdCancel size={20} />
                Reject KYC
              </button>
            </>
          )}
          <button
            className="btn-action"
            style={{ backgroundColor: '#0d9488', color: '#ffffff' }}
            onClick={() => setShowCardModal(true)}
            disabled={actionLoading}
            title="View & Print Official Member Identification Card (ClientCardsFrame)"
          >
            <MdBadge size={20} />
            Member Card
          </button>
          <button
            className="btn-action"
            style={{ backgroundColor: '#0284c7', color: '#ffffff' }}
            onClick={() => navigate(`/savings-accounts?client_id=${client.id}`)}
            disabled={actionLoading}
          >
            <MdAccountBalance size={20} />
            Savings Accounts
          </button>
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
            {actionFeedback.type === 'success' ? <MdCheckCircle size={18} color="#059669" /> : <MdCancel size={18} color="#dc2626" />}
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

      {/* Soft Action Confirm Modal */}
      {confirmModal && (
        <ConfirmDialog
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText || 'Confirm'}
          cancelText="Cancel"
          variant={confirmModal.variant}
          isLoading={actionLoading}
          onConfirm={confirmModal.onConfirm}
          onClose={() => setConfirmModal(null)}
        />
      )}

      {/* Soft Reject KYC Modal */}
      {showRejectModal && (
        <div className="confirm-modal-backdrop">
          <div className="confirm-modal-card">
            <div className="confirm-modal-header">
              <div className="confirm-modal-icon-badge warning">
                <MdCancel size={22} color="#dc2626" />
              </div>
              <h3 className="confirm-modal-title">Reject Client KYC</h3>
            </div>
            <p className="confirm-modal-message">
              Please enter the specific reason for rejecting the KYC submission for <strong>{client?.full_name}</strong>:
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Incomplete national ID copy, blurry address verification..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                marginBottom: '1rem',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="confirm-modal-btn cancel"
                onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="confirm-modal-btn danger"
                onClick={executeRejectKyc}
                disabled={actionLoading || !rejectReason.trim()}
              >
                {actionLoading ? 'Rejecting...' : 'Reject KYC'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Client Membership & Identification Card Modal (Legacy ClientCardsFrame) */}
      {showCardModal && client && (
        <div className="confirm-modal-backdrop">
          <div className="confirm-modal-card" style={{ maxWidth: '820px', width: '95%' }}>
            <div className="confirm-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="confirm-modal-icon-badge" style={{ backgroundColor: '#ccfbf1', color: '#0d9488' }}>
                  <MdBadge size={22} />
                </div>
                <h3 className="confirm-modal-title" style={{ margin: 0 }}>
                  Official Member Identification Card
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-action"
                  onClick={() => window.print()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#0d9488', color: '#fff', padding: '6px 14px', borderRadius: '6px', fontSize: '13px' }}
                >
                  <MdPrint size={16} /> Print Card
                </button>
                <button
                  type="button"
                  onClick={() => setShowCardModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                  <MdClose size={22} />
                </button>
              </div>
            </div>

            <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 16px 0' }}>
              Standard ISO format membership credential for <strong>{client.full_name}</strong>. Certified for scheme identification, plot surveys, and registry operations.
            </p>

            {/* Cards Container (Front and Back) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '1.5rem' }}>
              {/* Card Front */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                  borderRadius: '14px',
                  padding: '18px',
                  color: '#ffffff',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.18)',
                  border: '1px solid #334155',
                  position: 'relative',
                  overflow: 'hidden',
                  minHeight: '215px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                {/* Gold Accent Bar */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #f59e0b, #fbbf24, #10b981)' }} />

                {/* Front Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '800', letterSpacing: '0.8px', color: '#f8fafc' }}>
                      FAB HOMES UGANDA
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '1px' }}>
                      Member Identification Card
                    </div>
                  </div>
                  <div style={{ padding: '3px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', fontSize: '9.5px', fontWeight: '700', textTransform: 'uppercase' }}>
                    {client.status?.toUpperCase() || 'ACTIVE'}
                  </div>
                </div>

                {/* Front Content: Photo + Details */}
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginTop: '12px' }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '10px',
                      background: '#334155',
                      border: '2px solid #f59e0b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#f8fafc',
                      fontSize: '22px',
                      fontWeight: '800',
                      flexShrink: 0,
                    }}
                  >
                    {client.first_name?.[0] || 'C'}{client.last_name?.[0] || 'L'}
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff', letterSpacing: '0.2px' }}>
                      {client.full_name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#38bdf8', fontFamily: 'monospace', fontWeight: '700', marginTop: '2px' }}>
                      {client.client_number}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      {client.id_type?.toUpperCase() || 'NIN'}: {client.id_number || 'Verified'}
                    </div>
                  </div>
                </div>

                {/* Front Footer: Barcode + Expiry */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                  <div style={{ fontSize: '10px', color: '#cbd5e1' }}>
                    <div>District: <strong>{client.district || 'Kampala, Uganda'}</strong></div>
                    <div>Phone: {client.phone_primary}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ letterSpacing: '2px', fontFamily: 'monospace', fontSize: '11px', color: '#94a3b8' }}>
                      ||||| | ||| |||| | ||
                    </div>
                    <div style={{ fontSize: '8.5px', color: '#64748b' }}>SECURITY CHIP VERIFIED</div>
                  </div>
                </div>
              </div>

              {/* Card Back */}
              <div
                style={{
                  background: '#f8fafc',
                  borderRadius: '14px',
                  padding: '18px',
                  color: '#0f172a',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                  border: '1px solid #cbd5e1',
                  minHeight: '215px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Emergency Next of Kin & Registration
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '12px', lineHeight: '1.5' }}>
                    <div><strong>Next of Kin:</strong> {client.nok_name || 'Recorded on File'}</div>
                    <div><strong>Relationship:</strong> {client.nok_relationship || '-'}</div>
                    <div><strong>Emergency Contact:</strong> {client.nok_phone || '-'}</div>
                  </div>
                </div>

                <div style={{ background: '#f1f5f9', padding: '8px 10px', borderRadius: '6px', fontSize: '10px', color: '#475569', margin: '8px 0' }}>
                  This card certifies registered ownership and scheme standing under Fab Homes Uganda Land & Construction Management.
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                  <div style={{ fontSize: '9px', color: '#64748b' }}>
                    <div>Kampala Head Office</div>
                    <div>support@fabhomesug.com</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0d9488', fontSize: '10px', fontWeight: '700' }}>
                    <MdVerified size={14} /> AUTHORIZED SEAL
                  </div>
                </div>
              </div>
            </div>

            <div className="confirm-modal-actions">
              <button
                type="button"
                className="confirm-modal-btn cancel"
                onClick={() => setShowCardModal(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="confirm-modal-btn primary"
                onClick={() => window.print()}
                style={{ backgroundColor: '#0d9488' }}
              >
                Print Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDetails;
