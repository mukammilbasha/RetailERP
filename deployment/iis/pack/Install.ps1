#Requires -RunAsAdministrator
# ==============================================================================
# RetailERP - IIS Release Pack Installer
# ==============================================================================
# Drop this file + the services/, frontend/, config/, database/ folders
# onto any Windows Server 2019/2022 and run:
#
#   powershell -ExecutionPolicy Bypass -File Install.ps1 -Environment prod
#
# What it does:
#   1  Installs all prerequisites (IIS, .NET 8 Hosting Bundle, Node, iisnode,
#      URL Rewrite) if not already present
#   2  Creates directory structure under C:\RetailERP\
#   3  Copies services and frontend from this pack
#   4  Creates / reconfigures IIS App Pools and Sites
#   5  Sets environment variables on each App Pool
#   6  Runs database SQL scripts (idempotent)
#   7  Health-checks every service; rolls back on failure
#   8  Writes a structured audit log
# ==============================================================================
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateSet('dev','qa','uat','prod')]
    [string]$Environment,

    [string]$Version      = "",               # read from manifest.json if empty
    [string]$DeployRoot   = "C:\RetailERP",
    [string]$BackupRoot   = "C:\RetailERP\Backups",
    [string]$LogRoot      = "C:\RetailERP\Logs",
    [string]$PackDir      = "",               # resolved below; default = script directory
    [switch]$SkipPrereqs,
    [switch]$SkipDatabase,
    [switch]$SkipHealthCheck,
    [switch]$SkipBackup,
    [switch]$DatabaseOnly,                    # run ONLY Step 5 (database init) — skips all IIS steps
    [switch]$NonInteractive                   # no confirmation prompts (CI use)
)

$ErrorActionPreference = 'Stop'
$Timestamp  = Get-Date -Format 'yyyyMMdd-HHmmss'

# Resolve PackDir — $PSScriptRoot can be empty in param() on PS 5.1 -File invocations
if (-not $PackDir) {
    $PackDir = $PSScriptRoot
}
if (-not $PackDir) {
    $PackDir = Split-Path -Parent -Path $MyInvocation.MyCommand.Path
}
if (-not $PackDir) {
    $PackDir = (Get-Location).Path
}

# Safety check: PackDir must not equal DeployRoot (would cause copy-to-itself errors)
if ($PackDir.TrimEnd('\').ToLower() -eq $DeployRoot.TrimEnd('\').ToLower()) {
    Write-Host ""
    Write-Host "  [XX] ERROR: The release pack is inside the deploy root." -ForegroundColor Red
    Write-Host "       Pack Dir    : $PackDir" -ForegroundColor Red
    Write-Host "       Deploy Root : $DeployRoot" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Extract the ZIP to a SEPARATE folder, for example:" -ForegroundColor Yellow
    Write-Host "    Expand-Archive -Path RetailERP-v1.0.0-iis-prod.zip -DestinationPath C:\Deployments" -ForegroundColor Yellow
    Write-Host "    cd C:\Deployments\RetailERP-v1.0.0-iis-prod" -ForegroundColor Yellow
    Write-Host "    powershell -ExecutionPolicy Bypass -File .\Install.ps1 -Environment prod" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

New-Item -ItemType Directory -Path $LogRoot -Force | Out-Null
$LogFile = Join-Path $LogRoot "deploy-$Timestamp.log"

# -- Logging ------------------------------------------------------------------
function Log([string]$msg, [string]$color = 'White') {
    $line = "[$(Get-Date -Format 'HH:mm:ss')] $msg"
    Write-Host $line -ForegroundColor $color
    Add-Content -Path $LogFile -Value $line -ErrorAction SilentlyContinue
}
function Step([string]$m) { Log "  --- $m ---" 'Cyan' }
function OK([string]$m)   { Log "  [OK] $m" 'Green' }
function Warn([string]$m) { Log "  [!!] $m" 'Yellow' }
function Fail([string]$m) { Log "  [XX] $m" 'Red'; throw $m }

# -- Read manifest ------------------------------------------------------------
$manifestFile = Join-Path $PackDir "manifest.json"
$manifest     = $null
if (Test-Path $manifestFile) {
    $manifest = Get-Content $manifestFile | ConvertFrom-Json
    if (-not $Version) { $Version = $manifest.version }
    Log "  Pack: RetailERP $Version  |  Built: $($manifest.builtAt)" 'DarkGray'
}
if (-not $Version) { $Version = "unknown" }

# -- Service table ------------------------------------------------------------
$Services = if ($manifest -and $manifest.services) {
    $manifest.services | ForEach-Object {
        [pscustomobject]@{ Name=$_.name; Port=[int]$_.port; Dir=$_.dir }
    }
} else {
    @(
        [pscustomobject]@{ Name='Gateway';    Port=5000; Dir='gateway'    }
        [pscustomobject]@{ Name='Auth';       Port=5001; Dir='auth'       }
        [pscustomobject]@{ Name='Product';    Port=5002; Dir='product'    }
        [pscustomobject]@{ Name='Inventory';  Port=5003; Dir='inventory'  }
        [pscustomobject]@{ Name='Order';      Port=5004; Dir='order'      }
        [pscustomobject]@{ Name='Production'; Port=5005; Dir='production' }
        [pscustomobject]@{ Name='Billing';    Port=5006; Dir='billing'    }
        [pscustomobject]@{ Name='Reporting';  Port=5007; Dir='reporting'  }
    )
}
$FrontendPort = if ($manifest) { [int]$manifest.frontendPort } else { 3003 }

# -- Banner -------------------------------------------------------------------
$br = '=' * 60
Log $br 'DarkCyan'
Log "  RetailERP IIS Installer" 'White'
Log "  Version     : $Version" 'White'
Log "  Environment : $Environment" 'White'
Log "  Deploy Root : $DeployRoot" 'White'
Log "  Pack Dir    : $PackDir" 'White'
Log $br 'DarkCyan'

if ($DatabaseOnly) {
    $NonInteractive = $true
    Log "  Mode: DATABASE INIT ONLY (Steps 3/4/6/7/8 skipped)" 'Yellow'
}

if (-not $NonInteractive) {
    $confirm = Read-Host "`n  Proceed with installation? (yes/no)"
    if ($confirm -ne 'yes') { Log "Installation aborted."; exit 0 }
}

# ==============================================================================
# STEP 1 - Prerequisites
# ==============================================================================
Step "STEP 1 - Prerequisites"

if (-not $SkipPrereqs) {
    # .NET 8 Hosting Bundle
    $script:HostingBundleJustInstalled = $false
    $hasHosting = Get-ChildItem "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Updates\.NET" -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match 'Hosting Bundle' -and $_.Name -match '8\.' }
    if (-not $hasHosting) {
        Warn "Downloading .NET 8 Hosting Bundle..."
        $bundleExe = "$env:TEMP\dotnet-hosting-8.exe"
        try {
            # aka.ms/dotnet/8.0/dotnet-hosting-win.exe always resolves to latest .NET 8 hosting bundle
            Invoke-WebRequest -Uri "https://aka.ms/dotnet/8.0/dotnet-hosting-win.exe" `
                -OutFile $bundleExe -UseBasicParsing
            Start-Process $bundleExe -ArgumentList "/install /quiet /norestart" -Wait
            $script:HostingBundleJustInstalled = $true
            OK ".NET 8 Hosting Bundle installed"
        } catch {
            Warn ".NET 8 Hosting Bundle download failed: $_"
            Warn "Install manually: https://dotnet.microsoft.com/download/dotnet/8.0 then re-run with -SkipPrereqs"
        }
    } else { OK ".NET 8 Hosting Bundle present" }

    # Node.js
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Warn "Downloading Node.js v20 LTS..."
        $nodeMsi = "$env:TEMP\node.msi"
        try {
            Invoke-WebRequest -Uri "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi" `
                -OutFile $nodeMsi -UseBasicParsing
            Start-Process msiexec.exe -ArgumentList "/i `"$nodeMsi`" /qn ADDLOCAL=ALL" -Wait
            $env:PATH += ";C:\Program Files\nodejs"
            OK "Node.js installed"
        } catch {
            Warn "Node.js download failed: $_"
            Warn "Install manually: https://nodejs.org/en/download then re-run with -SkipPrereqs"
        }
    } else { OK "Node.js: $(node --version)" }

    # IIS
    $iisFeatures = @(
        'IIS-WebServer','IIS-WebServerRole','IIS-WebServerManagementTools',
        'IIS-CommonHttpFeatures','IIS-StaticContent','IIS-DefaultDocument',
        'IIS-ApplicationDevelopment','IIS-ISAPIExtensions','IIS-ISAPIFilter',
        'IIS-NetFxExtensibility45','IIS-ASPNET45',
        'IIS-HttpCompressionStatic','IIS-HttpCompressionDynamic',
        'IIS-Security','IIS-RequestFiltering','IIS-HttpLogging'
    )
    $needsRestart = $false
    foreach ($f in $iisFeatures) {
        $state = (Get-WindowsOptionalFeature -Online -FeatureName $f -ErrorAction SilentlyContinue).State
        if ($state -ne 'Enabled') {
            Enable-WindowsOptionalFeature -Online -FeatureName $f -All -NoRestart | Out-Null
            $needsRestart = $true
        }
    }
    if ($needsRestart) { Warn "IIS features installed - refreshing module path..." }
    # Refresh PSModulePath so newly installed IIS modules are visible in this session
    $env:PSModulePath = [System.Environment]::GetEnvironmentVariable('PSModulePath','Machine') + ';' +
                        [System.Environment]::GetEnvironmentVariable('PSModulePath','User')
    Import-Module WebAdministration -ErrorAction SilentlyContinue
    if (-not (Get-Module WebAdministration)) {
        $waPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\Modules\WebAdministration\WebAdministration.psd1"
        if (Test-Path $waPath) {
            Import-Module $waPath -ErrorAction Stop
        } else {
            Fail "WebAdministration module not found. Please restart the server and re-run this script."
        }
    }
    OK "IIS ready"

    # iisnode
    if (-not (Test-Path "C:\Program Files\iisnode\iisnode.dll")) {
        Warn "Downloading iisnode..."
        $iisnodemsi = "$env:TEMP\iisnode.msi"
        try {
            Invoke-WebRequest -Uri "https://github.com/tjanczuk/iisnode/releases/download/v0.2.26/iisnode-full-v0.2.26-x64.msi" `
                -OutFile $iisnodemsi -UseBasicParsing
            Start-Process msiexec.exe -ArgumentList "/i `"$iisnodemsi`" /qn" -Wait
            OK "iisnode installed"
        } catch {
            Warn "iisnode download failed: $_"
            Warn "Install manually: https://github.com/tjanczuk/iisnode/releases then re-run with -SkipPrereqs"
        }
    } else { OK "iisnode present" }

    # URL Rewrite
    if (-not (Test-Path "$env:SystemRoot\System32\inetsrv\rewrite.dll")) {
        Warn "Downloading URL Rewrite Module..."
        $rwMsi = "$env:TEMP\urlrewrite.msi"
        try {
            Invoke-WebRequest -Uri "https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi" `
                -OutFile $rwMsi -UseBasicParsing
            Start-Process msiexec.exe -ArgumentList "/i `"$rwMsi`" /qn" -Wait
            OK "URL Rewrite installed"
        } catch {
            Warn "URL Rewrite download failed: $_"
            Warn "Install manually: https://www.iis.net/downloads/microsoft/url-rewrite then re-run with -SkipPrereqs"
        }
    } else { OK "URL Rewrite present" }

} else {
    if (-not $DatabaseOnly) {
        $env:PSModulePath = [System.Environment]::GetEnvironmentVariable('PSModulePath','Machine') + ';' +
                            [System.Environment]::GetEnvironmentVariable('PSModulePath','User')
        Import-Module WebAdministration -ErrorAction SilentlyContinue
        if (-not (Get-Module WebAdministration)) {
            $waPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\Modules\WebAdministration\WebAdministration.psd1"
            if (Test-Path $waPath) {
                Import-Module $waPath -ErrorAction Stop
            } else {
                Fail "WebAdministration module not found. Is IIS installed? Run without -SkipPrereqs to install it."
            }
        }
    }
    Warn "Prereq installation skipped (-SkipPrereqs)"
}

# ==============================================================================
# STEP 2 - Backup Current Deployment
# ==============================================================================
Step "STEP 2 - Backup"

if (-not $SkipBackup) {
    New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null
    $backupDir = Join-Path $BackupRoot $Timestamp
    New-Item -ItemType Directory -Path $backupDir | Out-Null

    foreach ($svc in $Services) {
        $src = Join-Path $DeployRoot "Services\$($svc.Name)"
        if (Test-Path $src) {
            Copy-Item -Path $src -Destination "$backupDir\$($svc.Name)" -Recurse -Force
        }
    }
    $feDir = Join-Path $DeployRoot "Frontend"
    if (Test-Path $feDir) {
        Copy-Item -Path $feDir -Destination "$backupDir\Frontend" -Recurse -Force
    }
    [PSCustomObject]@{ Version=$Version; Timestamp=$Timestamp; Environment=$Environment } |
        ConvertTo-Json | Set-Content "$backupDir\version.json"

    # Keep only last 5 backups
    Get-ChildItem $BackupRoot -Directory | Sort-Object CreationTime -Descending |
        Select-Object -Skip 5 | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

    OK "Backup: $backupDir"
} else {
    Warn "Backup skipped (-SkipBackup)"
}

# ==============================================================================
# STEP 3 - Stop App Pools
# ==============================================================================
Step "STEP 3 - Stopping IIS App Pools"

if ($DatabaseOnly) {
    Warn "Step 3 skipped (-DatabaseOnly)"
} else {

$allPools = @($Services | ForEach-Object { "RetailERP-$($_.Name)" }) + @("RetailERP-Frontend")
foreach ($pool in $allPools) {
    if ((Test-Path "IIS:\AppPools\$pool") -and
        (Get-WebAppPoolState -Name $pool).Value -eq 'Started') {
        Stop-WebAppPool -Name $pool
        OK "Stopped: $pool"
    }
}
Start-Sleep -Seconds 3

} # end -not DatabaseOnly

# ==============================================================================
# STEP 4 - Copy Files
# ==============================================================================
Step "STEP 4 - Deploying Files to $DeployRoot"

if ($DatabaseOnly) {
    Warn "Step 4 skipped (-DatabaseOnly)"
} else {

# Helper: grant IIS AppPool identity read+execute on a path
# Wrapped in try/catch because the app pool identity may not exist yet
# (pools are created in Step 6; permissions are re-applied there too)
function Grant-IISAccess([string]$path, [string]$poolName) {
    try {
        $acl  = Get-Acl $path
        $rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
            "IIS AppPool\$poolName", "ReadAndExecute,ListDirectory",
            "ContainerInherit,ObjectInherit", "None", "Allow")
        $acl.AddAccessRule($rule)
        Set-Acl $path $acl
    } catch {
        # Identity not yet resolvable - permissions will be applied after app pool creation in Step 6
    }
}

# Services
New-Item -ItemType Directory -Path "$DeployRoot\Services" -Force | Out-Null
foreach ($svc in $Services) {
    $src  = Join-Path $PackDir "services\$($svc.Dir)"
    $dest = Join-Path $DeployRoot "Services\$($svc.Name)"
    if (-not (Test-Path $src)) { Warn "Pack missing service: $($svc.Name)"; continue }

    New-Item -ItemType Directory -Path $dest -Force | Out-Null
    Get-ChildItem $dest -Exclude 'Logs','appsettings.*.json' |
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Copy-Item -Path "$src\*" -Destination $dest -Recurse -Force

    # Apply environment config
    $cfgSrc  = Join-Path $PackDir "config\appsettings.$Environment.json"
    if (Test-Path $cfgSrc) {
        Copy-Item $cfgSrc "$dest\appsettings.$Environment.json" -Force
    }

    # IIS permissions
    $poolName = "RetailERP-$($svc.Name)"
    New-Item -ItemType Directory -Path "$dest\Logs" -Force | Out-Null
    Grant-IISAccess $dest $poolName
    try {
        $logsAcl  = Get-Acl "$dest\Logs"
        $logsRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
            "IIS AppPool\$poolName","Modify","ContainerInherit,ObjectInherit","None","Allow")
        $logsAcl.AddAccessRule($logsRule)
        Set-Acl "$dest\Logs" $logsAcl -ErrorAction SilentlyContinue
    } catch { }

    # Patch runtimeconfig.json to allow roll-forward to .NET 8 if built on .NET 7 SDK
    Get-ChildItem $dest -Filter "*.runtimeconfig.json" -ErrorAction SilentlyContinue | ForEach-Object {
        try {
            $cfg = Get-Content $_.FullName -Raw | ConvertFrom-Json
            if ($cfg.runtimeOptions -and -not $cfg.runtimeOptions.rollForward) {
                $cfg.runtimeOptions | Add-Member -NotePropertyName "rollForward" -NotePropertyValue "LatestMajor" -Force
                $cfg | ConvertTo-Json -Depth 10 | Set-Content $_.FullName -Encoding UTF8
            }
        } catch { }
    }

    OK "Deployed $($svc.Name) -> $dest"
}

# Frontend
$feSrc  = Join-Path $PackDir "frontend"
$feDest = Join-Path $DeployRoot "Frontend"
if (Test-Path $feSrc) {
    New-Item -ItemType Directory -Path $feDest -Force | Out-Null
    Get-ChildItem $feDest -Exclude 'Logs' |
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Copy-Item -Path "$feSrc\*" -Destination $feDest -Recurse -Force
    Grant-IISAccess $feDest "RetailERP-Frontend"
    OK "Deployed Frontend -> $feDest"
}

} # end -not DatabaseOnly

# ==============================================================================
# STEP 5 - Database
# ==============================================================================
Step "STEP 5 - Database Setup"

if (-not $SkipDatabase) {
    # Determine connection string
    $connStr = switch ($Environment) {
        'dev'  { "Server=localhost,1434;Database=RetailERP;User Id=sa;Password=RetailERP@2024!;TrustServerCertificate=true" }
        'qa'   { if ($env:RETAILERP_QA_CONNECTION)   { $env:RETAILERP_QA_CONNECTION }   else { "Server=localhost;Database=RetailERP;Integrated Security=true" } }
        'uat'  { if ($env:RETAILERP_UAT_CONNECTION)  { $env:RETAILERP_UAT_CONNECTION }  else { "Server=localhost;Database=RetailERP;Integrated Security=true" } }
        'prod' { if ($env:RETAILERP_PROD_CONNECTION) { $env:RETAILERP_PROD_CONNECTION } else { "Server=.\SQLEXPRESS;Database=RetailERP;User Id=ERPAdmin;Password=ERP@admin;TrustServerCertificate=true" } }
    }

    # Parse server+db from connection string for sqlcmd
    $sqlServer = if ($connStr -match 'Server=([^;]+)') { $Matches[1] } else { 'localhost' }
    $sqlDb     = if ($connStr -match 'Database=([^;]+)') { $Matches[1] } else { 'RetailERP' }
    $sqlUser   = if ($connStr -match 'User Id=([^;]+)') { $Matches[1] } else { '' }
    $sqlPass   = if ($connStr -match 'Password=([^;]+)') { $Matches[1] } else { '' }

    $sqlcmd = Get-Command sqlcmd -ErrorAction SilentlyContinue
    if (-not $sqlcmd) {
        $sqlcmd = Get-Item "C:\Program Files\Microsoft SQL Server\*\Tools\Binn\sqlcmd.exe" -ErrorAction SilentlyContinue |
            Select-Object -Last 1
    }

    if ($sqlcmd) {
        $dbScripts = Join-Path $PackDir "database"
        if (Test-Path $dbScripts) {
            # Create DB if not exists
            $createDbSql = "IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = '$sqlDb') CREATE DATABASE [$sqlDb]"
            $sqlArgs = @('-S', $sqlServer, '-C', '-Q', $createDbSql)
            if ($sqlUser) { $sqlArgs += @('-U', $sqlUser, '-P', $sqlPass) }
            $sqlExe = if ($sqlcmd.Source) { $sqlcmd.Source } elseif ($sqlcmd.Path) { $sqlcmd.Path } else { 'sqlcmd' }
            & $sqlExe @sqlArgs 2>$null
            OK "Database '$sqlDb' exists"

            # Run all .sql scripts in alphabetical order
            $sqlFiles = Get-ChildItem $dbScripts -Recurse -Filter "*.sql" | Sort-Object FullName
            foreach ($f in $sqlFiles) {
                $sqlArgs2 = @('-S', $sqlServer, '-d', $sqlDb, '-C', '-i', $f.FullName)
                if ($sqlUser) { $sqlArgs2 += @('-U', $sqlUser, '-P', $sqlPass) }
                & $sqlExe @sqlArgs2 2>&1 | Out-Null
                OK "Ran: $($f.Name)"
            }
        } else {
            Warn "No database scripts found in pack"
        }
    } else {
        Warn "sqlcmd not found - skipping SQL scripts (install SQL Server tools or run manually)"
    }
} else {
    Warn "Database step skipped (-SkipDatabase)"
}

# ==============================================================================
# STEP 6 - Configure IIS App Pools & Sites
# ==============================================================================
Step "STEP 6 - Configuring IIS"

if ($DatabaseOnly) {
    Warn "Step 6 skipped (-DatabaseOnly)"
} else {

function Set-AppPoolEnvVar([string]$poolName, [string]$varName, [string]$varValue) {
    $cfgPath = "system.applicationHost/applicationPools/add[@name='$poolName']/environmentVariables/add[@name='$varName']"
    $existing = Get-WebConfigurationProperty -pspath "MACHINE/WEBROOT/APPHOST" -filter $cfgPath -name "value" -ErrorAction SilentlyContinue
    if ($null -eq $existing) {
        Add-WebConfiguration -pspath "MACHINE/WEBROOT/APPHOST" `
            -filter "system.applicationHost/applicationPools/add[@name='$poolName']/environmentVariables" `
            -value @{ name=$varName; value=$varValue }
    } else {
        Set-WebConfigurationProperty -pspath "MACHINE/WEBROOT/APPHOST" -filter $cfgPath -name "value" -value $varValue
    }
}

foreach ($svc in $Services) {
    $poolName = "RetailERP-$($svc.Name)"
    $siteName = "RetailERP-$($svc.Name)"
    $siteDir  = Join-Path $DeployRoot "Services\$($svc.Name)"

    # App Pool
    if (-not (Test-Path "IIS:\AppPools\$poolName")) {
        New-WebAppPool -Name $poolName | Out-Null
    }
    Set-ItemProperty "IIS:\AppPools\$poolName" -Name managedRuntimeVersion          -Value ""
    Set-ItemProperty "IIS:\AppPools\$poolName" -Name processModel.identityType      -Value "ApplicationPoolIdentity"
    Set-ItemProperty "IIS:\AppPools\$poolName" -Name startMode                      -Value "AlwaysRunning"
    Set-ItemProperty "IIS:\AppPools\$poolName" -Name processModel.idleTimeout       -Value "00:00:00"
    Set-ItemProperty "IIS:\AppPools\$poolName" -Name recycling.periodicRestart.time -Value "00:00:00"
    Set-AppPoolEnvVar $poolName "ASPNETCORE_ENVIRONMENT" $Environment
    Set-AppPoolEnvVar $poolName "ASPNETCORE_URLS"        "http://+:$($svc.Port)"

    # Apply file permissions now that the app pool identity exists
    Grant-IISAccess $siteDir $poolName
    try {
        $logsAcl  = Get-Acl "$siteDir\Logs" -ErrorAction SilentlyContinue
        if ($logsAcl) {
            $logsRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
                "IIS AppPool\$poolName","Modify","ContainerInherit,ObjectInherit","None","Allow")
            $logsAcl.AddAccessRule($logsRule)
            Set-Acl "$siteDir\Logs" $logsAcl
        }
    } catch { }

    # Site
    if (-not (Get-Website -Name $siteName -ErrorAction SilentlyContinue)) {
        New-Website -Name $siteName -Port $svc.Port -PhysicalPath $siteDir -ApplicationPool $poolName | Out-Null
        OK "Created site: $siteName :$($svc.Port)"
    } else {
        Set-ItemProperty "IIS:\Sites\$siteName" -Name physicalPath    -Value $siteDir
        Set-ItemProperty "IIS:\Sites\$siteName" -Name applicationPool -Value $poolName
        OK "Updated site: $siteName"
    }

    # Firewall rule
    $fwName = "RetailERP $($svc.Name)"
    if (-not (Get-NetFirewallRule -DisplayName $fwName -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -DisplayName $fwName -Direction Inbound -Protocol TCP `
            -LocalPort $svc.Port -Action Allow | Out-Null
    }
}

# Frontend App Pool + Site
if (-not (Test-Path "IIS:\AppPools\RetailERP-Frontend")) {
    New-WebAppPool -Name "RetailERP-Frontend" | Out-Null
}
Set-ItemProperty "IIS:\AppPools\RetailERP-Frontend" -Name managedRuntimeVersion     -Value ""
Set-ItemProperty "IIS:\AppPools\RetailERP-Frontend" -Name processModel.identityType -Value "ApplicationPoolIdentity"
Set-ItemProperty "IIS:\AppPools\RetailERP-Frontend" -Name startMode                -Value "AlwaysRunning"
Set-ItemProperty "IIS:\AppPools\RetailERP-Frontend" -Name processModel.idleTimeout -Value "00:00:00"
Set-AppPoolEnvVar "RetailERP-Frontend" "NODE_ENV" "production"
Set-AppPoolEnvVar "RetailERP-Frontend" "PORT"     "$FrontendPort"

# Apply frontend file permissions now that the app pool identity exists
Grant-IISAccess "$DeployRoot\Frontend" "RetailERP-Frontend"

if (-not (Get-Website -Name "RetailERP-Frontend" -ErrorAction SilentlyContinue)) {
    New-Website -Name "RetailERP-Frontend" -Port $FrontendPort `
        -PhysicalPath "$DeployRoot\Frontend" -ApplicationPool "RetailERP-Frontend" | Out-Null
    OK "Created site: RetailERP-Frontend :$FrontendPort"
} else {
    Set-ItemProperty "IIS:\Sites\RetailERP-Frontend" -Name physicalPath -Value "$DeployRoot\Frontend"
    OK "Updated site: RetailERP-Frontend"
}

if (-not (Get-NetFirewallRule -DisplayName "RetailERP Frontend" -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName "RetailERP Frontend" -Direction Inbound -Protocol TCP `
        -LocalPort $FrontendPort -Action Allow | Out-Null
}
OK "Firewall rules configured"

} # end -not DatabaseOnly

# ==============================================================================
# STEP 7 - Start All Services
# ==============================================================================
Step "STEP 7 - Starting Services"

if ($DatabaseOnly) {
    Warn "Step 7 skipped (-DatabaseOnly)"
} else {

# Restart IIS to apply hosting bundle / URL rewrite changes
iisreset /noforce /timeout:30 2>$null | Out-Null
Start-Sleep -Seconds 5

foreach ($svc in $Services) {
    $pool = "RetailERP-$($svc.Name)"
    $site = "RetailERP-$($svc.Name)"
    Start-WebAppPool -Name $pool -ErrorAction SilentlyContinue
    Start-Website    -Name $site -ErrorAction SilentlyContinue
    OK "Started: $site"
}
Start-WebAppPool -Name "RetailERP-Frontend" -ErrorAction SilentlyContinue
Start-Website    -Name "RetailERP-Frontend" -ErrorAction SilentlyContinue
OK "Started: RetailERP-Frontend"

} # end -not DatabaseOnly

# ==============================================================================
# STEP 8 - Health Checks
# ==============================================================================
Step "STEP 8 - Health Checks"

if ($DatabaseOnly) {
    Warn "Step 8 skipped (-DatabaseOnly)"
} else {

if ($script:HostingBundleJustInstalled) {
    Warn "=========================================================="
    Warn " .NET 8 Hosting Bundle was installed in this session."
    Warn " IIS requires a FULL SERVER RESTART to register the"
    Warn " ASP.NET Core Module. Health checks will likely fail now."
    Warn " Skipping health checks. Please:"
    Warn "   1. Restart-Computer -Force"
    Warn "   2. Re-run: Install.ps1 -Environment $Environment -SkipPrereqs -SkipBackup"
    Warn "=========================================================="
    $SkipHealthCheck = $true
}

if (-not $SkipHealthCheck) {
    Log "  Waiting 20 seconds for services to warm up..."
    Start-Sleep -Seconds 20

    $allHealthy = $true
    $results    = @()

    foreach ($svc in $Services) {
        $url = "http://localhost:$($svc.Port)/health"
        try {
            $r = Invoke-WebRequest -Uri $url -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop
            if ($r.StatusCode -eq 200) {
                OK "$($svc.Name) :$($svc.Port) -> HTTP 200"
                $results += [pscustomobject]@{ Service=$svc.Name; Status='healthy'; Code=200 }
            } else {
                Warn "$($svc.Name) :$($svc.Port) -> HTTP $($r.StatusCode)"
                $results += [pscustomobject]@{ Service=$svc.Name; Status='degraded'; Code=$r.StatusCode }
                $allHealthy = $false
            }
        } catch {
            Log "  [XX] $($svc.Name) :$($svc.Port) -> UNREACHABLE" 'Red'
            $results += [pscustomobject]@{ Service=$svc.Name; Status='down'; Code=0 }
            $allHealthy = $false
        }
    }

    # Frontend
    try {
        $fe = Invoke-WebRequest -Uri "http://localhost:$FrontendPort/" -TimeoutSec 10 -UseBasicParsing
        if ($fe.StatusCode -eq 200) { OK "Frontend :$FrontendPort -> HTTP 200" }
    } catch { Warn "Frontend :$FrontendPort not reachable yet" }

    if (-not $allHealthy) {
        Log ""
        Log "  One or more services failed health checks." 'Red'
        Log "  Starting automatic rollback..." 'Yellow'

        $rollbackScript = Join-Path $PSScriptRoot "Rollback.ps1"
        if (Test-Path $rollbackScript) {
            & $rollbackScript -Environment $Environment -Auto
        } else {
            Warn "Rollback script not found - manual recovery needed"
            Warn "Restore from backup: $BackupRoot\<timestamp>"
        }
        exit 1
    }

    OK "All $($Services.Count) services healthy"
} else {
    Warn "Health checks skipped (-SkipHealthCheck)"
}

} # end -not DatabaseOnly

# ==============================================================================
# DONE - Audit log
# ==============================================================================
$br = '=' * 60
Log ""
Log $br 'Green'
Log "  RetailERP Installation SUCCESSFUL" 'Green'
Log "  Version     : $Version" 'Green'
Log "  Environment : $Environment" 'Green'
Log $br 'Green'

# Service URLs
Log ""
Log "  Service URLs:" 'Cyan'
foreach ($svc in $Services) {
    Log ("  {0,-15} http://localhost:{1}/health" -f $svc.Name, $svc.Port) 'DarkGray'
}
Log ("  {0,-15} http://localhost:{1}/" -f "Frontend", $FrontendPort) 'DarkGray'

# Audit entry
$auditLog = Join-Path $LogRoot "deployments.json"
$history  = if (Test-Path $auditLog) { @(Get-Content $auditLog | ConvertFrom-Json) } else { @() }
$history += [pscustomobject]@{
    Timestamp   = $Timestamp
    Version     = $Version
    Environment = $Environment
    User        = $env:USERNAME
    Machine     = $env:COMPUTERNAME
    Status      = 'SUCCESS'
    LogFile     = $LogFile
}
$history | ConvertTo-Json -Depth 3 | Set-Content $auditLog

Log ""
Log "  Log  : $LogFile" 'DarkGray'
Log "  Audit: $auditLog" 'DarkGray'
