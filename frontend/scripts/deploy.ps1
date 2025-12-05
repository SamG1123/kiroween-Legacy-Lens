# Deployment script for Legacy Code Revival AI Web UI (PowerShell)
# Usage: .\scripts\deploy.ps1 -Platform vercel -Environment production

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('vercel', 'netlify')]
    [string]$Platform = 'vercel',
    
    [Parameter(Mandatory=$false)]
    [ValidateSet('production', 'preview')]
    [string]$Environment = 'production'
)

Write-Host "🚀 Deploying to $Platform ($Environment)..." -ForegroundColor Cyan

# Check if we're in the frontend directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Must be run from the frontend directory" -ForegroundColor Red
    exit 1
}

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Run tests
Write-Host "🧪 Running tests..." -ForegroundColor Yellow
npm run test
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Tests failed!" -ForegroundColor Red
    exit 1
}

# Run linter
Write-Host "🔍 Running linter..." -ForegroundColor Yellow
npm run lint
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Linting failed!" -ForegroundColor Red
    exit 1
}

# Build the application
Write-Host "🏗️  Building application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Deploy based on platform
Write-Host "📤 Deploying to $Platform..." -ForegroundColor Yellow

switch ($Platform) {
    'vercel' {
        if ($Environment -eq 'production') {
            npx vercel --prod
        } else {
            npx vercel
        }
    }
    'netlify' {
        if ($Environment -eq 'production') {
            npx netlify deploy --prod
        } else {
            npx netlify deploy
        }
    }
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deployment complete!" -ForegroundColor Green
} else {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}
