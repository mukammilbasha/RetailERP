#!/bin/bash
# ============================================================
# RetailERP — Comprehensive Health Check Script
# Usage: ./health-check.sh [--env ENV] [--target TARGET] [--json]
# Exit: 0=all healthy, 1=one or more critical failures
# ============================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

ENV="dev"
TARGET="docker"
JSON_OUTPUT=false
REPORT_FILE=""
TIMEOUT=5
RETRIES=3
RETRY_DELAY=3

while [[ $# -gt 0 ]]; do
  case $1 in
    --env)    ENV="$2"; shift 2 ;;
    --target) TARGET="$2"; shift 2 ;;
    --json)   JSON_OUTPUT=true; shift ;;
    --output) REPORT_FILE="$2"; shift 2 ;;
    *) shift ;;
  esac
done

# ── Service URL resolution ────────────────────────────────────
case "$TARGET:$ENV" in
  docker:*) BASE="http://localhost" ;;
  iis:dev)  BASE="http://localhost" ;;
  iis:qa)   BASE="http://retailerp-qa.local" ;;
  iis:uat)  BASE="http://retailerp-uat.local" ;;
  iis:prod) BASE="http://retailerp.local" ;;
  aws:dev)  BASE="http://${AWS_ALB_DNS_DEV:-localhost}" ;;
  aws:qa)   BASE="http://${AWS_ALB_DNS_QA:-localhost}" ;;
  aws:uat)  BASE="http://${AWS_ALB_DNS_UAT:-localhost}" ;;
  aws:prod) BASE="http://${AWS_ALB_DNS_PROD:-localhost}" ;;
  azure:*)  BASE="https://retailerp-${ENV}.azurewebsites.net" ;;
  gcp:*)    BASE="https://retailerp-${ENV}.retailerp.com" ;;
  *)        BASE="http://localhost" ;;
esac

# Service definitions: name|host|port|path|critical(true/false)
declare -a SERVICES=(
  "API Gateway|${BASE}|5000|/health|true"
  "Auth API|${BASE}|5001|/health|true"
  "Product API|${BASE}|5002|/health|true"
  "Inventory API|${BASE}|5003|/health|true"
  "Order API|${BASE}|5004|/health|true"
  "Production API|${BASE}|5005|/health|false"
  "Billing API|${BASE}|5006|/health|true"
  "Reporting API|${BASE}|5007|/health|false"
  "Frontend|${BASE}|3003|/api/health|true"
)

# Infrastructure checks
SQL_HOST="${SQL_HOST:-localhost}"
SQL_PORT="${SQL_PORT:-1434}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6380}"
MQTT_HOST="${MQTT_HOST:-localhost}"
MQTT_PORT="${MQTT_PORT:-1883}"

PASS=0; FAIL=0; WARN=0
RESULTS=()
CRITICAL_FAIL=false

# ── Check function ────────────────────────────────────────────
check_http() {
  local name="$1" url="$2" critical="$3"
  local attempt=0 status=""

  while [[ $attempt -lt $RETRIES ]]; do
    attempt=$(( attempt + 1 ))
    local start_ms end_ms latency
    start_ms=$(date +%s%3N 2>/dev/null || echo 0)
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "000")
    end_ms=$(date +%s%3N 2>/dev/null || echo 0)
    latency=$(( end_ms - start_ms ))

    if [[ "$status" == "200" ]]; then
      echo -e "  ${GREEN}✓${NC} $name ${GREEN}[HTTP $status]${NC} ${latency}ms"
      PASS=$(( PASS + 1 ))
      RESULTS+=("{\"service\":\"$name\",\"status\":\"up\",\"http\":$status,\"latencyMs\":$latency,\"critical\":$critical}")
      return 0
    fi

    [[ $attempt -lt $RETRIES ]] && sleep "$RETRY_DELAY"
  done

  if [[ "$critical" == "true" ]]; then
    echo -e "  ${RED}✗${NC} $name ${RED}[HTTP $status — CRITICAL]${NC}"
    FAIL=$(( FAIL + 1 ))
    CRITICAL_FAIL=true
    RESULTS+=("{\"service\":\"$name\",\"status\":\"down\",\"http\":$status,\"latencyMs\":0,\"critical\":true}")
  else
    echo -e "  ${YELLOW}!${NC} $name ${YELLOW}[HTTP $status — WARNING]${NC}"
    WARN=$(( WARN + 1 ))
    RESULTS+=("{\"service\":\"$name\",\"status\":\"degraded\",\"http\":$status,\"latencyMs\":0,\"critical\":false}")
  fi
}

check_tcp() {
  local name="$1" host="$2" port="$3" critical="$4"
  if nc -z -w "$TIMEOUT" "$host" "$port" &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} $name ${GREEN}[TCP $host:$port]${NC}"
    PASS=$(( PASS + 1 ))
    RESULTS+=("{\"service\":\"$name\",\"status\":\"up\",\"endpoint\":\"$host:$port\",\"critical\":$critical}")
  else
    if [[ "$critical" == "true" ]]; then
      echo -e "  ${RED}✗${NC} $name ${RED}[$host:$port — UNREACHABLE]${NC}"
      FAIL=$(( FAIL + 1 ))
      CRITICAL_FAIL=true
    else
      echo -e "  ${YELLOW}!${NC} $name ${YELLOW}[$host:$port — UNREACHABLE]${NC}"
      WARN=$(( WARN + 1 ))
    fi
    RESULTS+=("{\"service\":\"$name\",\"status\":\"down\",\"endpoint\":\"$host:$port\",\"critical\":$critical}")
  fi
}

# ── Run checks ────────────────────────────────────────────────
echo -e "\n${BOLD}RetailERP Health Check — $ENV / $TARGET${NC}"
echo -e "${CYAN}$(date -u '+%Y-%m-%dT%H:%M:%SZ')${NC}\n"

echo -e "${BOLD}─── Microservices ───────────────────────────────────${NC}"
for svc_def in "${SERVICES[@]}"; do
  IFS='|' read -r name base port path critical <<< "$svc_def"
  check_http "$name" "${base}:${port}${path}" "$critical"
done

echo -e "\n${BOLD}─── Infrastructure ──────────────────────────────────${NC}"
check_tcp "SQL Server"   "$SQL_HOST"   "$SQL_PORT"   "true"
check_tcp "Redis"        "$REDIS_HOST" "$REDIS_PORT" "true"
check_tcp "MQTT Broker"  "$MQTT_HOST"  "$MQTT_PORT"  "false"

# ── Summary ───────────────────────────────────────────────────
TOTAL=$(( PASS + FAIL + WARN ))
echo -e "\n${BOLD}─── Summary ─────────────────────────────────────────${NC}"
echo -e "  ${GREEN}Passed:${NC}  $PASS"
echo -e "  ${YELLOW}Warnings:${NC} $WARN"
echo -e "  ${RED}Failed:${NC}  $FAIL"
echo -e "  Total:   $TOTAL"

# ── JSON output ───────────────────────────────────────────────
if [[ "$JSON_OUTPUT" == "true" ]] || [[ -n "$REPORT_FILE" ]]; then
  OVERALL="healthy"
  [[ "$WARN" -gt 0 ]] && OVERALL="degraded"
  [[ "$FAIL" -gt 0 ]] && OVERALL="unhealthy"
  RESULTS_JSON=$(printf '%s\n' "${RESULTS[@]}" | paste -sd ',' -)
  JSON_BODY="{\"status\":\"$OVERALL\",\"environment\":\"$ENV\",\"target\":\"$TARGET\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"passed\":$PASS,\"warnings\":$WARN,\"failed\":$FAIL,\"services\":[$RESULTS_JSON]}"
  [[ "$JSON_OUTPUT" == "true" ]] && echo "$JSON_BODY" | python3 -m json.tool 2>/dev/null || echo "$JSON_BODY"
  if [[ -n "$REPORT_FILE" ]]; then
    echo "$JSON_BODY" > "$REPORT_FILE"
    echo -e "  Report: $REPORT_FILE"
  fi
fi

# ── Exit code ─────────────────────────────────────────────────
if [[ "$CRITICAL_FAIL" == "true" ]]; then
  echo -e "\n${RED}${BOLD}✗ HEALTH CHECK FAILED — critical services are down${NC}"
  exit 1
elif [[ "$WARN" -gt 0 ]]; then
  echo -e "\n${YELLOW}${BOLD}! HEALTH CHECK DEGRADED — non-critical services have issues${NC}"
  exit 0
else
  echo -e "\n${GREEN}${BOLD}✓ ALL HEALTH CHECKS PASSED${NC}"
  exit 0
fi
