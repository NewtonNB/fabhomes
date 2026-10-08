import api from '../config/api'
import {
  Client,
  ClientFormData,
  ClientFilters,
  ClientStatistics,
} from '../types/client.types'
import { ApiResponse, PaginatedResponse } from '../types/common.types'

/**
 * Client Service
 * Handles all client-related API calls
 */
class ClientService {
  private readonly baseUrl = '/clients'

  /**
   * Get paginated list of clients
   */
  async getClients(filters?: ClientFilters): Promise<PaginatedResponse<Client>> {
    try {
      const response = await api.get<PaginatedResponse<Client>>(this.baseUrl, {
        params: filters,
      })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch clients')
    }
  }

  /**
   * Get single client by UUID
   */
  async getClient(
    uuid: string,
    params?: { with_units?: boolean; with_user?: boolean }
  ): Promise<Client> {
    try {
      const response = await api.get<ApiResponse<Client>>(`${this.baseUrl}/${uuid}`, {
        params,
      })
      return response.data.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch client')
    }
  }

  /**
   * Create new client
   */
  async createClient(data: ClientFormData): Promise<Client> {
    try {
      const response = await api.post<ApiResponse<Client>>(this.baseUrl, data)
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
      throw new Error(error.response?.data?.message || 'Failed to create client')
    }
  }

  /**
   * Update client
   */
  async updateClient(uuid: string, data: Partial<ClientFormData>): Promise<Client> {
    try {
      const response = await api.put<ApiResponse<Client>>(`${this.baseUrl}/${uuid}`, data)
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
      throw new Error(error.response?.data?.message || 'Failed to update client')
    }
  }

  /**
   * Delete client (soft delete)
   */
  async deleteClient(uuid: string): Promise<void> {
    try {
      await api.delete(`${this.baseUrl}/${uuid}`)
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete client')
    }
  }

  /**
   * Restore soft-deleted client
   */
  async restoreClient(uuid: string): Promise<Client> {
    try {
      const response = await api.post<ApiResponse<Client>>(`${this.baseUrl}/${uuid}/restore`)
      return response.data.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to restore client')
    }
  }

  /**
   * Get client's units
   */
  async getClientUnits(uuid: string, filters?: any): Promise<PaginatedResponse<any>> {
    try {
      const response = await api.get<PaginatedResponse<any>>(`${this.baseUrl}/${uuid}/units`, {
        params: filters,
      })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch client units')
    }
  }

  /**
   * Verify client KYC
   */
  async verifyKyc(uuid: string): Promise<Client> {
    try {
      const response = await api.post<ApiResponse<Client>>(`${this.baseUrl}/${uuid}/verify-kyc`)
      return response.data.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to verify KYC')
    }
  }

  /**
   * Reject client KYC
   */
  async rejectKyc(uuid: string): Promise<Client> {
    try {
      const response = await api.post<ApiResponse<Client>>(`${this.baseUrl}/${uuid}/reject-kyc`)
      return response.data.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to reject KYC')
    }
  }

  /**
   * Get client statistics
   */
  async getStatistics(): Promise<ClientStatistics> {
    try {
      const response = await api.get<ClientStatistics>('/admin/clients/statistics')
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch statistics')
    }
  }
}

// Export singleton instance
const clientService = new ClientService()
export { clientService }
export default clientService
