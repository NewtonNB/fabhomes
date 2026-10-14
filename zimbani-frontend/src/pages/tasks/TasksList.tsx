import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  MdSearch,
  MdAdd,
  MdAssignment,
  MdPlayCircleOutline,
  MdWarning,
  MdViewKanban,
  MdTableRows,
  MdVisibility,
  MdEdit,
  MdDeleteOutline,
  MdAccessTime,
  MdApartment,
  MdRefresh,
} from 'react-icons/md'
import {
  Task,
  TaskStatistics,
  TaskStatus,
  TaskPriority,
} from '../../types/task.types'
import taskService from '../../services/task.service'
import { projectService } from '../../services/project.service'
import { Project } from '../../types/project.types'
import './TasksList.css'

export const TasksList: React.FC = () => {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [statistics, setStatistics] = useState<TaskStatistics | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Filters & View State
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban')
  const [search, setSearch] = useState<string>('')
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [selectedPriority, setSelectedPriority] = useState<string>('')
  const [overdueOnly, setOverdueOnly] = useState<boolean>(false)

  // Polling ref
  const pollingRef = useRef<any>(null)

  const fetchTasksData = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true)
      setError(null)

      const [tasksRes, statsRes] = await Promise.all([
        taskService.getTasks({
          search: search || undefined,
          project_id: selectedProject || undefined,
          status: (selectedStatus as TaskStatus) || undefined,
          priority: (selectedPriority as TaskPriority) || undefined,
          overdue_only: overdueOnly || undefined,
          per_page: 100,
        }),
        taskService.getTaskStatistics(selectedProject || undefined).catch(() => null),
      ])

      const rawList =
        (tasksRes as any)?.data?.data ||
        (tasksRes as any)?.data ||
        (Array.isArray(tasksRes) ? tasksRes : [])
      setTasks(Array.isArray(rawList) ? rawList : [])

      if (statsRes) {
        setStatistics(statsRes)
      }
    } catch (err: any) {
      if (!isBackground) {
        setError(err?.response?.data?.message || err?.message || 'Failed to load tasks')
      }
    } finally {
      if (!isBackground) setLoading(false)
    }
  }

  // Load project list once for dropdown
  useEffect(() => {
    projectService
      .getProjects({ per_page: 50 })
      .then((res: any) => {
        const pList = res?.data?.data || res?.data || (Array.isArray(res) ? res : [])
        setProjects(pList)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchTasksData()
  }, [search, selectedProject, selectedStatus, selectedPriority, overdueOnly])

  // Real-time auto-polling every 15s
  useEffect(() => {
    pollingRef.current = setInterval(() => {
      fetchTasksData(true)
    }, 15000)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [search, selectedProject, selectedStatus, selectedPriority, overdueOnly])

  const handleQuickStatusChange = async (taskUuid: string, newStatus: TaskStatus) => {
    try {
      const updated = await taskService.updateTaskStatus(taskUuid, newStatus)
      setTasks((prev) => prev.map((t) => (t.uuid === updated.uuid ? updated : t)))
      // refresh statistics in background
      taskService.getTaskStatistics(selectedProject || undefined).then(setStatistics).catch(() => {})
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update task status')
    }
  }

  const handleDeleteTask = async (taskUuid: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete task "${title}"?`)) {
      return
    }

    try {
      await taskService.deleteTask(taskUuid)
      setTasks((prev) => prev.filter((t) => t.uuid !== taskUuid))
      taskService.getTaskStatistics(selectedProject || undefined).then(setStatistics).catch(() => {})
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete task')
    }
  }

  // Kanban Columns Definition
  const kanbanColumns: { status: TaskStatus; title: string; cssClass: string }[] = [
    { status: 'pending', title: 'Pending', cssClass: 'col-pending' },
    { status: 'in_progress', title: 'In Progress', cssClass: 'col-in_progress' },
    { status: 'blocked', title: 'Blocked', cssClass: 'col-blocked' },
    { status: 'completed', title: 'Completed', cssClass: 'col-completed' },
  ]

  const totalTasks = statistics?.total ?? tasks.length
  const inProgressTasks = statistics?.in_progress ?? tasks.filter((t) => t.status === 'in_progress').length
  const urgentTasks =
    (statistics?.urgent ?? 0) + (statistics?.high ?? 0) ||
    tasks.filter((t) => t.priority === 'urgent' || t.priority === 'high').length
  const overdueTasks = statistics?.overdue ?? tasks.filter((t) => t.is_overdue).length

  return (
    <div className="tasks-container">
      {/* Header */}
      <div className="tasks-header">
        <div className="tasks-title-group">
          <h1>Tasks & Workflows</h1>
          <p>Construction execution, field assignments, and progress monitoring</p>
        </div>
        <div className="tasks-header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => fetchTasksData()}
            title="Refresh Tasks"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <MdRefresh /> Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/tasks/new')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <MdAdd /> Create Task
          </button>
        </div>
      </div>

      {/* Top Statistics Cards */}
      <div className="tasks-stats-grid">
        <div className="task-stat-card">
          <div className="task-stat-icon total">
            <MdAssignment />
          </div>
          <div className="task-stat-info">
            <div className="task-stat-value">{totalTasks}</div>
            <div className="task-stat-label">Total Tasks</div>
          </div>
        </div>

        <div className="task-stat-card">
          <div className="task-stat-icon in-progress">
            <MdPlayCircleOutline />
          </div>
          <div className="task-stat-info">
            <div className="task-stat-value">{inProgressTasks}</div>
            <div className="task-stat-label">Active / In Progress</div>
          </div>
        </div>

        <div className="task-stat-card">
          <div className="task-stat-icon urgent">
            <MdWarning />
          </div>
          <div className="task-stat-info">
            <div className="task-stat-value">{urgentTasks}</div>
            <div className="task-stat-label">Urgent & High Priority</div>
          </div>
        </div>

        <div className="task-stat-card">
          <div className="task-stat-icon overdue">
            <MdAccessTime />
          </div>
          <div className="task-stat-info">
            <div className="task-stat-value">{overdueTasks}</div>
            <div className="task-stat-label">Overdue Tasks</div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="tasks-controls-card">
        <div className="tasks-search-row">
          <div className="tasks-search-box">
            <MdSearch size={20} color="#9ca3af" />
            <input
              type="text"
              placeholder="Search by title, TSK number, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="view-mode-toggle">
            <button
              className={`view-btn ${viewMode === 'kanban' ? 'active' : ''}`}
              onClick={() => setViewMode('kanban')}
            >
              <MdViewKanban size={18} /> Kanban
            </button>
            <button
              className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              <MdTableRows size={18} /> Table
            </button>
          </div>
        </div>

        <div className="tasks-filters-row">
          <select
            className="tasks-filter-select"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.uuid} value={p.uuid}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            className="tasks-filter-select"
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {viewMode === 'table' && (
            <select
              className="tasks-filter-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="blocked">Blocked</option>
              <option value="completed">Completed</option>
            </select>
          )}

          <button
            className={`overdue-toggle-btn ${overdueOnly ? 'active' : ''}`}
            onClick={() => setOverdueOnly(!overdueOnly)}
          >
            <MdAccessTime /> Overdue Only
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          Loading tasks...
        </div>
      ) : error ? (
        <div style={{ padding: '1.25rem', background: '#fee2e2', color: '#991b1b', borderRadius: '10px' }}>
          {error}
        </div>
      ) : tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3.5rem', background: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <MdAssignment size={48} color="#9ca3af" />
          <h3 style={{ margin: '1rem 0 0.5rem 0', color: '#111827' }}>No Tasks Found</h3>
          <p style={{ color: '#6b7280', margin: '0 0 1.25rem 0' }}>
            {search || selectedProject || selectedPriority || overdueOnly
              ? 'Try adjusting your search filters.'
              : 'Create the first construction task to start tracking work on site.'}
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/tasks/new')}>
            <MdAdd /> Create Task
          </button>
        </div>
      ) : viewMode === 'kanban' ? (
        /* Kanban Board View */
        <div className="kanban-board">
          {kanbanColumns.map((col) => {
            const columnTasks = tasks.filter((t) => t.status === col.status)

            return (
              <div key={col.status} className={`kanban-column ${col.cssClass}`}>
                <div className="kanban-column-header">
                  <div className="column-title-group">
                    <span className="column-indicator" />
                    <h3 className="kanban-column-title">{col.title}</h3>
                  </div>
                  <span className="kanban-column-count">{columnTasks.length}</span>
                </div>

                <div className="kanban-cards-list">
                  {columnTasks.map((task) => {
                    const initials = task.assigned_user?.name
                      ? task.assigned_user.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .substring(0, 2)
                      : '?'

                    return (
                      <div
                        key={task.uuid}
                        className={`kanban-card ${task.is_overdue ? 'overdue' : ''}`}
                      >
                        <div className="kanban-card-top">
                          <span className="kanban-task-number">{task.task_number}</span>
                          <span className={`kanban-priority-badge priority-${task.priority}`}>
                            {task.priority}
                          </span>
                        </div>

                        <Link to={`/tasks/${task.uuid}`} className="kanban-card-title">
                          {task.title}
                        </Link>

                        {task.project && (
                          <div className="kanban-project-tag">
                            <MdApartment size={14} />
                            <span>{task.project.name}</span>
                          </div>
                        )}

                        {/* Progress Bar */}
                        <div className="kanban-card-progress">
                          <div className="card-progress-labels">
                            <span>Progress</span>
                            <span>{task.completion_percentage}%</span>
                          </div>
                          <div className="progress-bar-track">
                            <div
                              className="progress-bar-fill"
                              style={{ width: `${task.completion_percentage}%` }}
                            />
                          </div>
                        </div>

                        {/* Bottom Row */}
                        <div className="kanban-card-bottom">
                          <span className={`card-due-date ${task.is_overdue ? 'is-overdue' : ''}`}>
                            <MdAccessTime size={14} />
                            {task.due_date || 'No due date'}
                          </span>

                          <div className="card-assignee-avatar" title={task.assigned_user?.name || 'Unassigned'}>
                            {initials}
                          </div>
                        </div>

                        {/* Quick Status Action Buttons */}
                        <div className="kanban-card-actions">
                          {col.status !== 'in_progress' && (
                            <button
                              className="btn-kanban-action"
                              onClick={() => handleQuickStatusChange(task.uuid, 'in_progress')}
                            >
                              → In Progress
                            </button>
                          )}
                          {col.status !== 'completed' && (
                            <button
                              className="btn-kanban-action"
                              onClick={() => handleQuickStatusChange(task.uuid, 'completed')}
                            >
                              ✓ Done
                            </button>
                          )}
                          {col.status !== 'blocked' && col.status !== 'completed' && (
                            <button
                              className="btn-kanban-action"
                              onClick={() => handleQuickStatusChange(task.uuid, 'blocked')}
                            >
                              ✕ Block
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Data Table View */
        <div className="tasks-table-wrapper">
          <table className="tasks-table">
            <thead>
              <tr>
                <th>Task #</th>
                <th>Title</th>
                <th>Project / Site</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th>Progress</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.uuid}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{task.task_number}</td>
                  <td>
                    <Link to={`/tasks/${task.uuid}`} className="task-table-title">
                      {task.title}
                    </Link>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{task.project?.name || '—'}</div>
                    {task.site && <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{task.site.name}</div>}
                  </td>
                  <td>
                    <span className={`kanban-priority-badge priority-${task.priority}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td>{task.assigned_user?.name || 'Unassigned'}</td>
                  <td style={{ width: '120px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="progress-bar-track" style={{ flex: 1 }}>
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${task.completion_percentage}%` }}
                        />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, minWidth: '32px' }}>
                        {task.completion_percentage}%
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={task.is_overdue ? 'card-due-date is-overdue' : ''}>
                      {task.due_date || '—'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${task.status}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <div className="task-actions-cell">
                      <Link to={`/tasks/${task.uuid}`} className="btn-icon-action" title="View Details">
                        <MdVisibility size={16} />
                      </Link>
                      <Link to={`/tasks/${task.uuid}/edit`} className="btn-icon-action" title="Edit Task">
                        <MdEdit size={16} />
                      </Link>
                      <button
                        className="btn-icon-action delete"
                        onClick={() => handleDeleteTask(task.uuid, task.title)}
                        title="Delete Task"
                      >
                        <MdDeleteOutline size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default TasksList
