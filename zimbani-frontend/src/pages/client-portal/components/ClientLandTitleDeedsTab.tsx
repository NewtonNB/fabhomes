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

                {/* Progress Percentage Badge */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#38bdf8' }}>
                    {deed.overall_progress_percentage}%
                  </div>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Overall Pipeline Complete</span>
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
    </div>
  )
}

export default ClientLandTitleDeedsTab
