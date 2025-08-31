# ⚙️ Environment Setup

Copy this to your `.env.local` file:

```bash
# Required - Get these first!
OPENAI_API_KEY=sk-your-openai-key-here
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-walletconnect-id
PINATA_JWT=your-pinata-jwt-token

# Blockchain stuff (already configured)
NEXT_PUBLIC_CHAIN_ID=1513
NEXT_PUBLIC_STORY_RPC_URL=https://testnet.storyrpc.io
NEXT_PUBLIC_SPG_COLLECTION=0x322813fd9a801c5507c9de605d63cea4f2ce6c44

# Optional - For monitoring
SENTRY_DSN=your-sentry-dsn
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
```

## Getting API Keys

### OpenAI (Required for AI features)
1. Go to platform.openai.com
2. Create account → API Keys
3. Create new key (starts with "sk-")
4. Copy it to `OPENAI_API_KEY`

### WalletConnect (Required for wallet connections)  
1. Go to cloud.walletconnect.com
2. Create project
3. Copy Project ID
4. Add to `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

### Pinata (Required for IPFS uploads)
1. Go to pinata.cloud
2. Sign up → API Keys
3. Create new JWT
4. Copy to `PINATA_JWT`

## For Production
Add these extra variables for production:
```bash
NEXTAUTH_SECRET=your-super-secret-random-string
NEXTAUTH_URL=https://your-domain.com
```

## Test It Works
```bash
npm run dev
# Go to localhost:3000
# AI status should show "AI Enhanced" if OpenAI is working
```

That's all you need! 🎯
