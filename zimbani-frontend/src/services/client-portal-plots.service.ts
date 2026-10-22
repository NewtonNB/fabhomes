import api from '../config/api'
import {
  EstateMapResponse,
  LandTitleDeedsResponse,
  PlotsOverviewResponse,
  ReservePlotPayload,
  ReservePlotResponse,
  ClientReservationsResponse,
} from '../types/client-portal-plots.types'

class ClientPortalPlotService {
  private readonly baseUrl = '/client-portal'

  /**
   * Get Plots List with Filters
   */
  async getPlots(filters: {
    project_id?: number
    status?: string
    min_price?: number
    max_price?: number
    search?: string
  } = {}): Promise<PlotsOverviewResponse> {
    const res = await api.get(`${this.baseUrl}/plots`, { params: filters })
    return res.data.data
  }

  /**
   * Get Interactive Estate Masterplan Map Data
   */
  async getEstateMap(projectId?: number): Promise<EstateMapResponse> {
    const res = await api.get(`${this.baseUrl}/estate-map`, {
      params: projectId ? { project_id: projectId } : {},
    })
    return res.data.data
  }

  /**
   * Reserve a Plot (With Fee / Mobile Prompt)
   */
  async reservePlot(payload: ReservePlotPayload): Promise<ReservePlotResponse> {
    const res = await api.post(`${this.baseUrl}/plots/reserve`, payload)
    return res.data
  }

  /**
   * Get Client's Active & Historical Reservations
   */
  async getClientReservations(): Promise<ClientReservationsResponse> {
    const res = await api.get(`${this.baseUrl}/reservations`)
    return res.data.data
  }

  /**
   * Cancel an Active Reservation & Release Plot
   */
  async cancelReservation(uuid: string, reason?: string): Promise<{ message: string }> {
    const res = await api.post(`${this.baseUrl}/reservations/${uuid}/cancel`, { reason })
    return res.data
  }

  /**
   * Get Client's Land Titles & Deed Processing Trackers
   */
  async getLandTitleDeeds(): Promise<LandTitleDeedsResponse> {
    const res = await api.get(`${this.baseUrl}/deeds`)
    return res.data.data
  }
}

export const clientPortalPlotService = new ClientPortalPlotService()
export default clientPortalPlotService
