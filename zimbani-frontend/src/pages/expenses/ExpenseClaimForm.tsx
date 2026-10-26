import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { MdArrowBack, MdSave, MdAdd, MdDelete } from 'react-icons/md'
import expenseService from '../../services/expense.service'
import pettyCashService from '../../services/petty-cash.service'
import projectService from '../../services/project.service'
import siteService from '../../services/site.service'
import { Project } from '../../types/project.types'
import { Site } from '../../types/site.types'
import { PettyCashAccount } from '../../types/petty-cash.types'
import {
  ExpenseClaimType,
  ExpenseCategory,
  ExpensePaymentMethod,
} from '../../types/expense.types'
import '../contracts/ContractForm.css'
import './Expenses.css'

interface FormItem {
  item_description: string
  expense_category: ExpenseCategory
  quantity: number
  unit_of_measure: string
  unit_price: number
  receipt_reference: string
}

const CLAIM_TYPES: { value: ExpenseClaimType; label: string }[] = [
  { value: 'emergency_materials', label: 'Emergency Site Materials' },
  { value: 'petty_cash_reimbursement', label: 'Petty Cash Reimbursement' },
  { value: 'direct_site_purchase', label: 'Direct Site Purchasing' },
  { value: 'travel_mileage', label: 'Travel & Transport Logistics' },
  { value: 'site_utilities', label: 'Site Utilities & Water' },
  { value: 'other', label: 'Other Direct Expense' },
]

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'materials', label: 'Materials' },
  { value: 'fuel_oil', label: 'Fuel & Oil' },
  { value: 'tools_hardware', label: 'Tools & Hardware' },
  { value: 'transport', label: 'Transport' },
  { value: 'labour_welfare', label: 'Labour & Welfare' },
  { value: 'equipment_hire', label: 'Equipment Hire' },
  { value: 'statutory_permits', label: 'Statutory Permits' },
  { value: 'office_admin', label: 'Office & Admin' },
  { value: 'other', label: 'Other' },
]

const PAYMENT_METHODS: { value: ExpensePaymentMethod; label: string }[] = [
  { value: 'petty_cash', label: 'Petty Cash Float' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'bank_transfer', label: 'Bank Transfer / EFT' },
  { value: 'cash', label: 'Direct Cash' },
  { value: 'company_card', label: 'Company Debit Card' },
]

export const ExpenseClaimForm: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const [loading, setLoading] = useState<boolean>(false)
  const [initialLoading, setInitialLoading] = useState<boolean>(isEdit)
  const [error, setError] = useState<string | null>(null)

  // Lookups
  const [projects, setProjects] = useState<Project[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [pettyCashAccounts, setPettyCashAccounts] = useState<PettyCashAccount[]>([])

  // Form Fields
  const [title, setTitle] = useState<string>('')
  const [projectId, setProjectId] = useState<string>('')
  const [siteId, setSiteId] = useState<string>('')
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [claimType, setClaimType] = useState<ExpenseClaimType>('emergency_materials')
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('materials')
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>('petty_cash')
  const [pettyCashAccountId, setPettyCashAccountId] = useState<string>('')
  const [vendorName, setVendorName] = useState<string>('')
  const [vendorTin, setVendorTin] = useState<string>('')
  const [receiptNumber, setReceiptNumber] = useState<string>('')
  const [description, setDescription] = useState<string>('')

  // Line Items
  const [items, setItems] = useState<FormItem[]>([
    {
      item_description: '',
      expense_category: 'materials',
      quantity: 1,
      unit_of_measure: 'pcs',
      unit_price: 0,
      receipt_reference: '',
    },
  ])

  // Load Projects and Petty Cash Accounts
  useEffect(() => {
    projectService
      .getProjects({ per_page: 100 } as any)
      .then((res: any) => {
        const raw = res?.data || []
        setProjects(Array.isArray(raw) ? raw : [])
        if (!isEdit && raw.length > 0) {
          setProjectId(raw[0].uuid || raw[0].id.toString())
        }
      })
      .catch((err) => console.warn('Failed to load projects:', err))

    pettyCashService
      .getPettyCashAccounts({ status: 'active', per_page: 50 })
      .then((res) => {
        const accs = res?.data || []
        setPettyCashAccounts(Array.isArray(accs) ? accs : [])
        if (!isEdit && accs.length > 0) {
          setPettyCashAccountId(accs[0].uuid || accs[0].id.toString())
        }
      })
      .catch((err) => console.warn('Failed to load petty cash accounts:', err))
  }, [isEdit])

  // Load Sites when Project changes
  useEffect(() => {
    if (!projectId) {
      setSites([])
      setSiteId('')
      return
    }

    siteService
      .getSites({ project_id: projectId, per_page: 100 } as any)
      .then((res: any) => {
        const raw = res?.data || []
        setSites(Array.isArray(raw) ? raw : [])
        if (raw.length > 0 && !isEdit) {
          setSiteId(raw[0].uuid || raw[0].id.toString())
        }
      })
      .catch((err) => console.warn('Failed to load sites:', err))
  }, [projectId, isEdit])

  // Fetch claim data if editing
  useEffect(() => {
    if (!id) return
    setInitialLoading(true)
    expenseService
      .getExpenseClaim(id)
      .then((claim) => {
        setTitle(claim.title || '')
        setProjectId(claim.project?.uuid || claim.project_id.toString())
        setSiteId(claim.site?.uuid || claim.site_id.toString())
        setExpenseDate(claim.expense_date ? claim.expense_date.split('T')[0] : '')
        setClaimType(claim.claim_type)
        setExpenseCategory(claim.expense_category)
        setPaymentMethod(claim.payment_method)
        setPettyCashAccountId(claim.petty_cash_account?.uuid || claim.petty_cash_account_id?.toString() || '')
        setVendorName(claim.vendor_name || '')
        setVendorTin(claim.vendor_tin || '')
        setReceiptNumber(claim.receipt_number || '')
        setDescription(claim.description || '')

        if (claim.items && claim.items.length > 0) {
          setItems(
            claim.items.map((it) => ({
              item_description: it.item_description,
              expense_category: it.expense_category || claim.expense_category,
              quantity: Number(it.quantity) || 1,
              unit_of_measure: it.unit_of_measure || 'pcs',
              unit_price: Number(it.unit_price) || 0,
              receipt_reference: it.receipt_reference || '',
            }))
          )
        }
      })
      .catch((err) => {
        setError(err?.response?.data?.message || 'Failed to load expense claim.')
      })
      .finally(() => setInitialLoading(false))
  }, [id])

  // Dynamic Item row controls
  const handleAddItem = () => {
    setItems([
      ...items,
      {
        item_description: '',
        expense_category: expenseCategory,
        quantity: 1,
        unit_of_measure: 'pcs',
        unit_price: 0,
        receipt_reference: receiptNumber || '',
      },
    ])
  }

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setError('An expense claim must have at least one line item.')
      return
    }
    setItems(items.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, field: keyof FormItem, value: any) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  const calculateTotal = () => {
    return items.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Please provide an expense claim title.')
      return
    }

    if (!projectId || !siteId) {
      setError('Please select both a project and a construction site.')
      return
    }

    if (paymentMethod === 'petty_cash' && !pettyCashAccountId) {
      setError('Please designate a Petty Cash Account for float reimbursement.')
      return
    }

    for (let i = 0; i < items.length; i++) {
      if (!items[i].item_description.trim()) {
        setError(`Please enter a description for Item #${i + 1}.`)
        return
      }
      if (Number(items[i].quantity) <= 0 || Number(items[i].unit_price) <= 0) {
        setError(`Item #${i + 1} must have a positive quantity and unit price.`)
        return
      }
    }

    try {
      setLoading(true)
      const payloadItems = items.map((it) => ({
        item_description: it.item_description.trim(),
        expense_category: it.expense_category,
        quantity: Number(it.quantity),
        unit_of_measure: it.unit_of_measure.trim() || 'pcs',
        unit_price: Number(it.unit_price),
        receipt_reference: it.receipt_reference.trim() || undefined,
      }))

      if (isEdit && id) {
        await expenseService.updateExpenseClaim(id, {
          title: title.trim(),
          project_id: projectId,
          site_id: siteId,
          expense_date: expenseDate,
          claim_type: claimType,
          expense_category: expenseCategory,
          payment_method: paymentMethod,
          petty_cash_account_id: paymentMethod === 'petty_cash' ? pettyCashAccountId : undefined,
          vendor_name: vendorName.trim() || undefined,
          vendor_tin: vendorTin.trim() || undefined,
          receipt_number: receiptNumber.trim() || undefined,
          description: description.trim() || undefined,
          items: payloadItems,
        })
        navigate(`/expenses/${id}`)
      } else {
        const created = await expenseService.createExpenseClaim({
          title: title.trim(),
          project_id: projectId,
          site_id: siteId,
          expense_date: expenseDate,
          claim_type: claimType,
          expense_category: expenseCategory,
          payment_method: paymentMethod,
          petty_cash_account_id: paymentMethod === 'petty_cash' ? pettyCashAccountId : undefined,
          vendor_name: vendorName.trim() || undefined,
          vendor_tin: vendorTin.trim() || undefined,
          receipt_number: receiptNumber.trim() || undefined,
          description: description.trim() || undefined,
          items: payloadItems,
        })
        navigate(`/expenses/${created.uuid}`)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save expense claim.')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="expenses-page" style={{ textAlign: 'center', padding: '4rem' }}>
        <p style={{ color: '#64748b' }}>Loading expense claim...</p>
      </div>
    )
  }

  const grandTotal = calculateTotal()

  return (
    <div className="contract-form-page">
      <div className="contract-form-header">
        <Link to="/expenses" className="btn-back">
          <MdArrowBack size={20} /> Back to Expense Claims
        </Link>
        <h1>{isEdit ? 'Edit Expense Claim' : 'Create New Expense Claim'}</h1>
        <p>Record emergency site purchases, transport chits, fuel vouchers, and direct receipts</p>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="contract-form-container">
        {/* Basic Header Details */}
        <div className="form-card">
          <h2 className="form-card-title">General Claim Details</h2>
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Claim Title / Summary *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Emergency 10 Bags Cement & Haulage for Ring Beam Pour"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label>Project *</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="form-select"
                required
              >
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.uuid || p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Construction Site *</label>
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="form-select"
                disabled={!projectId}
                required
              >
                <option value="">Select Site</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.uuid || s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Expense Date *</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label>Claim Type *</label>
              <select
                value={claimType}
                onChange={(e) => setClaimType(e.target.value as ExpenseClaimType)}
                className="form-select"
                required
              >
                {CLAIM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Primary Expense Category *</label>
              <select
                value={expenseCategory}
                onChange={(e) => {
                  const cat = e.target.value as ExpenseCategory
                  setExpenseCategory(cat)
                }}
                className="form-select"
                required
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Disbursement / Payment Method *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as ExpensePaymentMethod)}
                className="form-select"
                required
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm.value} value={pm.value}>
                    {pm.label}
                  </option>
                ))}
              </select>
            </div>

            {paymentMethod === 'petty_cash' && (
              <div className="form-group">
                <label>Petty Cash Float Account *</label>
                <select
                  value={pettyCashAccountId}
                  onChange={(e) => setPettyCashAccountId(e.target.value)}
                  className="form-select"
                  required
                >
                  <option value="">Select Float to Deduct From</option>
                  {pettyCashAccounts.map((acc) => (
                    <option key={acc.id} value={acc.uuid || acc.id}>
                      {acc.account_number} - {acc.name} (Bal: {Number(acc.current_balance).toLocaleString()} UGX)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Merchant & Receipt Details */}
        <div className="form-card">
          <h2 className="form-card-title">Vendor & Receipt Documentation</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Merchant / Supplier Name</label>
              <input
                type="text"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="e.g. Kasangati Hardware Ltd"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Vendor Tax Identification Number (TIN)</label>
              <input
                type="text"
                value={vendorTin}
                onChange={(e) => setVendorTin(e.target.value)}
                placeholder="e.g. 1002938475"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Receipt / Cash Sale Number</label>
              <input
                type="text"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="e.g. RCP-2026-9081"
                className="form-input"
              />
            </div>

            <div className="form-group full-width">
              <label>Purpose / Justification Notes</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain why materials were purchased directly rather than through central bulk procurement..."
                rows={2}
                className="form-textarea"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Line Items Table */}
        <div className="form-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 className="form-card-title" style={{ margin: 0 }}>
              Purchased Line Items ({items.length})
            </h2>
            <button
              type="button"
              onClick={handleAddItem}
              className="btn-secondary"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
            >
              <MdAdd size={18} /> Add Item Row
            </button>
          </div>

          <div className="table-responsive">
            <table className="line-items-table">
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Description *</th>
                  <th style={{ width: '16%' }}>Category</th>
                  <th style={{ width: '10%' }}>Qty *</th>
                  <th style={{ width: '10%' }}>UoM</th>
                  <th style={{ width: '16%' }}>Unit Price (UGX) *</th>
                  <th style={{ width: '14%', textAlign: 'right' }}>Total (UGX)</th>
                  <th style={{ width: '4%' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const lineTotal = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0)
                  return (
                    <tr key={idx}>
                      <td>
                        <input
                          type="text"
                          value={it.item_description}
                          onChange={(e) => handleItemChange(idx, 'item_description', e.target.value)}
                          placeholder="Item name / spec"
                          className="form-input"
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                          required
                        />
                      </td>
                      <td>
                        <select
                          value={it.expense_category}
                          onChange={(e) => handleItemChange(idx, 'expense_category', e.target.value)}
                          className="form-select"
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={it.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="form-input"
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={it.unit_of_measure}
                          onChange={(e) => handleItemChange(idx, 'unit_of_measure', e.target.value)}
                          placeholder="pcs/bags/litres"
                          className="form-input"
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={it.unit_price}
                          onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                          className="form-input"
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                          required
                        />
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>
                        {lineTotal.toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="btn-icon-danger"
                          title="Remove Item"
                        >
                          <MdDelete size={18} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Grand Total Summary Box */}
          <div style={{ marginTop: '1.25rem', padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1.5rem' }}>
            <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 500 }}>
              Total Claim Value:
            </span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
              UGX {grandTotal.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/expenses')}
            className="btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            <MdSave size={20} /> {loading ? 'Saving Claim...' : isEdit ? 'Update Claim' : 'Save Draft Claim'}
          </button>
        </div>
      </form>
    </div>
  )
}
