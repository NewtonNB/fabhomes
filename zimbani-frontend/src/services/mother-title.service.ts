import api from '../config/api'

export interface MotherTitle {
  id: number
  uuid: string
  record_no: string
  phase: string
  scheme: string
  title_no: string
  block_no?: string
  district: string
  sub_county?: string
  village?: string
  estate_name: string
  area_acres: number
  subdivision_date?: string
  date_of_return?: string
  new_plot_no?: string
  title_status: 'in_safe' | 'with_surveyor' | 'at_ministry' | 'subdivided' | 'transferred'
  verified_by?: string
  notes?: string
  transfers?: MotherTitleTransfer[]
  created_at: string
}

export interface MotherTitleTransfer {
  id: number
  uuid: string
  mother_title_id: number
  date_taken: string
  date_of_return?: string
  verified_by: string
  purpose: string
  status: 'out_on_loan' | 'returned' | 'overdue'
  remarks?: string
  created_at: string
}

class MotherTitleService {
  async getMotherTitles(params?: any) {
    const res = await api.get('/mother-titles', { params })
    return res.data
  }

  async getMotherTitle(id: string | number) {
    const res = await api.get(`/mother-titles/${id}`)
    return res.data.data
  }

  async createMotherTitle(data: Partial<MotherTitle>) {
    const res = await api.post('/mother-titles', data)
    return res.data
  }

  async updateMotherTitle(id: string | number, data: Partial<MotherTitle>) {
    const res = await api.put(`/mother-titles/${id}`, data)
    return res.data
  }

  async deleteMotherTitle(id: string | number) {
    const res = await api.delete(`/mother-titles/${id}`)
    return res.data
  }

  async recordTransfer(motherTitleId: string | number, data: Partial<MotherTitleTransfer>) {
    const res = await api.post(`/mother-titles/${motherTitleId}/transfer`, data)
    return res.data
  }

  async returnTransfer(transferId: string | number) {
    const res = await api.post(`/mother-title-transfers/${transferId}/return`)
    return res.data
  }

  async getSubdivisions(params?: any) {
    const res = await api.get('/mother-titles/subdivisions', { params })
    return res.data
  }
}

export default new MotherTitleService()
