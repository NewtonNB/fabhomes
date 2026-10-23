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

export interface WhatsAppMessageItem {
  id: number
  uuid: string
  user_id?: number
  client_id?: number
  notification_id?: number
  direction: 'outbound' | 'inbound'
  wa_message_id?: string
  phone_number: string
  message_type: 'template' | 'text' | 'interactive' | 'button_reply' | 'image' | 'document'
  template_name?: string
  body: string
  payload?: Record<string, any>
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed'
  error_message?: string
  sent_at?: string
  delivered_at?: string
  read_at?: string
  created_at: string
  updated_at: string
}

export interface WhatsAppWebhookLogItem {
  id: number
  uuid: string
  event_type: string
  sender_phone?: string
  payload: Record<string, any>
  signature_valid: boolean
  processed: boolean
  error?: string
  created_at: string
}

export interface DripWorkflowItem {
  id: string
  name: string
  frequency: string
  channels: string[]
  status: 'active' | 'paused'
}

export interface DripTriggerItem {
  id: number
  uuid: string
  campaign_type: 'savings_reminder' | 'plot_expiry' | 'milestone_nudge' | 'dormant_client' | string
  trigger_key: string
  recipient_user_id?: number
  recipient_client_id?: number
  entity_type?: string
  entity_id?: number
  title: string
  message: string
  channels_attempted?: string[]
  channels_succeeded?: string[]
  status: 'pending' | 'dispatched' | 'skipped' | 'failed'
  is_dry_run: boolean
  dispatch_summary?: Record<string, any>
  scheduled_at?: string
  dispatched_at?: string
  metadata?: Record<string, any>
  created_at: string
  user?: {
    id: number
    name: string
    email: string
  }
  client?: {
    id: number
    first_name: string
    last_name: string
    client_number: string
  }
}

export interface DripSummaryResponse {
  total_triggers: number
  dispatched_count: number
  dry_run_count: number
  skipped_count: number
  failed_count: number
  past_24h: number
  past_7d: number
  by_campaign: Record<string, number>
  active_workflows: DripWorkflowItem[]
  recent_triggers: DripTriggerItem[]
}

export interface DripRunResult {
  executed_at: string
  dry_run: boolean
  workflow: string
  summary: {
    total_evaluated: number
    total_triggered: number
    total_skipped: number
    total_errors: number
  }
  breakdown: Record<string, {
    evaluated: number
    triggered: number
    skipped: number
    errors: number
    triggers?: any[]
  }>
}

export interface NotificationPreferences {
  channels: {
    sms: boolean
    email: boolean
    whatsapp: boolean
    push: boolean
    in_app: boolean
  }
  categories: {
    financial: boolean
    construction: boolean
    legal: boolean
    support: boolean
    general: boolean
  }
  quiet_hours_enabled: boolean
  quiet_hours_start: string
  quiet_hours_end: string
  timezone: string
}

export interface NotificationAnalyticsResponse {
  total_dispatches: number
  delivered_count: number
  failed_count: number
  skipped_count: number
  success_rate: number
  total_cost_ugx: number
  by_channel: Record<string, number>
  by_status: Record<string, number>
  by_category: Record<string, number>
  daily_volume: Record<string, number>
  recent_failures: NotificationDispatchLogItem[]
}

export interface NotificationCampaignItem {
  id: number
  uuid: string
  title: string
  message: string
  target_segment: 'all_clients' | 'active_savers' | 'plot_holders' | 'site_investors' | 'all_users'
  channels: string[]
  category: NotificationCategory
  priority: NotificationPriority
  action_url?: string
  total_targeted: number
  total_dispatched: number
  total_failed: number
  status: string
  dispatched_at: string
  created_at: string
}

export interface CampaignBroadcastPayload {
  title: string
  message: string
  target_segment: string
  channels: string[]
  category?: NotificationCategory
  priority?: NotificationPriority
  action_url?: string
}

export interface CampaignBroadcastResult {
  campaign: NotificationCampaignItem
  total_targeted: number
  total_dispatched: number
  total_failed: number
}
