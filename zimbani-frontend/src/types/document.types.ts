// Document Types for Fab Homes

export type DocumentType =
  | 'contract'
  | 'id_proof'
  | 'receipt'
  | 'floor_plan'
  | 'permit'
  | 'survey'
  | 'inspection_report'
  | 'kyc'
  | 'title_deed'
  | 'invoice'
  | 'other'

export type DocumentStatus = 'active' | 'archived' | 'expired'

export interface DocumentUser {
  id: number
  name: string
  email: string
}

export interface Document {
  id: number
  uuid: string
  document_number: string
  title: string
  description?: string | null
  document_type: DocumentType
  file_name: string
  file_url: string
  mime_type: string
  file_size: number
  formatted_file_size: string
  file_extension?: string | null
  documentable_type?: string | null
  documentable_uuid?: string | null
  documentable_name?: string | null
  uploaded_by?: DocumentUser | null
  status: DocumentStatus
  expiry_date?: string | null
  is_verified: boolean
  verified_by?: DocumentUser | null
  verified_at?: string | null
  metadata?: Record<string, any> | null
  created_at: string
  updated_at: string
}

export interface CreateDocumentInput {
  title: string
  description?: string
  document_type: DocumentType
  file: File
  documentable_type?: string
  documentable_id?: string
  expiry_date?: string
  metadata?: Record<string, any>
}

export interface UpdateDocumentInput {
  title?: string
  description?: string
  document_type?: DocumentType
  expiry_date?: string
  status?: DocumentStatus
  metadata?: Record<string, any>
}

export interface DocumentFilters {
  search?: string
  document_type?: string
  status?: string
  verified_only?: boolean
  documentable_type?: string
  documentable_id?: string
  sort_by?: string
  sort_direction?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

export interface DocumentStatistics {
  total_documents: number
  active_documents: number
  verified_documents: number
  archived_documents: number
  total_storage_bytes: number
  by_type: Record<string, number>
}
