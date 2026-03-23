# CI/CD Pipelines

RetailERP ships with two production-grade CI/CD pipelines: **GitHub Actions** (primary) and **Azure DevOps** (enterprise).

## GitHub Actions

### Pipeline: `deployment/ci-cd/github-actions/deploy.yml`

Triggers:
- Push to `main` → deploys to **Dev** then **QA** automatically
- `v*.*.*` tag → runs full pipeline through to **Production**
- Manual `workflow_dispatch` with target/environment selection

#### Stages

```
Push to main
    │
    ▼
┌──────────────────────────────────────────┐
│  Build (parallel, ~4 min total)          │
│  auth · product · inventory · order      │
│  billing · gateway · frontend            │
│  + Trivy security scan                   │
└──────────────┬───────────────────────────┘
               │
        ┌──────▼──────┐
        │  Deploy Dev  │ (auto)
        └──────┬───────┘
               │
        ┌──────▼──────┐
        │  Deploy QA   │ (auto, after Dev health)
        └──────┬───────┘
               │
        ┌──────▼────────────┐
        │  Deploy UAT       │ (manual: 1 reviewer, 24h window)
        └──────┬────────────┘
               │
        ┌──────▼────────────────────┐
        │  Deploy Prod              │ (manual: 2 reviewers, 48h window)
        │  + Auto-rollback on fail  │
        └───────────────────────────┘
```

#### Required Secrets (GitHub repo settings)

```
AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
AZURE_CREDENTIALS                # JSON from `az ad sp create-for-rbac`
GCP_SA_KEY                       # JSON service account key
DEV_TEST_PASSWORD                # smoke test login
PROD_TEST_PASSWORD               # smoke test login
SLACK_WEBHOOK_URL                # deploy notifications (optional)
```

### PR Check Pipeline: `deployment/ci-cd/github-actions/pr-check.yml`

Runs on every pull request:

| Job | What It Does |
|-----|-------------|
| `dotnet-build-test` | `dotnet build` + `dotnet test` all projects |
| `frontend-check` | `npm run lint` + `next build` |
| `docker-build` | Builds all 7 service images (no push) |
| `security-scan` | CodeQL SAST on C# + TypeScript |
| `dependency-audit` | `npm audit` + `dotnet list package --vulnerable` |
| `pr-summary` | Posts check results as PR comment |

## Azure DevOps

### Pipeline: `deployment/azure/pipelines/azure-pipelines.yml`

Identical promotion flow to GitHub Actions, using native Azure DevOps tasks:

```yaml
stages:
  - Build          # Parallel matrix: 7 services + frontend + tests
  - DeployDev      # AKS rolling update
  - DeployQA       # AKS rolling update
  - DeployUAT      # ManualValidation task (24h timeout)
  - DeployProd     # ManualValidation task (48h + required reviewers)
```

UAT/Prod gates use `ManualValidation@1` — approvers get email notifications and must log in to Azure DevOps to approve/reject.

## Environment Promotion Rules

| Rule | Detail |
|------|--------|
| Dev → QA | Automatic after all Dev health checks pass |
| QA → UAT | Requires explicit pipeline trigger (release branch) |
| UAT → Prod | 1 required reviewer, 24-hour review window |
| Prod | 2 required reviewers, 48-hour window, `v*.*.*` tag required |
| Auto-rollback | Triggered if Prod smoke tests fail within 5 minutes of deploy |

## Smoke Tests in CI

Every deployment stage runs the smoke test suite:

```bash
bash deployment/tests/smoke/smoke-tests.sh \
  --env ${{ env.ENVIRONMENT }} \
  --base-url ${{ env.GATEWAY_URL }} \
  --report-dir deployment/tests/reports/
```

Reports are saved as pipeline artifacts for traceability.

## Adding a New Service to the Pipeline

1. Add build job to the `build` matrix in `deploy.yml`
2. Add the service to the health check in `health-check.sh`
3. Add smoke test entry in `smoke-tests.sh`
4. Add K8s Deployment to `kubernetes/deployments/all-services.yaml`
