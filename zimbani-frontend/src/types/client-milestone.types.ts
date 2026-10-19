// Client Portal Milestone & Progress Photo Types for ZIMBANI Platform

import {
  MilestoneVerification,
  MilestonePaymentRelease,
  VerificationStage,
  ClientApprovalStatus,
} from './milestone-release.types'

export type PhotoStage =
  | 'pre_work'
  | 'during_construction'
  | 'reinforcement_check'
  | 'concrete_pour'
  | 'masonry_framing'
  | 'mep_installation'
  | 'finishes'
  | 'completed_stage'
  | 'defect_snag'

export interface MilestoneProgressPhoto {
  id: number
  uuid: string
  milestone_verification_id?: number | null
  milestone_id: number
  project_id: number
  site_id?: number | null
  unit_id?: number | null
  title: string
  caption?: string | null
  photo_url: string
  thumbnail_url?: string | null
  photo_stage: PhotoStage
  captured_at: string
  gps_latitude?: number | null
  gps_longitude?: number | null
  gps_accuracy?: number | null
  camera_make_model?: string | null
  uploaded_by?: number | null
  is_client_visible: boolean
  is_featured: boolean
  client_flagged: boolean
  client_flag_notes?: string | null
  client_flagged_at?: string | null
  created_at: string
  updated_at?: string
}

export interface ClientMilestoneVerification extends MilestoneVerification {
  progress_photos?: MilestoneProgressPhoto[]
  payment_releases?: MilestonePaymentRelease[]
}

export interface ClientMilestoneSummary {
  active_units_count: number
  total_verifications_count: number
  approved_verifications_count: number
  pending_approval_count: number
  total_escrow_authorized: number
  total_retention_held: number
  overall_completion_avg: number
}

export interface PhotoUploadPayload {
  title: string
  caption?: string
  photo_url: string
  thumbnail_url?: string
  photo_stage?: PhotoStage
  captured_at?: string
  gps_latitude?: number
  gps_longitude?: number
  gps_accuracy?: number
  camera_make_model?: string
  is_client_visible?: boolean
  is_featured?: boolean
}

export interface ClientAuthorizePayload {
  feedback?: string
  pin?: string
}

export interface ClientDisputePayload {
  reason: string
  flagged_photo_ids?: string[]
  category?: 'structural' | 'architectural' | 'plumbing' | 'electrical' | 'finishing' | 'safety' | 'other'
}

export interface ClientMilestoneFilters {
  stage?: VerificationStage | ''
  client_approval_status?: ClientApprovalStatus | ''
  project_id?: string
  unit_id?: string
  search?: string
  page?: number
  per_page?: number
}
