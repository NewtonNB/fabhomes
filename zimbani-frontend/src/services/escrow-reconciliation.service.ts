import api from '../config/api'
import {
  EscrowReconciliation,
  EscrowReconciliationItem,
  MilestoneTriggerLog,
  ShortfallAlert,
  AccountEscrowSummary,
  ProjectEscrowSummary,
  CreateReconciliationPayload,
  ResolveItemPayload,
  EscrowReconciliationFilters,
  MilestoneTriggerLogFilters,
} from '../types/escrow-reconciliation.types'
import { MilestonePaymentRelease } from '../types/milestone-release.types'

class EscrowReconciliationService {
  /**
   * List escrow reconciliations with optional filtering and pagination.
   */
  async getReconciliations(filters: EscrowReconciliationFilters = {}): Promise<{
    data: EscrowReconciliation[]
    total: number
    current_page: number
    last_page: number
  }> {
    const params = new URLSearchParams()
    if (filters.savings_account_id) params.append('savings_account_id', String(filters.savings_account_id))
    if (filters.project_id) params.append('project_id', String(filters.project_id))
    if (filters.status) params.append('status', filters.status)
    if (filters.date_from) params.append('date_from', filters.date_from)
    if (filters.date_to) params.append('date_to', filters.date_to)
    if (filters.page) params.append('page', String(filters.page))
    if (filters.per_page) params.append('per_page', String(filters.per_page))

    const response = await api.get<{
      success: boolean
      data: {
        data: EscrowReconciliation[]
        total: number
        current_page: number
        last_page: number
      }
    }>(`/escrow-reconciliations?${params.toString()}`)
    return response.data.data
  }

  /**
   * Get single escrow reconciliation details with all items.
   */
  async getReconciliation(uuid: string): Promise<EscrowReconciliation> {
    const response = await api.get<{ success: boolean; data: EscrowReconciliation }>(
      `/escrow-reconciliations/${uuid}`
    )
    return response.data.data
  }

  /**
   * Create a new escrow reconciliation with auto-matching against ledger transactions.
   */
  async createReconciliation(payload: CreateReconciliationPayload): Promise<EscrowReconciliation> {
    const response = await api.post<{ success: boolean; message: string; data: EscrowReconciliation }>(
      '/escrow-reconciliations',
      payload
    )
    return response.data.data
  }

  /**
   * Resolve an unmatched or variance item.
   */
  async resolveItem(itemUuid: string, payload: ResolveItemPayload): Promise<EscrowReconciliationItem> {
    const response = await api.post<{ success: boolean; message: string; data: EscrowReconciliationItem }>(
      `/escrow-reconciliations/items/${itemUuid}/resolve`,
      payload
    )
    return response.data.data
  }

  /**
   * Approve a fully reconciled escrow statement.
   */
  async approveReconciliation(uuid: string, notes?: string): Promise<EscrowReconciliation> {
    const response = await api.post<{ success: boolean; message: string; data: EscrowReconciliation }>(
      `/escrow-reconciliations/${uuid}/approve`,
      { notes }
    )
    return response.data.data
  }

  /**
   * Get account reconciliation summary.
   */
  async getAccountSummary(accountId: string | number): Promise<AccountEscrowSummary> {
    const response = await api.get<{ success: boolean; data: AccountEscrowSummary }>(
      `/escrow-reconciliations/account/${accountId}`
    )
    return response.data.data
  }

  /**
   * Get project escrow summary.
   */
  async getProjectSummary(projectId: string | number): Promise<ProjectEscrowSummary> {
    const response = await api.get<{ success: boolean; data: ProjectEscrowSummary }>(
      `/escrow-reconciliations/project/${projectId}`
    )
    return response.data.data
  }

  /**
   * Trigger automated escrow evaluation and release for an approved milestone verification.
   */
  async triggerForVerification(
    verificationId: string | number
  ): Promise<{
    release: MilestonePaymentRelease | null
    trigger_log: MilestoneTriggerLog
    status: string
  }> {
    const response = await api.post<{
      success: boolean
      message: string
      data: {
        release: MilestonePaymentRelease | null
        trigger_log: MilestoneTriggerLog
        status: string
      }
    }>(`/milestone-triggers/verifications/${verificationId}/trigger`)
    return response.data.data
  }

  /**
   * Bulk evaluate all pending approved milestone verifications.
   */
  async bulkEvaluatePendingTriggers(): Promise<{
    processed_count: number
    releases_triggered: number
    shortfalls_detected: number
    skipped_count: number
    results: any[]
  }> {
    const response = await api.post<{
      success: boolean
      message: string
      data: {
        processed_count: number
        releases_triggered: number
        shortfalls_detected: number
        skipped_count: number
        results: any[]
      }
    }>('/milestone-triggers/bulk-evaluate')
    return response.data.data
  }

  /**
   * Fetch active shortfall alerts across all client escrow accounts.
   */
  async getShortfallAlerts(): Promise<ShortfallAlert[]> {
    const response = await api.get<{ success: boolean; data: ShortfallAlert[] }>(
      '/milestone-triggers/shortfall-alerts'
    )
    return response.data.data
  }

  /**
   * Fetch milestone trigger logs with optional filtering and pagination.
   */
  async getTriggerLogs(filters: MilestoneTriggerLogFilters = {}): Promise<{
    data: MilestoneTriggerLog[]
    total: number
    current_page: number
    last_page: number
  }> {
    const params = new URLSearchParams()
    if (filters.verification_id) params.append('verification_id', String(filters.verification_id))
    if (filters.savings_account_id) params.append('savings_account_id', String(filters.savings_account_id))
    if (filters.status) params.append('status', filters.status)
    if (filters.trigger_event) params.append('trigger_event', filters.trigger_event)
    if (filters.page) params.append('page', String(filters.page))
    if (filters.per_page) params.append('per_page', String(filters.per_page))

    const response = await api.get<{
      success: boolean
      data: {
        data: MilestoneTriggerLog[]
        total: number
        current_page: number
        last_page: number
      }
    }>(`/milestone-triggers/logs?${params.toString()}`)
    return response.data.data
  }
}

export default new EscrowReconciliationService()
