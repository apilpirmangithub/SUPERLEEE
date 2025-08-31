import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    // Basic health checks
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      node_version: process.version,
      checks: {
        openai: checkOpenAI(),
        ipfs: checkIPFS(),
        environment: checkEnvironment()
      }
    };

    return NextResponse.json(healthStatus, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}

function checkOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  return {
    configured: !!apiKey,
    status: apiKey ? 'ready' : 'not_configured'
  };
}

function checkIPFS() {
  const pinataJWT = process.env.PINATA_JWT;
  return {
    configured: !!pinataJWT,
    status: pinataJWT ? 'ready' : 'not_configured'
  };
}

function checkEnvironment() {
  const requiredVars = [
    'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID',
    'NEXT_PUBLIC_CHAIN_ID',
    'NEXT_PUBLIC_STORY_RPC_URL'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  return {
    required_vars_set: missing.length === 0,
    missing_vars: missing,
    status: missing.length === 0 ? 'ready' : 'incomplete'
  };
}
