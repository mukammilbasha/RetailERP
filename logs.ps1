#!/usr/bin/env pwsh
<#
.SYNOPSIS
    View RetailERP service logs.

.PARAMETER Service
    Service name: auth, product, inventory, order, production, billing, reporting, gateway, frontend, db, all
    Default: all

.PARAMETER Lines
    Number of tail lines. Default: 50

.EXAMPLE
    .\logs.ps1 auth
    .\logs.ps1 gateway -Lines 100
    .\logs.ps1 all
#>
param(
    [string] $Service = "all",
    [int]    $Lines   = 50
)

$map = @{
    "auth"       = "retailerp-auth"
    "product"    = "retailerp-product"
    "inventory"  = "retailerp-inventory"
    "order"      = "retailerp-order"
    "production" = "retailerp-production"
    "billing"    = "retailerp-billing"
    "reporting"  = "retailerp-reporting"
    "gateway"    = "retailerp-gateway"
    "frontend"   = "retailerp-frontend"
    "db"         = "retailerp-sqlserver"
    "dbinit"     = "retailerp-db-init"
    "redis"      = "retailerp-redis"
}

$COMPOSE = if (Get-Command docker-compose -ErrorAction SilentlyContinue) { "docker-compose" } else { "docker compose" }

if ($Service -eq "all") {
    Invoke-Expression "$COMPOSE logs --tail=$Lines -f"
} elseif ($map.ContainsKey($Service)) {
    docker logs $map[$Service] --tail $Lines -f
} else {
    Write-Host "Unknown service '$Service'. Available: $($map.Keys -join ', '), all" -ForegroundColor Yellow
}
