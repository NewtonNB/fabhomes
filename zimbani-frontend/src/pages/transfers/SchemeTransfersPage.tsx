import React, { useState, useEffect, useCallback } from 'react'
import {
  MdCompareArrows,
  MdAdd,
  MdRefresh,
  MdSearch,
  MdCheckCircle,
  MdCancel,
  MdHourglassTop,
  MdAccountBalance,
  MdClose,
  MdArrowForward,
  MdError,
  MdInfoOutline,
  MdVisibility,
} from 'react-icons/md'
import schemeTransferService, { SchemeTransferItem } from '../../services/scheme-transfer.service'
import clientService from '../../services/client.service'
import savingsAccountService from '../../services/savings-account.service'
import { Client } from '../../types/client.types'
import { SavingsAccount } from '../../types/savings-account.types'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'

const POPULAR_SCHEMES = [
  'Matugga Green Valley Estate',
  'Mukono Greenfield Scheme',
  'Budo Heights Estate',
  'Gayaza Hillview Estate',
  'Kigo Royal Palms Scheme',
  'Entebbe Breeze Phase 2',
  'Tuzimbe Group Savings Scheme',
  'Pearl Gardens Residential',
]

export const SchemeTransfersPage: React.FC = () => {
  const [transfers, setTransfers] = useState<SchemeTransferItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | ''>('')

  // Modals & Inspection State
  const [selectedTransfer, setSelectedTransfer] = useState<SchemeTransferItem | null>(null)
  const [inspectModalOpen, setInspectModalOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  // Approval / Rejection Soft Modals
  const [transferToApprove, setTransferToApprove] = useState<SchemeTransferItem | null>(null)
  const [transferToReject, setTransferToReject] = useState<SchemeTransferItem | null>(null)
  const [rejectionNotes, setRejectionNotes] = useState('')

  // Create Form State
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string | number>('')
  const [clientAccounts, setClientAccounts] = useState<SavingsAccount[]>([])
  const [fromAccountId, setFromAccountId] = useState<number | ''>('')
  const [toSchemeName, setToSchemeName] = useState<string>('')
  const [transferAmount, setTransferAmount] = useState<number | ''>('')
  const [transferReason, setTransferReason] = useState<string>('')
  const [formError, setFormError] = useState<string | null>(null)

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 5000)
  }

  const fetchTransfers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await schemeTransferService.getTransfers({
        status: statusFilter || undefined,
        per_page: 50,
      })
      const items = res?.data?.data || res?.data || []
      setTransfers(Array.isArray(items) ? items : [])
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch scheme transfers.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchTransfers()
  }, [fetchTransfers])

  // Load clients for create modal
  useEffect(() => {
    const loadClients = async () => {
      try {
        const res = await clientService.getClients({ per_page: 100 })
        const list = (res as any)?.data?.data || (res as any)?.data || (Array.isArray(res) ? res : [])
        setClients(Array.isArray(list) ? list : [])
      } catch (err) {
        console.error('Failed to load clients', err)
      }
    }
    loadClients()
  }, [])

  // When selectedClientId changes, load that client's savings accounts
  useEffect(() => {
    if (!selectedClientId) {
      setClientAccounts([])
      setFromAccountId('')
      return
    }
    const loadAccounts = async () => {
      try {
        const res = await savingsAccountService.getSavingsAccounts({
          client_id: Number(selectedClientId),
          status: 'active',
          per_page: 50,
        })
        const list = res.data || []
        setClientAccounts(list)
        if (list.length > 0) {
          setFromAccountId(list[0].id)
        } else {
          setFromAccountId('')
        }
      } catch (err) {
        console.error('Failed to load client savings accounts', err)
      }
    }
    loadAccounts()
  }, [selectedClientId])

  const selectedSourceAccount = clientAccounts.find((a) => a.id === Number(fromAccountId))

  // Handle Create Transfer Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!selectedClientId) {
      setFormError('Please select a client.')
      return
    }
    if (!fromAccountId || !selectedSourceAccount) {
      setFormError('Please select a source savings scheme account.')
      return
    }
    if (!toSchemeName.trim()) {
      setFormError('Please specify destination scheme name.')
      return
    }
    const amt = Number(transferAmount)
    if (isNaN(amt) || amt <= 0) {
      setFormError('Transfer amount must be greater than zero.')
      return
    }
    if (amt > selectedSourceAccount.current_balance) {
      setFormError(
        `Insufficient balance in source account. Available: UGX ${selectedSourceAccount.current_balance.toLocaleString()}`
      )
      return
    }
    if (!transferReason.trim()) {
      setFormError('Please provide a transfer reason or justification note.')
      return
    }

    try {
      setActionLoading(true)
      await schemeTransferService.createTransfer({
        client_id: selectedClientId,
        from_savings_account_id: Number(fromAccountId),
        from_scheme_name: selectedSourceAccount.scheme_name || 'Standard Savings Scheme',
        to_scheme_name: toSchemeName.trim(),
        amount: amt,
        reason: transferReason.trim(),
      })

      showSuccess(`Scheme transfer request of UGX ${amt.toLocaleString()} submitted successfully!`)
      setCreateModalOpen(false)
      setSelectedClientId('')
      setFromAccountId('')
      setToSchemeName('')
      setTransferAmount('')
      setTransferReason('')
      fetchTransfers()
    } catch (err: any) {
      setFormError(err?.response?.data?.message || err?.message || 'Failed to submit scheme transfer request.')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Approve Transfer
  const executeApprove = async () => {
    if (!transferToApprove) return
    try {
      setActionLoading(true)
      setError(null)
      await schemeTransferService.approveTransfer(transferToApprove.uuid, 'Approved by Finance Controller')
      showSuccess(`Scheme transfer of UGX ${Number(transferToApprove.amount).toLocaleString()} successfully approved and executed!`)
      setTransferToApprove(null)
      if (inspectModalOpen && selectedTransfer?.uuid === transferToApprove.uuid) {
        setInspectModalOpen(false)
      }
      fetchTransfers()
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to approve scheme transfer.')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Reject Transfer
  const executeReject = async () => {
    if (!transferToReject || !rejectionNotes.trim()) return
    try {
      setActionLoading(true)
      setError(null)
      await schemeTransferService.rejectTransfer(transferToReject.uuid, rejectionNotes.trim())
      showSuccess(`Scheme transfer request marked as rejected.`)
      setTransferToReject(null)
      setRejectionNotes('')
      if (inspectModalOpen && selectedTransfer?.uuid === transferToReject.uuid) {
        setInspectModalOpen(false)
      }
      fetchTransfers()
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to reject scheme transfer.')
    } finally {
      setActionLoading(false)
    }
  }

  // Calculate stats
  const pendingList = transfers.filter((t) => t.status === 'pending')
  const approvedList = transfers.filter((t) => t.status === 'approved')
  const rejectedList = transfers.filter((t) => t.status === 'rejected')

  const pendingAmount = pendingList.reduce((sum, t) => sum + Number(t.amount || 0), 0)
  const approvedAmount = approvedList.reduce((sum, t) => sum + Number(t.amount || 0), 0)

  // Filtered by search
  const filteredTransfers = transfers.filter((t) => {
    if (!searchTerm) return true
    const q = searchTerm.toLowerCase()
    const clientName = (t.client?.full_name || t.client?.first_name || '').toLowerCase()
    const clientNo = (t.client?.client_number || '').toLowerCase()
    const fromScheme = (t.from_scheme_name || '').toLowerCase()
    const toScheme = (t.to_scheme_name || '').toLowerCase()
    return clientName.includes(q) || clientNo.includes(q) || fromScheme.includes(q) || toScheme.includes(q)
  })

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px', color: '#0d9488', display: 'flex', alignItems: 'center' }}>
              <MdCompareArrows />
            </span>
            <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Scheme Transfers & Account Migration Desk
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px', margin: 0 }}>
            Authorize inter-scheme capital migration, estate parcel transfers, and client balance reallocations (Manual Section 2.7)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              backgroundColor: '#0d9488',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px',
              boxShadow: '0 2px 4px rgba(13, 148, 136, 0.2)',
            }}
          >
            <MdAdd size={18} /> New Scheme Transfer
          </button>
          <button
            type="button"
            onClick={fetchTransfers}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 14px',
              backgroundColor: '#ffffff',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px',
            }}
            title="Refresh Transfers"
          >
            <MdRefresh size={18} /> Refresh
          </button>
        </div>
      </div>

      {/* Soft Feedback Banners */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', marginBottom: '1.25rem', fontSize: '14px' }}>
          <MdError size={20} />
          <span style={{ flex: 1 }}>{error}</span>
          <button type="button" onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}>
            <MdClose size={18} />
          </button>
        </div>
      )}
      {successMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', marginBottom: '1.25rem', fontSize: '14px' }}>
          <MdCheckCircle size={20} />
          <span style={{ flex: 1 }}>{successMsg}</span>
          <button type="button" onClick={() => setSuccessMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#047857' }}>
            <MdClose size={18} />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            <MdCompareArrows />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Total Transfer Volume</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{transfers.length} Requests</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Inter-Scheme Operations</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            <MdHourglassTop />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#854d0e', fontWeight: '600', textTransform: 'uppercase' }}>Pending Review</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#d97706', marginTop: '2px' }}>
              UGX {pendingAmount.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#854d0e' }}>{pendingList.length} Awaiting Authorization</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            <MdCheckCircle />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#166534', fontWeight: '600', textTransform: 'uppercase' }}>Executed Transfers</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#059669', marginTop: '2px' }}>
              UGX {approvedAmount.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#166534' }}>{approvedList.length} Completed Migrations</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            <MdCancel />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#991b1b', fontWeight: '600', textTransform: 'uppercase' }}>Rejected Requests</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#dc2626', marginTop: '2px' }}>{rejectedList.length} Requests</div>
            <div style={{ fontSize: '12px', color: '#991b1b' }}>Declined by Treasury</div>
          </div>
        </div>
      </div>

      {/* Draft Section & Status Navigation Filter Chips */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => setStatusFilter('')}
          style={{
            padding: '7px 14px',
            borderRadius: '20px',
            border: `1px solid ${statusFilter === '' ? '#0d9488' : '#cbd5e1'}`,
            background: statusFilter === '' ? '#0d9488' : '#ffffff',
            color: statusFilter === '' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          All Transfers
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('pending')}
          style={{
            padding: '7px 14px',
            borderRadius: '20px',
            border: `1px solid ${statusFilter === 'pending' ? '#d97706' : '#cbd5e1'}`,
            background: statusFilter === 'pending' ? '#d97706' : '#ffffff',
            color: statusFilter === 'pending' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Draft / Pending Review ({pendingList.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('approved')}
          style={{
            padding: '7px 14px',
            borderRadius: '20px',
            border: `1px solid ${statusFilter === 'approved' ? '#059669' : '#cbd5e1'}`,
            background: statusFilter === 'approved' ? '#059669' : '#ffffff',
            color: statusFilter === 'approved' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Approved Transfers ({approvedList.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('rejected')}
          style={{
            padding: '7px 14px',
            borderRadius: '20px',
            border: `1px solid ${statusFilter === 'rejected' ? '#dc2626' : '#cbd5e1'}`,
            background: statusFilter === 'rejected' ? '#dc2626' : '#ffffff',
            color: statusFilter === 'rejected' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Rejected Requests ({rejectedList.length})
        </button>
      </div>

      {/* Filter Toolbar & Search */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
          <input
            type="text"
            placeholder="Search by client name, client #, from/to scheme..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '18px', display: 'flex' }}>
            <MdSearch />
          </span>
        </div>
      </div>

      {/* Table Card */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '600' }}>
              <th style={{ padding: '12px 16px' }}>Date</th>
              <th style={{ padding: '12px 16px' }}>Client</th>
              <th style={{ padding: '12px 16px' }}>Source Account & Scheme</th>
              <th style={{ padding: '12px 16px' }}>Destination Scheme</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Transfer Amount</th>
              <th style={{ padding: '12px 16px' }}>Reason</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  Loading scheme transfers...
                </td>
              </tr>
            ) : filteredTransfers.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  No scheme transfer requests found matching filter criteria.
                </td>
              </tr>
            ) : (
              filteredTransfers.map((item) => (
                <tr
                  key={item.id}
                  style={{ borderBottom: '1px solid #f1f5f9' }}
                >
                  <td style={{ padding: '12px 16px', color: '#475569' }}>
                    {new Date(item.created_at).toLocaleDateString('en-GB')}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: '600', color: '#0f172a' }}>
                      {item.client?.full_name || `${item.client?.first_name || ''} ${item.client?.last_name || ''}`.trim() || 'Client'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{item.client?.client_number || '-'}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{item.from_scheme_name}</div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                      Acc: {item.from_account?.account_number || `ID #${item.from_savings_account_id}`}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: '700', color: '#0d9488', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MdArrowForward size={14} /> {item.to_scheme_name}
                    </div>
                    {item.to_account && (
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                        Acc: {item.to_account.account_number}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                    UGX {Number(item.amount).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#475569' }} title={item.reason}>
                    {item.reason}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        backgroundColor:
                          item.status === 'approved'
                            ? '#dcfce7'
                            : item.status === 'rejected'
                            ? '#fee2e2'
                            : '#fef3c7',
                        color:
                          item.status === 'approved'
                            ? '#15803d'
                            : item.status === 'rejected'
                            ? '#b91c1c'
                            : '#b45309',
                      }}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTransfer(item)
                          setInspectModalOpen(true)
                        }}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        title="View Full Audit Record"
                      >
                        <MdVisibility size={14} /> Inspect
                      </button>

                      {item.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => setTransferToApprove(item)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: '#059669',
                              color: '#ffffff',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontWeight: '600',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <MdCheckCircle size={14} /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTransferToReject(item)
                              setRejectionNotes('')
                            }}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: '#dc2626',
                              color: '#ffffff',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontWeight: '600',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <MdCancel size={14} /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Scheme Transfer Modal */}
      {createModalOpen && (
        <div className="confirm-modal-backdrop">
          <div className="confirm-modal-card" style={{ maxWidth: '640px', width: '95%' }}>
            <div className="confirm-modal-header">
              <div className="confirm-modal-icon-badge" style={{ backgroundColor: '#ccfbf1', color: '#0d9488' }}>
                <MdCompareArrows size={24} />
              </div>
              <h3 className="confirm-modal-title">New Scheme Transfer Request</h3>
            </div>

            {formError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', marginBottom: '1rem', fontSize: '13px' }}>
                <MdError size={18} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                    Select Client *
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                  >
                    <option value="">-- Choose Account Holder --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {(c as any).full_name || (c as any).name || `${c.first_name || ''} ${c.last_name || ''}`.trim()} ({c.client_number})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedClientId && (
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                      Source Savings Account *
                    </label>
                    {clientAccounts.length === 0 ? (
                      <div style={{ padding: '8px 12px', background: '#fefce8', border: '1px solid #fef08a', borderRadius: '8px', fontSize: '12px', color: '#a16207' }}>
                        No active savings scheme accounts found for this client.
                      </div>
                    ) : (
                      <select
                        value={fromAccountId}
                        onChange={(e) => setFromAccountId(Number(e.target.value))}
                        required
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                      >
                        {clientAccounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.account_number} — {acc.scheme_name || 'Standard Savings'} (Balance: UGX {acc.current_balance.toLocaleString()})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                    Destination Scheme Name *
                  </label>
                  <input
                    type="text"
                    required
                    list="scheme-options"
                    placeholder="e.g. Matugga Green Valley Estate"
                    value={toSchemeName}
                    onChange={(e) => setToSchemeName(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
                  />
                  <datalist id="scheme-options">
                    {POPULAR_SCHEMES.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                    Transfer Amount (UGX) *
                  </label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    required
                    placeholder="e.g. 5000000"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(Number(e.target.value))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                    Transfer Reason / Justification *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. Client requested migration from Mukono standard scheme to Matugga residential parcel allocation"
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }}
                  />
                </div>

                {/* Ledger Preview Card */}
                {selectedSourceAccount && Number(transferAmount) > 0 && (
                  <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '8px', padding: '12px 14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f766e', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MdInfoOutline size={16} /> Balance Impact Preview
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <span style={{ color: '#475569' }}>Source Account ({selectedSourceAccount.account_number}):</span>
                      <span style={{ fontWeight: '700', color: '#0f172a' }}>
                        UGX {selectedSourceAccount.current_balance.toLocaleString()} &rarr; UGX {Math.max(0, selectedSourceAccount.current_balance - Number(transferAmount)).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#475569' }}>Destination Scheme ({toSchemeName || 'New Scheme'}):</span>
                      <span style={{ fontWeight: '700', color: '#059669' }}>
                        + UGX {Number(transferAmount).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="confirm-modal-actions">
                <button
                  type="button"
                  className="confirm-modal-btn cancel"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="confirm-modal-btn primary"
                  disabled={actionLoading}
                  style={{ backgroundColor: '#0d9488' }}
                >
                  {actionLoading ? 'Submitting...' : 'Submit Transfer Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Transfer Record Modal */}
      {inspectModalOpen && selectedTransfer && (
        <div className="confirm-modal-backdrop">
          <div className="confirm-modal-card" style={{ maxWidth: '620px', width: '95%' }}>
            <div className="confirm-modal-header">
              <div className="confirm-modal-icon-badge" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                <MdAccountBalance size={22} />
              </div>
              <h3 className="confirm-modal-title">Scheme Transfer Audit Details</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '1.5rem', fontSize: '13.5px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>Client Holder</span>
                  <div style={{ fontWeight: '700', color: '#0f172a' }}>
                    {selectedTransfer.client?.full_name || 'Client'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{selectedTransfer.client?.client_number}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>Transfer Status</span>
                  <div>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        backgroundColor:
                          selectedTransfer.status === 'approved'
                            ? '#dcfce7'
                            : selectedTransfer.status === 'rejected'
                            ? '#fee2e2'
                            : '#fef3c7',
                        color:
                          selectedTransfer.status === 'approved'
                            ? '#15803d'
                            : selectedTransfer.status === 'rejected'
                            ? '#b91c1c'
                            : '#b45309',
                      }}
                    >
                      {selectedTransfer.status}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ background: '#f0fdfa', border: '1px solid #ccfbf1', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f766e', marginBottom: '6px' }}>MIGRATION PATHWAY</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div>
                    <div style={{ fontWeight: '700', color: '#1e293b' }}>{selectedTransfer.from_scheme_name}</div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                      Acc: {selectedTransfer.from_account?.account_number || `#${selectedTransfer.from_savings_account_id}`}
                    </div>
                  </div>
                  <MdArrowForward size={20} color="#0d9488" />
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '700', color: '#0d9488' }}>{selectedTransfer.to_scheme_name}</div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                      {selectedTransfer.to_account?.account_number ? `Acc: ${selectedTransfer.to_account.account_number}` : 'Auto-Provision Target Acc'}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px' }}>
                <span style={{ color: '#475569', fontWeight: '600' }}>Transfer Capital Amount:</span>
                <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '15px' }}>
                  UGX {Number(selectedTransfer.amount).toLocaleString()}
                </span>
              </div>

              <div>
                <span style={{ color: '#64748b', fontSize: '12px', display: 'block', marginBottom: '2px' }}>Request Reason & Justification:</span>
                <div style={{ padding: '10px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#334155' }}>
                  {selectedTransfer.reason}
                </div>
              </div>

              {selectedTransfer.notes && (
                <div>
                  <span style={{ color: '#64748b', fontSize: '12px', display: 'block', marginBottom: '2px' }}>Reviewer Notes:</span>
                  <div style={{ padding: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#334155' }}>
                    {selectedTransfer.notes}
                  </div>
                </div>
              )}
            </div>

            <div className="confirm-modal-actions">
              <button
                type="button"
                className="confirm-modal-btn cancel"
                onClick={() => setInspectModalOpen(false)}
              >
                Close
              </button>
              {selectedTransfer.status === 'pending' && (
                <>
                  <button
                    type="button"
                    className="confirm-modal-btn danger"
                    onClick={() => {
                      setTransferToReject(selectedTransfer)
                      setRejectionNotes('')
                    }}
                  >
                    Reject Transfer
                  </button>
                  <button
                    type="button"
                    className="confirm-modal-btn primary"
                    onClick={() => setTransferToApprove(selectedTransfer)}
                    style={{ backgroundColor: '#059669' }}
                  >
                    Approve Transfer
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Soft Confirmation for Transfer Approval */}
      <ConfirmDialog
        isOpen={!!transferToApprove}
        title="Approve Scheme Transfer"
        message={`Are you sure you want to approve this scheme transfer of UGX ${Number(transferToApprove?.amount || 0).toLocaleString()} for ${transferToApprove?.client?.full_name || 'this client'} from "${transferToApprove?.from_scheme_name}" to "${transferToApprove?.to_scheme_name}"? This will immediately reallocate ledger balances.`}
        confirmText="Approve & Execute"
        cancelText="Cancel"
        variant="primary"
        isLoading={actionLoading}
        onConfirm={executeApprove}
        onClose={() => setTransferToApprove(null)}
      />

      {/* Soft Rejection Reason Modal */}
      {transferToReject && (
        <div className="confirm-modal-backdrop">
          <div className="confirm-modal-card">
            <div className="confirm-modal-header">
              <div className="confirm-modal-icon-badge warning">
                <MdCancel size={22} color="#dc2626" />
              </div>
              <h3 className="confirm-modal-title">Reject Scheme Transfer</h3>
            </div>
            <p className="confirm-modal-message">
              Please enter the audit reason for rejecting the transfer of <strong>UGX {Number(transferToReject.amount).toLocaleString()}</strong> for client <strong>{transferToReject.client?.full_name || 'Client'}</strong>:
            </p>
            <textarea
              value={rejectionNotes}
              onChange={(e) => setRejectionNotes(e.target.value)}
              placeholder="e.g. Target estate allocation requirements unmet, account frozen due to KYC..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                marginBottom: '1rem',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="confirm-modal-btn cancel"
                onClick={() => {
                  setTransferToReject(null)
                  setRejectionNotes('')
                }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="confirm-modal-btn danger"
                onClick={executeReject}
                disabled={actionLoading || !rejectionNotes.trim()}
              >
                {actionLoading ? 'Rejecting...' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SchemeTransfersPage
