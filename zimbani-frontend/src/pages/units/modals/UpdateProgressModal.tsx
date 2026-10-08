import React, { useState } from 'react';
import Modal from '../../../components/common/Modal';
import { unitService } from '../../../services/unit.service';
import './UnitModals.css';

interface UpdateProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitUuid: string;
  currentProgress: number;
  onSuccess?: () => void;
}

const UpdateProgressModal: React.FC<UpdateProgressModalProps> = ({
  isOpen,
  onClose,
  unitUuid,
  currentProgress,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    completion_percentage: currentProgress.toString(),
    update_date: new Date().toISOString().split('T')[0],
    progress_description: '',
    inspector_name: '',
    notes: ''
  });

  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string[] }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      await unitService.updateProgress(unitUuid, {
        completion_percentage: Number(formData.completion_percentage),
        update_date: formData.update_date,
        progress_description: formData.progress_description || undefined,
        inspector_name: formData.inspector_name || undefined,
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
        setError(err.response?.data?.message || 'Failed to update progress');
      }
    } finally {
      setLoading(false);
    }
  };

  const progressValue = Number(formData.completion_percentage) || 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Construction Progress" size="medium">
      {error && (
        <div className="modal-alert modal-alert-error">
          {error}
        </div>
      )}

      {progressValue === 100 && (
        <div className="modal-alert modal-alert-info">
          <strong>Note:</strong> Setting completion to 100% will automatically change unit status to 'completed'.
        </div>
      )}

      <form onSubmit={handleSubmit} className="modal-form">
        <div className="form-group">
          <label htmlFor="completion_percentage">
            Completion Percentage <span className="required">*</span>
          </label>
          <div className="progress-input-group">
            <input
              type="range"
              id="completion_percentage_slider"
              name="completion_percentage"
              value={formData.completion_percentage}
              onChange={handleChange}
              min="0"
              max="100"
              step="1"
              className="progress-slider"
            />
            <input
              type="number"
              id="completion_percentage"
              name="completion_percentage"
              value={formData.completion_percentage}
              onChange={handleChange}
              className={`progress-number-input ${validationErrors.completion_percentage ? 'error' : ''}`}
              min="0"
              max="100"
              step="1"
              required
            />
            <span className="progress-percentage">%</span>
          </div>
          <div className="progress-bar-display">
            <div 
              className="progress-fill-display" 
              style={{ width: `${progressValue}%` }}
            />
          </div>
          {validationErrors.completion_percentage && (
            <span className="error-message">{validationErrors.completion_percentage[0]}</span>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="update_date">
              Update Date <span className="required">*</span>
            </label>
            <input
              type="date"
              id="update_date"
              name="update_date"
              value={formData.update_date}
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
              placeholder="e.g., John Doe"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="progress_description">Progress Description</label>
          <textarea
            id="progress_description"
            name="progress_description"
            value={formData.progress_description}
            onChange={handleChange}
            rows={3}
            placeholder="Describe the work completed (e.g., Roofing completed, Plastering in progress...)"
          />
        </div>

        <div className="form-group">
          <label htmlFor="notes">Additional Notes</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={2}
            placeholder="Any additional notes..."
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
            {loading ? 'Updating...' : 'Update Progress'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default UpdateProgressModal;
