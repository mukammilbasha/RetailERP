terraform {
  required_version = ">= 1.6"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }
  backend "gcs" {
    bucket = "retailerp-terraform-state"
    prefix = "retailerp/terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# ── Enable required APIs ──────────────────────────────────────
resource "google_project_service" "apis" {
  for_each = toset([
    "container.googleapis.com",
    "sqladmin.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
    "compute.googleapis.com",
    "cloudarmor.googleapis.com"
  ])
  service            = each.value
  disable_on_destroy = false
}

# ── VPC ──────────────────────────────────────────────────────
resource "google_compute_network" "vpc" {
  name                    = "retailerp-vpc-${var.environment}"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.apis]
}

resource "google_compute_subnetwork" "gke" {
  name          = "retailerp-gke-${var.environment}"
  ip_cidr_range = "10.0.0.0/22"
  region        = var.region
  network       = google_compute_network.vpc.id

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.4.0.0/14"
  }
  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.8.0.0/20"
  }

  private_ip_google_access = true
}

resource "google_compute_router" "main" {
  name    = "retailerp-router-${var.environment}"
  region  = var.region
  network = google_compute_network.vpc.id
}

resource "google_compute_router_nat" "main" {
  name                               = "retailerp-nat-${var.environment}"
  router                             = google_compute_router.main.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}

# ── Artifact Registry ─────────────────────────────────────────
resource "google_artifact_registry_repository" "main" {
  provider      = google-beta
  location      = var.region
  repository_id = "retailerp"
  format        = "DOCKER"
  description   = "RetailERP Docker images (${var.environment})"
  depends_on    = [google_project_service.apis]

  cleanup_policies {
    id     = "keep-20-tagged"
    action = "KEEP"
    most_recent_versions { keep_count = 20 }
  }
}

# ── Secret Manager secrets ────────────────────────────────────
resource "google_secret_manager_secret" "db_connection" {
  secret_id = "retailerp-${var.environment}-db-connection"
  replication { auto {} }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "retailerp-${var.environment}-jwt-secret"
  replication { auto {} }
}

# ── GKE Autopilot Cluster ─────────────────────────────────────
resource "google_container_cluster" "main" {
  name     = "retailerp-${var.environment}"
  location = var.region

  enable_autopilot = true

  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.gke.name

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  release_channel {
    channel = var.environment == "prod" ? "STABLE" : "REGULAR"
  }

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  cluster_autoscaling {
    auto_provisioning_defaults {
      service_account = google_service_account.gke_workload.email
    }
  }

  resource_labels = {
    environment = var.environment
    managed_by  = "terraform"
  }

  depends_on = [google_project_service.apis]
}

# ── Service Accounts ──────────────────────────────────────────
resource "google_service_account" "gke_workload" {
  account_id   = "retailerp-gke-${var.environment}"
  display_name = "RetailERP GKE Workload SA (${var.environment})"
}

resource "google_project_iam_member" "gke_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.gke_workload.email}"
}

resource "google_project_iam_member" "gke_ar_reader" {
  project = var.project_id
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.gke_workload.email}"
}

# ── Cloud SQL (PostgreSQL as SQL Server alternative on GCP) ───
# Note: Cloud SQL does not support SQL Server on some regions.
# Using SQL Server on Cloud SQL requires SQL Server license.
resource "google_sql_database_instance" "main" {
  name             = "retailerp-${var.environment}"
  database_version = "SQLSERVER_2019_STANDARD"
  region           = var.region
  deletion_protection = var.environment == "prod"

  settings {
    tier              = var.db_tier
    disk_type         = "PD_SSD"
    disk_size         = var.environment == "prod" ? 100 : 20
    disk_autoresize   = true
    availability_type = var.environment == "prod" ? "REGIONAL" : "ZONAL"

    backup_configuration {
      enabled            = true
      binary_log_enabled = false
      backup_retention_settings { retained_backups = var.environment == "prod" ? 30 : 7 }
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
    }

    database_flags {
      name  = "max connections"
      value = "500"
    }
  }

  root_password = var.db_password
  depends_on    = [google_project_service.apis]
}

resource "google_sql_database" "retailerp" {
  name     = "RetailERP"
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "retailerp" {
  name     = "retailerp_admin"
  instance = google_sql_database_instance.main.name
  password = var.db_password
}

# ── Cloud Monitoring alert policy ─────────────────────────────
resource "google_monitoring_alert_policy" "high_error_rate" {
  display_name = "RetailERP High Error Rate (${var.environment})"
  combiner     = "OR"

  conditions {
    display_name = "HTTP 5xx Error Rate > 1%"
    condition_threshold {
      filter          = "resource.type=\"k8s_container\" AND metric.type=\"kubernetes.io/container/restart_count\" AND resource.labels.namespace_name=\"retailerp-${var.environment}\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 5
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = var.notification_channels
  depends_on = [google_project_service.apis]
}

# ── Outputs ───────────────────────────────────────────────────
output "gke_cluster_name" {
  value = google_container_cluster.main.name
}

output "gke_cluster_endpoint" {
  value     = google_container_cluster.main.endpoint
  sensitive = true
}

output "artifact_registry_url" {
  value = "${var.region}-docker.pkg.dev/${var.project_id}/retailerp"
}

output "sql_instance_connection_name" {
  value = google_sql_database_instance.main.connection_name
}
