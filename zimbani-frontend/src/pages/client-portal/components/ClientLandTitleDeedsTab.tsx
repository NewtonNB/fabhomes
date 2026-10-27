import React, { useState, useEffect } from 'react'
import {
  MdDescription,
  MdCheckCircle,
  MdRadioButtonUnchecked,
  MdHourglassEmpty,
  MdPinDrop,
  MdBookmark,
  MdRefresh,
  MdClose,
  MdArrowForward,
  MdPrint,
  MdHomeWork,
  MdVerified,
  MdQrCode2,
} from 'react-icons/md'
import { clientPortalPlotService } from '../../../services/client-portal-plots.service'
import {
  ClientReservationItem,
  LandTitleDeedItem,
} from '../../../types/client-portal-plots.types'
import { ConfirmDialog } from '../../../components/common/ConfirmDialog'
import './ClientPlotsTab.css'

interface ClientLandTitleDeedsTabProps {
  onNotify?: (msg: string, type: 'success' | 'error') => void
  onExplorePlots?: () => void
}

export const ClientLandTitleDeedsTab: React.FC<ClientLandTitleDeedsTabProps> = ({
  onNotify,
  onExplorePlots,
}) => {
  const [deeds, setDeeds] = useState<LandTitleDeedItem[]>([])
  const [reservations, setReservations] = useState<ClientReservationItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [isCancelling, setIsCancelling] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<{ resUuid: string; plotNumber: string } | null>(null)
  const [selectedDeedForPrint, setSelectedDeedForPrint] = useState<LandTitleDeedItem | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [deedsRes, resRes] = await Promise.all([
        clientPortalPlotService.getLandTitleDeeds(),
        clientPortalPlotService.getClientReservations(),
      ])
      setDeeds(deedsRes.deeds)
      setReservations(resRes.reservations)
    } catch (err: any) {
      if (onNotify) onNotify(err.message || 'Failed to load title deeds and reservations', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCancelReservation = (resUuid: string, plotNumber: string) => {
    setCancelTarget({ resUuid, plotNumber })
  }

  const confirmCancelReservation = async () => {
    if (!cancelTarget) return
    const { resUuid } = cancelTarget
    setIsCancelling(resUuid)
    try {
      const res = await clientPortalPlotService.cancelReservation(resUuid, 'Client requested cancellation')
      if (onNotify) onNotify(res.message, 'success')
      setCancelTarget(null)
      await loadData()
    } catch (err: any) {
      if (onNotify) onNotify(err.response?.data?.message || err.message || 'Cancellation failed', 'error')
    } finally {
      setIsCancelling(null)
    }
  }

  const formatUGX = (val: number) => {
    return 'UGX ' + Math.round(val).toLocaleString()
  }

  if (loading && deeds.length === 0 && reservations.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
        <MdDescription style={{ fontSize: 40, color: '#fbbf24', marginBottom: 12 }} />
        <div>Loading your land title deeds & reservations...</div>
      </div>
    )
  }

  return (
    <div className="plots-container">
      {/* Header Banner */}
      <div className="portal-welcome-card" style={{ padding: '20px 24px' }}>
        <div className="portal-welcome-info">
          <div className="portal-avatar-circle" style={{ background: '#0284c7' }}>
            <MdDescription style={{ fontSize: 24, color: '#fff' }} />
          </div>
          <div className="portal-welcome-text">
            <h2>Land Title Deeds & Reservation Processing</h2>
            <div className="portal-client-number">
              Real-time Ministry of Lands mutation, deed plan generation, and cadastral survey trackers
            </div>
          </div>
        </div>

        <button className="portal-btn-secondary" onClick={() => loadData()}>
          <MdRefresh /> Refresh Trackers
        </button>
      </div>

      {/* SECTION 1: ACTIVE PLOT RESERVATIONS */}
      {reservations.length > 0 && (
        <div className="portal-card" style={{ padding: 20 }}>
          <div className="portal-card-header" style={{ marginBottom: 16 }}>
            <h3 className="portal-card-title">
              <MdBookmark style={{ color: '#fbbf24' }} /> My Plot Reservations (14-Day Guaranteed Holds)
            </h3>
            <span className="portal-badge portal-badge-verified">
              {reservations.filter((r) => r.status === 'confirmed').length} Active Hold(s)
            </span>
          </div>

          <div className="plots-cards-grid">
            {reservations.map((res) => (
              <div
                key={res.id}
                className="plot-card is-mine"
                style={{ padding: 16 }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 16, color: '#fff' }}>{res.plot.unit_number}</h4>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>Ref: {res.reservation_number}</span>
                    </div>
                    <span
                      className={`plot-inspector-badge ${
                        res.status === 'confirmed' ? 'mine' : res.status === 'cancelled' ? 'sold' : 'reserved'
                      }`}
                    >
                      {res.status.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ fontSize: 14, fontWeight: 700, color: '#38bdf8', marginBottom: 8 }}>
                    {formatUGX(res.plot.price)}
                  </div>

                  <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>
                    <div>Booking Deposit Paid: <strong style={{ color: '#10b981' }}>{formatUGX(res.reservation_fee_paid)}</strong></div>
                    <div>Hold Expiration: <strong>{new Date(res.expires_at).toLocaleDateString()}</strong></div>
                    {res.status === 'confirmed' && (
                      <div style={{ color: '#fbbf24', marginTop: 4, fontWeight: 600 }}>
                        ⏳ {res.days_remaining} day(s) remaining on guaranteed lock
                      </div>
                    )}
                  </div>
                </div>

                {res.status === 'confirmed' && (
                  <div style={{ marginTop: 14 }}>
                    <button
                      className="portal-btn-secondary"
                      style={{ width: '100%', padding: '6px 12px', fontSize: 11, color: '#f87171' }}
                      disabled={isCancelling === res.uuid}
                      onClick={() => handleCancelReservation(res.uuid, res.plot.unit_number)}
                    >
                      <MdClose /> {isCancelling === res.uuid ? 'Releasing Plot...' : 'Release / Cancel Reservation'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: LAND TITLE DEED PROCESSING PIPELINES */}
      {deeds.length > 0 ? (
        <div>
          {deeds.map((deed) => (
            <div key={deed.id} className="deed-card">
              {/* Deed Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h3 style={{ margin: 0, fontSize: 18, color: '#fff' }}>
                      Plot {deed.plot.unit_number} — {deed.title_number}
                    </h3>
                    <span className="portal-badge portal-badge-verified">
                      {deed.tenure_type}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    Deed File: <strong>{deed.deed_number}</strong> • Project: <strong>{deed.project?.name}</strong> • Estimated Handover: <strong>{deed.estimated_completion_date}</strong>
                  </div>
                </div>

                {/* Progress Percentage Badge & Print Action */}
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#38bdf8' }}>
                      {deed.overall_progress_percentage}%
                    </div>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Overall Pipeline Complete</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDeedForPrint(deed)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      borderRadius: '6px',
                      color: '#38bdf8',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    title="Print Official Certified Deed Plan Document"
                  >
                    <MdPrint size={15} /> Print Deed Plan
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="account-progress-bar-bg" style={{ margin: '16px 0 24px 0' }}>
                <div
                  className="account-progress-bar-fill"
                  style={{ width: `${deed.overall_progress_percentage}%`, background: 'linear-gradient(90deg, #3b82f6, #10b981)' }}
                />
              </div>

              {/* 5-Step Pipeline Stepper */}
              <h4 style={{ margin: '0 0 14px 0', fontSize: 14, color: '#fff' }}>
                Statutory Land Title Processing Pipeline
              </h4>

              <div className="deed-pipeline-stepper">
                {deed.stages.map((stage) => (
                  <div key={stage.step} className={`pipeline-step ${stage.status}`}>
                    <div className="step-indicator">
                      {stage.status === 'completed' ? (
                        <MdCheckCircle style={{ fontSize: 20 }} />
                      ) : stage.status === 'in_progress' ? (
                        <MdHourglassEmpty style={{ fontSize: 18 }} />
                      ) : (
                        <MdRadioButtonUnchecked style={{ fontSize: 18 }} />
                      )}
                    </div>

                    <div className="step-content">
                      <div className="step-content-title">
                        <strong style={{ fontSize: 13, color: '#fff' }}>
                          Step {stage.step}: {stage.label}
                        </strong>
                        <span
                          style={{
                            fontSize: 10,
                            padding: '2px 8px',
                            borderRadius: 4,
                            background:
                              stage.status === 'completed'
                                ? 'rgba(16, 185, 129, 0.2)'
                                : stage.status === 'in_progress'
                                ? 'rgba(59, 130, 246, 0.2)'
                                : 'rgba(100, 116, 139, 0.2)',
                            color:
                              stage.status === 'completed'
                                ? '#34d399'
                                : stage.status === 'in_progress'
                                ? '#60a5fa'
                                : '#94a3b8',
                            fontWeight: 600,
                          }}
                        >
                          {stage.status === 'completed'
                            ? 'COMPLETED'
                            : stage.status === 'in_progress'
                            ? 'IN PROGRESS'
                            : 'PENDING'}
                        </span>
                      </div>

                      <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4 }}>
                        {stage.notes}
                      </div>

                      {stage.surveyor && (
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                          Licensed Cadastral Surveyor: <strong>{stage.surveyor}</strong> {stage.date && `• Inspected on ${stage.date}`}
                        </div>
                      )}

                      {stage.zonal_office && (
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                          Ministry Zonal Office: <strong>{stage.zonal_office}</strong> • Ref: <strong>{stage.reference}</strong>
                        </div>
                      )}

                      {stage.deed_plan_number && (
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                          Certified Deed Plan: <strong>{stage.deed_plan_number}</strong>
                        </div>
                      )}

                      {stage.title_number && (
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                          Official Title Certificate: <strong>{stage.title_number}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Beacon Coordinates Section */}
              {deed.beacon_coordinates && deed.beacon_coordinates.length > 0 && (
                <div style={{ marginTop: 24, background: 'var(--portal-bg-card-subtle)', borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <MdPinDrop style={{ color: '#38bdf8', fontSize: 18 }} />
                    <strong style={{ fontSize: 13, color: '#fff' }}>
                      Certified Cadastral Boundary GPS Beacons
                    </strong>
                  </div>
                  <p style={{ margin: '0 0 12px 0', fontSize: 12, color: '#94a3b8' }}>
                    These physical boundary markers (concrete corner pillars) have been placed on site and verified with
                    surveyor GPS coordinates.
                  </p>

                  <table className="beacon-table">
                    <thead>
                      <tr>
                        <th>Beacon ID</th>
                        <th>Latitude</th>
                        <th>Longitude</th>
                        <th>Marker Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deed.beacon_coordinates.map((b, i) => (
                        <tr key={i}>
                          <td><strong>{b.beacon}</strong></td>
                          <td><code>{b.lat.toFixed(6)}° N</code></td>
                          <td><code>{b.lng.toFixed(6)}° E</code></td>
                          <td>Reinforced Concrete Pillar</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="portal-card" style={{ padding: 40, textAlign: 'center' }}>
          <div className="portal-kpi-icon plots" style={{ margin: '0 auto 16px auto', width: 56, height: 56 }}>
            <MdDescription style={{ fontSize: 28 }} />
          </div>
          <h3 style={{ fontSize: 18, color: '#fff', margin: '0 0 8px 0' }}>No Active Land Titles Found</h3>
          <p style={{ maxWidth: 520, margin: '0 auto 20px auto', fontSize: 13, color: '#94a3b8' }}>
            You do not currently have any plots in title processing. Explore available estate plots to reserve your
            preferred parcel and begin deed registration.
          </p>
          <button className="portal-btn-primary" onClick={onExplorePlots}>
            Explore Available Plots on Interactive Map <MdArrowForward />
          </button>
        </div>
      )}

      {/* Soft Confirmation for Reservation Cancellation */}
      <ConfirmDialog
        isOpen={!!cancelTarget}
        title="Cancel Plot Reservation"
        message={`Are you sure you want to cancel your reservation for Plot ${cancelTarget?.plotNumber}? The plot will be immediately released back to available inventory.`}
        confirmLabel="Cancel Reservation"
        cancelLabel="Keep Reservation"
        variant="danger"
        loading={!!isCancelling}
        onConfirm={confirmCancelReservation}
        onCancel={() => setCancelTarget(null)}
      />

      {/* Official Printable Cadastral Deed Certificate Modal */}
      {selectedDeedForPrint && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            {/* Header controls (no-print) */}
            <div
              className="no-print"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 24px',
                borderBottom: '1px solid #e2e8f0',
                background: '#f8fafc',
                borderRadius: '16px 16px 0 0',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>
                  Official Cadastral Deed Plan & Title Certificate
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Deed No: {selectedDeedForPrint.deed_number} • Plot: {selectedDeedForPrint.plot.unit_number}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  <MdPrint /> Print / Save as PDF
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDeedForPrint(null)}
                  style={{ background: 'transparent', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#64748b' }}
                >
                  <MdClose />
                </button>
              </div>
            </div>

            {/* Document Container */}
            <div style={{ padding: '28px' }}>
              <div
                id="printable-deed-plan"
                style={{
                  background: '#ffffff',
                  border: '2px solid #0284c7',
                  borderRadius: '12px',
                  padding: '32px',
                  color: '#0f172a',
                }}
              >
                {/* Official Letterhead */}
                <div style={{ borderBottom: '2px solid #d97706', paddingBottom: '16px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                      <div style={{ width: '48px', height: '48px', background: '#0284c7', color: '#ffffff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>
                        <MdHomeWork />
                      </div>
                      <div>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '0.5px' }}>
                          FAB HOMES UGANDA LIMITED
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#d97706' }}>
                          DEPARTMENT OF CADASTRAL SURVEYS & LAND CONVEYANCING
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'inline-block', background: '#e0f2fe', color: '#0369a1', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '4px', border: '1px solid #bae6fd' }}>
                        CERTIFIED DEED PLAN
                      </span>
                      <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '4px' }}>
                        TITLE #{selectedDeedForPrint.title_number}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        CAD REF: {selectedDeedForPrint.deed_number}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '10px' }}>
                    Plot 12, Lumumba Avenue, Kampala, Uganda • P.O. Box 71200 Kampala • Tel: +256 700 000 000 • Email: lands@fabhomes.ug
                  </div>
                </div>

                {/* Parcel Summary Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px', fontSize: '13px' }}>
                  <div>
                    <strong>Estate / Project:</strong> {selectedDeedForPrint.project?.name || 'Fab Homes Estate'}
                  </div>
                  <div>
                    <strong>Plot / Unit Demarcation:</strong> Plot {selectedDeedForPrint.plot.unit_number}
                  </div>
                  <div>
                    <strong>Land Tenure System:</strong> <span style={{ textTransform: 'uppercase', color: '#0369a1', fontWeight: 700 }}>{selectedDeedForPrint.tenure_type}</span>
                  </div>
                  <div>
                    <strong>Pipeline Status:</strong> <span style={{ color: '#16a34a', fontWeight: 700 }}>{selectedDeedForPrint.overall_progress_percentage}% Certified</span>
                  </div>
                  <div>
                    <strong>Target Handover Date:</strong> {selectedDeedForPrint.estimated_completion_date}
                  </div>
                  <div>
                    <strong>Cadastral Sheet:</strong> {selectedDeedForPrint.stages[1]?.zonal_office || 'Mukono / Wakiso Ministry Zonal Office'}
                  </div>
                </div>

                {/* GPS Beacon Boundary Table */}
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#0f172a' }}>
                  Certified Cadastral Boundary GPS Beacons (Corner Pillars)
                </h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '24px' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Beacon Mark</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Latitude Coordinates</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Longitude Coordinates</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Boundary Marker Material</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedDeedForPrint.beacon_coordinates || []).length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: '12px', textAlign: 'center', color: '#94a3b8' }}>
                          Physical corner beacons verified under surveyor boundary opening.
                        </td>
                      </tr>
                    ) : (
                      selectedDeedForPrint.beacon_coordinates.map((b, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 700 }}>{b.beacon}</td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{b.lat.toFixed(6)}° N</td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{b.lng.toFixed(6)}° E</td>
                          <td style={{ padding: '8px 12px' }}>Reinforced Concrete Pillar</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* 5-Step Pipeline Stages Summary */}
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#0f172a' }}>
                  Statutory Title Verification Stages
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '24px' }}>
                  {selectedDeedForPrint.stages.map((st) => (
                    <div
                      key={st.step}
                      style={{
                        background: st.status === 'completed' ? '#ecfdf5' : '#f8fafc',
                        border: `1px solid ${st.status === 'completed' ? '#a7f3d0' : '#e2e8f0'}`,
                        borderRadius: '6px',
                        padding: '8px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '10px', fontWeight: 700, color: st.status === 'completed' ? '#047857' : '#64748b' }}>
                        STEP {st.step}
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#0f172a', margin: '4px 0' }}>
                        {st.label}
                      </div>
                      <div style={{ fontSize: '10px', color: st.status === 'completed' ? '#16a34a' : '#94a3b8', fontWeight: 700 }}>
                        {st.status.toUpperCase()}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Triple Verification & Signatures Block */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px', textAlign: 'center', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>CADASTRAL SURVEYOR:</div>
                    <div style={{ height: '42px', borderBottom: '1px dashed #94a3b8', margin: '4px 0' }}></div>
                    <div style={{ fontSize: '11px', fontWeight: 600 }}>Licensed Staff Surveyor</div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>Uganda Surveyors Board</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>CUSTODIAN OF DEEDS:</div>
                    <div style={{ height: '42px', borderBottom: '1px dashed #94a3b8', margin: '4px 0' }}></div>
                    <div style={{ fontSize: '11px', fontWeight: 600 }}>Title Custodian</div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>Fab Homes Legal Department</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>MANAGING DIRECTOR:</div>
                    <div style={{ height: '42px', borderBottom: '1px dashed #94a3b8', margin: '4px 0' }}></div>
                    <div style={{ fontSize: '11px', fontWeight: 600 }}>Chief Executive Officer</div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>Fab Homes Uganda</div>
                  </div>
                </div>

                {/* Digital Verification Stamp */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 16px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <MdVerified style={{ fontSize: '24px', color: '#16a34a' }} />
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#15803d' }}>
                        OFFICIAL GOVERNMENT LANDS REGISTRATION CERTIFIED
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
                        HASH: SHA256:DEED-{selectedDeedForPrint.id}-{Date.now().toString(36).toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MdQrCode2 style={{ fontSize: '32px', color: '#0f172a' }} />
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>CADASTRAL SEAL</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClientLandTitleDeedsTab
