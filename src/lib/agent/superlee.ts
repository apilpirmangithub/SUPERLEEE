// src/lib/agent/superlee.ts
import { findTokenAddress, symbolFor } from "./tokens";
import {
  parseCommandWithAI,
  generateContextualResponse,
  analyzeImageForIP,
  imageToBase64,
  isOpenAIAvailable
} from "../openai";

/** ===== Types ===== */
export type ConversationState =
  | "awaiting_sup"
  | "greeting"
  | "register_awaiting_file"
  | "register_awaiting_name"
  | "register_awaiting_description"
  | "register_awaiting_license"
  | "register_ready"
  | "swap_awaiting_tokens"
  | "swap_awaiting_amount"
  | "swap_ready";

export type SuperleeContext = {
  state: ConversationState;
  flow: "register" | "swap" | null;
  aiEnabled: boolean;
  registerData?: {
    file?: File;
    name?: string;
    description?: string;
    license?: string;
    pilType?: string;
    aiAnalysis?: {
      description: string;
      suggestedTitle: string;
      detectedObjects: string[];
      style?: string;
      mood?: string;
    };
  };
  swapData?: {
    tokenIn?: string;
    tokenOut?: string;
    amount?: number;
    slippagePct?: number;
  };
};

export type SwapIntent = {
  kind: "swap";
  tokenIn: `0x${string}`;
  tokenOut: `0x${string}`;
  amount: number;
  slippagePct?: number;
};

export type RegisterIntent = {
  kind: "register";
  title?: string;
  prompt?: string;
  license?: "by" | "by-nc" | "by-nd" | "by-sa" | "cc0" | "arr";
  pilType?: "open_use" | "non_commercial_remix" | "commercial_use" | "commercial_remix";
};

export type SuperleeResponse =
  | { type: "message"; text: string; buttons?: string[]; image?: { url: string; alt?: string }; links?: { text: string; url: string }[] }
  | { type: "plan"; intent: SwapIntent | RegisterIntent; plan: string[] }
  | { type: "awaiting_file" }
  | { type: "awaiting_input"; prompt: string };

/** ===== Helpers ===== */
const num = (s: string) => parseFloat(s.replace(/,/g, "."));
const pct = (s: string) => parseFloat(s.replace(/,/g, "."));

const RE_ADDR = /0x[a-fA-F0-9]{40}/;
const RE_AMOUNT = /(\d[\d.,]*)/;

/** ===== License Options ===== */
function getLicenseOptions(): string[] {
  const options = [
    "Remix Allowed",
    "Commercial Use Allowed", 
    "Non-Commercial"
  ];
  
  options.push("AI Training Allowed");
  
  return options;
}

function licenseToCode(license: string): { license: string; pilType: string } {
  switch (license) {
    case "Remix Allowed":
      return { license: "by", pilType: "commercial_remix" };
    case "Commercial Use Allowed":
      return { license: "arr", pilType: "commercial_use" };
    case "Non-Commercial":
      return { license: "by-nc", pilType: "non_commercial_remix" };
    case "AI Training Allowed":
      return { license: "cc0", pilType: "open_use" };
    default:
      return { license: "by", pilType: "commercial_remix" };
  }
}

/** ===== Token Parsing ===== */
function parseSwapTokens(text: string): { tokenIn?: string; tokenOut?: string; amount?: number } {
  const cleaned = text.trim().toLowerCase();
  
  // Try to parse various formats
  const patterns = [
    // "wip to usdc 1.5"
    /(\w+)\s+(?:to|>|→)\s+(\w+)\s+([\d.,]+)/i,
    // "1.5 wip to usdc"
    /([\d.,]+)\s+(\w+)\s+(?:to|>|→)\s+(\w+)/i,
    // "swap wip usdc 1.5"
    /swap\s+(\w+)\s+(\w+)\s+([\d.,]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (pattern === patterns[0]) {
        // token1 to token2 amount
        return {
          tokenIn: match[1].toUpperCase(),
          tokenOut: match[2].toUpperCase(),
          amount: num(match[3])
        };
      } else if (pattern === patterns[1]) {
        // amount token1 to token2
        return {
          tokenIn: match[2].toUpperCase(),
          tokenOut: match[3].toUpperCase(),
          amount: num(match[1])
        };
      } else {
        // swap token1 token2 amount
        return {
          tokenIn: match[1].toUpperCase(),
          tokenOut: match[2].toUpperCase(),
          amount: num(match[3])
        };
      }
    }
  }

  return {};
}

/** ===== Main Superlee Engine ===== */
export class SuperleeEngine {
  private context: SuperleeContext = {
    state: "awaiting_sup",
    flow: null,
    aiEnabled: false
  };

  constructor() {
    this.reset();
  }

  reset() {
    this.context = {
      state: "awaiting_sup",
      flow: null,
      aiEnabled: isOpenAIAvailable()
    };
  }

  getGreeting(): SuperleeResponse {
    return {
      type: "message",
      text: "Hey 👋, what do you want to do today? Choose one:",
      buttons: ["Register IP", "Swap Token"]
    };
  }

  async processMessage(message: string, file?: File): Promise<SuperleeResponse> {
    const cleaned = message.trim().toLowerCase();

    // Try AI-powered parsing first if available
    if (this.context.aiEnabled && this.context.state === "greeting") {
      const aiResult = await this.tryAICommandParsing(message);
      if (aiResult) return aiResult;
    }

    // Easter eggs only work in "awaiting_sup" state (before SUP is typed)
    if (this.context.state === "awaiting_sup") {
      // Special response for superlee token - only when not started yet
      if (cleaned.includes("superlee token") || cleaned.includes("token superlee")) {
        return {
          type: "message",
          text: "🪙 Looking for Superlee token info? Check it out here:",
          links: [
            {
              text: "View Superlee Token",
              url: "https://ip.world/token/0x53b3Cd3035feCa127172b84DC5B72a6ca9b9AAb9"
            }
          ]
        };
      }

      // Special responses for easter eggs - only when not started yet
      if (cleaned.includes("who is mushy") || cleaned.includes("mushy")) {
        return {
          type: "message",
          text: "Mushy? Oh, that's the best CM in the world, no doubt. 😎",
          image: {
            url: "https://cdn.builder.io/api/v1/image/assets%2F63395bcf097f453d9ecb84f69d3bcf7c%2F13e4207002674f1985b1c9ba838a17ba?format=webp&width=800",
            alt: "Mushy - The best CM in the world"
          }
        };
      }

      if (cleaned === "dimjink") {
        return {
          type: "message",
          text: "anjink 😂"
        };
      }
    } else {
      // After SUP is typed, easter eggs give warning
      if (cleaned.includes("who is mushy") || cleaned.includes("mushy") || cleaned === "dimjink" || cleaned.includes("superlee token") || cleaned.includes("token superlee")) {
        return {
          type: "message",
          text: "⚠️ Don't type randomly. Please follow the conversation flow!"
        };
      }
    }

    // Special handling for "Continue Registration" with file
    if (message.toLowerCase().includes("continue registration") && file) {
      this.context.flow = "register";
      this.context.registerData = { file };
      this.context.state = "register_awaiting_name";

      return {
        type: "awaiting_input",
        prompt: "Perfect! What should we call this IP? (Enter a title/name)"
      };
    }

    switch (this.context.state) {
      case "awaiting_sup":
        return this.handleSupTrigger(cleaned);

      case "greeting":
        return this.handleGreeting(cleaned);

      case "register_awaiting_file":
        if (file) {
          return this.handleFileUpload(file);
        }
        return {
          type: "awaiting_file"
        };


      case "register_awaiting_name":
        if (message.toLowerCase().includes("continue") || message.toLowerCase().includes("lanjutkan")) {
          return {
            type: "awaiting_input",
            prompt: "Perfect! What should we call this IP? (Enter a title/name)"
          };
        }
        return this.handleNameInput(message);

      case "register_awaiting_description":
        return this.handleDescriptionInput(message);

      case "register_awaiting_license":
        return this.handleLicenseSelection(message);

      case "swap_awaiting_tokens":
        return this.handleTokenInput(message);

      case "swap_awaiting_amount":
        return this.handleAmountInput(message);

      default:
        return {
          type: "message",
          text: "⚠️ Don't type randomly. Please follow the instructions!"
        };
    }
  }

  private handleSupTrigger(message: string): SuperleeResponse {
    if (message === "sup") {
      this.context.state = "greeting";
      return {
        type: "message",
        text: "Hey! What can I help you with? 😊",
        buttons: ["Register IP", "Swap Token"]
      };
    }

    // If user types anything other than "SUP", give warning
    return {
      type: "message",
      text: "⚠️ Don't type randomly. Just type \"SUP\" to start!"
    };
  }

  private handleGreeting(message: string): SuperleeResponse {
    if (message.includes("register") || message.includes("ip")) {
      this.context.flow = "register";
      this.context.state = "register_awaiting_file";
      this.context.registerData = {};
      return {
        type: "message",
        text: "Alright, please upload your IP file.",
        buttons: ["Upload File"]
      };
    }

    if (message.includes("swap") || message.includes("token")) {
      this.context.flow = "swap";
      this.context.state = "swap_awaiting_tokens";
      this.context.swapData = {};
      return {
        type: "awaiting_input",
        prompt: "Which tokens do you want to swap? (e.g., 'WIP to USDC' or 'ETH > USDT')"
      };
    }

    // If user types something invalid, give warning instead of repeating greeting
    return {
      type: "message",
      text: "⚠️ Don't type randomly. Please choose one of the options above!",
      buttons: ["Register IP", "Swap Token"]
    };
  }

  private async handleFileUpload(file: File): Promise<SuperleeResponse> {
    if (!this.context.registerData) {
      this.context.registerData = {};
    }

    this.context.registerData.file = file;

    // Analyze image with AI if available
    await this.analyzeUploadedImage(file);

    this.context.state = "register_awaiting_name";

    let prompt = "Perfect! What should we call this IP? (Enter a title/name)";

    // If AI analysis is available, suggest title
    if (this.context.registerData.aiAnalysis?.suggestedTitle) {
      prompt += `\n\n💡 AI suggests: "${this.context.registerData.aiAnalysis.suggestedTitle}"`;
    }

    return {
      type: "awaiting_input",
      prompt
    };
  }


  private handleNameInput(name: string): SuperleeResponse {
    if (!this.context.registerData) {
      this.context.registerData = {};
    }
    
    this.context.registerData.name = name.trim();
    this.context.state = "register_awaiting_description";
    
    return {
      type: "awaiting_input",
      prompt: "Give me a description of your IP."
    };
  }

  private handleDescriptionInput(description: string): SuperleeResponse {
    if (!this.context.registerData) {
      this.context.registerData = {};
    }

    this.context.registerData.description = description.trim();
    this.context.state = "register_awaiting_license";

    const licenseOptions = getLicenseOptions();

    let message = "Which license type would you like to choose?\n\n";
    licenseOptions.forEach((option, index) => {
      message += `${index + 1}. ${option}\n`;
    });

    // Add AI analysis info if available
    if (this.context.registerData.aiAnalysis) {
      const analysis = this.context.registerData.aiAnalysis;
      message += `\n📸 AI detected: ${analysis.detectedObjects?.join(', ') || 'various objects'}`;
      if (analysis.style) {
        message += `\n🎨 Style: ${analysis.style}`;
      }
      if (analysis.mood) {
        message += `\n😊 Mood: ${analysis.mood}`;
      }
    }

    return {
      type: "message",
      text: message,
      buttons: licenseOptions
    };
  }

  private handleLicenseSelection(license: string): SuperleeResponse {
    if (!this.context.registerData) {
      this.context.registerData = {};
    }
    
    const licenseInfo = licenseToCode(license);
    this.context.registerData.license = licenseInfo.license;
    this.context.registerData.pilType = licenseInfo.pilType;
    this.context.state = "register_ready";
    
    const intent: RegisterIntent = {
      kind: "register",
      title: this.context.registerData.name,
      prompt: this.context.registerData.description,
      license: licenseInfo.license as any,
      pilType: licenseInfo.pilType as any
    };
    
    const plan = [
      `Name IP : "${this.context.registerData.name}"`,
      `Description: "${this.context.registerData.description}"`,
      `License: ${license}`
    ];
    
    return {
      type: "plan",
      intent,
      plan
    };
  }

  private handleTokenInput(message: string): SuperleeResponse {
    const parsed = parseSwapTokens(message);
    
    if (!parsed.tokenIn || !parsed.tokenOut) {
      return {
        type: "awaiting_input",
        prompt: "Please specify both tokens. Example: 'WIP to USDC' or 'ETH > USDT'"
      };
    }

    if (!this.context.swapData) {
      this.context.swapData = {};
    }
    
    this.context.swapData.tokenIn = parsed.tokenIn;
    this.context.swapData.tokenOut = parsed.tokenOut;
    
    if (parsed.amount && parsed.amount > 0) {
      this.context.swapData.amount = parsed.amount;
      return this.prepareSwapPlan();
    }
    
    this.context.state = "swap_awaiting_amount";
    return {
      type: "awaiting_input",
      prompt: `How much ${parsed.tokenIn} do you want to swap?`
    };
  }

  private handleAmountInput(message: string): SuperleeResponse {
    const amount = num(message);
    
    if (!amount || amount <= 0) {
      return {
        type: "awaiting_input",
        prompt: "Please enter a valid amount (e.g., '1.5' or '100')"
      };
    }

    if (!this.context.swapData) {
      this.context.swapData = {};
    }
    
    this.context.swapData.amount = amount;
    return this.prepareSwapPlan();
  }

  private prepareSwapPlan(): SuperleeResponse {
    if (!this.context.swapData?.tokenIn || !this.context.swapData?.tokenOut || !this.context.swapData?.amount) {
      return {
        type: "awaiting_input",
        prompt: "Missing swap information. Please start over."
      };
    }

    const tokenInAddr = findTokenAddress(this.context.swapData.tokenIn);
    const tokenOutAddr = findTokenAddress(this.context.swapData.tokenOut);
    
    if (!tokenInAddr || !tokenOutAddr) {
      // Get available token symbols
      const availableTokens = ["WIP", "USDC", "WETH"]; // Add more as needed
      return {
        type: "awaiting_input",
        prompt: `Token not found. Supported tokens: ${availableTokens.join(", ")}`
      };
    }

    this.context.state = "swap_ready";
    
    const intent: SwapIntent = {
      kind: "swap",
      tokenIn: tokenInAddr,
      tokenOut: tokenOutAddr,
      amount: this.context.swapData.amount,
      slippagePct: this.context.swapData.slippagePct || 0.5
    };

    const plan = [
      `Swap ${this.context.swapData.amount} ${this.context.swapData.tokenIn} → ${this.context.swapData.tokenOut}`,
      `Slippage: ${intent.slippagePct}%`,
      "Get quote from PiperX Aggregator",
      "Approve token if needed",
      "Execute swap transaction",
      "Show transaction result"
    ];

    return {
      type: "plan",
      intent,
      plan
    };
  }

  /** ===== AI-Powered Methods ===== */

  private async tryAICommandParsing(message: string): Promise<SuperleeResponse | null> {
    if (!this.context.aiEnabled) return null;

    try {
      const aiResult = await parseCommandWithAI(message);
      if (!aiResult || aiResult.confidence < 0.7) return null;

      if (aiResult.intent === "swap") {
        return this.handleAISwapCommand(aiResult);
      } else if (aiResult.intent === "register") {
        return this.handleAIRegisterCommand(aiResult);
      }

      return null;
    } catch (error) {
      console.error("AI command parsing failed:", error);
      return null;
    }
  }

  private async handleAISwapCommand(aiResult: any): Promise<SuperleeResponse> {
    this.context.flow = "swap";
    this.context.swapData = {};

    const { extractedData } = aiResult;

    // If AI extracted complete swap data, prepare plan immediately
    if (extractedData.tokenIn && extractedData.tokenOut && extractedData.amount) {
      const tokenInAddr = findTokenAddress(extractedData.tokenIn);
      const tokenOutAddr = findTokenAddress(extractedData.tokenOut);

      if (tokenInAddr && tokenOutAddr) {
        this.context.swapData = {
          tokenIn: extractedData.tokenIn,
          tokenOut: extractedData.tokenOut,
          amount: extractedData.amount,
          slippagePct: extractedData.slippage || 0.5
        };

        return this.prepareSwapPlan();
      }
    }

    // Otherwise, follow normal flow
    this.context.state = "swap_awaiting_tokens";
    const response = await this.generateSmartResponse(
      aiResult.naturalResponse || "I'll help you swap tokens! Which tokens would you like to swap?",
      "User wants to swap tokens"
    );

    return {
      type: "awaiting_input",
      prompt: response || "Which tokens do you want to swap? (e.g., 'WIP to USDC' or 'ETH > USDT')"
    };
  }

  private async handleAIRegisterCommand(aiResult: any): Promise<SuperleeResponse> {
    this.context.flow = "register";
    this.context.state = "register_awaiting_file";
    this.context.registerData = {};

    const response = await this.generateSmartResponse(
      aiResult.naturalResponse || "Great! I'll help you register your IP. Please upload your file.",
      "User wants to register IP"
    );

    return {
      type: "message",
      text: response || "Alright, please upload your IP file.",
      buttons: ["Upload File"]
    };
  }

  private async generateSmartResponse(fallback: string, context: string): Promise<string | null> {
    if (!this.context.aiEnabled) return fallback;

    try {
      const response = await generateContextualResponse(fallback, context);
      return response || fallback;
    } catch (error) {
      console.error("AI response generation failed:", error);
      return fallback;
    }
  }

  private async analyzeUploadedImage(file: File): Promise<void> {
    if (!this.context.aiEnabled || !this.context.registerData) return;

    try {
      const base64 = await imageToBase64(file);
      const analysis = await analyzeImageForIP(base64);

      if (analysis) {
        this.context.registerData.aiAnalysis = analysis;
      }
    } catch (error) {
      console.error("AI image analysis failed:", error);
    }
  }

  getContext(): SuperleeContext {
    return this.context;
  }

  setContext(context: SuperleeContext) {
    this.context = context;
  }
}

export const superleeEngine = new SuperleeEngine();
