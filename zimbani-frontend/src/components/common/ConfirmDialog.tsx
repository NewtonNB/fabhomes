import React, { useEffect } from 'react'
import {
  MdClose,
  MdDeleteOutline,
  MdWarning,
  MdCheckCircle,
  MdHelpOutline,
} from 'react-icons/md'
import './ConfirmDialog.css'

export interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  confirmLabel?: string
  cancelText?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'primary' | 'success'
  isLoading?: boolean
  loading?: boolean
  onConfirm: () => void | Promise<void>
  onClose?: () => void
  onCancel?: () => void
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  confirmLabel,
  cancelText,
  cancelLabel,
  variant = 'danger',
  isLoading = false,
  loading = false,
  onConfirm,
  onClose,
  onCancel,
}) => {
  const finalConfirmText = confirmLabel || confirmText || 'Confirm'
  const finalCancelText = cancelLabel || cancelText || 'Cancel'
  const finalLoading = loading || isLoading
  const handleClose = () => {
    if (onCancel) onCancel()
    else if (onClose) onClose()
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !finalLoading) {
        handleClose()
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isLoading, onClose])

  if (!isOpen) return null

  const renderIcon = () => {
    switch (variant) {
      case 'danger':
        return (
          <div className="confirm-icon-wrapper confirm-icon-danger">
            <MdDeleteOutline size={26} />
          </div>
        )
      case 'warning':
        return (
          <div className="confirm-icon-wrapper confirm-icon-warning">
            <MdWarning size={26} />
          </div>
        )
      case 'success':
        return (
          <div className="confirm-icon-wrapper confirm-icon-success">
            <MdCheckCircle size={26} />
          </div>
        )
      default:
        return (
          <div className="confirm-icon-wrapper confirm-icon-primary">
            <MdHelpOutline size={26} />
          </div>
        )
    }
  }

  const getConfirmButtonClass = () => {
    switch (variant) {
      case 'danger':
        return 'confirm-btn confirm-btn-danger'
      case 'warning':
        return 'confirm-btn confirm-btn-warning'
      case 'success':
        return 'confirm-btn confirm-btn-success'
      default:
        return 'confirm-btn confirm-btn-primary'
    }
  }

  return (
    <div className="confirm-modal-overlay" onClick={finalLoading ? undefined : handleClose}>
      <div className="confirm-modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          className="confirm-modal-close"
          onClick={handleClose}
          disabled={finalLoading}
          title="Close dialog"
        >
          <MdClose size={18} />
        </button>

        <div className="confirm-modal-content">
          {renderIcon()}
          <div className="confirm-text-content">
            <h3 className="confirm-title">{title}</h3>
            <p className="confirm-message">{message}</p>
          </div>
        </div>

        <div className="confirm-actions">
          <button
            type="button"
            className="confirm-btn confirm-btn-cancel"
            onClick={handleClose}
            disabled={finalLoading}
          >
            {finalCancelText}
          </button>
          <button
            type="button"
            className={getConfirmButtonClass()}
            onClick={onConfirm}
            disabled={finalLoading}
          >
            {finalLoading ? 'Processing...' : finalConfirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
