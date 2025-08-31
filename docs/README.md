# 🤖 AI Agent DApp

An AI-powered app that lets users chat naturally to swap tokens and register intellectual property as NFTs.

## What It Does

**Chat with AI**: Talk to SuperLee in natural language
- "I want to trade some WIP for USDC" ✅
- "Register my artwork as IP" ✅  
- "Help me swap tokens" ✅

**Smart Features**:
- 🧠 AI understands natural language (OpenAI)
- 📸 Analyzes images automatically 
- 💱 Token swapping via PiperX
- 🎨 IP registration on Story Protocol
- 👤 Face recognition for identity verification

## Quick Start

1. **Get API Keys** (see `docs/SETUP.md`)
   - OpenAI for AI features
   - WalletConnect for wallets
   - Pinata for file storage

2. **Run Locally**
   ```bash
   npm install
   npm run dev
   ```

3. **Deploy** (see `docs/DEPLOY.md`)
   ```bash
   bash scripts/deploy.sh vercel
   ```

## Project Structure

```
src/
├── app/                 # Next.js pages
├── components/          # React components
│   ├── agent/          # AI chat components
│   └── ui/             # UI components
├── lib/
│   ├── openai.ts       # AI integration
│   ├── agent/          # Chat engine
│   └── utils/          # Helper functions
└── hooks/              # React hooks
```

## Key Files

- `src/lib/openai.ts` - AI features
- `src/lib/agent/superlee.ts` - Chat engine
- `src/components/agent/EnhancedAgentOrchestrator.tsx` - Main chat UI
- `next.config.mjs` - Production config
- `src/middleware.ts` - Security headers

## How It Works

1. **User types**: "SUP" to start
2. **AI responds**: Understands natural language
3. **Smart actions**: 
   - Parse commands with AI
   - Analyze uploaded images
   - Execute blockchain transactions
   - Provide helpful responses

## Tech Stack

- **Frontend**: Next.js, React, TypeScript
- **AI**: OpenAI GPT-4 + Vision
- **Blockchain**: Story Protocol, WalletConnect
- **Storage**: IPFS via Pinata
- **Styling**: Tailwind CSS

## Deployment Ready

✅ Production optimized
✅ Security headers configured  
✅ Health monitoring included
✅ Error tracking ready
✅ Multiple platform support

Built with ��️ for the future of AI + Web3
