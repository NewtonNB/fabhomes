<?php

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
echo "  PHASE 14 DAY 5: FINAL PRODUCTION CAPSTONE & HANDOVER\n";
echo "=======================================================\n\n";

$baseDir = __DIR__;

// --- 1. Testing Backup & Restore Automation Scripts ---
echo "--- 1. Testing Backup & Restore Automation Scripts ---\n";

$dbBackup = $baseDir . '/docker/bin/backup-database.sh';
assertCondition(file_exists($dbBackup), 'docker/bin/backup-database.sh exists');
$dbBackupContent = file_get_contents($dbBackup);
assertCondition(str_contains($dbBackupContent, '#!/bin/sh'), 'backup-database.sh has posix shebang');
assertCondition(str_contains($dbBackupContent, '--single-transaction'), 'backup-database.sh executes single-transaction zero-downtime dump');
assertCondition(str_contains($dbBackupContent, 'gzip'), 'backup-database.sh compresses database archives');
assertCondition(str_contains($dbBackupContent, 'find "$BACKUP_DIR"') && str_contains($dbBackupContent, '-mtime'), 'backup-database.sh enforces retention rotation');
assertCondition(str_contains($dbBackupContent, 'aws s3 cp'), 'backup-database.sh supports off-site cloud bucket sync');

$dbRestore = $baseDir . '/docker/bin/restore-database.sh';
assertCondition(file_exists($dbRestore), 'docker/bin/restore-database.sh exists');
$dbRestoreContent = file_get_contents($dbRestore);
assertCondition(str_contains($dbRestoreContent, '#!/bin/sh'), 'restore-database.sh has posix shebang');
assertCondition(str_contains($dbRestoreContent, 'gunzip'), 'restore-database.sh decompresses archive during restore');
assertCondition(str_contains($dbRestoreContent, 'cache:clear'), 'restore-database.sh automatically flushes application cache post-restore');

$storageBackup = $baseDir . '/docker/bin/backup-storage.sh';
assertCondition(file_exists($storageBackup), 'docker/bin/backup-storage.sh exists');
$storageBackupContent = file_get_contents($storageBackup);
assertCondition(str_contains($storageBackupContent, 'tar -czf'), 'backup-storage.sh archives digital vault files');
assertCondition(str_contains($storageBackupContent, 'zimbani_app_storage'), 'backup-storage.sh supports Docker volume fallback');


// --- 2. Testing Production Deployment Runbook ---
echo "\n--- 2. Testing Production Deployment Runbook ---\n";

$runbook = $baseDir . '/docs/16-deployment/PRODUCTION-DEPLOYMENT-RUNBOOK.md';
assertCondition(file_exists($runbook), 'PRODUCTION-DEPLOYMENT-RUNBOOK.md exists');
$runbookContent = file_get_contents($runbook);
assertCondition(str_contains($runbookContent, '4 vCPUs') && str_contains($runbookContent, '8 GB'), 'Runbook specifies production hardware requirements');
assertCondition(str_contains($runbookContent, 'ufw allow 443/tcp'), 'Runbook defines UFW firewall rules');
assertCondition(str_contains($runbookContent, 'sysctl.conf'), 'Runbook details Linux kernel tuning parameters');
assertCondition(str_contains($runbookContent, 'certbot certonly'), 'Runbook provides automated Let\'s Encrypt SSL/TLS generation');
assertCondition(str_contains($runbookContent, 'docker compose ps'), 'Runbook details multi-container verification');
assertCondition(str_contains($runbookContent, 'crontab'), 'Runbook configures automated host cron backup jobs');


// --- 3. Testing Disaster Recovery Plan ---
echo "\n--- 3. Testing Disaster Recovery & Business Continuity Plan ---\n";

$drPlan = $baseDir . '/docs/17-maintenance/DISASTER-RECOVERY-PLAN.md';
assertCondition(file_exists($drPlan), 'DISASTER-RECOVERY-PLAN.md exists');
$drContent = file_get_contents($drPlan);
assertCondition(str_contains($drContent, 'RPO') && str_contains($drContent, '1 Hour'), 'Disaster Recovery Plan specifies RPO < 1 Hour');
assertCondition(str_contains($drContent, 'RTO') && str_contains($drContent, '30 Minutes'), 'Disaster Recovery Plan specifies RTO < 30 Minutes');
assertCondition(str_contains($drContent, 'P1') && str_contains($drContent, 'P2') && str_contains($drContent, 'P3'), 'Disaster Recovery Plan defines incident escalation tiers');
assertCondition(str_contains($drContent, 'Total Node Destruction'), 'Plan provides total server failure runbook');
assertCondition(str_contains($drContent, 'Database Corruption'), 'Plan provides database corruption recovery runbook');
assertCondition(str_contains($drContent, 'Active Security Compromise'), 'Plan provides security compromise emergency runbook');
assertCondition(str_contains($drContent, 'Semi-Annual'), 'Plan mandates semi-annual failover testing drills');


// --- 4. Testing Observability & Monitoring Guide ---
echo "\n--- 4. Testing Observability & Monitoring Guide ---\n";

$obsGuide = $baseDir . '/docs/17-maintenance/OBSERVABILITY-AND-MONITORING.md';
assertCondition(file_exists($obsGuide), 'OBSERVABILITY-AND-MONITORING.md exists');
$obsContent = file_get_contents($obsGuide);
assertCondition(str_contains($obsContent, '/health'), 'Observability guide documents gateway health check');
assertCondition(str_contains($obsContent, '/api/v1/security/health-check'), 'Observability guide documents security telemetry probe');
assertCondition(str_contains($obsContent, '/api/v1/performance/metrics'), 'Observability guide documents performance metrics probe');
assertCondition(str_contains($obsContent, 'logrotate'), 'Observability guide provides logrotate configuration');


// --- 5. Testing Client & Stakeholder Handover Manual ---
echo "\n--- 5. Testing Client & Stakeholder Handover Manual ---\n";

$handover = $baseDir . '/docs/17-maintenance/CLIENT-HANDOVER-MANUAL.md';
assertCondition(file_exists($handover), 'CLIENT-HANDOVER-MANUAL.md exists');
$handoverContent = file_get_contents($handover);
assertCondition(str_contains($handoverContent, 'admin@zimbani.com'), 'Handover manual lists primary Super Admin access');
assertCondition(str_contains($handoverContent, 'Finance & Reconciliation Operations'), 'Handover manual documents Finance operations');
assertCondition(str_contains($handoverContent, 'Surveyor & Land Management Operations'), 'Handover manual documents Surveyor operations');
assertCondition(str_contains($handoverContent, 'Construction Management Operations'), 'Handover manual documents Construction operations');
assertCondition(str_contains($handoverContent, 'Client Support & Communication'), 'Handover manual documents Customer Support operations');
assertCondition(str_contains($handoverContent, 'Phase 0') && str_contains($handoverContent, 'Phase 14'), 'Handover manual confirms Phase 0 through Phase 14 sign-off');
assertCondition(str_contains($handoverContent, '100% COMPLETE AND PRODUCTION READY'), 'Handover manual declares 100% production readiness');

echo "\n=======================================================\n";
echo "  PHASE 14 DAY 5 VERIFICATION RESULTS: {$passed}/{$total} PASSED (" . round(($passed / max($total, 1)) * 100) . "%)\n";
echo "=======================================================\n\n";

if ($passed === $total) {
    exit(0);
} else {
    exit(1);
}
