export interface Unit {
  id: string
  unit_number: string
  name?: string
  site_id: string
  project_id: string
  client_id?: string
  unit_type: 'apartment' | 'house' | 'villa' | 'townhouse' | 'penthouse' | 'studio' | 'office' | 'shop' | 'warehouse' | 'plot' | 'parking' | 'other'
  status: 'planned' | 'under_construction' | 'completed' | 'available' | 'reserved' | 'sold' | 'occupied' | 'maintenance' | 'unavailable'
  floor_number?: number
  block_number?: string
  area?: number
  bedrooms?: number
  bathrooms?: number
  has_balcony?: boolean
  has_parking?: boolean
  parking_slots?: number
  base_price?: number
  current_price?: number
  discount?: number
  final_price?: number
  price_per_sqm?: number
  currency: string
  price_type?: 'fixed' | 'negotiable'
  reserved_date?: string
  sold_date?: string
  handover_date?: string
  amount_paid?: number
  balance?: number
  payment_progress?: number
  is_fully_paid?: boolean
  construction_start_date?: string
  expected_completion_date?: string
  actual_completion_date?: string
  completion_percentage?: number
  days_until_completion?: number
  construction_duration?: number
  is_overdue?: boolean
  last_inspection_date?: string
  next_inspection_date?: string
  inspection_notes?: string
  is_defect_free?: boolean
  needs_inspection?: boolean
  location_description?: string
  facing_direction?: string
  view_description?: string
  features?: string[]
  amenities?: string[]
  specifications?: Record<string, any>
  specs_summary?: string
  images?: string[]
  floor_plans?: string[]
  documents?: string[]
  maintenance_fee?: number
  maintenance_frequency?: string
  description?: string
  notes?: string
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  deleted_at?: string
  
  // Helper properties
  full_identifier?: string
  is_available?: boolean
  is_sold?: boolean
  is_reserved?: boolean
  is_completed?: boolean
  
  // Relationships
  site?: {
    uuid: string
    name: string
    code: string
  }
  project?: {
    uuid: string
    name: string
    code: string
  }
  client?: {
    uuid: string
    name: string
  }
}

export interface UnitFormData {
  unit_number: string
  name?: string
  site_id: string
  project_id: string
  client_id?: string
  unit_type: 'apartment' | 'house' | 'villa' | 'townhouse' | 'penthouse' | 'studio' | 'office' | 'shop' | 'warehouse' | 'plot' | 'parking' | 'other'
  status?: 'planned' | 'under_construction' | 'completed' | 'available' | 'reserved' | 'sold' | 'occupied' | 'maintenance' | 'unavailable'
  floor_number?: number
  block_number?: string
  area?: number
  bedrooms?: number
  bathrooms?: number
  has_balcony?: boolean
  has_parking?: boolean
  parking_slots?: number
  base_price?: number
  current_price?: number
  discount?: number
  currency?: string
  price_type?: 'fixed' | 'negotiable'
  reserved_date?: string
  sold_date?: string
  handover_date?: string
  amount_paid?: number
  construction_start_date?: string
  expected_completion_date?: string
  actual_completion_date?: string
  completion_percentage?: number
  last_inspection_date?: string
  next_inspection_date?: string
  inspection_notes?: string
  is_defect_free?: boolean
  location_description?: string
  facing_direction?: string
  view_description?: string
  features?: string[]
  amenities?: string[]
  specifications?: Record<string, any>
  images?: string[]
  floor_plans?: string[]
  documents?: string[]
  maintenance_fee?: number
  maintenance_frequency?: string
  description?: string
  notes?: string
  metadata?: Record<string, any>
}

export interface UnitFilters {
  search?: string
  site_id?: string
  project_id?: string
  unit_type?: string
  status?: string
  client_id?: string
  bedrooms?: number
  min_price?: number
  max_price?: number
  available_only?: boolean
  sold_only?: boolean
  completed_only?: boolean
  overdue_only?: boolean
  with_site?: boolean
  with_project?: boolean
  with_client?: boolean
  per_page?: number
  page?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface UnitStatistics {
  total_units: number
  available_units: number
  reserved_units: number
  sold_units: number
  occupied_units: number
  under_construction: number
  completed_units: number
  overdue_units: number
  by_type: Record<string, number>
  by_status: Record<string, number>
  by_bedrooms: Record<string, number>
  pricing: {
    average_price: number
    min_price: number
    max_price: number
    total_inventory_value: number
  }
  financial: {
    total_sales_value: number
    total_amount_paid: number
    total_balance_outstanding: number
  }
  construction: {
    average_completion: number
    fully_completed: number
  }
}

export interface ReserveUnitData {
  client_id: string
  reservation_notes?: string
}

export interface SellUnitData {
  client_id: string
  sale_price: number
  amount_paid?: number
  sale_notes?: string
}

export interface UpdateProgressData {
  completion_percentage: number
  progress_notes?: string
}

export interface UpdateInspectionData {
  last_inspection_date?: string
  next_inspection_date?: string
  inspection_notes?: string
  is_defect_free?: boolean
}

export interface UpdatePaymentData {
  amount_paid: number
  payment_notes?: string
}
