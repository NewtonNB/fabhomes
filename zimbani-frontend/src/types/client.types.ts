// Client Types
export interface Client {
  id: number
  uuid: string
  client_number: string
  user_id: number | null
  
  // Personal Information
  first_name: string
  middle_name: string | null
  last_name: string
  full_name: string
  date_of_birth: string | null
  gender: 'male' | 'female' | 'other' | null
  
  // Contact Information
  email: string | null
  phone_primary: string
  phone_secondary: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  district: string | null
  country: string
  postal_code: string | null
  full_address: string | null
  
  // Identification
  id_type: 'national_id' | 'passport' | 'driving_license' | 'other' | null
  id_number: string | null
  id_expiry_date: string | null
  
  // Next of Kin
  nok_name: string | null
  nok_relationship: string | null
  nok_phone: string | null
  nok_address: string | null
  
  // Status
  status: 'active' | 'inactive' | 'suspended' | 'closed'
  kyc_status: 'pending' | 'verified' | 'rejected'
  kyc_verified_at: string | null
  
  // Metadata
  notes: string | null
  tags: string[] | null
  
  // Timestamps
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ClientFormData {
  // Personal Information
  first_name: string
  middle_name?: string
  last_name: string
  date_of_birth?: string
  gender?: 'male' | 'female' | 'other'
  
  // Contact Information
  email?: string
  phone_primary: string
  phone_secondary?: string
  address_line1?: string
  address_line2?: string
  city?: string
  district?: string
  country?: string
  postal_code?: string
  
  // Identification
  id_type?: 'national_id' | 'passport' | 'driving_license' | 'other'
  id_number?: string
  id_expiry_date?: string
  
  // Next of Kin
  nok_name?: string
  nok_relationship?: string
  nok_phone?: string
  nok_address?: string
  
  // Status
  status?: 'active' | 'inactive' | 'suspended' | 'closed'
  
  // Metadata
  notes?: string
  tags?: string[]
}

export interface ClientFilters {
  search?: string
  status?: string
  kyc_status?: string
  page?: number
  per_page?: number
  sort_by?: string
  sort_direction?: 'asc' | 'desc'
}

export interface ClientStatistics {
  total_clients: number
  active_clients: number
  inactive_clients: number
  suspended_clients: number
  kyc_verified: number
  kyc_pending: number
  kyc_rejected: number
  recent_clients: Client[]
}

export interface ClientUnit {
  uuid: string
  unit_number: string
  type: string
  status: string
  project?: {
    name: string
  }
  site?: {
    name: string
  }
}
