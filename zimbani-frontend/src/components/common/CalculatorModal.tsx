import React, { useState } from 'react'
import {
  MdCalculate,
  MdSquareFoot,
  MdPayments,
  MdClose,
  MdBackspace,
  MdArrowForward,
} from 'react-icons/md'
import { useNavigate } from 'react-router-dom'

interface CalculatorModalProps {
  isOpen: boolean
  onClose: () => void
}

export const CalculatorModal: React.FC<CalculatorModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'standard' | 'land' | 'installment'>('standard')

  // 1. Standard Calculator State
  const [calcInput, setCalcInput] = useState<string>('0')
  const [prevOperation, setPrevOperation] = useState<string>('')

  const handleDigit = (digit: string) => {
    if (calcInput === '0' && digit !== '.') {
      setCalcInput(digit)
    } else {
      if (digit === '.' && calcInput.includes('.')) return
      setCalcInput((prev) => prev + digit)
    }
  }

  const handleOperator = (op: string) => {
    if (!calcInput) return
    setPrevOperation(`${calcInput} ${op}`)
    setCalcInput('0')
  }

  const handleClear = () => {
    setCalcInput('0')
    setPrevOperation('')
  }

  const handleBackspace = () => {
    if (calcInput.length <= 1) {
      setCalcInput('0')
    } else {
      setCalcInput((prev) => prev.slice(0, -1))
    }
  }

  const handleEvaluate = () => {
    if (!prevOperation) return
    const parts = prevOperation.trim().split(' ')
    const firstNum = parseFloat(parts[0])
    const op = parts[1]
    const secondNum = parseFloat(calcInput)

    let res = 0
    switch (op) {
      case '+':
        res = firstNum + secondNum
        break
      case '-':
        res = firstNum - secondNum
        break
      case '×':
      case '*':
        res = firstNum * secondNum
        break
      case '÷':
      case '/':
        res = secondNum !== 0 ? firstNum / secondNum : 0
        break
      case '%':
        res = (firstNum * secondNum) / 100
        break
      default:
        res = secondNum
    }

    setCalcInput(res.toString())
    setPrevOperation('')
  }

  // 2. Ugandan Land Unit Converter State
  const [landUnit, setLandUnit] = useState<'decimals' | 'acres' | 'plots' | 'sqmeters' | 'sqfeet'>('plots')
  const [landValue, setLandValue] = useState<number>(1)

  // Conversion reference base: 1 Acre = 100 Decimals = 8.712 Plots (50x100) = 4,046.86 Sq Meters = 43,560 Sq Feet
  const getAcres = (): number => {
    const val = Number(landValue) || 0
    switch (landUnit) {
      case 'acres':
        return val
      case 'decimals':
        return val / 100
      case 'plots':
        return val * 0.11478 // standard 50x100 ft plot = 5000 sq ft / 43560 sq ft
      case 'sqmeters':
        return val / 4046.86
      case 'sqfeet':
        return val / 43560
      default:
        return val
    }
  }

  const baseAcres = getAcres()

  // 3. Installment Plan Estimator State
  const [plotPrice, setPlotPrice] = useState<number>(25000000)
  const [downPayment, setDownPayment] = useState<number>(5000000)
  const [durationMonths, setDurationMonths] = useState<number>(12)

  const netBalance = Math.max(0, Number(plotPrice) - Number(downPayment))
  const monthlyDeposit = durationMonths > 0 ? Math.round(netBalance / durationMonths) : 0
  const weeklyDeposit = durationMonths > 0 ? Math.round(netBalance / (durationMonths * 4.33)) : 0

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          maxWidth: '520px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #cbd5e1',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.25rem',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#0f172a' }}>
            <MdCalculate size={22} color="#0d9488" />
            <span>Fab Homes Financial & Land Calculator</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              fontSize: '1.25rem',
              display: 'flex',
              padding: '0.25rem',
            }}
          >
            <MdClose />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('standard')}
            style={{
              flex: 1,
              padding: '0.75rem 0.5rem',
              border: 'none',
              background: 'none',
              borderBottom: `2px solid ${activeTab === 'standard' ? '#0d9488' : 'transparent'}`,
              color: activeTab === 'standard' ? '#0d9488' : '#64748b',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
            }}
          >
            <MdCalculate /> Standard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('land')}
            style={{
              flex: 1,
              padding: '0.75rem 0.5rem',
              border: 'none',
              background: 'none',
              borderBottom: `2px solid ${activeTab === 'land' ? '#0d9488' : 'transparent'}`,
              color: activeTab === 'land' ? '#0d9488' : '#64748b',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
            }}
          >
            <MdSquareFoot /> Land Units
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('installment')}
            style={{
              flex: 1,
              padding: '0.75rem 0.5rem',
              border: 'none',
              background: 'none',
              borderBottom: `2px solid ${activeTab === 'installment' ? '#0d9488' : 'transparent'}`,
              color: activeTab === 'installment' ? '#0d9488' : '#64748b',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
            }}
          >
            <MdPayments /> Installments
          </button>
        </div>

        {/* Tab 1: Standard Arithmetic Calculator */}
        {activeTab === 'standard' && (
          <div style={{ padding: '1.25rem' }}>
            <div
              style={{
                backgroundColor: '#0f172a',
                color: '#ffffff',
                borderRadius: '8px',
                padding: '1rem',
                textAlign: 'right',
                marginBottom: '1rem',
              }}
            >
              <div style={{ minHeight: '1.2rem', color: '#94a3b8', fontSize: '0.82rem', fontFamily: 'monospace' }}>
                {prevOperation || ' '}
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '1px' }}>
                {calcInput}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
              }}
            >
              <button
                type="button"
                onClick={handleClear}
                style={{ padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fee2e2', color: '#b91c1c', fontWeight: 700, cursor: 'pointer' }}
              >
                C
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                style={{ padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', color: '#334155', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <MdBackspace size={18} />
              </button>
              <button
                type="button"
                onClick={() => handleOperator('%')}
                style={{ padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', color: '#334155', fontWeight: 700, cursor: 'pointer' }}
              >
                %
              </button>
              <button
                type="button"
                onClick={() => handleOperator('÷')}
                style={{ padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: '#0d9488', color: '#ffffff', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer' }}
              >
                ÷
              </button>

              {['7', '8', '9'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleDigit(d)}
                  style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer' }}
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleOperator('×')}
                style={{ padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: '#0d9488', color: '#ffffff', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer' }}
              >
                ×
              </button>

              {['4', '5', '6'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleDigit(d)}
                  style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer' }}
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleOperator('-')}
                style={{ padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: '#0d9488', color: '#ffffff', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer' }}
              >
                −
              </button>

              {['1', '2', '3'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleDigit(d)}
                  style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer' }}
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleOperator('+')}
                style={{ padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: '#0d9488', color: '#ffffff', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer' }}
              >
                +
              </button>

              <button
                type="button"
                onClick={() => handleDigit('0')}
                style={{ gridColumn: 'span 2', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer' }}
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleDigit('.')}
                style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer' }}
              >
                .
              </button>
              <button
                type="button"
                onClick={handleEvaluate}
                style={{ padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: '#16a34a', color: '#ffffff', fontWeight: 800, fontSize: '1.2rem', cursor: 'pointer' }}
              >
                =
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Ugandan Land Unit Converter */}
        {activeTab === 'land' && (
          <div style={{ padding: '1.25rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                Input Land Quantity
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={landValue}
                  onChange={(e) => setLandValue(parseFloat(e.target.value) || 0)}
                  style={{ flex: 1, padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem', fontWeight: 700 }}
                />
                <select
                  value={landUnit}
                  onChange={(e) => setLandUnit(e.target.value as any)}
                  style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 600, backgroundColor: '#f8fafc' }}
                >
                  <option value="plots">Plots (50×100 ft)</option>
                  <option value="decimals">Decimals</option>
                  <option value="acres">Acres</option>
                  <option value="sqmeters">Sq Meters (m²)</option>
                  <option value="sqfeet">Sq Feet (ft²)</option>
                </select>
              </div>
            </div>

            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Equivalent Ugandan Land Measurements
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div style={{ backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #dcfce7' }}>
                  <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block' }}>Standard Plots (50x100)</span>
                  <strong style={{ color: '#14532d', fontSize: '1.05rem' }}>{(baseAcres / 0.11478).toFixed(2)} Plots</strong>
                </div>
                <div style={{ backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #dcfce7' }}>
                  <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block' }}>Decimals</span>
                  <strong style={{ color: '#14532d', fontSize: '1.05rem' }}>{(baseAcres * 100).toFixed(2)} Decimals</strong>
                </div>
                <div style={{ backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #dcfce7' }}>
                  <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block' }}>Total Acres</span>
                  <strong style={{ color: '#14532d', fontSize: '1.05rem' }}>{baseAcres.toFixed(3)} Acres</strong>
                </div>
                <div style={{ backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #dcfce7' }}>
                  <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block' }}>Square Meters (m²)</span>
                  <strong style={{ color: '#14532d', fontSize: '1.05rem' }}>{(baseAcres * 4046.86).toLocaleString(undefined, { maximumFractionDigits: 1 })} m²</strong>
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
              *Standard reference: In Uganda, 1 Acre equals exactly 100 Decimals (approximately 8.7 standard 50×100 ft residential plots).
            </div>
          </div>
        )}

        {/* Tab 3: Scheme Installment Plan Estimator */}
        {activeTab === 'installment' && (
          <div style={{ padding: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                  Plot / Property Price (UGX)
                </label>
                <input
                  type="number"
                  step="500000"
                  value={plotPrice}
                  onChange={(e) => setPlotPrice(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                  Down Payment (UGX)
                </label>
                <input
                  type="number"
                  step="200000"
                  value={downPayment}
                  onChange={(e) => setDownPayment(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                Installment Period (Months)
              </label>
              <select
                value={durationMonths}
                onChange={(e) => setDurationMonths(parseInt(e.target.value) || 12)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: '#fff' }}
              >
                <option value={3}>3 Months (Fast Track)</option>
                <option value={6}>6 Months (Short Term)</option>
                <option value={12}>12 Months (Standard Scheme)</option>
                <option value={18}>18 Months (Extended)</option>
                <option value={24}>24 Months (2-Year Plan)</option>
                <option value={36}>36 Months (3-Year Plan)</option>
              </select>
            </div>

            <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#1e40af' }}>Net Balance to Save:</span>
                <strong style={{ color: '#1e3a8a' }}>UGX {netBalance.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid #bfdbfe' }}>
                <span style={{ color: '#1e40af', fontWeight: 600 }}>Monthly Installment:</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1d4ed8' }}>
                  UGX {monthlyDeposit.toLocaleString()} / mo
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '0.25rem', textAlign: 'right' }}>
                Approx. UGX {weeklyDeposit.toLocaleString()} / week
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose()
                navigate('/savings-accounts/new')
              }}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                backgroundColor: '#0d9488',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              Enrol in Savings Scheme with this Target <MdArrowForward />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default CalculatorModal
