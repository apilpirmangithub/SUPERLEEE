import OpenAI from "openai";

export const runtime = "nodejs";


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });



const clip = (s: string, max = 280) =>
  (s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 6 * 1024 * 1024; // 6MB

function extractJsonObject(text: string): any | null {
  if (!text) return null;
  // Try direct parse
  try { return JSON.parse(text); } catch {}
  // Code fence ```json ... ```
  const fencedJson = text.match(/```json\s*([\s\S]*?)```/i);
  if (fencedJson) {
    try { return JSON.parse(fencedJson[1]); } catch {}
  }
  // Any code fence ``` ... ```
  const fenced = text.match(/```\s*([\s\S]*?)```/);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch {}
  }
  // Find first balanced JSON object
  const s = String(text);
  const start = s.indexOf('{');
  if (start >= 0) {
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < s.length; i++) {
      const ch = s[i];
      if (inStr) {
        if (esc) { esc = false; }
        else if (ch === '\\') { esc = true; }
        else if (ch === '"') { inStr = false; }
      } else {
        if (ch === '"') inStr = true;
        else if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) {
            const candidate = s.slice(start, i + 1);
            try { return JSON.parse(candidate); } catch {}
            break;
          }
        }
      }
    }
  }
  // Key-value fallback parsing
  const lower = text.toLowerCase();
  const kv = { } as any;
  const mStatus = lower.match(/status\s*[:\-]\s*([\s\S]*?)(?:\n|,|$)/);
  const mRisk = lower.match(/risk\s*[:\-]\s*([\s\S]*?)(?:\n|,|$)/);
  const mTol = lower.match(/tolerance\s*[:\-]\s*([\s\S]*?)(?:\n|,|$)/);
  if (mStatus) kv.status = mStatus[1].trim();
  if (mRisk) kv.risk = mRisk[1].trim();
  if (mTol) kv.tolerance = mTol[1].trim();
  if (kv.status || kv.risk || kv.tolerance) return kv;
  return null;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    let file: File | null = null;
    try {
      file = (form as any).get?.("file") as File | null;
    } catch {}
    if (!file) {
      try {
        for (const [key, value] of ((form as any).entries?.() || [])) {
          if (key === "file" && value) { file = value as File; break; }
        }
      } catch {}
    }
    if (!file) return Response.json({ error: "No file found." }, { status: 400 });
    if (!ALLOWED.has(file.type)) return Response.json({ error: "File must be PNG/JPEG/WEBP." }, { status: 415 });
    if (file.size > MAX_BYTES)
      return Response.json({ error: "File too big! Max 6MB." }, { status: 413 });

    const ab = await file.arrayBuffer();
    const b64 = Buffer.from(ab).toString("base64");
    const dataUrl = `data:${file.type};base64,${b64}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are an IP compliance assistant. Decide if an image is safe to register as IP, whether it qualifies as fair use, and whether it is AI-generated.
Return ONLY a raw JSON object (no backticks, no markdown, no explanations) with keys EXACTLY:
{
  "status": "...",
  "risk": "...",
  "tolerance": "...",
  "ai_generated": true | false,
  "ai_confidence": 0.0,
  "fair_use": true | false,
  "fair_use_reason": "...",
  "flags": {
    "logo_brand": true | false,
    "copyrighted_character": true | false,
    "watermark": true | false,
    "visible_text": true | false,
    "face_identity": true | false,
    "nsfw": true | false,
    "illegal": true | false,
    "derivative_trace": true | false
  }
}
Rules:
- Be conservative by default. If unsure, set risk to "Medium" and tolerance to a cautionary message.
- Only use tolerance starting with "Good to register" when you are confident and risk is "Low".
- Evaluate: logos/brands, copyrighted characters, watermarks, visible text, faces/identity, tracing/derivatives, NSFW/illegal.
- Consider fair use categories: commentary, criticism, news reporting, teaching, scholarship, research, parody, or incidental/background inclusion. If incidental/background use is evident, set fair_use=true and explain briefly in fair_use_reason.
- For ai_generated, output a boolean. For ai_confidence, output a number from 0 to 1 (two decimals max).
- Keep each text field ≤ 280 chars. No extra fields, no prose, no code fences.
`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this image for IP safety, fair use eligibility, and whether it's AI-generated. Return only the JSON object defined (no backticks/markdown)." },
            { type: "image_url", image_url: { url: dataUrl, detail: "low" } }
          ] as any
        }
      ],
      temperature: 0.1,
      top_p: 0,
      max_tokens: 160,
      response_format: { type: "json_object" }
    }, { timeout: 7000 });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { status?: string; risk?: string; tolerance?: string; ai_generated?: boolean; ai_confidence?: number; fair_use?: boolean; fair_use_reason?: string; flags?: Record<string, any> } = {};
    const extracted = extractJsonObject(raw);
    if (extracted && typeof extracted === 'object') {
      parsed = extracted as any;
    } else {
      parsed = {
        status: clip(raw),
        risk: "Not valid JSON, verify manually",
        tolerance: "Proceed with caution, verify manually",
        ai_generated: false,
        ai_confidence: 0,
        fair_use: false,
        fair_use_reason: "",
        flags: {}
      };
    }

    let status = clip(parsed.status ?? "");
    let risk = clip(parsed.risk ?? "");
    let tolerance = clip(parsed.tolerance ?? "");

    // Normalize AI fields
    let aiGenerated = Boolean(parsed.ai_generated);
    let aiConfidence = typeof parsed.ai_confidence === 'number' ? parsed.ai_confidence : 0;
    if (!isFinite(aiConfidence as number)) aiConfidence = 0;
    aiConfidence = Math.max(0, Math.min(1, Number(aiConfidence.toFixed(2))));

    // Normalize Fair Use
    const fairUse = Boolean(parsed.fair_use);
    const fairUseReason = clip(parsed.fair_use_reason ?? "");

    // Normalize Flags
    const f = parsed.flags || {};
    const flags = {
      logo_brand: !!f.logo_brand,
      copyrighted_character: !!f.copyrighted_character,
      watermark: !!f.watermark,
      visible_text: !!f.visible_text,
      face_identity: !!f.face_identity,
      nsfw: !!f.nsfw,
      illegal: !!f.illegal,
      derivative_trace: !!f.derivative_trace,
    };

    const strict = (process.env.IP_STATUS_STRICT ?? 'true') === 'true';
    if (strict) {
      const r = (risk || '').toLowerCase();
      const t = (tolerance || '').toLowerCase();
      const uncertain = r.includes('unknown') || r.includes('unable') || r.includes('unsure') || r.includes('cannot') || r.trim() === '';

      const hasSevere = flags.illegal || flags.nsfw;
      const rightsSensitive = flags.logo_brand || flags.copyrighted_character || flags.watermark || flags.derivative_trace;

      if (hasSevere) {
        risk = 'High';
        tolerance = 'Do not register';
      } else if (fairUse) {
        risk = 'Low';
        tolerance = 'Good to register (fair use)';
      } else if (!rightsSensitive && !flags.face_identity) {
        risk = 'Low';
        tolerance = 'Good to register';
      } else if (uncertain) {
        risk = 'Medium';
        tolerance = 'Proceed with caution, verify manually';
      }

      if (t.startsWith('good to register') && !r.includes('low') && !fairUse) {
        tolerance = 'Proceed with caution';
      }
      if (!tolerance) tolerance = 'Proceed with caution';
      if (!status) status = 'Automated assessment completed';
    } else {
      if (!status) status = 'Assessment by OpenAI';
      if (!risk) risk = 'Unknown';
      if (!tolerance) tolerance = 'Proceed with caution';
    }

    const aiLine = `AI: ${aiGenerated ? 'AI-generated' : 'Original'} (${Math.round(aiConfidence * 100)}%)`;
    const fairUseLine = `Fair Use: ${fairUse ? 'Yes' : 'No'}${fairUse && fairUseReason ? ` — ${fairUseReason}` : ''}`;
    const flagsLine = `Flags: ${Object.entries(flags).filter(([_,v])=>v).map(([k])=>k).join(', ') || 'None'}`;
    const formatted =
`Status: ${status}
Risk: ${risk}
Tolerance: ${tolerance}
${aiLine}
${fairUseLine}
${flagsLine}`;

    return Response.json({ result: formatted, aiGenerated, aiConfidence, fairUse, fairUseReason, flags });
  } catch (err: any) {
    console.error(err);
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
