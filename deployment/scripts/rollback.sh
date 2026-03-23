#!/bin/bash
# ============================================================
# RetailERP — Rollback Script
# Usage: ./rollback.sh [--env ENV] [--target TARGET] [--version VERSION] [--auto]
# ============================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$ROOT_DIR")"
LOG_FILE="${PROJECT_ROOT}/deployment/logs/deployments.log"

ENV=""
TARGET=""
ROLLBACK_VERSION=""
AUTO=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --env)     ENV="$2"; shift 2 ;;
    --target)  TARGET="$2"; shift 2 ;;
    --version) ROLLBACK_VERSION="$2"; shift 2 ;;
    --auto)    AUTO=true; shift ;;
    *) shift ;;
  esac
done

log() { echo -e "$1" | tee -a "$LOG_FILE"; }

# ── Interactive selection if needed ──────────────────────────
if [[ -z "$ENV" ]]; then
  echo -e "Select environment: 1=dev 2=qa 3=uat 4=prod"
  read -rp "Choice: " c
  case $c in 1) ENV=dev;; 2) ENV=qa;; 3) ENV=uat;; 4) ENV=prod;; *) exit 1;; esac
fi

if [[ -z "$TARGET" ]]; then
  echo -e "Select target: 1=docker 2=iis 3=aws 4=azure 5=gcp"
  read -rp "Choice: " c
  case $c in 1) TARGET=docker;; 2) TARGET=iis;; 3) TARGET=aws;; 4) TARGET=azure;; 5) TARGET=gcp;; *) exit 1;; esac
fi

log "\n${BOLD}${RED}╔══════════════════════════════════════╗${NC}"
log "${BOLD}${RED}║     RetailERP Rollback Initiated     ║${NC}"
log "${BOLD}${RED}╚══════════════════════════════════════╝${NC}"
log "  Environment: ${CYAN}$ENV${NC}"
log "  Target:      ${CYAN}$TARGET${NC}"

SERVICES=(auth-api product-api inventory-api order-api production-api billing-api reporting-api gateway frontend)

# ── Docker rollback ───────────────────────────────────────────
docker_rollback() {
  cd "$PROJECT_ROOT"
  log "\n${YELLOW}→ Fetching recent Docker image tags...${NC}"

  # List last 5 image tags for gateway (representative service)
  REGISTRY="${REGISTRY:-ghcr.io/retailerp}"
  log "Recent gateway images:"
  docker images "${REGISTRY}/gateway" --format "{{.Tag}}\t{{.CreatedAt}}" 2>/dev/null | head -5 || \
    log "  (no cached images found — checking docker-compose history)"

  if [[ -z "$ROLLBACK_VERSION" ]] && [[ "$AUTO" != "true" ]]; then
    read -rp "Enter version to rollback to (e.g. abc1234): " ROLLBACK_VERSION
  fi

  if [[ -z "$ROLLBACK_VERSION" ]]; then
    log "${YELLOW}→ Auto-rollback: using 'previous' restart policy${NC}"
    # Rolling restart to previous known-good state
    docker compose -f "$PROJECT_ROOT/docker-compose.yml" restart
  else
    log "${YELLOW}→ Rolling back to version: $ROLLBACK_VERSION${NC}"
    export VERSION="$ROLLBACK_VERSION"
    docker compose -f "$PROJECT_ROOT/docker-compose.yml" up -d --no-build
  fi
  log "${GREEN}✓ Docker rollback complete${NC}"
}

# ── Kubernetes rollback ───────────────────────────────────────
k8s_rollback() {
  NAMESPACE="retailerp-${ENV}"
  log "\n${YELLOW}→ Kubernetes rollback in namespace: $NAMESPACE${NC}"

  if [[ -n "$ROLLBACK_VERSION" ]]; then
    log "Rolling back to revision $ROLLBACK_VERSION..."
    for svc in "${SERVICES[@]}"; do
      kubectl rollout undo "deployment/$svc" -n "$NAMESPACE" \
        --to-revision="$ROLLBACK_VERSION" 2>/dev/null && \
        log "${GREEN}✓ Rolled back $svc${NC}" || \
        log "${YELLOW}! $svc not found, skipping${NC}"
    done
  else
    log "Rolling back all services to previous revision..."
    for svc in "${SERVICES[@]}"; do
      kubectl rollout undo "deployment/$svc" -n "$NAMESPACE" 2>/dev/null && \
        log "${GREEN}✓ Rolled back $svc${NC}" || \
        log "${YELLOW}! $svc not found, skipping${NC}"
    done
  fi

  log "\n${YELLOW}→ Waiting for rollback to complete...${NC}"
  for svc in "${SERVICES[@]}"; do
    kubectl rollout status "deployment/$svc" -n "$NAMESPACE" --timeout=120s 2>/dev/null || true
  done
  log "${GREEN}✓ Kubernetes rollback complete${NC}"
}

# ── AWS rollback ──────────────────────────────────────────────
aws_rollback() {
  CLUSTER="retailerp-${ENV}"
  log "\n${YELLOW}→ AWS ECS rollback in cluster: $CLUSTER${NC}"

  for svc in "${SERVICES[@]}"; do
    TASK_DEF=$(aws ecs describe-services \
      --cluster "$CLUSTER" --services "$svc" \
      --query 'services[0].taskDefinition' --output text 2>/dev/null || echo "")

    if [[ -z "$TASK_DEF" ]]; then
      log "${YELLOW}! Service $svc not found in ECS, skipping${NC}"
      continue
    fi

    # Get previous task definition revision
    FAMILY=$(echo "$TASK_DEF" | cut -d: -f1 | cut -d/ -f2)
    CURRENT_REV=$(echo "$TASK_DEF" | cut -d: -f2)
    PREV_REV=$(( CURRENT_REV - 1 ))
    PREV_TASK_DEF="${FAMILY}:${PREV_REV}"

    log "Rolling back $svc: $TASK_DEF → $PREV_TASK_DEF"
    aws ecs update-service \
      --cluster "$CLUSTER" \
      --service "$svc" \
      --task-definition "$PREV_TASK_DEF" \
      --force-new-deployment \
      --output text --query 'service.serviceName' && \
      log "${GREEN}✓ ECS rollback triggered for $svc${NC}" || \
      log "${RED}✗ Failed to rollback $svc${NC}"
  done
  log "${GREEN}✓ AWS ECS rollback initiated (deployment in progress)${NC}"
}

# ── Azure rollback ────────────────────────────────────────────
azure_rollback() {
  RESOURCE_GROUP="rg-retailerp-${ENV}"
  AKS_CLUSTER="aks-retailerp-${ENV}"
  log "\n${YELLOW}→ Azure AKS rollback...${NC}"
  az aks get-credentials --resource-group "$RESOURCE_GROUP" --name "$AKS_CLUSTER" --overwrite-existing 2>/dev/null
  k8s_rollback
}

# ── GCP rollback ──────────────────────────────────────────────
gcp_rollback() {
  GCP_PROJECT="${GCP_PROJECT:-retailerp-${ENV}}"
  GCP_CLUSTER="retailerp-${ENV}"
  GCP_REGION="${GCP_REGION:-us-central1}"
  log "\n${YELLOW}→ GCP GKE rollback...${NC}"
  gcloud container clusters get-credentials "$GCP_CLUSTER" \
    --region "$GCP_REGION" --project "$GCP_PROJECT" 2>/dev/null
  k8s_rollback
}

# ── IIS rollback ──────────────────────────────────────────────
iis_rollback() {
  log "\n${YELLOW}→ IIS rollback via PowerShell...${NC}"
  powershell.exe -ExecutionPolicy Bypass -File \
    "$ROOT_DIR/iis/rollback-iis.ps1" \
    -Environment "$ENV" \
    -Version "$ROLLBACK_VERSION"
}

# ── Confirm (non-auto) ────────────────────────────────────────
if [[ "$AUTO" != "true" ]]; then
  echo -e "\n${RED}${BOLD}⚠  This will rollback RetailERP $ENV on $TARGET${NC}"
  read -rp "Confirm rollback? (yes/no): " confirm
  [[ "$confirm" == "yes" ]] || { log "Rollback aborted."; exit 0; }
fi

# ── Execute rollback ──────────────────────────────────────────
case $TARGET in
  docker)  docker_rollback ;;
  iis)     iis_rollback ;;
  aws)     aws_rollback ;;
  azure)   azure_rollback ;;
  gcp)     gcp_rollback ;;
esac

# ── Post-rollback health check ────────────────────────────────
log "\n${YELLOW}→ Verifying rollback health...${NC}"
sleep 15
if bash "$SCRIPT_DIR/health-check.sh" --env "$ENV" --target "$TARGET"; then
  log "${GREEN}✓ Rollback successful — all services healthy${NC}"
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] ROLLBACK_SUCCESS ENV=$ENV TARGET=$TARGET" >> "$LOG_FILE"
else
  log "${RED}✗ Services still unhealthy after rollback — manual intervention required${NC}"
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] ROLLBACK_FAILED ENV=$ENV TARGET=$TARGET" >> "$LOG_FILE"
  exit 1
fi

# ── Slack notification ────────────────────────────────────────
if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
  curl -s -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-type: application/json' \
    --data "{\"attachments\":[{\"color\":\"warning\",\"text\":\"RetailERP *ROLLBACK* completed | env=$ENV target=$TARGET\"}]}" \
    &>/dev/null || true
fi
