import api from '../config/api'
import {
  Site,
  SiteFormData,
  SiteFilters,
  SiteStatistics,
  AssignWorkersData,
  UpdateInspectionData,
} from '../types/site.types'
import { ApiResponse, PaginatedResponse } from '../types/common.types'

/**
 * Site Service
 * Handles all site-related API calls
 */
class SiteService {
  private readonly baseUrl = '/sites'

  /**
   * Get paginated list of sites
   */
  async getSites(filters?: SiteFilters): Promise<PaginatedResponse<Site>> {
    try {
      const response = await api.get<PaginatedResponse<Site>>(this.baseUrl, {
        params: filters,
      })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch sites')
    }
  }

  /**
   * Get single site by UUID
   */
  async getSite(uuid: string, params?: { with_project?: boolean; with_supervisor?: boolean }): Promise<Site> {
    try {
      const response = await api.get<ApiResponse<Site>>(`${this.baseUrl}/${uuid}`, {
        params,
      })
      return response.data.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch site')
    }
  }

  /**
   * Create new site
   */
  async createSite(data: SiteFormData): Promise<Site> {
    try {
      const response = await api.post<ApiResponse<Site>>(this.baseUrl, data)
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
      throw new Error(error.response?.data?.message || 'Failed to create site')
    }
  }

  /**
   * Update site
   */
  async updateSite(uuid: string, data: Partial<SiteFormData>): Promise<Site> {
    try {
      const response = await api.put<ApiResponse<Site>>(`${this.baseUrl}/${uuid}`, data)
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
      throw new Error(error.response?.data?.message || 'Failed to update site')
    }
  }

  /**
   * Delete site (soft delete)
   */
  async deleteSite(uuid: string): Promise<void> {
    try {
      await api.delete(`${this.baseUrl}/${uuid}`)
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete site')
    }
  }

  /**
   * Restore soft-deleted site
   */
  async restoreSite(uuid: string): Promise<Site> {
    try {
      const response = await api.post<ApiResponse<Site>>(`${this.baseUrl}/${uuid}/restore`)
      return response.data.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to restore site')
    }
  }

  /**
   * Get site workers
   */
  async getWorkers(uuid: string, filters?: any): Promise<PaginatedResponse<any>> {
    try {
      const response = await api.get<PaginatedResponse<any>>(`${this.baseUrl}/${uuid}/workers`, {
        params: filters,
      })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch site workers')
    }
  }

  /**
   * Assign workers to site
   */
  async assignWorkers(uuid: string, data: AssignWorkersData): Promise<void> {
    try {
      await api.post(`${this.baseUrl}/${uuid}/workers/assign`, data)
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errors = error.response.data.errors
        const errorMessages: string[] = []
        Object.keys(errors).forEach((field) => {
          errorMessages.push(...errors[field])
        })
        throw new Error(errorMessages.join('. '))
      }
      throw new Error(error.response?.data?.message || 'Failed to assign workers')
    }
  }

  /**
   * Remove workers from site
   */
  async removeWorkers(uuid: string, data: { user_ids: string[] }): Promise<void> {
    try {
      await api.post(`${this.baseUrl}/${uuid}/workers/remove`, data)
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to remove workers')
    }
  }

  /**
   * Update site inspection
   */
  async updateInspection(uuid: string, data: UpdateInspectionData): Promise<Site> {
    try {
      const response = await api.post<ApiResponse<Site>>(`${this.baseUrl}/${uuid}/inspection`, data)
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
      throw new Error(error.response?.data?.message || 'Failed to update inspection')
    }
  }

  /**
   * Get site statistics
   */
  async getStatistics(filters?: { project_id?: string; site_id?: string }): Promise<SiteStatistics> {
    try {
      const response = await api.get<SiteStatistics>('/admin/sites/statistics', {
        params: filters,
      })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch statistics')
    }
  }
}

// Export singleton instance
export default new SiteService()
