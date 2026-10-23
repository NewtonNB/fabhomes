#!/bin/sh
set -e

echo "=== [ZIMBANI PLATFORM] Initializing Container Runtime ==="

# Wait for MySQL if host is defined
if [ -n "$DB_HOST" ]; then
    echo "Waiting for database connection at $DB_HOST:${DB_PORT:-3306}..."
    timeout=60
    while ! nc -z "$DB_HOST" "${DB_PORT:-3306}"; do
        timeout=$((timeout - 1))
        if [ "$timeout" -le 0 ]; then
            echo "ERROR: Timed out waiting for database connection."
            exit 1
        fi
        sleep 1
    done
    echo "Database connection established."
fi

# Wait for Redis if host is defined
if [ -n "$REDIS_HOST" ]; then
    echo "Waiting for Redis cache service at $REDIS_HOST:${REDIS_PORT:-6379}..."
    timeout=30
    while ! nc -z "$REDIS_HOST" "${REDIS_PORT:-6379}"; do
        timeout=$((timeout - 1))
        if [ "$timeout" -le 0 ]; then
            echo "WARNING: Could not connect to Redis, proceeding with fallback."
            break
        fi
        sleep 1
    done
    echo "Redis cache connection verified."
fi

# Fix storage permissions if needed
chmod -R 775 storage bootstrap/cache 2>/dev/null || true
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true

# Production Caching & Optimizations
if [ "$APP_ENV" = "production" ]; then
    echo "Running production optimizations..."
    php artisan config:cache || true
    php artisan route:cache || true
    php artisan view:cache || true
fi

# Optional automated database migrations
if [ "$AUTORUN_MIGRATIONS" = "true" ]; then
    echo "Running automated database migrations..."
    php artisan migrate --force
fi

echo "=== [ZIMBANI PLATFORM] Starting Service: $@ ==="
exec "$@"
