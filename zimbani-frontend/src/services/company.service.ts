import api from '../config/api'
import {
  Company,
  CompanyFormData,
  CompanyFilters,
  CompanyStatistics,
} from '../types/company.types'
import { ApiResponse, PaginatedResponse } from '../types/common.types'

/**
 * Company Service
 * Handles all company-related API calls
 */
class CompanyService {
  private readonly baseUrl = '/companies'

  /**
   * Get paginated list of companies
   */
  async getCompanies(filters?: CompanyFilters): Promise<PaginatedResponse<Company>> {
    try {
      const response = await api.get<PaginatedResponse<Company>>(this.baseUrl, {
        params: filters,
      })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch companies')
    }
  }

  /**
   * Get single company by UUID
   */
  async getCompany(uuid: string, params?: { with_subsidiaries?: boolean; with_users?: boolean }): Promise<Company> {
    try {
      const response = await api.get<ApiResponse<Company>>(`${this.baseUrl}/${uuid}`, {
        params,
      })
      return response.data.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch company')
    }
  }

  /**
   * Create new company
   */
  async createCompany(data: CompanyFormData): Promise<Company> {
    try {
      const response = await api.post<ApiResponse<Company>>(this.baseUrl, data)
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
      throw new Error(error.response?.data?.message || 'Failed to create company')
    }
  }

  /**
   * Update company
   */
  async updateCompany(uuid: string, data: Partial<CompanyFormData>): Promise<Company> {
    try {
      const response = await api.put<ApiResponse<Company>>(`${this.baseUrl}/${uuid}`, data)
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
      throw new Error(error.response?.data?.message || 'Failed to update company')
    }
  }

  /**
   * Delete company (soft delete)
   */
  async deleteCompany(uuid: string): Promise<void> {
    try {
      await api.delete(`${this.baseUrl}/${uuid}`)
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete company')
    }
  }

  /**
   * Restore soft-deleted company
   */
  async restoreCompany(uuid: string): Promise<Company> {
    try {
      const response = await api.post<ApiResponse<Company>>(`${this.baseUrl}/${uuid}/restore`)
      return response.data.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to restore company')
    }
  }

  /**
   * Get company subsidiaries
   */
  async getSubsidiaries(uuid: string, filters?: CompanyFilters): Promise<PaginatedResponse<Company>> {
    try {
      const response = await api.get<PaginatedResponse<Company>>(`${this.baseUrl}/${uuid}/subsidiaries`, {
        params: filters,
      })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch subsidiaries')
    }
  }

  /**
   * Get company users
   */
  async getCompanyUsers(uuid: string, filters?: any): Promise<PaginatedResponse<any>> {
    try {
      const response = await api.get<PaginatedResponse<any>>(`${this.baseUrl}/${uuid}/users`, {
        params: filters,
      })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch company users')
    }
  }

  /**
   * Get company statistics
   */
  async getStatistics(filters?: { company_id?: string }): Promise<CompanyStatistics> {
    try {
      const response = await api.get<CompanyStatistics>('/admin/companies/statistics', {
        params: filters,
      })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch statistics')
    }
  }
}

// Export singleton instance
export default new CompanyService()
