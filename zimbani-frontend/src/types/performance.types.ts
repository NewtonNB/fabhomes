export interface CacheTelemetry {
  driver: string;
  supports_native_tags: boolean;
  total_hits: number;
  total_misses: number;
  total_writes: number;
  total_flushes: number;
  hit_rate_percentage: number;
  last_flush_at: string | null;
  status: string;
  redis_configured: boolean;
}

export interface TableMetric {
  table: string;
  row_count: number;
  index_count: number;
  status: string;
}

export interface DatabaseTelemetry {
  connection: string;
  database_name: string;
  tables: TableMetric[];
  fulltext_search_enabled: boolean;
  composite_indexing: string;
}

export interface MemoryTelemetry {
  current_mb: number;
  peak_mb: number;
  php_version: string;
}

export interface PerformanceMetricsData {
  cache: CacheTelemetry;
  database: DatabaseTelemetry;
  memory: MemoryTelemetry;
  timestamp: string;
}

export interface UniversalSearchResultItem {
  id: number;
  uuid: string;
  title: string;
  subtitle: string;
  category: string;
  status: string;
  price?: string | null;
  file_size?: string | null;
  amount?: string | null;
  description?: string | null;
  created_at: string;
}

export interface UniversalSearchData {
  query: string;
  total_matches: number;
  execution_time_ms: number;
  source: 'database_fulltext' | 'cache' | 'validation_empty';
  timestamp: string;
  scopes: string[];
  results: {
    units: UniversalSearchResultItem[];
    documents: UniversalSearchResultItem[];
    transactions: UniversalSearchResultItem[];
  };
}

export interface BenchmarkData {
  benchmark_term: string;
  iterations: number;
  cold_query_ms: number;
  warm_cached_ms: number;
  speedup_multiplier: string;
  latency_reduction_percent: string;
  performance_grade: string;
  timestamp: string;
}
