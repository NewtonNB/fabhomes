import {
  OfflineCachePackage,
  OfflineInspectionPayload,
  OfflinePunchPayload,
} from '../types/offline-audit.types'

const DB_NAME = 'zimbani_offline_site_audit_db'
const DB_VERSION = 1
const STORE_PACKAGE = 'offline_package'
const STORE_INSPECTIONS = 'queued_inspections'
const STORE_PUNCH_ITEMS = 'queued_punch_items'

class OfflineStorageService {
  private dbPromise: Promise<IDBDatabase | null> | null = null

  constructor() {
    this.initDeviceId()
  }

  /**
   * Get or initialize a stable device ID for offline sync telemetry
   */
  public getDeviceId(): string {
    let id = localStorage.getItem('zimbani_device_id')
    if (!id) {
      id = 'DEVICE-' + Math.random().toString(36).substring(2, 10).toUpperCase()
      localStorage.setItem('zimbani_device_id', id)
    }
    return id
  }

  private initDeviceId() {
    this.getDeviceId()
  }

  /**
   * Initialize IndexedDB database connection
   */
  private async getDB(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return null
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve) => {
        try {
          const request = window.indexedDB.open(DB_NAME, DB_VERSION)

          request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
            const db = (event.target as IDBOpenDBRequest).result
            if (!db.objectStoreNames.contains(STORE_PACKAGE)) {
              db.createObjectStore(STORE_PACKAGE, { keyPath: 'key' })
            }
            if (!db.objectStoreNames.contains(STORE_INSPECTIONS)) {
              db.createObjectStore(STORE_INSPECTIONS, { keyPath: 'client_sync_id' })
            }
            if (!db.objectStoreNames.contains(STORE_PUNCH_ITEMS)) {
              db.createObjectStore(STORE_PUNCH_ITEMS, { keyPath: 'client_sync_id' })
            }
          }

          request.onsuccess = () => resolve(request.result)
          request.onerror = () => {
            console.warn('IndexedDB open error; falling back to localStorage.')
            resolve(null)
          }
        } catch {
          resolve(null)
        }
      })
    }

    return this.dbPromise
  }

  /**
   * Cache full offline package
   */
  public async saveOfflinePackage(pkg: OfflineCachePackage): Promise<void> {
    const db = await this.getDB()
    if (db) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PACKAGE, 'readwrite')
        const store = tx.objectStore(STORE_PACKAGE)
        const req = store.put({ key: 'current_package', data: pkg, updated_at: new Date().toISOString() })
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      })
    } else {
      localStorage.setItem(STORE_PACKAGE, JSON.stringify(pkg))
    }
  }

  /**
   * Retrieve cached offline package
   */
  public async getOfflinePackage(): Promise<OfflineCachePackage | null> {
    const db = await this.getDB()
    if (db) {
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_PACKAGE, 'readonly')
        const store = tx.objectStore(STORE_PACKAGE)
        const req = store.get('current_package')
        req.onsuccess = () => resolve(req.result ? req.result.data : null)
        req.onerror = () => resolve(null)
      })
    } else {
      const raw = localStorage.getItem(STORE_PACKAGE)
      return raw ? JSON.parse(raw) : null
    }
  }

  /**
   * Enqueue site inspection created offline
   */
  public async enqueueInspection(inspection: OfflineInspectionPayload): Promise<void> {
    const db = await this.getDB()
    if (db) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_INSPECTIONS, 'readwrite')
        const store = tx.objectStore(STORE_INSPECTIONS)
        const req = store.put(inspection)
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      })
    } else {
      const list = this.getLocalStorageList<OfflineInspectionPayload>(STORE_INSPECTIONS)
      const existingIdx = list.findIndex((i) => i.client_sync_id === inspection.client_sync_id)
      if (existingIdx >= 0) {
        list[existingIdx] = inspection
      } else {
        list.push(inspection)
      }
      localStorage.setItem(STORE_INSPECTIONS, JSON.stringify(list))
    }
  }

  /**
   * Enqueue punch list defect created offline
   */
  public async enqueuePunchItem(item: OfflinePunchPayload): Promise<void> {
    const db = await this.getDB()
    if (db) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PUNCH_ITEMS, 'readwrite')
        const store = tx.objectStore(STORE_PUNCH_ITEMS)
        const req = store.put(item)
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      })
    } else {
      const list = this.getLocalStorageList<OfflinePunchPayload>(STORE_PUNCH_ITEMS)
      const existingIdx = list.findIndex((p) => p.client_sync_id === item.client_sync_id)
      if (existingIdx >= 0) {
        list[existingIdx] = item
      } else {
        list.push(item)
      }
      localStorage.setItem(STORE_PUNCH_ITEMS, JSON.stringify(list))
    }
  }

  /**
   * Get all queued offline inspections
   */
  public async getQueuedInspections(): Promise<OfflineInspectionPayload[]> {
    const db = await this.getDB()
    if (db) {
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_INSPECTIONS, 'readonly')
        const store = tx.objectStore(STORE_INSPECTIONS)
        const req = store.getAll()
        req.onsuccess = () => resolve(req.result || [])
        req.onerror = () => resolve([])
      })
    } else {
      return this.getLocalStorageList<OfflineInspectionPayload>(STORE_INSPECTIONS)
    }
  }

  /**
   * Get all queued offline punch items
   */
  public async getQueuedPunchItems(): Promise<OfflinePunchPayload[]> {
    const db = await this.getDB()
    if (db) {
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_PUNCH_ITEMS, 'readonly')
        const store = tx.objectStore(STORE_PUNCH_ITEMS)
        const req = store.getAll()
        req.onsuccess = () => resolve(req.result || [])
        req.onerror = () => resolve([])
      })
    } else {
      return this.getLocalStorageList<OfflinePunchPayload>(STORE_PUNCH_ITEMS)
    }
  }

  /**
   * Clear synced items from queue by client_sync_id
   */
  public async clearSyncedItems(inspectionIds: string[], punchItemIds: string[]): Promise<void> {
    const db = await this.getDB()
    if (db) {
      if (inspectionIds.length > 0) {
        const tx1 = db.transaction(STORE_INSPECTIONS, 'readwrite')
        const store1 = tx1.objectStore(STORE_INSPECTIONS)
        inspectionIds.forEach((id) => store1.delete(id))
      }
      if (punchItemIds.length > 0) {
        const tx2 = db.transaction(STORE_PUNCH_ITEMS, 'readwrite')
        const store2 = tx2.objectStore(STORE_PUNCH_ITEMS)
        punchItemIds.forEach((id) => store2.delete(id))
      }
    } else {
      const inspList = this.getLocalStorageList<OfflineInspectionPayload>(STORE_INSPECTIONS).filter(
        (i) => !inspectionIds.includes(i.client_sync_id)
      )
      localStorage.setItem(STORE_INSPECTIONS, JSON.stringify(inspList))

      const punchList = this.getLocalStorageList<OfflinePunchPayload>(STORE_PUNCH_ITEMS).filter(
        (p) => !punchItemIds.includes(p.client_sync_id)
      )
      localStorage.setItem(STORE_PUNCH_ITEMS, JSON.stringify(punchList))
    }
  }

  /**
   * Get queue summary count
   */
  public async getQueueSummary(): Promise<{ inspections: number; punch_items: number; total: number }> {
    const [inspections, punchItems] = await Promise.all([
      this.getQueuedInspections(),
      this.getQueuedPunchItems(),
    ])
    return {
      inspections: inspections.length,
      punch_items: punchItems.length,
      total: inspections.length + punchItems.length,
    }
  }

  private getLocalStorageList<T>(key: string): T[] {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }
}

export const offlineStorageService = new OfflineStorageService()
export default offlineStorageService
