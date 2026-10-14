import api from '../config/api'
import {
  Document,
  DocumentFilters,
  DocumentStatistics,
  CreateDocumentInput,
  UpdateDocumentInput,
} from '../types/document.types'
import { ApiResponse, PaginatedResponse } from '../types/common.types'

class DocumentService {
  /**
   * Get paginated list of documents with filters
   */
  async getDocuments(filters?: DocumentFilters): Promise<PaginatedResponse<Document>> {
    const params = new URLSearchParams()

    if (filters) {
      if (filters.search) params.append('search', filters.search)
      if (filters.document_type) params.append('document_type', filters.document_type)
      if (filters.status) params.append('status', filters.status)
      if (filters.verified_only) params.append('verified_only', '1')
      if (filters.documentable_type) params.append('documentable_type', filters.documentable_type)
      if (filters.documentable_id) params.append('documentable_id', filters.documentable_id)
      if (filters.sort_by) params.append('sort_by', filters.sort_by)
      if (filters.sort_direction) params.append('sort_direction', filters.sort_direction)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.per_page) params.append('per_page', filters.per_page.toString())
    }

    const response = await api.get<PaginatedResponse<Document>>(`/documents?${params.toString()}`)
    return response.data
  }

  /**
   * Get single document by UUID
   */
  async getDocument(uuid: string): Promise<Document> {
    const response = await api.get<ApiResponse<Document>>(`/documents/${uuid}`)
    return response.data.data
  }

  /**
   * Upload a new document with multipart/form-data
   */
  async uploadDocument(input: CreateDocumentInput): Promise<Document> {
    const formData = new FormData()
    formData.append('title', input.title)
    formData.append('document_type', input.document_type)
    formData.append('file', input.file)

    if (input.description) formData.append('description', input.description)
    if (input.documentable_type) formData.append('documentable_type', input.documentable_type)
    if (input.documentable_id) formData.append('documentable_id', input.documentable_id)
    if (input.expiry_date) formData.append('expiry_date', input.expiry_date)
    if (input.metadata) formData.append('metadata', JSON.stringify(input.metadata))

    const response = await api.post<ApiResponse<Document>>('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data.data
  }

  /**
   * Update document metadata
   */
  async updateDocument(uuid: string, data: UpdateDocumentInput): Promise<Document> {
    const response = await api.put<ApiResponse<Document>>(`/documents/${uuid}`, data)
    return response.data.data
  }

  /**
   * Delete a document
   */
  async deleteDocument(uuid: string): Promise<void> {
    await api.delete(`/documents/${uuid}`)
  }

  /**
   * Download a document
   */
  async downloadDocument(uuid: string, fileName?: string): Promise<void> {
    const response = await api.get(`/documents/${uuid}/download`, {
      responseType: 'blob',
    })

    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = window.document.createElement('a')
    link.href = url
    link.setAttribute('download', fileName || `document-${uuid}`)
    window.document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  /**
   * Verify a document
   */
  async verifyDocument(uuid: string): Promise<Document> {
    const response = await api.post<ApiResponse<Document>>(`/documents/${uuid}/verify`)
    return response.data.data
  }

  /**
   * Get document statistics
   */
  async getStatistics(): Promise<DocumentStatistics> {
    const response = await api.get<ApiResponse<DocumentStatistics>>('/admin/documents/statistics')
    return response.data.data
  }
}

const documentService = new DocumentService()
export { documentService }
export default documentService
