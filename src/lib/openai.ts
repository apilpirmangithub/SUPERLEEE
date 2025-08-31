import OpenAI from 'openai';

// Initialize OpenAI client
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!openaiClient) {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.warn('OpenAI API key not found. Falling back to rule-based parsing.');
      return null;
    }
    
    try {
      openaiClient = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true // Required for client-side usage
      });
    } catch (error) {
      console.error('Failed to initialize OpenAI client:', error);
      return null;
    }
  }
  
  return openaiClient;
}

// Types for OpenAI responses
export interface AICommandParsing {
  intent: 'swap' | 'register' | 'unknown';
  confidence: number;
  extractedData: {
    // For swap
    tokenIn?: string;
    tokenOut?: string;
    amount?: number;
    slippage?: number;
    // For register
    title?: string;
    description?: string;
    license?: string;
  };
  naturalResponse: string;
}

export interface AIImageDescription {
  description: string;
  suggestedTitle: string;
  detectedObjects: string[];
  style?: string;
  mood?: string;
}

// Parse user command with natural language understanding
export async function parseCommandWithAI(message: string): Promise<AICommandParsing | null> {
  const client = getOpenAIClient();
  if (!client) return null;
  
  try {
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that parses user commands for a DeFi/IP platform. 
          
Users can either:
1. SWAP tokens (examples: "swap 1 WIP to USDC", "trade 100 USDT for ETH", "convert BTC to USDC")
2. REGISTER IP (examples: "register this image", "mint my artwork as NFT", "create IP for my photo")

Supported tokens: WIP, USDC, WETH, ETH, BTC, USDT

Respond with a JSON object containing:
- intent: "swap" | "register" | "unknown" 
- confidence: 0-1 (how confident you are)
- extractedData: relevant data extracted from the message
- naturalResponse: a friendly response acknowledging what the user wants

For swap commands, extract: tokenIn, tokenOut, amount, slippage (if mentioned)
For register commands, extract: title, description, license type if mentioned`
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    return JSON.parse(content) as AICommandParsing;
  } catch (error) {
    console.error('OpenAI command parsing error:', error);
    return null;
  }
}

// Generate smart conversational responses
export async function generateContextualResponse(
  userMessage: string, 
  context: string, 
  intent?: string
): Promise<string | null> {
  const client = getOpenAIClient();
  if (!client) return null;
  
  try {
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are SuperLee, a friendly and helpful AI assistant for a DeFi/IP platform. 
          
Your personality:
- Casual and approachable (use Indonesian slang occasionally)
- Expert in crypto trading and IP registration
- Always helpful and encouraging
- Keep responses concise but warm

Context: ${context}
Intent: ${intent || 'general conversation'}

Respond naturally in a conversational way. If user needs clarification, ask specific questions.`
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      temperature: 0.7,
      max_tokens: 200
    });

    return response.choices[0]?.message?.content || null;
  } catch (error) {
    console.error('OpenAI response generation error:', error);
    return null;
  }
}

// Analyze uploaded images for IP registration
export async function analyzeImageForIP(imageBase64: string): Promise<AIImageDescription | null> {
  const client = getOpenAIClient();
  if (!client) return null;
  
  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'system',
          content: `You are an AI that analyzes images for intellectual property registration. 
          
Provide a JSON response with:
- description: detailed description of the image (2-3 sentences)
- suggestedTitle: a catchy title for this artwork/photo
- detectedObjects: array of main objects/subjects in the image
- style: artistic style if applicable (photography, digital art, painting, etc.)
- mood: the mood/emotion conveyed by the image`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this image for IP registration. Provide detailed insights that would help with metadata and description.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      temperature: 0.5,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    return JSON.parse(content) as AIImageDescription;
  } catch (error) {
    console.error('OpenAI image analysis error:', error);
    return null;
  }
}

// Convert image file to base64 for OpenAI Vision API
export async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:image/...;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Check if OpenAI is available
export function isOpenAIAvailable(): boolean {
  return getOpenAIClient() !== null;
}

// Get OpenAI status for debugging
export function getOpenAIStatus(): { available: boolean; error?: string } {
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return {
      available: false,
      error: 'API key not configured'
    };
  }
  
  try {
    const client = getOpenAIClient();
    return {
      available: client !== null
    };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
