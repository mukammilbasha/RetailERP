#!/bin/bash
# ============================================================
# RetailERP — Deploy Frontend Static Assets to CDN
# Usage: ./deploy-frontend-cdn.sh --target aws|azure|gcp --env prod
# ============================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/src/frontend"

TARGET="aws"; ENV="prod"
while [[ $# -gt 0 ]]; do
  case $1 in --target) TARGET="$2"; shift 2;; --env) ENV="$2"; shift 2;; *) shift;; esac
done

ENV_FILE="$ROOT_DIR/deployment/docker/frontend/.env.$ENV"
[[ -f "$ENV_FILE" ]] && { set -a; source "$ENV_FILE"; set +a; }

echo -e "\n${YELLOW}=== CDN Deploy: $ENV → $TARGET ===${NC}"

# Build Next.js
cd "$FRONTEND_DIR"
npm ci --silent
NEXT_TELEMETRY_DISABLED=1 npm run build
echo -e "${GREEN}✓ Next.js build complete${NC}"

case $TARGET in
  aws)
    BUCKET="retailerp-frontend-${ENV}"
    CF_ID="${CLOUDFRONT_DISTRIBUTION_ID:?Set CLOUDFRONT_DISTRIBUTION_ID}"
    aws s3 sync .next/static "s3://${BUCKET}/_next/static" \
      --cache-control "public,max-age=31536000,immutable" --delete --quiet
    aws s3 sync public "s3://${BUCKET}/public" \
      --cache-control "public,max-age=86400" --delete --quiet
    INV_ID=$(aws cloudfront create-invalidation --distribution-id "$CF_ID" \
      --paths "/*" --query 'Invalidation.Id' --output text)
    echo -e "${GREEN}✓ AWS S3 synced + CloudFront invalidation: $INV_ID${NC}"
    ;;
  azure)
    STORAGE="retailerpstatic${ENV}"
    az storage blob upload-batch --source .next/static \
      --destination "\$web/_next/static" --account-name "$STORAGE" \
      --content-cache-control "public,max-age=31536000,immutable" --overwrite true
    az cdn endpoint purge --resource-group "rg-retailerp-${ENV}" \
      --profile-name "retailerp-cdn-${ENV}" --name "retailerp-${ENV}" \
      --content-paths "/*" --no-wait
    echo -e "${GREEN}✓ Azure Blob synced + CDN purge queued${NC}"
    ;;
  gcp)
    BUCKET="gs://retailerp-frontend-${ENV}"
    gsutil -m rsync -r -d .next/static "${BUCKET}/_next/static"
    gsutil -m setmeta -h "Cache-Control:public,max-age=31536000,immutable" \
      "${BUCKET}/_next/static/**" 2>/dev/null || true
    gcloud compute url-maps invalidate-cdn-cache "retailerp-url-map-${ENV}" \
      --path "/*" --async
    echo -e "${GREEN}✓ GCS synced + Cloud CDN invalidated${NC}"
    ;;
  *) echo -e "${RED}Unknown target: $TARGET${NC}"; exit 1 ;;
esac

echo -e "\n${GREEN}=== CDN deployment complete ===${NC}"
