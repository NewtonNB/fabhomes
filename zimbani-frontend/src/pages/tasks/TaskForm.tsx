import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  MdArrowBack,
  MdSave,
  MdAssignment,
  MdLocationCity,
  MdPerson,
  MdAccessTime,
} from 'react-icons/md'
import {
  TaskPriority,
  TaskStatus,
  Milestone,
  CreateTaskInput,
  UpdateTaskInput,
} from '../../types/task.types'
import { Project } from '../../types/project.types'
import { Site } from '../../types/site.types'
import { AdminUser } from '../../types/admin.types'
import taskService from '../../services/task.service'
import { projectService } from '../../services/project.service'
import { adminService } from '../../services/admin.service'
import './TaskForm.css'

export const TaskForm: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const [loading, setLoading] = useState<boolean>(false)
  const [initialLoading, setInitialLoading] = useState<boolean>(isEdit)
  const [error, setError] = useState<string | null>(null)

  // Options
  const [projects, setProjects] = useState<Project[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])

  // Form Fields
  const [title, setTitle] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [projectId, setProjectId] = useState<string>('')
  const [siteId, setSiteId] = useState<string>('')
  const [milestoneId, setMilestoneId] = useState<string>('')
  const [assignedTo, setAssignedTo] = useState<string>('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [status, setStatus] = useState<TaskStatus>('pending')
  const [completionPercentage, setCompletionPercentage] = useState<number>(0)
  const [startDate, setStartDate] = useState<string>('')
  const [dueDate, setDueDate] = useState<string>('')
  const [estimatedHours, setEstimatedHours] = useState<string>('')
  const [actualHours, setActualHours] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  // Load Projects and Users on mount
  useEffect(() => {
    projectService
      .getProjects({ per_page: 100 })
      .then((res: any) => {
        const pList = res?.data?.data || res?.data || (Array.isArray(res) ? res : [])
        setProjects(pList)
      })
      .catch(() => {})

    adminService
      .getUsers({ per_page: 100 })
      .then((res) => {
        setUsers(res.data || [])
      })
      .catch(() => {})
  }, [])

  // Load Sites & Milestones whenever projectId changes
  useEffect(() => {
    if (projectId) {
      // Find selected project uuid or id
      const selectedP = projects.find(
        (p) => String(p.id) === String(projectId) || p.uuid === projectId
      )
      const projectIdentifier = selectedP ? selectedP.uuid : projectId

      taskService
        .getProjectMilestones(projectIdentifier)
        .then(setMilestones)
        .catch(() => setMilestones([]))

      projectService
        .getSites(projectIdentifier)
        .then((sitesData) => {
          setSites(Array.isArray(sitesData) ? sitesData : [])
        })
        .catch(() => setSites([]))
    } else {
      setMilestones([])
      setSites([])
    }
  }, [projectId, projects])

  // Load task for edit mode
  useEffect(() => {
    if (isEdit && id) {
      setInitialLoading(true)
      taskService
        .getTask(id)
        .then((task) => {
          setTitle(task.title)
          setDescription(task.description || '')
          if (task.project) {
            setProjectId(task.project.uuid || String(task.project.id))
          }
          if (task.site) {
            setSiteId(task.site.uuid || String(task.site.id))
          }
          if (task.milestone) {
            setMilestoneId(task.milestone.uuid || String(task.milestone.id))
          }
          if (task.assigned_user) {
            setAssignedTo(task.assigned_user.uuid || String(task.assigned_user.id))
          }
          setPriority(task.priority)
          setStatus(task.status)
          setCompletionPercentage(task.completion_percentage || 0)
          setStartDate(task.start_date || '')
          setDueDate(task.due_date || '')
          setEstimatedHours(task.estimated_hours ? String(task.estimated_hours) : '')
          setActualHours(task.actual_hours ? String(task.actual_hours) : '')
          setNotes(task.notes || '')
        })
        .catch((err) => {
          setError(err?.response?.data?.message || 'Failed to load task')
        })
        .finally(() => {
          setInitialLoading(false)
        })
    }
  }, [id, isEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !projectId) {
      setError('Title and Project are required.')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const payload: CreateTaskInput | UpdateTaskInput = {
        title,
        description: description || undefined,
        project_id: projectId,
        site_id: siteId || undefined,
        milestone_id: milestoneId || undefined,
        assigned_to: assignedTo || undefined,
        priority,
        status,
        completion_percentage: Number(completionPercentage),
        start_date: startDate || undefined,
        due_date: dueDate || undefined,
        estimated_hours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        actual_hours: actualHours ? parseFloat(actualHours) : undefined,
        notes: notes || undefined,
      }

      if (isEdit && id) {
        await taskService.updateTask(id, payload)
        navigate(`/tasks/${id}`)
      } else {
        const created = await taskService.createTask(payload as CreateTaskInput)
        navigate(`/tasks/${created.uuid}`)
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          (err?.response?.data?.errors
            ? Object.values(err.response.data.errors).flat().join(', ')
            : 'Failed to save task')
      )
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="task-form-container">
        <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>
          Loading task details...
        </div>
      </div>
    )
  }

  return (
    <div className="task-form-container">
      {/* Header */}
      <div className="task-form-header">
        <div className="task-form-header-title">
          <Link
            to="/tasks"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              color: '#6b7280',
              textDecoration: 'none',
              fontSize: '0.875rem',
              marginBottom: '0.5rem',
            }}
          >
            <MdArrowBack /> Back to Tasks
          </Link>
          <h1>{isEdit ? 'Edit Construction Task' : 'Create Construction Task'}</h1>
          <p>Assign work items, link to milestones, and define schedules</p>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '1rem 1.25rem',
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: '10px',
            border: '1px solid #fecaca',
          }}
        >
          {error}
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="task-form-card">
        {/* Section 1: Basic Information */}
        <div className="form-section">
          <h3 className="form-section-title">
            <MdAssignment /> Basic Information
          </h3>

          <div className="form-field">
            <label>Task Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Excavate foundation trenches, Pour concrete slab..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label>Description & Scope of Work</label>
            <textarea
              rows={3}
              placeholder="Provide clear technical specifications, drawings references, or instructions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-row-2">
            <div className="form-field">
              <label>Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="form-field">
              <label>Initial Status</label>
              <select
                value={status}
                onChange={(e) => {
                  const val = e.target.value as TaskStatus
                  setStatus(val)
                  if (val === 'completed') {
                    setCompletionPercentage(100)
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
          </div>

          <div className="form-field">
            <label>Progress Completion ({completionPercentage}%)</label>
            <div className="progress-slider-box">
              <input
                type="range"
                min="0"
                max="100"
                value={completionPercentage}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  setCompletionPercentage(val)
                  if (val === 100 && status !== 'completed') {
                    setStatus('completed')
                  } else if (val < 100 && status === 'completed') {
                    setStatus('in_progress')
                  }
                }}
              />
              <span className="progress-slider-value">{completionPercentage}%</span>
            </div>
          </div>
        </div>

        {/* Section 2: Project & Hierarchy */}
        <div className="form-section">
          <h3 className="form-section-title">
            <MdLocationCity /> Project & Location Link
          </h3>

          <div className="form-row-2">
            <div className="form-field">
              <label>Project *</label>
              <select
                required
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value)
                  setSiteId('')
                  setMilestoneId('')
                }}
              >
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p.uuid} value={p.uuid}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Site (Optional)</label>
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                disabled={!projectId}
              >
                <option value="">Select Site (All project sites)</option>
                {sites.map((s) => (
                  <option key={s.uuid} value={s.uuid}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-field">
            <label>Construction Milestone (Optional)</label>
            <select
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
              disabled={!projectId}
            >
              <option value="">No milestone linked (General task)</option>
              {milestones.map((m) => (
                <option key={m.uuid} value={m.uuid}>
                  #{m.milestone_order} - {m.milestone_name} ({m.completion_percentage}%)
                </option>
              ))}
            </select>
            <span className="form-field-hint">
              Linking a task to a milestone groups it under the corresponding construction phase.
            </span>
          </div>
        </div>

        {/* Section 3: Assignment & Timeline */}
        <div className="form-section">
          <h3 className="form-section-title">
            <MdPerson /> Assignment & Schedule
          </h3>

          <div className="form-field">
            <label>Assigned Worker / Supervisor</label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.uuid} value={u.uuid}>
                  {u.name} ({u.roles?.join(', ') || u.email})
                </option>
              ))}
            </select>
          </div>

          <div className="form-row-2">
            <div className="form-field">
              <label>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-field">
              <label>Estimated Hours</label>
              <input
                type="number"
                step="0.5"
                placeholder="e.g. 16"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
              />
            </div>

            {isEdit && (
              <div className="form-field">
                <label>Actual Hours Logged</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="e.g. 18.5"
                  value={actualHours}
                  onChange={(e) => setActualHours(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Notes */}
        <div className="form-section">
          <h3 className="form-section-title">
            <MdAccessTime /> Additional Notes
          </h3>

          <div className="form-field">
            <label>Supervisor / Worker Notes</label>
            <textarea
              rows={2}
              placeholder="Any additional remarks, equipment requirements, safety notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="task-form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/tasks')}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <MdSave /> {loading ? 'Saving...' : isEdit ? 'Update Task' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default TaskForm
