import React, { useState } from 'react';
import Modal from '../../../components/common/Modal';
import { unitService } from '../../../services/unit.service';
import './UnitModals.css';

interface UpdatePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitUuid: string;
  currentBalance: number;
  onSuccess?: () => void;
}

const UpdatePaymentModal: React.FC<UpdatePaymentModalProps> = ({
  isOpen,
  onClose,
  unitUuid,
  currentBalance,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_method: 'bank_transfer',
    transaction_reference: '',
    receipt_number: '',
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
      await unitService.updatePayment(unitUuid, {
        payment_date: formData.payment_date,
        amount: Number(formData.amount),
        payment_method: formData.payment_method,
        transaction_reference: formData.transaction_reference || undefined,
        receipt_number: formData.receipt_number || undefined,
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
        setError(err.response?.data?.message || 'Failed to record payment');
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateNewBalance = () => {
    const payment = Number(formData.amount) || 0;
    return currentBalance - payment;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const newBalance = calculateNewBalance();
  const isFullPayment = newBalance === 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Payment" size="medium">
      {error && (
        <div className="modal-alert modal-alert-error">
          {error}
        </div>
      )}

      {isFullPayment && formData.amount && (
        <div className="modal-alert modal-alert-success">
          <strong>Full Payment!</strong> This payment will complete the unit purchase.
        </div>
      )}

      <form onSubmit={handleSubmit} className="modal-form">
        <div className="payment-info-box">
          <div className="info-row">
            <span>Current Balance:</span>
            <strong className="balance-amount">{formatCurrency(currentBalance)}</strong>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="payment_date">
              Payment Date <span className="required">*</span>
            </label>
            <input
              type="date"
              id="payment_date"
              name="payment_date"
              value={formData.payment_date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="amount">
              Amount Paid (UGX) <span className="required">*</span>
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              className={validationErrors.amount ? 'error' : ''}
              min="0.01"
              max={currentBalance}
              step="0.01"
              placeholder="e.g., 20000000"
              required
            />
            {validationErrors.amount && (
              <span className="error-message">{validationErrors.amount[0]}</span>
            )}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="payment_method">
            Payment Method <span className="required">*</span>
          </label>
          <select
            id="payment_method"
            name="payment_method"
            value={formData.payment_method}
            onChange={handleChange}
            required
          >
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="cheque">Cheque</option>
            <option value="card">Card</option>
            <option value="loan">Loan/Mortgage</option>
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="transaction_reference">Transaction Reference</label>
            <input
              type="text"
              id="transaction_reference"
              name="transaction_reference"
              value={formData.transaction_reference}
              onChange={handleChange}
              placeholder="e.g., TXN123456789"
            />
          </div>

          <div className="form-group">
            <label htmlFor="receipt_number">Receipt Number</label>
            <input
              type="text"
              id="receipt_number"
              name="receipt_number"
              value={formData.receipt_number}
              onChange={handleChange}
              placeholder="e.g., RCP-2026-001"
            />
          </div>
        </div>

        {formData.amount && (
          <div className="payment-summary">
            <div className="summary-row">
              <span>Current Balance:</span>
              <strong>{formatCurrency(currentBalance)}</strong>
            </div>
            <div className="summary-row">
              <span>Payment Amount:</span>
              <strong className="payment-amount">-{formatCurrency(Number(formData.amount))}</strong>
            </div>
            <div className={`summary-row highlight ${isFullPayment ? 'fully-paid' : ''}`}>
              <span>New Balance:</span>
              <strong>{formatCurrency(newBalance)}</strong>
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
            placeholder="Additional notes about this payment..."
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
            {loading ? 'Recording...' : 'Record Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default UpdatePaymentModal;
