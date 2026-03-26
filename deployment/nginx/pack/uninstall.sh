#!/bin/bash
set -e

# =============================================================================
# RetailERP - Nginx Uninstaller for Ubuntu 22.04 / 20.04
# =============================================================================
# Usage:
#   sudo ./scripts/uninstall.sh              # interactive (prompts for data)
#   sudo ./scripts/uninstall.sh --purge      # remove /opt/retailerp too
#   sudo ./scripts/uninstall.sh --yes        # non-interactive, keep data
#   sudo ./scripts/uninstall.sh --purge --yes # non-interactive, remove all
#
# What it does:
#   1  Stops all RetailERP systemd services
#   2  Disables and removes systemd unit files
#   3  Removes Nginx configuration
#   4  Optionally removes /opt/retailerp/ (with --purge)
#   5  Optionally removes the 'retailerp' system user (with --purge)
# =============================================================================

# ---- ANSI color codes -------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

# ---- Defaults ---------------------------------------------------------------
PURGE=false
YES=false
INSTALL_ROOT="/opt/retailerp"
NGINX_CONF_DIR="/etc/nginx/sites-available"
NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"
SYSTEMD_DIR="/etc/systemd/system"
RETAILERP_USER="retailerp"

# ---- Parse arguments --------------------------------------------------------
for arg in "$@"; do
    case "$arg" in
        --purge) PURGE=true ;;
        --yes)   YES=true   ;;
        -y)      YES=true   ;;
        --help|-h)
            echo "Usage: sudo $0 [--purge] [--yes]"
            echo "  --purge  Also remove $INSTALL_ROOT and the '$RETAILERP_USER' user"
            echo "  --yes    Non-interactive mode (skip confirmation prompts)"
            exit 0
            ;;
    esac
done

# ---- Logging helpers --------------------------------------------------------
log() {
    local ts
    ts="$(date '+%H:%M:%S')"
    echo -e "${WHITE}[$ts]${NC} $1"
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

# =============================================================================
# Root check
# =============================================================================
if [[ $EUID -ne 0 ]]; then
    fail "This script must be run as root. Use: sudo $0 $*"
fi

# ---- Service list -----------------------------------------------------------
# All known RetailERP systemd unit names (service dir names)
SERVICE_DIRS=(gateway auth product inventory order production billing reporting)

# =============================================================================
# Confirmation
# =============================================================================
BORDER="============================================================"
echo -e "${RED}$BORDER${NC}"
echo -e "${RED}  RetailERP Nginx Uninstaller${NC}"
echo -e "${RED}$BORDER${NC}"
echo ""
echo "  This will:"
echo "    - Stop and disable all RetailERP systemd services"
echo "    - Remove RetailERP systemd unit files"
echo "    - Remove Nginx site configuration"

if [[ "$PURGE" == "true" ]]; then
    echo "    - Remove $INSTALL_ROOT (--purge)"
    echo "    - Remove system user '$RETAILERP_USER' (--purge)"
fi
echo ""

if [[ "$YES" != "true" ]]; then
    read -r -p "  Continue? (yes/no): " confirm
    if [[ "$confirm" != "yes" ]]; then
        echo "  Aborted."
        exit 0
    fi
fi

# =============================================================================
# PHASE 1 - Stop and disable services
# =============================================================================
step "PHASE 1 - Stopping Services"

for svc_dir in "${SERVICE_DIRS[@]}"; do
    unit_name="retailerp-${svc_dir}.service"
    if systemctl is-active --quiet "$unit_name" 2>/dev/null; then
        systemctl stop "$unit_name"
        ok "Stopped: $unit_name"
    else
        log "  Not running: $unit_name"
    fi
done

# Frontend
if systemctl is-active --quiet retailerp-frontend.service 2>/dev/null; then
    systemctl stop retailerp-frontend.service
    ok "Stopped: retailerp-frontend.service"
fi

# =============================================================================
# PHASE 2 - Disable and remove systemd unit files
# =============================================================================
step "PHASE 2 - Removing systemd Unit Files"

for svc_dir in "${SERVICE_DIRS[@]}"; do
    unit_name="retailerp-${svc_dir}.service"
    unit_path="$SYSTEMD_DIR/$unit_name"
    if systemctl is-enabled --quiet "$unit_name" 2>/dev/null; then
        systemctl disable "$unit_name" --quiet
        ok "Disabled: $unit_name"
    fi
    if [[ -f "$unit_path" ]]; then
        rm -f "$unit_path"
        ok "Removed: $unit_path"
    fi
done

# Frontend unit
if systemctl is-enabled --quiet retailerp-frontend.service 2>/dev/null; then
    systemctl disable retailerp-frontend.service --quiet
fi
if [[ -f "$SYSTEMD_DIR/retailerp-frontend.service" ]]; then
    rm -f "$SYSTEMD_DIR/retailerp-frontend.service"
    ok "Removed: retailerp-frontend.service"
fi

systemctl daemon-reload
ok "systemd daemon reloaded"

# =============================================================================
# PHASE 3 - Remove Nginx configuration
# =============================================================================
step "PHASE 3 - Removing Nginx Configuration"

# Remove symlink from sites-enabled
if [[ -L "$NGINX_ENABLED_DIR/retailerp" ]] || [[ -f "$NGINX_ENABLED_DIR/retailerp" ]]; then
    rm -f "$NGINX_ENABLED_DIR/retailerp"
    ok "Removed: $NGINX_ENABLED_DIR/retailerp"
fi

# Remove config from sites-available
if [[ -f "$NGINX_CONF_DIR/retailerp" ]]; then
    rm -f "$NGINX_CONF_DIR/retailerp"
    ok "Removed: $NGINX_CONF_DIR/retailerp"
fi

# Restore default nginx site if it was removed
if [[ ! -f "$NGINX_ENABLED_DIR/default" ]] && [[ -f "$NGINX_CONF_DIR/default" ]]; then
    ln -sf "$NGINX_CONF_DIR/default" "$NGINX_ENABLED_DIR/default"
    warn "Restored nginx default site"
fi

# Reload or stop nginx
if nginx -t 2>/dev/null; then
    if systemctl is-active --quiet nginx; then
        systemctl reload nginx
        ok "nginx reloaded"
    fi
else
    warn "nginx config test failed after removing RetailERP config - check /etc/nginx/"
fi

# =============================================================================
# PHASE 4 - (Optional) Remove data directory
# =============================================================================
if [[ "$PURGE" == "true" ]]; then
    step "PHASE 4 - Removing Installation Directory (--purge)"

    if [[ -d "$INSTALL_ROOT" ]]; then
        if [[ "$YES" != "true" ]]; then
            read -r -p "  Permanently delete $INSTALL_ROOT? This removes all logs and backups. (yes/no): " confirm2
            if [[ "$confirm2" != "yes" ]]; then
                warn "Skipping deletion of $INSTALL_ROOT"
            else
                rm -rf "$INSTALL_ROOT"
                ok "Removed: $INSTALL_ROOT"
            fi
        else
            rm -rf "$INSTALL_ROOT"
            ok "Removed: $INSTALL_ROOT"
        fi
    else
        log "  $INSTALL_ROOT does not exist - nothing to remove"
    fi

    # Remove system user
    if id "$RETAILERP_USER" &>/dev/null; then
        userdel "$RETAILERP_USER" 2>/dev/null || true
        ok "Removed system user: $RETAILERP_USER"
    fi
else
    warn "Data directory $INSTALL_ROOT was NOT removed (use --purge to delete)"
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
echo -e "${CYAN}$BORDER${NC}"
echo -e "${GREEN}  RetailERP Nginx Uninstall Complete${NC}"
echo -e "${CYAN}$BORDER${NC}"
echo ""
echo "  Removed:"
echo "    - All RetailERP systemd service units"
echo "    - Nginx site configuration (retailerp)"
if [[ "$PURGE" == "true" ]]; then
    echo "    - $INSTALL_ROOT"
    echo "    - System user '$RETAILERP_USER'"
else
    echo ""
    echo "  Retained (use --purge to remove):"
    echo "    - $INSTALL_ROOT  (binaries, logs, backups)"
    echo "    - System user '$RETAILERP_USER'"
fi
echo ""
