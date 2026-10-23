#!/bin/sh
set -e

# ==============================================================================
# ZIMBANI PLATFORM - Storage & Digital Vault Backup Script
# ==============================================================================

BACKUP_DIR="${BACKUP_DIR:-/var/backups/zimbani}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
STORAGE_ARCHIVE="${BACKUP_DIR}/zimbani_storage_vault_${TIMESTAMP}.tar.gz"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"

echo "=== [$(date)] Starting Digital Document Vault Backup ==="

STORAGE_SRC="zimbani-backend/storage/app/public"
if [ ! -d "$STORAGE_SRC" ]; then
    STORAGE_SRC="storage/app/public"
fi

if [ -d "$STORAGE_SRC" ]; then
    echo "Archiving digital files from $STORAGE_SRC..."
    tar -czf "$STORAGE_ARCHIVE" -C "$(dirname "$STORAGE_SRC")" "$(basename "$STORAGE_SRC")"
    FILE_SIZE=$(du -h "$STORAGE_ARCHIVE" | cut -f1)
    echo "SUCCESS: Storage archive created at $STORAGE_ARCHIVE (Size: $FILE_SIZE)"
else
    echo "WARNING: Storage directory not found at $STORAGE_SRC, checking docker volumes..."
    docker run --rm -v zimbani_app_storage:/data -v "$BACKUP_DIR":/backup alpine \
        tar -czf "/backup/zimbani_storage_vault_${TIMESTAMP}.tar.gz" -C /data .
fi

# Rotate old storage archives
find "$BACKUP_DIR" -name "zimbani_storage_vault_*.tar.gz" -type f -mtime +"$RETENTION_DAYS" -exec rm -f {} \;

# Cloud Sync
if [ -n "$S3_BACKUP_BUCKET" ] && command -v aws >/dev/null 2>&1; then
    echo "Uploading storage archive to S3 bucket $S3_BACKUP_BUCKET..."
    aws s3 cp "$STORAGE_ARCHIVE" "s3://${S3_BACKUP_BUCKET}/storage/"
fi

echo "=== [$(date)] Storage Backup Finished Successfully ==="
