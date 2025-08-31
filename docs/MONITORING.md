# 📊 Monitoring Your App

## Error Tracking with Sentry (Recommended)

### Setup (2 minutes)
1. Go to sentry.io, create account
2. New project → Next.js
3. Copy your DSN
4. Add to environment variables:
   ```bash
   SENTRY_DSN=https://your-dsn@sentry.io/project
   ```

### Install
```bash
npm install @sentry/nextjs
```

That's it! Errors will automatically be tracked.

## Analytics 

### Vercel Analytics (Easiest)
```bash
npm install @vercel/analytics
```

Add to your `_app.tsx`:
```typescript
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

## Health Monitoring

Your app already has a health check at `/api/health`.

### Setup Uptime Monitoring
Use any of these (free options):
- UptimeRobot
- StatusCake  
- Pingdom

Monitor: `https://your-domain.com/api/health`

## What to Monitor

### Critical Stuff
- App is responding (uptime)
- No critical errors
- AI features working
- Database connections

### Nice to Have
- Response times
- User activity
- AI usage stats
- Error rates

## Alerts You Want
- Site is down
- Error rate spikes
- AI stops working
- Too many failed transactions

## Simple Dashboard

Check `/api/health` regularly - it tells you:
- Overall system health
- OpenAI status
- IPFS status
- Environment config

## When Things Go Wrong
1. Check Sentry for errors
2. Look at hosting platform logs
3. Verify `/api/health` status
4. Check if API keys expired

Keep it simple - you don't need complex monitoring for most apps! 📈
