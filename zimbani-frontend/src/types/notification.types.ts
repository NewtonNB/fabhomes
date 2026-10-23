export type NotificationCategory = 'financial' | 'construction' | 'legal' | 'support' | 'security' | 'general'
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface AppNotificationItem {
  id: number
  uuid: string
  user_id: number
  client_id?: number
  type: string
  title: string
  message: string
  action_url?: string
  data?: Record<string, any>
  category: NotificationCategory
  priority: NotificationPriority
  read_at: string | null
  is_dismissed: boolean
  created_at: string
  updated_at: string
}

export interface NotificationSummaryResponse {
  unread_count: number
  total_count: number
  recent: AppNotificationItem[]
  category_unread: {
    financial: number
    construction: number
    legal: number
    support: number
    general: number
  }
}

export interface NotificationDispatchLogItem {
  id: number
  uuid: string
  notification_id?: number
  recipient_type: string
  recipient_id: number
  recipient_phone?: string
  recipient_email?: string
  channel: 'in_app' | 'sms' | 'email' | 'whatsapp' | 'push'
  status: 'queued' | 'dispatched' | 'delivered' | 'failed' | 'skipped_preference'
  gateway_provider?: string
  gateway_message_id?: string
  response_payload?: Record<string, any>
  error_message?: string
  cost_ugx: number
  dispatched_at: string
  created_at: string
  notification?: AppNotificationItem
}

export interface NotificationFilters {
  category?: NotificationCategory | 'all'
  unread_only?: boolean
  per_page?: number
  page?: number
}
