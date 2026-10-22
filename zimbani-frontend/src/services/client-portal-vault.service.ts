import api from '../config/api'
import {
  AccountStatementResponse,
  CreateTicketPayload,
  SupportTicketItem,
  SupportTicketMessageItem,
  SupportTicketsListResponse,
  VaultDocumentItem,
  VaultDocumentsResponse,
} from '../types/client-portal-vault.types'

class ClientPortalVaultService {
  private readonly baseUrl = '/client-portal'

  /**
   * Get Documents Vault
   */
  async getDocuments(filters: { document_type?: string; search?: string } = {}): Promise<VaultDocumentsResponse> {
    const res = await api.get(`${this.baseUrl}/documents`, { params: filters })
    return res.data.data
  }

  /**
   * Upload Document into Vault
   */
  async uploadDocument(formData: FormData): Promise<VaultDocumentItem> {
    const res = await api.post(`${this.baseUrl}/documents/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data
  }

  /**
   * Generate Account Statement & Ledger Breakdown
   */
  async generateStatement(filters: {
    account_id?: string | number
    from_date?: string
    to_date?: string
  } = {}): Promise<AccountStatementResponse> {
    const res = await api.get(`${this.baseUrl}/statements`, { params: filters })
    return res.data.data
  }

  /**
   * Get Support Tickets List
   */
  async getTickets(): Promise<SupportTicketsListResponse> {
    const res = await api.get(`${this.baseUrl}/support/tickets`)
    return res.data.data
  }

  /**
   * Create Support Ticket
   */
  async createTicket(payload: CreateTicketPayload): Promise<SupportTicketItem> {
    const res = await api.post(`${this.baseUrl}/support/tickets`, payload)
    return res.data.data
  }

  /**
   * Get Detailed Ticket with Messages Thread
   */
  async getTicketDetails(identifier: string | number): Promise<SupportTicketItem> {
    const res = await api.get(`${this.baseUrl}/support/tickets/${identifier}`)
    return res.data.data
  }

  /**
   * Reply to Support Ticket
   */
  async replyTicket(
    identifier: string | number,
    message: string,
    attachments?: any[]
  ): Promise<SupportTicketMessageItem> {
    const res = await api.post(`${this.baseUrl}/support/tickets/${identifier}/reply`, {
      message,
      attachments,
    })
    return res.data.data
  }

  /**
   * Close Support Ticket
   */
  async closeTicket(identifier: string | number): Promise<SupportTicketItem> {
    const res = await api.post(`${this.baseUrl}/support/tickets/${identifier}/close`)
    return res.data.data
  }
}

export const clientPortalVaultService = new ClientPortalVaultService()
export default clientPortalVaultService
