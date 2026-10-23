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
echo "  PHASE 14 DAY 3: DOCKER MULTI-CONTAINER ORCHESTRATION\n";
echo "=======================================================\n\n";

$baseDir = __DIR__;

// --- 1. Testing Backend Dockerfiles & Runtime Environment ---
echo "--- 1. Testing Backend Dockerfiles & PHP-FPM Configuration ---\n";

$backendDockerfile = $baseDir . '/docker/backend/Dockerfile';
assertCondition(file_exists($backendDockerfile), 'docker/backend/Dockerfile exists');
$backendContent = file_get_contents($backendDockerfile);
assertCondition(str_contains($backendContent, 'FROM php:8.4-fpm-alpine') || str_contains($backendContent, 'FROM php:8.3-fpm-alpine'), 'Backend Dockerfile uses php:8.4-fpm-alpine base');
assertCondition(str_contains($backendContent, 'pdo_mysql'), 'Backend Dockerfile installs pdo_mysql extension');
assertCondition(str_contains($backendContent, 'pecl install redis'), 'Backend Dockerfile compiles redis extension');
assertCondition(str_contains($backendContent, 'opcache'), 'Backend Dockerfile installs Zend OPcache');
assertCondition(str_contains($backendContent, 'composer:2'), 'Backend Dockerfile integrates official Composer multi-stage binary');
assertCondition(str_contains($backendContent, 'USER www-data'), 'Backend Dockerfile enforces non-root www-data security policy');
assertCondition(str_contains($backendContent, 'EXPOSE 9000'), 'Backend Dockerfile exposes PHP-FPM port 9000');
assertCondition(str_contains($backendContent, 'ENTRYPOINT ["docker-entrypoint.sh"]'), 'Backend Dockerfile defines entrypoint bootstrapper');

assertCondition(file_exists($baseDir . '/zimbani-backend/Dockerfile'), 'zimbani-backend/Dockerfile exists for sub-project builds');

// php.ini
$phpIni = $baseDir . '/docker/backend/php.ini';
assertCondition(file_exists($phpIni), 'docker/backend/php.ini exists');
$phpIniContent = file_get_contents($phpIni);
assertCondition(str_contains($phpIniContent, 'memory_limit = 512M'), 'php.ini allocates 512M memory limit');
assertCondition(str_contains($phpIniContent, 'upload_max_filesize = 50M'), 'php.ini supports up to 50M file uploads');
assertCondition(str_contains($phpIniContent, 'opcache.enable = 1'), 'php.ini enables bytecode OPcache');

// docker-entrypoint.sh
$entrypoint = $baseDir . '/docker/backend/docker-entrypoint.sh';
assertCondition(file_exists($entrypoint), 'docker-entrypoint.sh exists');
$entryContent = file_get_contents($entrypoint);
assertCondition(str_contains($entryContent, '#!/bin/sh'), 'docker-entrypoint.sh has standard posix shebang');
assertCondition(str_contains($entryContent, 'nc -z "$DB_HOST"'), 'docker-entrypoint.sh checks database availability');
assertCondition(str_contains($entryContent, 'php artisan migrate'), 'docker-entrypoint.sh handles automated database migrations');


// --- 2. Testing Frontend Dockerfiles & Nginx SPA Configuration ---
echo "\n--- 2. Testing Frontend Dockerfile & Client Web Server ---\n";

$frontendDockerfile = $baseDir . '/docker/frontend/Dockerfile';
assertCondition(file_exists($frontendDockerfile), 'docker/frontend/Dockerfile exists');
$frontendContent = file_get_contents($frontendDockerfile);
assertCondition(str_contains($frontendContent, 'FROM node:22-alpine AS builder'), 'Frontend Dockerfile Stage 1 uses node:22-alpine');
assertCondition(str_contains($frontendContent, 'npm run build'), 'Frontend Dockerfile runs production Vite build');
assertCondition(str_contains($frontendContent, 'FROM nginx:alpine AS runner'), 'Frontend Dockerfile Stage 2 uses minimal nginx:alpine runner');
assertCondition(str_contains($frontendContent, 'COPY --from=builder /app/dist /usr/share/nginx/html'), 'Frontend Dockerfile copies compiled SPA assets');

assertCondition(file_exists($baseDir . '/zimbani-frontend/Dockerfile'), 'zimbani-frontend/Dockerfile exists for sub-project builds');

// nginx-frontend.conf
$frontendNginx = $baseDir . '/docker/frontend/nginx-frontend.conf';
assertCondition(file_exists($frontendNginx), 'docker/frontend/nginx-frontend.conf exists');
$feNginxContent = file_get_contents($frontendNginx);
assertCondition(str_contains($feNginxContent, 'try_files $uri $uri/ /index.html'), 'nginx-frontend.conf configures React Router SPA fallback');
assertCondition(str_contains($feNginxContent, 'gzip on'), 'nginx-frontend.conf enables static asset gzip compression');
assertCondition(str_contains($feNginxContent, 'service-worker'), 'nginx-frontend.conf enforces zero-cache policy on service worker');


// --- 3. Testing Reverse Proxy & Unified API Gateway ---
echo "\n--- 3. Testing Nginx Reverse Proxy & API Gateway ---\n";

$nginxConf = $baseDir . '/docker/nginx/nginx.conf';
assertCondition(file_exists($nginxConf), 'docker/nginx/nginx.conf exists');
$nginxConfContent = file_get_contents($nginxConf);
assertCondition(str_contains($nginxConfContent, 'client_max_body_size 64M'), 'nginx.conf sets 64M client body limit');
assertCondition(str_contains($nginxConfContent, 'limit_req_zone'), 'nginx.conf defines API rate-limiting zones');

$defaultConf = $baseDir . '/docker/nginx/conf.d/default.conf';
assertCondition(file_exists($defaultConf), 'docker/nginx/conf.d/default.conf exists');
$defaultContent = file_get_contents($defaultConf);
assertCondition(str_contains($defaultContent, 'upstream php_backend'), 'default.conf defines PHP-FPM upstream pool');
assertCondition(str_contains($defaultContent, 'upstream reverb_websocket'), 'default.conf defines Laravel Reverb upstream pool');
assertCondition(str_contains($defaultContent, 'upstream react_frontend'), 'default.conf defines React SPA upstream pool');
assertCondition(str_contains($defaultContent, 'location /health'), 'default.conf provides gateway health check');
assertCondition(str_contains($defaultContent, 'proxy_set_header Upgrade $http_upgrade'), 'default.conf supports WebSocket protocol upgrade');
assertCondition(str_contains($defaultContent, 'fastcgi_pass php_backend'), 'default.conf routes /api/ through FastCGI');

assertCondition(file_exists($baseDir . '/docker/nginx/conf.d/ssl.conf.example'), 'docker/nginx/conf.d/ssl.conf.example exists for HTTPS deployment');


// --- 4. Testing Redis & MySQL Engine Configurations ---
echo "\n--- 4. Testing Redis 7 & MySQL 8 Engine Configurations ---\n";

$redisConf = $baseDir . '/docker/redis/redis.conf';
assertCondition(file_exists($redisConf), 'docker/redis/redis.conf exists');
$redisContent = file_get_contents($redisConf);
assertCondition(str_contains($redisContent, 'maxmemory 256mb'), 'redis.conf sets 256mb memory ceiling');
assertCondition(str_contains($redisContent, 'maxmemory-policy allkeys-lru'), 'redis.conf configures allkeys-lru eviction');
assertCondition(str_contains($redisContent, 'appendonly yes'), 'redis.conf enables AOF persistence');

$mysqlConf = $baseDir . '/docker/mysql/my.cnf';
assertCondition(file_exists($mysqlConf), 'docker/mysql/my.cnf exists');
$mysqlContent = file_get_contents($mysqlConf);
assertCondition(str_contains($mysqlContent, 'innodb_buffer_pool_size = 512M'), 'my.cnf allocates 512M InnoDB buffer pool');
assertCondition(str_contains($mysqlContent, 'character-set-server = utf8mb4'), 'my.cnf enforces utf8mb4 character set');
assertCondition(str_contains($mysqlContent, 'ft_min_word_len = 2'), 'my.cnf configures 2-char full-text token length');


// --- 5. Testing Docker Compose Orchestration Files ---
echo "\n--- 5. Testing Docker Compose Multi-Container Topology ---\n";

$composeFile = $baseDir . '/docker-compose.yml';
assertCondition(file_exists($composeFile), 'docker-compose.yml exists');

// Parse YAML via PHP
$composeYaml = file_get_contents($composeFile);
$parsedCompose = null;
if (function_exists('yaml_parse')) {
    $parsedCompose = yaml_parse($composeYaml);
} elseif (class_exists('Symfony\Component\Yaml\Yaml')) {
    $parsedCompose = \Symfony\Component\Yaml\Yaml::parse($composeYaml);
}

$services = [
    'app' => 'Core Laravel 13 PHP-FPM Backend',
    'web' => 'Nginx Reverse Proxy & API Gateway',
    'frontend' => 'React 19 + Vite Frontend SPA',
    'db' => 'MySQL 8.0 Relational Database',
    'redis' => 'Redis 7.2 In-Memory Cache & Queue Broker',
    'reverb' => 'Laravel Reverb Real-Time WebSockets Daemon',
    'queue' => 'Asynchronous Worker for Drips & Webhooks',
    'cron' => 'Scheduled Task Runner'
];

foreach ($services as $svc => $label) {
    assertCondition(str_contains($composeYaml, "  {$svc}:"), "docker-compose.yml defines service: {$svc} ({$label})");
}

// Volumes and networks
assertCondition(str_contains($composeYaml, 'db_data:'), 'docker-compose.yml defines persistent db_data volume');
assertCondition(str_contains($composeYaml, 'redis_data:'), 'docker-compose.yml defines persistent redis_data volume');
assertCondition(str_contains($composeYaml, 'app_storage:'), 'docker-compose.yml defines persistent app_storage volume');
assertCondition(str_contains($composeYaml, 'zimbani_net:'), 'docker-compose.yml defines isolated bridge network zimbani_net');

// Healthchecks
assertCondition(str_contains($composeYaml, 'mysqladmin') && str_contains($composeYaml, 'ping'), 'docker-compose.yml defines MySQL healthcheck');
assertCondition(str_contains($composeYaml, 'redis-cli') && str_contains($composeYaml, 'ping'), 'docker-compose.yml defines Redis healthcheck');
assertCondition(str_contains($composeYaml, '/health') && str_contains($composeYaml, 'curl'), 'docker-compose.yml defines Nginx healthcheck');

// Production compose overlay
$composeProd = $baseDir . '/docker-compose.prod.yml';
assertCondition(file_exists($composeProd), 'docker-compose.prod.yml exists');
$prodContent = file_get_contents($composeProd);
assertCondition(str_contains($prodContent, 'restart: always'), 'docker-compose.prod.yml enforces always restart policy');
assertCondition(str_contains($prodContent, 'resources:'), 'docker-compose.prod.yml enforces CPU and memory limits');
assertCondition(str_contains($prodContent, 'json-file'), 'docker-compose.prod.yml configures log rotation limits');


// --- 6. Testing Environment & Helper Scripts ---
echo "\n--- 6. Testing Environment Parity & Orchestration Scripts ---\n";

$envExample = $baseDir . '/.env.docker.example';
assertCondition(file_exists($envExample), '.env.docker.example exists');
$envContent = file_get_contents($envExample);
assertCondition(str_contains($envContent, 'DB_HOST=db'), '.env.docker.example connects to db container');
assertCondition(str_contains($envContent, 'REDIS_HOST=redis'), '.env.docker.example connects to redis container');
assertCondition(str_contains($envContent, 'REVERB_HOST=reverb'), '.env.docker.example connects to reverb container');

// Management scripts
$scripts = ['setup.sh', 'start.sh', 'stop.sh'];
foreach ($scripts as $script) {
    $scriptPath = $baseDir . '/docker/bin/' . $script;
    assertCondition(file_exists($scriptPath), "docker/bin/{$script} exists");
    $content = file_get_contents($scriptPath);
    assertCondition(str_contains($content, '#!/bin/sh'), "docker/bin/{$script} has valid shebang");
}

echo "\n=======================================================\n";
echo "  PHASE 14 DAY 3 VERIFICATION RESULTS: {$passed}/{$total} PASSED (" . round(($passed / max($total, 1)) * 100) . "%)\n";
echo "=======================================================\n\n";

if ($passed === $total) {
    exit(0);
} else {
    exit(1);
}
