#!/bin/bash

# AI Agent DApp - Security Audit Script
# This script performs basic security checks for production deployment

echo "🔒 Starting Security Audit..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Initialize counters
PASS=0
FAIL=0
WARN=0

check_pass() {
    echo -e "${GREEN}✅ PASS:${NC} $1"
    ((PASS++))
}

check_fail() {
    echo -e "${RED}❌ FAIL:${NC} $1"
    ((FAIL++))
}

check_warn() {
    echo -e "${YELLOW}⚠️  WARN:${NC} $1"
    ((WARN++))
}

echo "📋 Environment Variables Security Check"
echo "========================================"

# Check for required environment variables
if [ -n "$OPENAI_API_KEY" ]; then
    if [[ $OPENAI_API_KEY == sk-* ]]; then
        check_pass "OpenAI API key format is correct"
    else
        check_fail "OpenAI API key format is invalid"
    fi
else
    check_fail "OPENAI_API_KEY not set"
fi

if [ -n "$PINATA_JWT" ]; then
    check_pass "Pinata JWT is configured"
else
    check_fail "PINATA_JWT not set"
fi

if [ -n "$NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID" ]; then
    check_pass "WalletConnect Project ID is configured"
else
    check_fail "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID not set"
fi

# Check for sensitive data in public variables
if [[ $NEXT_PUBLIC_OPENAI_API_KEY == sk-* ]]; then
    check_fail "OpenAI API key exposed in public environment variable!"
fi

# Check for development/debug variables in production
if [ "$NODE_ENV" == "production" ]; then
    if [ -n "$NEXT_PUBLIC_DEBUG_MODE" ] && [ "$NEXT_PUBLIC_DEBUG_MODE" == "true" ]; then
        check_warn "Debug mode enabled in production"
    fi
fi

echo ""
echo "🔍 Dependencies Security Check"
echo "=============================="

# Check for npm audit
if command -v npm &> /dev/null; then
    echo "Running npm audit..."
    if npm audit --audit-level=high --production; then
        check_pass "No high/critical vulnerabilities found in dependencies"
    else
        check_fail "High/critical vulnerabilities found in dependencies"
    fi
else
    check_warn "npm not found, skipping dependency audit"
fi

echo ""
echo "📁 File Security Check"
echo "====================="

# Check for sensitive files
if [ -f ".env" ]; then
    check_warn ".env file found - ensure it's not committed to git"
fi

if [ -f ".env.local" ]; then
    check_warn ".env.local file found - ensure it's not committed to git"
fi

# Check .gitignore
if grep -q ".env" .gitignore 2>/dev/null; then
    check_pass ".env files are properly ignored in git"
else
    check_fail ".env files not found in .gitignore"
fi

# Check for hardcoded secrets in code
echo "Scanning for potential hardcoded secrets..."
if grep -r "sk-[a-zA-Z0-9]" src/ 2>/dev/null | grep -v "example\|placeholder\|your-key-here"; then
    check_fail "Potential hardcoded OpenAI API key found in source code"
else
    check_pass "No hardcoded API keys found in source code"
fi

echo ""
echo "🌐 Network Security Check"
echo "========================"

# Check if HTTPS is enforced
if grep -q "upgrade-insecure-requests" src/middleware.ts 2>/dev/null; then
    check_pass "HTTPS upgrade enforced"
else
    check_warn "HTTPS upgrade not found in middleware"
fi

# Check CSP configuration
if grep -q "Content-Security-Policy" src/middleware.ts 2>/dev/null; then
    check_pass "Content Security Policy configured"
else
    check_fail "Content Security Policy not configured"
fi

echo ""
echo "📦 Build Security Check"
echo "======================"

# Check if source maps are disabled in production
if [ "$NODE_ENV" == "production" ] && [ -f "next.config.mjs" ]; then
    if grep -q "productionBrowserSourceMaps.*false" next.config.mjs; then
        check_pass "Source maps disabled in production"
    else
        check_warn "Source maps not explicitly disabled for production"
    fi
fi

echo ""
echo "📊 Security Audit Summary"
echo "=========================="
echo -e "✅ Passed: ${GREEN}$PASS${NC}"
echo -e "⚠️  Warnings: ${YELLOW}$WARN${NC}"
echo -e "❌ Failed: ${RED}$FAIL${NC}"

if [ $FAIL -gt 0 ]; then
    echo ""
    echo -e "${RED}🚨 Security issues found! Please fix failed checks before deploying to production.${NC}"
    exit 1
elif [ $WARN -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Some security warnings found. Consider addressing them.${NC}"
    exit 0
else
    echo ""
    echo -e "${GREEN}🎉 All security checks passed! Ready for production deployment.${NC}"
    exit 0
fi
