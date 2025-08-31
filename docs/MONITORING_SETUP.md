# 📊 Monitoring & Analytics Setup

This guide covers setting up comprehensive monitoring for your AI Agent DApp in production.

## 🚨 Error Monitoring with Sentry

### 1. Setup Sentry Account

1. Go to [sentry.io](https://sentry.io)
2. Create account and new project
3. Choose **Next.js** as platform
4. Copy your DSN

### 2. Install Sentry

```bash
npm install @sentry/nextjs
```

### 3. Configure Sentry

Create `sentry.client.config.ts`:
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance monitoring
  tracesSampleRate: 1.0,
  
  // Error filtering
  beforeSend(event) {
    // Filter out development errors
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    return event;
  },
  
  // AI-specific error tracking
  tags: {
    component: 'ai-agent-dapp',
    version: process.env.npm_package_version,
  }
});
```

Create `sentry.server.config.ts`:
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  
  // Server-specific configuration
  environment: process.env.NODE_ENV,
  
  beforeSend(event) {
    // Don't log OpenAI API keys or sensitive data
    if (event.extra) {
      delete event.extra.OPENAI_API_KEY;
      delete event.extra.PINATA_JWT;
    }
    return event;
  }
});
```

### 4. Environment Variables

```bash
# For client-side error tracking
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id

# For server-side error tracking  
SENTRY_DSN=https://your-dsn@sentry.io/project-id
```

## 📈 Performance Analytics

### Vercel Analytics

```bash
npm install @vercel/analytics
```

Add to `_app.tsx`:
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

### Google Analytics 4

```bash
npm install gtag
```

Create `lib/gtag.ts`:
```typescript
export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID;

export const pageview = (url: string) => {
  if (typeof window !== 'undefined' && GA_TRACKING_ID) {
    window.gtag('config', GA_TRACKING_ID, {
      page_path: url,
    });
  }
};

export const event = (action: string, category: string, label?: string, value?: number) => {
  if (typeof window !== 'undefined' && GA_TRACKING_ID) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};
```

## 🎯 Custom AI Metrics

### AI Usage Tracking

Create `lib/analytics.ts`:
```typescript
import { event } from './gtag';

export const trackAIUsage = (feature: string, success: boolean, responseTime?: number) => {
  event('ai_usage', 'AI Features', `${feature}_${success ? 'success' : 'failure'}`, responseTime);
  
  // Also send to custom endpoint for detailed tracking
  fetch('/api/analytics/ai-usage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      feature,
      success,
      responseTime,
      timestamp: new Date().toISOString()
    })
  }).catch(console.error);
};

export const trackTokenSwap = (tokenIn: string, tokenOut: string, amount: number, success: boolean) => {
  event('token_swap', 'DeFi', `${tokenIn}_to_${tokenOut}`, amount);
};

export const trackIPRegistration = (fileType: string, success: boolean, aiAnalyzed: boolean) => {
  event('ip_registration', 'IP Management', `${fileType}_${success ? 'success' : 'failure'}`);
  
  if (aiAnalyzed) {
    event('ai_image_analysis', 'AI Features', 'ip_registration');
  }
};
```

### Usage in Components

```typescript
// In your OpenAI integration
import { trackAIUsage } from '@/lib/analytics';

export async function parseCommandWithAI(message: string) {
  const startTime = Date.now();
  
  try {
    const result = await openai.chat.completions.create({...});
    const responseTime = Date.now() - startTime;
    
    trackAIUsage('command_parsing', true, responseTime);
    return result;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    trackAIUsage('command_parsing', false, responseTime);
    throw error;
  }
}
```

## 📊 Dashboard Setup

### 1. Create Analytics API Endpoints

Create `src/app/api/analytics/summary/route.ts`:
```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  // In production, this would connect to your analytics database
  const mockData = {
    daily_users: 150,
    ai_requests: 1250,
    success_rate: 0.96,
    avg_response_time: 2.3,
    top_features: [
      { name: 'Token Swap', usage: 45 },
      { name: 'IP Registration', usage: 35 },
      { name: 'AI Chat', usage: 20 }
    ]
  };
  
  return NextResponse.json(mockData);
}
```

### 2. Create Admin Dashboard

Create `src/app/admin/analytics/page.tsx`:
```typescript
'use client';

import { useState, useEffect } from 'react';

interface AnalyticsData {
  daily_users: number;
  ai_requests: number;
  success_rate: number;
  avg_response_time: number;
  top_features: Array<{ name: string; usage: number }>;
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  
  useEffect(() => {
    fetch('/api/analytics/summary')
      .then(res => res.json())
      .then(setData);
  }, []);
  
  if (!data) return <div>Loading...</div>;
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">AI Agent DApp Analytics</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard title="Daily Users" value={data.daily_users} />
        <MetricCard title="AI Requests" value={data.ai_requests} />
        <MetricCard title="Success Rate" value={`${(data.success_rate * 100).toFixed(1)}%`} />
        <MetricCard title="Avg Response Time" value={`${data.avg_response_time}s`} />
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Top Features</h2>
        {data.top_features.map((feature, index) => (
          <div key={index} className="flex justify-between items-center py-2">
            <span>{feature.name}</span>
            <span className="font-mono">{feature.usage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-sm text-gray-500 mb-1">{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
```

## 🔍 Real-Time Monitoring

### Health Check Monitoring

Create `src/app/api/analytics/health/route.ts`:
```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  const health = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {
      database: await checkDatabase(),
      openai: await checkOpenAI(),
      ipfs: await checkIPFS(),
      external_apis: await checkExternalAPIs()
    },
    metrics: {
      uptime: process.uptime(),
      memory_usage: process.memoryUsage(),
      cpu_usage: process.cpuUsage()
    }
  };
  
  const allHealthy = Object.values(health.checks).every(check => check.status === 'healthy');
  
  return NextResponse.json(health, { 
    status: allHealthy ? 200 : 503 
  });
}

async function checkDatabase() {
  // Check database connection
  return { status: 'healthy', response_time: 50 };
}

async function checkOpenAI() {
  // Ping OpenAI API
  return { status: 'healthy', response_time: 200 };
}

async function checkIPFS() {
  // Check IPFS gateway
  return { status: 'healthy', response_time: 100 };
}

async function checkExternalAPIs() {
  // Check blockchain RPC
  return { status: 'healthy', response_time: 150 };
}
```

## 🚨 Alerting Setup

### 1. Uptime Monitoring

Recommended services:
- **UptimeRobot** (free tier available)
- **Pingdom** (comprehensive monitoring)
- **StatusCake** (free tier available)

Monitor these endpoints:
- `https://your-domain.com/api/health`
- `https://your-domain.com/` (homepage)
- `https://your-domain.com/test-ai` (AI features)

### 2. Performance Alerts

Set up alerts for:
- Response time > 5 seconds
- Error rate > 5%
- AI success rate < 90%
- Memory usage > 80%

### 3. Business Logic Alerts

Track and alert on:
- No AI requests for > 1 hour
- Token swap failures > 10%
- IP registration failures > 15%
- Zero new users for > 24 hours

## 📋 Monitoring Checklist

### ✅ Initial Setup
- [ ] Sentry configured for error tracking
- [ ] Performance analytics enabled
- [ ] Custom AI metrics implemented
- [ ] Health check endpoints created

### ✅ Dashboard Setup
- [ ] Analytics dashboard accessible
- [ ] Real-time metrics displaying
- [ ] Key performance indicators tracked
- [ ] Business metrics dashboard

### ✅ Alerting
- [ ] Uptime monitoring configured
- [ ] Performance alerts set
- [ ] Business logic alerts enabled
- [ ] Team notification channels setup

### ✅ Documentation
- [ ] Monitoring runbook created
- [ ] Alert response procedures documented
- [ ] Escalation procedures defined
- [ ] Regular review schedule established

Your monitoring setup is now ready to provide comprehensive insights into your AI Agent DApp's performance and usage! 📊✨
