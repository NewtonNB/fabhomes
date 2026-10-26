import React, { useState } from 'react'
import {
  MdFileDownload,
  MdDeleteOutline,
  MdCheckCircle,
  MdOpenInNew,
  MdPictureAsPdf,
  MdImage,
  MdDescription,
  MdInsertDriveFile,
  MdVerified,
  MdHelpOutline,
  MdWarning,
} from 'react-icons/md'
import { Document } from '../../types/document.types'
import documentService from '../../services/document.service'
import { ConfirmDialog } from '../common/ConfirmDialog'
import './DocumentsTable.css'

interface DocumentsTableProps {
  documents: Document[]
  onRefresh: () => void
  showEntityColumn?: boolean
  canVerify?: boolean
  canDelete?: boolean
}

export const DocumentsTable: React.FC<DocumentsTableProps> = ({
  documents,
  onRefresh,
  showEntityColumn = true,
  canVerify = true,
  canDelete = true,
}) => {
  const [confirmAction, setConfirmAction] = useState<{ type: 'verify' | 'delete'; doc: Document } | null>(null)
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const getFileIcon = (doc: Document) => {
    const ext = (doc.file_extension || '').toLowerCase()
    const mime = (doc.mime_type || '').toLowerCase()

    if (ext === 'pdf' || mime.includes('pdf')) {
      return (
        <div className="doc-icon-wrapper pdf">
          <MdPictureAsPdf />
        </div>
      )
    }

    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext) || mime.includes('image')) {
      return (
        <div className="doc-icon-wrapper image">
          <MdImage />
        </div>
      )
    }

    if (['doc', 'docx'].includes(ext) || mime.includes('word')) {
      return (
        <div className="doc-icon-wrapper doc">
          <MdDescription />
        </div>
      )
    }

    if (['xls', 'xlsx', 'csv'].includes(ext) || mime.includes('sheet')) {
      return (
        <div className="doc-icon-wrapper sheet">
          <MdDescription />
        </div>
      )
    }

    return (
      <div className="doc-icon-wrapper">
        <MdInsertDriveFile />
      </div>
    )
  }

  const handleDownload = async (doc: Document) => {
    try {
      await documentService.downloadDocument(doc.uuid, doc.file_name)
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to download document'
      })
    }
  }

  const handleVerify = (doc: Document) => {
    setConfirmAction({ type: 'verify', doc })
  }

  const handleDelete = (doc: Document) => {
    setConfirmAction({ type: 'delete', doc })
  }

  const executeConfirmAction = async () => {
    if (!confirmAction) return
    setActionLoading(true)
    try {
      if (confirmAction.type === 'verify') {
        await documentService.verifyDocument(confirmAction.doc.uuid)
        setFeedback({
          type: 'success',
          message: `Document "${confirmAction.doc.title}" was verified successfully.`
        })
      } else {
        await documentService.deleteDocument(confirmAction.doc.uuid)
        setFeedback({
          type: 'success',
          message: `Document "${confirmAction.doc.title}" was deleted.`
        })
      }
      setConfirmAction(null)
      onRefresh()
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || `Failed to ${confirmAction.type} document`
      })
    } finally {
      setActionLoading(false)
    }
  }

  if (documents.length === 0) {
    return (
      <div className="doc-table-container">
        <div className="doc-empty-state">
          <MdInsertDriveFile className="doc-empty-icon" />
          <p style={{ margin: 0, fontWeight: 500 }}>No documents uploaded yet</p>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Upload contracts, permits, drawings, or KYC files to see them here.
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="doc-table-container">
      {feedback && (
        <div
          className={`alert ${feedback.type === 'success' ? 'alert-success' : 'alert-error'}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.75rem',
            padding: '10px 14px',
            borderRadius: '6px',
            backgroundColor: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: feedback.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${feedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            fontSize: '0.85rem'
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
            {feedback.type === 'success' ? <MdCheckCircle size={16} color="#059669" /> : <MdWarning size={16} color="#dc2626" />}
            {feedback.message}
          </span>
          <button
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'bold' }}
          >
            ×
          </button>
        </div>
      )}

      <table className="doc-table">
        <thead>
          <tr>
            <th>Document</th>
            <th>Type</th>
            {showEntityColumn && <th>Associated Entity</th>}
            <th>Size</th>
            <th>Uploaded By</th>
            <th>Verification</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr key={doc.uuid}>
              <td>
                <div className="doc-file-cell">
                  {getFileIcon(doc)}
                  <div className="doc-info">
                    <span className="doc-title">{doc.title}</span>
                    <span className="doc-sub">
                      {doc.document_number} • {doc.file_name}
                    </span>
                  </div>
                </div>
              </td>
              <td>
                <span className={`doc-badge ${doc.document_type}`}>
                  {doc.document_type.replace('_', ' ')}
                </span>
              </td>
              {showEntityColumn && (
                <td>
                  {doc.documentable_type ? (
                    <div>
                      <span style={{ fontWeight: 500, color: '#334155' }}>
                        {doc.documentable_name || 'N/A'}
                      </span>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {doc.documentable_type}
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>General</span>
                  )}
                </td>
              )}
              <td style={{ color: '#64748b' }}>{doc.formatted_file_size}</td>
              <td>
                <span style={{ color: '#334155', fontWeight: 500 }}>
                  {doc.uploaded_by?.name || '-'}
                </span>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {new Date(doc.created_at).toLocaleDateString()}
                </div>
              </td>
              <td>
                {doc.is_verified ? (
                  <span className="verified-tag">
                    <MdVerified /> Verified
                  </span>
                ) : (
                  <span className="unverified-tag">
                    <MdHelpOutline /> Unverified
                  </span>
                )}
              </td>
              <td>
                <div className="doc-actions-cell" style={{ justifyContent: 'flex-end' }}>
                  {/* External preview */}
                  {doc.file_url && (
                    <button
                      className="doc-action-btn"
                      onClick={() => window.open(doc.file_url, '_blank')}
                      title="Open in new tab"
                    >
                      <MdOpenInNew />
                    </button>
                  )}

                  {/* Download */}
                  <button
                    className="doc-action-btn"
                    onClick={() => handleDownload(doc)}
                    title="Download file"
                  >
                    <MdFileDownload />
                  </button>

                  {/* Verify button */}
                  {canVerify && !doc.is_verified && (
                    <button
                      className="doc-action-btn verify"
                      onClick={() => handleVerify(doc)}
                      title="Verify document"
                    >
                      <MdCheckCircle /> Verify
                    </button>
                  )}

                  {/* Delete */}
                  {canDelete && (
                    <button
                      className="doc-action-btn delete"
                      onClick={() => handleDelete(doc)}
                      title="Delete document"
                    >
                      <MdDeleteOutline />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Soft Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(confirmAction)}
        title={confirmAction?.type === 'verify' ? 'Verify Document' : 'Delete Document'}
        message={
          confirmAction?.type === 'verify'
            ? `Mark "${confirmAction.doc.title}" as verified and compliance-cleared?`
            : `Are you sure you want to permanently delete "${confirmAction?.doc.title}"?`
        }
        confirmText={confirmAction?.type === 'verify' ? 'Verify' : 'Delete'}
        cancelText="Cancel"
        variant={confirmAction?.type === 'verify' ? 'primary' : 'danger'}
        isLoading={actionLoading}
        onConfirm={executeConfirmAction}
        onClose={() => setConfirmAction(null)}
      />
    </div>
  )
}

export default DocumentsTable
