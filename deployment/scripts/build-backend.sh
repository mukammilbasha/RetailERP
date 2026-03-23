#!/bin/bash
# ============================================================
# RetailERP — Backend Docker Build Script (all APIs + Gateway)
# Usage: ./build-backend.sh [--env dev] [--push] [--registry URL] [--version TAG]
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

# Service definitions: name|dir|dockerfile
declare -a SERVICES=(
  "auth|auth|docker/Dockerfile.api"
  "product|product|docker/Dockerfile.api"
  "inventory|inventory|docker/Dockerfile.api"
  "order|order|docker/Dockerfile.api"
  "production|production|docker/Dockerfile.api"
  "billing|billing|docker/Dockerfile.api"
  "reporting|reporting|docker/Dockerfile.api"
  "gateway|gateway|docker/Dockerfile.gateway"
)

echo -e "\n${CYAN}=== RetailERP Backend Build ===${NC}"
echo -e "  Version:  $VERSION | Push: $PUSH | Registry: $REGISTRY\n"

FAILED=()
for svc_def in "${SERVICES[@]}"; do
  IFS='|' read -r svc_name svc_dir dockerfile <<< "$svc_def"
  IMAGE="${REGISTRY}/retailerp-${svc_name}:${VERSION}"

  echo -e "${YELLOW}Building: $svc_name${NC}"
  SVC_TITLE="$(echo "$svc_name" | awk '{print toupper(substr($0,1,1)) substr($0,2)}')"

  BUILD_ARGS=""
  [[ "$dockerfile" == "docker/Dockerfile.api" ]] && \
    BUILD_ARGS="--build-arg SERVICE_NAME=${SVC_TITLE} --build-arg SERVICE_DIR=${svc_dir}"

  if docker build \
    --file "$ROOT_DIR/$dockerfile" \
    $BUILD_ARGS \
    --tag "$IMAGE" \
    --tag "${REGISTRY}/retailerp-${svc_name}:latest-${ENV}" \
    --cache-from "type=registry,ref=${REGISTRY}/retailerp-${svc_name}:latest-${ENV}" \
    "$ROOT_DIR" 2>&1 | tail -3; then
    echo -e "${GREEN}  ✓ $svc_name: $IMAGE${NC}"
    [[ "$PUSH" == "true" ]] && docker push "$IMAGE"
  else
    echo -e "${RED}  ✗ $svc_name FAILED${NC}"
    FAILED+=("$svc_name")
  fi
done

if [[ "${#FAILED[@]}" -gt 0 ]]; then
  echo -e "\n${RED}Failed services: ${FAILED[*]}${NC}"
  exit 1
fi

echo -e "\n${GREEN}=== All backend services built successfully ===${NC}"
