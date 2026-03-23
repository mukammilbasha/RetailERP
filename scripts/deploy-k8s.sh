#!/bin/bash
# RetailERP Kubernetes Deployment Script
set -e

REGISTRY="${REGISTRY:-retailerp}"
TAG="${TAG:-latest}"

echo "============================================"
echo "  RetailERP Kubernetes Deployment"
echo "============================================"

# Step 1: Build Docker images
echo ""
echo "[1/4] Building Docker images..."

SERVICES=("Auth" "Product" "Inventory" "Order" "Production" "Billing" "Reporting")

for SERVICE in "${SERVICES[@]}"; do
  SERVICE_LOWER=$(echo "$SERVICE" | tr '[:upper:]' '[:lower:]')
  echo "  Building ${SERVICE_LOWER}-api..."
  docker build -f docker/Dockerfile.api \
    --build-arg SERVICE_NAME="$SERVICE" \
    -t "${REGISTRY}/${SERVICE_LOWER}-api:${TAG}" .
done

echo "  Building gateway..."
docker build -f docker/Dockerfile.gateway \
  -t "${REGISTRY}/gateway:${TAG}" .

echo "  Building frontend..."
docker build -f docker/Dockerfile.frontend \
  -t "${REGISTRY}/frontend:${TAG}" .

echo "  All images built."

# Step 2: Push images (if registry is not local)
if [[ "$REGISTRY" != "retailerp" ]]; then
  echo ""
  echo "[2/4] Pushing images to ${REGISTRY}..."
  for SERVICE in "${SERVICES[@]}"; do
    SERVICE_LOWER=$(echo "$SERVICE" | tr '[:upper:]' '[:lower:]')
    docker push "${REGISTRY}/${SERVICE_LOWER}-api:${TAG}"
  done
  docker push "${REGISTRY}/gateway:${TAG}"
  docker push "${REGISTRY}/frontend:${TAG}"
else
  echo ""
  echo "[2/4] Skipping push (local registry)"
fi

# Step 3: Apply Kubernetes manifests
echo ""
echo "[3/4] Applying Kubernetes manifests..."

kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-secrets.yaml
kubectl apply -f k8s/02-configmap.yaml
kubectl apply -f k8s/03-infrastructure.yaml

echo "  Waiting for SQL Server to be ready..."
kubectl -n retailerp wait --for=condition=ready pod -l app=sqlserver --timeout=120s

kubectl apply -f k8s/04-microservices.yaml
kubectl apply -f k8s/05-gateway.yaml
kubectl apply -f k8s/06-frontend.yaml
kubectl apply -f k8s/07-observability.yaml
kubectl apply -f k8s/08-ingress.yaml

# Step 4: Verify
echo ""
echo "[4/4] Verifying deployment..."
sleep 10
kubectl -n retailerp get pods
kubectl -n retailerp get services

echo ""
echo "============================================"
echo "  Deployment Complete!"
echo "============================================"
echo ""
echo "  Add to /etc/hosts:"
echo "    127.0.0.1 retailerp.local"
echo ""
echo "  Access:"
echo "    Frontend:  http://retailerp.local"
echo "    API:       http://retailerp.local/api"
echo "    Grafana:   http://retailerp.local/grafana"
echo "============================================"
