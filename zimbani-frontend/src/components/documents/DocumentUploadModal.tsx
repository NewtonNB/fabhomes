import React, { useState, useRef } from 'react'
import { MdCloudUpload, MdClose, MdInsertDriveFile } from 'react-icons/md'
import documentService from '../../services/document.service'
import { DocumentType } from '../../types/document.types'
import './DocumentUploadModal.css'

interface DocumentUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  defaultDocumentableType?: string
  defaultDocumentableId?: string
  title?: string
}

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'contract', label: 'Contract / Agreement' },
  { value: 'id_proof', label: 'ID Proof / Passport' },
  { value: 'receipt', label: 'Payment Receipt / Deposit Slip' },
  { value: 'floor_plan', label: 'Floor Plan / Architectural Drawing' },
  { value: 'permit', label: 'Building Permit / Regulatory Approval' },
  { value: 'survey', label: 'Site / Land Survey' },
  { value: 'inspection_report', label: 'Inspection Report' },
  { value: 'kyc', label: 'KYC Document' },
  { value: 'title_deed', label: 'Title Deed' },
  { value: 'invoice', label: 'Invoice / Bill' },
  { value: 'other', label: 'Other Document' },
]

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultDocumentableType,
  defaultDocumentableId,
  title = 'Upload Document',
}) => {
  const [docTitle, setDocTitle] = useState('')
  const [documentType, setDocumentType] = useState<DocumentType>('contract')
  const [description, setDescription] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0]
      setFile(selected)
      if (!docTitle) {
        // Auto-fill title from filename without extension
        const nameWithoutExt = selected.name.replace(/\.[^/.]+$/, '')
        setDocTitle(nameWithoutExt.replace(/[-_]/g, ' '))
      }
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0]
      setFile(dropped)
      if (!docTitle) {
        const nameWithoutExt = dropped.name.replace(/\.[^/.]+$/, '')
        setDocTitle(nameWithoutExt.replace(/[-_]/g, ' '))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Please select a file to upload')
      return
    }
    if (!docTitle.trim()) {
      setError('Document title is required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      await documentService.uploadDocument({
        title: docTitle.trim(),
        document_type: documentType,
        description: description.trim() || undefined,
        expiry_date: expiryDate || undefined,
        file,
        documentable_type: defaultDocumentableType,
        documentable_id: defaultDocumentableId,
      })

      // Reset and notify
      setFile(null)
      setDocTitle('')
      setDescription('')
      setExpiryDate('')
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to upload document')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="document-upload-modal-overlay" onClick={onClose}>
      <div className="document-upload-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="document-upload-modal-header">
          <h3>{title}</h3>
          <button className="document-upload-modal-close" onClick={onClose}>
            <MdClose />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="document-upload-form">
          {error && <div className="doc-error-message">{error}</div>}

          {/* Drag & Drop Area */}
          <div className="doc-form-group">
            <label>Document File *</label>
            <div
              className={`dropzone-area ${isDragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragOver(true)
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.dwg,.dxf"
              />
              <MdCloudUpload className="dropzone-icon" />
              <div className="dropzone-text">
                {file ? file.name : 'Click to select or drag and drop file here'}
              </div>
              <div className="dropzone-hint">
                Supported: PDF, DOCX, XLSX, Images, CAD (Max 20 MB)
              </div>
            </div>

            {file && (
              <div className="selected-file-info">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <MdInsertDriveFile style={{ marginRight: '0.5rem', color: '#3b82f6' }} />
                  <span className="selected-file-name">{file.name}</span>
                  <span className="selected-file-size">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setFile(null)
                  }}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          <div className="doc-form-group">
            <label>Title *</label>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="e.g. Approved Floor Plan B202"
              required
            />
          </div>

          <div className="doc-form-group">
            <label>Document Type *</label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as DocumentType)}
              required
            >
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="doc-form-group">
            <label>Expiry Date (Optional)</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>

          <div className="doc-form-group">
            <label>Description / Notes</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional information about this document..."
            />
          </div>

          <div className="document-upload-modal-actions">
            <button
              type="button"
              className="doc-btn doc-btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="doc-btn doc-btn-primary"
              disabled={loading || !file}
            >
              {loading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DocumentUploadModal
