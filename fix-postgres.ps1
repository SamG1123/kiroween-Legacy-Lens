# Fix PostgreSQL Authentication Issue
Write-Host "Fixing PostgreSQL authentication..." -ForegroundColor Yellow

# Step 1: Stop and remove any existing postgres containers
Write-Host "`n1. Cleaning up existing containers..." -ForegroundColor Cyan
docker stop postgres 2>$null
docker rm postgres 2>$null
docker stop postgres-test 2>$null
docker rm postgres-test 2>$null

# Step 2: Remove any postgres volumes
Write-Host "2. Removing old volumes..." -ForegroundColor Cyan
docker volume rm postgres-data 2>$null

# Step 3: Start fresh PostgreSQL container
Write-Host "3. Starting new PostgreSQL container..." -ForegroundColor Cyan
docker run -d `
  --name postgres `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=legacy_code_revival `
  -p 5432:5432 `
  postgres:15

# Step 4: Wait for PostgreSQL to be ready
Write-Host "4. Waiting for PostgreSQL to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 8

# Step 5: Test connection
Write-Host "5. Testing connection..." -ForegroundColor Cyan
$testResult = docker exec postgres psql -U postgres -c "SELECT 1;" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ PostgreSQL is running and accepting connections!" -ForegroundColor Green
    
    # Step 6: Run migrations
    Write-Host "`n6. Running database migrations..." -ForegroundColor Cyan
    npm run migrate:up
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ SUCCESS! PostgreSQL is ready to use!" -ForegroundColor Green
        Write-Host "`nYou can now run:" -ForegroundColor Yellow
        Write-Host "  npm run test:db" -ForegroundColor White
        Write-Host "  npm run check" -ForegroundColor White
        Write-Host "  npm run dev" -ForegroundColor White
    } else {
        Write-Host "`n❌ Migration failed. Check the error above." -ForegroundColor Red
    }
} else {
    Write-Host "❌ Connection test failed" -ForegroundColor Red
    Write-Host "Error: $testResult" -ForegroundColor Red
    Write-Host "`nTry running: docker logs postgres" -ForegroundColor Yellow
}
