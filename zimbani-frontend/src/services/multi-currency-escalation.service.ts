import api from '../config/api'
import {
  FxConversionResult,
  FxHedgingContract,
  MaterialPriceIndex,
  BoqEscalationResult,
  MultiCurrencyStatistics,
  CreateHedgingContractPayload,
  DrawdownHedgingPayload,
  UpdateMaterialPricePayload,
} from '../types/multi-currency-escalation.types'

class MultiCurrencyEscalationService {
  /**
   * Get active exchange rates against UGX
   */
  async getRates(): Promise<Record<string, number>> {
    const response = await api.get<{
      success: boolean
      data: Record<string, number>
    }>('/fx/rates')
    return response.data.data
  }

  /**
   * Convert an amount between currencies
   */
  async convertCurrency(
    amount: number,
    from: string,
    to: string,
    date?: string
  ): Promise<FxConversionResult> {
    const q = new URLSearchParams({
      amount: String(amount),
      from_currency: from,
      to_currency: to,
    })
    if (date) q.append('rate_date', date)

    const response = await api.get<{
      success: boolean
      data: FxConversionResult
    }>(`/fx/convert?${q.toString()}`)
    return response.data.data
  }

  /**
   * List diaspora forward FX hedging contracts
   */
  async getHedgingContracts(params?: {
    status?: string
    base_currency?: string
    client_id?: number
    page?: number
    per_page?: number
  }): Promise<{
    data: FxHedgingContract[]
    total: number
    current_page: number
    last_page: number
  }> {
    const q = new URLSearchParams()
    if (params?.status) q.append('status', params.status)
    if (params?.base_currency) q.append('base_currency', params.base_currency)
    if (params?.client_id) q.append('client_id', String(params.client_id))
    if (params?.page) q.append('page', String(params.page))
    if (params?.per_page) q.append('per_page', String(params.per_page))

    const response = await api.get<{
      success: boolean
      data: {
        data: FxHedgingContract[]
        total: number
        current_page: number
        last_page: number
      }
    }>(`/fx/hedging-contracts?${q.toString()}`)
    return response.data.data
  }

  /**
   * Create forward FX rate lock for client
   */
  async createHedgingContract(
    payload: CreateHedgingContractPayload
  ): Promise<FxHedgingContract> {
    const response = await api.post<{
      success: boolean
      message: string
      data: FxHedgingContract
    }>('/fx/hedging-contracts', payload)
    return response.data.data
  }

  /**
   * Draw down funds from hedging contract into milestone pool
   */
  async drawdownHedgingContract(
    uuid: string,
    payload: DrawdownHedgingPayload
  ): Promise<{
    contract: FxHedgingContract
    drawn_foreign: number
    drawn_local: number
    effective_rate: number
    remaining_foreign: number
  }> {
    const response = await api.post<{
      success: boolean
      message: string
      data: {
        contract: FxHedgingContract
        drawn_foreign: number
        drawn_local: number
        effective_rate: number
        remaining_foreign: number
      }
    }>(`/fx/hedging-contracts/${uuid}/drawdown`, payload)
    return response.data.data
  }

  /**
   * List material price indices
   */
  async getIndices(): Promise<MaterialPriceIndex[]> {
    const response = await api.get<{
      success: boolean
      data: MaterialPriceIndex[]
    }>('/escalation/indices')
    return response.data.data
  }

  /**
   * Get specific index details with material basket items
   */
  async getIndex(uuid: string): Promise<MaterialPriceIndex> {
    const response = await api.get<{
      success: boolean
      data: MaterialPriceIndex
    }>(`/escalation/indices/${uuid}`)
    return response.data.data
  }

  /**
   * Update market spot price for material item in index basket
   */
  async updateMaterialPrice(
    indexUuid: string,
    payload: UpdateMaterialPricePayload
  ): Promise<{
    record: any
    index: MaterialPriceIndex
  }> {
    const response = await api.post<{
      success: boolean
      message: string
      data: {
        record: any
        index: MaterialPriceIndex
      }
    }>(`/escalation/indices/${indexUuid}/update-price`, payload)
    return response.data.data
  }

  /**
   * Calculate BOQ Escalation under FIDIC Clause 70
   */
  async calculateBoqEscalation(
    initialBoqAmount: number,
    indexId?: number
  ): Promise<BoqEscalationResult> {
    const response = await api.post<{
      success: boolean
      data: BoqEscalationResult
    }>('/escalation/calculate-adjustment', {
      initial_boq_amount: initialBoqAmount,
      index_id: indexId,
    })
    return response.data.data
  }

  /**
   * Overall multi-currency and material escalation statistics
   */
  async getStatistics(): Promise<MultiCurrencyStatistics> {
    const response = await api.get<{
      success: boolean
      data: MultiCurrencyStatistics
    }>('/escalation/statistics')
    return response.data.data
  }
}

export const multiCurrencyEscalationService = new MultiCurrencyEscalationService()
export default multiCurrencyEscalationService
