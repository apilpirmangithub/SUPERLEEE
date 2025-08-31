# Deploy Checklist

## Before Deploy
- Got all API keys (OpenAI, WalletConnect, Pinata)
- Build works: `npm run build`  
- Security check passes: `bash scripts/security-audit.sh`
- AI features tested locally

## Deploy Steps
- Choose platform (Vercel recommended)
- Connect GitHub repo
- Add environment variables
- Deploy

## After Deploy - Test These
- Homepage loads
- Type "SUP" in chat - should respond
- Try "I want to swap tokens" - AI should understand
- Upload an image - should analyze it
- Connect wallet - should work
- Health check works: /api/health

## If AI Features Don't Work
- Check OpenAI API key is correct
- Make sure you have credits in OpenAI account
- Look for "AI Enhanced" status indicator

## Performance Check
- Page loads under 3 seconds
- No console errors
- Mobile version works

## Monitoring (Optional)
- Setup Sentry for error tracking
- Enable analytics
- Setup uptime monitoring

## You're Live
Your AI-powered DeFi app is ready for users.

## Need Help
- Check logs in your hosting platform
- Run health check: your-domain.com/api/health
- Verify environment variables are set correctly
