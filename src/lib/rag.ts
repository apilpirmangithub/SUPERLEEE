import { fetchJSON, toHttps, extractCid } from "@/lib/utils/ipfs";

export type RagVector = { id: string; text: string; embedding: number[] };
export type RagIndex = { source: string; model: string; created: number; vectors: RagVector[] };

export function cosine(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < len; i++) { const x = a[i], y = b[i]; dot += x*y; na += x*x; nb += y*y; }
  const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
  return dot / denom;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const r = await fetch("/api/rag/embed", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chunks: texts.map((t, i)=>({ id: String(i), text: t })) }) });
  const j = await r.json();
  if (!j?.ok) throw new Error("embed-failed");
  return j.vectors.map((v: any)=> v.embedding as number[]);
}

export async function loadIndexFromIpfs(cidOrUrl: string): Promise<RagIndex> {
  const url = toHttps(extractCid(cidOrUrl));
  return await fetchJSON(url);
}

export function topK(index: RagIndex, qEmbedding: number[], k = 5): RagVector[] {
  const scored = index.vectors.map(v => ({ v, s: cosine(qEmbedding, v.embedding) }));
  scored.sort((a,b)=> b.s - a.s);
  return scored.slice(0, k).map(x => x.v);
}
