variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  validation {
    condition     = contains(["dev","qa","uat","prod"], var.environment)
    error_message = "Must be dev, qa, uat, or prod"
  }
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "db_tier" {
  description = "Cloud SQL instance tier"
  type        = string
  default     = "db-custom-2-4096"
  # prod: db-custom-4-16384
}

variable "db_password" {
  description = "Cloud SQL root password"
  type        = string
  sensitive   = true
}

variable "image_tag" {
  description = "Container image tag"
  type        = string
  default     = "latest"
}

variable "notification_channels" {
  description = "Cloud Monitoring notification channel IDs"
  type        = list(string)
  default     = []
}
