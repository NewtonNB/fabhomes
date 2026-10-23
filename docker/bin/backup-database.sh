#!/bin/sh
set -e

# ==============================================================================
# ZIMBANI PLATFORM - Automated MySQL Database Backup Script
# ==============================================================================

BACKUP_DIR="${BACKUP_DIR:-/var/backups/zimbani}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/zimbani_db_backup_${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"

echo "=== [$(date)] Starting Zimbani Database Backup ==="

# Execute mysqldump inside container or host with single-transaction for zero downtime
if command -v docker >/dev/null 2>&1 && docker compose ps zimbani_db >/dev/null 2>&1; then
    echo "Dumping database from container zimbani_db..."
    docker compose exec -T db mysqldump \
        --single-transaction \
        --quick \
        --routines \
        --triggers \
        -u "${DB_USERNAME:-zimbani_user}" \
        -p"${DB_PASSWORD:-SecretZimbani2026!}" \
        "${DB_DATABASE:-zimbani_prod}" | gzip > "$BACKUP_FILE"
else
    echo "Dumping database directly via local mysqldump..."
    mysqldump \
        --single-transaction \
        --quick \
        --routines \
        --triggers \
        -h "${DB_HOST:-127.0.0.1}" \
        -P "${DB_PORT:-3306}" \
        -u "${DB_USERNAME:-root}" \
        -p"${DB_PASSWORD:-}" \
        "${DB_DATABASE:-zimbani_dev}" | gzip > "$BACKUP_FILE"
fi

# Verify backup file size
if [ -s "$BACKUP_FILE" ]; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "SUCCESS: Database backup created at $BACKUP_FILE (Size: $FILE_SIZE)"
else
    echo "ERROR: Backup file is empty or failed to generate!"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Rotate backups older than RETENTION_DAYS
echo "Pruning backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "zimbani_db_backup_*.sql.gz" -type f -mtime +"$RETENTION_DAYS" -exec rm -f {} \;

# Optional remote S3 / Cloud Bucket Sync
if [ -n "$S3_BACKUP_BUCKET" ] && command -v aws >/dev/null 2>&1; then
    echo "Uploading backup archive to S3 bucket $S3_BACKUP_BUCKET..."
    aws s3 cp "$BACKUP_FILE" "s3://${S3_BACKUP_BUCKET}/database/"
    echo "S3 upload completed."
fi

echo "=== [$(date)] Database Backup Process Finished Successfully ==="
