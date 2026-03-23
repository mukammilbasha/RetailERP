# AWS Deployment (ECS Fargate)

Deploy RetailERP on AWS using ECS Fargate, RDS SQL Server, ElastiCache Redis, and an Application Load Balancer — all provisioned via Terraform.

## Prerequisites

```bash
aws --version        # AWS CLI v2
terraform --version  # 1.6+
docker --version     # for building/pushing images
aws configure        # or set AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
```

## One-Click Deploy

```bash
bash deployment/scripts/deploy.sh --env prod --target aws
# or directly:
bash deployment/aws/scripts/deploy-aws.sh --env prod --region us-east-1
```

## Terraform Infrastructure

```bash
cd deployment/aws/terraform

# First time only: initialize providers and backend
terraform init

# Preview changes
terraform plan -var="environment=prod" -var="aws_region=us-east-1"

# Apply
terraform apply -var="environment=prod" -var="aws_region=us-east-1"
```

### What Terraform Creates

| Resource | Details |
|----------|---------|
| **VPC** | 3 AZs, public + private subnets, NAT Gateway |
| **ECR** | 9 private repos (one per service + frontend) |
| **RDS SQL Server** | Multi-AZ for prod, Single-AZ for dev/QA |
| **ElastiCache Redis** | Cluster mode, automatic failover (prod) |
| **ECS Fargate Cluster** | Serverless container runtime |
| **ALB** | HTTPS listener, path-based routing, health checks |
| **IAM Roles** | Task roles with least-privilege Secrets Manager access |
| **CloudWatch** | Log groups for each service (30-day retention) |
| **Secrets Manager** | DB password, JWT secret, Redis auth |
| **S3 Backend** | Terraform state storage |

## Build and Push Images

```bash
# Authenticate Docker to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.us-east-1.amazonaws.com

# Build and push all services
IMAGE_TAG=$(git rev-parse --short HEAD)

docker build -f docker/Dockerfile.api \
  --build-arg SERVICE_NAME=auth-api \
  --build-arg SERVICE_DIR=Auth/RetailERP.Auth.API \
  -t 123456789.dkr.ecr.us-east-1.amazonaws.com/retailerp-auth:$IMAGE_TAG .

docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/retailerp-auth:$IMAGE_TAG
# repeat for product, inventory, order, billing, gateway, reporting, frontend
```

## ECS Service Configuration

Each service runs as an ECS Fargate service:

| Setting | Dev | Prod |
|---------|-----|------|
| CPU | 256 | 512–1024 |
| Memory | 512 MB | 1–2 GB |
| Min tasks | 1 | 2 |
| Max tasks (auto-scale) | 3 | 10 |
| Scale trigger | CPU > 70% | CPU > 70% |

## Updating a Deployment

```bash
# Force new deployment with latest image (ECS rolls out gradually)
aws ecs update-service \
  --cluster retailerp-prod \
  --service retailerp-auth \
  --force-new-deployment \
  --region us-east-1
```

## Rollback

```bash
# Script-assisted rollback (picks previous task definition revision)
bash deployment/scripts/rollback.sh --env prod --target aws --version v1.2.1

# Manual rollback to specific task definition revision
aws ecs update-service \
  --cluster retailerp-prod \
  --service retailerp-auth \
  --task-definition retailerp-auth:42 \
  --region us-east-1
```

## Terraform Outputs

After `terraform apply`, key outputs:

```
alb_dns_name     = "retailerp-prod-alb-xxxx.us-east-1.elb.amazonaws.com"
rds_endpoint     = "retailerp-prod.xxxx.us-east-1.rds.amazonaws.com"
ecr_registry_url = "123456789.dkr.ecr.us-east-1.amazonaws.com"
```

## Costs (approximate)

| Resource | Monthly (prod) |
|----------|---------------|
| ECS Fargate (8 services × 2 tasks) | ~$120 |
| RDS SQL Server Multi-AZ | ~$200 |
| ElastiCache Redis | ~$50 |
| ALB | ~$20 |
| NAT Gateway | ~$35 |
| **Total** | **~$425** |

## Troubleshooting

| Issue | Command |
|-------|---------|
| View ECS task logs | `aws logs tail /ecs/retailerp-auth --follow` |
| Task failing to start | `aws ecs describe-tasks --cluster retailerp-prod --tasks <task-arn>` |
| Check ALB target health | AWS Console → EC2 → Target Groups |
| RDS connection refused | Check security group allows port 1433 from ECS task SG |
