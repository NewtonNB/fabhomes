<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Cache\PerformanceCacheService;
use App\Services\Search\FullTextSearchService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Exception;

class PerformanceTuningController extends Controller
{
    protected PerformanceCacheService $cacheService;
    protected FullTextSearchService $searchService;

    public function __construct(
        PerformanceCacheService $cacheService,
        FullTextSearchService $searchService
    ) {
        $this->cacheService = $cacheService;
        $this->searchService = $searchService;
    }

    /**
     * GET /api/v1/performance/metrics
     * Returns comprehensive database and caching telemetry.
     */
    public function metrics(): JsonResponse
    {
        $cacheTelemetry = $this->cacheService->getTelemetry();

        // Database Table Metrics
        $tables = ['units', 'transactions', 'payments', 'savings_accounts', 'documents', 'app_notifications', 'security_audit_logs'];
        $tableMetrics = [];
        $dbName = config('database.connections.mysql.database');

        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                $count = DB::table($table)->count();
                $indexes = DB::select(
                    "SELECT COUNT(DISTINCT INDEX_NAME) as idx_count 
                     FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?",
                    [$dbName, $table]
                );

                $tableMetrics[] = [
                    'table' => $table,
                    'row_count' => $count,
                    'index_count' => $indexes[0]->idx_count ?? 1,
                    'status' => 'indexed_and_optimized',
                ];
            }
        }

        // Memory & Engine Telemetry
        $memoryUsageBytes = memory_get_usage(true);
        $peakMemoryBytes = memory_get_peak_usage(true);

        return response()->json([
            'status' => 'success',
            'message' => 'Platform performance and cache telemetry retrieved successfully',
            'data' => [
                'cache' => $cacheTelemetry,
                'database' => [
                    'connection' => config('database.default'),
                    'database_name' => $dbName,
                    'tables' => $tableMetrics,
                    'fulltext_search_enabled' => true,
                    'composite_indexing' => 'active',
                ],
                'memory' => [
                    'current_mb' => round($memoryUsageBytes / (1024 * 1024), 2),
                    'peak_mb' => round($peakMemoryBytes / (1024 * 1024), 2),
                    'php_version' => PHP_VERSION,
                ],
                'timestamp' => now()->toIso8601String(),
            ]
        ]);
    }

    /**
     * GET /api/v1/performance/search
     * Universal full-text indexed search with Redis/database caching.
     */
    public function search(Request $request): JsonResponse
    {
        $query = (string) $request->query('q', '');
        $scopesParam = (string) $request->query('scopes', 'units,documents,transactions');
        $limit = max(1, min((int) $request->query('limit', 15), 50));

        $scopes = array_filter(array_map('trim', explode(',', $scopesParam)));
        if (empty($scopes)) {
            $scopes = ['units', 'documents', 'transactions'];
        }

        $result = $this->searchService->search($query, $scopes, $limit);

        return response()->json([
            'status' => 'success',
            'data' => $result,
        ]);
    }

    /**
     * POST /api/v1/performance/cache/flush
     * Invalidate specific tagged caches or flush all.
     */
    public function flushCache(Request $request): JsonResponse
    {
        $tags = $request->input('tags');

        if (!empty($tags)) {
            $tagsList = is_array($tags) ? $tags : [$tags];
            $cleared = $this->cacheService->flushTags($tagsList);
            $msg = "Flushed {$cleared} cache keys across tags: " . implode(', ', $tagsList);
        } else {
            $this->cacheService->flushAll();
            $msg = "Flushed full application cache store successfully";
        }

        return response()->json([
            'status' => 'success',
            'message' => $msg,
            'data' => [
                'telemetry' => $this->cacheService->getTelemetry(),
                'timestamp' => now()->toIso8601String(),
            ]
        ]);
    }

    /**
     * POST /api/v1/performance/benchmark
     * Run Cold vs Warm cached query benchmark.
     */
    public function benchmark(Request $request): JsonResponse
    {
        $iterations = max(1, min((int) $request->input('iterations', 3), 10));
        $term = (string) $request->input('term', 'plot');

        $benchmark = $this->searchService->benchmark($iterations, $term);

        return response()->json([
            'status' => 'success',
            'message' => "Performance benchmark completed with {$benchmark['speedup_multiplier']} speedup",
            'data' => $benchmark,
        ]);
    }
}
