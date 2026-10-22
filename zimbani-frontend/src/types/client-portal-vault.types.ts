export interface VaultDocumentItem {
  id: number
  uuid: string
  title: string
  document_type: 'contract' | 'receipt' | 'title_deed' | 'deed_plan' | 'survey' | 'kyc' | 'other'
  description?: string
  file_name: string
  file_size: string
  file_type: string
  download_url?: string
  is_verified: boolean
  created_at: string
}

export interface VaultDocumentsResponse {
  documents: VaultDocumentItem[]
  total_count: number
  categories: {
    all: number
    contracts: number
    receipts: number
    title_deeds: number
    surveys: number
    kyc: number
  }
}

export interface StatementHeader {
  statement_reference: string
  generated_at: string
  client_name: string
  client_number: string
  client_email: string
  client_phone: string
  scheme_name: string
  account_number: string
  period: {
    from: string
    to: string
  }
  currency: string
}

export interface StatementFinancialSummary {
  opening_balance: number
  total_deposits: number
  total_disbursements: number
  net_closing_balance: number
}

export interface StatementEntry {
  id: number
  uuid: string
  transaction_number: string
  date: string
  description: string
  narration?: string
  reference?: string
  type: 'credit' | 'debit'
  debit: number
  credit: number
  running_balance: number
}

export interface AccountStatementResponse {
  header: StatementHeader
  financial_summary: StatementFinancialSummary
  entries: StatementEntry[]
}

export interface SupportTicketMessageItem {
  id: number
  uuid: string
  sender_type: 'client' | 'agent' | 'system'
  sender_name?: string
  message: string
  attachments?: { title: string; url: string; size?: number }[]
  created_at: string
}

export interface SupportTicketItem {
  id: number
  uuid: string
  ticket_number: string
  subject: string
  category: 'savings_query' | 'plot_reservation' | 'title_deed' | 'construction_snag' | 'payment_issue' | 'general'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'waiting_client' | 'resolved' | 'closed'
  message_count: number
  last_message?: string
  assigned_agent: string
  last_replied_at?: string
  created_at: string
  messages?: SupportTicketMessageItem[]
}

export interface SupportTicketsListResponse {
  tickets: SupportTicketItem[]
  open_count: number
  resolved_count: number
}

export interface CreateTicketPayload {
  subject: string
  message: string
  category?: string
  priority?: string
  project_id?: number
  unit_id?: number
  savings_account_id?: number
  attachments?: any[]
}
