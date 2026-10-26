import api from '../config/api'

export interface SchemeTransferItem {
  id: number
  uuid: string
  client_id: number
  from_savings_account_id: number
  to_savings_account_id?: number
  from_scheme_name: string
  to_scheme_name: string
  amount: number
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  reviewed_at?: string
  notes?: string
  client?: {
    id: number
    uuid: string
    full_name?: string
    first_name?: string
    last_name?: string
    client_number?: string
  }
  from_account?: {
    id: number
    uuid: string
    account_number: string
    scheme_name: string
    current_balance: number
  }
  to_account?: {
    id: number
    uuid: string
    account_number: string
    scheme_name: string
    current_balance: number
  }
  reviewed_by?: {
    id: number
    name: string
  }
  created_at: string
}

export const schemeTransferService = {
  getTransfers: async (params?: Record<string, any>) => {
    const res = await api.get('/scheme-transfers', { params })
    return res.data
  },

  createTransfer: async (data: {
    client_id: number | string
    from_savings_account_id: number
    to_savings_account_id?: number
    from_scheme_name: string
    to_scheme_name: string
    amount: number
    reason: string
  }) => {
    const res = await api.post('/scheme-transfers', data)
    return res.data
  },

  approveTransfer: async (uuid: string, notes?: string) => {
    const res = await api.post(`/scheme-transfers/${uuid}/approve`, { notes })
    return res.data
  },

  rejectTransfer: async (uuid: string, notes?: string) => {
    const res = await api.post(`/scheme-transfers/${uuid}/reject`, { notes })
    return res.data
  },
}

export default schemeTransferService
