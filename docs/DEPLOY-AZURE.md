# Azure Deployment (AKS)

Deploy RetailERP on Azure using AKS (Kubernetes), Azure SQL, Azure Container Registry, and Key Vault — provisioned via Bicep IaC with an Azure DevOps multi-stage pipeline.

## Prerequisites

```bash
az --version         # Azure CLI 2.55+
kubectl version      # 1.28+
az login             # or service principal
```

## One-Click Deploy

```bash
bash deployment/scripts/deploy.sh --env prod --target azure
```

Or trigger via Azure DevOps pipeline (auto-deploys Dev → QA, manual gates for UAT → Prod).

## Bicep Infrastructure

```bash
cd deployment/azure/bicep

# Deploy to prod resource group
az deployment group create \
  --resource-group rg-retailerp-prod \
  --template-file main.bicep \
  --parameters @parameters.prod.json \
  --parameters sqlAdminPassword="$(az keyvault secret show \
      --vault-name kv-retailerp-prod --name sql-admin-password --query value -o tsv)"
```

### What Bicep Creates

| Resource | SKU (prod) |
|----------|-----------|
| **AKS Cluster** | Standard_D4s_v5 nodes, system + user node pools, OIDC + Workload Identity |
| **Azure Container Registry** | Premium (geo-replication) |
| **Azure SQL Server** | Business Critical tier (prod), General Purpose (dev/QA) |
| **Key Vault** | RBAC mode, soft-delete enabled |
| **Log Analytics** | 30-day retention |
| **Application Insights** | Connected to all services |
| **Virtual Network** | AKS subnet, App Gateway subnet, SQL subnet |
| **Application Gateway Ingress Controller** | SSL termination, WAF |

## Azure DevOps Pipeline

`deployment/azure/pipelines/azure-pipelines.yml` defines 5 stages:

| Stage | Trigger | Gate |
|-------|---------|------|
| **Build** | Every push | — Parallel builds all 8 services + tests |
| **DeployDev** | Build succeeds | Auto |
| **DeployQA** | Dev succeeds | Auto |
| **DeployUAT** | QA succeeds | `ManualValidation` (24 h timeout) |
| **DeployProd** | UAT approved | `ManualValidation` (48 h, required reviewers) |

```yaml
# Trigger pipeline:
git push origin main          # → Dev + QA auto
git checkout -b release/1.2.0 # → UAT (requires approval)
git tag v1.2.0 && git push --tags # → Production (2 reviewers)
```

## Push Images to ACR

```bash
# Login to ACR
az acr login --name acrretailerpprod

# Build and push
az acr build \
  --registry acrretailerpprod \
  --image retailerp/auth-api:$(git rev-parse --short HEAD) \
  --build-arg SERVICE_NAME=auth-api \
  --build-arg SERVICE_DIR=Auth/RetailERP.Auth.API \
  --file docker/Dockerfile.api .
```

## Deploy to AKS

```bash
# Get AKS credentials
az aks get-credentials \
  --resource-group rg-retailerp-prod \
  --name aks-retailerp-prod

# Apply all K8s manifests
kubectl apply -f deployment/kubernetes/ -n retailerp-prod

# Rolling update with new image
kubectl set image deployment/auth-api \
  auth-api=acrretailerpprod.azurecr.io/retailerp/auth-api:v1.2.0 \
  -n retailerp-prod
```

## Key Vault Secrets

Secrets are injected via the Key Vault CSI Driver (no manual env var management):

```bash
# Set secrets
az keyvault secret set --vault-name kv-retailerp-prod \
  --name jwt-secret --value "$(openssl rand -base64 48)"

az keyvault secret set --vault-name kv-retailerp-prod \
  --name sql-connection-string \
  --value "Server=sql-retailerp-prod.database.windows.net;..."
```

## Rollback

```bash
# Kubernetes rollout undo
kubectl rollout undo deployment/auth-api -n retailerp-prod

# Or script-based
bash deployment/scripts/rollback.sh --env prod --target azure --version v1.2.1
```

## Troubleshooting

| Issue | Command |
|-------|---------|
| Pod not starting | `kubectl describe pod <pod> -n retailerp-prod` |
| Image pull error | `az acr check-health --name acrretailerpprod` |
| Key Vault access denied | Verify Workload Identity federated credential |
| AKS node pressure | `kubectl top nodes` — scale up node pool |
| SQL connection refused | Check AKS subnet → SQL subnet NSG rules |
