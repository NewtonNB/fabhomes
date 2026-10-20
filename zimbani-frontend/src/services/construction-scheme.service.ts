import api from '../config/api'
import {
  ConstructionSavingScheme,
  MilestoneSavingsPool,
  AccountReadinessAudit,
  CreateSchemePayload,
  EnrollAccountPayload,
  AllocateDepositPayload,
  RebalancePoolsPayload,
  LockPoolPayload,
} from '../types/construction-scheme.types'

class ConstructionSavingSchemeService {
  /**
   * List construction saving schemes with optional search and filters.
   */
  async getSchemes(params?: {
    project_type?: string
    is_active?: boolean
    search?: string
    page?: number
    per_page?: number
  }): Promise<{
    data: ConstructionSavingScheme[]
    total: number
    current_page: number
    last_page: number
  }> {
    const q = new URLSearchParams()
    if (params?.project_type) q.append('project_type', params.project_type)
    if (params?.is_active !== undefined) q.append('is_active', params.is_active ? '1' : '0')
    if (params?.search) q.append('search', params.search)
    if (params?.page) q.append('page', String(params.page))
    if (params?.per_page) q.append('per_page', String(params.per_page))

    const response = await api.get<{
      success: boolean
      data: {
        data: ConstructionSavingScheme[]
        total: number
        current_page: number
        last_page: number
      }
    }>(`/construction-schemes?${q.toString()}`)
    return response.data.data
  }

  /**
   * Seed default standard construction saving schemes if empty.
   */
  async seedDefaults(): Promise<ConstructionSavingScheme[]> {
    const response = await api.post<{
      success: boolean
      data: ConstructionSavingScheme[]
      message: string
    }>('/construction-schemes/seed-defaults')
    return response.data.data
  }

  /**
   * Create a new custom or template construction saving scheme.
   */
  async createScheme(payload: CreateSchemePayload): Promise<ConstructionSavingScheme> {
    const response = await api.post<{
      success: boolean
      data: ConstructionSavingScheme
      message: string
    }>('/construction-schemes', payload)
    return response.data.data
  }

  /**
   * Get single construction scheme by UUID.
   */
  async getScheme(uuid: string): Promise<ConstructionSavingScheme> {
    const response = await api.get<{
      success: boolean
      data: ConstructionSavingScheme
    }>(`/construction-schemes/${uuid}`)
    return response.data.data
  }

  /**
   * Enroll a savings account in a construction saving scheme.
   */
  async enrollAccount(
    accountUuid: string,
    payload: EnrollAccountPayload
  ): Promise<any> {
    const response = await api.post<{
      success: boolean
      data: any
      message: string
    }>(`/savings-accounts/${accountUuid}/enroll-scheme`, payload)
    return response.data.data
  }

  /**
   * Get all milestone savings pools and readiness audit for a savings account.
   */
  async getAccountPools(accountUuid: string): Promise<{
    account: any
    audit: AccountReadinessAudit
    pools: MilestoneSavingsPool[]
  }> {
    const response = await api.get<{
      success: boolean
      data: {
        account: any
        audit: AccountReadinessAudit
        pools: MilestoneSavingsPool[]
      }
    }>(`/savings-accounts/${accountUuid}/milestone-pools`)
    return response.data.data
  }

  /**
   * Allocate deposit or available savings across milestone pools (waterfall or custom).
   */
  async allocateDeposit(
    accountUuid: string,
    payload: AllocateDepositPayload
  ): Promise<{
    total_allocated: number
    allocations: any[]
    pools: MilestoneSavingsPool[]
  }> {
    const response = await api.post<{
      success: boolean
      data: {
        total_allocated: number
        allocations: any[]
        pools: MilestoneSavingsPool[]
      }
      message: string
    }>(`/savings-accounts/${accountUuid}/allocate-deposit`, payload)
    return response.data.data
  }

  /**
   * Rebalance funds between two milestone pools.
   */
  async rebalancePools(
    accountUuid: string,
    payload: RebalancePoolsPayload
  ): Promise<{
    from_pool: MilestoneSavingsPool
    to_pool: MilestoneSavingsPool
    debit_transaction: any
    credit_transaction: any
  }> {
    const response = await api.post<{
      success: boolean
      data: {
        from_pool: MilestoneSavingsPool
        to_pool: MilestoneSavingsPool
        debit_transaction: any
        credit_transaction: any
      }
      message: string
    }>(`/savings-accounts/${accountUuid}/rebalance-pools`, payload)
    return response.data.data
  }

  /**
   * Lock a milestone pool in escrow for site work commencement.
   */
  async lockPool(
    poolUuid: string,
    payload: LockPoolPayload = {}
  ): Promise<MilestoneSavingsPool> {
    const response = await api.post<{
      success: boolean
      data: MilestoneSavingsPool
      message: string
    }>(`/milestone-pools/${poolUuid}/lock`, payload)
    return response.data.data
  }

  /**
   * Get construction milestone readiness and funding audit.
   */
  async getAccountReadiness(accountUuid: string): Promise<AccountReadinessAudit> {
    const response = await api.get<{
      success: boolean
      data: AccountReadinessAudit
    }>(`/savings-accounts/${accountUuid}/scheme-readiness`)
    return response.data.data
  }
}

export const constructionSavingSchemeService = new ConstructionSavingSchemeService()
export default constructionSavingSchemeService
