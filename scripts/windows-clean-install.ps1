$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "MusicStudioLab clean dependency install" -ForegroundColor Cyan
Write-Host "Project: $ProjectRoot"

if (Test-Path "node_modules") {
    Write-Host "Removing the existing node_modules directory..."
    try {
        Remove-Item "node_modules" -Recurse -Force
    }
    catch {
        Write-Warning "A Node process or editor is locking node_modules. Stopping local Node processes and retrying."
        Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
        Start-Sleep -Milliseconds 800
        Remove-Item "node_modules" -Recurse -Force
    }
}

Write-Host "Verifying the npm cache..."
npm cache verify
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Installing exactly from package-lock.json using the public npm registry..."
npm ci --registry=https://registry.npmjs.org/
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Running the production build..."
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Clean install and build completed successfully." -ForegroundColor Green
