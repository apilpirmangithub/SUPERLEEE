# 🚀 Production Deployment Guide

This guide covers deploying the AI Agent DApp to production environments.

## 📋 Pre-Deployment Checklist

### ✅ Required API Keys & Services

1. **OpenAI API Key** (Required for AI features)
   - Get from: https://platform.openai.com
   - Set: `OPENAI_API_KEY`

2. **WalletConnect Project ID** (Required for wallet connections)
   - Get from: https://cloud.walletconnect.com
   - Set: `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

3. **Pinata JWT** (Required for IPFS uploads)
   - Get from: https://pinata.cloud
   - Set: `PINATA_JWT`

4. **SightEngine API** (Optional - for AI content detection)
   - Get from: https://sightengine.com
   - Set: `SIGHTENGINE_API_USER`, `SIGHTENGINE_API_SECRET`

### ✅ Environment Configuration

1. Copy `.env.example` to `.env.production.local`
2. Fill in all required environment variables
3. Remove development-only variables
4. Ensure `NODE_ENV=production`

### ✅ Security Requirements

1. **HTTPS Required** - All external APIs require HTTPS
2. **Secure Headers** - CSP, HSTS, etc. configured
3. **API Keys** - Never expose in client-side code
4. **CORS** - Properly configured for your domain

## 🏗️ Deployment Platforms

### Vercel (Recommended)

**Automatic Deployment:**

1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Enable automatic deployments

**Manual Deployment:**

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

**Environment Variables in Vercel:**
- Go to Project Settings → Environment Variables
- Add all variables from `.env.example`
- Set appropriate values for production

### Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Build and deploy
npm run build
netlify deploy --prod --dir=.next
```

### Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

### Docker Deployment

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

## ⚙️ Production Configuration

### Next.js Config Optimization

```javascript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // For Docker
  
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // Image optimization
  images: {
    domains: ['gateway.pinata.cloud', 'ipfs.io'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### Build Optimization

```json
// package.json scripts
{
  "scripts": {
    "build": "next build",
    "start": "next start",
    "build:analyze": "ANALYZE=true next build",
    "build:production": "NODE_ENV=production next build"
  }
}
```

## 🔒 Security Configuration

### Content Security Policy

```javascript
// Add to next.config.mjs
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: gateway.pinata.cloud ipfs.io;
  connect-src 'self' api.openai.com api.sightengine.com testnet.storyrpc.io;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`;

export default {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\\s{2,}/g, ' ').trim()
          }
        ]
      }
    ];
  }
};
```

### Environment Variables Security

**✅ Safe for Client (NEXT_PUBLIC_):**
- `NEXT_PUBLIC_CHAIN_ID`
- `NEXT_PUBLIC_STORY_RPC_URL`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

**❌ Server Only (No NEXT_PUBLIC_):**
- `OPENAI_API_KEY`
- `PINATA_JWT`
- `SIGHTENGINE_API_SECRET`

## 📊 Monitoring & Analytics

### Error Monitoring with Sentry

```bash
npm install @sentry/nextjs
```

```javascript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});
```

### Performance Monitoring

```javascript
// Add to _app.tsx
import { Analytics } from '@vercel/analytics/react';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}
```

## 🚀 Deployment Commands

### Build & Test Locally

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Test production build locally
npm start

# Optional: Analyze bundle size
npm run build:analyze
```

### Deploy to Vercel

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## 🔧 Post-Deployment Verification

### ✅ Health Checks

1. **Application Loading**
   - Visit homepage
   - Check AI Status Indicator
   - Test wallet connection

2. **API Endpoints**
   - `/api/health` - Should return 200
   - `/api/ipfs/json` - Test IPFS upload
   - AI features working properly

3. **External Services**
   - OpenAI integration
   - IPFS uploads via Pinata
   - Wallet connections
   - Blockchain interactions

### ✅ Performance Checks

1. **Core Web Vitals**
   - LCP < 2.5s
   - FID < 100ms
   - CLS < 0.1

2. **Bundle Size**
   - First Load JS < 250kB
   - Total Page Weight < 1MB

3. **API Response Times**
   - OpenAI < 5s
   - IPFS upload < 10s
   - Blockchain queries < 3s

## 🛠️ Troubleshooting

### Common Issues

1. **"OpenAI API key not found"**
   - Verify environment variable is set
   - Check spelling: `OPENAI_API_KEY`
   - Restart deployment after setting

2. **Wallet connection fails**
   - Check WalletConnect Project ID
   - Verify HTTPS is enabled
   - Check network configuration

3. **IPFS upload fails**
   - Verify Pinata JWT token
   - Check file size limits
   - Verify network connectivity

4. **Build failures**
   - Check Node.js version (18+)
   - Clear npm cache: `npm cache clean --force`
   - Delete `.next` and `node_modules`, reinstall

### Debug Mode

For production debugging:

```bash
# Enable debug logging
NODE_ENV=production DEBUG=* npm start

# Check specific modules
DEBUG=next:* npm start
```

## 📱 Mobile Optimization

### PWA Configuration

```javascript
// next.config.mjs
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

module.exports = withPWA({
  // your next config
});
```

## 🔄 CI/CD Pipeline

See `CICD.md` for automated deployment setup with GitHub Actions.

## 🚀 Go Live Checklist

- [ ] All environment variables configured
- [ ] SSL certificate active
- [ ] Domain configured
- [ ] Analytics tracking setup
- [ ] Error monitoring active
- [ ] Performance baseline established
- [ ] Backup strategy in place
- [ ] Monitoring alerts configured

Your AI Agent DApp is now ready for production! 🎉
