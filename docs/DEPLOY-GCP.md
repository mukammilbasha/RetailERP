# GCP Deployment (GKE Autopilot)

Deploy RetailERP on Google Cloud using GKE Autopilot, Cloud SQL for SQL Server, Artifact Registry, and Secret Manager — provisioned via Terraform.

## Prerequisites

```bash
gcloud --version       # 455+
kubectl version        # 1.28+
terraform --version    # 1.6+
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

## One-Click Deploy

```bash
bash deployment/scripts/deploy.sh --env prod --target gcp
# or directly:
bash deployment/gcp/scripts/deploy-gcp.sh --env prod --project my-project-id
```

## Terraform Infrastructure

```bash
cd deployment/gcp/terraform

terraform init
terraform plan  -var="project_id=my-project-id" -var="environment=prod"
terraform apply -var="project_id=my-project-id" -var="environment=prod"
```

### What Terraform Creates

| Resource | Details |
|----------|---------|
| **GKE Autopilot** | Fully managed K8s, automatic node provisioning |
| **Artifact Registry** | Private container registry with cleanup policies (keep last 10) |
| **Cloud SQL** | SQL Server 2019 Enterprise, HA (prod), zonal (dev) |
| **Secret Manager** | JWT secret, DB password, Redis auth |
| **VPC + Cloud NAT** | Private cluster networking |
| **Service Accounts** | Workload Identity for each service (least privilege) |
| **Cloud Monitoring** | Alert policies for service availability |

## Build and Push Images

```bash
# Authenticate Docker to Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

# Build and push (example: auth-api)
IMAGE="us-central1-docker.pkg.dev/my-project/retailerp/auth-api"
TAG=$(git rev-parse --short HEAD)

docker build -f docker/Dockerfile.api \
  --build-arg SERVICE_NAME=auth-api \
  --build-arg SERVICE_DIR=Auth/RetailERP.Auth.API \
  -t ${IMAGE}:${TAG} .

docker push ${IMAGE}:${TAG}
```

## GKE Autopilot Benefits

With Autopilot, you don't manage nodes:
- **No node pool sizing** — GKE provisions nodes based on pod requests
- **Automatic scaling** — scales down to zero when idle
- **Bin-packing** — cost-optimized pod placement
- **Auto-upgrades** — always on latest stable K8s

```bash
# Connect kubectl to the GKE cluster
gcloud container clusters get-credentials \
  retailerp-prod --region us-central1 --project my-project-id

# Deploy all services
kubectl apply -f deployment/kubernetes/ -n retailerp-prod
```

## Workload Identity

Each service gets its own service account for Secret Manager access (no shared credentials):

```bash
# Example: annotate auth-api K8s service account
kubectl annotate serviceaccount auth-api \
  iam.gke.io/gcp-service-account=retailerp-auth@my-project.iam.gserviceaccount.com \
  -n retailerp-prod
```

## Secrets via Secret Manager

```bash
# Create secrets
echo -n "RetailERP-SuperSecret-JWT-Key" | \
  gcloud secrets create jwt-secret --data-file=- --project=my-project-id

echo -n "Server=...;Password=..." | \
  gcloud secrets create db-connection-string --data-file=- --project=my-project-id

# Grant access to service account
gcloud secrets add-iam-policy-binding jwt-secret \
  --member="serviceAccount:retailerp-auth@my-project.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Cloud SQL Connection

Services connect via Cloud SQL Auth Proxy (sidecar in each pod):

```yaml
# In K8s deployment spec — handled automatically by the manifests:
- name: cloud-sql-proxy
  image: gcr.io/cloud-sql-connectors/cloud-sql-proxy:2
  args:
    - "--structured-logs"
    - "my-project:us-central1:retailerp-prod"
```

## Rollback

```bash
# Kubernetes rollout undo
kubectl rollout undo deployment/auth-api -n retailerp-prod

# Script-based
bash deployment/scripts/rollback.sh --env prod --target gcp --version v1.2.1
```

## Cloud Monitoring Alerts

Terraform creates alert policies for:
- Service availability (uptime checks on each `/health` endpoint)
- High error rate (> 1% over 5 min)
- High CPU / memory (> 80%)

Notifications route to PagerDuty (critical) and Slack (warnings).

## Troubleshooting

| Issue | Command |
|-------|---------|
| Pod pending in Autopilot | `kubectl describe pod <pod>` — check resource requests |
| Secret access denied | Verify Workload Identity binding and Secret Manager IAM |
| Cloud SQL connection fails | Check Cloud SQL Auth Proxy sidecar logs |
| Image pull error | `gcloud auth configure-docker` on the runner |
| High Autopilot cost | Review pod resource requests — Autopilot charges by requests |
