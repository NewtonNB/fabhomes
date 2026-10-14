import React from 'react'
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
} from 'react-icons/md'
import { Document } from '../../types/document.types'
import documentService from '../../services/document.service'
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
      alert(err.message || 'Failed to download document')
    }
  }

  const handleVerify = async (doc: Document) => {
    if (!window.confirm(`Verify document "${doc.title}"?`)) return
    try {
      await documentService.verifyDocument(doc.uuid)
      onRefresh()
    } catch (err: any) {
      alert(err.message || 'Failed to verify document')
    }
  }

  const handleDelete = async (doc: Document) => {
    if (!window.confirm(`Delete document "${doc.title}"?`)) return
    try {
      await documentService.deleteDocument(doc.uuid)
      onRefresh()
    } catch (err: any) {
      alert(err.message || 'Failed to delete document')
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
    </div>
  )
}

export default DocumentsTable
