import api from '../config/api'
import offlineStorageService from './offline-storage.service'
import {
  OfflineCachePackage,
  OfflineSyncBatch,
  OfflineSyncResult,
  OfflineSyncLog,
  QAInspectionChecklistItem,
} from '../types/offline-audit.types'

class OfflineSyncService {
  private isOnlineStatus: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true
  private listeners: Array<(isOnline: boolean) => void> = []

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnlineStatus = true
        this.notifyListeners()
        // Auto-sync pending items when network connectivity resumes
        this.syncOfflineQueue().catch((err) =>
          console.warn('Auto-sync on network reconnect failed:', err)
        )
      })

      window.addEventListener('offline', () => {
        this.isOnlineStatus = false
        this.notifyListeners()
      })
    }
  }

  public isOnline(): boolean {
    return this.isOnlineStatus
  }

  public onNetworkChange(callback: (isOnline: boolean) => void): () => void {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback)
    }
  }

  private notifyListeners() {
    this.listeners.forEach((cb) => cb(this.isOnlineStatus))
  }

  /**
   * Fetch complete offline bundle from backend and cache locally in IndexedDB
   */
  async downloadOfflinePackage(
    projectId?: number,
    siteId?: number
  ): Promise<OfflineCachePackage> {
    const q = new URLSearchParams()
    if (projectId) q.append('project_id', String(projectId))
    if (siteId) q.append('site_id', String(siteId))

    const response = await api.get<{
      success: boolean
      data: OfflineCachePackage
    }>(`/site-audits/cache-package?${q.toString()}`)

    const pkg = response.data.data
    await offlineStorageService.saveOfflinePackage(pkg)
    return pkg
  }

  /**
   * Fetch standard checklist QA templates
   */
  async getChecklistTemplates(): Promise<Record<string, QAInspectionChecklistItem[]>> {
    const response = await api.get<{
      success: boolean
      data: Record<string, QAInspectionChecklistItem[]>
    }>('/site-audits/checklist-templates')
    return response.data.data
  }

  /**
   * Synchronize all locally queued offline inspections and punch items to cloud
   */
  async syncOfflineQueue(): Promise<{
    result: OfflineSyncResult | null
    syncedCount: number
  }> {
    const [inspections, punchItems] = await Promise.all([
      offlineStorageService.getQueuedInspections(),
      offlineStorageService.getQueuedPunchItems(),
    ])

    if (inspections.length === 0 && punchItems.length === 0) {
      return { result: null, syncedCount: 0 }
    }

    const deviceId = offlineStorageService.getDeviceId()
    const batchPayload: OfflineSyncBatch = {
      device_id: deviceId,
      client_version: '1.2.0',
      sync_type: 'walkthrough_audit_batch',
      inspections,
      punch_list_items: punchItems,
    }

    const response = await api.post<{
      success: boolean
      message: string
      data: OfflineSyncResult
    }>('/site-audits/sync', batchPayload)

    const syncResult = response.data.data

    // Clear synchronized items from local IndexedDB
    const syncedInspIds = inspections.map((i) => i.client_sync_id)
    const syncedPunchIds = punchItems.map((p) => p.client_sync_id)
    await offlineStorageService.clearSyncedItems(syncedInspIds, syncedPunchIds)

    return {
      result: syncResult,
      syncedCount: syncResult.total_processed,
    }
  }

  /**
   * Get sync audit telemetry logs
   */
  async getSyncLogs(limit: number = 25): Promise<OfflineSyncLog[]> {
    const response = await api.get<{
      success: boolean
      data: OfflineSyncLog[]
    }>(`/site-audits/sync-logs?limit=${limit}`)
    return response.data.data
  }
}

export const offlineSyncService = new OfflineSyncService()
export default offlineSyncService
