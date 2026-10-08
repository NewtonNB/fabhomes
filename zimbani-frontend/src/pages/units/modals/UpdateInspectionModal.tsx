import React, { useState } from 'react';
import Modal from '../../../components/common/Modal';
import { unitService } from '../../../services/unit.service';
import './UnitModals.css';

interface UpdateInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitUuid: string;
  onSuccess?: () => void;
}

const UpdateInspectionModal: React.FC<UpdateInspectionModalProps> = ({
  isOpen,
  onClose,
  unitUuid,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    inspection_date: new Date().toISOString().split('T')[0],
    inspector_name: '',
    inspection_type: 'pre_handover',
    status: 'passed',
    findings: '',
    follow_up_required: false,
    follow_up_date: '',
    notes: ''
  });

  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string[] }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
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
      await unitService.updateInspection(unitUuid, {
        inspection_date: formData.inspection_date,
        inspector_name: formData.inspector_name || undefined,
        inspection_type: formData.inspection_type,
        status: formData.status,
        findings: formData.findings || undefined,
        follow_up_required: formData.follow_up_required,
        follow_up_date: formData.follow_up_required && formData.follow_up_date ? formData.follow_up_date : undefined,
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
        setError(err.response?.data?.message || 'Failed to record inspection');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Inspection" size="medium">
      {error && (
        <div className="modal-alert modal-alert-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="modal-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="inspection_date">
              Inspection Date <span className="required">*</span>
            </label>
            <input
              type="date"
              id="inspection_date"
              name="inspection_date"
              value={formData.inspection_date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="inspector_name">Inspector Name</label>
            <input
              type="text"
              id="inspector_name"
              name="inspector_name"
              value={formData.inspector_name}
              onChange={handleChange}
              placeholder="e.g., John Smith"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="inspection_type">
              Inspection Type <span className="required">*</span>
            </label>
            <select
              id="inspection_type"
              name="inspection_type"
              value={formData.inspection_type}
              onChange={handleChange}
              required
            >
              <option value="pre_handover">Pre-Handover Inspection</option>
              <option value="final">Final Inspection</option>
              <option value="maintenance">Maintenance Inspection</option>
              <option value="defect_check">Defect Check</option>
              <option value="routine">Routine Inspection</option>
              <option value="emergency">Emergency Inspection</option>
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
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="conditional_pass">Conditional Pass</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="findings">Findings / Issues</label>
          <textarea
            id="findings"
            name="findings"
            value={formData.findings}
            onChange={handleChange}
            rows={4}
            placeholder="Describe inspection findings, issues discovered, or observations..."
          />
        </div>

        <div className="form-group">
          <div className="checkbox-group">
            <input
              type="checkbox"
              id="follow_up_required"
              name="follow_up_required"
              checked={formData.follow_up_required}
              onChange={handleChange}
            />
            <label htmlFor="follow_up_required" className="checkbox-label">
              Follow-up Inspection Required
            </label>
          </div>
        </div>

        {formData.follow_up_required && (
          <div className="form-group follow-up-field">
            <label htmlFor="follow_up_date">Follow-up Date</label>
            <input
              type="date"
              id="follow_up_date"
              name="follow_up_date"
              value={formData.follow_up_date}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="notes">Additional Notes</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            placeholder="Any additional notes or recommendations..."
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
            {loading ? 'Recording...' : 'Record Inspection'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default UpdateInspectionModal;
