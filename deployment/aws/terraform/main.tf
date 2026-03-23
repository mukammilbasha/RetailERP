terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
  }
  backend "s3" {
    bucket         = "retailerp-terraform-state"
    key            = "retailerp/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "retailerp-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "RetailERP"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# ── Data ─────────────────────────────────────────────────────
data "aws_availability_zones" "available" { state = "available" }

# ── VPC ──────────────────────────────────────────────────────
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "retailerp-vpc-${var.environment}"
  cidr = var.vpc_cidr

  azs             = slice(data.aws_availability_zones.available.names, 0, 3)
  private_subnets = var.private_subnet_cidrs
  public_subnets  = var.public_subnet_cidrs

  enable_nat_gateway     = true
  single_nat_gateway     = var.environment != "prod"
  enable_dns_hostnames   = true
  enable_dns_support     = true
}

# ── ECR repositories ─────────────────────────────────────────
locals {
  services = ["auth", "product", "inventory", "order", "production", "billing", "reporting", "gateway", "frontend"]
}

resource "aws_ecr_repository" "services" {
  for_each             = toset(local.services)
  name                 = "retailerp/${each.value}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  lifecycle_policy = <<EOF
  {"rules":[{"rulePriority":1,"description":"Keep 20 images","selection":{"tagStatus":"any","countType":"imageCountMoreThan","countNumber":20},"action":{"type":"expire"}}]}
EOF
}

# ── Secrets Manager ───────────────────────────────────────────
resource "aws_secretsmanager_secret" "db_password" {
  name                    = "retailerp/${var.environment}/db-password"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = var.db_password
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "retailerp/${var.environment}/jwt-secret"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = var.jwt_secret
}

# ── RDS SQL Server ────────────────────────────────────────────
resource "aws_db_subnet_group" "main" {
  name       = "retailerp-db-${var.environment}"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_security_group" "rds" {
  name        = "retailerp-rds-${var.environment}"
  description = "SQL Server access"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 1433
    to_port         = 1433
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }
}

resource "aws_db_instance" "sqlserver" {
  identifier           = "retailerp-${var.environment}"
  engine               = "sqlserver-se"
  engine_version       = "15.00"
  instance_class       = var.db_instance_class
  license_model        = "license-included"
  username             = "retailerp_admin"
  password             = var.db_password
  multi_az             = var.environment == "prod"
  storage_type         = "gp3"
  allocated_storage    = var.environment == "prod" ? 100 : 20
  max_allocated_storage = var.environment == "prod" ? 500 : 50

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period = var.environment == "prod" ? 30 : 7
  deletion_protection     = var.environment == "prod"
  skip_final_snapshot     = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "retailerp-prod-final-snapshot" : null

  tags = { Name = "RetailERP SQL Server (${var.environment})" }
}

# ── ElastiCache Redis ─────────────────────────────────────────
resource "aws_elasticache_subnet_group" "main" {
  name       = "retailerp-redis-${var.environment}"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_security_group" "redis" {
  name   = "retailerp-redis-${var.environment}"
  vpc_id = module.vpc.vpc_id
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "retailerp-${var.environment}"
  description          = "RetailERP Redis cache"
  node_type            = var.environment == "prod" ? "cache.r6g.large" : "cache.t3.micro"
  num_cache_clusters   = var.environment == "prod" ? 2 : 1
  engine_version       = "7.0"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
}

# ── ECS Cluster ───────────────────────────────────────────────
resource "aws_ecs_cluster" "main" {
  name = "retailerp-${var.environment}"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]
  default_capacity_provider_strategy {
    capacity_provider = var.environment == "prod" ? "FARGATE" : "FARGATE_SPOT"
    weight            = 100
  }
}

# ── IAM roles ─────────────────────────────────────────────────
resource "aws_iam_role" "ecs_execution" {
  name = "retailerp-ecs-execution-${var.environment}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{Effect="Allow", Principal={Service="ecs-tasks.amazonaws.com"}, Action="sts:AssumeRole"}]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name = "secrets-access"
  role = aws_iam_role.ecs_execution.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = "arn:aws:secretsmanager:${var.aws_region}:*:secret:retailerp/${var.environment}/*"
    }]
  })
}

resource "aws_iam_role" "ecs_task" {
  name = "retailerp-ecs-task-${var.environment}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{Effect="Allow", Principal={Service="ecs-tasks.amazonaws.com"}, Action="sts:AssumeRole"}]
  })
}

# ── Security groups ───────────────────────────────────────────
resource "aws_security_group" "alb" {
  name   = "retailerp-alb-${var.environment}"
  vpc_id = module.vpc.vpc_id
  ingress { from_port=80,  to_port=80,  protocol="tcp", cidr_blocks=["0.0.0.0/0"] }
  ingress { from_port=443, to_port=443, protocol="tcp", cidr_blocks=["0.0.0.0/0"] }
  egress  { from_port=0,   to_port=0,   protocol="-1",  cidr_blocks=["0.0.0.0/0"] }
}

resource "aws_security_group" "ecs_tasks" {
  name   = "retailerp-ecs-${var.environment}"
  vpc_id = module.vpc.vpc_id
  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  egress { from_port=0, to_port=0, protocol="-1", cidr_blocks=["0.0.0.0/0"] }
}

# ── Application Load Balancer ─────────────────────────────────
resource "aws_lb" "main" {
  name               = "retailerp-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.vpc.public_subnets

  enable_deletion_protection = var.environment == "prod"
  enable_http2               = true
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# ── CloudWatch Log Groups ─────────────────────────────────────
resource "aws_cloudwatch_log_group" "services" {
  for_each          = toset(local.services)
  name              = "/ecs/retailerp/${var.environment}/${each.value}"
  retention_in_days = var.environment == "prod" ? 90 : 14
}

# ── ECS Service (example for gateway — repeat pattern for all) ─
resource "aws_ecs_task_definition" "gateway" {
  family                   = "retailerp-gateway-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.environment == "prod" ? 512 : 256
  memory                   = var.environment == "prod" ? 1024 : 512
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "gateway"
    image     = "${aws_ecr_repository.services["gateway"].repository_url}:${var.image_tag}"
    essential = true
    portMappings = [{containerPort=8080, protocol="tcp"}]
    environment = [
      {name="ASPNETCORE_ENVIRONMENT", value=var.environment},
      {name="ASPNETCORE_URLS", value="http://+:8080"}
    ]
    secrets = [
      {name="ConnectionStrings__DefaultConnection", valueFrom="${aws_secretsmanager_secret.db_password.arn}:connection_string::"},
      {name="Jwt__Secret", valueFrom=aws_secretsmanager_secret.jwt_secret.arn}
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = "/ecs/retailerp/${var.environment}/gateway"
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "ecs"
      }
    }
    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 30
    }
  }])
}

resource "aws_lb_target_group" "gateway" {
  name        = "retailerp-gateway-${var.environment}"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = module.vpc.vpc_id
  target_type = "ip"
  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
  }
}

resource "aws_ecs_service" "gateway" {
  name            = "retailerp-gateway-${var.environment}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.gateway.arn
  desired_count   = var.environment == "prod" ? 2 : 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.gateway.arn
    container_name   = "gateway"
    container_port   = 8080
  }

  deployment_controller { type = "ECS" }
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }
}

resource "aws_appautoscaling_target" "gateway" {
  max_capacity       = 10
  min_capacity       = var.environment == "prod" ? 2 : 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.gateway.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "gateway_cpu" {
  name               = "retailerp-gateway-cpu-${var.environment}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.gateway.resource_id
  scalable_dimension = aws_appautoscaling_target.gateway.scalable_dimension
  service_namespace  = aws_appautoscaling_target.gateway.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}
