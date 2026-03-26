#!/bin/bash
# RetailERP — Linux/Mac Start Script

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'

echo ""
echo -e "${BOLD}  ====================================================${NC}"
echo -e "${BOLD}    RetailERP — Starting Application${NC}"
echo -e "${BOLD}  ====================================================${NC}"
echo ""

# Check Docker
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}  [ERROR] Docker is not running!${NC}"
  echo "  Please start Docker and try again."
  exit 1
fi
echo -e "${GREEN}  [OK] Docker is running${NC}"

# Pull images
echo ""
echo "  Pulling latest images from Docker Hub..."
echo "  (5-10 minutes on first run)"
echo ""
docker compose pull

# Start services
echo ""
echo "  Starting all services..."
docker compose up -d

echo ""
echo "  Waiting 30 seconds for services to initialize..."
sleep 30

# Status
echo ""
docker compose ps --format "table {{.Name}}\t{{.Status}}"

echo ""
echo -e "${GREEN}${BOLD}  ====================================================${NC}"
echo -e "${GREEN}${BOLD}    Application is ready!${NC}"
echo -e "${GREEN}${BOLD}  ====================================================${NC}"
echo ""
echo -e "  Frontend  →  ${BOLD}http://localhost:3003${NC}"
echo -e "  Docs      →  ${BOLD}http://localhost:3100${NC}"
echo -e "  API       →  ${BOLD}http://localhost:5000${NC}"
echo -e "  Grafana   →  ${BOLD}http://localhost:3002${NC}"
echo ""
echo -e "  Login:  ${BOLD}admin@retailerp.com${NC}  /  ${BOLD}Admin@123${NC}"
echo ""

# Open browser (Linux/Mac)
if command -v xdg-open &>/dev/null; then
  xdg-open http://localhost:3003
elif command -v open &>/dev/null; then
  open http://localhost:3003
fi
