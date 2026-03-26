#!/bin/bash
set -e

# =============================================================================
# RetailERP - Nginx Installer for Ubuntu 22.04 / 20.04
# =============================================================================
# Usage:
#   sudo ./scripts/install.sh
#
# What it does:
#   1  Checks root + detects Ubuntu/Debian
#   2  Installs prerequisites: nginx, dotnet-runtime-8.0, nodejs 20.x
#   3  Creates /opt/retailerp/ directory structure
#   4  Creates system user 'retailerp'
#   5  Copies service binaries
#   6  Installs systemd unit files for all services + frontend
#   7  Installs Nginx configuration
#   8  Enables and starts all services
#   9  Health checks every port; auto-rolls back on failure
# =============================================================================

# ---- ANSI color codes -------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
GRAY='\033[0;37m'
NC='\033[0m'

# ---- Globals ----------------------------------------------------------------
PACK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_ROOT="/opt/retailerp"
LOG_FILE="/opt/retailerp/logs/install.log"
NGINX_CONF_DIR="/etc/nginx/sites-available"
NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"
SYSTEMD_DIR="/etc/systemd/system"
RETAILERP_USER="retailerp"
FRONTEND_PORT=3003

# Service definitions: "Name:Port:dir"
SERVICES=(
    "Gateway:5000:gateway"
    "Auth:5001:auth"
    "Product:5002:product"
    "Inventory:5003:inventory"
    "Order:5004:order"
    "Production:5005:production"
    "Billing:5006:billing"
    "Reporting:5007:reporting"
)

ROLLBACK_NEEDED=false
STARTED_SERVICES=()

# ---- Logging helpers --------------------------------------------------------
log() {
    local ts
    ts="$(date '+%H:%M:%S')"
    echo -e "${WHITE}[$ts]${NC} $1" | tee -a "$LOG_FILE" 2>/dev/null || echo -e "${WHITE}[$ts]${NC} $1"
}

step() {
    log "${CYAN}  --- $1 ---${NC}"
}

ok() {
    log "${GREEN}  [OK]${NC} $1"
}

warn() {
    log "${YELLOW}  [!!]${NC} $1"
}

fail() {
    log "${RED}  [XX]${NC} $1"
    exit 1
}

# ---- Rollback ---------------------------------------------------------------
rollback() {
    log "${RED}  [XX] Health check failed - initiating rollback...${NC}"
    for svc in "${STARTED_SERVICES[@]}"; do
        systemctl stop "$svc" 2>/dev/null || true
        systemctl disable "$svc" 2>/dev/null || true
        log "${YELLOW}  [!!] Stopped and disabled: $svc${NC}"
    done
    if systemctl is-active --quiet nginx; then
        rm -f "$NGINX_ENABLED_DIR/retailerp"
        nginx -t 2>/dev/null && systemctl reload nginx || true
        log "${YELLOW}  [!!] Removed nginx config${NC}"
    fi
    log "${RED}  [XX] Rollback complete. Check $LOG_FILE for details.${NC}"
    exit 1
}

# =============================================================================
# PHASE 1 - Root check + OS detection
# =============================================================================
step "PHASE 1 - Environment Check"

if [[ $EUID -ne 0 ]]; then
    fail "This script must be run as root. Use: sudo $0"
fi
ok "Running as root"

if [[ ! -f /etc/os-release ]]; then
    fail "Cannot detect OS. /etc/os-release not found."
fi

# shellcheck source=/dev/null
source /etc/os-release
if [[ "$ID" != "ubuntu" && "$ID" != "debian" ]]; then
    warn "OS is '$ID' - this installer targets Ubuntu/Debian. Proceeding anyway..."
else
    ok "OS: $PRETTY_NAME"
fi

# Create log directory before anything else
mkdir -p /opt/retailerp/logs
LOG_FILE="/opt/retailerp/logs/install.log"
log "Install log: $LOG_FILE"

# =============================================================================
# PHASE 2 - Install Prerequisites
# =============================================================================
step "PHASE 2 - Installing Prerequisites"

export DEBIAN_FRONTEND=noninteractive

log "  Updating apt package index..."
apt-get update -qq
ok "apt-get update done"

# ---- nginx ------------------------------------------------------------------
if ! command -v nginx &>/dev/null; then
    log "  Installing nginx..."
    apt-get install -y -qq nginx
    ok "nginx installed"
else
    ok "nginx already installed: $(nginx -v 2>&1)"
fi

# ---- .NET Runtime 8.0 -------------------------------------------------------
if ! command -v dotnet &>/dev/null; then
    log "  Adding Microsoft package repository..."
    # Download and install Microsoft signing key + repo
    local_arch="$(dpkg --print-architecture)"
    ubuntu_version=""
    if [[ "$ID" == "ubuntu" ]]; then
        ubuntu_version="$VERSION_ID"
    else
        ubuntu_version="22.04"
    fi

    MSFT_PKG="packages-microsoft-prod.deb"
    MSFT_URL="https://packages.microsoft.com/config/ubuntu/${ubuntu_version}/packages-microsoft-prod.deb"
    wget -q -O "/tmp/$MSFT_PKG" "$MSFT_URL" || {
        warn "Could not download Microsoft package repo for Ubuntu $ubuntu_version, trying 22.04..."
        wget -q -O "/tmp/$MSFT_PKG" "https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb"
    }
    dpkg -i "/tmp/$MSFT_PKG"
    rm -f "/tmp/$MSFT_PKG"
    apt-get update -qq
    log "  Installing dotnet-runtime-8.0..."
    apt-get install -y -qq dotnet-runtime-8.0
    ok ".NET Runtime 8.0 installed"
else
    DOTNET_VER="$(dotnet --version 2>/dev/null || echo unknown)"
    ok ".NET already installed: $DOTNET_VER"
fi

# ---- Node.js 20.x -----------------------------------------------------------
if ! command -v node &>/dev/null; then
    log "  Adding NodeSource repository (Node.js 20.x)..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt-get install -y -qq nodejs
    ok "Node.js installed: $(node --version)"
else
    NODE_VER="$(node --version 2>/dev/null || echo unknown)"
    ok "Node.js already installed: $NODE_VER"
fi

# ---- unzip (needed to unpack release on server) ----------------------------
if ! command -v unzip &>/dev/null; then
    apt-get install -y -qq unzip
    ok "unzip installed"
fi

# =============================================================================
# PHASE 3 - Directory structure
# =============================================================================
step "PHASE 3 - Creating Directory Structure"

mkdir -p "$INSTALL_ROOT/services"
mkdir -p "$INSTALL_ROOT/frontend"
mkdir -p "$INSTALL_ROOT/logs"
mkdir -p "$INSTALL_ROOT/backups"

for entry in "${SERVICES[@]}"; do
    svc_dir="${entry##*:}"
    mkdir -p "$INSTALL_ROOT/services/$svc_dir"
done

ok "Directory structure created under $INSTALL_ROOT"

# =============================================================================
# PHASE 4 - Create system user
# =============================================================================
step "PHASE 4 - Creating System User"

if id "$RETAILERP_USER" &>/dev/null; then
    ok "User '$RETAILERP_USER' already exists"
else
    useradd --system --no-create-home --shell /usr/sbin/nologin "$RETAILERP_USER"
    ok "Created system user: $RETAILERP_USER"
fi

# =============================================================================
# PHASE 5 - Copy service binaries
# =============================================================================
step "PHASE 5 - Copying Service Binaries"

SERVICES_SRC="$PACK_DIR/services"
if [[ ! -d "$SERVICES_SRC" ]]; then
    fail "services/ directory not found in pack: $SERVICES_SRC"
fi

for entry in "${SERVICES[@]}"; do
    svc_name="${entry%%:*}"
    svc_rest="${entry#*:}"
    svc_port="${svc_rest%%:*}"
    svc_dir="${svc_rest##*:}"

    src="$SERVICES_SRC/$svc_dir"
    dst="$INSTALL_ROOT/services/$svc_dir"

    if [[ -d "$src" ]]; then
        # Backup existing if present
        if [[ -d "$dst" ]] && ls "$dst"/*.dll &>/dev/null 2>&1; then
            backup_ts="$(date '+%Y%m%d-%H%M%S')"
            cp -r "$dst" "$INSTALL_ROOT/backups/${svc_dir}-$backup_ts" 2>/dev/null || true
        fi
        cp -r "$src/." "$dst/"
        ok "Copied $svc_name -> $dst"
    else
        warn "Missing service binaries for $svc_name ($src) - skipping"
    fi
done

# ---- Frontend ---------------------------------------------------------------
FRONTEND_SRC="$PACK_DIR/frontend"
FRONTEND_DST="$INSTALL_ROOT/frontend"
if [[ -d "$FRONTEND_SRC" ]]; then
    if [[ -d "$FRONTEND_DST" ]] && ls "$FRONTEND_DST"/*.js &>/dev/null 2>&1; then
        backup_ts="$(date '+%Y%m%d-%H%M%S')"
        cp -r "$FRONTEND_DST" "$INSTALL_ROOT/backups/frontend-$backup_ts" 2>/dev/null || true
    fi
    cp -r "$FRONTEND_SRC/." "$FRONTEND_DST/"
    ok "Copied frontend -> $FRONTEND_DST"
else
    warn "Frontend directory not found in pack ($FRONTEND_SRC) - skipping"
fi

# Fix permissions
chown -R "$RETAILERP_USER:$RETAILERP_USER" "$INSTALL_ROOT"
chmod -R 750 "$INSTALL_ROOT/services"
chmod -R 750 "$INSTALL_ROOT/frontend"
chmod -R 770 "$INSTALL_ROOT/logs"
ok "Permissions set on $INSTALL_ROOT"

# =============================================================================
# PHASE 6 - Install systemd unit files
# =============================================================================
step "PHASE 6 - Installing systemd Unit Files"

SYSTEMD_SRC="$PACK_DIR/systemd"
if [[ -d "$SYSTEMD_SRC" ]]; then
    for unit_file in "$SYSTEMD_SRC"/*.service; do
        unit_name="$(basename "$unit_file")"
        cp "$unit_file" "$SYSTEMD_DIR/$unit_name"
        ok "Installed unit: $unit_name"
    done
else
    warn "systemd/ directory not found in pack - generating unit files inline"

    # Generate units inline as fallback
    CONN_STR="Server=localhost;Database=RetailERP;User Id=ERPAdmin;Password=ERP@admin;TrustServerCertificate=true;MultipleActiveResultSets=true"

    for entry in "${SERVICES[@]}"; do
        svc_name="${entry%%:*}"
        svc_rest="${entry#*:}"
        svc_port="${svc_rest%%:*}"
        svc_dir="${svc_rest##*:}"

        unit_name="retailerp-${svc_dir}.service"
        cat > "$SYSTEMD_DIR/$unit_name" <<UNIT
[Unit]
Description=RetailERP ${svc_name} Service
After=network.target

[Service]
Type=simple
User=${RETAILERP_USER}
WorkingDirectory=${INSTALL_ROOT}/services/${svc_dir}
ExecStart=/usr/bin/dotnet ${INSTALL_ROOT}/services/${svc_dir}/RetailERP.${svc_name}.dll
Restart=always
RestartSec=10
Environment=ASPNETCORE_ENVIRONMENT=production
Environment=ASPNETCORE_URLS=http://127.0.0.1:${svc_port}
Environment="ConnectionStrings__DefaultConnection=${CONN_STR}"

[Install]
WantedBy=multi-user.target
UNIT
        ok "Generated unit: $unit_name"
    done

    # Frontend unit
    cat > "$SYSTEMD_DIR/retailerp-frontend.service" <<FEUNIT
[Unit]
Description=RetailERP Frontend (Next.js)
After=network.target

[Service]
Type=simple
User=${RETAILERP_USER}
WorkingDirectory=${INSTALL_ROOT}/frontend
ExecStart=/usr/bin/node ${INSTALL_ROOT}/frontend/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=${FRONTEND_PORT}
Environment=HOSTNAME=127.0.0.1

[Install]
WantedBy=multi-user.target
FEUNIT
    ok "Generated unit: retailerp-frontend.service"
fi

systemctl daemon-reload
ok "systemd daemon reloaded"

# =============================================================================
# PHASE 7 - Install Nginx configuration
# =============================================================================
step "PHASE 7 - Installing Nginx Configuration"

NGINX_SRC="$PACK_DIR/nginx/retailerp.conf"
if [[ ! -f "$NGINX_SRC" ]]; then
    # Try relative to script location
    NGINX_SRC="$PACK_DIR/nginx/retailerp.conf"
fi

if [[ -f "$NGINX_SRC" ]]; then
    cp "$NGINX_SRC" "$NGINX_CONF_DIR/retailerp"
    ok "Copied nginx config to $NGINX_CONF_DIR/retailerp"
else
    warn "retailerp.conf not found in pack/nginx/ - generating minimal config"
    cat > "$NGINX_CONF_DIR/retailerp" <<NGINXCONF
upstream retailerp_gateway  { server 127.0.0.1:5000; }
upstream retailerp_frontend { server 127.0.0.1:3003; }

map \$http_upgrade \$connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 80 default_server;
    server_name _;

    location /ws/ {
        proxy_pass         http://retailerp_gateway;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    \$http_upgrade;
        proxy_set_header   Connection \$connection_upgrade;
        proxy_set_header   Host       \$host;
        proxy_read_timeout 3600s;
    }

    location /api/ {
        proxy_pass       http://retailerp_gateway;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        proxy_pass       http://retailerp_frontend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINXCONF
    ok "Generated minimal nginx config"
fi

# Enable site
ln -sf "$NGINX_CONF_DIR/retailerp" "$NGINX_ENABLED_DIR/retailerp"

# Remove default nginx site if it exists
if [[ -f "$NGINX_ENABLED_DIR/default" ]]; then
    rm -f "$NGINX_ENABLED_DIR/default"
    ok "Removed default nginx site"
fi

# Validate nginx config
if nginx -t 2>/dev/null; then
    ok "nginx config syntax OK"
else
    nginx -t
    fail "nginx config test FAILED - check output above"
fi

# =============================================================================
# PHASE 8 - Enable and start all services
# =============================================================================
step "PHASE 8 - Enabling and Starting Services"

for entry in "${SERVICES[@]}"; do
    svc_dir="${entry##*:}"
    unit_name="retailerp-${svc_dir}.service"

    if [[ -f "$SYSTEMD_DIR/$unit_name" ]]; then
        systemctl enable "$unit_name" --quiet
        systemctl restart "$unit_name"
        STARTED_SERVICES+=("$unit_name")
        ok "Started: $unit_name"
    else
        warn "Unit file not found, skipping: $unit_name"
    fi
done

# Frontend
if [[ -f "$SYSTEMD_DIR/retailerp-frontend.service" ]]; then
    systemctl enable retailerp-frontend.service --quiet
    systemctl restart retailerp-frontend.service
    STARTED_SERVICES+=("retailerp-frontend.service")
    ok "Started: retailerp-frontend.service"
fi

# Start / reload nginx
if systemctl is-active --quiet nginx; then
    systemctl reload nginx
    ok "nginx reloaded"
else
    systemctl enable nginx --quiet
    systemctl start nginx
    ok "nginx started"
fi

# =============================================================================
# PHASE 9 - Health Checks (with auto-rollback on failure)
# =============================================================================
step "PHASE 9 - Health Checks"

HEALTH_WAIT=15
log "  Waiting ${HEALTH_WAIT}s for services to initialize..."
sleep "$HEALTH_WAIT"

HEALTH_FAILED=false

# Check .NET backend services
for entry in "${SERVICES[@]}"; do
    svc_name="${entry%%:*}"
    svc_rest="${entry#*:}"
    svc_port="${svc_rest%%:*}"

    attempts=0
    max_attempts=6
    ok_flag=false
    while [[ $attempts -lt $max_attempts ]]; do
        if curl -sf --max-time 5 "http://127.0.0.1:${svc_port}/health" > /dev/null 2>&1 || \
           curl -sf --max-time 5 "http://127.0.0.1:${svc_port}/" > /dev/null 2>&1; then
            ok "$svc_name responding on port $svc_port"
            ok_flag=true
            break
        fi
        attempts=$((attempts + 1))
        if [[ $attempts -lt $max_attempts ]]; then
            sleep 5
        fi
    done

    if [[ "$ok_flag" == "false" ]]; then
        warn "$svc_name NOT responding on port $svc_port after $((max_attempts * 5))s"
        # Show recent journal entries to aid diagnosis
        journalctl -u "retailerp-${svc_name,,}.service" --no-pager -n 20 2>/dev/null || true
        HEALTH_FAILED=true
    fi
done

# Check frontend
attempts=0
max_attempts=6
fe_ok=false
while [[ $attempts -lt $max_attempts ]]; do
    if curl -sf --max-time 5 "http://127.0.0.1:${FRONTEND_PORT}/" > /dev/null 2>&1; then
        ok "Frontend responding on port $FRONTEND_PORT"
        fe_ok=true
        break
    fi
    attempts=$((attempts + 1))
    if [[ $attempts -lt $max_attempts ]]; then
        sleep 5
    fi
done
if [[ "$fe_ok" == "false" ]]; then
    warn "Frontend NOT responding on port $FRONTEND_PORT"
    journalctl -u retailerp-frontend.service --no-pager -n 20 2>/dev/null || true
    HEALTH_FAILED=true
fi

# Check nginx (port 80)
if curl -sf --max-time 5 "http://127.0.0.1:80/" > /dev/null 2>&1; then
    ok "Nginx responding on port 80"
else
    warn "Nginx NOT responding on port 80"
    HEALTH_FAILED=true
fi

# Auto-rollback if any health check failed
if [[ "$HEALTH_FAILED" == "true" ]]; then
    rollback
fi

# =============================================================================
# Summary
# =============================================================================
BORDER="============================================================"
log ""
log "${GREEN}$BORDER${NC}"
log "${GREEN}  RetailERP Nginx Deployment Complete${NC}"
log "${GREEN}$BORDER${NC}"
log ""
log "  Install root : $INSTALL_ROOT"
log "  Nginx config : $NGINX_CONF_DIR/retailerp"
log "  Log file     : $LOG_FILE"
log ""
log "  Service status:"
for entry in "${SERVICES[@]}"; do
    svc_name="${entry%%:*}"
    svc_rest="${entry#*:}"
    svc_port="${svc_rest%%:*}"
    svc_dir="${svc_rest##*:}"
    STATUS="$(systemctl is-active retailerp-${svc_dir}.service 2>/dev/null || echo unknown)"
    log "    $svc_name ($svc_port) : $STATUS"
done
log "    Frontend   ($FRONTEND_PORT) : $(systemctl is-active retailerp-frontend.service 2>/dev/null || echo unknown)"
log "    Nginx      (80)    : $(systemctl is-active nginx 2>/dev/null || echo unknown)"
log ""
log "  Access the application:"
SERVER_IP="$(hostname -I 2>/dev/null | awk '{print $1}' || echo '<server-ip>')"
log "    http://${SERVER_IP}/"
log "    http://${SERVER_IP}/api/  (Gateway)"
log ""
log "  Useful commands:"
log "    sudo systemctl status retailerp-gateway"
log "    sudo journalctl -u retailerp-gateway -f"
log "    sudo nginx -t && sudo systemctl reload nginx"
log "    sudo $PACK_DIR/scripts/uninstall.sh"
log ""
