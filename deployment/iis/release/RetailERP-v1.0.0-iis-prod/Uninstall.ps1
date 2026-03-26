#Requires -RunAsAdministrator
# ==============================================================================
# RetailERP - IIS Clean Uninstall / Removal Script
# Removes all IIS sites, app pools, firewall rules, and (optionally) files.
# ==============================================================================
[CmdletBinding()]
param(
    [string]$DeployRoot  = "C:\RetailERP",
    [string]$BackupRoot  = "C:\RetailERP\Backups",
    [switch]$RemoveFiles,     # also delete C:\RetailERP\  (USE WITH CAUTION)
    [switch]$NonInteractive
)

$ErrorActionPreference = 'Stop'
Import-Module WebAdministration -ErrorAction Stop

function Log([string]$m, [string]$c='White') { Write-Host $m -ForegroundColor $c }
function OK([string]$m)  { Log "  [OK] $m" 'Green' }
function Warn([string]$m){ Log "  [!!] $m" 'Yellow' }

$Services = @('Gateway','Auth','Product','Inventory','Order','Production','Billing','Reporting')
$Ports    = @{ Gateway=5000;Auth=5001;Product=5002;Inventory=5003;Order=5004;Production=5005;Billing=5006;Reporting=5007;Frontend=3003 }

Log ""
Log "  RetailERP IIS Uninstall" 'Red'
Log "  Sites, app pools, and firewall rules will be removed." 'Yellow'
if ($RemoveFiles) { Log "  [!!] -RemoveFiles: $DeployRoot will be deleted!" 'Red' }
Log ""

if (-not $NonInteractive) {
    $ans = Read-Host "  Type REMOVE to confirm uninstall"
    if ($ans -ne 'REMOVE') { Log "Aborted."; exit 0 }
}

# Stop + remove sites
foreach ($svc in @($Services) + @('Frontend')) {
    $site = "RetailERP-$svc"
    if (Get-Website -Name $site -ErrorAction SilentlyContinue) {
        Stop-Website -Name $site -ErrorAction SilentlyContinue
        Remove-Website -Name $site
        OK "Removed site: $site"
    }
}

# Stop + remove app pools
foreach ($svc in @($Services) + @('Frontend')) {
    $pool = "RetailERP-$svc"
    if (Test-Path "IIS:\AppPools\$pool") {
        if ((Get-WebAppPoolState -Name $pool).Value -eq 'Started') {
            Stop-WebAppPool -Name $pool -ErrorAction SilentlyContinue
        }
        Remove-WebAppPool -Name $pool
        OK "Removed pool: $pool"
    }
}

# Remove firewall rules
foreach ($svc in @($Services) + @('Frontend')) {
    $fwName = "RetailERP $svc"
    Get-NetFirewallRule -DisplayName $fwName -ErrorAction SilentlyContinue |
        Remove-NetFirewallRule -ErrorAction SilentlyContinue
    OK "Removed firewall rule: $fwName"
}

# Optionally delete deploy files (keeps backups by default)
if ($RemoveFiles) {
    if (Test-Path $DeployRoot) {
        Remove-Item $DeployRoot -Recurse -Force
        OK "Deleted: $DeployRoot"
    }
} else {
    Warn "Files retained at $DeployRoot  (use -RemoveFiles to delete)"
    Warn "Backups retained at $BackupRoot"
}

Log ""
Log "  RetailERP uninstall complete." 'Green'
