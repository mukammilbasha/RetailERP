#!/bin/bash
# ============================================================
# RetailERP — Container Security Scan (Trivy)
# Usage: ./trivy-scan.sh [--env dev] [--registry ghcr.io/retailerp]
# ============================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
REPORT_DIR="$(dirname "$0")/../reports"
REGISTRY="${REGISTRY:-ghcr.io/retailerp}"
TIMESTAMP=$(date -u '+%Y%m%d-%H%M%S')
CRITICAL_FOUND=false

SERVICES=(auth product inventory order production billing reporting gateway frontend)

mkdir -p "$REPORT_DIR"
echo -e "\n${YELLOW}=== RetailERP Security Scan — Trivy ===${NC}"

command -v trivy &>/dev/null || { echo -e "${RED}trivy not installed${NC}"; exit 1; }

for svc in "${SERVICES[@]}"; do
  IMAGE="${REGISTRY}/${svc}:latest"
  echo -e "\n${YELLOW}Scanning: $IMAGE${NC}"
  SCAN_REPORT="${REPORT_DIR}/trivy-${svc}-${TIMESTAMP}.json"

  if docker image inspect "$IMAGE" &>/dev/null; then
    trivy image \
      --severity HIGH,CRITICAL \
      --format json \
      --output "$SCAN_REPORT" \
      "$IMAGE" 2>/dev/null

    CRITICAL=$(python3 -c "
import json, sys
data = json.load(open('$SCAN_REPORT'))
crit = sum(len([v for v in r.get('Vulnerabilities',[]) or [] if v.get('Severity')=='CRITICAL'])
           for r in data.get('Results',[]))
print(crit)
" 2>/dev/null || echo "0")

    HIGH=$(python3 -c "
import json
data = json.load(open('$SCAN_REPORT'))
high = sum(len([v for v in r.get('Vulnerabilities',[]) or [] if v.get('Severity')=='HIGH'])
           for r in data.get('Results',[]))
print(high)
" 2>/dev/null || echo "0")

    if [[ "$CRITICAL" -gt 0 ]]; then
      echo -e "  ${RED}✗ $svc: $CRITICAL CRITICAL, $HIGH HIGH vulnerabilities${NC}"
      CRITICAL_FOUND=true
    elif [[ "$HIGH" -gt 0 ]]; then
      echo -e "  ${YELLOW}! $svc: 0 CRITICAL, $HIGH HIGH vulnerabilities${NC}"
    else
      echo -e "  ${GREEN}✓ $svc: No HIGH/CRITICAL vulnerabilities${NC}"
    fi
  else
    echo -e "  ${YELLOW}! $svc: Image not found locally, skipping${NC}"
  fi
done

if [[ "$CRITICAL_FOUND" == "true" ]]; then
  echo -e "\n${RED}✗ CRITICAL vulnerabilities found — review $REPORT_DIR${NC}"
  exit 1
else
  echo -e "\n${GREEN}✓ Security scan complete — no critical vulnerabilities${NC}"
  exit 0
fi
