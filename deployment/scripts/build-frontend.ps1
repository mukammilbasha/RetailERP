#Requires -Version 5.1
# ============================================================
# RetailERP — Frontend Docker Build Script (PowerShell)
# Usage: .\build-frontend.ps1 -Env dev [-Push] [-Registry URL] [-Version TAG]
# ============================================================
[CmdletBinding()]
param(
    [ValidateSet('dev','qa','uat','prod')]
    [string]$Env = 'dev',
    [switch]$Push,
    [string]$Registry = 'ghcr.io/retailerp',
    [string]$Version = (& git rev-parse --short HEAD 2>$null) ?? 'latest'
)

$ErrorActionPreference = 'Stop'
$RootDir = (Resolve-Path "$PSScriptRoot\..\..")
$EnvFile = "$RootDir\deployment\docker\frontend\.env.$Env"

if (-not (Test-Path $EnvFile)) {
    Write-Error "Environment file not found: $EnvFile"; exit 1
}

# Load env file
$envVars = @{}
Get-Content $EnvFile | Where-Object { $_ -match '^([^#=]+)=(.*)$' } | ForEach-Object {
    $envVars[$Matches[1].Trim()] = $Matches[2].Trim()
}

$ImageName    = "$Registry/retailerp-frontend"
$ImageTag     = "${ImageName}:${Version}"
$ImageEnvTag  = "${ImageName}:latest-${Env}"

Write-Host "`n=== RetailERP Frontend Build ===" -ForegroundColor Cyan
Write-Host "  Env:     $Env"
Write-Host "  Version: $Version"

Write-Host "`n-> Building Docker image..." -ForegroundColor Yellow

$buildArgs = @(
    'build'
    '--file', "$RootDir\deployment\docker\frontend\Frontend.Dockerfile"
    '--build-arg', "NEXT_PUBLIC_API_URL=$($envVars['NEXT_PUBLIC_API_URL'])"
    '--build-arg', "NEXT_PUBLIC_AUTH_API_URL=$($envVars['NEXT_PUBLIC_AUTH_API_URL'] ?? $envVars['NEXT_PUBLIC_API_URL'])"
    '--build-arg', "NEXT_PUBLIC_WS_URL=$($envVars['NEXT_PUBLIC_WS_URL'])"
    '--build-arg', "NEXT_PUBLIC_ENV=$Env"
    '--build-arg', "NEXT_PUBLIC_APP_VERSION=$Version"
    '--tag', $ImageTag
    '--tag', $ImageEnvTag
    $RootDir.Path
)

& docker @buildArgs
if ($LASTEXITCODE -ne 0) { Write-Error "Docker build failed"; exit 1 }
Write-Host "  [OK] Built: $ImageTag" -ForegroundColor Green

if ($Push) {
    Write-Host "`n-> Pushing to registry..." -ForegroundColor Yellow
    docker push $ImageTag
    docker push $ImageEnvTag
    if ($LASTEXITCODE -ne 0) { Write-Error "Push failed"; exit 1 }
    Write-Host "  [OK] Pushed: $ImageTag" -ForegroundColor Green
}

Write-Host "`n=== Frontend build complete ===" -ForegroundColor Green
