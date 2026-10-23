#!/bin/sh
set -e

echo "=== [ZIMBANI PLATFORM] Orchestration Setup & Initialization ==="

if [ ! -f .env ]; then
    echo "Creating .env from .env.docker.example..."
    cp .env.docker.example .env
fi

echo "Building multi-container images..."
docker compose build

echo "Starting services in detached mode..."
docker compose up -d

echo "Waiting for database initialization..."
docker compose exec app php artisan migrate --force

echo "Seeding initial roles and permissions..."
docker compose exec app php artisan db:seed --class=RoleSeeder --force || true
docker compose exec app php artisan db:seed --class=PermissionSeeder --force || true

echo "=== [ZIMBANI PLATFORM] Setup Complete. Platform is Live! ==="
