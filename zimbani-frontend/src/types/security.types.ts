export interface SecurityHealthCheckResponse {
  security_score: number
  status: 'hardened' | 'warning' | 'compromised'
  owasp_compliance: string
  environment: string
  headers: Record<string, string>
  rate_limiters: Record<string, string>
  cors: {
    enabled: boolean
    paths: string[]
    supports_credentials: boolean
    max_age: number
  }
  recent_alerts_24h: number
  critical_alerts_7d: number
  server_time: string
}

export interface SecurityAuditLogItem {
  id: number
  uuid: string
  event_type: string
  user_id?: number
  ip_address: string
  user_agent?: string
  endpoint: string
  method: string
  severity: 'info' | 'warning' | 'critical'
  details?: Record<string, any>
  created_at: string
  user?: {
    id: number
    name: string
    email: string
  }
}
