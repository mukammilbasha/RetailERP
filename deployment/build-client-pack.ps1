# ================================================================
#  RetailERP — Build Client Deployment Pack
#  Creates a ZIP ready to send to any client machine.
#  Usage: powershell -ExecutionPolicy Bypass -File deployment\build-client-pack.ps1
# ================================================================

$Version   = "v1.0.0"
$PackDir   = "$PSScriptRoot\client-pack"
$OutputDir = "$PSScriptRoot\..\publish"
$ZipName   = "RetailERP-$Version-client-pack.zip"
$ZipPath   = "$OutputDir\$ZipName"

Write-Host ""
Write-Host "  =================================================" -ForegroundColor Cyan
Write-Host "    RetailERP Client Pack Builder" -ForegroundColor Cyan
Write-Host "  =================================================" -ForegroundColor Cyan
Write-Host ""

# Create output directory
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

# Remove old zip
if (Test-Path $ZipPath) {
    Remove-Item $ZipPath -Force
    Write-Host "  Removed old pack: $ZipName" -ForegroundColor Yellow
}

# Create the ZIP
Write-Host "  Packing: $PackDir" -ForegroundColor White
Compress-Archive -Path "$PackDir\*" -DestinationPath $ZipPath -Force

# Show contents
Write-Host ""
Write-Host "  Pack contents:" -ForegroundColor White
Get-ChildItem $PackDir | ForEach-Object {
    Write-Host "    + $($_.Name)" -ForegroundColor Gray
}

# Show size
$Size = [math]::Round((Get-Item $ZipPath).Length / 1KB, 1)
Write-Host ""
Write-Host "  =================================================" -ForegroundColor Green
Write-Host "    Pack ready!  ($Size KB)" -ForegroundColor Green
Write-Host "  =================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Output: $ZipPath" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Send this ZIP to the client machine." -ForegroundColor White
Write-Host "  Client only needs Docker Desktop installed." -ForegroundColor White
Write-Host "  Extract ZIP and run START.bat" -ForegroundColor White
Write-Host ""
