import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { MdArrowBack, MdSave, MdAttachMoney, MdHome, MdInfoOutline, MdWarning } from 'react-icons/md'
import { paymentService } from '../../services/payment.service'
import { clientService } from '../../services/client.service'
import { unitService } from '../../services/unit.service'
import { PaymentFormData } from '../../types/payment.types'
import { Client } from '../../types/client.types'
import { Unit } from '../../types/unit.types'
import './PaymentForm.css'

const PaymentForm: React.FC<{ isEdit?: boolean }> = ({ isEdit = false }) => {
  const navigate = useNavigate()
  const { uuid } = useParams<{ uuid: string }>()
  const [searchParams] = useSearchParams()

  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [clients, setClients] = useState<Client[]>([])
  const [units, setUnits] = useState<Unit[]>([])

  const [formData, setFormData] = useState<PaymentFormData>({
    client_id: searchParams.get('client_id') || '',
    unit_id: searchParams.get('unit_id') || '',
    payment_type: 'installment',
    payment_method: 'bank_transfer',
    amount: 0,
    currency: 'UGX',
    penalty_amount: 0,
    discount_amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    due_date: '',
    reference_number: '',
    bank_name: '',
    bank_account: '',
    transaction_id: '',
    check_number: '',
    mobile_money_number: '',
    notes: '',
  })

  useEffect(() => {
    loadPrerequisites()
  }, [])

  const loadPrerequisites = async () => {
    try {
      setInitialLoading(true)
      const [clientsRes, unitsRes] = await Promise.all([
        clientService.getClients({ per_page: 100 }),
        unitService.getUnits({ per_page: 100 }),
      ])
      
      // Robust payload unpacking
      const rawClients = (clientsRes as any)?.data?.data || (clientsRes as any)?.data || (Array.isArray(clientsRes) ? clientsRes : [])
      const rawUnits = (unitsRes as any)?.data?.data || (unitsRes as any)?.data || (Array.isArray(unitsRes) ? unitsRes : [])

      setClients(Array.isArray(rawClients) ? rawClients : [])
      setUnits(Array.isArray(rawUnits) ? rawUnits : [])

      if (isEdit && uuid) {
        const payment = await paymentService.getPayment(uuid)
        setFormData({
          client_id: payment.client?.uuid || '',
          unit_id: payment.unit?.uuid || '',
          payment_type: payment.payment_type,
          payment_method: payment.payment_method,
          amount: payment.amount,
          currency: payment.currency,
          penalty_amount: payment.penalty_amount,
          discount_amount: payment.discount_amount,
          payment_date: payment.payment_date,
          due_date: payment.due_date || '',
          reference_number: payment.reference_number || '',
          bank_name: payment.bank_name || '',
          bank_account: payment.bank_account || '',
          transaction_id: payment.transaction_id || '',
          check_number: payment.check_number || '',
          mobile_money_number: payment.mobile_money_number || '',
          notes: payment.notes || '',
        })
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize payment form')
    } finally {
      setInitialLoading(false)
    }
  }

  // Selected Unit snapshot
  const selectedUnit = useMemo(() => {
    return units.find((u) => String(u.id) === String(formData.unit_id) || u.uuid === formData.unit_id)
  }, [units, formData.unit_id])

  // Get base unit price
  const unitPrice = useMemo(() => {
    if (!selectedUnit) return 0
    return Number((selectedUnit as any).price || (selectedUnit as any).base_price || (selectedUnit as any).sale_price || 0)
  }, [selectedUnit])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    if (['amount', 'penalty_amount', 'discount_amount'].includes(name)) {
      setFormData((prev) => ({ ...prev, [name]: Number(value) }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const applySuggestedAmount = (amount: number) => {
    setFormData((prev) => ({ ...prev, amount }))
  }

  const calculateTotal = () => {
    const base = Number(formData.amount || 0)
    const penalty = Number(formData.penalty_amount || 0)
    const discount = Number(formData.discount_amount || 0)
    return Math.max(0, base + penalty - discount)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.client_id) {
      setError('Please select a client')
      return
    }
    if (!formData.unit_id) {
      setError('Please select a unit')
      return
    }
    if (formData.amount <= 0) {
      setError('Amount must be greater than 0')
      return
    }

    try {
      setLoading(true)
      if (isEdit && uuid) {
        await paymentService.updatePayment(uuid, formData)
        navigate(`/payments/${uuid}`)
      } else {
        const created = await paymentService.createPayment(formData)
        if (created?.uuid) {
          navigate(`/payments/${created.uuid}`)
        } else {
          navigate('/payments')
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit payment')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="payment-form-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading clients and units data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="payment-form-container">
      <div className="form-header">
        <button className="btn-back" onClick={() => navigate('/payments')}>
          <MdArrowBack /> Back to Payments
        </button>
        <h1>{isEdit ? 'Edit Payment Record' : 'Record New Payment'}</h1>
      </div>

      {error && (
        <div className="alert-box alert-error">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <MdWarning size={18} /> {error}
          </span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="payment-form">
        {/* Parties & Association */}
        <div className="form-section">
          <h2>1. Client & Property Association</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="client_id">Client *</label>
              <select
                id="client_id"
                name="client_id"
                value={formData.client_id}
                onChange={handleChange}
                required
              >
                <option value="">-- Select Client --</option>
                {clients.map((c) => (
                  <option key={c.uuid || c.id} value={c.uuid || c.id}>
                    {c.full_name || `${c.first_name || ''} ${c.last_name || ''}`} ({c.client_number || 'No #'}) - {c.phone_primary}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="unit_id">Unit / Property *</label>
              <select
                id="unit_id"
                name="unit_id"
                value={formData.unit_id}
                onChange={handleChange}
                required
              >
                <option value="">-- Select Unit --</option>
                {units.map((u) => (
                  <option key={u.id || u.uuid} value={u.id || u.uuid}>
                    Unit {u.unit_number} - {(u as any).unit_type || (u as any).type || 'Property'} ({u.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Dynamic Property Snapshot */}
            {selectedUnit && (
              <div className="property-snapshot-card">
                <div className="snapshot-left">
                  <div className="snapshot-title">
                    <MdHome style={{ verticalAlign: 'middle', marginRight: 6 }} />
                    Unit {selectedUnit.unit_number} ({(selectedUnit as any).unit_type || (selectedUnit as any).type || 'Residential'})
                  </div>
                  <div className="snapshot-meta">
                    Status: <strong>{selectedUnit.status?.toUpperCase()}</strong> • Bedrooms: {selectedUnit.bedrooms || 'N/A'} • Bathrooms: {selectedUnit.bathrooms || 'N/A'}
                  </div>
                </div>
                {unitPrice > 0 && (
                  <div className="snapshot-price-badge">
                    <div className="snapshot-price-label">Unit List Price</div>
                    <div className="snapshot-price-value">UGX {unitPrice.toLocaleString()}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Classification & Financial Information */}
        <div className="form-section">
          <h2>2. Classification & Financial Breakdown</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="payment_type">Payment Type *</label>
              <select
                id="payment_type"
                name="payment_type"
                value={formData.payment_type}
                onChange={handleChange}
                required
              >
                <option value="booking_fee">Booking Fee</option>
                <option value="deposit">Deposit</option>
                <option value="installment">Installment</option>
                <option value="balance">Balance</option>
                <option value="full_payment">Full Payment</option>
                <option value="legal_fee">Legal & Documentation Fee</option>
                <option value="survey_fee">Survey & Boundary Demarcation Fee</option>
                <option value="title_fee">Land Title Processing & Transfer Fee</option>
                <option value="site_visit_fee">Estate Site Visit & Inspection Fee</option>
                <option value="membership_fee">Scheme Membership & Registration Fee</option>
                <option value="penalty">Penalty</option>
                <option value="refund">Refund</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="payment_method">Payment Method *</label>
              <select
                id="payment_method"
                name="payment_method"
                value={formData.payment_method}
                onChange={handleChange}
                required
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="amount">Base Amount (UGX) *</label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                min="1"
                step="0.01"
                required
              />

              {/* Dynamic Suggested Amount Chips */}
              {unitPrice > 0 && (
                <div className="suggested-amounts">
                  <span style={{ fontSize: 11, color: '#6b7280', alignSelf: 'center' }}>
                    <MdInfoOutline style={{ verticalAlign: 'middle', marginRight: 2 }} /> Quick Fill:
                  </span>
                  <button
                    type="button"
                    className="btn-suggest-chip"
                    onClick={() => applySuggestedAmount(5000000)}
                  >
                    Booking (5M)
                  </button>
                  <button
                    type="button"
                    className="btn-suggest-chip"
                    onClick={() => applySuggestedAmount(Math.round(unitPrice * 0.1))}
                  >
                    10% Deposit
                  </button>
                  <button
                    type="button"
                    className="btn-suggest-chip"
                    onClick={() => applySuggestedAmount(Math.round(unitPrice * 0.2))}
                  >
                    20% Deposit
                  </button>
                  <button
                    type="button"
                    className="btn-suggest-chip"
                    onClick={() => applySuggestedAmount(unitPrice)}
                  >
                    100% Full
                  </button>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="penalty_amount">Late Penalty (UGX)</label>
              <input
                type="number"
                id="penalty_amount"
                name="penalty_amount"
                value={formData.penalty_amount || 0}
                onChange={handleChange}
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label htmlFor="discount_amount">Discount / Waiver (UGX)</label>
              <input
                type="number"
                id="discount_amount"
                name="discount_amount"
                value={formData.discount_amount || 0}
                onChange={handleChange}
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group highlight-box">
              <label>Net Payable Amount</label>
              <div className="calculated-total">
                <MdAttachMoney />
                <span>UGX {calculateTotal().toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule & Dates */}
        <div className="form-section">
          <h2>3. Dates & Tracking</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="payment_date">Payment Date *</label>
              <input
                type="date"
                id="payment_date"
                name="payment_date"
                value={formData.payment_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="due_date">Scheduled Due Date (Optional)</label>
              <input
                type="date"
                id="due_date"
                name="due_date"
                value={formData.due_date || ''}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="reference_number">External Reference / Receipt #</label>
              <input
                type="text"
                id="reference_number"
                name="reference_number"
                placeholder="e.g. REC-9821 or Bank Slip #"
                value={formData.reference_number || ''}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Banking or Mobile Money Details */}
        <div className="form-section">
          <h2>4. Transaction & Method Details</h2>
          <div className="form-grid">
            {formData.payment_method === 'bank_transfer' && (
              <>
                <div className="form-group">
                  <label htmlFor="bank_name">Bank Name</label>
                  <input
                    type="text"
                    id="bank_name"
                    name="bank_name"
                    placeholder="e.g. Stanbic Bank, Centenary"
                    value={formData.bank_name || ''}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="bank_account">Account / IBAN</label>
                  <input
                    type="text"
                    id="bank_account"
                    name="bank_account"
                    value={formData.bank_account || ''}
                    onChange={handleChange}
                  />
                </div>
              </>
            )}

            {formData.payment_method === 'mobile_money' && (
              <div className="form-group">
                <label htmlFor="mobile_money_number">Mobile Money Phone Number</label>
                <input
                  type="text"
                  id="mobile_money_number"
                  name="mobile_money_number"
                  placeholder="e.g. 0770000000 / 0750000000"
                  value={formData.mobile_money_number || ''}
                  onChange={handleChange}
                />
              </div>
            )}

            {formData.payment_method === 'check' && (
              <div className="form-group">
                <label htmlFor="check_number">Check Number</label>
                <input
                  type="text"
                  id="check_number"
                  name="check_number"
                  value={formData.check_number || ''}
                  onChange={handleChange}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="transaction_id">Transaction / Tele-money ID</label>
              <input
                type="text"
                id="transaction_id"
                name="transaction_id"
                placeholder="e.g. TXN987654321"
                value={formData.transaction_id || ''}
                onChange={handleChange}
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="notes">Internal Remarks & Notes</label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="Additional audit details or payment agreement notes..."
                value={formData.notes || ''}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Form Submission */}
        <div className="form-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={() => navigate('/payments')}
            disabled={loading}
          >
            Cancel
          </button>
          <button type="submit" className="btn-submit" disabled={loading}>
            <MdSave size={20} />
            {loading ? 'Processing...' : isEdit ? 'Update Payment' : 'Save Payment Record'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default PaymentForm
