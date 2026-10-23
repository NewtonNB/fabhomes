import api from '../config/api'
import {
  AppNotificationItem,
  NotificationDispatchLogItem,
  NotificationFilters,
  NotificationSummaryResponse,
} from '../types/notification.types'

class NotificationService {
  private readonly baseUrl = '/notifications'

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
}

export const notificationService = new NotificationService()
export default notificationService
