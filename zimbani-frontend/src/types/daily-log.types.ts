// Site Daily Logs, Safety & Incident Tracking Types for Fab Homes ZIMBANI Platform

export type WeatherCondition =
  | 'clear'
  | 'sunny'
  | 'partly_cloudy'
  | 'cloudy'
  | 'light_rain'
  | 'heavy_rain'
  | 'stormy'
  | 'high_winds'

export type DailyLogStatus = 'draft' | 'submitted' | 'approved'

export type IncidentType =
  | 'near_miss'
  | 'first_aid'
  | 'medical_treatment'
  | 'lost_time_injury'
  | 'property_damage'
  | 'environmental'
  | 'security'
  | 'other'

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical'

export type IncidentStatus = 'reported' | 'investigating' | 'action_required' | 'closed'

export type InjuredPersonType = 'worker' | 'subcontractor' | 'visitor' | 'public' | 'none'

export type ToolboxTalkCategory =
  | 'ppe'
  | 'working_at_height'
  | 'electrical_safety'
  | 'excavation'
  | 'heavy_equipment'
  | 'fire_safety'
  | 'housekeeping'
  | 'heat_stress'
  | 'hazardous_materials'
  | 'other'

export interface DailyLogRefSite {
  id: number
  uuid: string
  name: string
  code?: string
}

export interface DailyLogRefProject {
  id: number
  uuid: string
  name: string
  code?: string
}

export interface DailyLogRefUser {
  id: number
  uuid?: string
  name: string
  email?: string
}

export interface SiteDailyLog {
  id: number
  uuid: string
  log_number: string
  log_date: string
  weather_condition: WeatherCondition
  temperature_celsius?: number | null
  work_delayed_by_weather: boolean
  delay_hours: number
  labor_headcount: number
  subcontractor_headcount: number
  total_headcount: number
  work_performed_summary: string
  delays_or_impediments?: string | null
  materials_received_notes?: string | null
  equipment_on_site_notes?: string | null
  visitors_log?: string | null
  notes?: string | null
  status: DailyLogStatus
  submitted_at?: string | null
  approved_at?: string | null

  // Computed helpers
  is_submitted: boolean
  is_approved: boolean
  is_delayed: boolean
  incidents_count?: number
  toolbox_talks_count?: number

  // Relations
  site?: DailyLogRefSite | null
  project?: DailyLogRefProject | null
  supervisor?: DailyLogRefUser | null
  approved_by?: DailyLogRefUser | null
  safety_incidents?: SafetyIncident[]
  toolbox_talks?: SafetyToolboxTalk[]
  documents?: any[]

  created_at: string
  updated_at: string
}

export interface SafetyIncident {
  id: number
  uuid: string
  incident_number: string
  incident_type: IncidentType
  severity: IncidentSeverity
  status: IncidentStatus
  incident_date: string
  incident_time?: string | null
  location_details: string
  title: string
  description: string
  immediate_actions_taken?: string | null
  root_cause_analysis?: string | null
  preventative_measures?: string | null
  injured_person_name?: string | null
  injured_person_type: InjuredPersonType
  investigated_at?: string | null
  closed_at?: string | null

  // Computed helpers
  is_open: boolean
  is_closed: boolean
  is_critical: boolean
  is_lost_time: boolean

  // Relations
  site?: DailyLogRefSite | null
  project?: DailyLogRefProject | null
  site_daily_log?: {
    id: number
    uuid: string
    log_number: string
    log_date: string
  } | null
  reported_by?: DailyLogRefUser | null
  investigated_by?: DailyLogRefUser | null
  closed_by?: DailyLogRefUser | null
  documents?: any[]

  created_at: string
  updated_at: string
}

export interface SafetyToolboxTalk {
  id: number
  uuid: string
  talk_number: string
  topic: string
  category: ToolboxTalkCategory
  conducted_at: string
  duration_minutes: number
  attendees_count: number
  attendees_names?: string[]
  key_discussion_points: string
  hazards_identified?: string | null
  supervisor_notes?: string | null

  // Relations
  site?: DailyLogRefSite | null
  project?: DailyLogRefProject | null
  site_daily_log?: {
    id: number
    uuid: string
    log_number: string
    log_date: string
  } | null
  conducted_by?: DailyLogRefUser | null
  documents?: any[]

  created_at: string
  updated_at: string
}

export interface DailyLogFilterParams {
  site_id?: string | number
  project_id?: string | number
  weather_condition?: string
  status?: string
  delayed_only?: boolean
  from_date?: string
  to_date?: string
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

export interface SafetyIncidentFilterParams {
  site_id?: string | number
  project_id?: string | number
  incident_type?: string
  severity?: string
  status?: string
  open_only?: boolean
  from_date?: string
  to_date?: string
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

export interface ToolboxTalkFilterParams {
  site_id?: string | number
  project_id?: string | number
  category?: string
  from_date?: string
  to_date?: string
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

export interface CreateSiteDailyLogInput {
  site_id: number | string
  project_id?: number | string | null
  log_date: string
  weather_condition: WeatherCondition
  temperature_celsius?: number | null
  work_delayed_by_weather?: boolean
  delay_hours?: number
  labor_headcount: number
  subcontractor_headcount?: number
  work_performed_summary: string
  delays_or_impediments?: string | null
  materials_received_notes?: string | null
  equipment_on_site_notes?: string | null
  visitors_log?: string | null
  supervisor_id?: number | string | null
  notes?: string | null
}

export interface UpdateSiteDailyLogInput extends Partial<CreateSiteDailyLogInput> {
  status?: DailyLogStatus
}

export interface CreateSafetyIncidentInput {
  site_id: number | string
  project_id?: number | string | null
  site_daily_log_id?: number | string | null
  incident_type: IncidentType
  severity: IncidentSeverity
  incident_date: string
  incident_time?: string | null
  location_details: string
  title: string
  description: string
  immediate_actions_taken?: string | null
  root_cause_analysis?: string | null
  preventative_measures?: string | null
  injured_person_name?: string | null
  injured_person_type?: InjuredPersonType
  reported_by?: number | string | null
}

export interface UpdateSafetyIncidentInput extends Partial<CreateSafetyIncidentInput> {
  status?: IncidentStatus
}

export interface CreateToolboxTalkInput {
  site_id: number | string
  project_id?: number | string | null
  site_daily_log_id?: number | string | null
  conducted_by?: number | string | null
  topic: string
  category: ToolboxTalkCategory
  conducted_at: string
  duration_minutes?: number
  attendees_count: number
  attendees_names?: string[]
  key_discussion_points: string
  hazards_identified?: string | null
  supervisor_notes?: string | null
}

export interface UpdateToolboxTalkInput extends Partial<CreateToolboxTalkInput> {}

export interface DailyLogStatistics {
  total_logs: number
  approved_logs: number
  submitted_logs: number
  draft_logs: number
  weather_delayed_days: number
  total_delay_hours: number
  average_daily_headcount: number
  total_incidents: number
  open_incidents: number
  lost_time_injuries: number
  days_without_lost_time: number
}

export interface SafetyStatistics {
  total: number
  open: number
  closed: number
  critical: number
  lost_time_injuries: number
  near_misses: number
  by_type: Record<string, number>
  by_severity: Record<string, number>
}
