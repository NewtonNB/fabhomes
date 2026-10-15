import api from '../config/api'
import {
  Transaction,
  TransactionFilters,
  CreateTransactionInput,
  ReverseTransactionInput,
  TransactionStatistics,
  ReconciliationReport,
} from '../types/transaction.types'

class TransactionService {
  /**
   * Get paginated transactions ledger with optional filters
   */
  async getTransactions(filters?: TransactionFilters): Promise<{ data: Transaction[]; meta: any }> {
    const response = await api.get('/transactions', { params: filters })
    return response.data
  }

  /**
   * Get single transaction details
   */
  async getTransaction(uuid: string): Promise<Transaction> {
    const response = await api.get(`/transactions/${uuid}`)
    return response.data.data
  }

  /**
   * Create / post a manual transaction to the ledger
   */
  async createTransaction(data: CreateTransactionInput): Promise<Transaction> {
    const response = await api.post('/transactions', data)
    return response.data.data
  }

  /**
   * Reverse an immutable posted transaction with reason
   */
  async reverseTransaction(
    uuid: string,
    data: ReverseTransactionInput
  ): Promise<{ original_transaction: Transaction; reversal_transaction: Transaction }> {
    const response = await api.post(`/transactions/${uuid}/reverse`, data)
    return response.data.data
  }

  /**
   * Perform automated ledger reconciliation check
   */
  async getReconciliation(): Promise<ReconciliationReport> {
    const response = await api.get('/transactions/reconciliation')
    return response.data.data
  }

  /**
   * Get ledger statistics and flow breakdown
   */
  async getStatistics(params?: { client_id?: string; account_id?: string }): Promise<TransactionStatistics> {
    const response = await api.get('/admin/transactions/statistics', { params })
    return response.data.data
  }
}

export const transactionService = new TransactionService()
export default transactionService
