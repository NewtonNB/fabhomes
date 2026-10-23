<?php

namespace App\Services\Cache;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Carbon;
use Closure;
use Exception;

class PerformanceCacheService
{
    // platform standardized tags
    public const TAG_UNITS = 'units';
    public const TAG_TRANSACTIONS = 'transactions';
    public const TAG_PAYMENTS = 'payments';
    public const TAG_SAVINGS = 'savings';
    public const TAG_DOCUMENTS = 'documents';
    public const TAG_SEARCH = 'search';
    public const TAG_SYSTEM = 'system';
    public const TAG_SECURITY = 'security';

    protected const STATS_KEY = '_cache_telemetry:stats';
    protected const TAG_REGISTRY_PREFIX = '_cache_tag_reg:';

    protected static array $inMemoryStats = [
        'hits' => 0,
        'misses' => 0,
        'writes' => 0,
        'flushes' => 0,
    ];

    /**
     * Check if the current cache store supports native tagging.
     */
    public function supportsNativeTags(): bool
    {
        try {
            $store = Cache::getStore();
            return method_exists($store, 'tags') || ($store instanceof \Illuminate\Cache\TaggableStore);
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Get the active cache driver name.
     */
    public function getDriverName(): string
    {
        try {
            return config('cache.default', 'database');
        } catch (Exception $e) {
            return 'database';
        }
    }

    /**
     * Cache remember method with tag support (native or emulated).
     */
    public function remember(string $key, int $ttlSeconds, Closure $callback, array $tags = []): mixed
    {
        if ($this->has($key, $tags)) {
            $this->recordHit();
            return $this->get($key, null, $tags);
        }

        $this->recordMiss();
        $value = $callback();
        $this->set($key, $value, $ttlSeconds, $tags);

        return $value;
    }

    /**
     * Cache remember forever.
     */
    public function rememberForever(string $key, Closure $callback, array $tags = []): mixed
    {
        return $this->remember($key, 86400 * 30, $callback, $tags);
    }

    /**
     * Check if key exists.
     */
    public function has(string $key, array $tags = []): bool
    {
        try {
            if (!empty($tags) && $this->supportsNativeTags()) {
                return Cache::tags($tags)->has($key);
            }
            return Cache::has($key);
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Retrieve item from cache.
     */
    public function get(string $key, mixed $default = null, array $tags = []): mixed
    {
        try {
            if (!empty($tags) && $this->supportsNativeTags()) {
                $val = Cache::tags($tags)->get($key, $default);
            } else {
                $val = Cache::get($key, $default);
            }

            if ($val !== null && $val !== $default) {
                $this->recordHit();
            } else {
                $this->recordMiss();
            }

            return $val;
        } catch (Exception $e) {
            $this->recordMiss();
            return $default;
        }
    }

    /**
     * Set item in cache with tag indexing.
     */
    public function set(string $key, mixed $value, int $ttlSeconds = 3600, array $tags = []): bool
    {
        try {
            if (!empty($tags) && $this->supportsNativeTags()) {
                $result = Cache::tags($tags)->put($key, $value, $ttlSeconds);
            } else {
                $result = Cache::put($key, $value, $ttlSeconds);
                if (!empty($tags)) {
                    $this->registerKeyUnderTags($key, $tags);
                }
            }

            $this->recordWrite();
            return (bool) $result;
        } catch (Exception $e) {
            Log::warning('PerformanceCacheService set error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Invalidate specific key.
     */
    public function forget(string $key, array $tags = []): bool
    {
        try {
            if (!empty($tags) && $this->supportsNativeTags()) {
                Cache::tags($tags)->forget($key);
            }
            return Cache::forget($key);
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Flush cache entries belonging to tags.
     */
    public function flushTags(array|string $tags): int
    {
        $tagsList = is_array($tags) ? $tags : [$tags];
        $clearedCount = 0;

        if ($this->supportsNativeTags()) {
            try {
                Cache::tags($tagsList)->flush();
                $clearedCount = count($tagsList);
            } catch (Exception $e) {
                Log::warning('Native tags flush error: ' . $e->getMessage());
            }
        } else {
            // Emulated tag flush using Tag Registry
            foreach ($tagsList as $tag) {
                $registryKey = self::TAG_REGISTRY_PREFIX . $tag;
                $registeredKeys = Cache::get($registryKey, []);

                if (is_array($registeredKeys)) {
                    foreach ($registeredKeys as $k) {
                        Cache::forget($k);
                        $clearedCount++;
                    }
                }
                Cache::forget($registryKey);
            }
        }

        $this->recordFlush();
        return $clearedCount;
    }

    /**
     * Flush entire application cache.
     */
    public function flushAll(): bool
    {
        try {
            Cache::flush();
            $this->recordFlush();
            return true;
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Register a key under tags in the fallback tag registry.
     */
    protected function registerKeyUnderTags(string $key, array $tags): void
    {
        foreach ($tags as $tag) {
            $regKey = self::TAG_REGISTRY_PREFIX . $tag;
            $keys = Cache::get($regKey, []);
            if (!is_array($keys)) {
                $keys = [];
            }
            if (!in_array($key, $keys, true)) {
                $keys[] = $key;
                // keep registry active for 7 days
                Cache::put($regKey, $keys, 86400 * 7);
            }
        }
    }

    /**
     * Telemetry hit counter (buffered in memory).
     */
    protected function recordHit(): void
    {
        self::$inMemoryStats['hits']++;
    }

    /**
     * Telemetry miss counter (buffered in memory).
     */
    protected function recordMiss(): void
    {
        self::$inMemoryStats['misses']++;
    }

    /**
     * Telemetry write counter (buffered in memory).
     */
    protected function recordWrite(): void
    {
        self::$inMemoryStats['writes']++;
    }

    /**
     * Telemetry flush counter.
     */
    protected function recordFlush(): void
    {
        self::$inMemoryStats['flushes']++;
        $stats = $this->getRawStats();
        $stats['flushes'] = (int) ($stats['flushes'] ?? 0) + 1;
        $stats['last_flush_at'] = Carbon::now()->toIso8601String();
        $this->saveRawStats($stats);
    }

    /**
     * Get raw telemetry stats combining persistent and in-memory counters.
     */
    protected function getRawStats(): array
    {
        try {
            $stats = Cache::get(self::STATS_KEY);
            if (!is_array($stats)) {
                $stats = [
                    'hits' => 0,
                    'misses' => 0,
                    'writes' => 0,
                    'flushes' => 0,
                    'last_flush_at' => null,
                    'started_at' => Carbon::now()->toIso8601String(),
                ];
            }

            return [
                'hits' => (int) ($stats['hits'] ?? 0) + self::$inMemoryStats['hits'],
                'misses' => (int) ($stats['misses'] ?? 0) + self::$inMemoryStats['misses'],
                'writes' => (int) ($stats['writes'] ?? 0) + self::$inMemoryStats['writes'],
                'flushes' => (int) ($stats['flushes'] ?? 0) + self::$inMemoryStats['flushes'],
                'last_flush_at' => $stats['last_flush_at'] ?? null,
                'started_at' => $stats['started_at'] ?? Carbon::now()->toIso8601String(),
            ];
        } catch (Exception $e) {
            return [
                'hits' => self::$inMemoryStats['hits'],
                'misses' => self::$inMemoryStats['misses'],
                'writes' => self::$inMemoryStats['writes'],
                'flushes' => self::$inMemoryStats['flushes'],
                'last_flush_at' => null,
            ];
        }
    }

    /**
     * Save raw telemetry stats.
     */
    protected function saveRawStats(array $stats): void
    {
        try {
            Cache::put(self::STATS_KEY, $stats, 86400 * 14);
        } catch (Exception $e) {
            // Ignore telemetry persistence failures
        }
    }

    /**
     * Get high-level cache telemetry and health report.
     */
    public function getTelemetry(): array
    {
        $stats = $this->getRawStats();
        $totalOps = $stats['hits'] + $stats['misses'];
        $hitRate = $totalOps > 0 ? round(($stats['hits'] / $totalOps) * 100, 2) : 100.0;

        return [
            'driver' => $this->getDriverName(),
            'supports_native_tags' => $this->supportsNativeTags(),
            'total_hits' => $stats['hits'],
            'total_misses' => $stats['misses'],
            'total_writes' => $stats['writes'],
            'total_flushes' => $stats['flushes'],
            'hit_rate_percentage' => $hitRate,
            'last_flush_at' => $stats['last_flush_at'],
            'status' => 'healthy',
            'redis_configured' => config('database.redis.default.host') !== null,
        ];
    }

    /**
     * Helper: cached Unit / Plot catalog.
     */
    public function getCachedUnitCatalog(array $filters = [], int $ttl = 600): array
    {
        $key = 'units:catalog:' . md5(json_encode($filters));

        return $this->remember($key, $ttl, function () use ($filters) {
            $query = DB::table('units')
                ->select([
                    'id', 'uuid', 'unit_number', 'name', 'unit_type', 'status',
                    'current_price', 'currency', 'block_number', 'floor_number',
                    'area', 'bedrooms', 'bathrooms', 'completion_percentage'
                ])
                ->whereNull('deleted_at');

            if (!empty($filters['unit_type'])) {
                $query->where('unit_type', $filters['unit_type']);
            }
            if (!empty($filters['status'])) {
                $query->where('status', $filters['status']);
            }

            return $query->limit(50)->get()->toArray();
        }, [self::TAG_UNITS]);
    }

    /**
     * Invalidation helpers for model events.
     */
    public function invalidateUnits(): void
    {
        $this->flushTags([self::TAG_UNITS, self::TAG_SEARCH]);
    }

    public function invalidateFinancials(int|string|null $clientId = null): void
    {
        $tags = [self::TAG_TRANSACTIONS, self::TAG_PAYMENTS, self::TAG_SAVINGS, self::TAG_SEARCH];
        if ($clientId) {
            $tags[] = 'client:' . $clientId;
        }
        $this->flushTags($tags);
    }

    public function invalidateDocuments(): void
    {
        $this->flushTags([self::TAG_DOCUMENTS, self::TAG_SEARCH]);
    }
}
