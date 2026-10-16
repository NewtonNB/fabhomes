import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  MdAdd,
  MdSearch,
  MdRefresh,
  MdVisibility,
  MdReceiptLong,
  MdAccountBalanceWallet,
  MdHourglassTop,
  MdCheckCircle,
} from 'react-icons/md'
import certificateService from '../../services/certificate.service'
import {
  PaymentCertificate,
  CertificateStatistics,
  CertificateStatus,
  CertificateType,
} from '../../types/certificate.types'
import '../contracts/ContractsList.css'
import './CertificatesList.css'

export const CertificatesList: React.FC = () => {
  const navigate = useNavigate()

  // State
  const [certificates, setCertificates] = useState<PaymentCertificate[]>([])
  const [stats, setStats] = useState<CertificateStatistics | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<CertificateStatus | ''>('')
  const [typeFilter, setTypeFilter] = useState<CertificateType | ''>('')
  const [page, setPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [totalCount, setTotalCount] = useState<number>(0)

  // Fetch Certificates
  const fetchCertificates = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await certificateService.getPaymentCertificates({
        status: statusFilter || undefined,
        certificate_type: typeFilter || undefined,
        search: search || undefined,
        page,
        per_page: 15,
      })
      const items = res?.data || []
      setCertificates(Array.isArray(items) ? items : [])
      setTotalPages(res?.meta?.last_page || 1)
      setTotalCount(res?.meta?.total || items.length)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch payment certificates')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter, search, page])

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const data = await certificateService.getPaymentCertificateStatistics()
      setStats(data)
    } catch (err) {
      console.warn('Failed to fetch certificate statistics:', err)
    }
  }, [])

  useEffect(() => {
    fetchCertificates()
    fetchStats()
  }, [fetchCertificates, fetchStats])

  const formatCurrency = (val: number, currency: string = 'UGX') => {
    return `${currency} ${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  const getStatusBadgeClass = (status: CertificateStatus) => {
    switch (status) {
      case 'draft':
        return 'badge-draft'
      case 'submitted':
        return 'badge-suspended'
      case 'verified_by_site_manager':
        return 'badge-trade'
      case 'approved_by_finance':
        return 'badge-active'
      case 'authorized_by_admin':
        return 'badge-completed'
      case 'paid':
        return 'badge-active'
      case 'rejected':
        return 'badge-terminated'
      default:
        return 'badge-draft'
    }
  }

  const formatStatusLabel = (status: CertificateStatus) => {
    switch (status) {
      case 'verified_by_site_manager':
        return 'Site Verified'
      case 'approved_by_finance':
        return 'Finance Approved'
      case 'authorized_by_admin':
        return 'Admin Authorized'
      default:
        return status.replace(/_/g, ' ')
    }
  }

  return (
    <div className="certificates-page">
      {/* Page Header */}
      <div className="certificates-header">
        <div>
          <h1>Payment Certificates & Valuations</h1>
          <p>Valuations, statutory URA withholding tax (6%), retention deductions (5%), and multi-tier approval workflow.</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => { fetchCertificates(); fetchStats(); }} disabled={loading}>
            <MdRefresh /> Refresh
          </button>
          <Link to="/certificates/new" className="btn-primary">
            <MdAdd /> Issue New Certificate
          </Link>
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <MdReceiptLong />
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Certified Gross</div>
            <div className="stat-value">{formatCurrency(stats?.total_gross_certified ?? 0)}</div>
            <div className="stat-subtext">Across {stats?.total_certificates ?? totalCount} certificates</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon amber">
            <MdHourglassTop />
          </div>
          <div className="stat-content">
            <div className="stat-label">Retention Held (5%)</div>
            <div className="stat-value">{formatCurrency(stats?.total_retention_deducted ?? 0)}</div>
            <div className="stat-subtext">Tax Withheld (6%): {formatCurrency(stats?.total_wht_deducted ?? 0)}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <MdCheckCircle />
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Disbursed (Paid)</div>
            <div className="stat-value">{formatCurrency(stats?.total_paid_amount ?? 0)}</div>
            <div className="stat-subtext">Net Certified: {formatCurrency(stats?.total_net_certified ?? 0)}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <MdAccountBalanceWallet />
          </div>
          <div className="stat-content">
            <div className="stat-label">Pending Payout</div>
            <div className="stat-value">{formatCurrency(stats?.pending_payout ?? 0)}</div>
            <div className="stat-subtext">
              Authorized awaiting payment: {stats?.authorized_count ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Filter Tabs */}
      <div className="status-tabs">
        <button
          className={`status-tab ${statusFilter === '' ? 'active' : ''}`}
          onClick={() => { setStatusFilter(''); setPage(1); }}
        >
          All Stages <span className="tab-badge">{stats?.total_certificates ?? 0}</span>
        </button>
        <button
          className={`status-tab ${statusFilter === 'draft' ? 'active' : ''}`}
          onClick={() => { setStatusFilter('draft'); setPage(1); }}
        >
          Draft <span className="tab-badge">{stats?.draft_count ?? 0}</span>
        </button>
        <button
          className={`status-tab ${statusFilter === 'submitted' ? 'active' : ''}`}
          onClick={() => { setStatusFilter('submitted'); setPage(1); }}
        >
          Awaiting Site Verification <span className="tab-badge">{stats?.submitted_count ?? 0}</span>
        </button>
        <button
          className={`status-tab ${statusFilter === 'verified_by_site_manager' ? 'active' : ''}`}
          onClick={() => { setStatusFilter('verified_by_site_manager'); setPage(1); }}
        >
          Site Verified <span className="tab-badge">{stats?.verified_count ?? 0}</span>
        </button>
        <button
          className={`status-tab ${statusFilter === 'approved_by_finance' ? 'active' : ''}`}
          onClick={() => { setStatusFilter('approved_by_finance'); setPage(1); }}
        >
          Finance Approved <span className="tab-badge">{stats?.approved_count ?? 0}</span>
        </button>
        <button
          className={`status-tab ${statusFilter === 'authorized_by_admin' ? 'active' : ''}`}
          onClick={() => { setStatusFilter('authorized_by_admin'); setPage(1); }}
        >
          Authorized for Payment <span className="tab-badge">{stats?.authorized_count ?? 0}</span>
        </button>
        <button
          className={`status-tab ${statusFilter === 'paid' ? 'active' : ''}`}
          onClick={() => { setStatusFilter('paid'); setPage(1); }}
        >
          Paid <span className="tab-badge">{stats?.paid_count ?? 0}</span>
        </button>
        <button
          className={`status-tab ${statusFilter === 'rejected' ? 'active' : ''}`}
          onClick={() => { setStatusFilter('rejected'); setPage(1); }}
        >
          Rejected <span className="tab-badge">{stats?.rejected_count ?? 0}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-card">
        <div className="search-box">
          <MdSearch className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by certificate #, contract #, subcontractor, or description..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>

        <div className="filter-selects">
          <select
            className="filter-select"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as CertificateType | '')
              setPage(1)
            }}
          >
            <option value="">All Certificate Types</option>
            <option value="interim">Interim Valuation</option>
            <option value="practical_completion">Practical Completion</option>
            <option value="final">Final Account</option>
            <option value="retention_release">Retention Release</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="table-card">
        {loading ? (
          <div className="loading-box">
            <div className="spinner"></div>
            <p>Loading payment certificates...</p>
          </div>
        ) : certificates.length === 0 ? (
          <div className="empty-box">
            <p>No payment certificates found matching current filters.</p>
            <Link to="/certificates/new" className="btn-primary" style={{ marginTop: '0.75rem' }}>
              <MdAdd /> Issue New Certificate
            </Link>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="contracts-table">
              <thead>
                <tr>
                  <th>Certificate No.</th>
                  <th>Subcontractor / Contract</th>
                  <th>Type</th>
                  <th>Valuation Period</th>
                  <th>Gross Valuation</th>
                  <th>Retention (5%)</th>
                  <th>WHT (6%)</th>
                  <th>Net Certified</th>
                  <th>Stage / Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((cert) => (
                  <tr key={cert.uuid}>
                    <td>
                      <Link to={`/certificates/${cert.uuid}`} className="contract-num">
                        {cert.certificate_number}
                      </Link>
                    </td>
                    <td>
                      <span className="subcontractor-title">
                        {cert.contract?.subcontractor_name || 'Subcontractor'}
                      </span>
                      <span className="subcontractor-name">
                        {cert.contract?.contract_number} &bull; {cert.contract?.title}
                      </span>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>
                      <span className="badge badge-trade">{cert.certificate_type.replace('_', ' ')}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem' }}>{cert.valuation_period_start} &rarr; {cert.valuation_period_end}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(cert.gross_amount, cert.currency)}</td>
                    <td style={{ color: '#d97706' }}>{formatCurrency(cert.retention_deducted, cert.currency)}</td>
                    <td style={{ color: '#64748b' }}>{formatCurrency(cert.withholding_tax_amount, cert.currency)}</td>
                    <td style={{ fontWeight: 700, color: '#16a34a' }}>
                      {formatCurrency(cert.net_certified_amount, cert.currency)}
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(cert.status)}`}>
                        {formatStatusLabel(cert.status)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="action-btn view"
                        title="View Certificate Details & Workflow"
                        onClick={() => navigate(`/certificates/${cert.uuid}`)}
                      >
                        <MdVisibility />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {certificates.length > 0 && (
          <div className="pagination-container">
            <div>
              Showing page {page} of {totalPages} ({totalCount} total certificates)
            </div>
            <div className="pagination-buttons">
              <button
                className="btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                className="btn-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CertificatesList
