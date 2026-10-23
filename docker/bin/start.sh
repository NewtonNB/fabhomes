#!/bin/sh
echo "Starting Zimbani Multi-Container Orchestration..."
docker compose up -d "$@"
docker compose ps
