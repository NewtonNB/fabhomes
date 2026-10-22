export interface PlotMapLayout {
  x: number
  y: number
  width: number
  height: number
}

export interface PlotActiveReservation {
  id: number
  uuid: string
  reservation_number: string
  reserved_at?: string
  expires_at?: string
  is_mine: boolean
}

export interface PlotItem {
  id: number
  uuid: string
  unit_number: string
  name: string
  project: {
    id: number
    uuid: string
    name: string
    code: string
  } | null
  site: {
    id: number
    uuid: string
    name: string
  } | null
  status: 'available' | 'reserved' | 'sold' | 'occupied' | 'under_construction' | 'planned'
  area: number
  area_unit: string
  dimensions: string
  current_price: number
  base_price: number
  currency: string
  zone: string
  soil_type: string
  topography: string
  tenure_type: string
  features: string[]
  location_description: string
  is_my_plot: boolean
  is_reserved: boolean
  reservation: PlotActiveReservation | null
  map_layout: PlotMapLayout
}

export interface PlotSummary {
  total_plots: number
  available_count: number
  reserved_count: number
  sold_count: number
  my_plots_count: number
}

export interface PlotsOverviewResponse {
  plots: PlotItem[]
  projects: {
    id: number
    uuid: string
    name: string
    code: string
  }[]
  summary: PlotSummary
}

export interface EstateMapRoadway {
  name: string
  x1: number
  y1: number
  x2: number
  y2: number
  strokeWidth: number
}

export interface EstateMapAmenity {
  name: string
  x: number
  y: number
  width: number
  height: number
  color: string
}

export interface EstateMapResponse {
  project: {
    id: number
    uuid: string
    name: string
    code: string
    description: string
  } | null
  canvas: {
    width: number
    height: number
    roadways: EstateMapRoadway[]
    amenities: EstateMapAmenity[]
  }
  plots: PlotItem[]
  summary: PlotSummary
}

export interface ReservePlotPayload {
  unit_id?: number
  unit_uuid?: string
  reservation_fee?: number
  gateway?: 'mtn_momo' | 'airtel_money' | 'stanbic_bank' | 'flexipay'
  phone_number?: string
  notes?: string
}

export interface ReservePlotReceipt {
  receipt_number: string
  date: string
  amount: number
  payment_method: string
  gateway: string
  beneficiary: string
}

export interface ReservePlotResponse {
  message: string
  reservation: {
    id: number
    uuid: string
    reservation_number: string
    unit_number: string
    plot_name: string
    reservation_fee: number
    status: string
    reserved_at: string
    expires_at: string
    days_remaining: number
  }
  receipt: ReservePlotReceipt
}

export interface ClientReservationItem {
  id: number
  uuid: string
  reservation_number: string
  plot: {
    id: number
    uuid: string
    unit_number: string
    name: string
    price: number
    area: number
    status: string
  }
  project: {
    name: string
    code: string
  } | null
  site: string | null
  status: 'pending' | 'confirmed' | 'expired' | 'cancelled' | 'converted_to_sale'
  reservation_fee: number
  reservation_fee_paid: number
  payment_method: string
  reserved_at: string
  expires_at: string
  days_remaining: number
  is_expired: boolean
  client_notes: string | null
}

export interface ClientReservationsResponse {
  reservations: ClientReservationItem[]
  active_count: number
}

export interface DeedPipelineStage {
  step: number
  key: string
  label: string
  status: 'completed' | 'in_progress' | 'pending'
  date?: string
  surveyor?: string
  zonal_office?: string
  reference?: string
  submission_date?: string
  deed_plan_number?: string
  title_number?: string
  registration_date?: string
  handover_date?: string
  notes?: string
}

export interface BeaconCoordinate {
  beacon: string
  lat: number
  lng: number
}

export interface LandTitleDeedItem {
  id: number
  uuid: string
  deed_number: string
  title_number: string
  tenure_type: string
  overall_stage: 'boundary_survey' | 'ministry_mutation' | 'deed_plan' | 'title_registration' | 'deed_handover'
  overall_progress_percentage: number
  estimated_completion_date: string
  plot: {
    id: number
    uuid: string
    unit_number: string
    name: string
    area: number
  }
  project: {
    name: string
    code: string
  } | null
  stages: DeedPipelineStage[]
  beacon_coordinates: BeaconCoordinate[]
  document: {
    id: number
    uuid: string
    title: string
    file_path: string
  } | null
  notes: string | null
}

export interface LandTitleDeedsResponse {
  deeds: LandTitleDeedItem[]
  total_titles: number
}
