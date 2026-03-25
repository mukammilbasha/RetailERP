#!/bin/bash
# ================================================================
#  RetailERP — WSL 2 One-Time Deployment Script
#  Run this ONCE on a fresh WSL 2 (Ubuntu) instance.
#
#  Usage:
#    chmod +x wsl-deploy.sh && ./wsl-deploy.sh
#
#  Or run directly from GitHub (no clone needed):
#    curl -fsSL https://raw.githubusercontent.com/mukammilbasha/RetailERP/main/deployment/wsl-deploy.sh | bash
# ================================================================
set -euo pipefail

# ── Colors ────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

# ── Config ────────────────────────────────────────────────────
REPO_URL="https://github.com/mukammilbasha/RetailERP.git"
INSTALL_DIR="$HOME/RetailERP"
DOCKER_COMPOSE_VERSION="2.27.0"

# ── Helpers ───────────────────────────────────────────────────
log()     { echo -e "${BOLD}[$(date '+%H:%M:%S')]${NC} $*"; }
success() { echo -e "${GREEN}${BOLD}  ✓ $*${NC}"; }
warn()    { echo -e "${YELLOW}  ⚠ $*${NC}"; }
fail()    { echo -e "${RED}${BOLD}  ✗ $*${NC}"; exit 1; }
step()    { echo -e "\n${BLUE}${BOLD}══ $* ══${NC}"; }

banner() {
  echo -e "\n${BOLD}${CYAN}"
  echo "  ██████╗ ███████╗████████╗ █████╗ ██╗██╗     ███████╗██████╗ ██████╗"
  echo "  ██╔══██╗██╔════╝╚══██╔══╝██╔══██╗██║██║     ██╔════╝██╔══██╗██╔══██╗"
  echo "  ██████╔╝█████╗     ██║   ███████║██║██║     █████╗  ██████╔╝██████╔╝"
  echo "  ██╔══██╗██╔══╝     ██║   ██╔══██║██║██║     ██╔══╝  ██╔══██╗██╔═══╝"
  echo "  ██║  ██║███████╗   ██║   ██║  ██║██║███████╗███████╗██║  ██║██║"
  echo "  ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝"
  echo -e "${NC}"
  echo -e "${BOLD}  WSL 2 One-Time Deployment Script${NC}"
  echo -e "  ${CYAN}https://github.com/mukammilbasha/RetailERP${NC}\n"
  echo "  This script will:"
  echo "    1. Install Docker Engine + Compose"
  echo "    2. Install Git, curl, and other tools"
  echo "    3. Clone the RetailERP repository"
  echo "    4. Build and start all 15 services"
  echo ""
  echo -e "  Press ${BOLD}ENTER${NC} to continue or ${BOLD}Ctrl+C${NC} to abort..."
  read -r
}

# ── Verify WSL 2 ──────────────────────────────────────────────
check_wsl() {
  step "Verifying WSL 2 environment"
  if grep -qi microsoft /proc/version 2>/dev/null; then
    success "Running inside WSL 2"
  else
    warn "Not detected as WSL — continuing anyway (script works on native Linux too)"
  fi

  # Detect distro
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    log "Distro: $PRETTY_NAME"
    case "$ID" in
      ubuntu|debian) PKG_MGR="apt-get" ;;
      fedora|rhel|centos) PKG_MGR="dnf" ;;
      alpine) PKG_MGR="apk" ;;
      *) warn "Unsupported distro: $ID — assuming apt-get"; PKG_MGR="apt-get" ;;
    esac
  else
    warn "Cannot detect distro — assuming apt-get"
    PKG_MGR="apt-get"
  fi
  success "Package manager: $PKG_MGR"
}

# ── System update + base packages ─────────────────────────────
install_base_packages() {
  step "Installing base packages"
  log "Updating package index..."
  sudo $PKG_MGR update -y -q

  local packages="git curl wget ca-certificates gnupg lsb-release apt-transport-https jq"
  log "Installing: $packages"
  sudo $PKG_MGR install -y -q $packages
  success "Base packages installed"
}

# ── Docker Engine ─────────────────────────────────────────────
install_docker() {
  step "Installing Docker Engine"

  if command -v docker &>/dev/null; then
    local docker_ver
    docker_ver=$(docker --version 2>&1 | grep -oP '\d+\.\d+\.\d+' | head -1)
    success "Docker already installed (v$docker_ver) — skipping"
    return
  fi

  log "Adding Docker's official GPG key..."
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg

  log "Adding Docker APT repository..."
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

  sudo apt-get update -y -q
  sudo apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  # Add current user to docker group
  sudo usermod -aG docker "$USER"
  success "Docker Engine installed"
}

# ── Docker service in WSL 2 ───────────────────────────────────
start_docker() {
  step "Starting Docker daemon"

  # WSL 2 does not use systemd by default — use service or dockerd directly
  if command -v systemctl &>/dev/null && systemctl is-system-running &>/dev/null 2>&1; then
    sudo systemctl enable docker 2>/dev/null || true
    sudo systemctl start docker
    success "Docker started via systemctl"
  else
    # Start dockerd in background (WSL 2 without systemd)
    if ! docker info &>/dev/null 2>&1; then
      log "Starting dockerd in background (WSL 2 compat mode)..."
      sudo nohup dockerd > /tmp/dockerd.log 2>&1 &
      DOCKERD_PID=$!
      log "Waiting for Docker daemon to be ready (PID $DOCKERD_PID)..."
      for i in $(seq 1 30); do
        docker info &>/dev/null 2>&1 && break
        sleep 2
      done
    fi
  fi

  # Final check
  if docker info &>/dev/null 2>&1; then
    success "Docker daemon is running"
  else
    fail "Docker daemon failed to start. Check /tmp/dockerd.log"
  fi
}

# ── Clone repo ────────────────────────────────────────────────
clone_repo() {
  step "Cloning RetailERP repository"

  if [ -d "$INSTALL_DIR/.git" ]; then
    log "Repository already exists at $INSTALL_DIR — pulling latest..."
    git -C "$INSTALL_DIR" pull --ff-only origin main
    success "Repository updated"
  else
    log "Cloning into $INSTALL_DIR..."
    git clone "$REPO_URL" "$INSTALL_DIR"
    success "Repository cloned"
  fi

  cd "$INSTALL_DIR"
  log "Branch: $(git branch --show-current)  |  Commit: $(git rev-parse --short HEAD)"
}

# ── Docker Hub pull (faster than local build) ─────────────────
pull_images() {
  step "Pulling pre-built images from Docker Hub"
  log "Using images from: mukammilbasha/retailerp"

  local images=(
    "frontend" "auth-api" "product-api" "inventory-api"
    "order-api" "production-api" "billing-api" "reporting-api"
    "gateway" "docs"
  )

  for img in "${images[@]}"; do
    log "Pulling mukammilbasha/retailerp:${img}..."
    docker pull "mukammilbasha/retailerp:${img}" 2>&1 | tail -1 || warn "Could not pull $img — will build locally"
    # Tag for docker-compose
    docker tag "mukammilbasha/retailerp:${img}" "retailerp-${img}" 2>/dev/null || true
  done
  success "Images ready"
}

# ── Create production .env ─────────────────────────────────────
create_env_file() {
  step "Creating environment configuration"

  if [ -f "$INSTALL_DIR/.env" ]; then
    warn ".env already exists — skipping (delete it to regenerate)"
    return
  fi

  # Generate a secure JWT secret
  JWT_SECRET=$(openssl rand -base64 48 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9!@#$%^&*' | head -c 48)

  cat > "$INSTALL_DIR/.env" <<EOF
# RetailERP — Environment Configuration
# Generated on $(date -u '+%Y-%m-%d %H:%M:%S UTC')

# Database
SA_PASSWORD=RetailERP@2024!
DB_NAME=RetailERP

# JWT
JWT_SECRET=${JWT_SECRET}
JWT_ISSUER=RetailERP.Auth
JWT_AUDIENCE=RetailERP.Client

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:5000

# Grafana
GRAFANA_PASSWORD=admin
EOF

  chmod 600 "$INSTALL_DIR/.env"
  success ".env file created (JWT secret auto-generated)"
}

# ── Update docker-compose to use Docker Hub images ─────────────
create_wsl_compose() {
  step "Creating WSL-optimized docker-compose override"

  cat > "$INSTALL_DIR/docker-compose.wsl.yml" <<'EOF'
# WSL 2 override — uses pre-built Docker Hub images instead of building locally
# Merged automatically during deployment

services:
  auth-api:
    image: mukammilbasha/retailerp:auth-api
    build: !reset null

  product-api:
    image: mukammilbasha/retailerp:product-api
    build: !reset null

  inventory-api:
    image: mukammilbasha/retailerp:inventory-api
    build: !reset null

  order-api:
    image: mukammilbasha/retailerp:order-api
    build: !reset null

  production-api:
    image: mukammilbasha/retailerp:production-api
    build: !reset null

  billing-api:
    image: mukammilbasha/retailerp:billing-api
    build: !reset null

  reporting-api:
    image: mukammilbasha/retailerp:reporting-api
    build: !reset null

  gateway:
    image: mukammilbasha/retailerp:gateway
    build: !reset null

  frontend:
    image: mukammilbasha/retailerp:frontend
    build: !reset null

  docs:
    image: mukammilbasha/retailerp:docs
    build: !reset null
EOF

  success "WSL compose override created"
}

# ── Start all services ────────────────────────────────────────
start_services() {
  step "Starting all RetailERP services"
  cd "$INSTALL_DIR"

  log "Stopping any previous containers..."
  docker compose -f docker-compose.yml -f docker-compose.wsl.yml down --remove-orphans 2>/dev/null || true

  log "Starting infrastructure (SQL Server, Redis)..."
  docker compose -f docker-compose.yml -f docker-compose.wsl.yml up -d sqlserver redis prometheus grafana

  log "Waiting for SQL Server to be healthy (up to 60s)..."
  for i in $(seq 1 30); do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' retailerp-sqlserver 2>/dev/null || echo "starting")
    [ "$STATUS" = "healthy" ] && break
    echo -ne "\r  Waiting... ${i}/30 (status: $STATUS)"
    sleep 2
  done
  echo ""

  STATUS=$(docker inspect --format='{{.State.Health.Status}}' retailerp-sqlserver 2>/dev/null || echo "unknown")
  if [ "$STATUS" != "healthy" ]; then
    warn "SQL Server did not become healthy in time — check with: docker logs retailerp-sqlserver"
  else
    success "SQL Server is healthy"
  fi

  log "Starting all application services..."
  docker compose -f docker-compose.yml -f docker-compose.wsl.yml up -d

  success "All services started"
}

# ── Health check ──────────────────────────────────────────────
check_health() {
  step "Waiting for services to become healthy"
  log "Giving services 30 seconds to initialize..."
  sleep 30

  local all_ok=true

  declare -A ENDPOINTS=(
    ["API Gateway"]="http://localhost:5000/health"
    ["Auth API"]="http://localhost:5001/health"
    ["Product API"]="http://localhost:5002/health"
    ["Inventory API"]="http://localhost:5003/health"
    ["Order API"]="http://localhost:5004/health"
    ["Production API"]="http://localhost:5005/health"
    ["Billing API"]="http://localhost:5006/health"
    ["Reporting API"]="http://localhost:5007/health"
  )

  for name in "${!ENDPOINTS[@]}"; do
    url="${ENDPOINTS[$name]}"
    if curl -sf --max-time 5 "$url" > /dev/null 2>&1; then
      success "$name → $url"
    else
      warn "$name → $url (not responding yet)"
      all_ok=false
    fi
  done

  if [ "$all_ok" = false ]; then
    warn "Some services are still starting. Check status with: docker ps"
  fi
}

# ── Print summary ─────────────────────────────────────────────
print_summary() {
  local WSL_IP
  WSL_IP=$(hostname -I 2>/dev/null | awk '{print $1}') || WSL_IP="localhost"

  echo ""
  echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}${BOLD}║           RetailERP Deployed Successfully!               ║${NC}"
  echo -e "${GREEN}${BOLD}╠══════════════════════════════════════════════════════════╣${NC}"
  echo -e "${GREEN}${BOLD}║  SERVICES                                                ║${NC}"
  echo -e "${GREEN}${BOLD}╠══════════════════════════════════════════════════════════╣${NC}"
  echo -e "  ${BOLD}Frontend UI${NC}      → ${CYAN}http://localhost:3003${NC}"
  echo -e "  ${BOLD}Docs UI${NC}          → ${CYAN}http://localhost:3100${NC}"
  echo -e "  ${BOLD}API Gateway${NC}      → ${CYAN}http://localhost:5000${NC}"
  echo -e "  ${BOLD}Swagger Docs${NC}     → ${CYAN}http://localhost:5000/swagger${NC}"
  echo -e "  ${BOLD}Grafana${NC}          → ${CYAN}http://localhost:3002${NC}  (admin / admin)"
  echo -e "  ${BOLD}Prometheus${NC}       → ${CYAN}http://localhost:9091${NC}"
  echo ""
  echo -e "  ${BOLD}From Windows browser (WSL IP):${NC}"
  echo -e "  Frontend         → ${CYAN}http://${WSL_IP}:3003${NC}"
  echo -e "  Docs             → ${CYAN}http://${WSL_IP}:3100${NC}"
  echo ""
  echo -e "${GREEN}${BOLD}╠══════════════════════════════════════════════════════════╣${NC}"
  echo -e "${GREEN}${BOLD}║  USEFUL COMMANDS                                         ║${NC}"
  echo -e "${GREEN}${BOLD}╠══════════════════════════════════════════════════════════╣${NC}"
  echo -e "  ${BOLD}View status:${NC}     docker ps"
  echo -e "  ${BOLD}View logs:${NC}       docker compose logs -f [service]"
  echo -e "  ${BOLD}Stop all:${NC}        cd ~/RetailERP && docker compose down"
  echo -e "  ${BOLD}Restart all:${NC}     cd ~/RetailERP && docker compose up -d"
  echo -e "  ${BOLD}Update images:${NC}   cd ~/RetailERP && docker compose pull && docker compose up -d"
  echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

# ── Add docker auto-start to .bashrc ──────────────────────────
configure_autostart() {
  step "Configuring Docker auto-start on WSL launch"

  local BASHRC="$HOME/.bashrc"
  local MARKER="# RetailERP Docker autostart"

  if grep -q "$MARKER" "$BASHRC" 2>/dev/null; then
    warn "Auto-start already configured in .bashrc — skipping"
    return
  fi

  cat >> "$BASHRC" <<'BASHRC_ENTRY'

# RetailERP Docker autostart
if [ -z "$(docker info 2>/dev/null | grep 'Server Version')" ]; then
  sudo nohup dockerd > /tmp/dockerd.log 2>&1 &
  sleep 3
fi
BASHRC_ENTRY

  success "Docker auto-start added to ~/.bashrc"
}

# ── Main ──────────────────────────────────────────────────────
main() {
  banner
  check_wsl
  install_base_packages
  install_docker
  start_docker

  # Run Docker commands with group permissions (newgrp would exit script)
  # Use sg docker or sudo for docker commands
  if ! groups | grep -q docker; then
    warn "User not yet in docker group — using sudo for docker commands"
    alias docker="sudo docker"
    alias "docker compose"="sudo docker compose"
  fi

  clone_repo
  create_env_file
  create_wsl_compose
  pull_images
  start_services
  check_health
  configure_autostart
  print_summary
}

main "$@"
