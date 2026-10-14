import React, { useState, useEffect } from 'react'
import {
  MdFlag,
  MdCheckCircle,
  MdPlayCircleFilled,
  MdHourglassEmpty,
  MdSkipNext,
  MdAdd,
  MdEdit,
  MdDeleteOutline,
  MdAttachMoney,
  MdEvent,
  MdListAlt,
  MdClose,
} from 'react-icons/md'
import {
  Milestone,
  MilestoneStatus,
  CreateMilestoneInput,
  UpdateMilestoneInput,
} from '../../types/task.types'
import taskService from '../../services/task.service'
import './MilestoneTracker.css'

interface MilestoneTrackerProps {
  projectId: string
  projectProgress?: number
  onProgressUpdated?: (newProgress: number) => void
}

export const MilestoneTracker: React.FC<MilestoneTrackerProps> = ({
  projectId,
  projectProgress,
  onProgressUpdated,
}) => {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Update modal state
  const [activeMilestone, setActiveMilestone] = useState<Milestone | null>(null)
  const [updateModalOpen, setUpdateModalOpen] = useState<boolean>(false)
  const [newStatus, setNewStatus] = useState<MilestoneStatus>('in_progress')
  const [newProgress, setNewProgress] = useState<number>(0)
  const [completionNotes, setCompletionNotes] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)

  // Add milestone modal state
  const [addModalOpen, setAddModalOpen] = useState<boolean>(false)
  const [newMilestoneName, setNewMilestoneName] = useState<string>('')
  const [newMilestoneDescription, setNewMilestoneDescription] = useState<string>('')
  const [newMilestoneOrder, setNewMilestoneOrder] = useState<number>(1)
  const [newPlannedStart, setNewPlannedStart] = useState<string>('')
  const [newPlannedEnd, setNewPlannedEnd] = useState<string>('')
  const [newEstCost, setNewEstCost] = useState<string>('')

  const fetchMilestones = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await taskService.getProjectMilestones(projectId)
      setMilestones(data)
      setNewMilestoneOrder(data.length + 1)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load milestones')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) {
      fetchMilestones()
    }
  }, [projectId])

  const openUpdateModal = (ms: Milestone) => {
    setActiveMilestone(ms)
    setNewStatus(ms.status)
    setNewProgress(ms.completion_percentage || 0)
    setCompletionNotes(ms.completion_notes || ms.notes || '')
    setUpdateModalOpen(true)
  }

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeMilestone) return

    try {
      setSubmitting(true)
      const payload: UpdateMilestoneInput = {
        status: newStatus,
        completion_percentage: Number(newProgress),
        progress: Number(newProgress),
        completion_notes: completionNotes,
        notes: completionNotes,
      }

      const updated = await taskService.updateMilestone(activeMilestone.uuid, payload)

      setMilestones((prev) =>
        prev.map((m) => (m.uuid === updated.uuid ? updated : m))
      )
      setUpdateModalOpen(false)

      // Calculate new project average and notify parent
      const remainingMilestones = milestones.map((m) =>
        m.uuid === updated.uuid ? updated : m
      )
      const avg =
        remainingMilestones.reduce((acc, curr) => acc + (curr.completion_percentage || 0), 0) /
        (remainingMilestones.length || 1)
      if (onProgressUpdated) {
        onProgressUpdated(Math.round(avg * 100) / 100)
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update milestone')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMilestoneName) return

    try {
      setSubmitting(true)
      const input: CreateMilestoneInput = {
        project_id: projectId,
        milestone_name: newMilestoneName,
        milestone_order: newMilestoneOrder,
        description: newMilestoneDescription || undefined,
        planned_start_date: newPlannedStart || undefined,
        planned_end_date: newPlannedEnd || undefined,
        estimated_cost: newEstCost ? parseFloat(newEstCost) : undefined,
        status: 'pending',
        completion_percentage: 0,
      }

      await taskService.createMilestone(input)
      setAddModalOpen(false)
      setNewMilestoneName('')
      setNewMilestoneDescription('')
      setNewPlannedStart('')
      setNewPlannedEnd('')
      setNewEstCost('')
      await fetchMilestones()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create milestone')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteMilestone = async (uuid: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete milestone "${name}"?`)) {
      return
    }

    try {
      await taskService.deleteMilestone(uuid)
      await fetchMilestones()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete milestone')
    }
  }

  const getStatusBadge = (status: MilestoneStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="status-pill completed">
            <MdCheckCircle /> Completed
          </span>
        )
      case 'in_progress':
        return (
          <span className="status-pill in_progress">
            <MdPlayCircleFilled /> In Progress
          </span>
        )
      case 'skipped':
        return (
          <span className="status-pill skipped">
            <MdSkipNext /> Skipped
          </span>
        )
      default:
        return (
          <span className="status-pill pending">
            <MdHourglassEmpty /> Pending
          </span>
        )
    }
  }

  const completedCount = milestones.filter((m) => m.status === 'completed').length
  const calculatedProgress =
    milestones.length > 0
      ? Math.round(
          (milestones.reduce((acc, curr) => acc + (curr.completion_percentage || 0), 0) /
            milestones.length) *
            100
        ) / 100
      : projectProgress || 0

  return (
    <div className="milestone-tracker">
      <div className="milestone-tracker-header">
        <div className="tracker-title-group">
          <h3>Construction Milestones & Progress</h3>
          <p>Sequenced construction phases with automated progress tracking (FR-CONST-003)</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setAddModalOpen(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
        >
          <MdAdd /> Add Milestone
        </button>
      </div>

      {/* Overall Progress Bar */}
      <div className="milestone-overall-progress">
        <div className="overall-progress-stats">
          <span>
            {completedCount} of {milestones.length} Milestones Completed
          </span>
          <span className="overall-progress-percentage">{calculatedProgress}%</span>
        </div>
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${calculatedProgress}%` }} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
          Loading milestones...
        </div>
      ) : error ? (
        <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px' }}>
          {error}
        </div>
      ) : milestones.length === 0 ? (
        <div className="milestones-empty-state">
          <MdFlag />
          <h4>No Milestones Created Yet</h4>
          <p>Set up standard construction milestones (Foundation, Roofing, Finishes) to monitor completion.</p>
          <button className="btn btn-primary" onClick={() => setAddModalOpen(true)} style={{ marginTop: '1rem' }}>
            <MdAdd /> Create First Milestone
          </button>
        </div>
      ) : (
        <div className="milestones-timeline">
          {milestones.map((ms) => {
            const estCost = ms.estimated_cost ? Number(ms.estimated_cost) : 0
            const actCost = ms.actual_cost ? Number(ms.actual_cost) : 0
            const variance = ms.cost_variance !== null && ms.cost_variance !== undefined ? Number(ms.cost_variance) : null

            return (
              <div key={ms.uuid} className={`milestone-card status-${ms.status}`}>
                <div className="milestone-order-col">
                  <div className="milestone-badge-number">{ms.milestone_order}</div>
                </div>

                <div className="milestone-content-col">
                  <div className="milestone-title-row">
                    <div>
                      <h4 className="milestone-name">{ms.milestone_name}</h4>
                      {ms.description && <p className="milestone-description">{ms.description}</p>}
                    </div>
                    <div className="milestone-badges-row">
                      {getStatusBadge(ms.status)}
                    </div>
                  </div>

                  {/* Progress slider bar */}
                  <div className="milestone-progress-row">
                    <div className="progress-header-row">
                      <span>Phase Progress</span>
                      <span>{ms.completion_percentage}%</span>
                    </div>
                    <div className="progress-bar-track">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${ms.completion_percentage}%`,
                          backgroundColor:
                            ms.status === 'completed'
                              ? '#10b981'
                              : ms.status === 'in_progress'
                              ? '#3b82f6'
                              : '#9ca3af',
                        }}
                      />
                    </div>
                  </div>

                  {/* Meta Grid */}
                  <div className="milestone-meta-grid">
                    <div>
                      <div className="meta-item-label">
                        <MdEvent style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                        Planned Timeline
                      </div>
                      <div className="meta-item-value">
                        {ms.planned_start_date || 'TBD'} → {ms.planned_end_date || 'TBD'}
                      </div>
                    </div>

                    <div>
                      <div className="meta-item-label">
                        <MdAttachMoney style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                        Budget vs Actual
                      </div>
                      <div className="meta-item-value">
                        {estCost ? `UGX ${estCost.toLocaleString()}` : 'No Budget'}
                        {actCost ? ` / UGX ${actCost.toLocaleString()}` : ''}
                      </div>
                    </div>

                    {variance !== null && (
                      <div>
                        <div className="meta-item-label">Cost Variance</div>
                        <div className={`meta-item-value ${variance >= 0 ? 'variance-under' : 'variance-over'}`}>
                          {variance >= 0 ? `+UGX ${variance.toLocaleString()} under` : `-UGX ${Math.abs(variance).toLocaleString()} over`}
                        </div>
                      </div>
                    )}

                    {ms.tasks_count !== undefined && (
                      <div>
                        <div className="meta-item-label">
                          <MdListAlt style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                          Linked Tasks
                        </div>
                        <div className="meta-item-value">{ms.tasks_count} tasks</div>
                      </div>
                    )}
                  </div>

                  {ms.completion_notes && (
                    <div style={{ fontSize: '0.8125rem', color: '#4b5563', fontStyle: 'italic', background: '#f3f4f6', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                      <strong>Inspection Note:</strong> {ms.completion_notes}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="milestone-actions-row">
                    <button
                      className="btn-update-progress"
                      onClick={() => openUpdateModal(ms)}
                    >
                      <MdEdit /> Update Progress
                    </button>
                    <button
                      className="btn-milestone-delete"
                      onClick={() => handleDeleteMilestone(ms.uuid, ms.milestone_name)}
                      title="Delete Milestone"
                    >
                      <MdDeleteOutline size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Update Milestone Progress Modal (API Specification Section 9.3) */}
      {updateModalOpen && activeMilestone && (
        <div className="milestone-modal-overlay">
          <div className="milestone-modal-container">
            <div className="milestone-modal-header">
              <h4>Update Milestone: {activeMilestone.milestone_name}</h4>
              <button className="modal-close-btn" onClick={() => setUpdateModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleUpdateSubmit}>
              <div className="milestone-modal-body">
                <div className="form-group-custom">
                  <label>Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => {
                      const val = e.target.value as MilestoneStatus
                      setNewStatus(val)
                      if (val === 'completed') {
                        setNewProgress(100)
                      }
                    }}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="skipped">Skipped</option>
                  </select>
                </div>

                <div className="form-group-custom">
                  <label>Progress Percentage ({newProgress}%)</label>
                  <div className="slider-container">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={newProgress}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        setNewProgress(val)
                        if (val === 100 && newStatus !== 'completed') {
                          setNewStatus('completed')
                        } else if (val < 100 && newStatus === 'completed') {
                          setNewStatus('in_progress')
                        }
                      }}
                    />
                    <span className="slider-value">{newProgress}%</span>
                  </div>
                </div>

                <div className="form-group-custom">
                  <label>Completion / Inspection Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Enter inspection feedback or completion notes..."
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="milestone-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setUpdateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Milestone Modal */}
      {addModalOpen && (
        <div className="milestone-modal-overlay">
          <div className="milestone-modal-container">
            <div className="milestone-modal-header">
              <h4>Add New Milestone</h4>
              <button className="modal-close-btn" onClick={() => setAddModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleCreateMilestone}>
              <div className="milestone-modal-body">
                <div className="form-group-custom">
                  <label>Milestone Phase Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Substructure & Foundation, Roofing, Plastering..."
                    value={newMilestoneName}
                    onChange={(e) => setNewMilestoneName(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group-custom">
                    <label>Sequence Order</label>
                    <input
                      type="number"
                      min="1"
                      value={newMilestoneOrder}
                      onChange={(e) => setNewMilestoneOrder(Number(e.target.value))}
                    />
                  </div>
                  <div className="form-group-custom">
                    <label>Estimated Cost (UGX)</label>
                    <input
                      type="number"
                      placeholder="e.g. 35000000"
                      value={newEstCost}
                      onChange={(e) => setNewEstCost(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group-custom">
                    <label>Planned Start Date</label>
                    <input
                      type="date"
                      value={newPlannedStart}
                      onChange={(e) => setNewPlannedStart(e.target.value)}
                    />
                  </div>
                  <div className="form-group-custom">
                    <label>Planned End Date</label>
                    <input
                      type="date"
                      value={newPlannedEnd}
                      onChange={(e) => setNewPlannedEnd(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group-custom">
                  <label>Description & Objectives</label>
                  <textarea
                    rows={2}
                    placeholder="Describe phase deliverables and scope..."
                    value={newMilestoneDescription}
                    onChange={(e) => setNewMilestoneDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="milestone-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create Milestone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default MilestoneTracker
