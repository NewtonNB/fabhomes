<?php

require __DIR__ . '/zimbani-backend/vendor/autoload.php';

$app = require_once __DIR__ . '/zimbani-backend/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\Cache\PerformanceCacheService;
use App\Services\Search\FullTextSearchService;
use App\Http\Controllers\Api\PerformanceTuningController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

$passed = 0;
$total = 0;

function assertCondition($condition, $description) {
    global $passed, $total;
    $total++;
    if ($condition) {
        $passed++;
        echo "  [PASS] {$description}\n";
    } else {
        echo "  [FAIL] {$description}\n";
    }
}

echo "\n=======================================================\n";
echo "  PHASE 14 DAY 2: DATABASE TUNING & QUERY CACHING TEST\n";
echo "=======================================================\n\n";

// --- 1. Test Database Composite & FullText Indexes ---
echo "--- 1. Testing Database Composite & FullText Indexes ---\n";

function checkIndex(string $table, string $indexName): bool {
    $dbName = config('database.connections.mysql.database');
    $rows = DB::select(
        "SELECT COUNT(1) as count FROM INFORMATION_SCHEMA.STATISTICS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?",
        [$dbName, $table, $indexName]
    );
    return !empty($rows) && $rows[0]->count > 0;
}

assertCondition(checkIndex('transactions', 'idx_tx_status_type_date'), 'transactions has composite index idx_tx_status_type_date');
assertCondition(checkIndex('transactions', 'idx_tx_client_status_date'), 'transactions has composite index idx_tx_client_status_date');
assertCondition(checkIndex('transactions', 'idx_tx_ref_status'), 'transactions has composite index idx_tx_ref_status');
assertCondition(checkIndex('transactions', 'ft_transactions_search'), 'transactions has fulltext index ft_transactions_search');

assertCondition(checkIndex('payments', 'idx_payments_client_status_date'), 'payments has composite index idx_payments_client_status_date');
assertCondition(checkIndex('payments', 'idx_payments_method_status_date'), 'payments has composite index idx_payments_method_status_date');
assertCondition(checkIndex('payments', 'ft_payments_search'), 'payments has fulltext index ft_payments_search');

assertCondition(checkIndex('savings_accounts', 'idx_savings_client_type_status'), 'savings_accounts has composite index idx_savings_client_type_status');
assertCondition(checkIndex('savings_accounts', 'idx_savings_status_target_date'), 'savings_accounts has composite index idx_savings_status_target_date');

assertCondition(checkIndex('app_notifications', 'idx_notif_user_cat_read_created'), 'app_notifications has composite index idx_notif_user_cat_read_created');

assertCondition(checkIndex('units', 'idx_units_site_status_type'), 'units has composite index idx_units_site_status_type');
assertCondition(checkIndex('units', 'idx_units_block_unit'), 'units has composite index idx_units_block_unit');
assertCondition(checkIndex('units', 'ft_units_search'), 'units has fulltext index ft_units_search');

assertCondition(checkIndex('documents', 'idx_docs_type_status_created'), 'documents has composite index idx_docs_type_status_created');
assertCondition(checkIndex('documents', 'ft_documents_search'), 'documents has fulltext index ft_documents_search');

assertCondition(checkIndex('security_audit_logs', 'idx_audit_event_severity_created'), 'security_audit_logs has composite index idx_audit_event_severity_created');


// --- 2. Test PerformanceCacheService ---
echo "\n--- 2. Testing PerformanceCacheService (Tagged & Multi-Store) ---\n";
$cacheService = app(PerformanceCacheService::class);

assertCondition($cacheService instanceof PerformanceCacheService, 'PerformanceCacheService instantiated successfully');

$driver = $cacheService->getDriverName();
assertCondition(!empty($driver), "PerformanceCacheService identifies driver: {$driver}");

// Test set & get
$testKey = 'test:perf_key_' . uniqid();
$cacheService->set($testKey, ['foo' => 'bar', 'time' => time()], 300, ['unit_test']);
assertCondition($cacheService->has($testKey), 'PerformanceCacheService has() detects stored key');

$fetched = $cacheService->get($testKey);
assertCondition(is_array($fetched) && ($fetched['foo'] ?? null) === 'bar', 'PerformanceCacheService retrieves stored payload');

// Test remember
$rememberKey = 'test:remember_' . uniqid();
$computed = $cacheService->remember($rememberKey, 300, function () {
    return 'computed_val_' . 42;
}, ['unit_test']);
assertCondition($computed === 'computed_val_42', 'PerformanceCacheService remember computes closure on miss');

// Second call should hit cache
$cachedVal = $cacheService->remember($rememberKey, 300, function () {
    return 'should_not_run';
}, ['unit_test']);
assertCondition($cachedVal === 'computed_val_42', 'PerformanceCacheService remember returns cached value without executing closure');

// Test Tag Flush
$tagAKey = 'test:tag_a_' . uniqid();
$tagBKey = 'test:tag_b_' . uniqid();
$cacheService->set($tagAKey, 'value_a', 300, ['isolated_tag']);
$cacheService->set($tagBKey, 'value_b', 300, ['other_tag']);

$flushedCount = $cacheService->flushTags(['isolated_tag']);
assertCondition($flushedCount >= 1, "PerformanceCacheService flushed isolated_tag (count: {$flushedCount})");
assertCondition(!$cacheService->has($tagAKey), 'Tagged key tagAKey is successfully invalidated');
assertCondition($cacheService->has($tagBKey), 'Unrelated key tagBKey remains preserved in cache');

// Clean up
$cacheService->forget($tagBKey);
$cacheService->forget($testKey);
$cacheService->forget($rememberKey);

// Telemetry
$telemetry = $cacheService->getTelemetry();
assertCondition(isset($telemetry['total_hits']) && isset($telemetry['total_misses']), 'Cache telemetry tracks hits and misses');
assertCondition(isset($telemetry['hit_rate_percentage']), 'Cache telemetry provides hit rate percentage');
assertCondition(isset($telemetry['total_flushes']) && $telemetry['total_flushes'] >= 1, 'Cache telemetry records flushes');


// --- 3. Test FullTextSearchService ---
echo "\n--- 3. Testing FullTextSearchService (Multi-Scope & Benchmarking) ---\n";
$searchService = app(FullTextSearchService::class);

assertCondition($searchService instanceof FullTextSearchService, 'FullTextSearchService instantiated successfully');

// Short query validation
$emptySearch = $searchService->search('a');
assertCondition($emptySearch['source'] === 'validation_empty', 'Short query < 2 chars returns validation_empty source');

// Ensure seed data exists for search tests
$testUnit = DB::table('units')->first();
$searchTerm = $testUnit ? substr($testUnit->name, 0, 4) : 'plot';

$searchResult1 = $searchService->search($searchTerm, ['units'], 10);
assertCondition(isset($searchResult1['results']['units']), 'Search across units returns structured units array');
assertCondition(isset($searchResult1['execution_time_ms']), "Search records execution time: {$searchResult1['execution_time_ms']} ms");
assertCondition($searchResult1['source'] === 'database_fulltext', 'First search execution runs live database_fulltext query');

// Cached search verification
$searchResult2 = $searchService->search($searchTerm, ['units'], 10);
assertCondition($searchResult2['source'] === 'cache', 'Subsequent identical search is served directly from cache');
assertCondition(isset($searchResult2['total_matches']), 'Cached search preserves total_matches metric');

// Multi-scope search
$multiSearch = $searchService->search($searchTerm, ['units', 'documents', 'transactions'], 5);
assertCondition(array_key_exists('units', $multiSearch['results']), 'Multi-scope search includes units');
assertCondition(array_key_exists('documents', $multiSearch['results']), 'Multi-scope search includes documents');
assertCondition(array_key_exists('transactions', $multiSearch['results']), 'Multi-scope search includes transactions');

// Benchmark execution
$benchmark = $searchService->benchmark(2, $searchTerm);
assertCondition(isset($benchmark['cold_query_ms']), "Benchmark calculates cold query time: {$benchmark['cold_query_ms']} ms");
assertCondition(isset($benchmark['warm_cached_ms']), "Benchmark calculates warm cached time: {$benchmark['warm_cached_ms']} ms");
assertCondition(isset($benchmark['speedup_multiplier']), "Benchmark calculates speedup multiplier: {$benchmark['speedup_multiplier']}");
assertCondition(isset($benchmark['performance_grade']), "Benchmark assigns performance grade: {$benchmark['performance_grade']}");


// --- 4. Test PerformanceTuningController Endpoints ---
echo "\n--- 4. Testing PerformanceTuningController Endpoints ---\n";
$controller = app(PerformanceTuningController::class);

// GET metrics
$metricsResponse = $controller->metrics();
$metricsData = json_decode($metricsResponse->getContent(), true);
assertCondition($metricsResponse->getStatusCode() === 200, 'GET /metrics returns HTTP 200');
assertCondition(isset($metricsData['data']['cache']['driver']), 'Metrics contains cache driver info');
assertCondition(isset($metricsData['data']['database']['tables']), 'Metrics contains database table statistics');
assertCondition(count($metricsData['data']['database']['tables']) >= 6, 'Metrics monitors at least 6 core database tables');
assertCondition(isset($metricsData['data']['memory']['current_mb']), 'Metrics contains PHP memory footprint');

// GET search
$searchRequest = Request::create('/api/v1/performance/search', 'GET', [
    'q' => $searchTerm,
    'scopes' => 'units,documents',
    'limit' => 5,
]);
$searchResponse = $controller->search($searchRequest);
$searchData = json_decode($searchResponse->getContent(), true);
assertCondition($searchResponse->getStatusCode() === 200, 'GET /search returns HTTP 200');
assertCondition(isset($searchData['data']['results']), 'Search endpoint returns grouped results');
assertCondition(isset($searchData['data']['execution_time_ms']), 'Search endpoint returns latency execution_time_ms');

// POST benchmark
$benchRequest = Request::create('/api/v1/performance/benchmark', 'POST', [
    'iterations' => 2,
    'term' => $searchTerm,
]);
$benchResponse = $controller->benchmark($benchRequest);
$benchData = json_decode($benchResponse->getContent(), true);
assertCondition($benchResponse->getStatusCode() === 200, 'POST /benchmark returns HTTP 200');
assertCondition(isset($benchData['data']['speedup_multiplier']), 'Benchmark endpoint calculates speedup');

// POST cache flush
$flushRequest = Request::create('/api/v1/performance/cache/flush', 'POST', [
    'tags' => ['search'],
]);
$flushResponse = $controller->flushCache($flushRequest);
$flushData = json_decode($flushResponse->getContent(), true);
assertCondition($flushResponse->getStatusCode() === 200, 'POST /cache/flush returns HTTP 200');
assertCondition(isset($flushData['data']['telemetry']), 'POST /cache/flush returns updated cache telemetry');

echo "\n=======================================================\n";
echo "  PHASE 14 DAY 2 VERIFICATION RESULTS: {$passed}/{$total} PASSED (" . round(($passed / max($total, 1)) * 100) . "%)\n";
echo "=======================================================\n\n";

if ($passed === $total) {
    exit(0);
} else {
    exit(1);
}
