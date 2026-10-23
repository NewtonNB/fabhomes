#!/bin/sh
echo "Stopping Zimbani Multi-Container Orchestration gracefully..."
docker compose down "$@"
