# Environment Variables Template

Copy this to your `.env.local` or production environment:

```bash
# =================================
# AI AGENT DAPP - Environment Variables
# =================================

# =================================
# AI & OpenAI Configuration
# =================================
# Required for AI-powered features
OPENAI_API_KEY=sk-your-openai-api-key-here

# =================================
# Blockchain & Web3 Configuration  
# =================================
# Story Protocol Network
NEXT_PUBLIC_CHAIN_ID=1513
NEXT_PUBLIC_STORY_RPC_URL=https://testnet.storyrpc.io
NEXT_PUBLIC_STORY_EXPLORER=https://testnet.storyscan.xyz

# Story Protocol Collection
NEXT_PUBLIC_SPG_COLLECTION=0x322813fd9a801c5507c9de605d63cea4f2ce6c44

# WalletConnect Project ID (get from https://cloud.walletconnect.com)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id

# =================================
# IPFS & File Storage
# =================================
# Pinata for IPFS uploads
PINATA_JWT=your-pinata-jwt-token
PINATA_GATEWAY_URL=https://gateway.pinata.cloud

# =================================
# Performance & Monitoring
# =================================
# Analytics & Error Monitoring (Optional)
NEXT_PUBLIC_ANALYTICS_ID=
SENTRY_DSN=
VERCEL_ANALYTICS_ID=

# =================================
# Security Configuration
# =================================
# Application Security (Optional)
NEXTAUTH_SECRET=your-super-secret-jwt-secret-here
NEXTAUTH_URL=https://your-domain.com

# =================================
# Feature Flags
# =================================
# AI Features
NEXT_PUBLIC_AI_FEATURES_ENABLED=true
NEXT_PUBLIC_IMAGE_ANALYSIS_ENABLED=true

# IP Detection & Safety (legacy settings)
NEXT_PUBLIC_IP_STATUS_MODE=client
NEXT_PUBLIC_CAMERA_ONLY_ON_FACE=false
NEXT_PUBLIC_NON_WL_ALWAYS_CAUTION=true

# Face Recognition Settings
NEXT_PUBLIC_FACE_SIM_THRESHOLD=0.82
NEXT_PUBLIC_IDENTITY_DHASH_THRESHOLD=14
NEXT_PUBLIC_SAFE_IMAGE_DHASH_SIZE=8
NEXT_PUBLIC_SAFE_IMAGE_CENTER_CROP=0.7

# Registry & Duplicate Check
NEXT_PUBLIC_REGISTRY_DUPCHECK_TIMEOUT_MS=8000

# =================================
# External CDN & Resources
# =================================
# Face Recognition Models
NEXT_PUBLIC_ORT_WEB_CDN=https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.min.js
NEXT_PUBLIC_INSIGHTFACE_RECOG_URL=https://cdn.jsdelivr.net/npm/insightface.js@0.1.0/models/buffalo_l/w600k_r50.onnx
NEXT_PUBLIC_INSIGHTFACE_INPUT_SIZE=112
NEXT_PUBLIC_INSIGHTFACE_CHANNEL_ORDER=BGR
```

## Required for Basic Functionality

**Minimal setup:**
```bash
OPENAI_API_KEY=sk-your-key-here
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id
PINATA_JWT=your-pinata-jwt
```

## Required for Production

**Essential for production:**
```bash
# All basic variables above, plus:
NEXTAUTH_SECRET=your-super-secret-key
NEXTAUTH_URL=https://your-domain.com
SENTRY_DSN=your-sentry-dsn (optional but recommended)
```
