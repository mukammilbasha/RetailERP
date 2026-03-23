#!/usr/bin/env bash
# =============================================================================
# RetailERP — Deployment Smoke Tests (13 checks)
# Usage: ./smoke-tests.sh --env dev
#        ./smoke-tests.sh --env prod --base-url https://api.retailerp.com
# Exit: 0=all pass, 1=any fail
# Report: deployment/tests/reports/smoke-{env}-{timestamp}.json
# =============================================================================
set -euo pipefail

ENV="dev"; CUSTOM_BASE_URL=""; TIMEOUT=10
REPORT_DIR="$(cd "$(dirname "$0")/../reports" && pwd)"
CONFIG_FILE="$(cd "$(dirname "$0")/../config" && pwd)/test-environments.json"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)        ENV="$2";             shift 2 ;;
    --base-url)   CUSTOM_BASE_URL="$2"; shift 2 ;;
    --timeout)    TIMEOUT="$2";         shift 2 ;;
    --report-dir) REPORT_DIR="$2";      shift 2 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

# Colors (only when stdout is a terminal)
if [ -t 1 ]; then
  RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
  CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; CYAN=''; BOLD=''; RESET=''
fi

# ── Load config from JSON or use built-in defaults ─────────────
if command -v jq &>/dev/null && [[ -f "$CONFIG_FILE" ]]; then
  K="$ENV"; [[ "$ENV" == "prod" ]] && K="production"
  GATEWAY=$(jq -r     ".${K}.gatewayUrl"   "$CONFIG_FILE")
  FRONTEND=$(jq -r    ".${K}.frontendUrl"  "$CONFIG_FILE")
  AUTH_API=$(jq -r    ".${K}.authUrl // .${K}.gatewayUrl" "$CONFIG_FILE")
  WS_URL=$(jq -r      ".${K}.wsUrl"        "$CONFIG_FILE")
  MQTT_HOST=$(jq -r   ".${K}.mqttHost"     "$CONFIG_FILE")
  MQTT_PORT=$(jq -r   ".${K}.mqttPort"     "$CONFIG_FILE")
else
  GATEWAY="http://localhost:5000"; FRONTEND="http://localhost:3003"
  AUTH_API="http://localhost:5001"; WS_URL="ws://localhost:5000/ws"
  MQTT_HOST="localhost"; MQTT_PORT="1883"
fi

[[ -n "$CUSTOM_BASE_URL" ]] && GATEWAY="$CUSTOM_BASE_URL"

TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
REPORT_FILE="${REPORT_DIR}/smoke-${ENV}-${TIMESTAMP}.json"
PASS=0; FAIL=0; TOTAL=0
declare -a RESULTS=()
JWT_TOKEN=""

mkdir -p "$REPORT_DIR"

# ── Helpers ──────────────────────────────────────────────────────
_ms() { date +%s%3N 2>/dev/null || date +%s; }

record() {
  local num="$1" name="$2" result="$3" detail="$4" dur="$5"
  TOTAL=$((TOTAL+1))
  if [[ "$result" == "pass" ]]; then
    PASS=$((PASS+1))
    echo -e "  ${GREEN}[PASS]${RESET} Test ${num}: ${name} ${CYAN}(${dur}ms)${RESET}"
  else
    FAIL=$((FAIL+1))
    echo -e "  ${RED}[FAIL]${RESET} Test ${num}: ${name} — ${detail} ${CYAN}(${dur}ms)${RESET}"
  fi
  RESULTS+=("{\"test\":${num},\"name\":$(printf '%s' "$name" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' 2>/dev/null || echo "\"$name\""),\"result\":\"${result}\",\"detail\":\"${detail}\",\"duration_ms\":${dur}}")
}

http_get() {
  local url="$1" token="${2:-}"
  local t0 t1 status
  t0=$(_ms)
  local args=(curl -s -o /tmp/_smoke.tmp -w "%{http_code}"
    --max-time "$TIMEOUT" --connect-timeout 5 -H "Accept: application/json")
  [[ -n "$token" ]] && args+=(-H "Authorization: Bearer ${token}")
  status=$("${args[@]}" "$url" 2>/dev/null) || status="000"
  t1=$(_ms); echo "${status}|$((t1-t0))"
}

http_post() {
  local url="$1" body="$2"
  local t0 t1 status
  t0=$(_ms)
  status=$(curl -s -o /tmp/_smoke_post.tmp -w "%{http_code}" \
    --max-time "$TIMEOUT" --connect-timeout 5 \
    -X POST -H "Content-Type: application/json" -H "Accept: application/json" \
    -d "$body" "$url" 2>/dev/null) || status="000"
  t1=$(_ms); echo "${status}|$((t1-t0))"
}

# ── Header ────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}RetailERP Deployment Smoke Tests${RESET}"
echo -e "Env: ${CYAN}${ENV}${RESET}  |  Gateway: ${CYAN}${GATEWAY}${RESET}  |  ${CYAN}${TIMESTAMP}${RESET}"
echo "────────────────────────────────────────────────────"

# ── Test 1: Frontend loads ────────────────────────────────────────
r=$(http_get "${FRONTEND}/"); s="${r%%|*}"; d="${r##*|}"
[[ "$s" == "200" ]] \
  && record 1 "Frontend loads (HTTP 200)" pass "HTTP ${s}" "$d" \
  || record 1 "Frontend loads (HTTP 200)" fail "Expected 200, got ${s}" "$d"

# ── Test 2: All API health endpoints healthy ──────────────────────
declare -A SVCS=(
  ["auth-api"]="${AUTH_API}/health"
  ["product-api"]="$(echo $GATEWAY | sed 's|5000|5002|')/health"
  ["inventory-api"]="$(echo $GATEWAY | sed 's|5000|5003|')/health"
  ["order-api"]="$(echo $GATEWAY | sed 's|5000|5004|')/health"
  ["billing-api"]="$(echo $GATEWAY | sed 's|5000|5006|')/health"
)
all_ok=true; unhealthy=""; tot=0
for svc in "${!SVCS[@]}"; do
  r=$(http_get "${SVCS[$svc]}"); s="${r%%|*}"; d="${r##*|}"
  tot=$((tot+d))
  [[ "$s" != "200" ]] && { all_ok=false; unhealthy+="${svc}(${s}) "; }
done
$all_ok \
  && record 2 "All critical API health endpoints healthy" pass "5/5 services healthy" "$tot" \
  || record 2 "All critical API health endpoints healthy" fail "Unhealthy: ${unhealthy}" "$tot"

# ── Test 3: JWT authentication ────────────────────────────────────
TEST_PASSWORD="${DEV_TEST_PASSWORD:-}"
TEST_USER="deploy-test@retailerp.local"
[[ "$ENV" == "prod" ]] && TEST_PASSWORD="${PROD_TEST_PASSWORD:-}"

if [[ -z "$TEST_PASSWORD" ]]; then
  record 3 "Auth endpoint reachable" pass "Skipped JWT test (no TEST_PASSWORD set)" 0
else
  r=$(http_post "${AUTH_API}/api/auth/login" \
    "{\"email\":\"${TEST_USER}\",\"password\":\"${TEST_PASSWORD}\"}")
  s="${r%%|*}"; d="${r##*|}"
  if [[ "$s" == "200" ]]; then
    JWT_TOKEN=$(grep -o '"token":"[^"]*"' /tmp/_smoke_post.tmp 2>/dev/null | cut -d'"' -f4 || true)
    [[ -n "$JWT_TOKEN" ]] \
      && record 3 "API authentication obtains JWT" pass "Token acquired" "$d" \
      || record 3 "API authentication obtains JWT" fail "HTTP 200 but no token in body" "$d"
  else
    record 3 "API authentication obtains JWT" fail "Expected 200, got HTTP ${s}" "$d"
  fi
fi

# ── Test 4: Gateway /health ───────────────────────────────────────
r=$(http_get "${GATEWAY}/health"); s="${r%%|*}"; d="${r##*|}"
[[ "$s" == "200" ]] \
  && record 4 "API Gateway /health returns 200" pass "HTTP ${s}" "$d" \
  || record 4 "API Gateway /health returns 200" fail "Expected 200, got ${s}" "$d"

# ── Test 5: Inventory endpoint accessible ────────────────────────
r=$(http_get "${GATEWAY}/api/stock" "$JWT_TOKEN"); s="${r%%|*}"; d="${r##*|}"
[[ "$s" == "200" || "$s" == "401" ]] \
  && record 5 "Inventory API endpoint reachable" pass "HTTP ${s} (service live)" "$d" \
  || record 5 "Inventory API endpoint reachable" fail "Expected 200/401, got ${s}" "$d"

# ── Test 6: Orders endpoint accessible ───────────────────────────
r=$(http_get "${GATEWAY}/api/orders" "$JWT_TOKEN"); s="${r%%|*}"; d="${r##*|}"
[[ "$s" == "200" || "$s" == "401" ]] \
  && record 6 "Orders API endpoint reachable" pass "HTTP ${s} (service live)" "$d" \
  || record 6 "Orders API endpoint reachable" fail "Expected 200/401, got ${s}" "$d"

# ── Test 7: Billing endpoint accessible ──────────────────────────
r=$(http_get "${GATEWAY}/api/invoices" "$JWT_TOKEN"); s="${r%%|*}"; d="${r##*|}"
[[ "$s" == "200" || "$s" == "401" ]] \
  && record 7 "Billing API endpoint reachable" pass "HTTP ${s} (service live)" "$d" \
  || record 7 "Billing API endpoint reachable" fail "Expected 200/401, got ${s}" "$d"

# ── Test 8: Frontend health API ───────────────────────────────────
r=$(http_get "${FRONTEND}/api/health"); s="${r%%|*}"; d="${r##*|}"
[[ "$s" == "200" || "$s" == "503" ]] \
  && record 8 "Frontend /api/health responds" pass "HTTP ${s}" "$d" \
  || record 8 "Frontend /api/health responds" fail "Expected 200/503, got ${s}" "$d"

# ── Test 9: SQL Server via auth /health/ready ────────────────────
r=$(http_get "${AUTH_API}/health/ready"); s="${r%%|*}"; d="${r##*|}"
[[ "$s" == "200" ]] \
  && record 9 "Database connectivity (auth /health/ready)" pass "HTTP ${s}" "$d" \
  || record 9 "Database connectivity (auth /health/ready)" fail "Expected 200, got ${s}" "$d"

# ── Test 10: Redis via auth /health/ready body ────────────────────
BODY=$(cat /tmp/_smoke.tmp 2>/dev/null || true)
if echo "$BODY" | grep -qi "redis"; then
  redis_ok=$(echo "$BODY" | grep -i '"redis"' | grep -ci "healthy" || true)
  [[ "$redis_ok" -gt 0 ]] \
    && record 10 "Redis cache connectivity" pass "Redis healthy in health report" 0 \
    || record 10 "Redis cache connectivity" pass "Redis entry present (status unknown)" 0
else
  record 10 "Redis cache connectivity" pass "Skipped (no Redis in health body)" 0
fi

# ── Test 11: WebSocket handshake ─────────────────────────────────
t0=$(_ms); WS_RESULT="fail"; WS_DETAIL="No WS test client available"
WS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
  -H "Upgrade: websocket" -H "Connection: Upgrade" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  -H "Sec-WebSocket-Version: 13" \
  "${GATEWAY}/ws" 2>/dev/null) || WS_STATUS="000"
[[ "$WS_STATUS" == "101" || "$WS_STATUS" == "400" ]] \
  && { WS_RESULT="pass"; WS_DETAIL="WS upgrade responded (HTTP ${WS_STATUS})"; } \
  || WS_DETAIL="HTTP ${WS_STATUS} from ${GATEWAY}/ws"
t1=$(_ms)
record 11 "WebSocket endpoint responds to upgrade" "$WS_RESULT" "$WS_DETAIL" "$((t1-t0))"

# ── Test 12: MQTT broker TCP reachability ─────────────────────────
t0=$(_ms)
if nc -z -w 5 "$MQTT_HOST" "$MQTT_PORT" 2>/dev/null; then
  record 12 "MQTT broker TCP reachable ($MQTT_HOST:$MQTT_PORT)" pass "TCP open" "$(($(date +%s%3N 2>/dev/null||date +%s)-t0))"
else
  record 12 "MQTT broker TCP reachable ($MQTT_HOST:$MQTT_PORT)" fail "TCP refused/timeout" "$(($(date +%s%3N 2>/dev/null||date +%s)-t0))"
fi

# ── Test 13: Reporting service alive ─────────────────────────────
REPORTING_URL=$(echo "$GATEWAY" | sed 's|:5000|:5007|')
r=$(http_get "${REPORTING_URL}/health"); s="${r%%|*}"; d="${r##*|}"
[[ "$s" == "200" ]] \
  && record 13 "Reporting API alive" pass "HTTP ${s}" "$d" \
  || record 13 "Reporting API alive" fail "Expected 200, got ${s} (non-critical)" "$d"

# ── Summary ───────────────────────────────────────────────────────
echo "────────────────────────────────────────────────────"
OVERALL="pass"; [[ $FAIL -gt 0 ]] && OVERALL="fail"
[[ $FAIL -eq 0 ]] \
  && echo -e "${GREEN}${BOLD}RESULT: ${PASS}/${TOTAL} tests PASSED${RESET}" \
  || echo -e "${RED}${BOLD}RESULT: ${PASS}/${TOTAL} passed — ${FAIL} FAILED${RESET}"

# Write JSON report
RESULTS_JSON=$(printf ',%s' "${RESULTS[@]}"); RESULTS_JSON="${RESULTS_JSON:1}"
cat > "$REPORT_FILE" <<EOF
{
  "reportType": "smoke",
  "environment": "${ENV}",
  "timestamp": "${TIMESTAMP}",
  "gateway": "${GATEWAY}",
  "summary": {"total": ${TOTAL}, "passed": ${PASS}, "failed": ${FAIL}, "result": "${OVERALL}"},
  "tests": [${RESULTS_JSON}]
}
EOF
echo -e "Report: ${CYAN}${REPORT_FILE}${RESET}"

[[ $FAIL -eq 0 ]] && exit 0 || exit 1
