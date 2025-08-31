# 🚀 Production Deployment Checklist

Use this checklist to ensure a secure and successful production deployment.

## 📋 Pre-Deployment Checklist

### ✅ Environment Setup

- [ ] **OpenAI API Key** configured and working
- [ ] **WalletConnect Project ID** obtained and set
- [ ] **Pinata JWT** configured for IPFS uploads
- [ ] **Domain/Hosting** platform chosen (Vercel/Netlify/Railway)
- [ ] **SSL Certificate** will be automatically handled by platform
- [ ] **Environment variables** reviewed and secured

### ✅ Security Verification

- [ ] Run security audit: `bash scripts/security-audit.sh`
- [ ] No hardcoded API keys in source code
- [ ] `.env` files added to `.gitignore`
- [ ] Security headers configured in middleware
- [ ] CSP (Content Security Policy) properly set
- [ ] All dependencies have no critical vulnerabilities

### ✅ Code Quality

- [ ] Build passes locally: `npm run build`
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] Linting passes: `npm run lint`
- [ ] All AI features tested and working
- [ ] Health check endpoint responds: `/api/health`

## 🔧 Platform-Specific Setup

### Vercel Deployment

1. **Connect Repository**
   - Connect GitHub repository to Vercel
   - Set root directory to project root
   - Set framework preset to Next.js

2. **Environment Variables**
   ```
   OPENAI_API_KEY=sk-your-key-here
   PINATA_JWT=your-pinata-jwt
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id
   ```

3. **Deploy Settings**
   - Build command: `npm run build`
   - Output directory: `.next`
   - Install command: `npm ci`

### Netlify Deployment

1. **Build Settings**
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Node version: 18

2. **Environment Variables**
   - Add same variables as Vercel
   - Set in Netlify dashboard under Site Settings

### Railway Deployment

1. **Connect Repository**
   - Connect GitHub repository
   - Railway will auto-detect Next.js

2. **Environment Variables**
   - Add in Railway dashboard
   - Will auto-deploy on git push

### Docker Deployment

1. **Build Image**
   ```bash
   docker build -t ai-agent-dapp .
   ```

2. **Run Container**
   ```bash
   docker run -p 3000:3000 \
     -e OPENAI_API_KEY=your-key \
     -e PINATA_JWT=your-jwt \
     -e NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-id \
     ai-agent-dapp
   ```

## 🧪 Post-Deployment Testing

### ✅ Functionality Tests

- [ ] **Homepage loads** correctly
- [ ] **AI Status Indicator** shows correct status
- [ ] **Wallet connection** works with MetaMask/WalletConnect
- [ ] **SuperLee chat** responds to "SUP" command
- [ ] **Natural language** commands work (if OpenAI configured)
- [ ] **Image upload** and analysis works
- [ ] **Token swap** interface functions
- [ ] **IP registration** flow works
- [ ] **Health check** endpoint returns 200: `/api/health`

### ✅ Performance Tests

- [ ] **First Load** < 3 seconds
- [ ] **LCP (Largest Contentful Paint)** < 2.5s
- [ ] **FID (First Input Delay)** < 100ms
- [ ] **CLS (Cumulative Layout Shift)** < 0.1
- [ ] **Bundle size** reasonable (check in browser dev tools)

### ✅ Security Tests

- [ ] **HTTPS** enforced (HTTP redirects to HTTPS)
- [ ] **Security headers** present (check browser dev tools)
- [ ] **CSP** working (no console errors)
- [ ] **API keys** not exposed in client-side code
- [ ] **Source maps** disabled in production

## 🔍 Monitoring Setup

### ✅ Analytics & Monitoring

- [ ] **Error monitoring** (Sentry) configured
- [ ] **Performance monitoring** (Vercel Analytics) enabled
- [ ] **Uptime monitoring** set up
- [ ] **Log aggregation** configured
- [ ] **Alerts** set up for critical issues

### ✅ Business Metrics

- [ ] **User interactions** tracked
- [ ] **AI usage** monitored
- [ ] **Transaction success rates** tracked
- [ ] **Performance baselines** established

## 🚨 Emergency Procedures

### ✅ Rollback Plan

- [ ] **Previous version** tagged in git
- [ ] **Rollback procedure** documented
- [ ] **Database backup** (if applicable)
- [ ] **Emergency contacts** defined

### ✅ Issue Response

- [ ] **Incident response plan** defined
- [ ] **Status page** configured
- [ ] **Communication channels** established
- [ ] **Escalation procedures** documented

## 📊 Success Metrics

Track these metrics after deployment:

| Metric | Target | Current |
|--------|---------|---------|
| Uptime | >99.9% | ___ |
| Response Time | <2s | ___ |
| Error Rate | <1% | ___ |
| AI Response Time | <5s | ___ |
| User Satisfaction | >4.5/5 | ___ |

## 🎯 Go-Live Checklist

Final checks before announcing to users:

- [ ] All functionality tested by multiple team members
- [ ] Performance meets requirements
- [ ] Security verified
- [ ] Monitoring active
- [ ] Support processes ready
- [ ] Documentation updated
- [ ] Team trained on new features
- [ ] Launch communication prepared

## 🎉 Post-Launch Tasks

After successful deployment:

- [ ] **Monitor metrics** for first 24 hours
- [ ] **Gather user feedback** 
- [ ] **Document lessons learned**
- [ ] **Plan future improvements**
- [ ] **Update project documentation**
- [ ] **Celebrate the launch!** 🎊

---

## 🆘 Need Help?

If you encounter issues:

1. Check the logs in your deployment platform
2. Review the health check endpoint: `/api/health`
3. Run security audit: `bash scripts/security-audit.sh`
4. Check environment variables are properly set
5. Verify all required services are accessible

**Remember**: It's better to delay deployment than to launch with known issues!
