#!/bin/bash

# AI Agent DApp - Production Deployment Script
# Usage: ./scripts/deploy.sh [platform]
# Platforms: vercel, netlify, railway, docker

set -e

PLATFORM=${1:-vercel}
PROJECT_NAME="ai-agent-dapp"

echo "🚀 Starting deployment to $PLATFORM..."

# Pre-deployment checks
echo "📋 Running pre-deployment checks..."

# Check if required environment variables are set
check_env_var() {
    if [ -z "${!1}" ]; then
        echo "❌ Error: $1 environment variable is not set"
        exit 1
    else
        echo "✅ $1 is set"
    fi
}

# Critical environment variables check
echo "🔍 Checking critical environment variables..."
check_env_var "OPENAI_API_KEY"
check_env_var "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID"
check_env_var "PINATA_JWT"

# Build the application
echo "🔨 Building application..."
npm run build

# Test the build
echo "🧪 Testing production build..."
timeout 30s npm start &
SERVER_PID=$!
sleep 10

# Check if server is responding
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Production build test passed"
else
    echo "❌ Production build test failed"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

kill $SERVER_PID 2>/dev/null || true

# Platform-specific deployment
case $PLATFORM in
    "vercel")
        echo "🚀 Deploying to Vercel..."
        npx vercel --prod --yes
        ;;
    "netlify")
        echo "🚀 Deploying to Netlify..."
        npx netlify deploy --prod --dir=.next
        ;;
    "railway")
        echo "🚀 Deploying to Railway..."
        npx railway up
        ;;
    "docker")
        echo "🚀 Building Docker image..."
        docker build -t $PROJECT_NAME .
        echo "📋 Docker image built: $PROJECT_NAME"
        echo "💡 Run with: docker run -p 3000:3000 $PROJECT_NAME"
        ;;
    *)
        echo "❌ Unknown platform: $PLATFORM"
        echo "Available platforms: vercel, netlify, railway, docker"
        exit 1
        ;;
esac

echo "✅ Deployment completed successfully!"
echo "🌐 Your AI Agent DApp is now live!"
