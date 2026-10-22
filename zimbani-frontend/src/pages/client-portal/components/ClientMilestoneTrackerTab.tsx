import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MdConstruction,
  MdPhotoCamera,
  MdArrowForward,
  MdRefresh,
} from 'react-icons/md'
import { clientPortalSavingsService } from '../../../services/client-portal-savings.service'
import { MilestoneProgressTracker } from '../../../types/client-portal-savings.types'
import './ClientSavingsTab.css'

interface ClientMilestoneTrackerTabProps {
  onNotify?: (msg: string, type: 'success' | 'error') => void
}

export const ClientMilestoneTrackerTab: React.FC<ClientMilestoneTrackerTabProps> = ({ onNotify }) => {
  const navigate = useNavigate()
  const [trackers, setTrackers] = useState<MilestoneProgressTracker[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const loadTrackers = async () => {
    setLoading(true)
    try {
      const res = await clientPortalSavingsService.getMilestoneTrackers()
      setTrackers(res.trackers)
    } catch (err: any) {
      if (onNotify) onNotify(err.message || 'Failed to load milestone trackers', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTrackers()
  }, [])

  const formatUGX = (val: number) => {
    return 'UGX ' + Math.round(val).toLocaleString()
  }

  if (loading && trackers.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
        <MdConstruction style={{ fontSize: 36, color: '#fbbf24', marginBottom: 12 }} />
        <div>Loading your construction milestone trackers...</div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: 18, color: '#fff' }}>
            Construction Milestone Progress Trackers
          </h3>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            Track physical construction completion, QS valuations, and escrow fund releases across your plots.
          </span>
        </div>

        <button className="portal-btn-secondary" onClick={() => loadTrackers()}>
          <MdRefresh /> Refresh Trackers
        </button>
      </div>

      {trackers.length === 0 ? (
        <div className="portal-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <MdConstruction style={{ fontSize: 48, color: '#64748b', marginBottom: 12 }} />
          <h4 style={{ color: '#fff', margin: '0 0 6px 0' }}>No Construction Units Allocated Yet</h4>
          <p style={{ fontSize: 13, color: '#94a3b8', maxWidth: 440, margin: '0 auto 16px auto' }}>
            Once you reserve an estate plot and begin saving toward construction, your milestone timeline will appear
            here in real-time.
          </p>
          <button className="portal-btn-primary" onClick={() => navigate('/client-portal/milestones')}>
            Explore Milestone Verification Demo
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {trackers.map((t) => (
            <div key={t.unit_uuid} className="portal-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                      {t.project_name} • Plot {t.unit_number}
                    </span>
                    <span className="portal-badge portal-badge-online">
                      {t.unit_status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    {t.unit_name || 'Residential Unit'} • {t.project_location}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#38bdf8' }}>
                    {t.completion_pct}%
                  </div>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Physical Completion</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="savings-progress-track" style={{ height: 8, margin: '16px 0 10px 0' }}>
                <div
                  className="savings-progress-fill"
                  style={{ width: `${Math.min(100, t.completion_pct)}%` }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>
                <span>Completed: {t.completed_milestones} of {t.total_milestones} Milestones</span>
                <span>In Progress: {t.in_progress_milestones} Stage(s)</span>
              </div>

              {/* Active Milestone Card */}
              {t.current_milestone && (
                <div
                  style={{
                    background: '#090d16',
                    border: '1px solid #1e293b',
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontSize: 11, color: '#fbbf24', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>
                    Current Active Stage
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
                    {t.current_milestone.title}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    Planned Completion: {t.current_milestone.target_completion_date || 'Pending Schedule'} • Status: {t.current_milestone.status}
                  </div>
                </div>
              )}

              {/* Latest QS Verification Status */}
              {t.latest_verification && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, marginBottom: 16, padding: '8px 12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: 8 }}>
                  <div>
                    <strong style={{ color: '#60a5fa' }}>Latest Inspection:</strong> {t.latest_verification.stage} (
                    {t.latest_verification.inspection_date})
                  </div>
                  <div>
                    QS Valuation: <strong>{formatUGX(t.latest_verification.qs_certified_amount)}</strong>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="portal-btn-primary"
                  style={{ flex: 1, padding: '10px 16px' }}
                  onClick={() => navigate('/client-portal/milestones')}
                >
                  <MdPhotoCamera /> Review Site Photos & Sign Off <MdArrowForward />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ClientMilestoneTrackerTab
