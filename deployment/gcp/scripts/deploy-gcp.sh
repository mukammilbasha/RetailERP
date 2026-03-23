#!/bin/bash
# ============================================================
# RetailERP — GCP GKE Deployment Script
# Usage: ./deploy-gcp.sh --env prod --version v1.2.3
# ============================================================
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../" && pwd)"
TERRAFORM_DIR="$(dirname "$SCRIPT_DIR")/terraform"

ENV="dev"; VERSION="latest"
while [[ $# -gt 0 ]]; do
  case $1 in --env) ENV="$2"; shift 2;; --version) VERSION="$2"; shift 2;; *) shift;; esac
done

GCP_PROJECT="${GCP_PROJECT:?Set GCP_PROJECT env var}"
GCP_REGION="${GCP_REGION:-us-central1}"
AR_REGISTRY="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT}/retailerp"
CLUSTER="retailerp-${ENV}"
NAMESPACE="retailerp-${ENV}"

echo -e "\n${CYAN}=== RetailERP GCP Deploy: $ENV / $VERSION ===${NC}"

# ── Authenticate ──────────────────────────────────────────────
echo -e "\n${YELLOW}→ Authenticating...${NC}"
gcloud auth configure-docker "${GCP_REGION}-docker.pkg.dev" --quiet
echo -e "${GREEN}✓ Artifact Registry authenticated${NC}"

# ── Build & push images ───────────────────────────────────────
echo -e "\n${YELLOW}→ Building and pushing images...${NC}"
SERVICES=(auth product inventory order production billing reporting gateway frontend)
for svc in "${SERVICES[@]}"; do
  IMAGE="${AR_REGISTRY}/${svc}:${VERSION}"
  case $svc in
    frontend) DOCKERFILE="docker/Dockerfile.frontend"; ARGS="" ;;
    gateway)  DOCKERFILE="docker/Dockerfile.gateway"; ARGS="" ;;
    *) DOCKERFILE="docker/Dockerfile.api"
       SVC_TITLE="$(echo "$svc" | awk '{print toupper(substr($0,1,1)) substr($0,2)}')"
       ARGS="--build-arg SERVICE_NAME=${SVC_TITLE} --build-arg SERVICE_DIR=${svc}" ;;
  esac
  docker build -f "$PROJECT_ROOT/$DOCKERFILE" $ARGS -t "$IMAGE" "$PROJECT_ROOT"
  docker push "$IMAGE"
  echo -e "${GREEN}  ✓ ${svc}: $IMAGE${NC}"
done

# ── Terraform ─────────────────────────────────────────────────
echo -e "\n${YELLOW}→ Terraform apply...${NC}"
cd "$TERRAFORM_DIR"
terraform init -reconfigure \
  -backend-config="prefix=retailerp/terraform/state/${ENV}"
terraform apply \
  -var="project_id=${GCP_PROJECT}" \
  -var="environment=${ENV}" \
  -var="image_tag=${VERSION}" \
  -var="db_password=${DB_PASSWORD:?}" \
  -auto-approve
echo -e "${GREEN}✓ Infrastructure ready${NC}"

# ── Configure kubectl ─────────────────────────────────────────
echo -e "\n${YELLOW}→ Configuring kubectl...${NC}"
gcloud container clusters get-credentials "$CLUSTER" \
  --region "$GCP_REGION" --project "$GCP_PROJECT"

# ── Apply manifests ───────────────────────────────────────────
echo -e "\n${YELLOW}→ Applying Kubernetes manifests...${NC}"
export IMAGE_REGISTRY="$AR_REGISTRY"
export VERSION
envsubst < "$PROJECT_ROOT/deployment/kubernetes/namespace.yaml" | kubectl apply -f -
envsubst < "$PROJECT_ROOT/deployment/kubernetes/configmap.yaml" | kubectl apply -f - -n "$NAMESPACE"
envsubst < "$PROJECT_ROOT/deployment/kubernetes/deployments/all-services.yaml" | \
  sed "s/namespace: retailerp-prod/namespace: ${NAMESPACE}/g" | kubectl apply -f -

# ── Wait for rollout ──────────────────────────────────────────
echo -e "\n${YELLOW}→ Waiting for rollout...${NC}"
for svc in gateway auth-api product-api inventory-api order-api billing-api frontend; do
  kubectl rollout status "deployment/$svc" -n "$NAMESPACE" --timeout=180s
done
echo -e "${GREEN}✓ All deployments rolled out${NC}"

# ── Health checks ─────────────────────────────────────────────
echo -e "\n${YELLOW}→ Health checks...${NC}"
bash "$PROJECT_ROOT/deployment/scripts/health-check.sh" --env "$ENV" --target gcp

echo -e "\n${GREEN}=== GCP Deployment Complete: $ENV / $VERSION ===${NC}"
