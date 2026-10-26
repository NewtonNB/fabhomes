import React, { useState, useEffect, useCallback } from 'react'
import {
  MdCheckCircle,
  MdHourglassEmpty,
  MdKey,
  MdSecurity,
  MdAccountBalance,
  MdDescription,
  MdVerified,
  MdRefresh,
  MdAssignmentTurnedIn,
  MdAttachMoney,
  MdTrendingUp,
} from 'react-icons/md'
import capstoneSettlementService from '../../../services/capstone-settlement.service'
import {
  ProjectHandover,
  ProjectFinalSettlement,
  CapstoneSummaryMetrics,
} from '../../../types/capstone-settlement.types'
import { ConfirmDialog } from '../../../components/common/ConfirmDialog'
import './ProjectHandoverSettlementTab.css'

export const ProjectHandoverSettlementTab: React.FC = () => {
  const [activeSubtab, setActiveSubtab] = useState<'dossier' | 'deed' | 'settlement'>('dossier')
  const [handovers, setHandovers] = useState<ProjectHandover[]>([])
  const [selectedHandover, setSelectedHandover] = useState<ProjectHandover | null>(null)
  const [settlement, setSettlement] = useState<ProjectFinalSettlement | null>(null)
  const [summary, setSummary] = useState<CapstoneSummaryMetrics | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Dossier Edit Form State
  const [dossierForm, setDossierForm] = useState({
    has_occupancy_permit: true,
    occupancy_permit_ref: 'KCCA/DPH/2026/0891',
    occupancy_permit_issued_at: new Date().toISOString().split('T')[0],
    has_as_built_drawings: true,
    as_built_drawings_ref: 'DWG-ASB-2026-ARC-001',
    has_mep_compliance_certs: true,
    mep_compliance_notes: 'Umeme Earthing: 1.2 Ohms (PASSED). Water Pressure: 6.5 Bar (PASSED).',
    has_warranty_manual: true,
    has_keys_inventory: true,
    key_sets_count: 4,
    project_director_signed: true,
  })

  // Signoff Form State
  const [signoffForm, setSignoffForm] = useState({
    client_signature_name: '',
    keys_received_by_name: '',
    key_sets_count: 4,
    dlp_period_days: 365,
    notes: 'Client verified all keys, fixtures, and finishes in pristine condition.',
  })

  // Load Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [handoversRes, summaryRes] = await Promise.all([
        capstoneSettlementService.getHandovers({ per_page: 20 }),
        capstoneSettlementService.getCapstoneSummary(),
      ])

      const list = handoversRes.data || []
      setHandovers(list)
      setSummary(summaryRes)

      if (list.length > 0) {
        const current = list[0]
        setSelectedHandover(current)

        // Prepopulate forms
        setDossierForm({
          has_occupancy_permit: current.has_occupancy_permit,
          occupancy_permit_ref: current.occupancy_permit_ref || 'KCCA/DPH/2026/0891',
          occupancy_permit_issued_at: current.occupancy_permit_issued_at || new Date().toISOString().split('T')[0],
          has_as_built_drawings: current.has_as_built_drawings,
          as_built_drawings_ref: current.as_built_drawings_ref || 'DWG-ASB-2026-ARC-001',
          has_mep_compliance_certs: current.has_mep_compliance_certs,
          mep_compliance_notes: current.mep_compliance_notes || 'Umeme Earthing & Water Pressure tested',
          has_warranty_manual: current.has_warranty_manual,
          has_keys_inventory: current.has_keys_inventory,
          key_sets_count: current.key_sets_count || 4,
          project_director_signed: !!current.project_director_signed_at,
        })

        setSignoffForm((prev) => ({
          ...prev,
          client_signature_name: current.client_signature_name || (current.client ? `${current.client.first_name} ${current.client.last_name}` : 'Diaspora Client'),
          keys_received_by_name: current.keys_received_by_name || (current.client ? `${current.client.first_name} ${current.client.last_name}` : 'Diaspora Client'),
        }))

        // Load or generate linked settlement
        const settlementRes = await capstoneSettlementService.generateAudit({
          project_id: current.project_id,
          unit_id: current.unit_id,
          handover_id: current.id,
        })
        setSettlement(settlementRes)
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.message || err.message || 'Failed to load capstone data' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Clear feedback after 6s
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 6000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  // Handle Dossier Update
  const handleSaveDossier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedHandover) return
    try {
      setActionLoading(true)
      const updated = await capstoneSettlementService.updateDossier(
        selectedHandover.id,
        dossierForm
      )
      setSelectedHandover(updated)
      setFeedback({ type: 'success', text: 'Handover dossier & municipal permits updated successfully!' })
      loadData()
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.message || err.message || 'Failed to update dossier' })
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Client Signoff & Key Release
  const handleExecuteSignoff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedHandover) return
    try {
      setActionLoading(true)
      const signed = await capstoneSettlementService.executeClientSignoff(
        selectedHandover.id,
        signoffForm
      )
      setSelectedHandover(signed)
      setFeedback({ type: 'success', text: 'Deed of Handover executed & 365-day DLP warranty activated!' })
      loadData()
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.message || err.message || 'Failed to execute signoff' })
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Finalize Settlement
  const handleFinalizeSettlement = () => {
    if (!settlement) return
    setShowFinalizeConfirm(true)
  }

  const confirmFinalizeSettlement = async () => {
    if (!settlement) return
    try {
      setActionLoading(true)
      const finalized = await capstoneSettlementService.finalizeSettlement(settlement.id, {
        notes: 'Chief Financial Officer & Quantity Surveyor final account balancing completed.',
      })
      setSettlement(finalized)
      setFeedback({ type: 'success', text: 'Financial settlement finalized & project marked completed!' })
      setShowFinalizeConfirm(false)
      loadData()
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.message || err.message || 'Failed to finalize settlement' })
    } finally {
      setActionLoading(false)
    }
  }

  const formatUGX = (val?: number | null) => {
    if (val === undefined || val === null || isNaN(val)) return '0 UGX'
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(val)
  }

  return (
    <div className="capstone-container">
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

      {/* Capstone Executive KPI Bar */}
      {summary && (
        <div className="capstone-kpi-grid">
          <div className="capstone-kpi-card">
            <div className="capstone-kpi-header">
              <span className="capstone-kpi-title">Handovers Completed</span>
              <span className="capstone-kpi-icon success"><MdAssignmentTurnedIn /></span>
            </div>
            <div className="capstone-kpi-val">{summary.total_handovers_completed}</div>
            <div className="capstone-kpi-subtext">Deeds executed & keys released</div>
          </div>

          <div className="capstone-kpi-card">
            <div className="capstone-kpi-header">
              <span className="capstone-kpi-title">Active DLP Warranties</span>
              <span className="capstone-kpi-icon primary"><MdSecurity /></span>
            </div>
            <div className="capstone-kpi-val">{summary.active_dlp_warranties}</div>
            <div className="capstone-kpi-subtext">365-day defect liability active</div>
          </div>

          <div className="capstone-kpi-card">
            <div className="capstone-kpi-header">
              <span className="capstone-kpi-title">Total Escrow Settled</span>
              <span className="capstone-kpi-icon purple"><MdAccountBalance /></span>
            </div>
            <div className="capstone-kpi-val">{formatUGX(summary.total_escrow_settled)}</div>
            <div className="capstone-kpi-subtext">Cumulative client escrow draws</div>
          </div>

          <div className="capstone-kpi-card">
            <div className="capstone-kpi-header">
              <span className="capstone-kpi-title">Retention Held (DLP)</span>
              <span className="capstone-kpi-icon warning"><MdHourglassEmpty /></span>
            </div>
            <div className="capstone-kpi-val">{formatUGX(summary.total_retention_held_dlp)}</div>
            <div className="capstone-kpi-subtext">50% warranty bond reserve</div>
          </div>

          <div className="capstone-kpi-card">
            <div className="capstone-kpi-header">
              <span className="capstone-kpi-title">Diaspora FX Savings</span>
              <span className="capstone-kpi-icon success"><MdTrendingUp /></span>
            </div>
            <div className="capstone-kpi-val">{formatUGX(summary.total_diaspora_fx_savings)}</div>
            <div className="capstone-kpi-subtext">Forward hedge arbitrage realized</div>
          </div>

          <div className="capstone-kpi-card">
            <div className="capstone-kpi-header">
              <span className="capstone-kpi-title">Average Readiness</span>
              <span className="capstone-kpi-icon primary"><MdCheckCircle /></span>
            </div>
            <div className="capstone-kpi-val">{summary.average_readiness_score}%</div>
            <div className="capstone-kpi-subtext">Milestones & dossier cleared</div>
          </div>
        </div>
      )}

      {/* Subtabs Bar */}
      <div className="capstone-subtabs-nav">
        <button
          className={`capstone-subtab-btn ${activeSubtab === 'dossier' ? 'active' : ''}`}
          onClick={() => setActiveSubtab('dossier')}
        >
          <MdDescription /> Handover Dossier & Milestone Gates
        </button>

        <button
          className={`capstone-subtab-btn ${activeSubtab === 'deed' ? 'active' : ''}`}
          onClick={() => setActiveSubtab('deed')}
        >
          <MdKey /> Deed of Handover & Key Release
        </button>

        <button
          className={`capstone-subtab-btn ${activeSubtab === 'settlement' ? 'active' : ''}`}
          onClick={() => setActiveSubtab('settlement')}
        >
          <MdAttachMoney /> End-to-End Financial Settlement
        </button>
      </div>

      {loading && !selectedHandover && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          Loading capstone handover and settlement records...
        </div>
      )}

      {/* SUBTAB 1: Handover Dossier & Milestone Gates */}
      {activeSubtab === 'dossier' && selectedHandover && (
        <div className="capstone-card">
          <div className="capstone-card-header">
            <div>
              <div className="capstone-card-title">
                {selectedHandover.handover_title} ({selectedHandover.handover_number})
              </div>
              <div className="capstone-card-subtitle">
                Project: {selectedHandover.project?.name || 'Project'} | Client:{' '}
                {selectedHandover.client
                  ? `${selectedHandover.client.first_name} ${selectedHandover.client.last_name}`
                  : 'Client'}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {handovers.length > 1 && (
                <select
                  className="dossier-input"
                  style={{ width: 'auto', padding: '6px 12px' }}
                  value={selectedHandover.id}
                  onChange={(e) => {
                    const found = handovers.find((h) => h.id === Number(e.target.value))
                    if (found) setSelectedHandover(found)
                  }}
                >
                  {handovers.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.handover_number} - {h.project?.name || 'Project'}
                    </option>
                  ))}
                </select>
              )}

              <span
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontWeight: 700,
                  fontSize: '12px',
                  background: selectedHandover.readiness_percentage >= 100 ? '#dcfce7' : '#fef3c7',
                  color: selectedHandover.readiness_percentage >= 100 ? '#15803d' : '#b45309',
                }}
              >
                Readiness Score: {selectedHandover.readiness_percentage}%
              </span>

              <button className="btn-capstone-primary" onClick={loadData} disabled={loading}>
                <MdRefresh /> Refresh
              </button>
            </div>
          </div>

          <div className="capstone-card-body">
            {/* 5-Stage Milestone Physical Clearance Gates */}
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#334155' }}>
              Construction Milestone Physical Completion Gates
            </h4>
            <div className="milestone-gates-grid">
              <div className={`gate-badge-card ${selectedHandover.substructure_cleared ? 'cleared' : ''}`}>
                <div className={`gate-icon ${selectedHandover.substructure_cleared ? 'cleared' : 'pending'}`}>
                  <MdCheckCircle />
                </div>
                <div className="gate-info">
                  <span className="gate-title">1. Substructure</span>
                  <span className={`gate-status ${selectedHandover.substructure_cleared ? 'cleared' : 'pending'}`}>
                    {selectedHandover.substructure_cleared ? 'Cleared 100%' : 'Pending QA'}
                  </span>
                </div>
              </div>

              <div className={`gate-badge-card ${selectedHandover.superstructure_cleared ? 'cleared' : ''}`}>
                <div className={`gate-icon ${selectedHandover.superstructure_cleared ? 'cleared' : 'pending'}`}>
                  <MdCheckCircle />
                </div>
                <div className="gate-info">
                  <span className="gate-title">2. Superstructure</span>
                  <span className={`gate-status ${selectedHandover.superstructure_cleared ? 'cleared' : 'pending'}`}>
                    {selectedHandover.superstructure_cleared ? 'Cleared 100%' : 'Pending QA'}
                  </span>
                </div>
              </div>

              <div className={`gate-badge-card ${selectedHandover.roofing_cleared ? 'cleared' : ''}`}>
                <div className={`gate-icon ${selectedHandover.roofing_cleared ? 'cleared' : 'pending'}`}>
                  <MdCheckCircle />
                </div>
                <div className="gate-info">
                  <span className="gate-title">3. Roofing</span>
                  <span className={`gate-status ${selectedHandover.roofing_cleared ? 'cleared' : 'pending'}`}>
                    {selectedHandover.roofing_cleared ? 'Cleared 100%' : 'Pending QA'}
                  </span>
                </div>
              </div>

              <div className={`gate-badge-card ${selectedHandover.mep_cleared ? 'cleared' : ''}`}>
                <div className={`gate-icon ${selectedHandover.mep_cleared ? 'cleared' : 'pending'}`}>
                  <MdCheckCircle />
                </div>
                <div className="gate-info">
                  <span className="gate-title">4. MEP Rough-In</span>
                  <span className={`gate-status ${selectedHandover.mep_cleared ? 'cleared' : 'pending'}`}>
                    {selectedHandover.mep_cleared ? 'Cleared 100%' : 'Pending QA'}
                  </span>
                </div>
              </div>

              <div className={`gate-badge-card ${selectedHandover.finishes_cleared ? 'cleared' : ''}`}>
                <div className={`gate-icon ${selectedHandover.finishes_cleared ? 'cleared' : 'pending'}`}>
                  <MdCheckCircle />
                </div>
                <div className="gate-info">
                  <span className="gate-title">5. Finishes & QA</span>
                  <span className={`gate-status ${selectedHandover.finishes_cleared ? 'cleared' : 'pending'}`}>
                    {selectedHandover.finishes_cleared ? 'Cleared 100%' : 'Pending QA'}
                  </span>
                </div>
              </div>
            </div>

            {/* Handover Dossier & Municipal Documentation Form */}
            <h4 style={{ margin: '24px 0 12px 0', fontSize: '14px', color: '#334155' }}>
              Handover Dossier & Statutory Municipal Permits Checklist
            </h4>
            <form onSubmit={handleSaveDossier}>
              <div className="dossier-checklist-grid">
                {/* Occupancy Permit */}
                <div className="dossier-item">
                  <div className="dossier-item-header">
                    <input
                      type="checkbox"
                      className="dossier-checkbox"
                      checked={dossierForm.has_occupancy_permit}
                      onChange={(e) =>
                        setDossierForm({ ...dossierForm, has_occupancy_permit: e.target.checked })
                      }
                    />
                    <span>Municipal Occupancy Permit</span>
                  </div>
                  <input
                    type="text"
                    className="dossier-input"
                    placeholder="Ref: KCCA/DPH/2026/0891"
                    value={dossierForm.occupancy_permit_ref}
                    onChange={(e) =>
                      setDossierForm({ ...dossierForm, occupancy_permit_ref: e.target.value })
                    }
                  />
                  <input
                    type="date"
                    className="dossier-input"
                    value={dossierForm.occupancy_permit_issued_at}
                    onChange={(e) =>
                      setDossierForm({ ...dossierForm, occupancy_permit_issued_at: e.target.value })
                    }
                  />
                </div>

                {/* As-Built Drawings */}
                <div className="dossier-item">
                  <div className="dossier-item-header">
                    <input
                      type="checkbox"
                      className="dossier-checkbox"
                      checked={dossierForm.has_as_built_drawings}
                      onChange={(e) =>
                        setDossierForm({ ...dossierForm, has_as_built_drawings: e.target.checked })
                      }
                    />
                    <span>As-Built Engineering Drawings</span>
                  </div>
                  <input
                    type="text"
                    className="dossier-input"
                    placeholder="Dossier Ref: DWG-ASB-2026-ARC-001"
                    value={dossierForm.as_built_drawings_ref}
                    onChange={(e) =>
                      setDossierForm({ ...dossierForm, as_built_drawings_ref: e.target.value })
                    }
                  />
                </div>

                {/* MEP Compliance Certificates */}
                <div className="dossier-item">
                  <div className="dossier-item-header">
                    <input
                      type="checkbox"
                      className="dossier-checkbox"
                      checked={dossierForm.has_mep_compliance_certs}
                      onChange={(e) =>
                        setDossierForm({ ...dossierForm, has_mep_compliance_certs: e.target.checked })
                      }
                    />
                    <span>MEP & Earthing Test Certificates</span>
                  </div>
                  <input
                    type="text"
                    className="dossier-input"
                    placeholder="Umeme earthing & plumbing pressure notes"
                    value={dossierForm.mep_compliance_notes}
                    onChange={(e) =>
                      setDossierForm({ ...dossierForm, mep_compliance_notes: e.target.value })
                    }
                  />
                </div>

                {/* Warranty & Maintenance Manual */}
                <div className="dossier-item">
                  <div className="dossier-item-header">
                    <input
                      type="checkbox"
                      className="dossier-checkbox"
                      checked={dossierForm.has_warranty_manual}
                      onChange={(e) =>
                        setDossierForm({ ...dossierForm, has_warranty_manual: e.target.checked })
                      }
                    />
                    <span>Fixtures & Equipment Warranty Manual</span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Covers solar inverter, water booster pump, roofing sheets, and tiles.
                  </span>
                </div>

                {/* Key Inventory */}
                <div className="dossier-item">
                  <div className="dossier-item-header">
                    <input
                      type="checkbox"
                      className="dossier-checkbox"
                      checked={dossierForm.has_keys_inventory}
                      onChange={(e) =>
                        setDossierForm({ ...dossierForm, has_keys_inventory: e.target.checked })
                      }
                    />
                    <span>Master Keys Inventory Verified</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Key Sets:</span>
                    <input
                      type="number"
                      min="1"
                      className="dossier-input"
                      style={{ width: '80px' }}
                      value={dossierForm.key_sets_count}
                      onChange={(e) =>
                        setDossierForm({ ...dossierForm, key_sets_count: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>

                {/* Project Director Signoff */}
                <div className="dossier-item">
                  <div className="dossier-item-header">
                    <input
                      type="checkbox"
                      className="dossier-checkbox"
                      checked={dossierForm.project_director_signed}
                      onChange={(e) =>
                        setDossierForm({ ...dossierForm, project_director_signed: e.target.checked })
                      }
                    />
                    <span>Project Director Authorization</span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Executive approval certifying property is fit for client occupancy.
                  </span>
                </div>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn-capstone-primary" disabled={actionLoading}>
                  {actionLoading ? 'Saving Dossier...' : 'Save Dossier Checklist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBTAB 2: Deed of Handover & Key Release */}
      {activeSubtab === 'deed' && selectedHandover && (
        <div className="capstone-card">
          <div className="capstone-card-header">
            <div>
              <div className="capstone-card-title">
                Formal Deed of Handover & Keys Release Protocol
              </div>
              <div className="capstone-card-subtitle">
                Electronic Client Sign-Off, Cryptographic Seal & Defects Liability Period (DLP)
              </div>
            </div>

            {selectedHandover.status === 'keys_released' && (
              <span
                style={{
                  background: '#dcfce7',
                  color: '#15803d',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontWeight: 700,
                  fontSize: '12px',
                }}
              >
                Keys Released & DLP Active
              </span>
            )}
          </div>

          <div className="capstone-card-body">
            {/* Live DLP Countdown Banner if active */}
            {selectedHandover.is_dlp_active && (
              <div className="countdown-banner">
                <div className="countdown-banner-text">
                  <MdSecurity style={{ fontSize: '24px' }} />
                  <div>
                    <strong>Defects Liability Period (DLP) Warranty Active:</strong>{' '}
                    {selectedHandover.dlp_days_remaining} Days Remaining
                    <div style={{ fontSize: '12px', color: '#047857' }}>
                      Maturity Date: {selectedHandover.dlp_end_date} (50% retention release eligible upon expiry)
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    color: '#065f46',
                  }}
                >
                  {selectedHandover.dlp_days_remaining}d
                </div>
              </div>
            )}

            {/* Handover Deed Certificate Card */}
            <div className="deed-certificate-card">
              {selectedHandover.client_signature_hash && (
                <div className="deed-seal">
                  <MdVerified style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  Digitally Sealed
                </div>
              )}

              <div className="deed-header">
                <h2>DEED OF PRACTICAL COMPLETION & HANDOVER</h2>
                <p>Contract Protocol Ref: {selectedHandover.handover_number}</p>
                <p style={{ fontWeight: 600, color: '#0f172a' }}>
                  Property: {selectedHandover.project?.name || 'Project'} | Unit:{' '}
                  {selectedHandover.unit?.unit_number || 'Entire Site'}
                </p>
              </div>

              <div
                style={{
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: '#334155',
                  background: '#ffffff',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}
              >
                This certifies that the works executed under the project agreement have been inspected
                and completed in full compliance with the approved architectural plans, building codes,
                and statutory occupancy regulations. All 5 core milestone stages have been certified,
                and the keys to the property are hereby formally delivered to the purchaser.
              </div>

              {/* Form to Sign and Release Keys */}
              {selectedHandover.status !== 'keys_released' && selectedHandover.status !== 'closed' ? (
                <form onSubmit={handleExecuteSignoff}>
                  <div className="signoff-form-grid">
                    <div className="signoff-field">
                      <label>Client Signatory Name</label>
                      <input
                        type="text"
                        className="dossier-input"
                        required
                        value={signoffForm.client_signature_name}
                        onChange={(e) =>
                          setSignoffForm({ ...signoffForm, client_signature_name: e.target.value })
                        }
                        placeholder="e.g., John Doe"
                      />
                    </div>

                    <div className="signoff-field">
                      <label>Key Sets Received</label>
                      <input
                        type="number"
                        min="1"
                        className="dossier-input"
                        required
                        value={signoffForm.key_sets_count}
                        onChange={(e) =>
                          setSignoffForm({
                            ...signoffForm,
                            key_sets_count: Number(e.target.value),
                          })
                        }
                      />
                    </div>

                    <div className="signoff-field">
                      <label>Defect Liability Period (DLP)</label>
                      <select
                        className="dossier-input"
                        value={signoffForm.dlp_period_days}
                        onChange={(e) =>
                          setSignoffForm({
                            ...signoffForm,
                            dlp_period_days: Number(e.target.value),
                          })
                        }
                      >
                        <option value={180}>180 Days (6 Months FIDIC)</option>
                        <option value={365}>365 Days (12 Months Standard Uganda)</option>
                        <option value={730}>730 Days (24 Months Extended)</option>
                      </select>
                    </div>

                    <div className="signoff-field">
                      <label>Handover Acceptance Notes</label>
                      <input
                        type="text"
                        className="dossier-input"
                        value={signoffForm.notes}
                        onChange={(e) =>
                          setSignoffForm({ ...signoffForm, notes: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="submit"
                      className="btn-capstone-success"
                      disabled={actionLoading || selectedHandover.readiness_percentage < 100}
                      title={
                        selectedHandover.readiness_percentage < 100
                          ? 'Complete 100% readiness in Dossier tab first'
                          : 'Execute Deed & Release Keys'
                      }
                    >
                      <MdKey /> {actionLoading ? 'Executing Sign-Off...' : 'Execute Deed & Release Keys'}
                    </button>
                  </div>
                </form>
              ) : (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '13px',
                  }}
                >
                  <div>
                    <strong>Client Digital Signature:</strong> {selectedHandover.client_signature_name}
                  </div>
                  <div>
                    <strong>Signed At:</strong>{' '}
                    {selectedHandover.client_signed_at
                      ? new Date(selectedHandover.client_signed_at).toLocaleString()
                      : '—'}
                  </div>
                  <div>
                    <strong>SHA-256 Digital Seal:</strong>{' '}
                    <code style={{ fontSize: '11px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                      {selectedHandover.client_signature_hash}
                    </code>
                  </div>
                  <div>
                    <strong>Keys Delivered:</strong> {selectedHandover.key_sets_count} Full Sets
                  </div>
                  <div>
                    <strong>Warranty Period:</strong> {selectedHandover.dlp_period_days} Days (Expires:{' '}
                    {selectedHandover.dlp_end_date})
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: End-to-End Financial Settlement */}
      {activeSubtab === 'settlement' && settlement && (
        <div className="capstone-card">
          <div className="capstone-card-header">
            <div>
              <div className="capstone-card-title">
                Definitive End-to-End Final Account Settlement
              </div>
              <div className="capstone-card-subtitle">
                Settlement Statement Ref: {settlement.settlement_number} | Currency: {settlement.currency}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span
                className={
                  settlement.settlement_direction === 'balanced'
                    ? 'badge-balanced'
                    : settlement.settlement_direction === 'client_refund'
                    ? 'badge-refund'
                    : 'badge-payable'
                }
              >
                {settlement.settlement_direction === 'balanced'
                  ? 'Balanced Escrow'
                  : settlement.settlement_direction === 'client_refund'
                  ? 'Client Refund Due'
                  : 'Client Balance Payable'}
              </span>

              {settlement.status !== 'final_settled' ? (
                <button
                  className="btn-capstone-primary"
                  onClick={handleFinalizeSettlement}
                  disabled={actionLoading}
                >
                  <MdVerified /> {actionLoading ? 'Finalizing...' : 'Finalize & Seal Accounts'}
                </button>
              ) : (
                <span
                  style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontWeight: 700,
                    fontSize: '12px',
                  }}
                >
                  Accounts Final Settled
                </span>
              )}
            </div>
          </div>

          <div className="capstone-card-body" style={{ padding: 0 }}>
            <table className="settlement-table">
              <thead>
                <tr>
                  <th>Financial Ledger Account</th>
                  <th>Description / Audit Reference</th>
                  <th style={{ textAlign: 'right' }}>Amount (UGX)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Initial Contract Sum</strong></td>
                  <td>Original Project Baseline Budget</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {formatUGX(settlement.original_contract_sum)}
                  </td>
                </tr>

                <tr>
                  <td><strong>Approved Variations (+)</strong></td>
                  <td>Authorized Scope Adjustments & Change Orders</td>
                  <td style={{ textAlign: 'right', color: '#0284c7', fontWeight: 600 }}>
                    +{formatUGX(settlement.approved_variations_amount)}
                  </td>
                </tr>

                <tr>
                  <td><strong>FIDIC Material Escalation (+)</strong></td>
                  <td>FIDIC Clause 70 CIPI Inflation Price Delta</td>
                  <td style={{ textAlign: 'right', color: '#0284c7', fontWeight: 600 }}>
                    +{formatUGX(settlement.material_escalation_amount)}
                  </td>
                </tr>

                <tr className="total-row">
                  <td><strong>Adjusted Final Contract Sum</strong></td>
                  <td>Definitive Project Revenue Obligation</td>
                  <td style={{ textAlign: 'right', color: '#0f172a' }}>
                    {formatUGX(settlement.adjusted_contract_sum)}
                  </td>
                </tr>

                <tr>
                  <td><strong>Total Escrow Inflows Deposited</strong></td>
                  <td>Client Direct Payments + Milestone Savings Draws</td>
                  <td style={{ textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>
                    {formatUGX(settlement.total_escrow_inflows)}
                  </td>
                </tr>

                <tr>
                  <td><strong>Subcontractor Trade Works Paid (-)</strong></td>
                  <td>Interim Certified Payment Certificates</td>
                  <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>
                    -{formatUGX(settlement.total_subcontractor_paid)}
                  </td>
                </tr>

                <tr>
                  <td><strong>Direct Bulk Materials & Expenses (-)</strong></td>
                  <td>Supplier Materials, Plant & Petty Cash</td>
                  <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>
                    -{formatUGX(settlement.total_direct_expenses_paid)}
                  </td>
                </tr>

                <tr className="total-row">
                  <td><strong>Total Construction Disbursements Paid</strong></td>
                  <td>Total Cash Outflows to Site Contractors</td>
                  <td style={{ textAlign: 'right', color: '#dc2626' }}>
                    -{formatUGX(settlement.total_disbursements_paid)}
                  </td>
                </tr>

                <tr>
                  <td><strong>Total Retention Withheld (5%)</strong></td>
                  <td>Defects Security Bond Deducted across Trades</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {formatUGX(settlement.retention_withheld_total)}
                  </td>
                </tr>

                <tr>
                  <td><strong>Retention Released @ Completion (50%)</strong></td>
                  <td>Released to Subcontractors upon Practical Handover</td>
                  <td style={{ textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>
                    {formatUGX(settlement.retention_released_completion)}
                  </td>
                </tr>

                <tr>
                  <td><strong>Retention Reserved in DLP (50%)</strong></td>
                  <td>Held in Escrow until 365-Day Warranty Expiry</td>
                  <td style={{ textAlign: 'right', color: '#d97706', fontWeight: 600 }}>
                    {formatUGX(settlement.retention_held_dlp)}
                  </td>
                </tr>

                <tr>
                  <td><strong>Diaspora FX Forward Hedging Savings</strong></td>
                  <td>Currency Arbitrage Value Delivered to Client</td>
                  <td style={{ textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>
                    +{formatUGX(settlement.diaspora_fx_hedging_savings)}
                  </td>
                </tr>

                <tr className="highlight-row">
                  <td><strong>Gross Project Profit Margin</strong></td>
                  <td>Revenue Margin after Trade Outflows & DLP Reserves</td>
                  <td style={{ textAlign: 'right', color: '#15803d' }}>
                    {formatUGX(settlement.gross_project_profit)} ({settlement.profit_margin_percentage}%)
                  </td>
                </tr>

                <tr className="total-row" style={{ fontSize: '15px', background: '#f1f5f9' }}>
                  <td><strong>Net Escrow Balancing Position</strong></td>
                  <td>Final Settlement Account Balance</td>
                  <td style={{ textAlign: 'right', color: '#0f172a' }}>
                    {formatUGX(settlement.final_settlement_balance)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Soft Confirmation for Finalize Settlement */}
      <ConfirmDialog
        isOpen={showFinalizeConfirm}
        title="Finalize Project Settlement"
        message="Are you sure you want to finalize this project settlement? This will seal accounts and permanently mark the project as completed."
        confirmLabel="Finalize & Seal"
        cancelLabel="Cancel"
        variant="warning"
        loading={actionLoading}
        onConfirm={confirmFinalizeSettlement}
        onCancel={() => setShowFinalizeConfirm(false)}
      />
    </div>
  )
}

export default ProjectHandoverSettlementTab
