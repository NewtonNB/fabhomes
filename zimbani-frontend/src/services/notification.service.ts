import api from '../config/api'
import {
  AppNotificationItem,
  DripRunResult,
  DripSummaryResponse,
  DripTriggerItem,
  NotificationDispatchLogItem,
  NotificationFilters,
  NotificationSummaryResponse,
  WhatsAppMessageItem,
  WhatsAppWebhookLogItem,
} from '../types/notification.types'

class NotificationService {
  private readonly baseUrl = '/notifications'
  private readonly waUrl = '/whatsapp'
  private readonly dripUrl = '/notification-drips'

  /**
   * Get paginated notifications
   */
  async getNotifications(filters: NotificationFilters = {}): Promise<{
    data: AppNotificationItem[]
    current_page: number
    last_page: number
    total: number
  }> {
    const res = await api.get(this.baseUrl, { params: filters })
    return res.data.data
  }

  /**
   * Get unread summary and recent items
   */
  async getSummary(): Promise<NotificationSummaryResponse> {
    const res = await api.get(`${this.baseUrl}/summary`)
    return res.data.data
  }

  /**
   * Mark single notification as read
   */
  async markAsRead(identifier: string | number): Promise<AppNotificationItem> {
    const res = await api.post(`${this.baseUrl}/${identifier}/read`)
    return res.data.data
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<{ updated_count: number }> {
    const res = await api.post(`${this.baseUrl}/mark-all-read`)
    return res.data.data
  }

  /**
   * Dismiss single notification
   */
  async dismiss(identifier: string | number): Promise<AppNotificationItem> {
    const res = await api.post(`${this.baseUrl}/${identifier}/dismiss`)
    return res.data.data
  }

  /**
   * Dispatch test notification
   */
  async dispatchTest(payload: {
    title: string
    message: string
    category?: string
    priority?: string
    channels?: string[]
  }): Promise<any> {
    const res = await api.post(`${this.baseUrl}/dispatch-test`, payload)
    return res.data.data
  }

  /**
   * Get dispatch audit logs
   */
  async getDispatchLogs(params: Record<string, any> = {}): Promise<{
    data: NotificationDispatchLogItem[]
    total: number
  }> {
    const res = await api.get(`${this.baseUrl}/dispatch-logs`, { params })
    return res.data.data
  }

  /**
   * Get WhatsApp Conversation Messages
   */
  async getWhatsAppMessages(phone?: string): Promise<WhatsAppMessageItem[]> {
    const res = await api.get(`${this.waUrl}/messages`, { params: { phone } })
    return res.data.data
  }

  /**
   * Send WhatsApp Template Message
   */
  async sendWhatsAppTemplate(payload: {
    to: string
    template_name: string
    parameters?: string[]
    buttons?: any[]
  }): Promise<WhatsAppMessageItem> {
    const res = await api.post(`${this.waUrl}/send-template`, payload)
    return res.data.data
  }

  /**
   * Get Ingested WhatsApp Webhook Logs
   */
  async getWhatsAppWebhookLogs(): Promise<{
    data: WhatsAppWebhookLogItem[]
    total: number
  }> {
    const res = await api.get(`${this.waUrl}/webhooks-log`)
    return res.data.data
  }

  /**
   * Get Drip Automation Telemetry & Active Workflows
   */
  async getDripSummary(): Promise<DripSummaryResponse> {
    const res = await api.get(`${this.dripUrl}/summary`)
    return res.data.data
  }

  /**
   * Get Paginated Drip Audit Logs
   */
  async getDripLogs(params: Record<string, any> = {}): Promise<{
    data: DripTriggerItem[]
    pagination: {
      current_page: number
      last_page: number
      per_page: number
      total: number
    }
  }> {
    const res = await api.get(`${this.dripUrl}/logs`, { params })
    return {
      data: res.data.data,
      pagination: res.data.pagination,
    }
  }

  /**
   * Trigger Manual Drip Evaluation or Dry Run
   */
  async runDripsNow(dryRun: boolean = false, workflow: string = 'all'): Promise<DripRunResult> {
    const res = await api.post(`${this.dripUrl}/run-now`, { dry_run: dryRun, workflow })
    return res.data.data
  }
}

export const notificationService = new NotificationService()
export default notificationService
