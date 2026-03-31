#!/bin/bash
# RetailERP - Start (Linux / macOS / Git Bash)

set -e

echo ""
echo "  RetailERP - Docker Desktop"
echo ""

# Check Docker
if ! command -v docker &>/dev/null; then
  echo "  [XX] Docker not found. Install Docker Desktop:"
  echo "       https://www.docker.com/products/docker-desktop"
  exit 1
fi

if ! docker info &>/dev/null; then
  echo "  [XX] Docker Desktop is not running. Please start it."
  exit 1
fi
echo "  [OK] Docker Desktop is running"

# Clean flag
if [ "$1" = "--clean" ]; then
  echo "  [!!] Removing all containers and data volumes..."
  docker compose down -v --remove-orphans 2>/dev/null || true
fi

echo "  Pulling latest images..."
docker compose pull

echo "  Starting all services..."
docker compose up -d

sleep 5
echo ""
docker compose ps
echo ""
echo "  ================================================="
echo "  RetailERP is starting up!"
echo ""
echo "  Frontend  : http://localhost:3003"
echo "  Gateway   : http://localhost:5000/swagger"
echo ""
echo "  Login: admin@elcurio.com / Admin@123"
echo "  ================================================="
echo ""
echo "  Wait ~60 seconds for all services to be ready."
echo "  Logs: docker compose logs -f"
echo ""
