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
echo "  PHASE 14 DAY 4: AUTOMATED CI/CD PIPELINE TEST\n";
echo "=======================================================\n\n";

$baseDir = __DIR__;

// --- 1. Testing CI Pipeline (.github/workflows/ci.yml) ---
echo "--- 1. Testing CI Pipeline (.github/workflows/ci.yml) ---\n";

$ciFile = $baseDir . '/.github/workflows/ci.yml';
assertCondition(file_exists($ciFile), '.github/workflows/ci.yml exists');

$ciContent = file_get_contents($ciFile);
assertCondition(str_contains($ciContent, 'name: ZIMBANI CI Pipeline'), 'CI pipeline is titled ZIMBANI CI Pipeline');
assertCondition(str_contains($ciContent, 'development') && str_contains($ciContent, 'main'), 'CI triggers on development and main branches');
assertCondition(str_contains($ciContent, 'pull_request:'), 'CI triggers on pull requests');
assertCondition(str_contains($ciContent, 'cancel-in-progress: true'), 'CI cancels superseded in-progress workflows');

// Backend Test Job
assertCondition(str_contains($ciContent, 'backend-test:'), 'CI defines backend-test job');
assertCondition(str_contains($ciContent, 'image: mysql:8.0'), 'CI provisions MySQL 8.0 service container');
assertCondition(str_contains($ciContent, 'image: redis:7-alpine'), 'CI provisions Redis 7 service container');
assertCondition(str_contains($ciContent, 'php-version: \'8.4\'') || str_contains($ciContent, 'php-version: \'8.3\''), 'CI configures PHP 8.4 runtime');
assertCondition(str_contains($ciContent, 'pdo_mysql') && str_contains($ciContent, 'redis') && str_contains($ciContent, 'opcache'), 'CI loads all required PHP extensions');
assertCondition(str_contains($ciContent, 'composer validate --strict'), 'CI validates composer.json with strict checks');
assertCondition(str_contains($ciContent, 'actions/cache@v4'), 'CI implements Composer dependency caching');
assertCondition(str_contains($ciContent, 'php artisan migrate --force'), 'CI executes automated database migrations in clean sandbox');
assertCondition(str_contains($ciContent, 'test_phase_14_day_1.php'), 'CI runs Phase 14 Day 1 OWASP security verification suite');
assertCondition(str_contains($ciContent, 'test_phase_14_day_2.php'), 'CI runs Phase 14 Day 2 database tuning verification suite');
assertCondition(str_contains($ciContent, 'test_phase_14_day_3.php'), 'CI runs Phase 14 Day 3 Docker orchestration verification suite');

// Frontend Check Job
assertCondition(str_contains($ciContent, 'frontend-check:'), 'CI defines frontend-check job');
assertCondition(str_contains($ciContent, 'node-version: 22'), 'CI configures Node.js 22 runtime');
assertCondition(str_contains($ciContent, 'npm ci'), 'CI uses npm ci for deterministic dependency installation');
assertCondition(str_contains($ciContent, 'npx tsc --noEmit'), 'CI runs strict TypeScript type check');
assertCondition(str_contains($ciContent, 'npm run build'), 'CI verifies production Vite build');

// Docker Build Check Job
assertCondition(str_contains($ciContent, 'docker-build-check:'), 'CI defines docker-build-check job');
assertCondition(str_contains($ciContent, 'docker/setup-buildx-action@v3'), 'CI configures Docker Buildx builder');
assertCondition(str_contains($ciContent, 'docker/backend/Dockerfile'), 'CI builds and validates backend Docker image');
assertCondition(str_contains($ciContent, 'docker/frontend/Dockerfile'), 'CI builds and validates frontend Docker image');


// --- 2. Testing Security & Audit Pipeline (.github/workflows/security-audit.yml) ---
echo "\n--- 2. Testing Security & Audit Pipeline (.github/workflows/security-audit.yml) ---\n";

$secFile = $baseDir . '/.github/workflows/security-audit.yml';
assertCondition(file_exists($secFile), '.github/workflows/security-audit.yml exists');

$secContent = file_get_contents($secFile);
assertCondition(str_contains($secContent, 'cron:'), 'Security audit defines weekly scheduled trigger');
assertCondition(str_contains($secContent, 'composer audit --locked'), 'Security audit scans Composer dependencies for CVE vulnerabilities');
assertCondition(str_contains($secContent, 'npm audit'), 'Security audit scans NPM dependencies for vulnerabilities');
assertCondition(str_contains($secContent, 'git ls-files'), 'Security audit scans repository for credential/secret file leaks');


// --- 3. Testing CD Pipeline (.github/workflows/cd.yml) ---
echo "\n--- 3. Testing CD Pipeline (.github/workflows/cd.yml) ---\n";

$cdFile = $baseDir . '/.github/workflows/cd.yml';
assertCondition(file_exists($cdFile), '.github/workflows/cd.yml exists');

$cdContent = file_get_contents($cdFile);
assertCondition(str_contains($cdContent, 'packages: write'), 'CD pipeline requests GHCR package write permissions');
assertCondition(str_contains($cdContent, 'publish-images:'), 'CD defines publish-images job');
assertCondition(str_contains($cdContent, 'ghcr.io'), 'CD targets GitHub Container Registry (ghcr.io)');
assertCondition(str_contains($cdContent, 'secrets.GITHUB_TOKEN'), 'CD uses built-in GITHUB_TOKEN authentication');
assertCondition(str_contains($cdContent, 'zimbani-backend:'), 'CD builds and tags zimbani-backend image');
assertCondition(str_contains($cdContent, 'zimbani-frontend:'), 'CD builds and tags zimbani-frontend image');
assertCondition(str_contains($cdContent, 'cache-from: type=gha'), 'CD enables GitHub Actions Buildx layer caching');
assertCondition(str_contains($cdContent, 'deploy:'), 'CD defines automated cloud deployment job');

echo "\n=======================================================\n";
echo "  PHASE 14 DAY 4 VERIFICATION RESULTS: {$passed}/{$total} PASSED (" . round(($passed / max($total, 1)) * 100) . "%)\n";
echo "=======================================================\n\n";

if ($passed === $total) {
    exit(0);
} else {
    exit(1);
}
