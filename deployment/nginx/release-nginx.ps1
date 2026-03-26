# =============================================================================
# RetailERP - One-Click Full Build & Release Pack for Nginx (Linux)
# =============================================================================
# Phases:
#   1  Prerequisites  - checks .NET SDK, Node.js (warn only, no fail)
#   2  Build Backend  - dotnet publish all 8 services (Release, linux-x64)
#   3  Build Frontend - npm ci + next build
#   4  Package        - assembles release folder + zips it
#
# Usage:
#   .\release-nginx.ps1 -Environment prod -Version v1.2.3
#   .\release-nginx.ps1 -Environment dev  -PackOnly
#   .\release-nginx.ps1 -Environment prod -SkipBuild
#
# Output:
#   release\RetailERP-<version>-nginx-<env>\   folder
#   release\RetailERP-<version>-nginx-<env>.zip
# =============================================================================
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateSet('dev','qa','uat','prod')]
    [string]$Environment,

    [string]$Version,

    [switch]$PackOnly,
    [switch]$SkipBuild,
    [switch]$SkipPrereqs,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

# --- Paths -------------------------------------------------------------------
$ScriptDir  = $PSScriptRoot
$RepoRoot   = (Resolve-Path "$ScriptDir\..\.." ).Path
$PublishDir = Join-Path $RepoRoot "publish"
$ReleaseDir = Join-Path $ScriptDir "release"
$Timestamp  = Get-Date -Format 'yyyyMMdd-HHmmss'
$LogDir     = Join-Path $ScriptDir "release\logs"
$LogFile    = Join-Path $LogDir "release-$Timestamp.log"

# --- Resolve version ---------------------------------------------------------
if (-not $Version) {
    $gitTag  = & git -C $RepoRoot describe --tags --abbrev=0 2>$null
    $gitHash = & git -C $RepoRoot rev-parse --short HEAD 2>$null
    if ($gitTag)       { $Version = $gitTag  }
    elseif ($gitHash)  { $Version = $gitHash }
    else               { $Version = "1.0.0"  }
}

$PackName   = "RetailERP-$Version-nginx-$Environment"
$PackFolder = Join-Path $ReleaseDir $PackName
$PackZip    = "$PackFolder.zip"

# --- Service definitions -----------------------------------------------------
$Services = @(
    [pscustomobject]@{ Name='Gateway';    Port=5000; Proj="src\services\gateway\RetailERP.Gateway.csproj";                                    Out='gateway'    }
    [pscustomobject]@{ Name='Auth';       Port=5001; Proj="src\services\auth\RetailERP.Auth.API\RetailERP.Auth.API.csproj";                    Out='auth'       }
    [pscustomobject]@{ Name='Product';    Port=5002; Proj="src\services\product\RetailERP.Product.API\RetailERP.Product.API.csproj";            Out='product'    }
    [pscustomobject]@{ Name='Inventory';  Port=5003; Proj="src\services\inventory\RetailERP.Inventory.API\RetailERP.Inventory.API.csproj";      Out='inventory'  }
    [pscustomobject]@{ Name='Order';      Port=5004; Proj="src\services\order\RetailERP.Order.API\RetailERP.Order.API.csproj";                  Out='order'      }
    [pscustomobject]@{ Name='Production'; Port=5005; Proj="src\services\production\RetailERP.Production.API\RetailERP.Production.API.csproj";   Out='production' }
    [pscustomobject]@{ Name='Billing';    Port=5006; Proj="src\services\billing\RetailERP.Billing.API\RetailERP.Billing.API.csproj";            Out='billing'    }
    [pscustomobject]@{ Name='Reporting';  Port=5007; Proj="src\services\reporting\RetailERP.Reporting.API\RetailERP.Reporting.API.csproj";      Out='reporting'  }
)
$FrontendSrc  = Join-Path $RepoRoot "src\frontend"
$FrontendPort = 3003

# --- Logging helpers ---------------------------------------------------------
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

function Log([string]$msg, [string]$color = 'White') {
    $line = "[$(Get-Date -Format 'HH:mm:ss')] $msg"
    Write-Host $line -ForegroundColor $color
    Add-Content -Path $LogFile -Value $line -ErrorAction SilentlyContinue
}
function Step([string]$m) { Log "  --- $m ---" 'Cyan' }
function OK([string]$m)   { Log "  [OK] $m" 'Green' }
function Warn([string]$m) { Log "  [!!] $m" 'Yellow' }
function Fail([string]$m) { Log "  [XX] $m" 'Red'; throw $m }

# --- Banner ------------------------------------------------------------------
$border = '=' * 62
Log $border 'DarkCyan'
Log "  RetailERP - One-Click Nginx Release Builder" 'White'
Log "  Target      : Ubuntu 22.04/20.04 Linux + Nginx" 'White'
Log "  Environment : $Environment" 'White'
Log "  Version     : $Version" 'White'
Log "  Pack        : $PackZip" 'White'
Log "  Skip Build  : $SkipBuild" 'White'
Log $border 'DarkCyan'

# =============================================================================
# PHASE 1 - Prerequisites
# =============================================================================
Step "PHASE 1 - Checking Prerequisites"

if (-not $SkipPrereqs) {

    # .NET SDK
    $dotnetSdk = & dotnet --version 2>$null
    if (-not $dotnetSdk) {
        Warn ".NET SDK not found. Install .NET 8 SDK from https://dotnet.microsoft.com/download/dotnet/8.0"
        Warn "Build will likely fail without .NET SDK."
    } else {
        $sdkMajor = [int]($dotnetSdk -split '\.')[0]
        if ($sdkMajor -lt 8) {
            Warn ".NET SDK $dotnetSdk found - services target .NET 8. Consider upgrading if build fails."
        }
        OK ".NET SDK: $dotnetSdk"
    }

    # Node.js
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeCmd) {
        Warn "Node.js not found. Install Node.js 20 LTS from https://nodejs.org/"
        Warn "Frontend build will fail without Node.js."
    } else {
        OK "Node.js: $(& node --version 2>$null)"
    }

} else {
    Warn "Prereq checks skipped (-SkipPrereqs)"
}

# =============================================================================
# PHASE 2 - Build Backend (.NET) for linux-x64
# =============================================================================
Step "PHASE 2 - Building .NET Services (linux-x64)"

if (-not $SkipBuild) {
    Log "  Restoring NuGet packages..."
    $slnFile = Join-Path $RepoRoot "RetailERP.sln"
    if (Test-Path $slnFile) {
        & dotnet restore $slnFile --nologo -v q
        if ($LASTEXITCODE -ne 0) { Fail "NuGet restore failed" }
    }

    $failed = @()
    foreach ($svc in $Services) {
        $projPath = Join-Path $RepoRoot $svc.Proj
        if (-not (Test-Path $projPath)) {
            Warn "Project not found, skipping: $($svc.Proj)"
            continue
        }
        $outDir = Join-Path $PublishDir $svc.Out
        Log "  Building $($svc.Name)..." 'DarkGray'
        & dotnet publish $projPath `
            --configuration Release `
            --runtime linux-x64 `
            --self-contained false `
            --output $outDir `
            --nologo -v q `
            /p:EnvironmentName=$Environment
        if ($LASTEXITCODE -ne 0) {
            Warn "Build FAILED for $($svc.Name)"
            $failed += $svc.Name
        } else {
            OK "$($svc.Name) -> publish\$($svc.Out)"
        }
    }
    if ($failed.Count -gt 0) { Fail "Build failed for: $($failed -join ', ')" }
} else {
    Warn "Backend build skipped (-SkipBuild)"
    if (-not (Test-Path $PublishDir)) { Fail "publish/ directory missing and -SkipBuild was set" }
}

# =============================================================================
# PHASE 3 - Build Frontend (Next.js)
# =============================================================================
Step "PHASE 3 - Building Next.js Frontend"

if (-not $SkipBuild) {
    if (-not (Test-Path $FrontendSrc)) { Fail "Frontend source not found: $FrontendSrc" }

    $apiUrl = "http://localhost:5000"
    $wsUrl  = "ws://localhost:5000/ws"

    Log "  Installing npm dependencies..."
    Push-Location $FrontendSrc
    try {
        & npm ci --prefer-offline --loglevel error
        if ($LASTEXITCODE -ne 0) { Fail "npm ci failed" }

        Log "  Running next build (standalone)..."
        $env:NEXT_PUBLIC_API_URL     = $apiUrl
        $env:NEXT_PUBLIC_WS_URL      = $wsUrl
        $env:NEXT_PUBLIC_APP_ENV     = $Environment
        $env:NEXT_PUBLIC_APP_VERSION = $Version
        $env:NEXTJS_OUTPUT           = "standalone"

        & npm run build
        if ($LASTEXITCODE -ne 0) { Fail "next build failed" }
    } finally {
        Pop-Location
    }

    $standaloneDir = Join-Path $FrontendSrc ".next\standalone"
    $frontendOut   = Join-Path $PublishDir "frontend"
    if (Test-Path $standaloneDir) {
        if (Test-Path $frontendOut) { Remove-Item $frontendOut -Recurse -Force }
        Copy-Item -Path $standaloneDir -Destination $frontendOut -Recurse -Force
        $publicSrc = Join-Path $FrontendSrc "public"
        if (Test-Path $publicSrc) {
            Copy-Item -Path $publicSrc -Destination "$frontendOut\public" -Recurse -Force
        }
        $staticSrc = Join-Path $FrontendSrc ".next\static"
        if (Test-Path $staticSrc) {
            New-Item -ItemType Directory -Path "$frontendOut\.next\static" -Force | Out-Null
            Copy-Item -Path $staticSrc -Destination "$frontendOut\.next\static" -Recurse -Force
        }
        OK "Frontend -> publish\frontend"
    } else {
        Warn "Standalone output not found - copying full .next output"
        if (Test-Path $frontendOut) { Remove-Item $frontendOut -Recurse -Force }
        Copy-Item -Path (Join-Path $FrontendSrc ".next") -Destination "$frontendOut\.next" -Recurse -Force
        Copy-Item -Path $FrontendSrc -Destination $frontendOut -Recurse -Force -Exclude @('.next','node_modules')
        OK "Frontend (full) -> publish\frontend"
    }
} else {
    Warn "Frontend build skipped (-SkipBuild)"
}

# =============================================================================
# PHASE 4 - Assemble Release Pack
# =============================================================================
Step "PHASE 4 - Assembling Release Pack"

if (Test-Path $PackFolder) {
    if (-not $Force) {
        $ans = Read-Host "  Pack already exists: $PackName. Overwrite? (yes/no)"
        if ($ans -ne 'yes') { Log "Aborted."; exit 0 }
    }
    Remove-Item $PackFolder -Recurse -Force
}
if (Test-Path $PackZip) { Remove-Item $PackZip -Force }

New-Item -ItemType Directory -Path $PackFolder | Out-Null

# --- services/ ---------------------------------------------------------------
$servicesDir = Join-Path $PackFolder "services"
New-Item -ItemType Directory -Path $servicesDir | Out-Null

foreach ($svc in $Services) {
    $src = Join-Path $PublishDir $svc.Out
    if (Test-Path $src) {
        $dst = Join-Path $servicesDir $svc.Out
        Copy-Item -Path $src -Destination $dst -Recurse -Force
        OK "Packed $($svc.Name)"
    } else {
        Warn "Missing publish output for $($svc.Name) - skipped"
    }
}

# --- frontend/ ---------------------------------------------------------------
$frontendPublish = Join-Path $PublishDir "frontend"
if (Test-Path $frontendPublish) {
    Copy-Item -Path $frontendPublish -Destination (Join-Path $PackFolder "frontend") -Recurse -Force
    OK "Packed Frontend"
} else {
    Warn "Frontend publish output missing"
}

# --- nginx/ ------------------------------------------------------------------
$nginxSrcDir = Join-Path $ScriptDir "pack\nginx"
$nginxDstDir = Join-Path $PackFolder "nginx"
New-Item -ItemType Directory -Path $nginxDstDir | Out-Null
if (Test-Path $nginxSrcDir) {
    Copy-Item -Path "$nginxSrcDir\*" -Destination $nginxDstDir -Recurse -Force
    OK "Copied nginx config"
} else {
    Warn "pack\nginx\ not found - nginx config will be missing from pack"
}

# --- systemd/ ----------------------------------------------------------------
$systemdDstDir = Join-Path $PackFolder "systemd"
New-Item -ItemType Directory -Path $systemdDstDir | Out-Null

$connStr = "Server=localhost;Database=RetailERP;User Id=ERPAdmin;Password=ERP@admin;TrustServerCertificate=true;MultipleActiveResultSets=true"

foreach ($svc in $Services) {
    $svcNameLower = $svc.Name.ToLower()
    $unitLines = @(
        "[Unit]",
        "Description=RetailERP $($svc.Name) Service",
        "After=network.target",
        "",
        "[Service]",
        "Type=simple",
        "User=retailerp",
        "WorkingDirectory=/opt/retailerp/services/$svcNameLower",
        "ExecStart=/usr/bin/dotnet /opt/retailerp/services/$svcNameLower/RetailERP.$($svc.Name).dll",
        "Restart=always",
        "RestartSec=10",
        "Environment=ASPNETCORE_ENVIRONMENT=$Environment",
        "Environment=ASPNETCORE_URLS=http://127.0.0.1:$($svc.Port)",
        "Environment=`"ConnectionStrings__DefaultConnection=$connStr`"",
        "",
        "[Install]",
        "WantedBy=multi-user.target"
    )
    $unitFile = Join-Path $systemdDstDir "retailerp-$svcNameLower.service"
    ($unitLines -join "`n") | Set-Content $unitFile -Encoding UTF8
}

# Frontend systemd unit
$feUnitLines = @(
    "[Unit]",
    "Description=RetailERP Frontend (Next.js)",
    "After=network.target",
    "",
    "[Service]",
    "Type=simple",
    "User=retailerp",
    "WorkingDirectory=/opt/retailerp/frontend",
    "ExecStart=/usr/bin/node /opt/retailerp/frontend/server.js",
    "Restart=always",
    "RestartSec=10",
    "Environment=NODE_ENV=production",
    "Environment=PORT=$FrontendPort",
    "Environment=HOSTNAME=127.0.0.1",
    "",
    "[Install]",
    "WantedBy=multi-user.target"
)
$feUnitFile = Join-Path $systemdDstDir "retailerp-frontend.service"
($feUnitLines -join "`n") | Set-Content $feUnitFile -Encoding UTF8
OK "Generated systemd unit files"

# --- scripts/ ----------------------------------------------------------------
$scriptsDstDir = Join-Path $PackFolder "scripts"
New-Item -ItemType Directory -Path $scriptsDstDir | Out-Null

$installSrc   = Join-Path $ScriptDir "pack\install.sh"
$uninstallSrc = Join-Path $ScriptDir "pack\uninstall.sh"

if (Test-Path $installSrc) {
    Copy-Item $installSrc (Join-Path $scriptsDstDir "install.sh") -Force
    OK "Copied install.sh"
} else {
    Warn "pack\install.sh not found - skipping"
}
if (Test-Path $uninstallSrc) {
    Copy-Item $uninstallSrc (Join-Path $scriptsDstDir "uninstall.sh") -Force
    OK "Copied uninstall.sh"
} else {
    Warn "pack\uninstall.sh not found - skipping"
}

# --- database/ ---------------------------------------------------------------
$dbSrc = Join-Path $RepoRoot "database"
if (Test-Path $dbSrc) {
    Copy-Item -Path $dbSrc -Destination (Join-Path $PackFolder "database") -Recurse -Force
    OK "Copied database scripts"
}

# --- manifest.json -----------------------------------------------------------
$manifest = [ordered]@{
    product      = "RetailERP"
    version      = $Version
    environment  = $Environment
    platform     = "nginx-linux"
    builtAt      = (Get-Date -Format 'o')
    builtBy      = $env:USERNAME
    machine      = $env:COMPUTERNAME
    services     = @($Services | ForEach-Object { [ordered]@{ name=$_.Name; port=$_.Port; dir=$_.Out } })
    frontendPort = $FrontendPort
    instructions = @(
        "1. Copy this folder (or extract the ZIP) to the Ubuntu target server",
        "2. chmod +x scripts/install.sh && sudo scripts/install.sh",
        "3. Monitor: journalctl -u retailerp-gateway -f",
        "4. Uninstall: sudo scripts/uninstall.sh"
    )
}
$manifest | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $PackFolder "manifest.json") -Encoding UTF8
OK "Written manifest.json"

# --- README.md ---------------------------------------------------------------
$readmeDate = Get-Date -Format 'yyyy-MM-dd HH:mm'
$readmeLines = @(
    "# RetailERP Nginx Release Pack - $Version ($Environment)",
    "",
    "Built: $readmeDate  |  By: $($env:USERNAME)",
    "Target: Ubuntu 22.04/20.04 + Nginx",
    "",
    "## Quick Deploy",
    "",
    "Copy the ZIP to the Ubuntu server and run:",
    "",
    "    unzip RetailERP-$Version-nginx-$Environment.zip",
    "    cd RetailERP-$Version-nginx-$Environment",
    "    chmod +x scripts/install.sh",
    "    sudo ./scripts/install.sh",
    "",
    "## Services",
    "",
    "| Service     | Port |",
    "|-------------|------|",
    "| Gateway     | 5000 |",
    "| Auth        | 5001 |",
    "| Product     | 5002 |",
    "| Inventory   | 5003 |",
    "| Order       | 5004 |",
    "| Production  | 5005 |",
    "| Billing     | 5006 |",
    "| Reporting   | 5007 |",
    "| Frontend    | 3003 |",
    "| Nginx HTTP  | 80   |",
    "",
    "## Uninstall",
    "",
    "    sudo ./scripts/uninstall.sh",
    "",
    "## Logs",
    "",
    "    journalctl -u retailerp-gateway -f",
    "    tail -f /opt/retailerp/logs/install.log"
)
($readmeLines -join "`r`n") | Set-Content (Join-Path $PackFolder "README.md") -Encoding UTF8

# --- ZIP ---------------------------------------------------------------------
Log "  Creating ZIP archive..."
Compress-Archive -Path "$PackFolder\*" -DestinationPath $PackZip -Force
$zipSize = [math]::Round((Get-Item $PackZip).Length / 1MB, 1)
OK "ZIP created: $PackZip ($zipSize MB)"

# --- Summary -----------------------------------------------------------------
$border2 = '-' * 62
Log ""
Log $border2 'DarkGray'
Log "  Release Pack Ready" 'Green'
Log "  Folder : $PackFolder" 'White'
Log "  ZIP    : $PackZip ($zipSize MB)" 'White'
Log $border2 'DarkGray'
Log ""
Log "  Next step - copy the ZIP to your Ubuntu server and run:" 'Yellow'
Log "    chmod +x scripts/install.sh && sudo ./scripts/install.sh" 'Cyan'
Log ""
Log "  Build log : $LogFile" 'DarkGray'
Log "  Done." 'Green'
