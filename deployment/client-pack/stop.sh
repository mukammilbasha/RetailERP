#!/bin/bash
echo ""
echo "  Stopping RetailERP..."
docker compose down
echo ""
echo "  All services stopped. Data is preserved."
echo "  Run ./start.sh to start again."
echo ""
