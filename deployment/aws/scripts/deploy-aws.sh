#!/bin/bash
# ============================================================
# RetailERP — AWS ECS Fargate Deployment Script
# Usage: ./deploy-aws.sh --env prod --version v1.2.3
# ============================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$(dirname "$SCRIPT_DIR")/terraform"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../" && pwd)"

ENV="dev"; VERSION="latest"
while [[ $# -gt 0 ]]; do
  case $1 in
    --env)     ENV="$2"; shift 2 ;;
    --version) VERSION="$2"; shift 2 ;;
    *) shift ;;
  esac
done

SERVICES=(auth product inventory order production billing reporting gateway frontend)
AWS_REGION="${AWS_REGION:-us-east-1}"
CLUSTER="retailerp-${ENV}"

log() { echo -e "$1"; }

log "\n${CYAN}=== RetailERP AWS Deploy: $ENV / $VERSION ===${NC}"

# ── 1. Authenticate to ECR ────────────────────────────────────
log "\n${YELLOW}→ Authenticating to ECR...${NC}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "$REGISTRY"
log "${GREEN}✓ ECR authenticated: $REGISTRY${NC}"

# ── 2. Build & push images ────────────────────────────────────
log "\n${YELLOW}→ Building and pushing Docker images...${NC}"
for svc in "${SERVICES[@]}"; do
  REPO="${REGISTRY}/retailerp/${svc}"
  case $svc in
    frontend) DOCKERFILE="docker/Dockerfile.frontend"; BUILD_ARGS="" ;;
    gateway)  DOCKERFILE="docker/Dockerfile.gateway"; BUILD_ARGS="" ;;
    *)        DOCKERFILE="docker/Dockerfile.api"
              BUILD_ARGS="--build-arg SERVICE_NAME=$(echo $svc | awk '{print toupper(substr($0,1,1)) substr($0,2)}') --build-arg SERVICE_DIR=${svc}" ;;
  esac

  log "  Building ${svc}..."
  docker build -f "$PROJECT_ROOT/$DOCKERFILE" $BUILD_ARGS \
    -t "${REPO}:${VERSION}" -t "${REPO}:latest-${ENV}" \
    "$PROJECT_ROOT"
  docker push "${REPO}:${VERSION}"
  docker push "${REPO}:latest-${ENV}"
  log "${GREEN}  ✓ ${svc}: ${REPO}:${VERSION}${NC}"
done

# ── 3. Terraform apply ────────────────────────────────────────
log "\n${YELLOW}→ Running Terraform...${NC}"
cd "$TERRAFORM_DIR"
terraform init -reconfigure \
  -backend-config="key=retailerp/${ENV}/terraform.tfstate"
terraform apply \
  -var="environment=${ENV}" \
  -var="image_tag=${VERSION}" \
  -var="db_password=${DB_PASSWORD:?DB_PASSWORD env var required}" \
  -var="jwt_secret=${JWT_SECRET:?JWT_SECRET env var required}" \
  -auto-approve
log "${GREEN}✓ Terraform apply complete${NC}"

# ── 4. Run DB migrations ──────────────────────────────────────
log "\n${YELLOW}→ Running database migrations via ECS run-task...${NC}"
TASK_DEF="${CLUSTER}-db-migrator"
RDS_ENDPOINT=$(terraform output -raw rds_endpoint)

# Run the db-migrator as a one-off ECS task
TASK_ARN=$(aws ecs run-task \
  --cluster "$CLUSTER" \
  --task-definition "$TASK_DEF" \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$(terraform output -json vpc_id | jq -r .)],securityGroups=[],assignPublicIp=DISABLED}" \
  --overrides "{\"containerOverrides\":[{\"name\":\"db-migrator\",\"environment\":[{\"name\":\"ConnectionStrings__DefaultConnection\",\"value\":\"Server=${RDS_ENDPOINT};...\"}]}]}" \
  --query 'tasks[0].taskArn' --output text 2>/dev/null || echo "")

if [[ -n "$TASK_ARN" ]]; then
  log "  Waiting for migration task to complete..."
  aws ecs wait tasks-stopped --cluster "$CLUSTER" --tasks "$TASK_ARN"
  EXIT_CODE=$(aws ecs describe-tasks --cluster "$CLUSTER" --tasks "$TASK_ARN" \
    --query 'tasks[0].containers[0].exitCode' --output text)
  if [[ "$EXIT_CODE" != "0" ]]; then
    log "${RED}✗ Migration task failed (exit code $EXIT_CODE)${NC}"
    exit 1
  fi
  log "${GREEN}✓ Database migrations complete${NC}"
fi

# ── 5. Wait for ECS services to stabilize ────────────────────
log "\n${YELLOW}→ Waiting for ECS services to stabilize...${NC}"
aws ecs wait services-stable \
  --cluster "$CLUSTER" \
  --services "${SERVICES[@]/#/retailerp-}"
log "${GREEN}✓ All ECS services stable${NC}"

# ── 6. Health checks ─────────────────────────────────────────
log "\n${YELLOW}→ Running health checks...${NC}"
ALB_DNS=$(terraform output -raw alb_dns_name)
bash "$PROJECT_ROOT/deployment/scripts/health-check.sh" \
  --env "$ENV" --target aws \
  --base-url "http://${ALB_DNS}"

log "\n${GREEN}=== AWS Deployment Complete: $ENV / $VERSION ===${NC}"
log "  ALB: http://${ALB_DNS}"
