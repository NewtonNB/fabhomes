import api from '../config/api'
import {
  ClientSavingsAccount,
  ClientSavingsOverviewResponse,
  ClientTransactionItem,
  DepositIntentResponse,
  DepositReceipt,
  InitiateDepositRequest,
  MilestoneProgressTracker,
} from '../types/client-portal-savings.types'

class ClientPortalSavingsService {
  private readonly baseUrl = '/client-portal'

  /**
   * Get Savings Overview & Breakdown
   */
  async getSavingsOverview(): Promise<ClientSavingsOverviewResponse> {
    const res = await api.get(`${this.baseUrl}/savings`)
    return res.data.data
  }

  /**
   * Get Details for a Single Savings Account
   */
  async getAccountDetails(identifier: string | number): Promise<ClientSavingsAccount> {
    const res = await api.get(`${this.baseUrl}/savings/${identifier}`)
    return res.data.data
  }

  /**
   * Get Filtered Transactions History
   */
  async getTransactions(filters: {
    account_id?: string | number
    transaction_type?: string
    from_date?: string
    to_date?: string
    search?: string
  } = {}): Promise<{ total: number; transactions: ClientTransactionItem[] }> {
    const res = await api.get(`${this.baseUrl}/transactions`, { params: filters })
    return res.data.data
  }

  /**
   * Initiate Self-Service Deposit Checkout Intent
   */
  async initiateDeposit(input: InitiateDepositRequest): Promise<DepositIntentResponse> {
    const res = await api.post(`${this.baseUrl}/deposits/checkout`, input)
    return res.data.data
  }

  /**
   * Confirm Deposit Payment & Post Real-Time Credit
   */
  async confirmDeposit(intentIdentifier: string): Promise<{ success: boolean; message: string; receipt: DepositReceipt }> {
    const res = await api.post(`${this.baseUrl}/deposits/${intentIdentifier}/confirm`)
    return res.data.data
  }

  /**
   * Get Visual Milestone Progress Trackers
   */
  async getMilestoneTrackers(): Promise<{ total_units: number; trackers: MilestoneProgressTracker[] }> {
    const res = await api.get(`${this.baseUrl}/milestone-trackers`)
    return res.data.data
  }
}

export const clientPortalSavingsService = new ClientPortalSavingsService()
export default clientPortalSavingsService
