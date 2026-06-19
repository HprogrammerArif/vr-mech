# run-frontend.ps1
# Run this in Terminal 2 AFTER the backend is running

Set-Location "$PSScriptRoot\artifacts\mech-vr-lab"

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
    Write-Host "⚠️  No .env file found at artifacts\mech-vr-lab\.env" -ForegroundColor Yellow
    Write-Host "    The frontend REQUIRES PORT and BASE_PATH to start!" -ForegroundColor Red
    Write-Host ""
    Write-Host "    Setting defaults: PORT=5173, BASE_PATH=/" -ForegroundColor Yellow
    $env:PORT = "5173"
    $env:BASE_PATH = "/"
}

Write-Host ""
Write-Host "🚀 Starting Frontend (Vite) on http://localhost:5173" -ForegroundColor Cyan
Write-Host "   API calls will be proxied to http://localhost:8080" -ForegroundColor Gray
Write-Host "   Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

pnpm run dev
