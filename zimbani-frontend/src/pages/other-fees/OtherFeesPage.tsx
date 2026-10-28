import React, { useState, useEffect, useMemo } from 'react'
import {
  MdReceipt,
  MdAdd,
  MdSearch,
  MdRefresh,
  MdPrint,
  MdPayments,
  MdMoneyOff,
  MdDelete,
  MdPendingActions,
  MdCheckCircle,
  MdReceiptLong,
  MdClose,
  MdShare,
} from 'react-icons/md'
import otherFeeService from '../../services/other-fee.service'
import { clientService } from '../../services/client.service'
import siteService from '../../services/site.service'
import {
  OtherFee,
  OtherFeeCategory,
  OtherFeeFormData,
  OtherFeePaymentFormData,
  OtherFeeStatistics,
} from '../../types/other-fee.types'
import { Client } from '../../types/client.types'
import { Site } from '../../types/site.types'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { formatAmountInWords } from '../../utils/numberToWords'
import './OtherFeesPage.css'

export const OtherFeesPage: React.FC = () => {
  const [fees, setFees] = useState<OtherFee[]>([])
  const [categories, setCategories] = useState<OtherFeeCategory[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [statistics, setStatistics] = useState<OtherFeeStatistics>({
    total_billed: 0,
    total_collected: 0,
    total_pending: 0,
    total_waived: 0,
    count_all: 0,
    count_pending: 0,
    count_partial: 0,
    count_paid: 0,
    count_waived: 0,
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'partial' | 'paid' | 'waived'>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showWaiveModal, setShowWaiveModal] = useState(false)
  const [showVoucherModal, setShowVoucherModal] = useState(false)
  const [selectedFee, setSelectedFee] = useState<OtherFee | null>(null)

  // Confirmation dialog for soft deletes
  const [feeToDelete, setFeeToDelete] = useState<OtherFee | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // New Fee Form state
  const [newFee, setNewFee] = useState<OtherFeeFormData>({
    client_id: '',
    category_code: 'legal_agreement',
    title: 'Legal Documentation & Sales Agreement Fee',
    amount: 350000,
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: '',
    site_id: '',
    notes: '',
  })
  const [submittingFee, setSubmittingFee] = useState(false)

  // Payment Form state
  const [paymentForm, setPaymentForm] = useState<OtherFeePaymentFormData>({
    payment_amount: 0,
    payment_method: 'mtn_momo',
    payment_reference: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [submittingPayment, setSubmittingPayment] = useState(false)

  // Waive Form state
  const [waiverReason, setWaiverReason] = useState('')
  const [submittingWaiver, setSubmittingWaiver] = useState(false)

  // Load Initial Data
  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [feeRes, catRes, clientRes, siteRes] = await Promise.allSettled([
        otherFeeService.getFees({ per_page: 100 }),
        otherFeeService.getCategories(),
        clientService.getClients({ per_page: 100 }),
        siteService.getSites({ per_page: 100 }),
      ])

      if (feeRes.status === 'fulfilled') {
        setFees(feeRes.value.data)
        setStatistics(feeRes.value.statistics)
      } else {
        throw new Error('Failed to load other fees list')
      }

      if (catRes.status === 'fulfilled') {
        setCategories(catRes.value)
      }

      if (clientRes.status === 'fulfilled') {
        const rawClients = (clientRes.value as any)?.data?.data || (clientRes.value as any)?.data || (Array.isArray(clientRes.value) ? clientRes.value : [])
        setClients(Array.isArray(rawClients) ? rawClients : [])
      }

      if (siteRes.status === 'fulfilled') {
        setSites(siteRes.value.data || [])
      }
    } catch (err: any) {
      setError(err.message || 'Error loading other fees')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Auto-fill title & standard amount when category changes
  const handleCategoryChange = (code: string) => {
    const selected = categories.find((c) => c.code === code)
    setNewFee((prev) => ({
      ...prev,
      category_code: code,
      title: selected ? selected.name : prev.title,
      amount: selected ? Number(selected.standard_amount) : prev.amount,
      description: selected?.description || '',
    }))
  }

  // Create Fee Submit
  const handleCreateFee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFee.client_id) {
      setActionFeedback({ type: 'error', message: 'Please select a registered client.' })
      return
    }
    try {
      setSubmittingFee(true)
      const created = await otherFeeService.createFee({
        ...newFee,
        amount: Number(newFee.amount),
        site_id: newFee.site_id ? Number(newFee.site_id) : undefined,
      })
      setActionFeedback({
        type: 'success',
        message: `Fee assessment ${created.fee_number} generated successfully.`,
      })
      setShowCreateModal(false)
      loadData()
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Failed to assess fee.',
      })
    } finally {
      setSubmittingFee(false)
    }
  }

  // Record Payment Launch
  const openPaymentModal = (fee: OtherFee) => {
    setSelectedFee(fee)
    setPaymentForm({
      payment_amount: Number(fee.balance_due) || Number(fee.amount),
      payment_method: 'mtn_momo',
      payment_reference: '',
      payment_date: new Date().toISOString().split('T')[0],
      notes: '',
    })
    setShowPaymentModal(true)
  }

  // Payment Submit
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFee) return
    try {
      setSubmittingPayment(true)
      const updated = await otherFeeService.recordPayment(selectedFee.uuid, {
        ...paymentForm,
        payment_amount: Number(paymentForm.payment_amount),
      })
      setActionFeedback({
        type: 'success',
        message: `Payment of UGX ${Number(paymentForm.payment_amount).toLocaleString()} recorded. Receipt ${updated.receipt_number || ''} issued.`,
      })
      setShowPaymentModal(false)
      setSelectedFee(updated)
      setShowVoucherModal(true)
      loadData()
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Failed to record payment.',
      })
    } finally {
      setSubmittingPayment(false)
    }
  }

  // Waive Launch
  const openWaiveModal = (fee: OtherFee) => {
    setSelectedFee(fee)
    setWaiverReason('')
    setShowWaiveModal(true)
  }

  // Waive Submit
  const handleWaiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFee) return
    if (!waiverReason.trim()) {
      setActionFeedback({ type: 'error', message: 'Waiver justification reason is mandatory.' })
      return
    }
    try {
      setSubmittingWaiver(true)
      await otherFeeService.waiveFee(selectedFee.uuid, waiverReason.trim())
      setActionFeedback({
        type: 'success',
        message: `Fee ${selectedFee.fee_number} has been officially waived.`,
      })
      setShowWaiveModal(false)
      loadData()
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Failed to waive fee.',
      })
    } finally {
      setSubmittingWaiver(false)
    }
  }

  // Delete Confirm
  const handleConfirmDelete = async () => {
    if (!feeToDelete) return
    try {
      setIsDeleting(true)
      await otherFeeService.deleteFee(feeToDelete.uuid)
      setActionFeedback({
        type: 'success',
        message: `Fee ${feeToDelete.fee_number} was successfully deleted.`,
      })
      setFeeToDelete(null)
      loadData()
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Failed to delete fee.',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // WhatsApp Share
  const handleWhatsAppShare = (fee: OtherFee) => {
    const clientName = fee.client ? `${fee.client.first_name} ${fee.client.last_name}` : 'Valued Client'
    const statusText = fee.status.toUpperCase()
    const text =
      `*FAB HOMES UGANDA - OFFICIAL FEE RECEIPT & VOUCHER*\n\n` +
      `Fee No: ${fee.fee_number}\n` +
      `Receipt No: ${fee.receipt_number || 'PENDING SETTLEMENT'}\n` +
      `Client: ${clientName} (${fee.client?.client_number || ''})\n` +
      `Particulars: ${fee.category_name}\n` +
      `Total Billed: UGX ${Number(fee.amount).toLocaleString()}\n` +
      `Amount Paid: UGX ${Number(fee.amount_paid).toLocaleString()}\n` +
      `Balance Due: UGX ${Number(fee.balance_due).toLocaleString()}\n` +
      `Status: ${statusText}\n` +
      `Payment Method: ${fee.payment_method ? fee.payment_method.toUpperCase() : 'N/A'}\n\n` +
      `Official certification seal verified by Fab Homes Uganda Limited.`
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank')
  }

  // Filtered List
  const filteredFees = useMemo(() => {
    return fees.filter((f) => {
      // Status filter
      if (selectedStatus !== 'all' && f.status !== selectedStatus) return false
      // Category filter
      if (selectedCategory !== 'all' && f.category_code !== selectedCategory) return false
      // Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const clientMatch = f.client
          ? `${f.client.first_name} ${f.client.last_name} ${f.client.client_number}`.toLowerCase().includes(term)
          : false
        const feeNumMatch = f.fee_number.toLowerCase().includes(term)
        const receiptMatch = (f.receipt_number || '').toLowerCase().includes(term)
        const titleMatch = f.title.toLowerCase().includes(term)
        if (!clientMatch && !feeNumMatch && !receiptMatch && !titleMatch) return false
      }
      return true
    })
  }, [fees, selectedStatus, selectedCategory, searchTerm])

  return (
    <div className="other-fees-container">
      {/* Header */}
      <div className="other-fees-header">
        <div>
          <h1>Other Fees Management</h1>
          <p>Assess, invoice, track, and collect legal, boundary survey, deed mutation, and inspection fees.</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={loadData}>
            <MdRefresh /> Refresh
          </button>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            <MdAdd /> Assess New Fee
          </button>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {error && (
        <div className="feedback-banner feedback-error">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <MdClose />
          </button>
        </div>
      )}
      {actionFeedback && (
        <div className={`feedback-banner feedback-${actionFeedback.type}`}>
          <span>{actionFeedback.message}</span>
          <button
            onClick={() => setActionFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <MdClose />
          </button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrapper kpi-icon-billed">
            <MdReceipt />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Invoiced Fees</span>
            <span className="kpi-value">UGX {Number(statistics.total_billed).toLocaleString()}</span>
            <span className="kpi-subtext">{statistics.count_all} fee assessments</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper kpi-icon-collected">
            <MdCheckCircle />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Fees Collected</span>
            <span className="kpi-value">UGX {Number(statistics.total_collected).toLocaleString()}</span>
            <span className="kpi-subtext">{statistics.count_paid} fully settled</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper kpi-icon-pending">
            <MdPendingActions />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Pending / Unpaid Balance</span>
            <span className="kpi-value">UGX {Number(statistics.total_pending).toLocaleString()}</span>
            <span className="kpi-subtext">{statistics.count_pending} unpaid / {statistics.count_partial} partial</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper kpi-icon-waived">
            <MdMoneyOff />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Waived Fees</span>
            <span className="kpi-value">UGX {Number(statistics.total_waived).toLocaleString()}</span>
            <span className="kpi-subtext">{statistics.count_waived} statutory waivers</span>
          </div>
        </div>
      </div>

      {/* Draft / Pending Prominence Filter Pills */}
      <div className="filter-pills-bar">
        <button
          className={`filter-pill ${selectedStatus === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedStatus('all')}
        >
          <MdReceiptLong /> All Fees <span className="pill-count">{statistics.count_all}</span>
        </button>
        <button
          className={`filter-pill ${selectedStatus === 'pending' ? 'active' : ''}`}
          onClick={() => setSelectedStatus('pending')}
        >
          <MdPendingActions /> Pending / Unpaid <span className="pill-count">{statistics.count_pending}</span>
        </button>
        <button
          className={`filter-pill ${selectedStatus === 'partial' ? 'active' : ''}`}
          onClick={() => setSelectedStatus('partial')}
        >
          <MdPayments /> Partial Payments <span className="pill-count">{statistics.count_partial}</span>
        </button>
        <button
          className={`filter-pill ${selectedStatus === 'paid' ? 'active' : ''}`}
          onClick={() => setSelectedStatus('paid')}
        >
          <MdCheckCircle /> Fully Paid <span className="pill-count">{statistics.count_paid}</span>
        </button>
        <button
          className={`filter-pill ${selectedStatus === 'waived' ? 'active' : ''}`}
          onClick={() => setSelectedStatus('waived')}
        >
          <MdMoneyOff /> Waived <span className="pill-count">{statistics.count_waived}</span>
        </button>
      </div>

      {/* Search and Category Filter Card */}
      <div className="search-filter-card">
        <div className="search-box">
          <MdSearch />
          <input
            type="text"
            className="search-input"
            placeholder="Search by fee #, receipt #, client name, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="category-select"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="all">All Fee Categories</option>
          {categories.map((cat) => (
            <option key={cat.code} value={cat.code}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Main Table Card */}
      <div className="table-card">
        <table className="fees-table">
          <thead>
            <tr>
              <th>Fee Number & Date</th>
              <th>Client Particulars</th>
              <th>Category & Description</th>
              <th>Linked Estate / Scheme</th>
              <th>Billed Amount</th>
              <th>Balance Due</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="empty-table-state">
                  <p>Loading other fees records...</p>
                </td>
              </tr>
            ) : filteredFees.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-table-state">
                  <MdReceipt className="empty-icon" />
                  <h3>No fee assessments found</h3>
                  <p>
                    {fees.length === 0
                      ? 'No operational fee records have been assessed yet. Click "Assess New Fee" to record your first statutory or legal fee.'
                      : 'No fee records match the selected filter criteria.'}
                  </p>
                </td>
              </tr>
            ) : (
              filteredFees.map((fee) => (
                <tr key={fee.id}>
                  <td>
                    <a
                      href="#view"
                      className="fee-num-link"
                      onClick={(e) => {
                        e.preventDefault()
                        setSelectedFee(fee)
                        setShowVoucherModal(true)
                      }}
                    >
                      {fee.fee_number}
                    </a>
                    <div className="fee-date">
                      {new Date(fee.created_at).toLocaleDateString('en-UG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </td>
                  <td>
                    <div className="client-name">
                      {fee.client ? `${fee.client.first_name} ${fee.client.last_name}` : 'Unassigned Client'}
                    </div>
                    <div className="client-sub">
                      {fee.client?.client_number || 'N/A'} {fee.client?.phone_primary ? `• ${fee.client.phone_primary}` : ''}
                    </div>
                  </td>
                  <td>
                    <span className="category-tag">{fee.category_name}</span>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>{fee.title}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{fee.site?.name || fee.savings_account?.scheme_name || 'General'}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {fee.unit?.unit_number ? `Plot ${fee.unit.unit_number}` : 'Standard Parcel'}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>UGX {Number(fee.amount).toLocaleString()}</td>
                  <td style={{ fontWeight: 600, color: fee.balance_due > 0 ? '#b45309' : '#059669' }}>
                    UGX {Number(fee.balance_due).toLocaleString()}
                    {fee.amount_paid > 0 && (
                      <div style={{ fontSize: '11px', color: '#059669', fontWeight: 500 }}>
                        Paid: UGX {Number(fee.amount_paid).toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge status-${fee.status}`}>{fee.status}</span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="btn-icon-action"
                        title="Print / View Official Document"
                        onClick={() => {
                          setSelectedFee(fee)
                          setShowVoucherModal(true)
                        }}
                      >
                        <MdPrint />
                      </button>

                      {fee.balance_due > 0 && fee.status !== 'waived' && (
                        <button
                          className="btn-icon-action pay"
                          title="Record Payment"
                          onClick={() => openPaymentModal(fee)}
                        >
                          <MdPayments />
                        </button>
                      )}

                      {fee.status !== 'paid' && fee.status !== 'waived' && (
                        <button
                          className="btn-icon-action waive"
                          title="Waive Fee"
                          onClick={() => openWaiveModal(fee)}
                        >
                          <MdMoneyOff />
                        </button>
                      )}

                      {Number(fee.amount_paid) === 0 && (
                        <button
                          className="btn-icon-action delete"
                          title="Delete Assessment"
                          onClick={() => setFeeToDelete(fee)}
                        >
                          <MdDelete />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Assess New Fee Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content-box">
            <div className="modal-header-bar">
              <h2>Assess & Invoice Other Fee</h2>
              <button className="modal-close-btn" onClick={() => setShowCreateModal(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleCreateFee}>
              <div className="modal-form-body">
                <div className="form-group">
                  <label>Select Registered Client *</label>
                  <select
                    value={newFee.client_id}
                    onChange={(e) => setNewFee({ ...newFee, client_id: e.target.value })}
                    required
                  >
                    <option value="">-- Choose Client --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.first_name} {c.last_name} ({c.client_number || 'CL-NA'}) {c.phone_primary ? `- ${c.phone_primary}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Fee Classification / Category *</label>
                  <select
                    value={newFee.category_code}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    required
                  >
                    {categories.map((cat) => (
                      <option key={cat.code} value={cat.code}>
                        {cat.name} (Std: UGX {Number(cat.standard_amount).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Fee Assessment Title *</label>
                  <input
                    type="text"
                    value={newFee.title}
                    onChange={(e) => setNewFee({ ...newFee, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Fee Amount (UGX) *</label>
                    <input
                      type="number"
                      min="0"
                      value={newFee.amount}
                      onChange={(e) => setNewFee({ ...newFee, amount: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Due Date</label>
                    <input
                      type="date"
                      value={newFee.due_date || ''}
                      onChange={(e) => setNewFee({ ...newFee, due_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Linked Estate / Scheme (Optional)</label>
                  <select
                    value={newFee.site_id}
                    onChange={(e) => setNewFee({ ...newFee, site_id: e.target.value === '' ? '' : Number(e.target.value) })}
                  >
                    <option value="">-- No Specific Estate --</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.location || 'Uganda'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Statutory / Operational Scope (Description)</label>
                  <textarea
                    rows={2}
                    value={newFee.description || ''}
                    onChange={(e) => setNewFee({ ...newFee, description: e.target.value })}
                    placeholder="e.g. Boundary opening for Plot 14 Block 284; 4 concrete corner boundary beacons."
                  />
                </div>
              </div>
              <div className="modal-footer-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={submittingFee}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submittingFee}>
                  {submittingFee ? 'Saving...' : 'Generate Assessment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && selectedFee && (
        <div className="modal-overlay">
          <div className="modal-content-box">
            <div className="modal-header-bar">
              <h2>Record Fee Payment</h2>
              <button className="modal-close-btn" onClick={() => setShowPaymentModal(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleRecordPayment}>
              <div className="modal-form-body">
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>Fee Number: <strong>{selectedFee.fee_number}</strong></div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '3px 0' }}>{selectedFee.title}</div>
                  <div style={{ fontSize: '13px', color: '#334155' }}>
                    Client: <strong>{selectedFee.client?.first_name} {selectedFee.client?.last_name}</strong> ({selectedFee.client?.client_number})
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', gap: '16px', fontSize: '13px' }}>
                    <div>Billed: <strong>UGX {Number(selectedFee.amount).toLocaleString()}</strong></div>
                    <div>Paid: <strong>UGX {Number(selectedFee.amount_paid).toLocaleString()}</strong></div>
                    <div style={{ color: '#b45309' }}>Remaining: <strong>UGX {Number(selectedFee.balance_due).toLocaleString()}</strong></div>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Payment Amount (UGX) *</label>
                    <input
                      type="number"
                      min="1"
                      max={selectedFee.balance_due > 0 ? selectedFee.balance_due : selectedFee.amount}
                      value={paymentForm.payment_amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, payment_amount: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Payment Method *</label>
                    <select
                      value={paymentForm.payment_method}
                      onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value as any })}
                      required
                    >
                      <option value="mtn_momo">MTN Mobile Money</option>
                      <option value="airtel_money">Airtel Money</option>
                      <option value="bank_transfer">Bank Transfer / EFT</option>
                      <option value="cash">Direct Cash Deposit</option>
                      <option value="cheque">Bank Cheque</option>
                    </select>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Payment Reference / TxID</label>
                    <input
                      type="text"
                      placeholder="e.g. MOMO-987654 or Slip #049"
                      value={paymentForm.payment_reference || ''}
                      onChange={(e) => setPaymentForm({ ...paymentForm, payment_reference: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Payment Date</label>
                    <input
                      type="date"
                      value={paymentForm.payment_date || ''}
                      onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Remarks / Collector Notes</label>
                  <textarea
                    rows={2}
                    value={paymentForm.notes || ''}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    placeholder="e.g. Paid directly at the head office accounts cashier."
                  />
                </div>
              </div>
              <div className="modal-footer-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowPaymentModal(false)}
                  disabled={submittingPayment}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submittingPayment}>
                  {submittingPayment ? 'Processing...' : 'Submit & Issue Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Waive Fee Modal */}
      {showWaiveModal && selectedFee && (
        <div className="modal-overlay">
          <div className="modal-content-box">
            <div className="modal-header-bar">
              <h2>Waive Fee Assessment</h2>
              <button className="modal-close-btn" onClick={() => setShowWaiveModal(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleWaiveSubmit}>
              <div className="modal-form-body">
                <div style={{ background: '#f5f3ff', padding: '14px', borderRadius: '8px', border: '1px solid #ddd6fe' }}>
                  <div style={{ fontSize: '13px', color: '#5b21b6' }}>Fee Number: <strong>{selectedFee.fee_number}</strong></div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '3px 0' }}>{selectedFee.title}</div>
                  <div style={{ fontSize: '13px', color: '#334155' }}>
                    Outstanding Balance: <strong>UGX {Number(selectedFee.balance_due).toLocaleString()}</strong>
                  </div>
                </div>

                <div className="form-group">
                  <label>Official Statutory / Managerial Justification *</label>
                  <textarea
                    rows={4}
                    value={waiverReason}
                    onChange={(e) => setWaiverReason(e.target.value)}
                    placeholder="State the formal reason or promotional authorization for granting this fee waiver..."
                    required
                  />
                </div>
              </div>
              <div className="modal-footer-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowWaiveModal(false)}
                  disabled={submittingWaiver}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ backgroundColor: '#7c3aed' }} disabled={submittingWaiver}>
                  {submittingWaiver ? 'Waiving...' : 'Confirm Fee Waiver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Printable Fee Assessment & Payment Receipt Voucher Modal */}
      {showVoucherModal && selectedFee && (
        <div className="modal-overlay">
          <div className="modal-content-box voucher-modal-box">
            <div className="modal-header-bar">
              <h2>Official Printable Document</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn-secondary"
                  onClick={() => handleWhatsAppShare(selectedFee)}
                  title="Share via WhatsApp"
                >
                  <MdShare /> Share WhatsApp
                </button>
                <button className="btn-primary" onClick={() => window.print()}>
                  <MdPrint /> Print Voucher
                </button>
                <button className="modal-close-btn" onClick={() => setShowVoucherModal(false)}>
                  <MdClose />
                </button>
              </div>
            </div>

            <div className="printable-document">
              {/* Fab Homes Official Letterhead */}
              <div className="doc-letterhead">
                <div className="letterhead-brand">
                  <h2>FAB HOMES UGANDA LIMITED</h2>
                  <p>Plot 14, Kampala Road, P.O. Box 71200 Kampala, Uganda</p>
                  <p>Tel: +256 700 000 000 / +256 770 000 000 | Email: accounts@fabhomesug.com</p>
                  <p>Official Website: www.fabhomesug.com</p>
                </div>
                <div className="doc-badge-col">
                  <div className="official-stamp-pill">Digital Audit Copy</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                    ISO 9001:2015 Verified
                  </div>
                </div>
              </div>

              {/* Document Title Banner */}
              <div className="doc-title-banner">
                <h3>
                  {selectedFee.status === 'paid'
                    ? 'Official Fee Payment Receipt & Settlement Voucher'
                    : selectedFee.status === 'partial'
                    ? 'Official Partial Fee Payment Receipt'
                    : selectedFee.status === 'waived'
                    ? 'Official Statutory Fee Waiver Certificate'
                    : 'Official Fee Assessment & Invoice Voucher'}
                </h3>
                <div className="doc-ref-line">
                  Fee No: {selectedFee.fee_number}
                  {selectedFee.receipt_number ? ` • Receipt No: ${selectedFee.receipt_number}` : ''}
                </div>
              </div>

              {/* Document Info Grid */}
              <div className="doc-info-grid">
                <div className="info-item">
                  <span className="info-label">Client Name</span>
                  <span className="info-val">
                    {selectedFee.client ? `${selectedFee.client.first_name} ${selectedFee.client.last_name}` : 'Direct Client'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Client Registration No</span>
                  <span className="info-val">{selectedFee.client?.client_number || 'CL-NA'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">National ID / NIN</span>
                  <span className="info-val">{selectedFee.client?.nin || 'Verified on Record'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Client Telephone</span>
                  <span className="info-val">{selectedFee.client?.phone_primary || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Estate / Scheme Location</span>
                  <span className="info-val">
                    {selectedFee.site?.name || selectedFee.savings_account?.scheme_name || 'General Estate Portfolio'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Demarcated Parcel / Plot</span>
                  <span className="info-val">
                    {selectedFee.unit?.unit_number ? `Plot ${selectedFee.unit.unit_number}` : 'Designated Standard Parcel'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Settlement Status</span>
                  <span className="info-val" style={{ textTransform: 'uppercase', color: selectedFee.status === 'paid' ? '#059669' : '#b45309' }}>
                    {selectedFee.status}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Settlement Channel</span>
                  <span className="info-val">
                    {selectedFee.payment_method ? selectedFee.payment_method.toUpperCase() : 'PENDING'}
                    {selectedFee.payment_reference ? ` (Ref: ${selectedFee.payment_reference})` : ''}
                  </span>
                </div>
              </div>

              {/* Itemized Fee Schedule */}
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Fee Classification</th>
                    <th>Statutory / Operational Scope</th>
                    <th style={{ textAlign: 'right' }}>Billed (UGX)</th>
                    <th style={{ textAlign: 'right' }}>Paid (UGX)</th>
                    <th style={{ textAlign: 'right' }}>Balance (UGX)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>{selectedFee.category_name}</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{selectedFee.title}</div>
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      {selectedFee.description || 'Statutory legal documentation and surveyor demarcation.'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {Number(selectedFee.amount).toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#059669' }}>
                      {Number(selectedFee.amount_paid).toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      {Number(selectedFee.balance_due).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Amount in Words */}
              <div className="amount-words-box">
                <span className="words-label">
                  {selectedFee.amount_paid > 0 ? 'Amount Settled in Words:' : 'Total Assessment in Words:'}
                </span>
                <div className="words-text">
                  {formatAmountInWords(
                    selectedFee.amount_paid > 0 ? Number(selectedFee.amount_paid) : Number(selectedFee.amount),
                    'UGX'
                  )}
                </div>
              </div>

              {/* Triple Certification Signatures */}
              <div className="signatures-section">
                <div className="sig-block">
                  <div className="sig-line"></div>
                  <div className="sig-title">Assessed / Prepared By</div>
                  <div className="sig-role">Legal & Accounts Officer</div>
                </div>
                <div className="sig-block">
                  <div className="sig-line"></div>
                  <div className="sig-title">Verified & Audited By</div>
                  <div className="sig-role">Head of Internal Audit</div>
                </div>
                <div className="sig-block">
                  <div className="sig-line"></div>
                  <div className="sig-title">Authorized By</div>
                  <div className="sig-role">Chief Finance Officer</div>
                </div>
              </div>

              {/* Security Seal & Verification Footer */}
              <div className="doc-seal-footer">
                <div>Digital Verification ID: {selectedFee.uuid.substring(0, 18).toUpperCase()}</div>
                <div>Certified at: {new Date().toLocaleString('en-UG')}</div>
                <div>Fab Homes Official ERP Engine</div>
              </div>
            </div>

            <div className="modal-footer-actions">
              <button className="btn-secondary" onClick={() => setShowVoucherModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {feeToDelete && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Fee Assessment"
          message={`Are you sure you want to delete fee assessment "${feeToDelete.fee_number}" for "${feeToDelete.client?.first_name} ${feeToDelete.client?.last_name}"? This action cannot be undone.`}
          confirmText={isDeleting ? 'Deleting...' : 'Delete Assessment'}
          cancelText="Cancel"
          variant="danger"
          onConfirm={handleConfirmDelete}
          onCancel={() => setFeeToDelete(null)}
        />
      )}
    </div>
  )
}

export default OtherFeesPage
