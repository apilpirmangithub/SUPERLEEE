export const runtime = "nodejs";

import OpenAI from "openai";
import { NextResponse } from "next/server";

type Chunk = { id: string; text: string };

export async function POST(req: Request) {
  try {
    const { chunks } = (await req.json()) as { chunks: Chunk[] };
    if (!Array.isArray(chunks) || chunks.length === 0) {
      return NextResponse.json({ error: "No chunks provided" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ ok: false, error: "openai-not-configured" }, { status: 200 });

    const openai = new OpenAI({ apiKey });

    // Truncate text to a safe length per chunk
    const inputs = chunks.map((c) => (c.text || "").slice(0, 4000));

    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: inputs,
    });

    const vectors = emb.data.map((d, i) => ({ id: chunks[i].id, text: inputs[i], embedding: d.embedding }));

    return NextResponse.json({ ok: true, model: emb.model, created: emb.created, vectors });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "embed-failed" }, { status: 200 });
  }
}
