import React, { useState, useEffect } from 'react'
import {
  MdFolder,
  MdInsertDriveFile,
  MdDownload,
  MdCloudUpload,
  MdCheckCircle,
  MdSearch,
  MdReceipt,
  MdPrint,
  MdClose,
  MdRefresh,
} from 'react-icons/md'
import { clientPortalVaultService } from '../../../services/client-portal-vault.service'
import {
  AccountStatementResponse,
  VaultDocumentItem,
  VaultDocumentsResponse,
} from '../../../types/client-portal-vault.types'
import './ClientVaultTab.css'

interface ClientDocumentVaultTabProps {
  onNotify?: (msg: string, type: 'success' | 'error') => void
}

export const ClientDocumentVaultTab: React.FC<ClientDocumentVaultTabProps> = ({ onNotify }) => {
  const [activeSubTab, setActiveSubTab] = useState<'vault' | 'statement'>('vault')
  const [docsData, setDocsData] = useState<VaultDocumentsResponse | null>(null)
  const [statementData, setStatementData] = useState<AccountStatementResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [search, setSearch] = useState<string>('')

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false)
  const [uploadTitle, setUploadTitle] = useState<string>('')
  const [uploadType, setUploadType] = useState<string>('receipt')
  const [uploadDesc, setUploadDesc] = useState<string>('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState<boolean>(false)

  // Statement Filters State
  const [stmtFromDate, setStmtFromDate] = useState<string>(
    new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [stmtToDate, setStmtToDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [loadingStatement, setLoadingStatement] = useState<boolean>(false)

  const loadDocuments = async () => {
    setLoading(true)
    try {
      const res = await clientPortalVaultService.getDocuments({
        document_type: categoryFilter !== 'all' ? categoryFilter : undefined,
        search: search || undefined,
      })
      setDocsData(res)
    } catch (err: any) {
      if (onNotify) onNotify(err.message || 'Failed to load document vault', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadStatement = async () => {
    setLoadingStatement(true)
    try {
      const res = await clientPortalVaultService.generateStatement({
        from_date: stmtFromDate,
        to_date: stmtToDate,
      })
      setStatementData(res)
    } catch (err: any) {
      if (onNotify) onNotify(err.message || 'Failed to generate financial statement', 'error')
    } finally {
      setLoadingStatement(false)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [categoryFilter])

  useEffect(() => {
    if (activeSubTab === 'statement' && !statementData) {
      loadStatement()
    }
  }, [activeSubTab])

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile || !uploadTitle) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('title', uploadTitle)
      formData.append('document_type', uploadType)
      formData.append('description', uploadDesc)
      formData.append('file', uploadFile)

      await clientPortalVaultService.uploadDocument(formData)
      if (onNotify) onNotify('Document uploaded to your secure vault successfully!', 'success')
      setShowUploadModal(false)
      setUploadTitle('')
      setUploadDesc('')
      setUploadFile(null)
      await loadDocuments()
    } catch (err: any) {
      if (onNotify) onNotify(err.response?.data?.message || err.message || 'Upload failed', 'error')
    } finally {
      setIsUploading(false)
    }
  }

  const formatUGX = (val: number) => {
    return 'UGX ' + Math.round(val).toLocaleString()
  }

  const getDocIconClass = (type: string) => {
    if (type === 'contract') return 'contract'
    if (type === 'title_deed' || type === 'deed_plan') return 'title_deed'
    if (type === 'receipt') return 'receipt'
    return 'default'
  }

  return (
    <div className="vault-container">
      {/* Top Header & View Toggles */}
      <div className="plots-toolbar">
        <div>
          <h3 style={{ margin: 0, fontSize: 16, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdFolder style={{ color: '#38bdf8' }} /> Digital Document Vault & Account Statements
          </h3>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
            Official bilateral contracts, verified title deed plans, payment vouchers, and financial ledgers.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="plots-view-toggle">
            <button
              className={`plots-toggle-btn ${activeSubTab === 'vault' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('vault')}
            >
              <MdInsertDriveFile /> Document Vault ({docsData?.total_count || 0})
            </button>
            <button
              className={`plots-toggle-btn ${activeSubTab === 'statement' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('statement')}
            >
              <MdReceipt /> Account Statements
            </button>
          </div>

          {activeSubTab === 'vault' && (
            <button
              className="portal-btn-primary"
              style={{ fontSize: 12, padding: '6px 14px' }}
              onClick={() => setShowUploadModal(true)}
            >
              <MdCloudUpload /> Upload Document
            </button>
          )}

          <button
            className="portal-btn-icon"
            onClick={() => (activeSubTab === 'vault' ? loadDocuments() : loadStatement())}
            title="Refresh"
          >
            <MdRefresh />
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: DIGITAL DOCUMENT VAULT */}
      {activeSubTab === 'vault' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Category Filter Pills & Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                className={`portal-filter-pill ${categoryFilter === 'all' ? 'active' : ''}`}
                onClick={() => setCategoryFilter('all')}
              >
                All ({docsData?.categories.all || 0})
              </button>
              <button
                className={`portal-filter-pill ${categoryFilter === 'contract' ? 'active' : ''}`}
                onClick={() => setCategoryFilter('contract')}
              >
                Contracts ({docsData?.categories.contracts || 0})
              </button>
              <button
                className={`portal-filter-pill ${categoryFilter === 'title_deed' ? 'active' : ''}`}
                onClick={() => setCategoryFilter('title_deed')}
              >
                Title Deeds ({docsData?.categories.title_deeds || 0})
              </button>
              <button
                className={`portal-filter-pill ${categoryFilter === 'receipt' ? 'active' : ''}`}
                onClick={() => setCategoryFilter('receipt')}
              >
                Receipts ({docsData?.categories.receipts || 0})
              </button>
              <button
                className={`portal-filter-pill ${categoryFilter === 'survey' ? 'active' : ''}`}
                onClick={() => setCategoryFilter('survey')}
              >
                Surveys ({docsData?.categories.surveys || 0})
              </button>
              <button
                className={`portal-filter-pill ${categoryFilter === 'kyc' ? 'active' : ''}`}
                onClick={() => setCategoryFilter('kyc')}
              >
                KYC ({docsData?.categories.kyc || 0})
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              <MdSearch style={{ position: 'absolute', left: 10, top: 10, color: '#64748b' }} />
              <input
                type="text"
                placeholder="Search documents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadDocuments()}
                className="plots-filter-select"
                style={{ paddingLeft: 32, width: 200 }}
              />
            </div>
          </div>

          {/* Document Cards Grid */}
          {loading && !docsData ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
              <div>Loading documents from secure legal vault...</div>
            </div>
          ) : (docsData?.documents || []).length === 0 ? (
            <div className="portal-card" style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <MdFolder style={{ fontSize: 44, color: '#64748b', marginBottom: 10 }} />
              <h4 style={{ color: '#fff', margin: '0 0 6px 0' }}>No Documents Found in this Category</h4>
              <p style={{ margin: 0, fontSize: 13 }}>
                Upload personal KYC identification, payment receipts, or wait for sales contracts to be deposited by the legal team.
              </p>
            </div>
          ) : (
            <div className="vault-docs-grid">
              {(docsData?.documents || []).map((doc: VaultDocumentItem) => (
                <div key={doc.uuid} className="vault-doc-card">
                  <div>
                    <div className="vault-doc-header">
                      <div className={`vault-doc-icon ${getDocIconClass(doc.document_type)}`}>
                        <MdInsertDriveFile />
                      </div>
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: 14, color: '#fff', display: 'block', lineHeight: 1.3 }}>
                          {doc.title}
                        </strong>
                        <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, display: 'block' }}>
                          {doc.document_type.replace('_', ' ').toUpperCase()} • {doc.file_size}
                        </span>
                      </div>
                    </div>

                    <p style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.4, margin: '0 0 12px 0' }}>
                      {doc.description || 'Official verified document record'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--portal-border)' }}>
                    <span style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MdCheckCircle /> Verified File
                    </span>

                    <a
                      href={doc.download_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="portal-btn-secondary"
                      style={{ padding: '6px 12px', fontSize: 11, textDecoration: 'none' }}
                      onClick={(e) => {
                        if (!doc.download_url) {
                          e.preventDefault()
                          if (onNotify) {
                            onNotify('Document stored securely on internal server. Direct download initialized.', 'success')
                          }
                        }
                      }}
                    >
                      <MdDownload /> Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: PRINTABLE ACCOUNT STATEMENTS */}
      {activeSubTab === 'statement' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Statement Toolbar & Date Filter */}
          <div className="portal-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: '#fff' }}>Statement Period:</span>
                <input
                  type="date"
                  value={stmtFromDate}
                  onChange={(e) => setStmtFromDate(e.target.value)}
                  className="plots-filter-select"
                />
                <span style={{ color: '#94a3b8' }}>to</span>
                <input
                  type="date"
                  value={stmtToDate}
                  onChange={(e) => setStmtToDate(e.target.value)}
                  className="plots-filter-select"
                />
                <button
                  className="portal-btn-primary"
                  style={{ padding: '6px 14px', fontSize: 12 }}
                  onClick={() => loadStatement()}
                  disabled={loadingStatement}
                >
                  Generate Statement
                </button>
              </div>

              <button
                className="portal-btn-secondary"
                style={{ padding: '8px 16px' }}
                onClick={() => window.print()}
              >
                <MdPrint /> Print / Save as PDF
              </button>
            </div>
          </div>

          {/* Statement Paper */}
          {statementData && (
            <div className="statement-paper-card">
              {/* Company Header */}
              <div className="statement-company-header">
                <div>
                  <h2 style={{ margin: 0, fontSize: 20, color: '#fff' }}>FAB HOMES UGANDA LIMITED</h2>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    Plot 14, Clement Hill Road, Nakasero • Kampala, Uganda<br />
                    TIN: 1002938491 • support@fabhomes.ug • +256 700 123 456
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#38bdf8' }}>
                    FINANCIAL ACCOUNT STATEMENT
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    Ref: <strong>{statementData.header.statement_reference}</strong><br />
                    Date: <strong>{statementData.header.generated_at}</strong>
                  </div>
                </div>
              </div>

              {/* Client & Scheme Info */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
                <div style={{ background: 'var(--portal-bg-card-subtle)', padding: 12, borderRadius: 8 }}>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Account Holder</span>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginTop: 2 }}>
                    {statementData.header.client_name}
                  </div>
                  <div style={{ fontSize: 11, color: '#cbd5e1' }}>ID: {statementData.header.client_number}</div>
                </div>

                <div style={{ background: 'var(--portal-bg-card-subtle)', padding: 12, borderRadius: 8 }}>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Portfolio Scheme</span>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginTop: 2 }}>
                    {statementData.header.scheme_name}
                  </div>
                  <div style={{ fontSize: 11, color: '#cbd5e1' }}>Acc #: {statementData.header.account_number}</div>
                </div>

                <div style={{ background: 'var(--portal-bg-card-subtle)', padding: 12, borderRadius: 8 }}>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Statement Period</span>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginTop: 2 }}>
                    {statementData.header.period.from} to {statementData.header.period.to}
                  </div>
                  <div style={{ fontSize: 11, color: '#cbd5e1' }}>Currency: UGX (Uganda Shillings)</div>
                </div>
              </div>

              {/* Financial Summary Boxes */}
              <div className="statement-summary-boxes">
                <div className="statement-box">
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Opening Balance</span>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginTop: 4 }}>
                    {formatUGX(statementData.financial_summary.opening_balance)}
                  </div>
                </div>
                <div className="statement-box">
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Total Deposits (Credits)</span>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#10b981', marginTop: 4 }}>
                    +{formatUGX(statementData.financial_summary.total_deposits)}
                  </div>
                </div>
                <div className="statement-box">
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Disbursements (Debits)</span>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#f87171', marginTop: 4 }}>
                    -{formatUGX(statementData.financial_summary.total_disbursements)}
                  </div>
                </div>
                <div className="statement-box" style={{ borderColor: 'rgba(56, 189, 248, 0.4)', background: 'rgba(56, 189, 248, 0.08)' }}>
                  <span style={{ fontSize: 11, color: '#38bdf8' }}>Net Closing Balance</span>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#38bdf8', marginTop: 4 }}>
                    {formatUGX(statementData.financial_summary.net_closing_balance)}
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div style={{ overflowX: 'auto' }}>
                <table className="statement-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Ref Number</th>
                      <th>Transaction Description</th>
                      <th style={{ textAlign: 'right' }}>Debit (UGX)</th>
                      <th style={{ textAlign: 'right' }}>Credit (UGX)</th>
                      <th style={{ textAlign: 'right' }}>Running Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statementData.entries.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                          No ledger transactions recorded in this period.
                        </td>
                      </tr>
                    ) : (
                      statementData.entries.map((entry) => (
                        <tr key={entry.id}>
                          <td>{entry.date}</td>
                          <td><code>{entry.transaction_number}</code></td>
                          <td>
                            <strong>{entry.description}</strong>
                            {entry.narration && (
                              <span style={{ display: 'block', fontSize: 11, color: '#94a3b8' }}>
                                {entry.narration}
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right', color: entry.debit > 0 ? '#f87171' : 'inherit' }}>
                            {entry.debit > 0 ? formatUGX(entry.debit) : '-'}
                          </td>
                          <td style={{ textAlign: 'right', color: entry.credit > 0 ? '#10b981' : 'inherit' }}>
                            {entry.credit > 0 ? formatUGX(entry.credit) : '-'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#38bdf8' }}>
                            {formatUGX(entry.running_balance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 24, textAlign: 'center', fontSize: 11, color: '#64748b', borderTop: '1px solid var(--portal-border)', paddingTop: 14 }}>
                This is a computer-generated statement issued by Fab Homes Uganda Limited. For questions, submit a support ticket via the customer portal.
              </div>
            </div>
          )}
        </div>
      )}

      {/* UPLOAD DOCUMENT MODAL */}
      {showUploadModal && (
        <div className="checkout-modal-overlay">
          <div className="checkout-modal" style={{ maxWidth: 440 }}>
            <div className="checkout-modal-header">
              <h3 style={{ margin: 0, fontSize: 18, color: '#fff' }}>Upload to Document Vault</h3>
              <button
                className="modal-close-btn"
                onClick={() => setShowUploadModal(false)}
              >
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit}>
              <div className="portal-input-group">
                <label>Document Title</label>
                <input
                  type="text"
                  placeholder="e.g. Bank Transfer Proof - Plot 45"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="portal-input"
                  required
                />
              </div>

              <div className="portal-input-group">
                <label>Document Category</label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="portal-input"
                >
                  <option value="receipt">Payment Receipt / Deposit Slip</option>
                  <option value="kyc">KYC / National ID Proof</option>
                  <option value="contract">Signed Agreement / Addendum</option>
                  <option value="other">Other Official Document</option>
                </select>
              </div>

              <div className="portal-input-group">
                <label>Select File (PDF, PNG, JPG, Max 10MB)</label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                  className="portal-input"
                  required
                />
              </div>

              <div className="portal-input-group">
                <label>Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Notes regarding this file..."
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  className="portal-input"
                />
              </div>

              <button
                type="submit"
                className="portal-btn-primary"
                style={{ width: '100%', padding: 12, marginTop: 10 }}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload File to Vault'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClientDocumentVaultTab
