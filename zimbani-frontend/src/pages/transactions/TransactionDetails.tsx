import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  MdArrowBack,
  MdUndo,
  MdCloudUpload,
  MdPerson,
  MdAccountBalance,
  MdReceipt,
  MdClose,
  MdOpenInNew,
  MdArrowForward,
} from 'react-icons/md'
import { Transaction } from '../../types/transaction.types'
import { Document } from '../../types/document.types'
import transactionService from '../../services/transaction.service'
import documentService from '../../services/document.service'
import { DocumentUploadModal } from '../../components/documents/DocumentUploadModal'
import { DocumentsTable } from '../../components/documents/DocumentsTable'
import './TransactionDetails.css'

export const TransactionDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modals
  const [showReversalModal, setShowReversalModal] = useState(false)
  const [reversalReason, setReversalReason] = useState('')
  const [reversalSubmitting, setReversalSubmitting] = useState(false)

  const [showUploadModal, setShowUploadModal] = useState(false)

  const loadTransaction = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = await transactionService.getTransaction(id)
      setTransaction(data)

      // Fetch attached documents
      try {
        const docsRes = await documentService.getDocuments({
          documentable_type: 'transaction',
          documentable_id: String(data.id),
        })
        setDocuments(docsRes.data || [])
      } catch (docErr) {
        console.error('Failed to load documents:', docErr)
      }
    } catch (err: any) {
      console.error('Failed to load transaction details:', err)
      setError(err?.response?.data?.message || err?.message || 'Failed to load transaction details')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadTransaction()
  }, [loadTransaction])

  const handleReverseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transaction) return
    if (!reversalReason.trim() || reversalReason.length < 5) {
      setError('A clear justification (min 5 characters) is required to reverse an immutable transaction.')
      return
    }

    setReversalSubmitting(true)
    try {
      await transactionService.reverseTransaction(transaction.uuid, {
        reason: reversalReason.trim(),
      })
      setShowReversalModal(false)
      setReversalReason('')
      loadTransaction()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Reversal failed')
    } finally {
      setReversalSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="txn-details-page">
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          Loading transaction voucher...
        </div>
      </div>
    )
  }

  if (error || !transaction) {
    return (
      <div className="txn-details-page">
        <button className="btn-back" onClick={() => navigate('/transactions')}>
          <MdArrowBack /> Back to Ledger
        </button>
        <div style={{ marginTop: '20px', padding: '24px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626' }}>
          <h3>Error</h3>
          <p>{error || 'Transaction record not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="txn-details-page">
      {/* Header */}
      <div className="txn-details-header">
        <button className="btn-back" onClick={() => navigate('/transactions')}>
          <MdArrowBack /> Back to Ledger
        </button>

        <div style={{ display: 'flex', gap: '12px' }}>
          {transaction.status === 'posted' && (
            <button
              onClick={() => setShowReversalModal(true)}
              style={{
                background: '#fee2e2',
                color: '#dc2626',
                border: 'none',
                padding: '9px 16px',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <MdUndo /> Reverse Transaction
            </button>
          )}

          <button
            onClick={() => setShowUploadModal(true)}
            style={{
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '9px 16px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <MdCloudUpload /> Attach Document
          </button>
        </div>
      </div>

      {/* Reversal Banner if this transaction was reversed */}
      {transaction.status === 'reversed' && (
        <div className="reversal-alert-box">
          <h4>Transaction Reversed in Audit Log</h4>
          <p style={{ margin: '0 0 6px 0', fontSize: '13px' }}>
            This transaction was reversed on {transaction.reversed_at ? new Date(transaction.reversed_at).toLocaleString() : 'N/A'} by {transaction.reversed_by?.name || 'Staff'}.
          </p>
          <div style={{ fontSize: '13px', background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #fecaca' }}>
            <strong>Justification:</strong> {transaction.reversal_reason || 'No justification specified'}
          </div>
        </div>
      )}

      {/* Main Voucher Card */}
      <div className="voucher-card">
        <div className="voucher-header">
          <div>
            <h1 className="voucher-number">{transaction.transaction_number}</h1>
            <div style={{ fontSize: '14px', color: '#64748b' }}>
              Recorded on {new Date(transaction.transaction_date).toLocaleString()} • Value Date: {transaction.value_date}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span
              className="voucher-type-badge"
              style={{
                backgroundColor: transaction.status === 'posted' ? '#ecfdf5' : '#fef2f2',
                color: transaction.status === 'posted' ? '#059669' : '#dc2626',
              }}
            >
              {transaction.status}
            </span>
          </div>
        </div>

        {/* Balance Progression Flow */}
        <div className="flow-container">
          <div>
            <div className="flow-step-label">Balance Before</div>
            <div className="flow-step-val" style={{ color: '#475569' }}>
              UGX {Number(transaction.balance_before).toLocaleString()}
            </div>
          </div>

          <div className="flow-arrow">
            <MdArrowForward />
          </div>

          <div>
            <div className="flow-step-label">
              {transaction.is_credit ? 'Credit (+) Inflow' : 'Debit (-) Outflow'}
            </div>
            <div
              className="flow-step-val"
              style={{ color: transaction.is_credit ? '#059669' : '#dc2626', fontSize: '22px' }}
            >
              {transaction.is_credit ? '+' : ''}UGX {Number(transaction.amount).toLocaleString()}
            </div>
          </div>

          <div className="flow-arrow">
            <MdArrowForward />
          </div>

          <div>
            <div className="flow-step-label">Balance After</div>
            <div className="flow-step-val" style={{ color: '#0f172a' }}>
              UGX {Number(transaction.balance_after).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Transaction Meta Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#475569' }}>Description & Purpose</h4>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>
              {transaction.description}
            </div>
            {transaction.narration && (
              <div style={{ fontSize: '13px', color: '#64748b', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                {transaction.narration}
              </div>
            )}
          </div>

          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#475569' }}>Reference Information</h4>
            <table className="meta-table">
              <tbody>
                <tr>
                  <td>Transaction Type</td>
                  <td>
                    <span style={{ textTransform: 'capitalize' }}>{transaction.transaction_type}</span>
                  </td>
                </tr>
                <tr>
                  <td>External Reference</td>
                  <td>{transaction.reference_number || 'N/A'}</td>
                </tr>
                <tr>
                  <td>Recorded By</td>
                  <td>{transaction.created_by?.name || 'System Operator'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Grid: Client & Linked Accounts */}
      <div className="grid-2col">
        {/* Client Card */}
        <div className="detail-section">
          <h3>
            <MdPerson color="#0284c7" size={20} />
            Client Account Owner
          </h3>
          {transaction.client ? (
            <table className="meta-table">
              <tbody>
                <tr>
                  <td>Full Name</td>
                  <td>{transaction.client.full_name}</td>
                </tr>
                <tr>
                  <td>Client Number</td>
                  <td>{transaction.client.client_number}</td>
                </tr>
                <tr>
                  <td>Primary Phone</td>
                  <td>{transaction.client.phone_primary}</td>
                </tr>
                <tr>
                  <td>Profile Link</td>
                  <td>
                    <Link
                      to={`/clients/${transaction.client.uuid}`}
                      style={{ color: '#0284c7', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      View Client Profile <MdOpenInNew size={14} />
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <div style={{ color: '#94a3b8' }}>No client profile attached.</div>
          )}
        </div>

        {/* Linked Savings Account Card */}
        <div className="detail-section">
          <h3>
            <MdAccountBalance color="#0284c7" size={20} />
            Linked Savings Scheme
          </h3>
          {transaction.savings_account ? (
            <table className="meta-table">
              <tbody>
                <tr>
                  <td>Account Number</td>
                  <td>{transaction.savings_account.account_number}</td>
                </tr>
                <tr>
                  <td>Scheme Name</td>
                  <td>{transaction.savings_account.scheme_name}</td>
                </tr>
                <tr>
                  <td>Current Balance</td>
                  <td>UGX {Number(transaction.savings_account.current_balance).toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Scheme Details</td>
                  <td>
                    <Link
                      to={`/savings-accounts/${transaction.savings_account.uuid}`}
                      style={{ color: '#0284c7', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      View Account Passbook <MdOpenInNew size={14} />
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <div style={{ color: '#94a3b8' }}>General / Unallocated Transaction.</div>
          )}
        </div>
      </div>

      {/* Linked Payment Card (if any) */}
      {transaction.payment && (
        <div className="detail-section" style={{ marginBottom: '24px' }}>
          <h3>
            <MdReceipt color="#0284c7" size={20} />
            Originating Payment
          </h3>
          <table className="meta-table">
            <tbody>
              <tr>
                <td>Payment Number</td>
                <td>{transaction.payment.payment_number}</td>
              </tr>
              <tr>
                <td>Payment Type & Method</td>
                <td>
                  <span style={{ textTransform: 'capitalize' }}>
                    {transaction.payment.payment_type.replace('_', ' ')} via {transaction.payment.payment_method.replace('_', ' ')}
                  </span>
                </td>
              </tr>
              <tr>
                <td>Payment Total Amount</td>
                <td>UGX {Number(transaction.payment.total_amount).toLocaleString()}</td>
              </tr>
              <tr>
                <td>Receipt Link</td>
                <td>
                  <Link
                    to={`/payments/${transaction.payment.uuid}`}
                    style={{ color: '#0284c7', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    View Official Receipt <MdOpenInNew size={14} />
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Linked Related Transaction / Reversal History */}
      {transaction.related_transaction && (
        <div className="detail-section" style={{ marginBottom: '24px', background: '#faf5ff', border: '1px solid #e9d5ff' }}>
          <h3 style={{ color: '#7e22ce' }}>
            <MdUndo size={20} />
            Original Transaction Reference
          </h3>
          <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#6b21a8' }}>
            This transaction is a financial reversal of entry{' '}
            <Link to={`/transactions/${transaction.related_transaction.uuid}`} style={{ fontWeight: 700, color: '#7e22ce' }}>
              {transaction.related_transaction.transaction_number}
            </Link>.
          </p>
        </div>
      )}

      {/* Attached Documents Table */}
      <div className="detail-section">
        <h3>Attached Supporting Documents</h3>
        <DocumentsTable
          documents={documents}
          onRefresh={loadTransaction}
        />
      </div>

      {/* Modal: Reverse Transaction */}
      {showReversalModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Reverse Transaction {transaction.transaction_number}</h3>
              <button className="btn-close-modal" onClick={() => setShowReversalModal(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleReverseSubmit}>
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                <div>Original Amount: <strong>UGX {Number(transaction.amount).toLocaleString()}</strong></div>
                <div>Account: <strong>{transaction.savings_account?.account_number || 'General'}</strong></div>
                <div>Client: <strong>{transaction.client?.full_name}</strong></div>
              </div>

              <div className="form-group">
                <label>Audit Justification / Reversal Reason * (Min 5 chars)</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why this transaction is being reversed..."
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                />
              </div>

              <div style={{ fontSize: '12px', color: '#64748b', background: '#eff6ff', padding: '10px 12px', borderRadius: '6px' }}>
                <strong>Immutable Ledger Principle:</strong> This transaction will NOT be erased from history. An offsetting transaction with amount <strong>{transaction.is_credit ? '-' : '+'}UGX {Math.abs(Number(transaction.amount)).toLocaleString()}</strong> will be permanently linked and posted.
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowReversalModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-danger" disabled={reversalSubmitting}>
                  {reversalSubmitting ? 'Processing Reversal...' : 'Confirm Reversal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Document Upload */}
      {showUploadModal && (
        <DocumentUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          defaultDocumentableType="transactions"
          defaultDocumentableId={transaction.id.toString()}
          title="Upload Transaction Supporting Document"
          onSuccess={() => {
            setShowUploadModal(false)
            loadTransaction()
          }}
        />
      )}
    </div>
  )
}

export default TransactionDetails
