import api from '../config/api'
import { SecurityAuditLogItem, SecurityHealthCheckResponse } from '../types/security.types'

class SecurityService {
  private readonly baseUrl = '/security'

  /**
   * Get overall system security health check & OWASP audit score
   */
  async getHealthCheck(): Promise<SecurityHealthCheckResponse> {
    const res = await api.get(`${this.baseUrl}/health-check`)
    return res.data.data
  }

  /**
   * Get paginated security audit trail
   */
  async getAuditLogs(params: Record<string, any> = {}): Promise<{
    data: SecurityAuditLogItem[]
    pagination: {
      current_page: number
      last_page: number
      per_page: number
      total: number
    }
  }> {
    const res = await api.get(`${this.baseUrl}/audit-logs`, { params })
    return {
      data: res.data.data,
      pagination: res.data.pagination,
    }
  }

  /**
   * Run threat simulator against security shield
   */
  async simulateThreat(payload: Record<string, any>): Promise<any> {
    const res = await api.post(`${this.baseUrl}/simulate-threat`, payload)
    return res.data
  }
}

export const securityService = new SecurityService()
export default securityService
