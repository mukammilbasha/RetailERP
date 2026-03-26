#Requires -RunAsAdministrator
# =============================================================================
# RetailERP - One-Click Full Setup & Release Pack for IIS
# =============================================================================
# Phases:
#   1  Prerequisites  - checks/installs .NET SDK, Hosting Bundle, Node.js,
#                       IIS features, iisnode, URL Rewrite
#   2  Build Backend  - dotnet publish all 8 services (Release, win-x64)
#   3  Build Frontend - npm ci + next build (standalone output)
#   4  Package        - assembles release folder + zips it
#   5  Deploy         - (optional) runs Install.ps1 on this machine right now
#
# Usage:
#   .\release-iis.ps1 -Environment prod -Version v1.2.3
#   .\release-iis.ps1 -Environment dev  -DeployNow
#   .\release-iis.ps1 -Environment prod -PackOnly
#   .\release-iis.ps1 -Environment prod -SkipBuild
#
# Output:
#   release\RetailERP-<version>-iis-<env>\   folder
#   release\RetailERP-<version>-iis-<env>.zip
# =============================================================================
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateSet('dev','qa','uat','prod')]
    [string]$Environment,

    [string]$Version,

    [switch]$DeployNow,
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
    if ($gitTag)  { $Version = $gitTag  }
    elseif ($gitHash) { $Version = $gitHash }
    else { $Version = "1.0.0" }
}

$PackName   = "RetailERP-$Version-iis-$Environment"
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
Log "  RetailERP - One-Click IIS Release Builder" 'White'
Log "  Environment : $Environment" 'White'
Log "  Version     : $Version" 'White'
Log "  Pack        : $PackZip" 'White'
Log "  Deploy Now  : $DeployNow" 'White'
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
        Fail ".NET SDK not found. Install .NET 8 SDK from https://dotnet.microsoft.com/download/dotnet/8.0 then re-run."
    }
    $sdkMajor = [int]($dotnetSdk -split '\.')[0]
    if ($sdkMajor -lt 8) {
        Warn ".NET SDK $dotnetSdk found - services target .NET 8. Consider upgrading the SDK if the build fails."
    }
    OK ".NET SDK: $dotnetSdk"

    # .NET 8 Hosting Bundle is an IIS runtime component - only needed on the TARGET server.
    # Install.ps1 (inside the release pack) handles this on the deployment target.
    # No hosting bundle needed on the build machine.

    # Node.js
    $node = Get-Command node -ErrorAction SilentlyContinue
    if (-not $node) {
        Warn "Node.js not found - downloading v20 LTS..."
        $nodeUrl = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
        $nodeMsi = "$env:TEMP\node.msi"
        Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeMsi -UseBasicParsing
        Start-Process msiexec.exe -ArgumentList "/i `"$nodeMsi`" /qn ADDLOCAL=ALL" -Wait
        $env:PATH += ";C:\Program Files\nodejs"
    }
    OK "Node.js: $(& node --version 2>$null)"

    # IIS features, iisnode, and URL Rewrite are IIS runtime components.
    # They are only needed on the TARGET deployment server, not the build machine.
    # Install.ps1 (inside the release pack) installs all IIS components on the target.

} else {
    Warn "Prereq installation skipped (-SkipPrereqs)"
}

# =============================================================================
# PHASE 2 - Build Backend (.NET)
# =============================================================================
Step "PHASE 2 - Building .NET Services"

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
            --runtime win-x64 `
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

    $envFile = Join-Path $RepoRoot "deployment\docker\frontend\.env.$Environment"
    $apiUrl  = "http://localhost:5000"
    $wsUrl   = "ws://localhost:5000/ws"
    if (Test-Path $envFile) {
        Get-Content $envFile | Where-Object { $_ -match '^NEXT_PUBLIC_API_URL=(.+)$' } |
            ForEach-Object { $apiUrl = $Matches[1].Trim() }
        Get-Content $envFile | Where-Object { $_ -match '^NEXT_PUBLIC_WS_URL=(.+)$' } |
            ForEach-Object { $wsUrl = $Matches[1].Trim() }
    }

    Log "  Installing npm dependencies..."
    Push-Location $FrontendSrc
    try {
        & npm ci --prefer-offline --loglevel error
        if ($LASTEXITCODE -ne 0) { Fail "npm ci failed" }

        $iisConfig = Join-Path $RepoRoot "deployment\frontend\next.config.deploy.js"
        if (Test-Path $iisConfig) {
            Copy-Item $iisConfig "next.config.iis.js" -Force
            $env:NEXT_CONFIG_FILE = "next.config.iis.js"
        }

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

# Copy services
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

# Copy frontend
$frontendPublish = Join-Path $PublishDir "frontend"
if (Test-Path $frontendPublish) {
    Copy-Item -Path $frontendPublish -Destination (Join-Path $PackFolder "frontend") -Recurse -Force
    OK "Packed Frontend"
} else {
    Warn "Frontend publish output missing"
}

# Copy web.config for frontend
$webConfig = Join-Path $ScriptDir "frontend-web.config"
if (Test-Path $webConfig) {
    Copy-Item $webConfig (Join-Path $PackFolder "frontend\web.config") -Force
    OK "Copied frontend web.config"
}

# Copy environment configs
$configSrc = Join-Path $RepoRoot "deployment\config"
$configDst = Join-Path $PackFolder "config"
New-Item -ItemType Directory -Path $configDst | Out-Null
if (Test-Path $configSrc) {
    foreach ($cfg in Get-ChildItem $configSrc -Filter "appsettings.*.json") {
        Copy-Item $cfg.FullName $configDst -Force
    }
    OK "Copied environment configs"
}

# Copy database scripts
$dbSrc = Join-Path $RepoRoot "database"
if (Test-Path $dbSrc) {
    Copy-Item -Path $dbSrc -Destination (Join-Path $PackFolder "database") -Recurse -Force
    OK "Copied database scripts"
}

# Embed installer scripts
$installSrc = Join-Path $ScriptDir "pack\Install.ps1"
if (Test-Path $installSrc) {
    Copy-Item $installSrc (Join-Path $PackFolder "Install.ps1") -Force
    OK "Embedded Install.ps1"
} else {
    Warn "pack\Install.ps1 not found - skipping embed"
}

$rollbackSrc = Join-Path $ScriptDir "rollback-iis.ps1"
if (Test-Path $rollbackSrc) {
    Copy-Item $rollbackSrc (Join-Path $PackFolder "Rollback.ps1") -Force
    OK "Embedded Rollback.ps1"
}

$uninstallSrc = Join-Path $ScriptDir "pack\Uninstall.ps1"
if (Test-Path $uninstallSrc) {
    Copy-Item $uninstallSrc (Join-Path $PackFolder "Uninstall.ps1") -Force
    OK "Embedded Uninstall.ps1"
}

# Write manifest.json
$manifest = [ordered]@{
    product      = "RetailERP"
    version      = $Version
    environment  = $Environment
    builtAt      = (Get-Date -Format 'o')
    builtBy      = $env:USERNAME
    machine      = $env:COMPUTERNAME
    services     = @($Services | ForEach-Object { [ordered]@{ name=$_.Name; port=$_.Port; dir=$_.Out } })
    frontendPort = $FrontendPort
    instructions = @(
        "1. Copy this folder to the target Windows Server",
        "2. Run: powershell -ExecutionPolicy Bypass -File Install.ps1 -Environment $Environment",
        "3. Monitor: C:\RetailERP\Logs\deploy-*.log",
        "4. Rollback: powershell -ExecutionPolicy Bypass -File Rollback.ps1 -Environment $Environment"
    )
}
$manifest | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $PackFolder "manifest.json")
OK "Written manifest.json"

# Write README.md (ASCII only, no backtick code fences)
$readmeDate = Get-Date -Format 'yyyy-MM-dd HH:mm'
$readmeLines = @(
    "# RetailERP IIS Release Pack - $Version ($Environment)",
    "",
    "Built: $readmeDate  |  By: $($env:USERNAME)",
    "",
    "## Quick Deploy",
    "",
    "Run on the target Windows Server (as Administrator):",
    "",
    "    powershell -ExecutionPolicy Bypass -File Install.ps1 -Environment $Environment",
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
    "",
    "## Rollback",
    "",
    "    powershell -ExecutionPolicy Bypass -File Rollback.ps1 -Environment $Environment",
    "",
    "## Logs",
    "",
    "    C:\RetailERP\Logs\"
)
($readmeLines -join "`r`n") | Set-Content (Join-Path $PackFolder "README.md") -Encoding UTF8

# Create ZIP
Log "  Creating ZIP archive..."
Compress-Archive -Path "$PackFolder\*" -DestinationPath $PackZip -Force
$zipSize = [math]::Round((Get-Item $PackZip).Length / 1MB, 1)
OK "ZIP created: $PackZip ($zipSize MB)"

# Summary
$border2 = '-' * 62
Log ""
Log $border2 'DarkGray'
Log "  Release Pack Ready" 'Green'
Log "  Folder : $PackFolder" 'White'
Log "  ZIP    : $PackZip ($zipSize MB)" 'White'
Log $border2 'DarkGray'

# =============================================================================
# PHASE 5 - Deploy (optional)
# =============================================================================
if ($DeployNow -and -not $PackOnly) {
    Step "PHASE 5 - Deploying to Local IIS"

    $installScript = Join-Path $PackFolder "Install.ps1"
    if (-not (Test-Path $installScript)) {
        $installScript = Join-Path $ScriptDir "deploy-iis.ps1"
    }

    if (Test-Path $installScript) {
        & $installScript -Environment $Environment -Version $Version -PackDir $PackFolder
        if ($LASTEXITCODE -ne 0) { Fail "Deploy step failed - see logs" }
        OK "Deployment complete"
    } else {
        Warn "Install.ps1 not found - run manually: Install.ps1 -Environment $Environment"
    }
} elseif (-not $DeployNow) {
    Log ""
    Log "  Next step - copy the ZIP to your Windows Server and run:" 'Yellow'
    Log "  powershell -ExecutionPolicy Bypass -File Install.ps1 -Environment $Environment" 'Cyan'
}

Log ""
Log "  Build log : $LogFile" 'DarkGray'
Log "  Done." 'Green'
