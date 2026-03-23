#!/bin/bash
# RetailERP Docker Compose Deployment Script
set -e

echo "============================================"
echo "  RetailERP Docker Compose Deployment"
echo "============================================"

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || docker compose version >/dev/null 2>&1 || { echo "Docker Compose is required."; exit 1; }

# Determine compose command
if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
else
  COMPOSE="docker-compose"
fi

case "${1:-up}" in
  up)
    echo ""
    echo "[1/3] Building all services..."
    $COMPOSE build --parallel

    echo ""
    echo "[2/3] Starting all services..."
    $COMPOSE up -d

    echo ""
    echo "[3/3] Waiting for services to be healthy..."
    echo "  Waiting for SQL Server..."
    timeout 60 bash -c 'until docker inspect retailerp-sqlserver --format="{{.State.Health.Status}}" 2>/dev/null | grep -q healthy; do sleep 2; done' || echo "  SQL Server health check timed out"

    echo "  Waiting for Auth API..."
    timeout 60 bash -c 'until docker inspect retailerp-auth --format="{{.State.Health.Status}}" 2>/dev/null | grep -q healthy; do sleep 2; done' || echo "  Auth API health check timed out"

    echo ""
    echo "============================================"
    echo "  All Services Running!"
    echo "============================================"
    echo ""
    echo "  Frontend:     http://localhost:3000"
    echo "  API Gateway:  http://localhost:5000"
    echo "  Auth API:     http://localhost:5001/swagger"
    echo "  Product API:  http://localhost:5002/swagger"
    echo "  Inventory:    http://localhost:5003/swagger"
    echo "  Order API:    http://localhost:5004/swagger"
    echo "  Production:   http://localhost:5005/swagger"
    echo "  Billing API:  http://localhost:5006/swagger"
    echo "  Reporting:    http://localhost:5007/swagger"
    echo "  Prometheus:   http://localhost:9090"
    echo "  Grafana:      http://localhost:3002"
    echo ""
    echo "  Login: admin@elcurio.com / Admin@123"
    echo "============================================"
    ;;

  down)
    echo "Stopping all services..."
    $COMPOSE down
    echo "All services stopped."
    ;;

  restart)
    echo "Restarting all services..."
    $COMPOSE down
    $COMPOSE up -d
    echo "All services restarted."
    ;;

  logs)
    $COMPOSE logs -f "${2:-}"
    ;;

  status)
    $COMPOSE ps
    ;;

  *)
    echo "Usage: $0 {up|down|restart|logs [service]|status}"
    exit 1
    ;;
esac
