#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Stop all RetailERP Docker containers.

.PARAMETER Remove
    Also remove containers (keep volumes/data).

.PARAMETER Clean
    Remove containers AND all volumes (wipes all data).
#>
param(
    [switch] $Remove,
    [switch] $Clean
)

Write-Host "RetailERP — Stopping services..." -ForegroundColor Cyan

$COMPOSE = if (Get-Command docker-compose -ErrorAction SilentlyContinue) { "docker-compose" } else { "docker compose" }

if ($Clean) {
    Write-Host "  [!!] Removing containers + volumes (all data wiped)" -ForegroundColor Yellow
    Invoke-Expression "$COMPOSE down --volumes --remove-orphans"
} elseif ($Remove) {
    Write-Host "  Removing containers (data preserved in volumes)" -ForegroundColor Yellow
    Invoke-Expression "$COMPOSE down --remove-orphans"
} else {
    Invoke-Expression "$COMPOSE stop"
}

Write-Host "  [OK] Done" -ForegroundColor Green
