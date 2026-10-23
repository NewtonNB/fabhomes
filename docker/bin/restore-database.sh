#!/bin/sh
set -e

# ==============================================================================
# ZIMBANI PLATFORM - Automated MySQL Database Restore Script
# ==============================================================================

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 /path/to/zimbani_db_backup_YYYYMMDD_HHMMSS.sql.gz"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file $BACKUP_FILE does not exist!"
    exit 1
fi

echo "=================================================================="
echo "  WARNING: THIS WILL OVERWRITE THE CURRENT DATABASE DATA!"
echo "  Restoring from: $BACKUP_FILE"
echo "=================================================================="

# Optional confirmation prompt if interactive
if [ -t 0 ]; then
    printf "Are you sure you want to proceed? [y/N]: "
    read -r confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "Restore aborted by user."
        exit 0
    fi
fi

echo "Decompressing and restoring database..."

if command -v docker >/dev/null 2>&1 && docker compose ps zimbani_db >/dev/null 2>&1; then
    gunzip -c "$BACKUP_FILE" | docker compose exec -T db mysql \
        -u "${DB_USERNAME:-zimbani_user}" \
        -p"${DB_PASSWORD:-SecretZimbani2026!}" \
        "${DB_DATABASE:-zimbani_prod}"
else
    gunzip -c "$BACKUP_FILE" | mysql \
        -h "${DB_HOST:-127.0.0.1}" \
        -P "${DB_PORT:-3306}" \
        -u "${DB_USERNAME:-root}" \
        -p"${DB_PASSWORD:-}" \
        "${DB_DATABASE:-zimbani_dev}"
fi

echo "Database restore completed successfully."
echo "Flushing application cache..."

if command -v docker >/dev/null 2>&1 && docker compose ps zimbani_app >/dev/null 2>&1; then
    docker compose exec -T app php artisan cache:clear
    docker compose exec -T app php artisan config:clear
fi

echo "=== [$(date)] Restore Process Finished Successfully ==="
