// Client Portal PWA Authentication & Security Types (Phase 12 Day 1)

export interface ClientPortalClient {
  id: number
  uuid: string
  client_number: string
  first_name: string
  middle_name?: string | null
  last_name: string
  full_name: string
  email: string
  phone_primary: string
  phone_secondary?: string | null
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  district?: string | null
  country?: string | null
  postal_code?: string | null
  date_of_birth?: string | null
  gender?: 'male' | 'female' | 'other' | null
  id_type?: string | null
  id_number?: string | null
  id_expiry_date?: string | null
  nok_name?: string | null
  nok_relationship?: string | null
  nok_phone?: string | null
  nok_address?: string | null
  status: 'active' | 'inactive' | 'suspended' | 'closed'
  kyc_status: 'pending' | 'verified' | 'rejected'
  kyc_verified_at?: string | null
}

export interface ClientSecurityProfileData {
  uuid: string
  has_pin: boolean
  pin_set_at?: string | null
  is_pin_locked: boolean
  biometric_enabled: boolean
  biometric_device_name?: string | null
  biometric_registered_at?: string | null
  two_factor_method: 'none' | 'email_otp' | 'sms_otp'
  preferred_language: string
  notification_channels: {
    sms: boolean
    email: boolean
    whatsapp: boolean
    push: boolean
  }
  pwa_installed: boolean
  pwa_installed_at?: string | null
  last_active_device?: string | null
  last_active_ip?: string | null
}

export interface ClientPortfolioStats {
  savings_count: number
  total_savings_balance: number
  total_savings_target: number
  savings_completion_pct: number
  plots_count: number
  projects_count: number
  pending_milestones_count: number
  documents_count: number
}

export interface ClientPortalProfileResponse {
  client: ClientPortalClient
  security: ClientSecurityProfileData
  portfolio: ClientPortfolioStats
}

export interface ClientAuthSuccessData {
  token: string
  user: {
    id: number
    uuid: string
    name: string
    email: string
    phone: string | null
    roles: string[]
  }
  client: ClientPortalClient
  security_profile: ClientSecurityProfileData
}

export interface ClientRegistrationInput {
  first_name: string
  last_name: string
  email: string
  phone?: string
  password: string
  password_confirmation: string
  pin?: string
  city?: string
  country?: string
  preferred_language?: string
}

export interface ClientLoginInput {
  login: string
  password: string
  device_name?: string
}

export interface PinLoginInput {
  login: string
  pin: string
  device_name?: string
}

export interface BiometricLoginInput {
  credential_id: string
  signature?: string
  device_name?: string
}

export interface ClientSessionItem {
  id: number
  name: string
  is_current: boolean
  created_at: string
  last_used_at: string
}

export interface KycSubmissionInput {
  id_type: string
  id_number: string
  id_expiry_date?: string
  kyc_document?: File
}

export interface ClientPreferencesInput {
  preferred_language?: string
  notification_channels?: {
    sms?: boolean
    email?: boolean
    whatsapp?: boolean
    push?: boolean
  }
  two_factor_method?: 'none' | 'email_otp' | 'sms_otp'
}
