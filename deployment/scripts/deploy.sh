#!/bin/bash
# ============================================================
# RetailERP — One-Click Master Deploy Script
# Usage: ./deploy.sh [--env dev|qa|uat|prod] [--target docker|iis|aws|azure|gcp] [--version v1.2.3]
# ============================================================
set -euo pipefail

# ── Colors ──────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$ROOT_DIR")"
LOCK_FILE="/tmp/retailerp-deploy.lock"
LOG_DIR="${PROJECT_ROOT}/deployment/logs"
LOG_FILE="${LOG_DIR}/deployments.log"
DEPLOY_START=$(date +%s)

# ── Defaults ─────────────────────────────────────────────────
ENV=""
TARGET=""
VERSION=$(git -C "$PROJECT_ROOT" rev-parse --short HEAD 2>/dev/null || echo "unknown")
SKIP_HEALTH=false
FORCE=false

# ── Parse arguments ──────────────────────────────────────────
usage() {
  echo -e "${BOLD}Usage:${NC} $0 [OPTIONS]"
  echo ""
  echo "Options:"
  echo "  --env     dev|qa|uat|prod          Deployment environment (required)"
  echo "  --target  docker|iis|aws|azure|gcp Deployment target (required)"
  echo "  --version TAG                      Image/release version (default: git SHA)"
  echo "  --skip-health                      Skip post-deploy health checks"
  echo "  --force                            Override deployment lock"
  echo "  -h, --help                         Show this help"
  exit 0
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --env)       ENV="$2"; shift 2 ;;
    --target)    TARGET="$2"; shift 2 ;;
    --version)   VERSION="$2"; shift 2 ;;
    --skip-health) SKIP_HEALTH=true; shift ;;
    --force)     FORCE=true; shift ;;
    -h|--help)   usage ;;
    *) echo -e "${RED}Unknown option: $1${NC}"; usage ;;
  esac
done

# ── Interactive menu if args not provided ────────────────────
if [[ -z "$TARGET" ]]; then
  echo -e "\n${BOLD}${BLUE}╔══════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${BLUE}║   RetailERP One-Click Deploy System  ║${NC}"
  echo -e "${BOLD}${BLUE}╚══════════════════════════════════════╝${NC}\n"
  echo -e "Select deployment ${BOLD}target${NC}:"
  echo "  1) Docker (local/server)"
  echo "  2) IIS (Windows Server)"
  echo "  3) AWS (ECS Fargate)"
  echo "  4) Azure (AKS)"
  echo "  5) GCP (GKE)"
  read -rp "Choice [1-5]: " choice
  case $choice in
    1) TARGET="docker" ;; 2) TARGET="iis" ;; 3) TARGET="aws" ;;
    4) TARGET="azure" ;; 5) TARGET="gcp" ;;
    *) echo -e "${RED}Invalid choice${NC}"; exit 1 ;;
  esac
fi

if [[ -z "$ENV" ]]; then
  echo -e "\nSelect ${BOLD}environment${NC}:"
  echo "  1) dev"
  echo "  2) qa"
  echo "  3) uat"
  echo "  4) prod"
  read -rp "Choice [1-4]: " choice
  case $choice in
    1) ENV="dev" ;; 2) ENV="qa" ;; 3) ENV="uat" ;; 4) ENV="prod" ;;
    *) echo -e "${RED}Invalid choice${NC}"; exit 1 ;;
  esac
fi

# ── Validate inputs ──────────────────────────────────────────
case $ENV in dev|qa|uat|prod) ;; *) echo -e "${RED}Invalid ENV: $ENV${NC}"; exit 1 ;; esac
case $TARGET in docker|iis|aws|azure|gcp) ;; *) echo -e "${RED}Invalid TARGET: $TARGET${NC}"; exit 1 ;; esac

# ── Prod confirmation ────────────────────────────────────────
if [[ "$ENV" == "prod" ]]; then
  echo -e "\n${RED}${BOLD}⚠  WARNING: Deploying to PRODUCTION${NC}"
  read -rp "Type 'yes-deploy-prod' to confirm: " confirm
  [[ "$confirm" == "yes-deploy-prod" ]] || { echo "Aborted."; exit 1; }
fi

# ── Logging ───────────────────────────────────────────────────
mkdir -p "$LOG_DIR"
log() { echo -e "$1" | tee -a "$LOG_FILE"; }
log_entry() {
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] ENV=$ENV TARGET=$TARGET VERSION=$VERSION STATUS=$1 USER=$(whoami)" >> "$LOG_FILE"
}

# ── Lock file ────────────────────────────────────────────────
if [[ -f "$LOCK_FILE" ]] && [[ "$FORCE" != "true" ]]; then
  LOCK_PID=$(cat "$LOCK_FILE")
  log "${RED}ERROR: Deploy already in progress (PID $LOCK_PID). Use --force to override.${NC}"
  exit 1
fi
echo $$ > "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

# ── Header ────────────────────────────────────────────────────
log "\n${BOLD}${BLUE}╔══════════════════════════════════════════════════╗${NC}"
log "${BOLD}${BLUE}║         RetailERP Deployment Started             ║${NC}"
log "${BOLD}${BLUE}╚══════════════════════════════════════════════════╝${NC}"
log "  Target:      ${CYAN}$TARGET${NC}"
log "  Environment: ${CYAN}$ENV${NC}"
log "  Version:     ${CYAN}$VERSION${NC}"
log "  Timestamp:   $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
log "  User:        $(whoami)"
log_entry "STARTED"

# ── Pre-flight checks ─────────────────────────────────────────
log "\n${YELLOW}→ Running pre-flight checks...${NC}"

check_command() {
  if ! command -v "$1" &>/dev/null; then
    log "${RED}✗ Required command not found: $1${NC}"
    return 1
  fi
  log "${GREEN}✓ $1 found${NC}"
}

case $TARGET in
  docker)
    check_command docker
    check_command "docker compose" 2>/dev/null || check_command docker-compose
    docker info &>/dev/null || { log "${RED}✗ Docker daemon not running${NC}"; exit 1; }
    log "${GREEN}✓ Docker daemon running${NC}"
    ;;
  aws)
    check_command aws
    check_command docker
    aws sts get-caller-identity &>/dev/null || { log "${RED}✗ AWS credentials not configured${NC}"; exit 1; }
    log "${GREEN}✓ AWS credentials valid${NC}"
    ;;
  azure)
    check_command az
    check_command kubectl
    az account show &>/dev/null || { log "${RED}✗ Azure CLI not logged in${NC}"; exit 1; }
    log "${GREEN}✓ Azure CLI authenticated${NC}"
    ;;
  gcp)
    check_command gcloud
    check_command kubectl
    gcloud auth list --filter=status:ACTIVE --format='value(account)' | grep -q . || { log "${RED}✗ GCP not authenticated${NC}"; exit 1; }
    log "${GREEN}✓ GCP authenticated${NC}"
    ;;
  iis)
    command -v powershell.exe &>/dev/null || { log "${RED}✗ PowerShell not found${NC}"; exit 1; }
    log "${GREEN}✓ PowerShell available${NC}"
    ;;
esac

# Check disk space (need at least 2GB)
AVAILABLE_KB=$(df "$PROJECT_ROOT" | awk 'NR==2 {print $4}')
if [[ "$AVAILABLE_KB" -lt 2097152 ]]; then
  log "${RED}✗ Insufficient disk space (< 2GB available)${NC}"
  exit 1
fi
log "${GREEN}✓ Disk space sufficient ($(( AVAILABLE_KB / 1024 ))MB available)${NC}"
log "${GREEN}✓ Pre-flight checks passed${NC}"

# ── Build images ──────────────────────────────────────────────
if [[ "$TARGET" != "iis" ]]; then
  log "\n${YELLOW}→ Building Docker images (version: $VERSION)...${NC}"
  bash "$SCRIPT_DIR/build-backend.sh" --version "$VERSION" --env "$ENV"
  bash "$SCRIPT_DIR/build-frontend.sh" --version "$VERSION" --env "$ENV"
  log "${GREEN}✓ All images built${NC}"
fi

# ── Deploy ────────────────────────────────────────────────────
log "\n${YELLOW}→ Deploying to $TARGET ($ENV)...${NC}"
DEPLOY_EXIT=0

case $TARGET in
  docker)
    cd "$PROJECT_ROOT"
    export VERSION ENV
    COMPOSE_FILES="-f docker-compose.yml"
    [[ "$ENV" == "dev" ]] && COMPOSE_FILES="$COMPOSE_FILES -f deployment/docker/docker-compose.dev.yml"
    [[ "$ENV" == "prod" ]] && COMPOSE_FILES="$COMPOSE_FILES -f deployment/docker/docker-compose.prod.yml"

    # Pull latest images, then rolling update
    docker compose $COMPOSE_FILES pull --quiet 2>/dev/null || true
    docker compose $COMPOSE_FILES up -d --remove-orphans || DEPLOY_EXIT=$?
    ;;

  iis)
    powershell.exe -ExecutionPolicy Bypass -File \
      "$ROOT_DIR/iis/deploy-iis.ps1" \
      -Environment "$ENV" \
      -Version "$VERSION" || DEPLOY_EXIT=$?
    ;;

  aws)
    bash "$SCRIPT_DIR/deploy-aws.sh" --env "$ENV" --version "$VERSION" || DEPLOY_EXIT=$?
    ;;

  azure)
    bash "$SCRIPT_DIR/deploy-azure.sh" --env "$ENV" --version "$VERSION" || DEPLOY_EXIT=$?
    ;;

  gcp)
    bash "$SCRIPT_DIR/deploy-gcp.sh" --env "$ENV" --version "$VERSION" || DEPLOY_EXIT=$?
    ;;
esac

if [[ "$DEPLOY_EXIT" -ne 0 ]]; then
  log "${RED}✗ Deployment failed (exit code $DEPLOY_EXIT)${NC}"
  log_entry "FAILED"
  notify_webhook "failure" || true
  # Auto-rollback on failure
  log "${YELLOW}→ Triggering automatic rollback...${NC}"
  bash "$SCRIPT_DIR/rollback.sh" --env "$ENV" --target "$TARGET" --auto || true
  exit 1
fi

log "${GREEN}✓ Deployment commands completed${NC}"

# ── Post-deploy health checks ─────────────────────────────────
if [[ "$SKIP_HEALTH" != "true" ]]; then
  log "\n${YELLOW}→ Running post-deployment health checks (60s grace period)...${NC}"
  sleep 10
  if ! bash "$SCRIPT_DIR/health-check.sh" --env "$ENV" --target "$TARGET"; then
    log "${RED}✗ Health checks failed after deployment${NC}"
    log_entry "HEALTH_FAILED"
    notify_webhook "health_failure" || true
    log "${YELLOW}→ Triggering rollback due to health check failure...${NC}"
    bash "$SCRIPT_DIR/rollback.sh" --env "$ENV" --target "$TARGET" --auto || true
    exit 1
  fi
  log "${GREEN}✓ All health checks passed${NC}"
fi

# ── Success ───────────────────────────────────────────────────
DEPLOY_END=$(date +%s)
DURATION=$(( DEPLOY_END - DEPLOY_START ))
log "\n${GREEN}${BOLD}╔══════════════════════════════════════════════════╗${NC}"
log "${GREEN}${BOLD}║         Deployment Successful!                   ║${NC}"
log "${GREEN}${BOLD}╚══════════════════════════════════════════════════╝${NC}"
log "  Duration:    ${DURATION}s"
log "  Version:     $VERSION"
log "  Environment: $ENV"
log "  Target:      $TARGET"
log_entry "SUCCESS"

notify_webhook() {
  local status="$1"
  [[ -z "${SLACK_WEBHOOK_URL:-}" ]] && return 0
  local color="good"; [[ "$status" != "success" ]] && color="danger"
  curl -s -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-type: application/json' \
    --data "{\"attachments\":[{\"color\":\"$color\",\"text\":\"RetailERP deploy *$status* | env=$ENV target=$TARGET version=$VERSION\"}]}" \
    &>/dev/null || true
}
notify_webhook "success" || true
