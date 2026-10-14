import api from '../config/api'
import {
  Task,
  Milestone,
  CreateTaskInput,
  UpdateTaskInput,
  CreateMilestoneInput,
  UpdateMilestoneInput,
  TaskFilterParams,
  TaskStatistics,
  TaskStatus,
} from '../types/task.types'
import { ApiResponse, PaginatedResponse } from '../types/common.types'

class TaskService {
  /**
   * Get paginated list of tasks with filters
   */
  async getTasks(filters?: TaskFilterParams): Promise<PaginatedResponse<Task>> {
    const params = new URLSearchParams()

    if (filters) {
      if (filters.search) params.append('search', filters.search)
      if (filters.project_id) params.append('project_id', filters.project_id)
      if (filters.site_id) params.append('site_id', filters.site_id)
      if (filters.unit_id) params.append('unit_id', filters.unit_id)
      if (filters.milestone_id) params.append('milestone_id', filters.milestone_id)
      if (filters.assigned_to) params.append('assigned_to', filters.assigned_to)
      if (filters.status) params.append('status', filters.status)
      if (filters.priority) params.append('priority', filters.priority)
      if (filters.overdue_only) params.append('overdue_only', '1')
      if (filters.sort_by) params.append('sort_by', filters.sort_by)
      if (filters.sort_direction) params.append('sort_direction', filters.sort_direction)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.per_page) params.append('per_page', filters.per_page.toString())
    }

    const response = await api.get<PaginatedResponse<Task>>(`/tasks?${params.toString()}`)
    return response.data
  }

  /**
   * Get single task by UUID
   */
  async getTask(uuid: string): Promise<Task> {
    const response = await api.get<ApiResponse<Task>>(`/tasks/${uuid}`)
    return response.data.data
  }

  /**
   * Create a new task
   */
  async createTask(input: CreateTaskInput): Promise<Task> {
    const response = await api.post<ApiResponse<Task>>('/tasks', input)
    return response.data.data
  }

  /**
   * Update task
   */
  async updateTask(uuid: string, data: UpdateTaskInput): Promise<Task> {
    const response = await api.put<ApiResponse<Task>>(`/tasks/${uuid}`, data)
    return response.data.data
  }

  /**
   * Delete task
   */
  async deleteTask(uuid: string): Promise<void> {
    await api.delete(`/tasks/${uuid}`)
  }

  /**
   * Restore a soft-deleted task
   */
  async restoreTask(uuid: string): Promise<Task> {
    const response = await api.post<ApiResponse<Task>>(`/tasks/${uuid}/restore`)
    return response.data.data
  }

  /**
   * Fast update status and progress
   */
  async updateTaskStatus(
    uuid: string,
    status: TaskStatus,
    completion_percentage?: number,
    notes?: string
  ): Promise<Task> {
    const response = await api.put<ApiResponse<Task>>(`/tasks/${uuid}/status`, {
      status,
      completion_percentage,
      notes,
    })
    return response.data.data
  }

  /**
   * Get task statistics
   */
  async getTaskStatistics(projectId?: string): Promise<TaskStatistics> {
    const params = projectId ? `?project_id=${projectId}` : ''
    const response = await api.get<ApiResponse<TaskStatistics>>(`/admin/tasks/statistics${params}`)
    return response.data.data
  }

  /**
   * Get all milestones for a project
   */
  async getProjectMilestones(projectUuid: string): Promise<Milestone[]> {
    const response = await api.get<ApiResponse<Milestone[]>>(`/projects/${projectUuid}/milestones`)
    return response.data.data
  }

  /**
   * Create milestone for a project
   */
  async createMilestone(input: CreateMilestoneInput): Promise<Milestone> {
    const response = await api.post<ApiResponse<Milestone>>('/milestones', input)
    return response.data.data
  }

  /**
   * Update milestone (conforms to API Spec Section 9.3)
   */
  async updateMilestone(uuid: string, data: UpdateMilestoneInput): Promise<Milestone> {
    const response = await api.put<ApiResponse<Milestone>>(`/milestones/${uuid}`, data)
    return response.data.data
  }

  /**
   * Delete milestone
   */
  async deleteMilestone(uuid: string): Promise<void> {
    await api.delete(`/milestones/${uuid}`)
  }
}

export const taskService = new TaskService()
export default taskService
