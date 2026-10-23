import api from '../config/api'
import {
  PerformanceMetricsData,
  UniversalSearchData,
  BenchmarkData,
} from '../types/performance.types'

class PerformanceService {
  private readonly baseUrl = '/performance'

  /**
   * Get database index status, cache telemetry, and memory profile
   */
  async getMetrics(): Promise<PerformanceMetricsData> {
    const res = await api.get(`${this.baseUrl}/metrics`)
    return res.data.data
  }

  /**
   * Fast universal fulltext search across plots, documents, and transactions
   */
  async universalSearch(
    query: string,
    scopes: string[] = ['units', 'documents', 'transactions'],
    limit: number = 15
  ): Promise<UniversalSearchData> {
    const res = await api.get(`${this.baseUrl}/search`, {
      params: {
        q: query,
        scopes: scopes.join(','),
        limit,
      },
    })
    return res.data.data
  }

  /**
   * Invalidate tagged caches or flush full application cache
   */
  async flushCache(tags?: string[]): Promise<any> {
    const res = await api.post(`${this.baseUrl}/cache/flush`, { tags })
    return res.data
  }

  /**
   * Run Cold vs Warm query benchmark
   */
  async runBenchmark(iterations: number = 3, term: string = 'plot'): Promise<BenchmarkData> {
    const res = await api.post(`${this.baseUrl}/benchmark`, {
      iterations,
      term,
    })
    return res.data.data
  }
}

export const performanceService = new PerformanceService()
export default performanceService
