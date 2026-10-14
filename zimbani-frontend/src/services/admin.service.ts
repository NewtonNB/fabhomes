import api from '../config/api'
import {
  AdminUser,
  UserFormData,
  UserFilters,
  Role,
  Permission,
  Activity,
  ActivityFilters,
  ActivityStatistics,
} from '../types/admin.types'

class AdminService {
  private readonly baseUrl = '/admin'

  /**
   * Users Management
   */
  async getUsers(params?: UserFilters): Promise<{ data: AdminUser[]; meta?: any }> {
    try {
      const response = await api.get(`${this.baseUrl}/users`, { params })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch users')
    }
  }

  async getUser(uuid: string): Promise<AdminUser> {
    try {
      const response = await api.get(`${this.baseUrl}/users/${uuid}`)
      return response.data.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch user')
    }
  }

  async createUser(data: UserFormData): Promise<AdminUser> {
    try {
      const response = await api.post(`${this.baseUrl}/users`, data)
      return response.data.data
    } catch (error: any) {
      if (error.response?.data?.errors) {
        const errorList = Object.values(error.response.data.errors).flat()
        throw new Error(errorList.join(', '))
      }
      throw new Error(error.response?.data?.message || 'Failed to create user')
    }
  }

  async updateUser(uuid: string, data: Partial<UserFormData>): Promise<AdminUser> {
    try {
      const response = await api.put(`${this.baseUrl}/users/${uuid}`, data)
      return response.data.data
    } catch (error: any) {
      if (error.response?.data?.errors) {
        const errorList = Object.values(error.response.data.errors).flat()
        throw new Error(errorList.join(', '))
      }
      throw new Error(error.response?.data?.message || 'Failed to update user')
    }
  }

  async deleteUser(uuid: string): Promise<void> {
    try {
      await api.delete(`${this.baseUrl}/users/${uuid}`)
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete user')
    }
  }

  async assignUserRoles(uuid: string, roles: string[]): Promise<AdminUser> {
    try {
      const response = await api.post(`${this.baseUrl}/users/${uuid}/roles`, { roles })
      return response.data.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to assign roles')
    }
  }

  /**
   * Roles & Permissions Management
   */
  async getRoles(): Promise<Role[]> {
    try {
      const response = await api.get(`${this.baseUrl}/roles`)
      return response.data.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch roles')
    }
  }

  async createRole(data: { name: string; permissions?: string[] }): Promise<Role> {
    try {
      const response = await api.post(`${this.baseUrl}/roles`, data)
      return response.data.data
    } catch (error: any) {
      if (error.response?.data?.errors) {
        const errorList = Object.values(error.response.data.errors).flat()
        throw new Error(errorList.join(', '))
      }
      throw new Error(error.response?.data?.message || 'Failed to create role')
    }
  }

  async getPermissions(): Promise<Record<string, Permission[]>> {
    try {
      const response = await api.get(`${this.baseUrl}/permissions`)
      return response.data.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch permissions')
    }
  }

  async assignRolePermissions(roleId: number, permissions: string[]): Promise<Role> {
    try {
      const response = await api.post(`${this.baseUrl}/roles/${roleId}/permissions`, { permissions })
      return response.data.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update role permissions')
    }
  }

  /**
   * Activity Logs Management
   */
  async getActivities(params?: ActivityFilters): Promise<{ data: Activity[]; meta?: any }> {
    try {
      const response = await api.get(`${this.baseUrl}/activities`, { params })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch activity logs')
    }
  }

  async getActivityStatistics(days = 30): Promise<ActivityStatistics> {
    try {
      const response = await api.get(`${this.baseUrl}/activities/statistics`, { params: { days } })
      return response.data.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch activity statistics')
    }
  }
}

const adminService = new AdminService()
export { adminService }
export default adminService
