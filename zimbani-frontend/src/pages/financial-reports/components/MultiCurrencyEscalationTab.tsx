import React, { useState, useEffect, useCallback } from 'react'
import {
  MdAttachMoney,
  MdTrendingUp,
  MdWarning,
  MdCheckCircle,
  MdRefresh,
  MdCalculate,
  MdAdd,
  MdSend,
  MdEdit,
} from 'react-icons/md'
import multiCurrencyEscalationService from '../../../services/multi-currency-escalation.service'
import {
  FxHedgingContract,
  MaterialPriceIndex,
  MaterialPriceRecord,
  BoqEscalationResult,
  MultiCurrencyStatistics,
  FxConversionResult,
  CreateHedgingContractPayload,
} from '../../../types/multi-currency-escalation.types'
import './MultiCurrencyEscalationTab.css'

export const MultiCurrencyEscalationTab: React.FC = () => {
  const [activeSubtab, setActiveSubtab] = useState<'escalation' | 'hedging' | 'converter'>(
    'escalation'
  )

  const [rates, setRates] = useState<Record<string, number>>({
    usd_ugx: 3745,
    gbp_ugx: 4880,
    eur_ugx: 4075,
    kes_ugx: 29.1,
  })
  const [indices, setIndices] = useState<MaterialPriceIndex[]>([])
  const [selectedIndex, setSelectedIndex] = useState<MaterialPriceIndex | null>(null)
  const [hedgingContracts, setHedgingContracts] = useState<FxHedgingContract[]>([])
  const [stats, setStats] = useState<MultiCurrencyStatistics | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Quick Currency Converter State
  const [calcAmount, setCalcAmount] = useState<number>(5000)
  const [fromCurr, setFromCurr] = useState<string>('USD')
  const [toCurr, setToCurr] = useState<string>('UGX')
  const [convResult, setConvResult] = useState<FxConversionResult | null>(null)

  // BOQ Calculator State
  const [boqAmount, setBoqAmount] = useState<number>(250000000)
  const [boqResult, setBoqResult] = useState<BoqEscalationResult | null>(null)

  // Modals
  const [showPriceModal, setShowPriceModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<MaterialPriceRecord | null>(null)
  const [newSpotPrice, setNewSpotPrice] = useState<number>(0)
  const [surveySource, setSurveySource] = useState<string>('')

  const [showHedgeModal, setShowHedgeModal] = useState(false)
  const [hedgeForm, setHedgeForm] = useState<CreateHedgingContractPayload>({
    client_id: 1,
    base_currency: 'USD',
    committed_amount_foreign: 25000,
    locked_exchange_rate: 3750,
    lock_duration_days: 120,
    premium_fee_percentage: 0.5,
    notes: 'Diaspora construction budget lock',
  })

  const [showDrawdownModal, setShowDrawdownModal] = useState(false)
  const [drawdownTarget, setDrawdownTarget] = useState<FxHedgingContract | null>(null)
  const [drawdownAmount, setDrawdownAmount] = useState<number>(5000)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [rateData, indexList, hedgeData, statsData] = await Promise.all([
        multiCurrencyEscalationService.getRates().catch(() => ({})),
        multiCurrencyEscalationService.getIndices().catch(() => []),
        multiCurrencyEscalationService.getHedgingContracts({ per_page: 50 }).catch(() => ({ data: [] })),
        multiCurrencyEscalationService.getStatistics().catch(() => null),
      ])

      if (Object.keys(rateData).length > 0) setRates(rateData)
      setIndices(indexList)
      if (indexList.length > 0 && !selectedIndex) {
        setSelectedIndex(indexList[0])
      }
      setHedgingContracts(hedgeData.data || [])
      if (statsData) setStats(statsData)
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to load multi-currency data' })
    } finally {
      setLoading(false)
    }
  }, [selectedIndex])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Clear feedback after 6 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 6000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  // Run initial BOQ calculation when index is loaded
  useEffect(() => {
    if (selectedIndex && !boqResult) {
      multiCurrencyEscalationService
        .calculateBoqEscalation(boqAmount, selectedIndex.id)
        .then((res) => setBoqResult(res))
        .catch(() => {})
    }
  }, [selectedIndex, boqAmount, boqResult])

  // Currency Converter Handler
  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setActionLoading(true)
      const res = await multiCurrencyEscalationService.convertCurrency(
        calcAmount,
        fromCurr,
        toCurr
      )
      setConvResult(res)
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.message || err.message || 'Conversion failed' })
    } finally {
      setActionLoading(false)
    }
  }

  // Calculate BOQ Variation Handler
  const handleCalculateBoq = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setActionLoading(true)
      const res = await multiCurrencyEscalationService.calculateBoqEscalation(
        boqAmount,
        selectedIndex?.id
      )
      setBoqResult(res)
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Calculation failed' })
    } finally {
      setActionLoading(false)
    }
  }

  // Update Material Spot Price Handler
  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedIndex || !selectedRecord) return

    try {
      setActionLoading(true)
      await multiCurrencyEscalationService.updateMaterialPrice(selectedIndex.uuid, {
        item_code: selectedRecord.item_code,
        new_price: newSpotPrice,
        survey_source: surveySource,
      })
      setFeedback({
        type: 'success',
        text: `Spot price for ${selectedRecord.item_name} updated to ${Number(newSpotPrice).toLocaleString()} UGX! Index recalculated.`,
      })
      setShowPriceModal(false)
      fetchData()
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.message || err.message || 'Price update failed' })
    } finally {
      setActionLoading(false)
    }
  }

  // Create Forward Hedging Contract Handler
  const handleCreateHedge = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setActionLoading(true)
      const res = await multiCurrencyEscalationService.createHedgingContract(hedgeForm)
      setFeedback({
        type: 'success',
        text: `Forward FX Hedging Contract ${res.contract_number} created! Locked ${hedgeForm.committed_amount_foreign} ${hedgeForm.base_currency} @ ${res.locked_exchange_rate} UGX.`,
      })
      setShowHedgeModal(false)
      fetchData()
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.message || err.message || 'Failed to create contract' })
    } finally {
      setActionLoading(false)
    }
  }

  // Drawdown Hedging Contract Handler
  const handleDrawdown = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!drawdownTarget) return

    try {
      setActionLoading(true)
      const res = await multiCurrencyEscalationService.drawdownHedgingContract(
        drawdownTarget.uuid,
        { amount_foreign: drawdownAmount }
      )
      setFeedback({
        type: 'success',
        text: `Drawdown of ${res.drawn_foreign} ${drawdownTarget.base_currency} executed! Credited ${Number(res.drawn_local).toLocaleString()} UGX to client milestone pool.`,
      })
      setShowDrawdownModal(false)
      fetchData()
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.message || err.message || 'Drawdown failed' })
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="fx-escalation-console">
      {/* Alert Banner */}
      {feedback && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontWeight: 600,
            background: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: feedback.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${feedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          }}
        >
          {feedback.type === 'success' ? <MdCheckCircle size={22} /> : <MdWarning size={22} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Spot FX Rates Ticker Bar */}
      <div className="fx-ticker-bar">
        <div className="fx-ticker-items">
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
            LIVE SPOT BENCHMARK (BOU):
          </div>
          <div className="fx-rate-pill usd">
            <span>$ USD:</span> {Number(rates.usd_ugx || 3745).toLocaleString()} UGX
          </div>
          <div className="fx-rate-pill gbp">
            <span>£ GBP:</span> {Number(rates.gbp_ugx || 4880).toLocaleString()} UGX
          </div>
          <div className="fx-rate-pill eur">
            <span>€ EUR:</span> {Number(rates.eur_ugx || 4075).toLocaleString()} UGX
          </div>
          <div className="fx-rate-pill kes">
            <span>KSh KES:</span> {Number(rates.kes_ugx || 29.1).toFixed(2)} UGX
          </div>
        </div>

        <button className="fx-btn fx-btn-secondary" onClick={fetchData} disabled={loading}>
          <MdRefresh size={16} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards Banner */}
      <div className="fx-kpi-grid">
        <div className="fx-kpi-card">
          <div className="fx-kpi-icon hedge">
            <MdAttachMoney />
          </div>
          <div>
            <div className="fx-kpi-title">Diaspora Forward Rate Locks</div>
            <div className="fx-kpi-value">
              ${stats ? Number(stats.hedging_metrics.total_committed_usd).toLocaleString() : '0'}{' '}
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>USD</span>
            </div>
            <div className="fx-kpi-sub">
              Guaranteed {stats ? Number(stats.hedging_metrics.total_guaranteed_ugx).toLocaleString() : '0'} UGX
            </div>
          </div>
        </div>

        <div className="fx-kpi-card">
          <div className="fx-kpi-icon index">
            <MdTrendingUp />
          </div>
          <div>
            <div className="fx-kpi-title">Construction Input Price Index (CIPI)</div>
            <div className="fx-kpi-value">
              {selectedIndex ? Number(selectedIndex.current_index_value).toFixed(2) : '100.00'}
              <span
                style={{
                  fontSize: '14px',
                  marginLeft: '8px',
                  fontWeight: 600,
                  color: (selectedIndex?.escalation_percentage || 0) > 0 ? '#dc2626' : '#15803d',
                }}
              >
                ({(selectedIndex?.escalation_percentage || 0) > 0 ? '+' : ''}
                {selectedIndex?.escalation_percentage || 0}%)
              </span>
            </div>
            <div className="fx-kpi-sub">Baseline: 100.00 (2026-Q1 Basket)</div>
          </div>
        </div>

        <div className="fx-kpi-card">
          <div
            className={`fx-kpi-icon ${
              selectedIndex?.is_tolerance_exceeded ? 'alert' : 'safe'
            }`}
          >
            {selectedIndex?.is_tolerance_exceeded ? <MdWarning /> : <MdCheckCircle />}
          </div>
          <div>
            <div className="fx-kpi-title">FIDIC Clause 70 Escalation Status</div>
            <div
              className="fx-kpi-value"
              style={{
                fontSize: '17px',
                color: selectedIndex?.is_tolerance_exceeded ? '#dc2626' : '#15803d',
              }}
            >
              {selectedIndex?.is_tolerance_exceeded
                ? 'Tolerance Exceeded (Buffer Required)'
                : 'Within Contingency Threshold'}
            </div>
            <div className="fx-kpi-sub">
              Threshold limit: ±{selectedIndex?.tolerance_threshold_percentage || 5.0}%
            </div>
          </div>
        </div>
      </div>

      {/* Subtab Navigation */}
      <div className="fx-subtabs">
        <button
          className={`fx-subtab-btn ${activeSubtab === 'escalation' ? 'active' : ''}`}
          onClick={() => setActiveSubtab('escalation')}
        >
          Material Price Index & BOQ Variation
        </button>
        <button
          className={`fx-subtab-btn ${activeSubtab === 'hedging' ? 'active' : ''}`}
          onClick={() => setActiveSubtab('hedging')}
        >
          Diaspora FX Forward Locks ({hedgingContracts.length})
        </button>
        <button
          className={`fx-subtab-btn ${activeSubtab === 'converter' ? 'active' : ''}`}
          onClick={() => setActiveSubtab('converter')}
        >
          Multi-Currency Converter
        </button>
      </div>

      {/* SUBTAB 1: Material Price Index & BOQ Variation */}
      {activeSubtab === 'escalation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Material Basket Table */}
          <div className="fx-table-wrapper">
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {indices.length > 1 && (
                  <select
                    className="fx-input"
                    style={{ padding: '6px 10px', fontSize: '13px', width: 'auto' }}
                    value={selectedIndex?.id || ''}
                    onChange={(e) => {
                      const found = indices.find((idx) => idx.id === Number(e.target.value))
                      if (found) setSelectedIndex(found)
                    }}
                  >
                    {indices.map((idx) => (
                      <option key={idx.id} value={idx.id}>
                        {idx.name} ({idx.index_code})
                      </option>
                    ))}
                  </select>
                )}
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                    {selectedIndex?.name || 'Uganda Construction Input Price Index (CIPI)'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Tracking key building commodities in the Kampala & Wakiso construction corridor
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '13px', fontWeight: 600 }}>
                Index: <strong>{Number(selectedIndex?.current_index_value).toFixed(2)}</strong> (
                <span
                  style={{
                    color: (selectedIndex?.escalation_percentage || 0) > 0 ? '#dc2626' : '#15803d',
                  }}
                >
                  {(selectedIndex?.escalation_percentage || 0) > 0 ? '+' : ''}
                  {selectedIndex?.escalation_percentage}%
                </span>
                )
              </div>
            </div>

            <table className="fx-table">
              <thead>
                <tr>
                  <th>Commodity Code</th>
                  <th>Material Item</th>
                  <th>Unit</th>
                  <th>Basket Weight</th>
                  <th>Base Price (UGX)</th>
                  <th>Market Spot Price (UGX)</th>
                  <th>Variance %</th>
                  <th>Survey Source</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {selectedIndex?.price_records?.map((record) => (
                  <tr key={record.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {record.item_code}
                    </td>
                    <td style={{ fontWeight: 600 }}>{record.item_name}</td>
                    <td>{record.unit_of_measure}</td>
                    <td style={{ fontWeight: 600 }}>{record.basket_weight_percentage}%</td>
                    <td>{Number(record.base_unit_price).toLocaleString()}</td>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>
                      {Number(record.current_unit_price).toLocaleString()}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background:
                            Number(record.price_variance_percentage) > 0 ? '#fee2e2' : '#ecfdf5',
                          color:
                            Number(record.price_variance_percentage) > 0 ? '#b91c1c' : '#15803d',
                        }}
                      >
                        {Number(record.price_variance_percentage) > 0 ? '+' : ''}
                        {record.price_variance_percentage}%
                      </span>
                    </td>
                    <td style={{ fontSize: '11px', color: '#64748b' }}>
                      {record.survey_source || 'Market Spot Survey'}
                    </td>
                    <td>
                      <button
                        className="fx-btn fx-btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => {
                          setSelectedRecord(record)
                          setNewSpotPrice(Number(record.current_unit_price))
                          setSurveySource(record.survey_source || '')
                          setShowPriceModal(true)
                        }}
                      >
                        <MdEdit size={12} />
                        Update Spot
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Interactive BOQ Escalation Calculator */}
          <div className="fx-calc-card">
            <div className="fx-calc-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MdCalculate size={20} color="#2563eb" />
                <span>FIDIC Clause 70 / BOQ Price Variation Calculator</span>
              </div>
            </div>

            <form onSubmit={handleCalculateBoq}>
              <div className="fx-calc-row">
                <div className="fx-calc-field">
                  <label>Initial Contract BOQ Sum (UGX)</label>
                  <input
                    type="number"
                    min="1000000"
                    step="500000"
                    required
                    value={boqAmount}
                    onChange={(e) => setBoqAmount(Number(e.target.value))}
                  />
                </div>

                <button
                  type="submit"
                  className="fx-btn fx-btn-primary"
                  disabled={actionLoading}
                >
                  Compute Variation
                </button>
              </div>
            </form>

            {boqResult && (
              <div className="fx-calc-result-box">
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    ADJUSTED CONTRACT SUM
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                    {Number(boqResult.adjusted_contract_sum).toLocaleString()} UGX
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>ESCALATION VARIANCE</div>
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: boqResult.price_adjustment_amount > 0 ? '#dc2626' : '#15803d',
                    }}
                  >
                    {boqResult.price_adjustment_amount > 0 ? '+' : ''}
                    {Number(boqResult.price_adjustment_amount).toLocaleString()} UGX (
                    {boqResult.escalation_percentage}%)
                  </div>
                </div>

                <div style={{ width: '100%', fontSize: '12px', color: '#475569', marginTop: '6px' }}>
                  <strong>Advisory Note:</strong> {boqResult.advisory_notes}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: Diaspora FX Forward Locks */}
      {activeSubtab === 'hedging' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="fx-btn fx-btn-primary"
              onClick={() => setShowHedgeModal(true)}
            >
              <MdAdd size={16} />
              <span>Lock Forward FX Rate</span>
            </button>
          </div>

          <div className="fx-table-wrapper">
            <table className="fx-table">
              <thead>
                <tr>
                  <th>Contract Number</th>
                  <th>Client</th>
                  <th>Currency</th>
                  <th>Locked Rate</th>
                  <th>Committed Foreign</th>
                  <th>Guaranteed UGX</th>
                  <th>Utilized %</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {hedgingContracts.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                      No active forward hedging contracts found.
                    </td>
                  </tr>
                ) : (
                  hedgingContracts.map((hedge) => (
                    <tr key={hedge.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {hedge.contract_number}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {hedge.client
                            ? `${hedge.client.first_name} ${hedge.client.last_name}`
                            : 'Diaspora Client'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {hedge.client?.phone_number || hedge.client?.email}
                        </div>
                      </td>
                      <td style={{ fontWeight: 700 }}>{hedge.base_currency}</td>
                      <td style={{ fontWeight: 600 }}>
                        {Number(hedge.locked_exchange_rate).toLocaleString()} UGX
                      </td>
                      <td>
                        {hedge.base_currency === 'USD' ? '$' : '£'}
                        {Number(hedge.committed_amount_foreign).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>
                        {Number(hedge.guaranteed_amount_local).toLocaleString()} UGX
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{hedge.utilization_percentage}%</div>
                        <div
                          style={{
                            width: '80px',
                            height: '6px',
                            background: '#f1f5f9',
                            borderRadius: '3px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${hedge.utilization_percentage}%`,
                              height: '100%',
                              background: '#2563eb',
                            }}
                          />
                        </div>
                      </td>
                      <td style={{ fontSize: '12px', color: '#64748b' }}>
                        {new Date(hedge.expiry_date).toLocaleDateString()}
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: hedge.status === 'active' ? '#ecfdf5' : '#f1f5f9',
                            color: hedge.status === 'active' ? '#15803d' : '#64748b',
                          }}
                        >
                          {hedge.status}
                        </span>
                      </td>
                      <td>
                        {hedge.status === 'active' && (
                          <button
                            className="fx-btn fx-btn-primary"
                            style={{ padding: '4px 10px', fontSize: '11px' }}
                            onClick={() => {
                              setDrawdownTarget(hedge)
                              setDrawdownAmount(Math.min(5000, Number(hedge.remaining_foreign_amount)))
                              setShowDrawdownModal(true)
                            }}
                          >
                            <MdSend size={12} />
                            Drawdown
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: Multi-Currency Converter */}
      {activeSubtab === 'converter' && (
        <div className="fx-calc-card">
          <div className="fx-calc-header">
            <span>Instant Currency Converter</span>
          </div>

          <form onSubmit={handleConvert}>
            <div className="fx-calc-row">
              <div className="fx-calc-field">
                <label>Amount</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(Number(e.target.value))}
                />
              </div>

              <div className="fx-calc-field">
                <label>From Currency</label>
                <select value={fromCurr} onChange={(e) => setFromCurr(e.target.value)}>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="KES">KES (KSh)</option>
                  <option value="UGX">UGX (USh)</option>
                </select>
              </div>

              <div className="fx-calc-field">
                <label>To Currency</label>
                <select value={toCurr} onChange={(e) => setToCurr(e.target.value)}>
                  <option value="UGX">UGX (USh)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="KES">KES (KSh)</option>
                </select>
              </div>

              <button type="submit" className="fx-btn fx-btn-primary" disabled={actionLoading}>
                Convert Now
              </button>
            </div>
          </form>

          {convResult && (
            <div className="fx-calc-result-box" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#1e40af' }}>CONVERTED AMOUNT</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#1e3a8a' }}>
                  {Number(convResult.converted_amount).toLocaleString()} {convResult.to_currency}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#1e40af' }}>EFFECTIVE EXCHANGE RATE</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#1e3a8a' }}>
                  1 {convResult.from_currency} = {Number(convResult.exchange_rate).toLocaleString()}{' '}
                  {convResult.to_currency}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Update Material Spot Price */}
      {showPriceModal && selectedRecord && (
        <div className="fx-modal-overlay" onClick={() => setShowPriceModal(false)}>
          <div className="fx-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="fx-modal-header">
              <h3>Update Spot Price — {selectedRecord.item_name}</h3>
              <button
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}
                onClick={() => setShowPriceModal(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSavePrice}>
              <div className="fx-modal-body">
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>BASELINE CONTRACT PRICE</div>
                  <div style={{ fontSize: '16px', fontWeight: 700 }}>
                    {Number(selectedRecord.base_unit_price).toLocaleString()} UGX / {selectedRecord.unit_of_measure}
                  </div>
                </div>

                <div className="fx-calc-field">
                  <label>Current Market Spot Price (UGX) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newSpotPrice}
                    onChange={(e) => setNewSpotPrice(Number(e.target.value))}
                  />
                </div>

                <div className="fx-calc-field">
                  <label>Survey Source / Supplier Depot</label>
                  <input
                    type="text"
                    placeholder="e.g. Roofings Rolling Mills / Nalukolongo Hardware Survey"
                    value={surveySource}
                    onChange={(e) => setSurveySource(e.target.value)}
                  />
                </div>
              </div>
              <div className="fx-modal-footer">
                <button
                  type="button"
                  className="fx-btn fx-btn-secondary"
                  onClick={() => setShowPriceModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="fx-btn fx-btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Update & Recompute Index'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create Forward Hedging Lock */}
      {showHedgeModal && (
        <div className="fx-modal-overlay" onClick={() => setShowHedgeModal(false)}>
          <div className="fx-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="fx-modal-header">
              <h3>Create Diaspora Forward FX Rate Lock</h3>
              <button
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}
                onClick={() => setShowHedgeModal(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateHedge}>
              <div className="fx-modal-body">
                <div className="fx-calc-field">
                  <label>Foreign Currency *</label>
                  <select
                    value={hedgeForm.base_currency}
                    onChange={(e) =>
                      setHedgeForm((prev) => ({
                        ...prev,
                        base_currency: e.target.value,
                        locked_exchange_rate:
                          e.target.value === 'USD'
                            ? 3750
                            : e.target.value === 'GBP'
                            ? 4880
                            : 4075,
                      }))
                    }
                  >
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>

                <div className="fx-calc-field">
                  <label>Committed Foreign Amount *</label>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    required
                    value={hedgeForm.committed_amount_foreign}
                    onChange={(e) =>
                      setHedgeForm((prev) => ({
                        ...prev,
                        committed_amount_foreign: Number(e.target.value),
                      }))
                    }
                  />
                </div>

                <div className="fx-calc-field">
                  <label>Guaranteed Forward Exchange Rate (UGX) *</label>
                  <input
                    type="number"
                    min="100"
                    step="5"
                    required
                    value={hedgeForm.locked_exchange_rate || 3750}
                    onChange={(e) =>
                      setHedgeForm((prev) => ({
                        ...prev,
                        locked_exchange_rate: Number(e.target.value),
                      }))
                    }
                  />
                </div>

                <div className="fx-calc-field">
                  <label>Lock Duration (Days)</label>
                  <select
                    value={hedgeForm.lock_duration_days}
                    onChange={(e) =>
                      setHedgeForm((prev) => ({
                        ...prev,
                        lock_duration_days: Number(e.target.value),
                      }))
                    }
                  >
                    <option value={90}>90 Days (3 Months)</option>
                    <option value={120}>120 Days (4 Months)</option>
                    <option value={180}>180 Days (6 Months)</option>
                    <option value={365}>365 Days (1 Year)</option>
                  </select>
                </div>

                <div className="fx-calc-result-box">
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      TOTAL GUARANTEED LOCAL SUM
                    </div>
                    <div style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                      {Number(
                        hedgeForm.committed_amount_foreign * (hedgeForm.locked_exchange_rate || 3750)
                      ).toLocaleString()}{' '}
                      UGX
                    </div>
                  </div>
                </div>
              </div>
              <div className="fx-modal-footer">
                <button
                  type="button"
                  className="fx-btn fx-btn-secondary"
                  onClick={() => setShowHedgeModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="fx-btn fx-btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Creating...' : 'Lock Guaranteed Rate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Drawdown Hedging Funds */}
      {showDrawdownModal && drawdownTarget && (
        <div className="fx-modal-overlay" onClick={() => setShowDrawdownModal(false)}>
          <div className="fx-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="fx-modal-header">
              <h3>Drawdown Funds — {drawdownTarget.contract_number}</h3>
              <button
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}
                onClick={() => setShowDrawdownModal(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleDrawdown}>
              <div className="fx-modal-body">
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>AVAILABLE COMMITTED FUNDS</div>
                  <div style={{ fontSize: '16px', fontWeight: 700 }}>
                    {drawdownTarget.base_currency === 'USD' ? '$' : '£'}
                    {Number(drawdownTarget.remaining_foreign_amount).toLocaleString()}{' '}
                    {drawdownTarget.base_currency} @{' '}
                    {Number(drawdownTarget.locked_exchange_rate).toLocaleString()} UGX
                  </div>
                </div>

                <div className="fx-calc-field">
                  <label>Drawdown Foreign Amount *</label>
                  <input
                    type="number"
                    min="100"
                    max={Number(drawdownTarget.remaining_foreign_amount)}
                    step="100"
                    required
                    value={drawdownAmount}
                    onChange={(e) => setDrawdownAmount(Number(e.target.value))}
                  />
                </div>

                <div className="fx-calc-result-box" style={{ background: '#ecfdf5', borderColor: '#a7f3d0' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#065f46' }}>
                      LOCAL FUNDS CREDITED TO POOL
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#065f46' }}>
                      {Number(
                        drawdownAmount * Number(drawdownTarget.locked_exchange_rate)
                      ).toLocaleString()}{' '}
                      UGX
                    </div>
                  </div>
                </div>
              </div>
              <div className="fx-modal-footer">
                <button
                  type="button"
                  className="fx-btn fx-btn-secondary"
                  onClick={() => setShowDrawdownModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="fx-btn fx-btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Executing...' : 'Confirm Drawdown'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default MultiCurrencyEscalationTab
