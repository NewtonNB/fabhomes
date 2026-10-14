import React, { useState, useEffect, useCallback } from 'react'
import {
  MdAdd,
  MdSearch,
  MdFolder,
  MdVerifiedUser,
  MdStorage,
  MdOutlineAssignmentTurnedIn,
} from 'react-icons/md'
import documentService from '../../services/document.service'
import { Document, DocumentStatistics } from '../../types/document.types'
import DocumentsTable from '../../components/documents/DocumentsTable'
import DocumentUploadModal from '../../components/documents/DocumentUploadModal'
import './DocumentsPage.css'

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([])
  const [stats, setStats] = useState<DocumentStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [verifiedFilter, setVerifiedFilter] = useState('')
  const [entityTypeFilter, setEntityTypeFilter] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true)
      const response = await documentService.getDocuments({
        search: search || undefined,
        document_type: typeFilter || undefined,
        verified_only: verifiedFilter === 'verified' ? true : undefined,
        documentable_type: entityTypeFilter || undefined,
        page: currentPage,
        per_page: 15,
      })

      if (response && response.data) {
        setDocuments(response.data)
        if (response.meta) {
          setTotalPages(response.meta.last_page)
          setTotalCount(response.meta.total)
        }
      }
    } catch (err) {
      console.error('Error fetching documents:', err)
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter, verifiedFilter, entityTypeFilter, currentPage])

  const fetchStatistics = async () => {
    try {
      const statsData = await documentService.getStatistics()
      setStats(statsData)
    } catch (err) {
      console.warn('Could not load document statistics:', err)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  useEffect(() => {
    fetchStatistics()
  }, [])

  const formatStorageSize = (bytes: number) => {
    if (!bytes) return '0 MB'
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB'
    return (bytes / 1048576).toFixed(1) + ' MB'
  }

  return (
    <div className="documents-page">
      {/* Header */}
      <div className="documents-header">
        <div className="documents-title-section">
          <h1>Document Management</h1>
          <p className="documents-subtitle">
            Repository of all contracts, plans, permits, inspection reports, and KYC records
          </p>
        </div>
        <button
          className="doc-upload-btn"
          onClick={() => setIsUploadModalOpen(true)}
        >
          <MdAdd /> Upload Document
        </button>
      </div>

      {/* Stats Cards */}
      <div className="doc-stats-grid">
        <div className="doc-stat-card">
          <div className="doc-stat-icon blue">
            <MdFolder />
          </div>
          <div className="doc-stat-info">
            <span className="doc-stat-value">{stats ? stats.total_documents : totalCount}</span>
            <span className="doc-stat-label">Total Documents</span>
          </div>
        </div>

        <div className="doc-stat-card">
          <div className="doc-stat-icon green">
            <MdVerifiedUser />
          </div>
          <div className="doc-stat-info">
            <span className="doc-stat-value">{stats ? stats.verified_documents : 0}</span>
            <span className="doc-stat-label">Verified Documents</span>
          </div>
        </div>

        <div className="doc-stat-card">
          <div className="doc-stat-icon amber">
            <MdOutlineAssignmentTurnedIn />
          </div>
          <div className="doc-stat-info">
            <span className="doc-stat-value">{stats ? stats.active_documents : totalCount}</span>
            <span className="doc-stat-label">Active Records</span>
          </div>
        </div>

        <div className="doc-stat-card">
          <div className="doc-stat-icon purple">
            <MdStorage />
          </div>
          <div className="doc-stat-info">
            <span className="doc-stat-value">
              {stats ? formatStorageSize(stats.total_storage_bytes) : '0 MB'}
            </span>
            <span className="doc-stat-label">Storage Used</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="doc-filters-bar">
        <div className="doc-search-box">
          <MdSearch className="doc-search-icon" />
          <input
            type="text"
            placeholder="Search documents by title, number, or filename..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
          />
        </div>

        <select
          className="doc-filter-select"
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value)
            setCurrentPage(1)
          }}
        >
          <option value="">All Document Types</option>
          <option value="contract">Contracts & Agreements</option>
          <option value="floor_plan">Floor Plans & Drawings</option>
          <option value="permit">Permits & Approvals</option>
          <option value="receipt">Payment Receipts</option>
          <option value="kyc">KYC & ID Documents</option>
          <option value="survey">Land Surveys</option>
          <option value="inspection_report">Inspection Reports</option>
          <option value="title_deed">Title Deeds</option>
          <option value="invoice">Invoices</option>
          <option value="other">Other</option>
        </select>

        <select
          className="doc-filter-select"
          value={entityTypeFilter}
          onChange={(e) => {
            setEntityTypeFilter(e.target.value)
            setCurrentPage(1)
          }}
        >
          <option value="">All Entities</option>
          <option value="project">Projects</option>
          <option value="site">Sites</option>
          <option value="unit">Units</option>
          <option value="client">Clients</option>
          <option value="payment">Payments</option>
        </select>

        <select
          className="doc-filter-select"
          value={verifiedFilter}
          onChange={(e) => {
            setVerifiedFilter(e.target.value)
            setCurrentPage(1)
          }}
        >
          <option value="">All Verification Statuses</option>
          <option value="verified">Verified Only</option>
        </select>
      </div>

      {/* Documents Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
          Loading documents...
        </div>
      ) : (
        <>
          <DocumentsTable
            documents={documents}
            onRefresh={() => {
              fetchDocuments()
              fetchStatistics()
            }}
            showEntityColumn={true}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="doc-pagination">
              <div>
                Showing page {currentPage} of {totalPages} ({totalCount} total documents)
              </div>
              <div className="doc-pagination-btns">
                <button
                  className="doc-page-btn"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <button
                  className="doc-page-btn"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          fetchDocuments()
          fetchStatistics()
        }}
      />
    </div>
  )
}

export default DocumentsPage
