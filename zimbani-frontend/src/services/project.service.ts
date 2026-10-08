import api from '../config/api'
import {
  Project,
  ProjectFormData,
  ProjectFilters,
  ProjectStatistics,
  AssignUsersData,
} from '../types/project.types'
import { ApiResponse, PaginatedResponse } from '../types/common.types'

/**
 * Project Service
 * Handles all project-related API calls
 */
class ProjectService {
  private readonly baseUrl = '/projects'

  /**
   * Get paginated list of projects
   */
  async getProjects(filters?: ProjectFilters): Promise<PaginatedResponse<Project>> {
    try {
      const response = await api.get<PaginatedResponse<Project>>(this.baseUrl, {
        params: filters,
      })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch projects')
    }
  }

  /**
   * Get single project by UUID
   */
  async getProject(uuid: string, params?: { with_company?: boolean; with_sites?: boolean }): Promise<Project> {
    try {
      const response = await api.get<ApiResponse<Project>>(`${this.baseUrl}/${uuid}`, {
        params,
      })
      return response.data.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch project')
    }
  }

  /**
   * Create new project
   */
  async createProject(data: ProjectFormData): Promise<Project> {
    try {
      const response = await api.post<ApiResponse<Project>>(this.baseUrl, data)
      return response.data.data
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errors = error.response.data.errors
        const errorMessages: string[] = []
        Object.keys(errors).forEach((field) => {
          errorMessages.push(...errors[field])
        })
        throw new Error(errorMessages.join('. '))
      }
      throw new Error(error.response?.data?.message || 'Failed to create project')
    }
  }

  /**
   * Update project
   */
  async updateProject(uuid: string, data: Partial<ProjectFormData>): Promise<Project> {
    try {
      const response = await api.put<ApiResponse<Project>>(`${this.baseUrl}/${uuid}`, data)
      return response.data.data
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errors = error.response.data.errors
        const errorMessages: string[] = []
        Object.keys(errors).forEach((field) => {
          errorMessages.push(...errors[field])
        })
        throw new Error(errorMessages.join('. '))
      }
      throw new Error(error.response?.data?.message || 'Failed to update project')
    }
  }

  /**
   * Delete project (soft delete)
   */
  async deleteProject(uuid: string): Promise<void> {
    try {
      await api.delete(`${this.baseUrl}/${uuid}`)
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete project')
    }
  }

  /**
   * Restore soft-deleted project
   */
  async restoreProject(uuid: string): Promise<Project> {
    try {
      const response = await api.post<ApiResponse<Project>>(`${this.baseUrl}/${uuid}/restore`)
      return response.data.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to restore project')
    }
  }

  /**
   * Get project sites
   */
  async getSites(uuid: string, filters?: any): Promise<PaginatedResponse<any>> {
    try {
      const response = await api.get<PaginatedResponse<any>>(`${this.baseUrl}/${uuid}/sites`, {
        params: filters,
      })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch project sites')
    }
  }

  /**
   * Get project users
   */
  async getUsers(uuid: string, filters?: any): Promise<PaginatedResponse<any>> {
    try {
      const response = await api.get<PaginatedResponse<any>>(`${this.baseUrl}/${uuid}/users`, {
        params: filters,
      })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch project users')
    }
  }

  /**
   * Assign users to project
   */
  async assignUsers(uuid: string, data: AssignUsersData): Promise<void> {
    try {
      await api.post(`${this.baseUrl}/${uuid}/users/assign`, data)
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errors = error.response.data.errors
        const errorMessages: string[] = []
        Object.keys(errors).forEach((field) => {
          errorMessages.push(...errors[field])
        })
        throw new Error(errorMessages.join('. '))
      }
      throw new Error(error.response?.data?.message || 'Failed to assign users')
    }
  }

  /**
   * Remove users from project
   */
  async removeUsers(uuid: string, data: AssignUsersData): Promise<void> {
    try {
      await api.post(`${this.baseUrl}/${uuid}/users/remove`, data)
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to remove users')
    }
  }

  /**
   * Get project statistics
   */
  async getStatistics(filters?: { company_id?: string; project_id?: string }): Promise<ProjectStatistics> {
    try {
      const response = await api.get<ProjectStatistics>('/admin/projects/statistics', {
        params: filters,
      })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch statistics')
    }
  }
}

// Export singleton instance
export default new ProjectService()
