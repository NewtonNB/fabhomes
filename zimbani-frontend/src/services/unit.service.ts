import api from '../config/api'
import {
  Unit,
  UnitFormData,
  UnitFilters,
  UnitStatistics,
  ReserveUnitData,
  SellUnitData,
  UpdateProgressData,
  UpdateInspectionData,
  UpdatePaymentData,
} from '../types/unit.types'
import { ApiResponse, PaginatedResponse } from '../types/common.types'

/**
 * Unit Service
 * Handles all unit-related API calls
 */
class UnitService {
  private readonly baseUrl = '/units'

  /**
   * Get paginated list of units
   */
  async getUnits(filters?: UnitFilters): Promise<PaginatedResponse<Unit>> {
    try {
      const response = await api.get<PaginatedResponse<Unit>>(this.baseUrl, {
        params: filters,
      })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch units')
    }
  }

  /**
   * Get single unit by UUID
   */
  async getUnit(uuid: string, params?: { with_site?: boolean; with_project?: boolean; with_client?: boolean }): Promise<Unit> {
    try {
      const response = await api.get<ApiResponse<Unit>>(`${this.baseUrl}/${uuid}`, {
        params,
      })
      return response.data.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch unit')
    }
  }

  /**
   * Create new unit
   */
  async createUnit(data: UnitFormData): Promise<Unit> {
    try {
      const response = await api.post<ApiResponse<Unit>>(this.baseUrl, data)
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
      throw new Error(error.response?.data?.message || 'Failed to create unit')
    }
  }

  /**
   * Update unit
   */
  async updateUnit(uuid: string, data: Partial<UnitFormData>): Promise<Unit> {
    try {
      const response = await api.put<ApiResponse<Unit>>(`${this.baseUrl}/${uuid}`, data)
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
      throw new Error(error.response?.data?.message || 'Failed to update unit')
    }
  }

  /**
   * Delete unit (soft delete)
   */
  async deleteUnit(uuid: string): Promise<void> {
    try {
      await api.delete(`${this.baseUrl}/${uuid}`)
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete unit')
    }
  }

  /**
   * Restore soft-deleted unit
   */
  async restoreUnit(uuid: string): Promise<Unit> {
    try {
      const response = await api.post<ApiResponse<Unit>>(`${this.baseUrl}/${uuid}/restore`)
      return response.data.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to restore unit')
    }
  }

  /**
   * Reserve unit for client
   */
  async reserveUnit(uuid: string, data: ReserveUnitData): Promise<Unit> {
    try {
      const response = await api.post<ApiResponse<Unit>>(`${this.baseUrl}/${uuid}/reserve`, data)
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
      throw new Error(error.response?.data?.message || 'Failed to reserve unit')
    }
  }

  /**
   * Sell unit
   */
  async sellUnit(uuid: string, data: SellUnitData): Promise<Unit> {
    try {
      const response = await api.post<ApiResponse<Unit>>(`${this.baseUrl}/${uuid}/sell`, data)
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
      throw new Error(error.response?.data?.message || 'Failed to sell unit')
    }
  }

  /**
   * Update construction progress
   */
  async updateProgress(uuid: string, data: UpdateProgressData): Promise<Unit> {
    try {
      const response = await api.post<ApiResponse<Unit>>(`${this.baseUrl}/${uuid}/progress`, data)
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
      throw new Error(error.response?.data?.message || 'Failed to update progress')
    }
  }

  /**
   * Update unit inspection
   */
  async updateInspection(uuid: string, data: UpdateInspectionData): Promise<Unit> {
    try {
      const response = await api.post<ApiResponse<Unit>>(`${this.baseUrl}/${uuid}/inspection`, data)
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
   * Update payment
   */
  async updatePayment(uuid: string, data: UpdatePaymentData): Promise<Unit> {
    try {
      const response = await api.post<ApiResponse<Unit>>(`${this.baseUrl}/${uuid}/payment`, data)
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
      throw new Error(error.response?.data?.message || 'Failed to update payment')
    }
  }

  /**
   * Get unit statistics
   */
  async getStatistics(filters?: { site_id?: string; project_id?: string }): Promise<UnitStatistics> {
    try {
      const response = await api.get<UnitStatistics>('/admin/units/statistics', {
        params: filters,
      })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch statistics')
    }
  }
}

// Export singleton instance
export default new UnitService()
