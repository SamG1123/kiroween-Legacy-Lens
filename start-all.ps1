# Start All Services for Legacy Code Revival AI
Write-Host "🚀 Starting Legacy Code Revival AI..." -ForegroundColor Cyan

# Start Redis
Write-Host "`n1. Starting Redis..." -ForegroundColor Yellow
docker start redis 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "   Creating new Redis container..." -ForegroundColor Gray
    docker run -d -p 6379:6379 --name redis redis:latest
}
Write-Host "   ✅ Redis started" -ForegroundColor Green

# Start PostgreSQL
Write-Host "`n2. Starting PostgreSQL..." -ForegroundColor Yellow
docker start postgres 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "   Creating new PostgreSQL container..." -ForegroundColor Gray
    docker run -d --name postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=legacy_code_revival -p 5432:5432 postgres:15
    Start-Sleep -Seconds 5
}
Write-Host "   ✅ PostgreSQL started" -ForegroundColor Green

# Wait for services to be ready
Write-Host "`n3. Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Check services
Write-Host "`n4. Checking services..." -ForegroundColor Yellow
$services = docker ps --format "{{.Names}}" | Select-String -Pattern "redis|postgres"
Write-Host "   Running: $($services -join ', ')" -ForegroundColor Gray

Write-Host "`n✅ All services started!" -ForegroundColor Green
Write-Host "`nYou can now run:" -ForegroundColor Cyan
Write-Host "  npm run dev          # Start backend (port 3000)" -ForegroundColor White
Write-Host "  cd frontend && npm run dev  # Start frontend (port 5173)" -ForegroundColor White
Write-Host "`nOr open two terminals and run both!" -ForegroundColor Yellow
