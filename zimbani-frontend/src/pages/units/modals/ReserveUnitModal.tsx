import React, { useState } from 'react';
import Modal from '../../../components/common/Modal';
import { unitService } from '../../../services/unit.service';
import './UnitModals.css';

interface ReserveUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitUuid: string;
  onSuccess?: () => void;
}

const ReserveUnitModal: React.FC<ReserveUnitModalProps> = ({
  isOpen,
  onClose,
  unitUuid,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    client_id: '',
    reservation_date: new Date().toISOString().split('T')[0],
    deposit_amount: '',
    payment_method: 'cash',
    expiry_date: '',
    notes: ''
  });

  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string[] }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
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
      await unitService.reserve(unitUuid, {
        client_id: Number(formData.client_id),
        reservation_date: formData.reservation_date,
        deposit_amount: Number(formData.deposit_amount),
        payment_method: formData.payment_method,
        expiry_date: formData.expiry_date || undefined,
        notes: formData.notes || undefined
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      if (err.response?.data?.errors) {
        setValidationErrors(err.response.data.errors);
      } else {
        setError(err.response?.data?.message || 'Failed to reserve unit');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reserve Unit" size="medium">
      {error && (
        <div className="modal-alert modal-alert-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="modal-form">
        <div className="form-group">
          <label htmlFor="client_id">
            Client ID <span className="required">*</span>
          </label>
          <input
            type="number"
            id="client_id"
            name="client_id"
            value={formData.client_id}
            onChange={handleChange}
            className={validationErrors.client_id ? 'error' : ''}
            placeholder="Enter client ID"
            required
          />
          {validationErrors.client_id && (
            <span className="error-message">{validationErrors.client_id[0]}</span>
          )}
          <small className="field-hint">Temporary: Enter client ID. Client lookup to be added later.</small>
        </div>

        <div className="form-group">
          <label htmlFor="reservation_date">
            Reservation Date <span className="required">*</span>
          </label>
          <input
            type="date"
            id="reservation_date"
            name="reservation_date"
            value={formData.reservation_date}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="deposit_amount">
            Deposit Amount (UGX) <span className="required">*</span>
          </label>
          <input
            type="number"
            id="deposit_amount"
            name="deposit_amount"
            value={formData.deposit_amount}
            onChange={handleChange}
            className={validationErrors.deposit_amount ? 'error' : ''}
            min="0"
            step="0.01"
            placeholder="e.g., 5000000"
            required
          />
          {validationErrors.deposit_amount && (
            <span className="error-message">{validationErrors.deposit_amount[0]}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="payment_method">Payment Method</label>
          <select
            id="payment_method"
            name="payment_method"
            value={formData.payment_method}
            onChange={handleChange}
          >
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="cheque">Cheque</option>
            <option value="card">Card</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="expiry_date">Expiry Date (Optional)</label>
          <input
            type="date"
            id="expiry_date"
            name="expiry_date"
            value={formData.expiry_date}
            onChange={handleChange}
          />
          <small className="field-hint">Date when reservation expires if not converted to sale</small>
        </div>

        <div className="form-group">
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            placeholder="Additional notes about this reservation..."
          />
        </div>

        <div className="modal-actions">
          <button
            type="button"
            onClick={onClose}
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
            {loading ? 'Processing...' : 'Reserve Unit'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ReserveUnitModal;
