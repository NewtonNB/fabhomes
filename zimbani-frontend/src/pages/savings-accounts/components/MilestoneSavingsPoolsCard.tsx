import React, { useState, useEffect, useCallback } from 'react'
import {
  MdCheckCircle,
  MdWarning,
  MdErrorOutline,
  MdRefresh,
  MdLock,
  MdSwapHoriz,
  MdAttachMoney,
  MdClose,
  MdHistory,
  MdPlayArrow,
  MdConstruction,
  MdLayers,
} from 'react-icons/md'
import constructionSavingSchemeService from '../../../services/construction-scheme.service'
import {
  ConstructionSavingScheme,
  MilestoneSavingsPool,
  AccountReadinessAudit,
} from '../../../types/construction-scheme.types'
import { Project } from '../../../types/project.types'

interface MilestoneSavingsPoolsCardProps {
  accountUuid: string
  accountBalance: number
  accountCurrency: string
  projects?: Project[]
  onUpdated?: () => void
}

export const MilestoneSavingsPoolsCard: React.FC<MilestoneSavingsPoolsCardProps> = ({
  accountUuid,
  accountBalance,
  accountCurrency,
  projects = [],
  onUpdated,
}) => {
  const [pools, setPools] = useState<MilestoneSavingsPool[]>([])
  const [audit, setAudit] = useState<AccountReadinessAudit | null>(null)
  const [schemes, setSchemes] = useState<ConstructionSavingScheme[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Modals
  const [showEnrollModal, setShowEnrollModal] = useState<boolean>(false)
  const [showAllocateModal, setShowAllocateModal] = useState<boolean>(false)
  const [showRebalanceModal, setShowRebalanceModal] = useState<boolean>(false)
  const [showLockModal, setShowLockModal] = useState<boolean>(false)
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false)

  // Selected pool for actions
  const [selectedPool, setSelectedPool] = useState<MilestoneSavingsPool | null>(null)

  // Form states
  const [enrollForm, setEnrollForm] = useState({
    scheme_uuid: '',
    project_id: '',
  })

  const [allocateForm, setAllocateForm] = useState<{
    amount: string
    mode: 'waterfall' | 'custom'
    custom: Record<number, string>
  }>({
    amount: '',
    mode: 'waterfall',
    custom: {},
  })

  const [rebalanceForm, setRebalanceForm] = useState({
    from_pool_id: '',
    to_pool_id: '',
    amount: '',
    reason: '',
  })

  const [lockAmount, setLockAmount] = useState<string>('')

  // Load account pools and schemes
  const loadPoolsData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await constructionSavingSchemeService.getAccountPools(accountUuid)
      setPools(res.pools || [])
      setAudit(res.audit || null)
    } catch (err: any) {
      console.error('Failed to load milestone pools', err)
      setError(err.response?.data?.message || 'Failed to load tiered milestone pools')
    } finally {
      setLoading(false)
    }
  }, [accountUuid])

  const loadSchemes = useCallback(async () => {
    try {
      let res = await constructionSavingSchemeService.getSchemes({ is_active: true })
      if (!res.data || res.data.length === 0) {
        // Auto-seed standard templates if none exist
        const seeded = await constructionSavingSchemeService.seedDefaults()
        setSchemes(seeded)
      } else {
        setSchemes(res.data)
      }
    } catch (err: any) {
      console.error('Failed to load construction schemes', err)
    }
  }, [])

  useEffect(() => {
    loadPoolsData()
    loadSchemes()
  }, [loadPoolsData, loadSchemes])

  const refreshAll = () => {
    loadPoolsData()
    if (onUpdated) onUpdated()
  }

  // Format currency helper
  const fmt = (amt: number | string | undefined | null) => {
    const val = Number(amt) || 0
    return `${accountCurrency} ${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  }

  // Handle Enroll Account
  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!enrollForm.scheme_uuid) {
      setError('Please select a Construction Saving Scheme template.')
      return
    }

    try {
      setActionLoading(true)
      setError(null)
      await constructionSavingSchemeService.enrollAccount(accountUuid, {
        scheme_uuid: enrollForm.scheme_uuid,
        project_id: enrollForm.project_id ? Number(enrollForm.project_id) : undefined,
      })
      setSuccessMsg('Account enrolled in Construction Saving Scheme! Milestone pools generated.')
      setShowEnrollModal(false)
      refreshAll()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to enroll in scheme')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Allocate Deposit
  const handleOpenAllocate = () => {
    const unallocated = audit?.unallocated_balance ?? 0
    setAllocateForm({
      amount: unallocated > 0 ? String(unallocated) : '',
      mode: 'waterfall',
      custom: {},
    })
    setShowAllocateModal(true)
  }

  const handleSubmitAllocate = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = Number(allocateForm.amount)
    if (!amt || amt <= 0) {
      setError('Please enter a valid amount to allocate.')
      return
    }

    try {
      setActionLoading(true)
      setError(null)
      await constructionSavingSchemeService.allocateDeposit(accountUuid, {
        amount: amt,
        mode: allocateForm.mode,
      })
      setSuccessMsg(`Successfully allocated ${fmt(amt)} across milestone pools via ${allocateForm.mode}!`)
      setShowAllocateModal(false)
      refreshAll()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to allocate deposit')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Rebalance
  const handleOpenRebalance = (fromPool?: MilestoneSavingsPool) => {
    setRebalanceForm({
      from_pool_id: fromPool ? String(fromPool.id) : '',
      to_pool_id: '',
      amount: '',
      reason: '',
    })
    setShowRebalanceModal(true)
  }

  const handleSubmitRebalance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rebalanceForm.from_pool_id || !rebalanceForm.to_pool_id || !rebalanceForm.amount) {
      setError('Please select both pools and specify the rebalance amount.')
      return
    }

    try {
      setActionLoading(true)
      setError(null)
      await constructionSavingSchemeService.rebalancePools(accountUuid, {
        from_pool_id: Number(rebalanceForm.from_pool_id),
        to_pool_id: Number(rebalanceForm.to_pool_id),
        amount: Number(rebalanceForm.amount),
        reason: rebalanceForm.reason || 'Manual reallocation of construction savings',
      })
      setSuccessMsg('Milestone savings pools rebalanced successfully.')
      setShowRebalanceModal(false)
      refreshAll()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to rebalance pools')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Lock Pool in Escrow
  const handleOpenLock = (pool: MilestoneSavingsPool) => {
    setSelectedPool(pool)
    setLockAmount(String(pool.available_to_lock))
    setShowLockModal(true)
  }

  const handleSubmitLock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPool) return

    try {
      setActionLoading(true)
      setError(null)
      await constructionSavingSchemeService.lockPool(selectedPool.uuid, {
        amount: lockAmount ? Number(lockAmount) : undefined,
      })
      setSuccessMsg(
        `Tier ${selectedPool.tier_order} (${selectedPool.milestone_name}) locked in escrow! Site work authorized to commence.`
      )
      setShowLockModal(false)
      refreshAll()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to lock pool in escrow')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle View History
  const handleOpenHistory = (pool: MilestoneSavingsPool) => {
    setSelectedPool(pool)
    setShowHistoryModal(true)
  }

  return (
    <div className="details-card" style={{ marginTop: '1.5rem' }}>
      {/* Messages */}
      {error && (
        <div className="milestone-alert danger" style={{ margin: '0 0 1rem 0' }}>
          <MdErrorOutline style={{ fontSize: '1.25rem' }} />
          <span>{error}</span>
          <button className="alert-close-btn" onClick={() => setError(null)}>
            <MdClose />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="milestone-alert success" style={{ margin: '0 0 1rem 0' }}>
          <MdCheckCircle style={{ fontSize: '1.25rem' }} />
          <span>{successMsg}</span>
          <button className="alert-close-btn" onClick={() => setSuccessMsg(null)}>
            <MdClose />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="details-card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <MdLayers style={{ color: '#2563eb' }} />
            Tiered Milestone Savings Pools
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
            Sequential savings pools dedicated to specific construction milestones (Substructure to Handover).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {pools.length === 0 ? (
            <button className="btn btn-primary btn-sm" onClick={() => setShowEnrollModal(true)}>
              <MdConstruction /> Enroll in Construction Scheme
            </button>
          ) : (
            <>
              {audit && audit.unallocated_balance > 0 && (
                <button className="btn btn-success btn-sm" onClick={handleOpenAllocate}>
                  <MdAttachMoney /> Allocate Savings ({fmt(audit.unallocated_balance)})
                </button>
              )}
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleOpenRebalance()}
                title="Rebalance funds between milestone tiers"
              >
                <MdSwapHoriz /> Rebalance
              </button>
              <button className="btn btn-secondary btn-sm" onClick={refreshAll} title="Refresh milestone pools">
                <MdRefresh />
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 0.75rem' }} />
          Loading tiered milestone savings pools...
        </div>
      ) : pools.length === 0 ? (
        <div className="details-empty-state" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <MdConstruction style={{ fontSize: '3rem', color: '#94a3b8', marginBottom: '0.5rem' }} />
          <h3 style={{ margin: '0 0 0.5rem 0' }}>No Construction Scheme Enrolled</h3>
          <p style={{ color: '#64748b', maxWidth: '500px', margin: '0 auto 1.25rem' }}>
            This construction savings account has not been enrolled into a sequential milestone savings scheme yet.
            Enroll now to establish automated 5-6 tier milestone savings pools (Substructure, Superstructure, Roofing, etc.).
          </p>
          <button className="btn btn-primary" onClick={() => setShowEnrollModal(true)}>
            <MdPlayArrow /> Choose Scheme Template & Generate Pools
          </button>
        </div>
      ) : (
        <div>
          {/* Readiness & Funding Summary Hero Card */}
          {audit && (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1.25rem',
                marginBottom: '1.5rem',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1rem',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                    Scheme Template
                  </span>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>{audit.scheme_name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#2563eb' }}>
                    {audit.waterfall_enabled ? 'Waterfall Auto-Allocation Active' : 'Custom Allocation'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                    Total Target
                  </span>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1.1rem' }}>
                    {fmt(audit.total_target)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Saved: <strong>{fmt(accountBalance)}</strong> ({audit.overall_progress_percentage}%)
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                    Locked in Escrow
                  </span>
                  <div style={{ fontWeight: 700, color: '#b45309', fontSize: '1.1rem' }}>
                    {fmt(audit.total_locked)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Committed to site works</div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                    Disbursed Releases
                  </span>
                  <div style={{ fontWeight: 700, color: '#059669', fontSize: '1.1rem' }}>
                    {fmt(audit.total_disbursed)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Paid upon physical sign-off</div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                    Unallocated Balance
                  </span>
                  <div style={{ fontWeight: 700, color: '#2563eb', fontSize: '1.1rem' }}>
                    {fmt(audit.unallocated_balance)}
                  </div>
                  {audit.unallocated_balance > 0 ? (
                    <button
                      onClick={handleOpenAllocate}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#059669',
                        padding: 0,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      Stream to next pool →
                    </button>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>100% savings allocated</div>
                  )}
                </div>
              </div>

              {/* Readiness Banner */}
              {audit.active_milestone_pool ? (
                <div
                  style={{
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '6px',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MdConstruction style={{ color: '#2563eb', fontSize: '1.25rem' }} />
                    <span style={{ fontSize: '0.875rem', color: '#1e3a8a' }}>
                      <strong>Active Site Construction:</strong> Tier {audit.active_milestone_pool.tier_order} (
                      {audit.active_milestone_pool.milestone_name}) is currently underway. Locked in escrow:{' '}
                      <strong>{fmt(audit.active_milestone_pool.locked_amount)}</strong>.
                    </span>
                  </div>
                </div>
              ) : audit.next_milestone_pool && audit.next_milestone_pool.can_commence ? (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MdCheckCircle style={{ color: '#16a34a', fontSize: '1.25rem' }} />
                    <span style={{ fontSize: '0.875rem', color: '#166534' }}>
                      <strong>Ready to Build:</strong> Tier {audit.next_milestone_pool.tier_order} (
                      {audit.next_milestone_pool.milestone_name}) is <strong>100% funded</strong>! You can now lock funds
                      in escrow and authorize site work.
                    </span>
                  </div>
                  {(() => {
                    const nextP = pools.find((p) => p.id === audit.next_milestone_pool?.id)
                    return (
                      nextP && (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleOpenLock(nextP)}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <MdLock /> Lock in Escrow & Start Site Work
                        </button>
                      )
                    )
                  })()}
                </div>
              ) : audit.next_milestone_pool ? (
                <div
                  style={{
                    background: '#fffbeb',
                    border: '1px solid #fef3c7',
                    borderRadius: '6px',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <MdWarning style={{ color: '#d97706', fontSize: '1.25rem' }} />
                  <span style={{ fontSize: '0.875rem', color: '#92400e' }}>
                    <strong>Next Milestone:</strong> Tier {audit.next_milestone_pool.tier_order} (
                    {audit.next_milestone_pool.milestone_name}) requires{' '}
                    <strong>{fmt(audit.next_milestone_pool.shortfall)}</strong> more in savings before construction can
                    commence.
                  </span>
                </div>
              ) : null}
            </div>
          )}

          {/* Tiered Milestone Pools Tracks */}
          <div className="table-responsive">
            <table className="milestone-data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Tier</th>
                  <th>Milestone & Scope</th>
                  <th>Target Threshold</th>
                  <th>Allocated Savings</th>
                  <th>Funding Progress</th>
                  <th>Locked in Escrow</th>
                  <th>Disbursed</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pools.map((p) => (
                  <tr key={p.uuid}>
                    {/* Tier */}
                    <td>
                      <span
                        style={{
                          background: '#f1f5f9',
                          color: '#475569',
                          fontWeight: 700,
                          borderRadius: '4px',
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.8rem',
                        }}
                      >
                        #{p.tier_order}
                      </span>
                    </td>

                    {/* Milestone & Scope */}
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.milestone_name}</div>
                      {p.description && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                          {p.description}
                        </div>
                      )}
                      {p.construction_milestone && (
                        <div style={{ fontSize: '0.7rem', color: '#2563eb', marginTop: '0.25rem' }}>
                          Linked Site Milestone: {p.construction_milestone.milestone_name} (
                          {p.construction_milestone.completion_percentage}% complete)
                        </div>
                      )}
                    </td>

                    {/* Target */}
                    <td>
                      <div style={{ fontWeight: 600, color: '#334155' }}>{fmt(p.target_amount)}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Weight: {p.weight_percentage}%</div>
                    </td>

                    {/* Allocated */}
                    <td>
                      <div style={{ fontWeight: 700, color: '#2563eb' }}>{fmt(p.allocated_amount)}</div>
                      {p.remaining_to_target > 0 ? (
                        <div style={{ fontSize: '0.75rem', color: '#d97706' }}>
                          Shortfall: {fmt(p.remaining_to_target)}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <MdCheckCircle size={13} /> 100% Funded
                        </div>
                      )}
                    </td>

                    {/* Progress Track */}
                    <td style={{ minWidth: '130px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <div
                          style={{
                            flex: 1,
                            background: '#e2e8f0',
                            borderRadius: '999px',
                            height: '6px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${p.funding_percentage}%`,
                              background:
                                p.funding_percentage >= 100
                                  ? '#16a34a'
                                  : p.funding_percentage > 0
                                  ? '#2563eb'
                                  : '#cbd5e1',
                              height: '100%',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{p.funding_percentage}%</span>
                      </div>
                    </td>

                    {/* Locked in Escrow */}
                    <td>
                      <div
                        style={{
                          fontWeight: 600,
                          color: Number(p.locked_amount) > 0 ? '#b45309' : '#94a3b8',
                        }}
                      >
                        {fmt(p.locked_amount)}
                      </div>
                    </td>

                    {/* Disbursed */}
                    <td>
                      <div
                        style={{
                          fontWeight: 600,
                          color: Number(p.disbursed_amount) > 0 ? '#059669' : '#94a3b8',
                        }}
                      >
                        {fmt(p.disbursed_amount)}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td>
                      <span className={`pill ${p.status}`}>{p.status.replace('_', ' ')}</span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                        {/* Lock in Escrow button */}
                        {p.can_commence_work && Number(p.locked_amount) === 0 && Number(p.disbursed_amount) === 0 && (
                          <button
                            className="action-icon-btn green"
                            title="Lock funds in escrow to authorize site work"
                            onClick={() => handleOpenLock(p)}
                          >
                            <MdLock />
                          </button>
                        )}

                        {/* Rebalance from this pool */}
                        {p.available_to_lock > 0 && (
                          <button
                            className="action-icon-btn blue"
                            title="Rebalance funds out of this pool"
                            onClick={() => handleOpenRebalance(p)}
                          >
                            <MdSwapHoriz />
                          </button>
                        )}

                        {/* History */}
                        <button
                          className="action-icon-btn gray"
                          title="View pool allocations history"
                          onClick={() => handleOpenHistory(p)}
                        >
                          <MdHistory />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: ENROLL IN CONSTRUCTION SAVING SCHEME             */}
      {/* ========================================================= */}
      {showEnrollModal && (
        <div className="milestone-modal-overlay">
          <div className="milestone-modal-container" style={{ maxWidth: '580px' }}>
            <div className="milestone-modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <MdConstruction style={{ color: '#2563eb' }} />
                Enroll in Construction Saving Scheme
              </h3>
              <button className="modal-close-btn" onClick={() => setShowEnrollModal(false)}>
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleEnroll}>
              <div className="milestone-modal-body">
                <p style={{ color: '#475569', fontSize: '0.875rem', marginTop: 0 }}>
                  Select a standardized or bespoke construction scheme. The system will automatically create 5 to 6
                  sequential milestone pools with predefined weight percentages.
                </p>

                <div className="form-group">
                  <label>Construction Scheme Template *</label>
                  <select
                    value={enrollForm.scheme_uuid}
                    onChange={(e) => setEnrollForm({ ...enrollForm, scheme_uuid: e.target.value })}
                    required
                  >
                    <option value="">-- Select Construction Scheme --</option>
                    {schemes.map((s) => (
                      <option key={s.uuid} value={s.uuid}>
                        {s.name} ({s.currency} {Number(s.standard_target_amount).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label>Linked Project (Optional)</label>
                  <select
                    value={enrollForm.project_id}
                    onChange={(e) => setEnrollForm({ ...enrollForm, project_id: e.target.value })}
                  >
                    <option value="">-- General Project (Link Later) --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.code ? `(${p.code})` : ''}
                      </option>
                    ))}
                  </select>
                  <small style={{ color: '#64748b' }}>
                    If selected, milestone pools will automatically link to the project's physical construction milestones.
                  </small>
                </div>
              </div>

              <div className="milestone-modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowEnrollModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Enrolling...' : 'Enroll & Generate Pools'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: ALLOCATE SAVINGS (WATERFALL / CUSTOM)             */}
      {/* ========================================================= */}
      {showAllocateModal && (
        <div className="milestone-modal-overlay">
          <div className="milestone-modal-container" style={{ maxWidth: '520px' }}>
            <div className="milestone-modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <MdAttachMoney style={{ color: '#059669' }} />
                Allocate Savings to Milestone Pools
              </h3>
              <button className="modal-close-btn" onClick={() => setShowAllocateModal(false)}>
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleSubmitAllocate}>
              <div className="milestone-modal-body">
                <div
                  style={{
                    background: '#f8fafc',
                    padding: '0.75rem 1rem',
                    borderRadius: '6px',
                    marginBottom: '1rem',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Unallocated Account Balance:</div>
                  <div style={{ fontWeight: 700, color: '#2563eb', fontSize: '1.2rem' }}>
                    {fmt(audit?.unallocated_balance)}
                  </div>
                </div>

                <div className="form-group">
                  <label>Amount to Allocate ({accountCurrency}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={allocateForm.amount}
                    onChange={(e) => setAllocateForm({ ...allocateForm, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label>Allocation Strategy</label>
                  <select
                    value={allocateForm.mode}
                    onChange={(e) =>
                      setAllocateForm({ ...allocateForm, mode: e.target.value as 'waterfall' | 'custom' })
                    }
                  >
                    <option value="waterfall">Waterfall (Sequentially fill Tier 1, then Tier 2, etc.)</option>
                  </select>
                  <small style={{ color: '#64748b' }}>
                    Waterfall streams deposits in order of milestone construction priority until each reaches 100%.
                  </small>
                </div>
              </div>

              <div className="milestone-modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowAllocateModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Allocating...' : 'Run Waterfall Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: REBALANCE FUNDS BETWEEN POOLS                     */}
      {/* ========================================================= */}
      {showRebalanceModal && (
        <div className="milestone-modal-overlay">
          <div className="milestone-modal-container" style={{ maxWidth: '520px' }}>
            <div className="milestone-modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <MdSwapHoriz style={{ color: '#2563eb' }} />
                Rebalance Funds Between Milestone Pools
              </h3>
              <button className="modal-close-btn" onClick={() => setShowRebalanceModal(false)}>
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleSubmitRebalance}>
              <div className="milestone-modal-body">
                <div className="form-group">
                  <label>Source Milestone Pool (Move OUT) *</label>
                  <select
                    value={rebalanceForm.from_pool_id}
                    onChange={(e) => setRebalanceForm({ ...rebalanceForm, from_pool_id: e.target.value })}
                    required
                  >
                    <option value="">-- Select Source Pool --</option>
                    {pools
                      .filter((p) => p.available_to_lock > 0)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          Tier {p.tier_order}: {p.milestone_name} (Available: {fmt(p.available_to_lock)})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label>Destination Milestone Pool (Move IN) *</label>
                  <select
                    value={rebalanceForm.to_pool_id}
                    onChange={(e) => setRebalanceForm({ ...rebalanceForm, to_pool_id: e.target.value })}
                    required
                  >
                    <option value="">-- Select Destination Pool --</option>
                    {pools
                      .filter((p) => String(p.id) !== rebalanceForm.from_pool_id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          Tier {p.tier_order}: {p.milestone_name} (Allocated: {fmt(p.allocated_amount)} / Target:{' '}
                          {fmt(p.target_amount)})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label>Amount to Shift ({accountCurrency}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={rebalanceForm.amount}
                    onChange={(e) => setRebalanceForm({ ...rebalanceForm, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label>Rebalance Justification / Reason *</label>
                  <input
                    type="text"
                    value={rebalanceForm.reason}
                    onChange={(e) => setRebalanceForm({ ...rebalanceForm, reason: e.target.value })}
                    required
                    placeholder="e.g. Priority shift to expedite roofing procurement"
                  />
                </div>
              </div>

              <div className="milestone-modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowRebalanceModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Rebalancing...' : 'Execute Rebalance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: LOCK POOL IN ESCROW FOR SITE WORK                */}
      {/* ========================================================= */}
      {showLockModal && selectedPool && (
        <div className="milestone-modal-overlay">
          <div className="milestone-modal-container" style={{ maxWidth: '520px' }}>
            <div className="milestone-modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <MdLock style={{ color: '#059669' }} />
                Lock Milestone in Escrow: Tier {selectedPool.tier_order}
              </h3>
              <button className="modal-close-btn" onClick={() => setShowLockModal(false)}>
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleSubmitLock}>
              <div className="milestone-modal-body">
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    padding: '0.75rem 1rem',
                    borderRadius: '6px',
                    marginBottom: '1rem',
                    color: '#166534',
                    fontSize: '0.85rem',
                  }}
                >
                  Locking this pool commits savings into client escrow specifically for this milestone. Site
                  contractors can be authorized knowing payments are fully guaranteed.
                </div>

                <div
                  style={{
                    background: '#f8fafc',
                    padding: '0.75rem 1rem',
                    borderRadius: '6px',
                    marginBottom: '1rem',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Milestone:</div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{selectedPool.milestone_name}</div>
                  <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: '0.25rem' }}>
                    Available in Pool: <strong>{fmt(selectedPool.available_to_lock)}</strong> (Funding:{' '}
                    {selectedPool.funding_percentage}%)
                  </div>
                </div>

                <div className="form-group">
                  <label>Amount to Lock in Escrow ({accountCurrency}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    max={Number(selectedPool.available_to_lock)}
                    value={lockAmount}
                    onChange={(e) => setLockAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="milestone-modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowLockModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: '#059669', borderColor: '#059669' }}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Locking...' : 'Lock in Escrow & Authorize Work'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: POOL ALLOCATION TRANSACTION HISTORY             */}
      {/* ========================================================= */}
      {showHistoryModal && selectedPool && (
        <div className="milestone-modal-overlay">
          <div className="milestone-modal-container" style={{ maxWidth: '680px' }}>
            <div className="milestone-modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <MdHistory style={{ color: '#2563eb' }} />
                Pool History: Tier {selectedPool.tier_order} ({selectedPool.milestone_name})
              </h3>
              <button className="modal-close-btn" onClick={() => setShowHistoryModal(false)}>
                <MdClose />
              </button>
            </div>

            <div className="milestone-modal-body">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                  background: '#f8fafc',
                  padding: '0.75rem',
                  borderRadius: '6px',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Target</div>
                  <strong>{fmt(selectedPool.target_amount)}</strong>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Allocated</div>
                  <strong style={{ color: '#2563eb' }}>{fmt(selectedPool.allocated_amount)}</strong>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Disbursed</div>
                  <strong style={{ color: '#059669' }}>{fmt(selectedPool.disbursed_amount)}</strong>
                </div>
              </div>

              {selectedPool.allocations && selectedPool.allocations.length > 0 ? (
                <div className="table-responsive">
                  <table className="milestone-data-table">
                    <thead>
                      <tr>
                        <th>Date & Ref</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Balance After</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPool.allocations.map((a) => (
                        <tr key={a.uuid}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{a.reference_number}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {a.created_at ? a.created_at.slice(0, 16).replace('T', ' ') : ''}
                            </div>
                          </td>
                          <td>
                            <span className={`pill ${a.allocation_type}`}>{a.allocation_type.replace('_', ' ')}</span>
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            {Number(a.amount) >= 0 ? (
                              <span style={{ color: '#059669' }}>+{fmt(a.amount)}</span>
                            ) : (
                              <span style={{ color: '#dc2626' }}>{fmt(a.amount)}</span>
                            )}
                          </td>
                          <td>{fmt(a.balance_after)}</td>
                          <td style={{ fontSize: '0.8rem', color: '#475569' }}>{a.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', fontStyle: 'italic' }}>
                  No allocation transactions logged for this milestone pool yet.
                </div>
              )}
            </div>

            <div className="milestone-modal-footer">
              <button className="btn btn-outline" onClick={() => setShowHistoryModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MilestoneSavingsPoolsCard
