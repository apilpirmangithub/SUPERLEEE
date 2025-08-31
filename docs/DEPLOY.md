# How to Deploy

## Quick Setup (5 minutes)

### What You Need
Get these API keys first:
- OpenAI API key from platform.openai.com 
- WalletConnect project ID from cloud.walletconnect.com
- Pinata JWT from pinata.cloud

### Deploy to Vercel (Easiest)
1. Connect your GitHub repo to Vercel
2. Add these environment variables:
   ```
   OPENAI_API_KEY=sk-your-key
   PINATA_JWT=your-jwt  
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-id
   ```
3. Hit deploy

### Other Options
- Netlify: Same process as Vercel
- Railway: Auto-detects Next.js, just connect repo
- Docker: Run `bash scripts/deploy.sh docker`

## Before You Deploy
```bash
# Make sure everything works
npm run build
bash scripts/security-audit.sh
```

## After Deploy
Check these work:
- Homepage loads
- AI chat responds to "SUP"
- Wallet connects
- Health check: your-domain.com/api/health

## If Something Breaks
1. Check the logs in your hosting platform
2. Make sure environment variables are set correctly
3. Verify your API keys are working
4. Check /api/health endpoint

That's it! Your AI agent is live.
