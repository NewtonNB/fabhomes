import React, { useState, useEffect } from 'react'
import {
  MdAccountBalanceWallet,
  MdSavings,
  MdAdd,
  MdRemove,
  MdFileDownload,
  MdPrint,
  MdArrowUpward,
  MdArrowDownward,
  MdClose
} from 'react-icons/md'
import cashbookService, { CashBookSummary, CashBookTransaction } from '../../services/cashbook.service'

export const CashBookPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overall' | 'savings'>('overall')
  const [transactions, setTransactions] = useState<CashBookTransaction[]>([])
  const [summary, setSummary] = useState<CashBookSummary | null>(null)
  const [loading, setLoading] = useState(true)

  // Filters
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [txType, setTxType] = useState<'all' | 'inflow' | 'outflow'>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Modal: Add or Draw Cash
  const [isCashModalOpen, setIsCashModalOpen] = useState(false)
  const [actionType, setActionType] = useState<'inflow' | 'drawdown'>('inflow')
  const [amount, setAmount] = useState<number>(500000)
  const [txDate, setTxDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [chequeVoucherNo, setChequeVoucherNo] = useState('')
  const [bankAccount, setBankAccount] = useState('Centenary Bank Main Account')
  const [description, setDescription] = useState('')
  const [submittingCash, setSubmittingCash] = useState(false)
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showNotice = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 4000)
  }

  const fetchCashBookData = async () => {
    try {
      setLoading(true)
      if (activeTab === 'overall') {
        const res = await cashbookService.getOverallCashBook({
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          type: txType,
          search: searchTerm || undefined,
          per_page: 50,
        })
        setTransactions(res.data || [])
        setSummary(res.summary || null)
      } else {
        const res = await cashbookService.getSavingCashBook({
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          search: searchTerm || undefined,
          per_page: 50,
        })
        setTransactions(res.data || [])
        setSummary(res.summary || null)
      }
    } catch (err: any) {
      showNotice(err.message || 'Failed to load cashbook transactions', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCashBookData()
  }, [activeTab, txType])

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault()
    fetchCashBookData()
  }

  const handleResetFilter = () => {
    setFromDate('')
    setToDate('')
    setSearchTerm('')
    setTxType('all')
    setTimeout(() => fetchCashBookData(), 50)
  }

  const handleOpenCashModal = (type: 'inflow' | 'drawdown') => {
    setActionType(type)
    setAmount(500000)
    setTxDate(new Date().toISOString().split('T')[0])
    setPaymentMethod('bank_transfer')
    setChequeVoucherNo(`VOU-${Math.floor(1000 + Math.random() * 9000)}`)
    setDescription(type === 'inflow' ? 'General client deposit / revenue receipt' : 'Office petty cash drawdown / site float replenishment')
    setIsCashModalOpen(true)
  }

  const handleSubmitCashAction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim() || amount <= 0) {
      showNotice('Please provide a valid amount and description', 'error')
      return
    }

    try {
      setSubmittingCash(true)
      await cashbookService.addOrDrawCash({
        action_type: actionType,
        amount,
        transaction_date: txDate,
        payment_method: paymentMethod,
        cheque_voucher_no: chequeVoucherNo,
        bank_account: bankAccount,
        description,
      })

      showNotice(`Successfully recorded ${actionType === 'inflow' ? 'cash inflow' : 'cash drawdown'} in CashBook!`)
      setIsCashModalOpen(false)
      fetchCashBookData()
    } catch (err: any) {
      showNotice(err.response?.data?.message || err.message || 'Failed to process cash transaction', 'error')
    } finally {
      setSubmittingCash(false)
    }
  }

  const formatUGX = (val?: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(val || 0)
  }

  const exportCsv = () => {
    const headers = ['Date', 'Transaction No', 'Voucher/Ref', 'Client/Source', 'Type', 'Amount (UGX)', 'Status', 'Description']
    const rows = transactions.map(t => [
      t.transaction_date,
      t.transaction_number,
      t.reference_number || t.metadata?.cheque_voucher_no || '-',
      t.client?.name || 'Direct Deposit / Treasury',
      t.transaction_type,
      t.amount,
      t.status,
      `"${(t.description || '').replace(/"/g, '""')}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Zimbani_CashBook_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '26px', color: '#0d9488' }}><MdAccountBalanceWallet /></span>
            <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              CashBook & Treasury Management
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px', margin: 0 }}>
            Track overall cash inflows, savings ledger deposits, and cash drawdowns in real-time
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => handleOpenCashModal('inflow')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              backgroundColor: '#0d9488',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            <MdAdd /> Add Cash Inflow
          </button>
          <button
            onClick={() => handleOpenCashModal('drawdown')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              backgroundColor: '#e11d48',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            <MdRemove /> Draw Cash (Drawdown)
          </button>
          <button
            onClick={exportCsv}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 14px',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            <MdFileDownload /> Export CSV
          </button>
          <button
            onClick={() => window.print()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 14px',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            <MdPrint /> Print
          </button>
        </div>
      </div>

      {notification && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '8px',
          marginBottom: '20px',
          backgroundColor: notification.type === 'success' ? '#ecfdf5' : '#fef2f2',
          color: notification.type === 'success' ? '#065f46' : '#991b1b',
          border: `1px solid ${notification.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          fontSize: '14px',
          fontWeight: '500',
        }}>
          {notification.msg}
        </div>
      )}

      {/* KPI Cards: Cash Available Banner (Page 7 Reference) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '20px',
        marginBottom: '24px',
      }}>
        {/* Cash Available Card */}
        <div style={{
          backgroundColor: '#042f2e',
          color: '#ffffff',
          borderRadius: '12px',
          padding: '20px 24px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#5eead4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Cash Available Balance
            </span>
            <span style={{ fontSize: '20px', color: '#2dd4bf' }}><MdAccountBalanceWallet /></span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.02em' }}>
            {formatUGX(summary?.cash_available)}
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#99f6e4' }}>
            Running liquid float across bank & treasury accounts
          </p>
        </div>

        {/* Total Inflows */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>
              {activeTab === 'overall' ? 'Total Cash Inflow (Credit)' : 'Total Savings Deposits'}
            </span>
            <span style={{ fontSize: '20px', color: '#16a34a' }}><MdArrowUpward /></span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#16a34a' }}>
            {formatUGX(activeTab === 'overall' ? summary?.total_inflow : summary?.total_savings_inflow)}
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#64748b' }}>
            All verified collections, client savings & transfers
          </p>
        </div>

        {/* Total Outflows */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>
              {activeTab === 'overall' ? 'Total Cash Outflow (Debit)' : 'Savings Refunds & Withdrawals'}
            </span>
            <span style={{ fontSize: '20px', color: '#dc2626' }}><MdArrowDownward /></span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#dc2626' }}>
            {formatUGX(activeTab === 'overall' ? summary?.total_outflow : summary?.total_savings_outflow)}
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#64748b' }}>
            Disbursements, contractor certificates & petty cash
          </p>
        </div>
      </div>

      {/* Tabs Bar: Overall CashBook vs Saving CashBook */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px 12px 0 0',
        border: '1px solid #e2e8f0',
        borderBottom: 'none',
        padding: '0 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex' }}>
          <button
            onClick={() => setActiveTab('overall')}
            style={{
              padding: '16px 24px',
              border: 'none',
              background: 'none',
              fontWeight: '700',
              fontSize: '14px',
              color: activeTab === 'overall' ? '#0d9488' : '#64748b',
              borderBottom: activeTab === 'overall' ? '3px solid #0d9488' : '3px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <MdAccountBalanceWallet /> The Overall CashBook
          </button>
          <button
            onClick={() => setActiveTab('savings')}
            style={{
              padding: '16px 24px',
              border: 'none',
              background: 'none',
              fontWeight: '700',
              fontSize: '14px',
              color: activeTab === 'savings' ? '#0d9488' : '#64748b',
              borderBottom: activeTab === 'savings' ? '3px solid #0d9488' : '3px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <MdSavings /> The Saving CashBook
          </button>
        </div>

        {/* Filter Controls */}
        <form onSubmit={handleApplyFilter} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '8px 0', flexWrap: 'wrap' }}>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            title="From Date"
          />
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            title="To Date"
          />

          {activeTab === 'overall' && (
            <select
              value={txType}
              onChange={(e: any) => setTxType(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff' }}
            >
              <option value="all">All Types</option>
              <option value="inflow">Inflows (Credit)</option>
              <option value="outflow">Outflows (Debit)</option>
            </select>
          )}

          <input
            type="text"
            placeholder="Search voucher, client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', width: '160px' }}
          />

          <button
            type="submit"
            style={{
              padding: '6px 12px',
              backgroundColor: '#0d9488',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Filter
          </button>
          <button
            type="button"
            onClick={handleResetFilter}
            style={{
              padding: '6px 10px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </form>
      </div>

      {/* Main Ledger Table */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '0 0 12px 12px',
        border: '1px solid #e2e8f0',
        overflowX: 'auto',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '600' }}>
              <th style={{ padding: '12px 16px' }}>Date</th>
              <th style={{ padding: '12px 16px' }}>Tx Number</th>
              <th style={{ padding: '12px 16px' }}>Voucher / Cheque No</th>
              <th style={{ padding: '12px 16px' }}>Client / Payee</th>
              <th style={{ padding: '12px 16px' }}>Description</th>
              <th style={{ padding: '12px 16px' }}>Account</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Debit (Outflow)</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Credit (Inflow)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                  Loading CashBook records...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                  No transactions match the selected date range or filter.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const isOutflow = ['withdrawal', 'refund', 'drawdown', 'expense', 'outflow'].includes(tx.transaction_type)
                const isInflow = ['deposit', 'interest', 'plot_payment', 'inflow', 'fee'].includes(tx.transaction_type)
                return (
                  <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', color: '#1e293b', whiteSpace: 'nowrap' }}>
                      {tx.transaction_date ? new Date(tx.transaction_date).toLocaleDateString() : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: '700', color: '#0f766e', whiteSpace: 'nowrap' }}>
                      {tx.transaction_number}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontWeight: '500' }}>
                      {tx.metadata?.cheque_voucher_no || tx.reference_number || '-'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>
                        {tx.client?.name || 'Fab Homes Treasury'}
                      </div>
                      {tx.client?.client_number && (
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{tx.client.client_number}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', maxWidth: '300px' }}>
                      {tx.description}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px' }}>
                      {tx.metadata?.bank_account || (tx.savings_account ? `Savings: ${tx.savings_account.account_number}` : 'Centenary UGX')}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700', color: '#dc2626' }}>
                      {isOutflow ? formatUGX(Number(tx.amount)) : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700', color: '#16a34a' }}>
                      {isInflow ? formatUGX(Number(tx.amount)) : '-'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Or Draw Cash Modal */}
      {isCashModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
          }}>
            <div style={{
              backgroundColor: actionType === 'inflow' ? '#0d9488' : '#e11d48',
              color: '#ffffff',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '22px' }}>
                  {actionType === 'inflow' ? <MdAdd /> : <MdRemove />}
                </span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>
                    {actionType === 'inflow' ? 'Add Cash Inflow (Receipt)' : 'Draw Cash (Disbursement)'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>
                    Record transaction into the firm's Official CashBook
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCashModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '22px', cursor: 'pointer' }}
              >
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleSubmitCashAction} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                    Amount (UGX)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: '700' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                    Transaction Date
                  </label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                    Voucher / Cheque No
                  </label>
                  <input
                    type="text"
                    value={chequeVoucherNo}
                    onChange={(e) => setChequeVoucherNo(e.target.value)}
                    placeholder="e.g. VOU-8012"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                    Payment Mode
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                  >
                    <option value="bank_transfer">Bank Transfer (EFT / RTGS)</option>
                    <option value="cheque">Company Cheque</option>
                    <option value="mobile_money">Mobile Money (MTN / Airtel)</option>
                    <option value="cash">Cash Float / Petty Cash</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                  Bank / Float Account
                </label>
                <select
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                >
                  <option value="Centenary Bank Main Account">Centenary Bank (Acct: 31000... UGX)</option>
                  <option value="Stanbic Bank Operations">Stanbic Bank (Acct: 90300... UGX)</option>
                  <option value="Headquarters Petty Cash Vault">Headquarters Petty Cash Vault</option>
                  <option value="MTN MoMo Merchant Till">MTN MoMo Merchant Till</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                  Transaction Description / Narration
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsCashModalOpen(false)}
                  style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCash}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: actionType === 'inflow' ? '#0d9488' : '#e11d48',
                    color: '#ffffff',
                    fontWeight: '600',
                    cursor: submittingCash ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submittingCash ? 'Posting...' : actionType === 'inflow' ? 'Post Inflow' : 'Post Drawdown'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CashBookPage
