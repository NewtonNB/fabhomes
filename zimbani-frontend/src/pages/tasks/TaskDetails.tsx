import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  MdArrowBack,
  MdEdit,
  MdDeleteOutline,
  MdPlayCircleOutline,
  MdAccessTime,
  MdApartment,
  MdPerson,
  MdFlag,
  MdCloudUpload,
  MdAttachFile,
  MdClose,
} from 'react-icons/md'
import { Task, TaskStatus } from '../../types/task.types'
import { Document } from '../../types/document.types'
import taskService from '../../services/task.service'
import documentService from '../../services/document.service'
import { DocumentUploadModal } from '../../components/documents/DocumentUploadModal'
import { DocumentsTable } from '../../components/documents/DocumentsTable'
import './TaskDetails.css'

export const TaskDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [task, setTask] = useState<Task | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Status Change Modal
  const [statusModalOpen, setStatusModalOpen] = useState<boolean>(false)
  const [newStatus, setNewStatus] = useState<TaskStatus>('in_progress')
  const [newProgress, setNewProgress] = useState<number>(0)
  const [statusNotes, setStatusNotes] = useState<string>('')
  const [submittingStatus, setSubmittingStatus] = useState<boolean>(false)

  // Upload modal
  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false)

  const fetchTaskDetails = async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)
      const data = await taskService.getTask(id)
      setTask(data)
      setNewStatus(data.status)
      setNewProgress(data.completion_percentage || 0)

      // Fetch polymorphic task documents
      if (data.id) {
        documentService
          .getDocuments({
            documentable_type: 'tasks',
            documentable_id: data.id.toString(),
            per_page: 50,
          })
          .then((res: any) => {
            const docList = res?.data?.data || res?.data || (Array.isArray(res) ? res : [])
            setDocuments(Array.isArray(docList) ? docList : [])
          })
          .catch(() => {})
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load task details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTaskDetails()
  }, [id])

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!task) return

    try {
      setSubmittingStatus(true)
      const updated = await taskService.updateTaskStatus(
        task.uuid,
        newStatus,
        Number(newProgress),
        statusNotes
      )
      setTask(updated)
      setStatusModalOpen(false)
      setStatusNotes('')
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update status')
    } finally {
      setSubmittingStatus(false)
    }
  }

  const handleDeleteTask = async () => {
    if (!task) return
    if (!window.confirm(`Are you sure you want to delete task "${task.title}"?`)) {
      return
    }

    try {
      await taskService.deleteTask(task.uuid)
      navigate('/tasks')
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete task')
    }
  }

  if (loading) {
    return (
      <div className="task-details-container">
        <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>
          Loading task details...
        </div>
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="task-details-container">
        <div style={{ padding: '1.5rem', background: '#fee2e2', color: '#991b1b', borderRadius: '10px' }}>
          {error || 'Task not found'}
        </div>
        <Link to="/tasks" className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>
          <MdArrowBack /> Back to Tasks
        </Link>
      </div>
    )
  }

  return (
    <div className="task-details-container">
      {/* Top Navigation & Action Buttons */}
      <div className="task-details-top-bar">
        <Link
          to="/tasks"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            color: '#6b7280',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          <MdArrowBack /> Back to Tasks
        </Link>

        <div className="task-details-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setStatusModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <MdPlayCircleOutline /> Update Status
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setUploadModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <MdCloudUpload /> Upload Photo / Doc
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate(`/tasks/${task.uuid}/edit`)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <MdEdit /> Edit Task
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleDeleteTask}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              color: '#dc2626',
              borderColor: '#fca5a5',
            }}
          >
            <MdDeleteOutline /> Delete
          </button>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="task-details-hero">
        <div className="task-hero-left">
          <div className="task-hero-number-row">
            <span className="task-hero-number">{task.task_number}</span>
            <span className={`status-pill ${task.status}`}>
              {task.status.replace('_', ' ')}
            </span>
            <span className={`kanban-priority-badge priority-${task.priority}`}>
              {task.priority} Priority
            </span>
            {task.is_overdue && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#dc2626',
                  backgroundColor: '#fee2e2',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '9999px',
                }}
              >
                <MdAccessTime /> OVERDUE
              </span>
            )}
          </div>

          <h2 className="task-hero-title">{task.title}</h2>
          {task.description && <p className="task-hero-desc">{task.description}</p>}
        </div>

        <div className="task-hero-right">
          <div className="task-progress-box">
            <div className="progress-box-header">
              <span>Completion Progress</span>
              <span className="progress-box-percent">{task.completion_percentage}%</span>
            </div>
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${task.completion_percentage}%`,
                  backgroundColor:
                    task.status === 'completed'
                      ? '#10b981'
                      : task.status === 'in_progress'
                      ? '#3b82f6'
                      : '#9ca3af',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3-Column Info Cards */}
      <div className="task-details-grid">
        {/* Card 1: Project & Location */}
        <div className="task-info-card">
          <h3>
            <MdApartment /> Project & Site
          </h3>

          <div className="detail-item">
            <span className="detail-label">Project</span>
            <span className="detail-value">
              {task.project ? (
                <Link to={`/projects/${task.project.uuid}`}>
                  {task.project.name} ({task.project.code})
                </Link>
              ) : (
                '—'
              )}
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Construction Site</span>
            <span className="detail-value">
              {task.site ? (
                <Link to={`/sites/${task.site.uuid}`}>{task.site.name}</Link>
              ) : (
                'All Sites / General'
              )}
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Linked Milestone</span>
            <span className="detail-value">
              {task.milestone ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                  <MdFlag color="#2563eb" /> #{task.milestone.milestone_order} - {task.milestone.milestone_name}
                </span>
              ) : (
                'None'
              )}
            </span>
          </div>
        </div>

        {/* Card 2: Assignment & Personnel */}
        <div className="task-info-card">
          <h3>
            <MdPerson /> Assignment
          </h3>

          <div className="detail-item">
            <span className="detail-label">Assigned Worker</span>
            <span className="detail-value">{task.assigned_user?.name || 'Unassigned'}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Assignee Email</span>
            <span className="detail-value" style={{ fontWeight: 400, color: '#4b5563' }}>
              {task.assigned_user?.email || '—'}
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Created By</span>
            <span className="detail-value">{task.created_by_user?.name || 'System Admin'}</span>
          </div>
        </div>

        {/* Card 3: Timeline & Work Hours */}
        <div className="task-info-card">
          <h3>
            <MdAccessTime /> Timeline & Work Hours
          </h3>

          <div className="detail-item">
            <span className="detail-label">Schedule Window</span>
            <span className="detail-value">
              {task.start_date || 'TBD'} → {task.due_date || 'TBD'}
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Completed At</span>
            <span className="detail-value">
              {task.completed_at
                ? new Date(task.completed_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Not completed yet'}
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Estimated vs Actual Hours</span>
            <span className="detail-value">
              {task.estimated_hours ? `${task.estimated_hours} hrs` : '—'} /{' '}
              {task.actual_hours ? `${task.actual_hours} hrs` : '0 hrs'}
            </span>
          </div>
        </div>
      </div>

      {/* Notes Section if available */}
      {task.notes && (
        <div className="task-subsections-card">
          <div className="subsection-header">
            <h3>Supervisor / Worker Notes</h3>
          </div>
          <p style={{ margin: 0, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {task.notes}
          </p>
        </div>
      )}

      {/* Attached Documents & Construction Photos */}
      <div className="task-subsections-card">
        <div className="subsection-header">
          <h3>Attached Photos & Documents</h3>
          <button
            className="btn btn-primary"
            onClick={() => setUploadModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <MdCloudUpload /> Upload New
          </button>
        </div>

        {documents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            <MdAttachFile size={36} color="#9ca3af" />
            <p style={{ margin: '0.5rem 0 0 0' }}>No photos or inspection reports attached to this task yet.</p>
          </div>
        ) : (
          <DocumentsTable
            documents={documents}
            onRefresh={fetchTaskDetails}
            showEntityColumn={false}
          />
        )}
      </div>

      {/* Quick Status Update Modal */}
      {statusModalOpen && (
        <div className="milestone-modal-overlay">
          <div className="milestone-modal-container">
            <div className="milestone-modal-header">
              <h4>Update Task Status: {task.task_number}</h4>
              <button className="modal-close-btn" onClick={() => setStatusModalOpen(false)}>
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleStatusUpdate}>
              <div className="milestone-modal-body">
                <div className="form-group-custom">
                  <label>Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => {
                      const val = e.target.value as TaskStatus
                      setNewStatus(val)
                      if (val === 'completed') {
                        setNewProgress(100)
                      }
                    }}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="blocked">Blocked</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="form-group-custom">
                  <label>Completion Progress ({newProgress}%)</label>
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
                  <label>Status Notes / Reason</label>
                  <textarea
                    rows={3}
                    placeholder="Provide context on progress or impediments..."
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="milestone-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStatusModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingStatus}
                >
                  {submittingStatus ? 'Saving...' : 'Save Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {task.id && (
        <DocumentUploadModal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          onSuccess={() => {
            setUploadModalOpen(false)
            fetchTaskDetails()
          }}
          defaultDocumentableType="tasks"
          defaultDocumentableId={task.id.toString()}
          title={`Upload File for Task ${task.task_number}`}
        />
      )}
    </div>
  )
}

export default TaskDetails
