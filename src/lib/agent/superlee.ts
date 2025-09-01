// src/lib/agent/superlee.ts
import {
  parseCommandWithAI,
  generateContextualResponse,
  analyzeImageForIP,
  imageToBase64,
  isOpenAIAvailable
} from "../openai";
import type { RagIndex } from "@/lib/rag";
import { embedTexts, topK } from "@/lib/rag";

/** ===== Types ===== */
export type ConversationState =
  | "greeting"
  | "register_awaiting_file"
  | "register_awaiting_name"
  | "register_awaiting_description"
  | "register_awaiting_license"
  | "register_ready";

export type SuperleeContext = {
  state: ConversationState;
  flow: "register" | null;
  aiEnabled: boolean;
  ragIndex?: RagIndex | null;
  lastUserMessage?: string;
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
  | { type: "plan"; intent: RegisterIntent; plan: string[] }
  | { type: "awaiting_file" }
  | { type: "awaiting_input"; prompt: string };

/** ===== License Options ===== */
function getLicenseOptions(): string[] {
  return [
    "Open Use",
    "Commercial Remix"
  ];
}

function licenseToCode(license: string): { license: string; pilType: string } | null {
  const s = license.trim().toLowerCase();
  if (s === "open use" || s === "open" || s === "gratis" || s === "free" || s === "1") {
    return { license: "cc0", pilType: "open_use" };
  }
  if (s === "commercial remix" || s === "commercial" || s === "komersial" || s === "remix" || s === "2") {
    return { license: "by", pilType: "commercial_remix" };
  }
  if (license === "Open Use") return { license: "cc0", pilType: "open_use" };
  if (license === "Commercial Remix") return { license: "by", pilType: "commercial_remix" };
  return null;
}

/** ===== Main Superlee Engine (IP-only) ===== */
export class SuperleeEngine {
  private context: SuperleeContext = {
    state: "greeting",
    flow: null,
    aiEnabled: false
  };

  constructor() {
    this.reset();
  }

  reset() {
    this.context = {
      state: "greeting",
      flow: null,
      aiEnabled: isOpenAIAvailable()
    };
  }

  async getGreeting(): Promise<SuperleeResponse> {
    let greetingText = "Halo! Saya asisten IP. Unggah gambar untuk registrasi IP, atau pilih tombol di bawah.";

    const allowSmart = (process.env.NEXT_PUBLIC_AI_SMART_RESPONSES ?? 'false') === 'true';
    if (this.context.aiEnabled && allowSmart) {
      try {
        const aiGreeting = await generateContextualResponse(
          "User just opened the app",
          "Initial greeting for an IP registration assistant"
        );
        if (aiGreeting) greetingText = aiGreeting;
      } catch {}
    }

    return {
      type: "message",
      text: greetingText,
      buttons: ["Register IP", "Browse IP", "Help"]
    };
  }

  async processMessage(message: string, file?: File): Promise<SuperleeResponse> {
    const cleaned = message.trim().toLowerCase();
    this.context.lastUserMessage = message;

    // Light easter eggs (non-blocking)
    if (cleaned.includes("who is mushy") || cleaned.includes("mushy")) {
      return {
        type: "message",
        text: "Mushy? Oh, that's the best CM in the world, no doubt. ��",
        image: {
          url: "https://cdn.builder.io/api/v1/image/assets%2F63395bcf097f453d9ecb84f69d3bcf7c%2F13e4207002674f1985b1c9ba838a17ba?format=webp&width=800",
          alt: "Mushy - The best CM in the world"
        }
      };
    }

    // Clarify that swap is disabled
    if (/\bswap\b|\btoken\b|\btrade\b|\bconvert\b/i.test(message)) {
      return {
        type: "message",
        text: "Fokus kami kini khusus registrasi IP. Fitur swap token dinonaktifkan.",
        buttons: ["Register IP", "Help"]
      };
    }

    // Allow one-click continuation after analysis (EN + ID)
    const isContinue = cleaned.includes("continue registration") || /\blanjut(kan)?\s+registrasi\b/i.test(message) || /\blanjut\s*regist\b/i.test(message);
    if (isContinue) {
      if (file) {
        this.context.flow = "register";
        this.context.registerData = { file };
        this.context.state = "register_awaiting_name";
        return { type: "awaiting_input", prompt: "Perfect! What should we call this IP? (Enter a title/name)" };
      }
      this.context.flow = "register";
      this.context.state = "register_awaiting_file";
      return { type: "message", text: "Lampirkan gambar terlebih dulu.", buttons: ["Upload File"] };
    }

    switch (this.context.state) {
      case "greeting":
        return await this.handleGreeting(cleaned);

      case "register_awaiting_file":
        if (file) return await this.handleFileUpload(file);
        return { type: "awaiting_file" };

      case "register_awaiting_name":
        if (message.toLowerCase().includes("continue") || message.toLowerCase().includes("lanjutkan")) {
          return { type: "awaiting_input", prompt: "Perfect! What should we call this IP? (Enter a title/name)" };
        }
        return this.handleNameInput(message);

      case "register_awaiting_description":
        return this.handleDescriptionInput(message);

      case "register_awaiting_license":
        return this.handleLicenseSelection(message);

      default:
        return await this.handleUnknownCommand(message);
    }
  }

  private async handleGreeting(message: string): Promise<SuperleeResponse> {
    if (/\b(browse|dashboard|my ip|lihat ip)\b/i.test(message)) {
      return { type: "message", text: "Membuka Dashboard IP Anda.", links: [{ text: "Open Dashboard", url: "/dashboard" }] };
    }
    if (/^(search|cari)\s+(.+)/i.test(message)) {
      const q = message.replace(/^(search|cari)\s+/i, "").trim();
      return { type: "message", text: `Hasil pencarian untuk: ${q}`, links: [{ text: "Buka hasil di Dashboard", url: `/dashboard?q=${encodeURIComponent(q)}` }] };
    }
    if (message.includes("register") || message.includes("ip") || message.includes("mint")) {
      this.context.flow = "register";
      this.context.state = "register_awaiting_file";
      this.context.registerData = {};
      return { type: "message", text: "Baik, unggah file IP Anda.", buttons: ["Upload File"] };
    }

    return {
      type: "message",
      text: "Silakan pilih Registrasi IP untuk memulai, atau ketik: ‘browse’ / ‘search <kata>’.",
      buttons: ["Register IP", "Browse IP", "Help"]
    };
  }

  private async handleFileUpload(file: File): Promise<SuperleeResponse> {
    if (!this.context.registerData) this.context.registerData = {};
    this.context.registerData.file = file;

    await this.analyzeUploadedImage(file);

    this.context.state = "register_awaiting_name";

    let prompt = "Perfect! What should we call this IP? (Enter a title/name)";
    if (this.context.registerData.aiAnalysis?.suggestedTitle) {
      prompt += `\n\n💡 AI suggests: "${this.context.registerData.aiAnalysis.suggestedTitle}"`;
    }

    return { type: "awaiting_input", prompt };
  }

  private handleNameInput(name: string): SuperleeResponse {
    if (!this.context.registerData) this.context.registerData = {};
    this.context.registerData.name = name.trim();
    this.context.state = "register_awaiting_description";

    let prompt = "Give me a description of your IP.";
    if (this.context.registerData.aiAnalysis?.description) {
      prompt += `\n\n💡 AI suggests: "${this.context.registerData.aiAnalysis.description}"`;
    }

    return { type: "awaiting_input", prompt };
  }

  private handleDescriptionInput(description: string): SuperleeResponse {
    if (!this.context.registerData) this.context.registerData = {};
    this.context.registerData.description = description.trim();

    // Skip license step: go straight to PlanBox with sensible default (can be changed there)
    const defaultPil = (process.env.NEXT_PUBLIC_DEFAULT_PIL || 'commercial_remix').toLowerCase();
    const pilType = defaultPil === 'open_use' ? 'open_use' : 'commercial_remix';
    const license = pilType === 'open_use' ? 'cc0' : 'by';
    this.context.registerData.pilType = pilType;
    this.context.registerData.license = license;
    this.context.state = 'register_ready';

    const intent: RegisterIntent = {
      kind: 'register',
      title: this.context.registerData.name,
      prompt: this.context.registerData.description,
      license: license as any,
      pilType: pilType as any
    };

    const plan = [
      `Name IP : "${this.context.registerData.name}"`,
      `Description: "${this.context.registerData.description}"`,
      `License: ${pilType === 'open_use' ? 'Open Use' : 'Commercial Remix'}`
    ];

    return { type: 'plan', intent, plan };
  }

  private handleLicenseSelection(license: string): SuperleeResponse {
    if (!this.context.registerData) this.context.registerData = {};

    const info = licenseToCode(license);
    if (!info) {
      const licenseOptions = getLicenseOptions();
      return {
        type: "message",
        text: "Pilih tipe lisensi dari tombol berikut:",
        buttons: licenseOptions
      };
    }

    this.context.registerData.license = info.license;
    this.context.registerData.pilType = info.pilType;
    this.context.state = "register_ready";

    const intent: RegisterIntent = {
      kind: "register",
      title: this.context.registerData.name,
      prompt: this.context.registerData.description,
      license: info.license as any,
      pilType: info.pilType as any
    };

    const plan = [
      `Name IP : "${this.context.registerData.name}"`,
      `Description: "${this.context.registerData.description}"`,
      `License: ${info.pilType === 'open_use' ? 'Open Use' : 'Commercial Remix'}`
    ];

    return { type: "plan", intent, plan };
  }

  /** ===== AI-Powered Methods ===== */
  private async tryAICommandParsing(message: string): Promise<SuperleeResponse | null> {
    if (/\bregister\b|\bmint\b|\bip\b/i.test(message)) {
      this.context.flow = "register";
      this.context.state = "register_awaiting_file";
      return { type: "message", text: "Baik, unggah file IP Anda.", buttons: ["Upload File"] };
    }

    if (!this.context.aiEnabled) return null;

    try {
      const aiResult = await parseCommandWithAI(message);
      if (!aiResult || aiResult.confidence < 0.7) return null;
      if (aiResult.intent === "register") return this.handleAIRegisterCommand(aiResult);
      return null;
    } catch {
      return null;
    }
  }

  private async handleAIRegisterCommand(aiResult: any): Promise<SuperleeResponse> {
    this.context.flow = "register";
    this.context.state = "register_awaiting_file";
    this.context.registerData = {};

    const response = await this.generateSmartResponse(
      aiResult.naturalResponse || "Great! I'll help you register your IP. Please upload your file.",
      "User wants to register IP"
    );

    return { type: "message", text: response || "Baik, unggah file IP Anda.", buttons: ["Upload File"] };
  }

  private async generateSmartResponse(fallback: string, context: string): Promise<string | null> {
    if (!this.context.aiEnabled) return fallback;

    const allowSmart = (process.env.NEXT_PUBLIC_AI_SMART_RESPONSES ?? 'false') === 'true';
    const basic = /User wants to register IP|Initial greeting/i.test(context);
    if (!allowSmart && basic) return fallback;

    let ctx = context;
    try {
      if (this.context.ragIndex && this.context.lastUserMessage && /whitepaper|story\b|architecture|execution layer|proof of creativity|consensus/i.test(this.context.lastUserMessage)) {
        const [q] = await embedTexts([this.context.lastUserMessage]);
        const hits = topK(this.context.ragIndex, q, 5);
        const snippets = hits.map(h => h.text.slice(0, 600)).join('\n---\n');
        ctx = `${context}\n\nRelevant docs:\n${snippets}`;
      }
    } catch {}

    try {
      const response = await generateContextualResponse(fallback, ctx);
      return response || fallback;
    } catch {
      return fallback;
    }
  }

  private async handleUnknownCommand(message: string): Promise<SuperleeResponse> {
    const fallbackText = "Saya tidak paham. Saya fokus membantu registrasi IP. Ingin mulai registrasi?\nPanduan: https://docs.story.foundation/";

    if (this.context.aiEnabled) {
      const smartResponse = await this.generateSmartResponse(
        `User said: "${message}" but I don't understand`,
        "Help user understand available IP actions"
      );

      if (smartResponse) {
        return { type: "message", text: smartResponse, buttons: ["Register IP", "Help"] };
      }
    }

    return { type: "message", text: fallbackText, buttons: ["Register IP", "Help"] };
  }

  private async analyzeUploadedImage(file: File): Promise<void> {
    if (!this.context.aiEnabled || !this.context.registerData) return;
    try {
      const base64 = await imageToBase64(file);
      const analysis = await analyzeImageForIP(base64);
      if (analysis) this.context.registerData.aiAnalysis = analysis;
    } catch {}
  }

  getContext() { return this.context; }
  setContext(context: SuperleeContext) { this.context = context; }
  setRagIndex(index: RagIndex | null) { this.context.ragIndex = index; }
}

export const superleeEngine = new SuperleeEngine();
