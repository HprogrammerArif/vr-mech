# run-backend.ps1
# Run this in Terminal 1 to start the backend API server

Set-Location "$PSScriptRoot\artifacts\api-server"

# Load .env file if it exists
$envFile = ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]*)=(.*)$") {
            [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
        }
    }
    Write-Host "✅ Loaded environment from .env" -ForegroundColor Green
} else {
    Write-Host "⚠️  No .env file found at artifacts\api-server\.env" -ForegroundColor Yellow
    Write-Host "    Create it first! See SECURITY_AND_BEST_PRACTICES.md" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🚀 Starting Backend API Server on http://localhost:8080" -ForegroundColor Cyan
Write-Host "   Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

pnpm run dev
