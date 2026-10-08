import React, { useState } from 'react';
import Modal from '../../../components/common/Modal';
import { unitService } from '../../../services/unit.service';
import './UnitModals.css';

interface SellUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitUuid: string;
  currentPrice: number;
  onSuccess?: () => void;
}

const SellUnitModal: React.FC<SellUnitModalProps> = ({
  isOpen,
  onClose,
  unitUuid,
  currentPrice,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    client_id: '',
    sale_date: new Date().toISOString().split('T')[0],
    sale_price: currentPrice.toString(),
    initial_payment: '',
    payment_method: 'bank_transfer',
    payment_plan: 'full_payment',
    agreement_number: '',
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
      await unitService.sell(unitUuid, {
        client_id: Number(formData.client_id),
        sale_date: formData.sale_date,
        sale_price: Number(formData.sale_price),
        initial_payment: Number(formData.initial_payment) || undefined,
        payment_method: formData.payment_method,
        payment_plan: formData.payment_plan,
        agreement_number: formData.agreement_number || undefined,
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
        setError(err.response?.data?.message || 'Failed to sell unit');
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateBalance = () => {
    const price = Number(formData.sale_price) || 0;
    const payment = Number(formData.initial_payment) || 0;
    return price - payment;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sell Unit" size="medium">
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

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="sale_date">
              Sale Date <span className="required">*</span>
            </label>
            <input
              type="date"
              id="sale_date"
              name="sale_date"
              value={formData.sale_date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="agreement_number">Agreement Number</label>
            <input
              type="text"
              id="agreement_number"
              name="agreement_number"
              value={formData.agreement_number}
              onChange={handleChange}
              placeholder="e.g., AGR-2026-001"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="sale_price">
            Sale Price (UGX) <span className="required">*</span>
          </label>
          <input
            type="number"
            id="sale_price"
            name="sale_price"
            value={formData.sale_price}
            onChange={handleChange}
            className={validationErrors.sale_price ? 'error' : ''}
            min="0"
            step="0.01"
            required
          />
          {validationErrors.sale_price && (
            <span className="error-message">{validationErrors.sale_price[0]}</span>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="initial_payment">Initial Payment (UGX)</label>
            <input
              type="number"
              id="initial_payment"
              name="initial_payment"
              value={formData.initial_payment}
              onChange={handleChange}
              min="0"
              step="0.01"
              placeholder="e.g., 50000000"
            />
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
              <option value="loan">Loan/Mortgage</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="payment_plan">Payment Plan</label>
          <select
            id="payment_plan"
            name="payment_plan"
            value={formData.payment_plan}
            onChange={handleChange}
          >
            <option value="full_payment">Full Payment</option>
            <option value="installment">Installment Plan</option>
            <option value="mortgage">Mortgage</option>
          </select>
        </div>

        {formData.initial_payment && (
          <div className="payment-summary">
            <div className="summary-row">
              <span>Sale Price:</span>
              <strong>{new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0 }).format(Number(formData.sale_price))}</strong>
            </div>
            <div className="summary-row">
              <span>Initial Payment:</span>
              <strong>{new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0 }).format(Number(formData.initial_payment))}</strong>
            </div>
            <div className="summary-row highlight">
              <span>Balance:</span>
              <strong>{new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0 }).format(calculateBalance())}</strong>
            </div>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            placeholder="Additional notes about this sale..."
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
            {loading ? 'Processing...' : 'Complete Sale'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default SellUnitModal;
