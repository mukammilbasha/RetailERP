#!/bin/bash
# ============================================================
# RetailERP — Database Migration Runner
# Usage: ./run-migrations.sh [--seed] [--conn "Server=..."]
# Waits for SQL Server to be ready, then runs all schema scripts
# ============================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

CONN="${ConnectionStrings__DefaultConnection:-Server=sqlserver;Database=RetailERP;User Id=sa;Password=RetailERP@2024!;TrustServerCertificate=true}"
SEED=false
MAX_WAIT=120  # seconds
DB_DIR="$(cd "$(dirname "$0")/../../database" && pwd)"

while [[ $# -gt 0 ]]; do
  case $1 in
    --seed) SEED=true; shift ;;
    --conn) CONN="$2"; shift 2 ;;
    *) shift ;;
  esac
done

# Extract host/port/user/pass from connection string
SQL_HOST=$(echo "$CONN" | grep -oP '(?<=Server=)[^;,]+' | cut -d, -f1)
SQL_PORT=$(echo "$CONN" | grep -oP '(?<=Server=)[^;]+' | grep -oP ',\d+$' | tr -d ',' || echo "1433")
SQL_USER=$(echo "$CONN" | grep -oP '(?<=User Id=)[^;]+')
SQL_PASS=$(echo "$CONN" | grep -oP '(?<=Password=)[^;]+')

SQLCMD=""
for path in /opt/mssql-tools18/bin/sqlcmd /opt/mssql-tools/bin/sqlcmd /usr/bin/sqlcmd; do
  [[ -x "$path" ]] && SQLCMD="$path" && break
done
[[ -z "$SQLCMD" ]] && { echo -e "${RED}sqlcmd not found${NC}"; exit 1; }

# ── Wait for SQL Server ───────────────────────────────────────
echo -e "${YELLOW}→ Waiting for SQL Server ($SQL_HOST:$SQL_PORT)...${NC}"
waited=0
until "$SQLCMD" -S "${SQL_HOST},${SQL_PORT}" -U "$SQL_USER" -P "$SQL_PASS" \
      -C -Q "SELECT 1" &>/dev/null; do
  waited=$(( waited + 2 ))
  [[ "$waited" -ge "$MAX_WAIT" ]] && { echo -e "${RED}SQL Server not ready after ${MAX_WAIT}s${NC}"; exit 1; }
  sleep 2
done
echo -e "${GREEN}✓ SQL Server ready (${waited}s)${NC}"

# ── Create database if not exists ─────────────────────────────
echo -e "${YELLOW}→ Ensuring RetailERP database exists...${NC}"
"$SQLCMD" -S "${SQL_HOST},${SQL_PORT}" -U "$SQL_USER" -P "$SQL_PASS" -C -Q \
  "IF NOT EXISTS (SELECT name FROM sys.databases WHERE name='RetailERP')
   BEGIN CREATE DATABASE RetailERP; PRINT 'Database created'; END
   ELSE PRINT 'Database already exists';"
echo -e "${GREEN}✓ Database ready${NC}"

# ── Run SQL scripts ───────────────────────────────────────────
run_scripts() {
  local dir="$1" label="$2"
  [[ -d "$dir" ]] || return 0
  local count=0
  for f in "$dir"/*.sql; do
    [[ -f "$f" ]] || continue
    echo -e "  Running: $(basename "$f")"
    "$SQLCMD" -S "${SQL_HOST},${SQL_PORT}" -U "$SQL_USER" -P "$SQL_PASS" \
      -C -d RetailERP -i "$f" 2>&1 || {
        echo -e "${RED}  Failed: $(basename "$f")${NC}"; exit 1;
      }
    count=$((count + 1))
  done
  echo -e "${GREEN}✓ $label: $count scripts executed${NC}"
}

echo -e "\n${YELLOW}→ Running schema scripts...${NC}"
run_scripts "$DB_DIR/schemas"           "Schemas"
run_scripts "$DB_DIR/tables"            "Tables"
run_scripts "$DB_DIR/indexes"           "Indexes"
run_scripts "$DB_DIR/stored-procedures" "Stored Procedures"

if [[ "$SEED" == "true" ]]; then
  echo -e "\n${YELLOW}→ Running seed data...${NC}"
  run_scripts "$DB_DIR/seed-data" "Seed Data"

  # Also run the deployment seed file
  SEED_FILE="$(dirname "$0")/seed-data.sql"
  if [[ -f "$SEED_FILE" ]]; then
    "$SQLCMD" -S "${SQL_HOST},${SQL_PORT}" -U "$SQL_USER" -P "$SQL_PASS" \
      -C -d RetailERP -i "$SEED_FILE"
    echo -e "${GREEN}✓ Deployment seed data applied${NC}"
  fi
fi

echo -e "\n${GREEN}=== Database migrations complete ===${NC}"
