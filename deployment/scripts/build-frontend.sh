#!/bin/bash
# ============================================================
# RetailERP — Frontend Docker Build Script
# Usage: ./build-frontend.sh [--env dev|qa|uat|prod] [--push] [--registry URL] [--version TAG]
# ============================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

ENV="dev"; PUSH=false
REGISTRY="${REGISTRY:-ghcr.io/retailerp}"
VERSION=$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo "latest")

while [[ $# -gt 0 ]]; do
  case $1 in
    --env)      ENV="$2"; shift 2 ;;
    --push)     PUSH=true; shift ;;
    --registry) REGISTRY="$2"; shift 2 ;;
    --version)  VERSION="$2"; shift 2 ;;
    *) shift ;;
  esac
done

case $ENV in dev|qa|uat|prod) ;; *) echo -e "${RED}Invalid env: $ENV${NC}"; exit 1 ;; esac

ENV_FILE="$ROOT_DIR/deployment/docker/frontend/.env.$ENV"
[[ -f "$ENV_FILE" ]] || { echo -e "${RED}Not found: $ENV_FILE${NC}"; exit 1; }

# Load env vars as build args
set -a; source "$ENV_FILE"; set +a

IMAGE_NAME="${REGISTRY}/retailerp-frontend"
IMAGE_TAG="${IMAGE_NAME}:${VERSION}"
IMAGE_ENV_TAG="${IMAGE_NAME}:latest-${ENV}"

echo -e "\n${CYAN}=== RetailERP Frontend Build ===${NC}"
echo -e "  Env:      $ENV"
echo -e "  Version:  $VERSION"
echo -e "  Registry: $REGISTRY"

echo -e "\n${YELLOW}→ Building Docker image...${NC}"
docker build \
  --file "$ROOT_DIR/deployment/docker/frontend/Frontend.Dockerfile" \
  --build-arg "NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}" \
  --build-arg "NEXT_PUBLIC_AUTH_API_URL=${NEXT_PUBLIC_AUTH_API_URL:-$NEXT_PUBLIC_API_URL}" \
  --build-arg "NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}" \
  --build-arg "NEXT_PUBLIC_ENV=${ENV}" \
  --build-arg "NEXT_PUBLIC_APP_VERSION=${VERSION}" \
  --tag "$IMAGE_TAG" \
  --tag "$IMAGE_ENV_TAG" \
  --cache-from "type=registry,ref=${IMAGE_ENV_TAG}" \
  "$ROOT_DIR"

SIZE=$(docker image inspect "$IMAGE_TAG" --format='{{.Size}}' 2>/dev/null | numfmt --to=iec 2>/dev/null || echo "unknown")
echo -e "${GREEN}✓ Built: $IMAGE_TAG (size: $SIZE)${NC}"

# Trivy scan
if command -v trivy &>/dev/null; then
  echo -e "\n${YELLOW}→ Security scan...${NC}"
  trivy image --severity CRITICAL --exit-code 1 "$IMAGE_TAG" 2>/dev/null && \
    echo -e "${GREEN}✓ No CRITICAL vulnerabilities${NC}" || \
    { echo -e "${RED}✗ CRITICAL vulnerabilities found${NC}"; exit 1; }
fi

if [[ "$PUSH" == "true" ]]; then
  echo -e "\n${YELLOW}→ Pushing to registry...${NC}"
  docker push "$IMAGE_TAG"
  docker push "$IMAGE_ENV_TAG"
  echo -e "${GREEN}✓ Pushed: $IMAGE_TAG${NC}"
fi

echo -e "\n${GREEN}=== Frontend build complete ===${NC}"
