import React, { useState, useEffect } from 'react'
import {
  MdMap,
  MdViewModule,
  MdSearch,
  MdCheckCircle,
  MdWarning,
  MdLock,
  MdLocationOn,
  MdCreditCard,
  MdPhoneIphone,
  MdReceipt,
  MdClose,
  MdRefresh,
  MdStar,
} from 'react-icons/md'
import { clientPortalPlotService } from '../../../services/client-portal-plots.service'
import {
  EstateMapResponse,
  PlotItem,
  ReservePlotResponse,
} from '../../../types/client-portal-plots.types'
import './ClientPlotsTab.css'

interface ClientInteractiveEstateMapTabProps {
  onNotify?: (msg: string, type: 'success' | 'error') => void
  onOpenDeeds?: () => void
}

export const ClientInteractiveEstateMapTab: React.FC<ClientInteractiveEstateMapTabProps> = ({
  onNotify,
  onOpenDeeds,
}) => {
  const [mapData, setMapData] = useState<EstateMapResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [viewMode, setViewMode] = useState<'map' | 'grid'>('map')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState<string>('')
  const [selectedPlot, setSelectedPlot] = useState<PlotItem | null>(null)

  // Reservation Modal State
  const [showReserveModal, setShowReserveModal] = useState<boolean>(false)
  const [reservePlotTarget, setReservePlotTarget] = useState<PlotItem | null>(null)
  const [reservationFee, setReservationFee] = useState<number>(500000)
  const [gateway, setGateway] = useState<'mtn_momo' | 'airtel_money' | 'stanbic_bank' | 'flexipay'>('mtn_momo')
  const [phoneNumber, setPhoneNumber] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [reservationReceipt, setReservationReceipt] = useState<ReservePlotResponse | null>(null)

  const loadEstateMap = async () => {
    setLoading(true)
    try {
      const res = await clientPortalPlotService.getEstateMap()
      setMapData(res)
      if (res.plots.length > 0 && !selectedPlot) {
        setSelectedPlot(res.plots[0])
      }
    } catch (err: any) {
      if (onNotify) onNotify(err.message || 'Failed to load estate masterplan', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEstateMap()
  }, [])

  const handlePlotClick = (plot: PlotItem) => {
    setSelectedPlot(plot)
  }

  const handleOpenReserve = (plot: PlotItem) => {
    setReservePlotTarget(plot)
    setReservationFee(500000)
    setPhoneNumber('')
    setNotes('')
    setReservationReceipt(null)
    setShowReserveModal(true)
  }

  const handleSubmitReservation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reservePlotTarget) return

    setIsSubmitting(true)
    try {
      const res = await clientPortalPlotService.reservePlot({
        unit_id: reservePlotTarget.id,
        reservation_fee: reservationFee,
        gateway,
        phone_number: phoneNumber || undefined,
        notes: notes || undefined,
      })
      setReservationReceipt(res)
      if (onNotify) onNotify(res.message, 'success')
      await loadEstateMap()
    } catch (err: any) {
      if (onNotify) onNotify(err.response?.data?.message || err.message || 'Reservation failed', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatUGX = (val: number) => {
    return 'UGX ' + Math.round(val).toLocaleString()
  }

  // Filtered Plots
  const filteredPlots = (mapData?.plots || []).filter((p) => {
    if (statusFilter === 'available' && p.status !== 'available') return false
    if (statusFilter === 'reserved' && p.status !== 'reserved') return false
    if (statusFilter === 'sold' && !['sold', 'occupied'].includes(p.status)) return false
    if (statusFilter === 'mine' && !p.is_my_plot) return false
    if (search) {
      const s = search.toLowerCase()
      return (
        p.unit_number.toLowerCase().includes(s) ||
        p.name.toLowerCase().includes(s) ||
        p.zone.toLowerCase().includes(s)
      )
    }
    return true
  })

  if (loading && !mapData) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
        <MdMap style={{ fontSize: 40, color: '#38bdf8', marginBottom: 12 }} />
        <div>Loading interactive estate masterplan...</div>
      </div>
    )
  }

  const canvas = mapData?.canvas || { width: 1000, height: 650, roadways: [], amenities: [] }
  const summary = mapData?.summary

  return (
    <div className="plots-container">
      {/* Top Toolbar */}
      <div className="plots-toolbar">
        <div className="plots-toolbar-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdLocationOn style={{ fontSize: 22, color: '#38bdf8' }} />
            <h3 style={{ margin: 0, fontSize: 16, color: '#fff' }}>
              {mapData?.project?.name || 'Kigumba Royal Eco-Estate'}
            </h3>
          </div>

          {/* Status Filter Pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              className={`portal-filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All ({summary?.total_plots || 0})
            </button>
            <button
              className={`portal-filter-pill ${statusFilter === 'available' ? 'active' : ''}`}
              onClick={() => setStatusFilter('available')}
            >
              Available ({summary?.available_count || 0})
            </button>
            <button
              className={`portal-filter-pill ${statusFilter === 'reserved' ? 'active' : ''}`}
              onClick={() => setStatusFilter('reserved')}
            >
              Reserved ({summary?.reserved_count || 0})
            </button>
            <button
              className={`portal-filter-pill ${statusFilter === 'sold' ? 'active' : ''}`}
              onClick={() => setStatusFilter('sold')}
            >
              Sold ({summary?.sold_count || 0})
            </button>
            {summary && summary.my_plots_count > 0 && (
              <button
                className={`portal-filter-pill ${statusFilter === 'mine' ? 'active' : ''}`}
                style={{ borderColor: '#fbbf24', color: '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                onClick={() => setStatusFilter('mine')}
              >
                <MdStar size={14} /> My Plots ({summary.my_plots_count})
              </button>
            )}
          </div>
        </div>

        {/* View Toggle & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <MdSearch style={{ position: 'absolute', left: 10, top: 10, color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search Plot # or Zone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="plots-filter-select"
              style={{ paddingLeft: 32, width: 170 }}
            />
          </div>

          <div className="plots-view-toggle">
            <button
              className={`plots-toggle-btn ${viewMode === 'map' ? 'active' : ''}`}
              onClick={() => setViewMode('map')}
            >
              <MdMap /> Map
            </button>
            <button
              className={`plots-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <MdViewModule /> Cards
            </button>
          </div>

          <button
            className="portal-btn-icon"
            onClick={() => loadEstateMap()}
            title="Refresh Map"
          >
            <MdRefresh />
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: INTERACTIVE SVG ESTATE MASTERPLAN MAP */}
      {viewMode === 'map' && (
        <div className="estate-map-wrapper">
          {/* SVG Map Canvas Card */}
          <div className="estate-map-card">
            <div className="estate-map-header">
              <div className="estate-map-title">
                <MdMap style={{ color: '#38bdf8' }} /> Interactive Estate Masterplan
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                Tap any plot to inspect specifications & reserve
              </div>
            </div>

            {/* Legend Bar */}
            <div className="estate-map-legend">
              <div className="legend-item">
                <div className="legend-dot available" />
                <span>Available</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot reserved" />
                <span>Reserved (14-Day Hold)</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot sold" />
                <span>Sold / Allocated</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot mine" />
                <span>My Allocated Plot</span>
              </div>
            </div>

            {/* SVG Render */}
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <svg
                viewBox={`0 0 ${canvas.width} ${canvas.height}`}
                className="interactive-svg-canvas"
                style={{ minWidth: 680 }}
              >
                {/* Definitions & Gradients */}
                <defs>
                  <linearGradient id="roadGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#1e293b" />
                    <stop offset="100%" stopColor="#334155" />
                  </linearGradient>
                </defs>

                {/* Roadways Layer */}
                {canvas.roadways.map((road, i) => (
                  <g key={`road-${i}`}>
                    <line
                      x1={road.x1}
                      y1={road.y1}
                      x2={road.x2}
                      y2={road.y2}
                      stroke="url(#roadGradient)"
                      strokeWidth={road.strokeWidth}
                      strokeLinecap="round"
                    />
                    <line
                      x1={road.x1}
                      y1={road.y1}
                      x2={road.x2}
                      y2={road.y2}
                      stroke="#94a3b8"
                      strokeWidth={1}
                      strokeDasharray="8,8"
                    />
                    <text
                      x={(road.x1 + road.x2) / 2}
                      y={(road.y1 + road.y2) / 2 - 10}
                      fill="#64748b"
                      fontSize={9}
                      textAnchor="middle"
                    >
                      {road.name}
                    </text>
                  </g>
                ))}

                {/* Amenities Layer */}
                {canvas.amenities.map((amenity, i) => (
                  <g key={`amenity-${i}`}>
                    <rect
                      x={amenity.x}
                      y={amenity.y}
                      width={amenity.width}
                      height={amenity.height}
                      fill={amenity.color}
                      opacity={0.3}
                      stroke={amenity.color}
                      strokeWidth={1.5}
                      rx={8}
                    />
                    <text
                      x={amenity.x + amenity.width / 2}
                      y={amenity.y + amenity.height / 2 + 4}
                      fill="#fff"
                      fontSize={11}
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {amenity.name}
                    </text>
                  </g>
                ))}

                {/* Plots Layer */}
                {filteredPlots.map((plot) => {
                  const isSelected = selectedPlot?.id === plot.id
                  const isMine = plot.is_my_plot
                  const isAvailable = plot.status === 'available'
                  const isReserved = plot.status === 'reserved'

                  // Color mapping
                  let fillColor = '#1e293b'
                  let strokeColor = '#475569'

                  if (isMine) {
                    fillColor = '#854d0e'
                    strokeColor = '#fbbf24'
                  } else if (isAvailable) {
                    fillColor = '#065f46'
                    strokeColor = '#10b981'
                  } else if (isReserved) {
                    fillColor = '#78350f'
                    strokeColor = '#f59e0b'
                  }

                  return (
                    <g
                      key={`plot-${plot.id}`}
                      onClick={() => handlePlotClick(plot)}
                      style={{ cursor: 'pointer' }}
                    >
                      <rect
                        x={plot.map_layout.x}
                        y={plot.map_layout.y}
                        width={plot.map_layout.width}
                        height={plot.map_layout.height}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={isSelected ? 3.5 : 1.5}
                        className={`svg-plot-rect ${isSelected ? 'selected' : ''} ${isMine ? 'mine' : ''}`}
                      />
                      <text
                        x={plot.map_layout.x + plot.map_layout.width / 2}
                        y={plot.map_layout.y + plot.map_layout.height / 2 - 6}
                        className="svg-plot-label"
                      >
                        {plot.unit_number}
                      </text>
                      <text
                        x={plot.map_layout.x + plot.map_layout.width / 2}
                        y={plot.map_layout.y + plot.map_layout.height / 2 + 10}
                        className="svg-plot-sub"
                      >
                        {plot.dimensions}
                      </text>
                      <text
                        x={plot.map_layout.x + plot.map_layout.width / 2}
                        y={plot.map_layout.y + plot.map_layout.height / 2 + 24}
                        fill={isMine ? '#fbbf24' : isAvailable ? '#34d399' : '#94a3b8'}
                        fontSize={8}
                        fontWeight="600"
                        textAnchor="middle"
                      >
                        {isMine ? 'MY PLOT' : isAvailable ? formatUGX(plot.current_price) : plot.status.toUpperCase()}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>
          </div>

          {/* Plot Inspector Side Panel */}
          {selectedPlot ? (
            <div className="plot-inspector-card">
              <div className="plot-inspector-header">
                <div>
                  <h4 style={{ margin: 0, fontSize: 16, color: '#fff' }}>
                    {selectedPlot.unit_number}
                  </h4>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                    {selectedPlot.name} • {selectedPlot.zone}
                  </div>
                </div>

                <span
                  className={`plot-inspector-badge ${
                    selectedPlot.is_my_plot
                      ? 'mine'
                      : selectedPlot.status === 'available'
                      ? 'available'
                      : selectedPlot.status === 'reserved'
                      ? 'reserved'
                      : 'sold'
                  }`}
                >
                  {selectedPlot.is_my_plot
                    ? 'My Plot'
                    : selectedPlot.status === 'available'
                    ? 'Available'
                    : selectedPlot.status === 'reserved'
                    ? 'Reserved'
                    : 'Sold'}
                </span>
              </div>

              {/* Price Banner */}
              <div
                style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Total Plot Value</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#38bdf8' }}>
                  {formatUGX(selectedPlot.current_price)}
                </div>
                <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 4 }}>
                  Tenure: <strong>{selectedPlot.tenure_type}</strong>
                </div>
              </div>

              {/* Technical Specifications Grid */}
              <div className="spec-grid">
                <div className="spec-item">
                  <span className="spec-label">Dimensions</span>
                  <span className="spec-value">{selectedPlot.dimensions}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Area (SQM)</span>
                  <span className="spec-value">{selectedPlot.area} sqm</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Soil Classification</span>
                  <span className="spec-value">{selectedPlot.soil_type}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Topography</span>
                  <span className="spec-value">{selectedPlot.topography}</span>
                </div>
              </div>

              {/* Infrastructure Checklist */}
              <div style={{ margin: '14px 0' }}>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>
                  ESTATE INFRASTRUCTURE & AMENITIES
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedPlot.features.map((feat, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#cbd5e1' }}>
                      <MdCheckCircle style={{ color: '#10b981', fontSize: 14 }} />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: 20 }}>
                {selectedPlot.is_my_plot ? (
                  <button
                    className="portal-btn-primary"
                    style={{ width: '100%', background: '#fbbf24', color: '#090d16' }}
                    onClick={onOpenDeeds}
                  >
                    Track Land Title & Deed Progress →
                  </button>
                ) : selectedPlot.status === 'available' ? (
                  <button
                    className="portal-btn-primary"
                    style={{ width: '100%' }}
                    onClick={() => handleOpenReserve(selectedPlot)}
                  >
                    <MdLock /> Reserve This Plot (UGX 500,000)
                  </button>
                ) : selectedPlot.status === 'reserved' ? (
                  <div style={{ textAlign: 'center', fontSize: 12, color: '#fbbf24', padding: 8 }}>
                    <MdWarning /> This plot is on a 14-day reservation hold.
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', padding: 8 }}>
                    This plot has been sold and allocated.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="plot-inspector-card" style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              Select any plot on the masterplan map to inspect details.
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: GRID CARDS LIST */}
      {viewMode === 'grid' && (
        <div className="plots-cards-grid">
          {filteredPlots.map((plot) => (
            <div
              key={plot.id}
              className={`plot-card ${plot.is_my_plot ? 'is-mine' : ''}`}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15, color: '#fff' }}>{plot.unit_number}</h4>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{plot.zone}</span>
                  </div>
                  <span
                    className={`plot-inspector-badge ${
                      plot.is_my_plot
                        ? 'mine'
                        : plot.status === 'available'
                        ? 'available'
                        : plot.status === 'reserved'
                        ? 'reserved'
                        : 'sold'
                    }`}
                  >
                    {plot.is_my_plot ? 'My Plot' : plot.status}
                  </span>
                </div>

                <div style={{ fontSize: 16, fontWeight: 700, color: '#38bdf8', marginBottom: 10 }}>
                  {formatUGX(plot.current_price)}
                </div>

                <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 }}>
                  <div>Dimensions: <strong>{plot.dimensions}</strong></div>
                  <div>Area: <strong>{plot.area} sqm</strong></div>
                  <div>Tenure: <strong>{plot.tenure_type}</strong></div>
                  <div>Soil: <strong>{plot.soil_type}</strong></div>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                {plot.status === 'available' ? (
                  <button
                    className="portal-btn-primary"
                    style={{ width: '100%', padding: '8px' }}
                    onClick={() => handleOpenReserve(plot)}
                  >
                    Reserve (500K UGX)
                  </button>
                ) : plot.is_my_plot ? (
                  <button
                    className="portal-btn-secondary"
                    style={{ width: '100%', padding: '8px', color: '#fbbf24' }}
                    onClick={onOpenDeeds}
                  >
                    View Title Deed Status
                  </button>
                ) : (
                  <button
                    className="portal-btn-secondary"
                    style={{ width: '100%', padding: '8px' }}
                    disabled
                  >
                    {plot.status === 'reserved' ? 'Reserved' : 'Sold'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PLOT RESERVATION CHECKOUT MODAL */}
      {showReserveModal && reservePlotTarget && (
        <div className="checkout-modal-overlay">
          <div className="checkout-modal">
            <div className="checkout-modal-header">
              <h3 style={{ margin: 0, fontSize: 18, color: '#fff' }}>
                Reserve Plot {reservePlotTarget.unit_number}
              </h3>
              <button
                className="modal-close-btn"
                onClick={() => setShowReserveModal(false)}
              >
                <MdClose />
              </button>
            </div>

            {!reservationReceipt ? (
              <form onSubmit={handleSubmitReservation}>
                {/* Hold Guarantee Alert */}
                <div
                  style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: 10,
                    padding: 12,
                    fontSize: 12,
                    color: '#fde68a',
                    marginBottom: 16,
                    lineHeight: 1.5,
                  }}
                >
                  <strong>Guaranteed 14-Day Reservation Hold:</strong> Submitting this booking deposit
                  locks Plot <strong>{reservePlotTarget.unit_number}</strong> exclusively for your account,
                  preventing other buyers from acquiring it while you finalize contract paperwork.
                </div>

                {/* Plot Summary */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'var(--portal-bg-card-subtle)',
                    borderRadius: 8,
                    marginBottom: 16,
                    fontSize: 13,
                  }}
                >
                  <div>
                    <span style={{ color: '#94a3b8' }}>Total Plot Value:</span>{' '}
                    <strong>{formatUGX(reservePlotTarget.current_price)}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Dimensions:</span>{' '}
                    <strong>{reservePlotTarget.dimensions}</strong>
                  </div>
                </div>

                {/* Deposit Amount */}
                <div className="portal-input-group">
                  <label>Required Booking Deposit (UGX)</label>
                  <input
                    type="number"
                    min={100000}
                    step={50000}
                    value={reservationFee}
                    onChange={(e) => setReservationFee(Number(e.target.value))}
                    className="portal-input"
                    required
                  />
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    Standard booking fee is UGX 500,000 (credited towards total land price).
                  </div>
                </div>

                {/* Gateway Picker */}
                <div className="portal-input-group">
                  <label>Select Payment Method</label>
                  <div className="gateway-picker-grid">
                    <button
                      type="button"
                      className={`gateway-card-btn ${gateway === 'mtn_momo' ? 'active' : ''}`}
                      onClick={() => setGateway('mtn_momo')}
                    >
                      <MdPhoneIphone style={{ fontSize: 24, color: '#fbbf24' }} />
                      <div>
                        <div className="gw-title">MTN MoMo</div>
                        <div className="gw-sub">Instant Prompt</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`gateway-card-btn ${gateway === 'airtel_money' ? 'active' : ''}`}
                      onClick={() => setGateway('airtel_money')}
                    >
                      <MdPhoneIphone style={{ fontSize: 24, color: '#ef4444' }} />
                      <div>
                        <div className="gw-title">Airtel Money</div>
                        <div className="gw-sub">USSD Prompt</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`gateway-card-btn ${gateway === 'stanbic_bank' ? 'active' : ''}`}
                      onClick={() => setGateway('stanbic_bank')}
                    >
                      <MdCreditCard style={{ fontSize: 24, color: '#3b82f6' }} />
                      <div>
                        <div className="gw-title">Stanbic Visa</div>
                        <div className="gw-sub">Bank & Card</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Phone Number */}
                <div className="portal-input-group">
                  <label>Phone Number for Mobile Prompt</label>
                  <input
                    type="tel"
                    placeholder="+256 700 000 000"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="portal-input"
                  />
                </div>

                {/* Notes */}
                <div className="portal-input-group">
                  <label>Client Notes / Construction Intent (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Intend to build 4-bedroom bungalow in Q1"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="portal-input"
                  />
                </div>

                <button
                  type="submit"
                  className="portal-btn-primary"
                  style={{ width: '100%', padding: 12, marginTop: 12 }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Locking Reservation...' : `Confirm & Pay ${formatUGX(reservationFee)}`}
                </button>
              </form>
            ) : (
              /* Step 2: Instant Booking Receipt */
              <div>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      background: 'rgba(16, 185, 129, 0.2)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px auto',
                      color: '#10b981',
                      fontSize: 28,
                    }}
                  >
                    <MdCheckCircle />
                  </div>
                  <h4 style={{ margin: 0, fontSize: 18, color: '#fff' }}>Plot Successfully Reserved!</h4>
                  <p style={{ margin: '6px 0 0 0', fontSize: 13, color: '#94a3b8' }}>
                    14-day exclusive lock confirmed for Plot {reservationReceipt.reservation.unit_number}.
                  </p>
                </div>

                {/* Printable Receipt Card */}
                <div className="receipt-paper">
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--portal-border)', paddingBottom: 8, marginBottom: 8 }}>
                    <span style={{ color: '#94a3b8' }}>Receipt Number:</span>
                    <strong>{reservationReceipt.receipt.receipt_number}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--portal-border)', paddingBottom: 8, marginBottom: 8 }}>
                    <span style={{ color: '#94a3b8' }}>Reservation Number:</span>
                    <strong>{reservationReceipt.reservation.reservation_number}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--portal-border)', paddingBottom: 8, marginBottom: 8 }}>
                    <span style={{ color: '#94a3b8' }}>Amount Paid:</span>
                    <strong style={{ color: '#10b981' }}>{formatUGX(reservationReceipt.receipt.amount)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--portal-border)', paddingBottom: 8, marginBottom: 8 }}>
                    <span style={{ color: '#94a3b8' }}>Hold Expiry:</span>
                    <strong style={{ color: '#fbbf24' }}>
                      {new Date(reservationReceipt.reservation.expires_at).toLocaleDateString()} (14 Days)
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4 }}>
                    <span style={{ color: '#94a3b8' }}>Beneficiary:</span>
                    <span>{reservationReceipt.receipt.beneficiary}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button
                    className="portal-btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => setShowReserveModal(false)}
                  >
                    Close & Continue
                  </button>
                  <button
                    className="portal-btn-secondary"
                    onClick={() => window.print()}
                  >
                    <MdReceipt /> Print Receipt
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ClientInteractiveEstateMapTab
