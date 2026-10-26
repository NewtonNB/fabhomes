import React, { useState } from 'react'
import {
  MdClose,
  MdAdd,
  MdDelete,
  MdPrint,
  MdSave,
  MdConstruction,
  MdCheckCircle,
} from 'react-icons/md'

interface LineItem {
  id: string
  category: 'Material' | 'Labour' | 'Machinery'
  description: string
  unit: string
  quantity: number
  rate: number
  amount: number
}

interface ConstructionEstimatesModalProps {
  isOpen: boolean
  onClose: () => void
  projectName?: string
}

export const ConstructionEstimatesModal: React.FC<ConstructionEstimatesModalProps> = ({
  isOpen,
  onClose,
  projectName = 'Mukono Greenfield Residential Block A',
}) => {
  // Page 11: Estimate Types
  const [estimateType, setEstimateType] = useState<'architect' | 'fab' | 'actual'>('fab')
  
  // New Line Item State
  const [selectedCategory, setSelectedCategory] = useState<'Material' | 'Labour' | 'Machinery'>('Material')
  const [itemDescription, setItemDescription] = useState('')
  const [itemUnit, setItemUnit] = useState('Bags')
  const [itemQty, setItemQty] = useState<number>(50)
  const [itemRate, setItemRate] = useState<number>(38000)

  // Cart Line Items
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', category: 'Material', description: 'Portland Cement (Tororo 42.5N)', unit: 'Bags', quantity: 120, rate: 38000, amount: 4560000 },
    { id: '2', category: 'Material', description: 'Lake Sand (Fine Sharp Plastering)', unit: 'Trips (15T)', quantity: 4, rate: 450000, amount: 1800000 },
    { id: '3', category: 'Material', description: 'High-Tensile Rebar Y16 Ribbed Steel', unit: 'Bars (12m)', quantity: 60, rate: 72000, amount: 4320000 },
    { id: '4', category: 'Labour', description: 'Masonry & Foundation Cast Labour Crew', unit: 'Person-Days', quantity: 30, rate: 45000, amount: 1350000 },
    { id: '5', category: 'Machinery', description: 'Concrete Mixer & Poker Vibrator Day Hire', unit: 'Days', quantity: 5, rate: 180000, amount: 900000 },
  ])

  // Summary adjustments
  const [contingencyPct, setContingencyPct] = useState<number>(5)
  const [discountPct, setDiscountPct] = useState<number>(2)
  const [vatPct, setVatPct] = useState<number>(18)
  const [paidToDate, setPaidToDate] = useState<number>(5000000)
  const [savedSuccess, setSavedSuccess] = useState(false)

  if (!isOpen) return null

  const handleAddLineItem = () => {
    if (!itemDescription.trim() || itemQty <= 0 || itemRate <= 0) return
    const newItem: LineItem = {
      id: Date.now().toString(),
      category: selectedCategory,
      description: itemDescription,
      unit: itemUnit,
      quantity: itemQty,
      rate: itemRate,
      amount: itemQty * itemRate,
    }
    setLineItems([...lineItems, newItem])
    setItemDescription('')
    setItemQty(10)
    setItemRate(50000)
  }

  const handleRemoveLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id))
  }

  // Math Calculations (Page 11 Reference Formula)
  const subTotal = lineItems.reduce((acc, item) => acc + item.amount, 0)
  const contingencyAmount = (subTotal * contingencyPct) / 100
  const discountAmount = (subTotal * discountPct) / 100
  const taxableSubtotal = subTotal + contingencyAmount - discountAmount
  const vatAmount = (taxableSubtotal * vatPct) / 100
  const totalCost = taxableSubtotal + vatAmount
  const balanceDue = Math.max(0, totalCost - paidToDate)

  const formatUGX = (val: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(val || 0)
  }

  return (
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
        maxWidth: '920px',
        maxHeight: '90vh',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        overflowY: 'auto',
        border: '1px solid #e2e8f0',
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#0d9488',
          color: '#ffffff',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}><MdConstruction /></span>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>
                Construction Estimates & Bill of Quantities (BoQ)
              </h2>
              <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>
                {projectName} • Quantity Surveyor & Architectural Cost Estimator
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '24px', cursor: 'pointer' }}
          >
            <MdClose />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Estimate Type Radio Group (Page 11 Reference) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            backgroundColor: '#f8fafc',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px',
          }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
              Estimate Methodology:
            </span>
            <div style={{ display: 'flex', gap: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: estimateType === 'architect' ? '700' : '500' }}>
                <input
                  type="radio"
                  name="estimateType"
                  checked={estimateType === 'architect'}
                  onChange={() => setEstimateType('architect')}
                />
                Architect Estimates
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: estimateType === 'fab' ? '700' : '500' }}>
                <input
                  type="radio"
                  name="estimateType"
                  checked={estimateType === 'fab'}
                  onChange={() => setEstimateType('fab')}
                />
                Fab Estimates (Standard BoQ)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: estimateType === 'actual' ? '700' : '500' }}>
                <input
                  type="radio"
                  name="estimateType"
                  checked={estimateType === 'actual'}
                  onChange={() => setEstimateType('actual')}
                />
                Actual Site Expenses
              </label>
            </div>
          </div>

          {/* Line Item Entry Form */}
          <div style={{
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '20px',
            backgroundColor: '#ffffff',
          }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '700', color: '#0f766e' }}>
              + Add Resource Line Item
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1fr 1fr 1.2fr auto', gap: '10px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '3px' }}>Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e: any) => setSelectedCategory(e.target.value)}
                  style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                >
                  <option value="Material">Material</option>
                  <option value="Labour">Labour</option>
                  <option value="Machinery">Machinery</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '3px' }}>Item Description</label>
                <input
                  type="text"
                  placeholder="e.g. Clay Maxpan Bricks (5000 pcs)"
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '3px' }}>Unit</label>
                <input
                  type="text"
                  value={itemUnit}
                  onChange={(e) => setItemUnit(e.target.value)}
                  style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '3px' }}>Qty</label>
                <input
                  type="number"
                  value={itemQty}
                  onChange={(e) => setItemQty(Number(e.target.value))}
                  style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '3px' }}>Rate (UGX)</label>
                <input
                  type="number"
                  value={itemRate}
                  onChange={(e) => setItemRate(Number(e.target.value))}
                  style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <button
                type="button"
                onClick={handleAddLineItem}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#0d9488',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <MdAdd /> Add
              </button>
            </div>
          </div>

          {/* Line Items Table */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', marginBottom: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '600' }}>
                  <th style={{ padding: '10px 14px' }}>Type</th>
                  <th style={{ padding: '10px 14px' }}>Description</th>
                  <th style={{ padding: '10px 14px' }}>Unit</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Qty</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Unit Rate</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Total (UGX)</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Del</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: '700',
                        backgroundColor: item.category === 'Material' ? '#e0f2fe' : item.category === 'Labour' ? '#fef3c7' : '#f1f5f9',
                        color: item.category === 'Material' ? '#0369a1' : item.category === 'Labour' ? '#b45309' : '#475569',
                      }}>
                        {item.category}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: '500', color: '#1e293b' }}>{item.description}</td>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>{item.unit}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '600' }}>{item.quantity}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>{formatUGX(item.rate)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: '#0f766e' }}>{formatUGX(item.amount)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(item.id)}
                        style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px' }}
                      >
                        <MdDelete />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cost Summary Box (Page 11 Reference Layout) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            gap: '24px',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
          }}>
            <div>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>
                Taxation, Discounts & Contingency Ratios
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '3px' }}>Contingencies (%)</label>
                  <input
                    type="number"
                    value={contingencyPct}
                    onChange={(e) => setContingencyPct(Number(e.target.value))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '3px' }}>Discount (%)</label>
                  <input
                    type="number"
                    value={discountPct}
                    onChange={(e) => setDiscountPct(Number(e.target.value))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '3px' }}>VAT (%)</label>
                  <input
                    type="number"
                    value={vatPct}
                    onChange={(e) => setVatPct(Number(e.target.value))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '3px' }}>Amount Paid (UGX)</label>
                  <input
                    type="number"
                    value={paidToDate}
                    onChange={(e) => setPaidToDate(Number(e.target.value))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Subtotal (Cart Items):</span>
                <span style={{ fontWeight: '600' }}>{formatUGX(subTotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309' }}>
                <span>Contingencies ({contingencyPct}%):</span>
                <span>+{formatUGX(contingencyAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                <span>Discount ({discountPct}%):</span>
                <span>-{formatUGX(discountAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0284c7' }}>
                <span>VAT ({vatPct}%):</span>
                <span>+{formatUGX(vatAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #0d9488', paddingTop: '8px', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                <span>Total Estimated Cost:</span>
                <span>{formatUGX(totalCost)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: '600' }}>
                <span>Paid to Date:</span>
                <span>{formatUGX(paidToDate)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '6px', fontWeight: '800', color: '#dc2626', fontSize: '14px' }}>
                <span>Due / Outstanding Balance:</span>
                <span>{formatUGX(balanceDue)}</span>
              </div>
            </div>
          </div>

          {savedSuccess && (
            <div style={{ marginTop: '14px', padding: '10px', backgroundColor: '#ecfdf5', color: '#065f46', borderRadius: '6px', textAlign: 'center', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <MdCheckCircle size={16} color="#059669" /> Construction Estimate & Bill of Quantities saved successfully!
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
              }}
            >
              <MdPrint /> Print BoQ
            </button>
            <button
              type="button"
              onClick={() => {
                setSavedSuccess(true)
                setTimeout(() => setSavedSuccess(false), 3000)
              }}
              style={{
                padding: '10px 22px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#0d9488',
                color: '#ffffff',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
              }}
            >
              <MdSave /> Save Estimate
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConstructionEstimatesModal
