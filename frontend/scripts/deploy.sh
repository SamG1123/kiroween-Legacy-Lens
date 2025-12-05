#!/bin/bash

# Deployment script for Legacy Code Revival AI Web UI
# Usage: ./scripts/deploy.sh [platform] [environment]
# Example: ./scripts/deploy.sh vercel production

set -e

PLATFORM=${1:-vercel}
ENVIRONMENT=${2:-production}

echo "🚀 Deploying to $PLATFORM ($ENVIRONMENT)..."

# Check if we're in the frontend directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Must be run from the frontend directory"
  exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Run tests
echo "🧪 Running tests..."
npm run test

# Run linter
echo "🔍 Running linter..."
npm run lint

# Build the application
echo "🏗️  Building application..."
npm run build

# Deploy based on platform
case $PLATFORM in
  vercel)
    echo "📤 Deploying to Vercel..."
    if [ "$ENVIRONMENT" = "production" ]; then
      npx vercel --prod
    else
      npx vercel
    fi
    ;;
  
  netlify)
    echo "📤 Deploying to Netlify..."
    if [ "$ENVIRONMENT" = "production" ]; then
      npx netlify deploy --prod
    else
      npx netlify deploy
    fi
    ;;
  
  *)
    echo "❌ Unknown platform: $PLATFORM"
    echo "Supported platforms: vercel, netlify"
    exit 1
    ;;
esac

echo "✅ Deployment complete!"
