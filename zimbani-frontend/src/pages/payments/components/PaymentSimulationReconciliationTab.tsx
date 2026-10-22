import React, { useState, useEffect, useCallback } from 'react'
import {
  MdPlayArrow,
  MdRefresh,
  MdCheckCircle,
  MdError,
  MdAccountBalance,
  MdCreditCard,
  MdPhoneAndroid,
  MdShield,
  MdCompareArrows,
  MdClose,
  MdLink,
  MdLayers,
  MdHistory,
  MdFactCheck,
} from 'react-icons/md'
import paymentIntegrationService from '../../../services/payment-integration.service'
import {
  PaymentSimulation,
  BankStatementEntry,
  BankReconciliationBatch,
} from '../../../types/payment-integration.types'
import './PaymentSimulationReconciliationTab.css'

interface ScenarioDefinition {
  name: string
  title: string
  channel: 'card' | 'mobile_money' | 'bank_transfer'
  gateway: string
  description: string
}

const SCENARIOS: ScenarioDefinition[] = [
  {
    name: 'flutterwave_card_3ds_success',
    title: 'Flutterwave Card 3DS & Webhook Settlement',
    channel: 'card',
    gateway: 'flutterwave',
    description: 'Generates 3DS payment intent, simulates customer card authentication, verifies HMAC-SHA256 signature, and posts double-entry transaction.',
  },
  {
    name: 'momo_stk_pin_success',
    title: 'Direct MTN MoMo STK Push & Auto-Posting',
    channel: 'mobile_money',
    gateway: 'direct_mobile_money',
    description: 'Dispatches USSD push to subscriber MSISDN, verifies PIN validation callback, and updates escrow transaction status.',
  },
  {
    name: 'replay_attack_shield',
    title: 'Cryptographic Replay Attack Shield',
    channel: 'card',
    gateway: 'pesapal',
    description: 'Ingests a valid webhook, then replays identical cryptographic payload to verify duplicate rejection and idempotency protection.',
  },
  {
    name: 'stanbic_bank_eft',
    title: 'Stanbic Bank EFT Wire Transfer Clearing',
    channel: 'bank_transfer',
    gateway: 'bank_transfer',
    description: 'Creates EFT remittance instructions with Stanbic reference and simulates automated bank confirmation webhook.',
  },
  {
    name: 'chargeback_evidence_won',
    title: 'Chargeback Dispute Lifecycle & Evidence Won',
    channel: 'card',
    gateway: 'flutterwave',
    description: 'Opens Visa/Mastercard dispute against settled payment, compiles digital evidence dossier, reviews case, and registers favorable resolution.',
  },
  {
    name: 'automated_refund_reversal',
    title: 'Over-Refund Protection & Reversal Ledger',
    channel: 'mobile_money',
    gateway: 'direct_mobile_money',
    description: 'Validates refund ceiling against payment principal, executes partial refund with finance approval, and posts negative debit reversal.',
  },
]

export const PaymentSimulationReconciliationTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'simulation' | 'reconciliation'>('simulation')
  const [loading, setLoading] = useState<boolean>(false)
  const [runningScenario, setRunningScenario] = useState<string | null>(null)
  const [runningAll, setRunningAll] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Simulation State
  const [simulations, setSimulations] = useState<PaymentSimulation[]>([])
  const [selectedSimulation, setSelectedSimulation] = useState<PaymentSimulation | null>(null)

  // Reconciliation State
  const [batches, setBatches] = useState<BankReconciliationBatch[]>([])
  const [activeBatch, setActiveBatch] = useState<BankReconciliationBatch | null>(null)
  const [reconcilingBatch, setReconcilingBatch] = useState<boolean>(false)

  // Manual Match Modal State
  const [matchingEntry, setMatchingEntry] = useState<BankStatementEntry | null>(null)
  const [manualPaymentId, setManualPaymentId] = useState<string>('')
  const [manualNotes, setManualNotes] = useState<string>('')
  const [manualLoading, setManualLoading] = useState<boolean>(false)

  // Load Simulations History
  const loadSimulations = useCallback(async () => {
    try {
      const data = await paymentIntegrationService.getSimulationHistory()
      setSimulations(data || [])
    } catch (err: any) {
      console.error('Failed to load simulations history:', err)
    }
  }, [])

  // Load Reconciliation Batches
  const loadReconciliation = useCallback(async () => {
    try {
      const data = await paymentIntegrationService.getReconciliationBatches()
      setBatches(data || [])
      if (data && data.length > 0) {
        // If no active batch or active batch not in list, select first
        setActiveBatch((prev) => {
          if (!prev) return data[0]
          const found = data.find((b) => b.id === prev.id)
          return found || data[0]
        })
      }
    } catch (err: any) {
      console.error('Failed to load reconciliation batches:', err)
    }
  }, [])

  // Initial Load
  useEffect(() => {
    setLoading(true)
    Promise.all([loadSimulations(), loadReconciliation()]).finally(() => setLoading(false))
  }, [loadSimulations, loadReconciliation])

  // Clear feedback after 6s
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 6000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  // Run single simulation
  const handleRunScenario = async (scenarioName: string) => {
    try {
      setRunningScenario(scenarioName)
      const res = await paymentIntegrationService.runSimulation(scenarioName)
      setFeedback({
        type: 'success',
        text: `Scenario "${scenarioName}" passed (${res.execution_duration_ms}ms, ${res.passed_assertions_count}/${res.assertions_count} assertions verified)!`,
      })
      await loadSimulations()
      setSelectedSimulation(res)
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Simulation scenario failed',
      })
    } finally {
      setRunningScenario(null)
    }
  }

  // Run all simulations
  const handleRunAll = async () => {
    try {
      setRunningAll(true)
      const results = await paymentIntegrationService.runAllSimulations()
      const passed = results.filter((r) => r.status === 'passed').length
      setFeedback({
        type: 'success',
        text: `Test Harness completed: ${passed}/${results.length} scenarios passed!`,
      })
      await loadSimulations()
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Test harness batch execution failed',
      })
    } finally {
      setRunningAll(false)
    }
  }

  // Seed demo Stanbic bank statement
  const handleSeedDemoBatch = async () => {
    try {
      setLoading(true)
      const newBatch = await paymentIntegrationService.seedDemoReconciliationBatch()
      setFeedback({
        type: 'success',
        text: `Stanbic Bank statement batch #${newBatch.batch_number} seeded with ${newBatch.total_entries_count} entries!`,
      })
      await loadReconciliation()
      setActiveBatch(newBatch)
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to seed demo batch',
      })
    } finally {
      setLoading(false)
    }
  }

  // Auto-reconcile active batch
  const handleAutoReconcile = async () => {
    if (!activeBatch) return
    try {
      setReconcilingBatch(true)
      const updated = await paymentIntegrationService.autoReconcileBatch(activeBatch.id)
      setActiveBatch(updated)
      setFeedback({
        type: 'success',
        text: `Reconciliation engine finished: ${updated.matched_entries_count}/${updated.total_entries_count} entries matched!`,
      })
      await loadReconciliation()
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Automated reconciliation failed',
      })
    } finally {
      setReconcilingBatch(false)
    }
  }

  // Submit Manual Match
  const handleManualMatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!matchingEntry || !manualPaymentId) return
    try {
      setManualLoading(true)
      await paymentIntegrationService.manualMatchEntry(
        matchingEntry.id,
        parseInt(manualPaymentId, 10),
        manualNotes
      )
      setFeedback({
        type: 'success',
        text: `Entry ${matchingEntry.entry_reference} manually matched to Payment #${manualPaymentId}!`,
      })
      setMatchingEntry(null)
      setManualPaymentId('')
      setManualNotes('')
      if (activeBatch) {
        const refreshed = await paymentIntegrationService.getReconciliationBatch(activeBatch.id)
        setActiveBatch(refreshed)
      }
      await loadReconciliation()
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Manual match failed',
      })
    } finally {
      setManualLoading(false)
    }
  }

  // Format UGX
  const formatUGX = (val?: number | null) => {
    if (val === undefined || val === null || isNaN(val)) return '0 UGX'
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(val)
  }

  // Channel Icon
  const getChannelIcon = (ch: string) => {
    switch (ch) {
      case 'card':
        return <MdCreditCard />
      case 'mobile_money':
        return <MdPhoneAndroid />
      case 'bank_transfer':
        return <MdAccountBalance />
      default:
        return <MdLayers />
    }
  }

  // Get most recent simulation result for a scenario
  const getLatestResult = (name: string) => {
    return simulations.find((s) => s.scenario_name === name)
  }

  return (
    <div className="psr-container">
      {/* Feedback Banner */}
      {feedback && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '13px',
            background: feedback.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: feedback.type === 'success' ? '#15803d' : '#b91c1c',
            border: `1px solid ${feedback.type === 'success' ? '#86efac' : '#fca5a5'}`,
          }}
        >
          {feedback.text}
        </div>
      )}

      {/* Internal Navigation Toggle */}
      <div className="psr-view-toggle">
        <button
          className={`psr-toggle-btn ${activeTab === 'simulation' ? 'active' : ''}`}
          onClick={() => setActiveTab('simulation')}
        >
          <MdFactCheck size={16} /> Sandbox Gateway Simulation Harness
        </button>
        <button
          className={`psr-toggle-btn ${activeTab === 'reconciliation' ? 'active' : ''}`}
          onClick={() => setActiveTab('reconciliation')}
        >
          <MdCompareArrows size={16} /> Bank Statement Staging & Automated Reconciliation
        </button>
      </div>

      {activeTab === 'simulation' ? (
        <>
          {/* Simulation Header */}
          <div className="psr-header-card">
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#0f172a' }}>
                End-to-End Payment Simulation Engine
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                Run automated end-to-end sandbox simulations with cryptographic webhook verification, 3DS challenges, and double-entry ledger audits.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn-secondary"
                onClick={loadSimulations}
                disabled={loading || runningAll}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <MdRefresh className={loading ? 'psr-spin' : ''} /> Refresh Runs
              </button>
              <button
                className="btn-primary"
                onClick={handleRunAll}
                disabled={runningAll || !!runningScenario}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <MdPlayArrow className={runningAll ? 'psr-spin' : ''} />
                {runningAll ? 'Running Test Harness...' : 'Run All Scenarios (Test Harness)'}
              </button>
            </div>
          </div>

          {/* Simulation KPIs */}
          <div className="psr-kpi-grid">
            <div className="psr-kpi-card">
              <div className="psr-kpi-title">Total Simulation Runs</div>
              <div className="psr-kpi-val">{simulations.length}</div>
              <div className="psr-kpi-subtext">Recorded in audit database</div>
            </div>
            <div className="psr-kpi-card">
              <div className="psr-kpi-title">Passed Assertions</div>
              <div className="psr-kpi-val" style={{ color: '#16a34a' }}>
                {simulations.filter((s) => s.status === 'passed').length} / {simulations.length}
              </div>
              <div className="psr-kpi-subtext">
                {simulations.length > 0
                  ? `${Math.round(
                      (simulations.filter((s) => s.status === 'passed').length /
                        simulations.length) *
                        100
                    )}% pass rate`
                  : 'No runs recorded'}
              </div>
            </div>
            <div className="psr-kpi-card">
              <div className="psr-kpi-title">Avg Execution Latency</div>
              <div className="psr-kpi-val" style={{ color: '#0284c7' }}>
                {simulations.length > 0
                  ? `${Math.round(
                      simulations.reduce((acc, s) => acc + s.execution_duration_ms, 0) /
                        simulations.length
                    )} ms`
                  : '0 ms'}
              </div>
              <div className="psr-kpi-subtext">End-to-end assertion loop</div>
            </div>
            <div className="psr-kpi-card">
              <div className="psr-kpi-title">Active Gateway Protocols</div>
              <div className="psr-kpi-val" style={{ color: '#9333ea' }}>4 Channels</div>
              <div className="psr-kpi-subtext">Cards, MTN, Airtel, Stanbic EFT</div>
            </div>
          </div>

          {/* Scenarios Grid */}
          <div className="psr-scenario-grid">
            {SCENARIOS.map((sc) => {
              const latest = getLatestResult(sc.name)
              const isRunning = runningScenario === sc.name
              return (
                <div key={sc.name} className="psr-scenario-card">
                  <div>
                    <div className="psr-scenario-top">
                      <span className="psr-scenario-title">{sc.title}</span>
                      <span style={{ fontSize: '20px', color: '#0284c7' }}>
                        {getChannelIcon(sc.channel)}
                      </span>
                    </div>
                    <p className="psr-scenario-desc">{sc.description}</p>
                    <div className="psr-scenario-badges">
                      <span className="psr-badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                        {sc.channel.replace('_', ' ')}
                      </span>
                      <span className="psr-badge" style={{ background: '#f1f5f9', color: '#475569' }}>
                        {sc.gateway}
                      </span>
                      {latest && (
                        <span className={`psr-badge psr-badge-${latest.status}`}>
                          {latest.status === 'passed' ? <MdCheckCircle /> : <MdError />}
                          {latest.status.toUpperCase()} ({latest.execution_duration_ms}ms)
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button
                      className="btn-secondary"
                      onClick={() => handleRunScenario(sc.name)}
                      disabled={isRunning || runningAll}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        padding: '8px 12px',
                      }}
                    >
                      <MdPlayArrow className={isRunning ? 'psr-spin' : ''} />
                      {isRunning ? 'Simulating...' : 'Run Scenario'}
                    </button>
                    {latest && (
                      <button
                        className="btn-secondary"
                        onClick={() => setSelectedSimulation(latest)}
                        style={{
                          fontSize: '12px',
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <MdHistory /> Logs
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Recent Simulation Runs Table */}
          <div className="psr-table-container">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>
                Recent Sandbox Simulation Runs
              </h4>
            </div>
            <table className="psr-table">
              <thead>
                <tr>
                  <th>Run Reference</th>
                  <th>Scenario Name</th>
                  <th>Channel & Gateway</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Assertions</th>
                  <th>Latency</th>
                  <th>Executed At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {simulations.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                      No simulation runs found. Click "Run All Scenarios" or trigger an individual scenario above.
                    </td>
                  </tr>
                ) : (
                  simulations.map((sim) => (
                    <tr key={sim.id}>
                      <td>
                        <strong style={{ fontFamily: 'monospace', color: '#0284c7' }}>
                          {sim.simulation_run_id}
                        </strong>
                      </td>
                      <td style={{ fontWeight: 600 }}>{sim.scenario_name}</td>
                      <td>
                        <span className="psr-badge" style={{ background: '#f1f5f9', color: '#334155' }}>
                          {sim.channel} • {sim.gateway_name}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{formatUGX(sim.amount)}</td>
                      <td>
                        <span className={`psr-badge psr-badge-${sim.status}`}>
                          {sim.status === 'passed' ? <MdCheckCircle /> : <MdError />}
                          {sim.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: sim.passed_assertions_count === sim.assertions_count ? '#16a34a' : '#dc2626' }}>
                          {sim.passed_assertions_count} / {sim.assertions_count} passed
                        </span>
                      </td>
                      <td>{sim.execution_duration_ms} ms</td>
                      <td style={{ color: '#64748b' }}>
                        {new Date(sim.created_at).toLocaleString()}
                      </td>
                      <td>
                        <button
                          className="btn-secondary"
                          onClick={() => setSelectedSimulation(sim)}
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                        >
                          View Steps
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          {/* Reconciliation Staging Header */}
          <div className="psr-header-card">
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#0f172a' }}>
                Bank Statement Ingestion & Reconciliation Staging
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                Automated multi-stage rule engine reconciling commercial bank statements against payment intents, merchant settlements, and ledger transactions.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn-secondary"
                onClick={loadReconciliation}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <MdRefresh className={loading ? 'psr-spin' : ''} /> Refresh
              </button>
              <button
                className="btn-secondary"
                onClick={handleSeedDemoBatch}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <MdShield /> Seed Stanbic Demo Statement
              </button>
              {activeBatch && (
                <button
                  className="btn-primary"
                  onClick={handleAutoReconcile}
                  disabled={reconcilingBatch}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <MdFactCheck className={reconcilingBatch ? 'psr-spin' : ''} />
                  {reconcilingBatch ? 'Reconciling...' : 'Auto-Reconcile Batch (Rule Engine)'}
                </button>
              )}
            </div>
          </div>

          {/* Active Batch Summary Card */}
          {activeBatch ? (
            <div className="psr-header-card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                      Batch #{activeBatch.batch_number}
                    </span>
                    <span className={`psr-badge psr-badge-${activeBatch.status}`}>
                      {activeBatch.status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                    <strong>{activeBatch.bank_name}</strong> • Account: {activeBatch.account_number} • Currency: {activeBatch.currency}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                    Period: {activeBatch.statement_period_start} to {activeBatch.statement_period_end}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', textAlign: 'right' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Opening Balance</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>
                      {formatUGX(activeBatch.opening_balance)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Closing Balance</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                      {formatUGX(activeBatch.closing_balance)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Total Credits</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#16a34a' }}>
                      +{formatUGX(activeBatch.total_credits)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Total Debits</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#dc2626' }}>
                      -{formatUGX(activeBatch.total_debits)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Match Progress Bar */}
              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                  <span style={{ color: '#475569' }}>
                    Reconciliation Progress ({activeBatch.matched_entries_count} of {activeBatch.total_entries_count} entries matched)
                  </span>
                  <span style={{ color: '#059669' }}>
                    {activeBatch.total_entries_count > 0
                      ? `${Math.round((activeBatch.matched_entries_count / activeBatch.total_entries_count) * 100)}%`
                      : '0%'}
                  </span>
                </div>
                <div className="psr-progress-bar-bg">
                  <div
                    className="psr-progress-bar-fill"
                    style={{
                      width: `${
                        activeBatch.total_entries_count > 0
                          ? (activeBatch.matched_entries_count / activeBatch.total_entries_count) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="psr-header-card" style={{ justifyContent: 'center', padding: '40px' }}>
              <div style={{ textAlign: 'center' }}>
                <MdAccountBalance size={36} style={{ color: '#94a3b8', marginBottom: '8px' }} />
                <h4 style={{ margin: '0 0 6px 0', color: '#1e293b' }}>No Bank Reconciliation Batches Found</h4>
                <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>
                  Click below to seed a realistic Stanbic Bank Uganda demo statement batch with 9 entries.
                </p>
                <button className="btn-primary" onClick={handleSeedDemoBatch}>
                  Seed Stanbic Bank Demo Statement
                </button>
              </div>
            </div>
          )}

          {/* Statement Entries Staging Table */}
          {activeBatch && (
            <div className="psr-table-container">
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>
                  Statement Entries ({activeBatch.entries?.length || 0} Records)
                </h4>
                {batches.length > 1 && (
                  <select
                    value={activeBatch.id}
                    onChange={(e) => {
                      const sel = batches.find((b) => b.id === parseInt(e.target.value, 10))
                      if (sel) setActiveBatch(sel)
                    }}
                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.batch_number} ({b.bank_name})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <table className="psr-table">
                <thead>
                  <tr>
                    <th>Value Date</th>
                    <th>Entry Ref</th>
                    <th>Narration</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Running Balance</th>
                    <th>Status</th>
                    <th>Match Confidence</th>
                    <th>Matched Payment</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {!activeBatch.entries || activeBatch.entries.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                        No entries found in this batch.
                      </td>
                    </tr>
                  ) : (
                    activeBatch.entries.map((entry) => (
                      <tr key={entry.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>{entry.value_date}</td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>
                            {entry.entry_reference}
                          </span>
                        </td>
                        <td style={{ maxWidth: '280px', wordBreak: 'break-word' }}>{entry.narration}</td>
                        <td>
                          <span
                            className="psr-badge"
                            style={{
                              background: entry.entry_type === 'credit' ? '#dcfce7' : '#fee2e2',
                              color: entry.entry_type === 'credit' ? '#15803d' : '#b91c1c',
                            }}
                          >
                            {entry.entry_type.toUpperCase()}
                          </span>
                        </td>
                        <td
                          style={{
                            fontWeight: 700,
                            color: entry.entry_type === 'credit' ? '#15803d' : '#b91c1c',
                          }}
                        >
                          {entry.entry_type === 'credit' ? '+' : '-'}
                          {formatUGX(entry.amount)}
                        </td>
                        <td style={{ fontFamily: 'monospace', color: '#64748b' }}>
                          {formatUGX(entry.running_balance)}
                        </td>
                        <td>
                          <span className={`psr-badge psr-badge-${entry.matching_status}`}>
                            {entry.matching_status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div
                              style={{
                                width: '40px',
                                height: '6px',
                                background: '#e2e8f0',
                                borderRadius: '3px',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${entry.match_confidence_score}%`,
                                  height: '100%',
                                  background:
                                    entry.match_confidence_score >= 90
                                      ? '#16a34a'
                                      : entry.match_confidence_score >= 70
                                      ? '#0284c7'
                                      : '#d97706',
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 600 }}>
                              {entry.match_confidence_score}%
                            </span>
                          </div>
                        </td>
                        <td>
                          {entry.matched_payment ? (
                            <div style={{ fontSize: '11px' }}>
                              <strong style={{ color: '#0284c7' }}>
                                {entry.matched_payment.payment_number}
                              </strong>
                              <div style={{ color: '#64748b' }}>
                                {entry.matching_rule ? entry.matching_rule.replace('_', ' ') : 'matched'}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>
                              None
                            </span>
                          )}
                        </td>
                        <td>
                          {entry.matching_status === 'unmatched' ? (
                            <button
                              className="btn-secondary"
                              onClick={() => {
                                setMatchingEntry(entry)
                                setManualPaymentId('')
                                setManualNotes('')
                              }}
                              style={{
                                padding: '4px 8px',
                                fontSize: '11px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <MdLink /> Match
                            </button>
                          ) : (
                            <span style={{ color: '#16a34a', fontSize: '11px', fontWeight: 600 }}>
                              Resolved
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Execution Detail Modal */}
      {selectedSimulation && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '650px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '17px', color: '#0f172a' }}>
                  Execution Telemetry: {selectedSimulation.scenario_name}
                </h3>
                <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>
                  Run ID: {selectedSimulation.simulation_run_id}
                </span>
              </div>
              <button
                onClick={() => setSelectedSimulation(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                <MdClose />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  marginBottom: '20px',
                  background: '#f8fafc',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Status:</span>
                  <div>
                    <span className={`psr-badge psr-badge-${selectedSimulation.status}`}>
                      {selectedSimulation.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Assertions:</span>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>
                    {selectedSimulation.passed_assertions_count} / {selectedSimulation.assertions_count}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Latency:</span>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>
                    {selectedSimulation.execution_duration_ms} ms
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Amount:</span>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>
                    {formatUGX(selectedSimulation.amount)}
                  </div>
                </div>
              </div>

              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#0f172a' }}>
                Step-by-Step Execution Trace
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedSimulation.steps_executed && selectedSimulation.steps_executed.length > 0 ? (
                  selectedSimulation.steps_executed.map((st, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 14px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        borderLeft: '4px solid #0284c7',
                        border: '1px solid #e2e8f0',
                        borderLeftWidth: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>
                          Step {idx + 1}: {st.step.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: 600 }}>
                          +{st.duration_ms}ms
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                        {st.detail}
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#94a3b8', fontSize: '12px' }}>No step logs recorded.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Match Modal */}
      {matchingEntry && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '17px', color: '#0f172a' }}>
                Manual Match: {matchingEntry.entry_reference}
              </h3>
              <button
                onClick={() => setMatchingEntry(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleManualMatchSubmit} style={{ padding: '24px' }}>
              <div style={{ marginBottom: '14px', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Narration:</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                  {matchingEntry.narration}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                  Amount: <strong>{formatUGX(matchingEntry.amount)}</strong> ({matchingEntry.entry_type})
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Payment Record ID <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 1, 2, 3"
                  value={manualPaymentId}
                  onChange={(e) => setManualPaymentId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Reconciliation Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Reason for manual clearing..."
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setMatchingEntry(null)}
                  disabled={manualLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={manualLoading || !manualPaymentId}
                >
                  {manualLoading ? 'Matching...' : 'Confirm Manual Match'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentSimulationReconciliationTab
