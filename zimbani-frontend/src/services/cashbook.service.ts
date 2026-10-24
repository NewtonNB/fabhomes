import api from '../config/api'

export interface CashBookSummary {
  cash_available: number
  total_inflow?: number
  total_outflow?: number
  net_balance?: number
  total_savings_inflow?: number
  total_savings_outflow?: number
  active_savings_accounts?: number
}

export interface CashBookTransaction {
  id: number
  uuid: string
  transaction_number: string
  reference_number?: string
  client_id?: number
  account_id?: number
  transaction_type: string
  amount: number
  currency: string
  balance_after: number
  transaction_date: string
  status: string
  description?: string
  client?: { id: number; name: string; client_number: string }
  savings_account?: { id: number; account_number: string; current_balance: number }
  metadata?: any
}

class CashBookService {
  async getOverallCashBook(params?: {
    from_date?: string
    to_date?: string
    type?: 'all' | 'inflow' | 'outflow'
    search?: string
    page?: number
    per_page?: number
  }) {
    const res = await api.get('/cashbook/overall', { params })
    return res.data
  }

  async getSavingCashBook(params?: {
    from_date?: string
    to_date?: string
    search?: string
    page?: number
    per_page?: number
  }) {
    const res = await api.get('/cashbook/savings', { params })
    return res.data
  }

  async addOrDrawCash(data: {
    action_type: 'inflow' | 'drawdown'
    amount: number
    transaction_date: string
    payment_method: string
    reference_number?: string
    cheque_voucher_no?: string
    bank_account?: string
    description: string
    account_id?: number
    client_id?: number
  }) {
    const res = await api.post('/cashbook/add-or-draw', data)
    return res.data
  }
}

export default new CashBookService()
