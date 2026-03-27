Get-ChildItem -Path "e:\Claude_AI\RetailERP\src" -Recurse -Filter "*.csproj" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match 'Authentication\.\`8\.0\.0') {
        $fixed = $content -replace 'Microsoft\.AspNetCore\.Authentication\.\`8\.0\.0"', 'Microsoft.AspNetCore.Authentication.JwtBearer" Version="8.0.0"'
        Set-Content $_.FullName $fixed -NoNewline
        Write-Host "Fixed: $($_.Name)"
    }
}
Write-Host "Done"
