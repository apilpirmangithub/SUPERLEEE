"use client";

import React, { useState } from "react";
import { uploadJSON } from "@/lib/utils/ipfs";

async function loadScriptOnce(src: string): Promise<void> {
  const exists = Array.from(document.scripts).some(s => s.src === src);
  if (exists) return;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.async = true; s.onload = () => resolve(); s.onerror = () => reject(new Error('script load failed'));
    document.head.appendChild(s);
  });
}

function chunkText(text: string, size = 1200, overlap = 200): { id: string; text: string }[] {
  const parts: { id: string; text: string }[] = [];
  let i = 0, idx = 0;
  while (i < text.length) {
    const end = Math.min(text.length, i + size);
    const slice = text.slice(i, end);
    parts.push({ id: `c${idx++}`, text: slice });
    i = end - overlap;
    if (i < 0) i = 0;
  }
  return parts;
}

export default function RagIndexer({ url, className = "" }: { url: string; className?: string }) {
  const [status, setStatus] = useState<string>("");
  const [indexUrl, setIndexUrl] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const build = async () => {
    setBusy(true); setStatus("Fetching PDF..."); setIndexUrl("");
    try {
      await loadScriptOnce("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.js");
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) throw new Error('pdfjs not available');
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.js";

      const res = await fetch(url);
      const buf = new Uint8Array(await res.arrayBuffer());
      const doc = await pdfjsLib.getDocument({ data: buf }).promise;

      setStatus(`Parsing ${doc.numPages} pages...`);
      let full = "";
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const tc = await page.getTextContent();
        const text = tc.items.map((it: any)=> it.str).join(" ");
        full += `\n\n[Page ${p}]\n` + text;
      }

      setStatus("Chunking...");
      const chunks = chunkText(full);

      setStatus("Embedding...");
      const resp = await fetch('/api/rag/embed', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chunks }) });
      const emb = await resp.json();
      if (!emb?.ok) throw new Error('embed failed');

      const index = { source: url, model: emb.model, created: Date.now(), vectors: emb.vectors };
      setStatus("Uploading index to IPFS...");
      const up = await uploadJSON(index);
      const cid = up.cid || up.url;
      setIndexUrl(`https://ipfs.io/ipfs/${cid.replace(/^ipfs:\/\//, '')}`);
      setStatus("Done");
    } catch (e: any) {
      setStatus(e?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`bg-white/5 border border-white/10 rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-white font-medium">RAG Indexer (PDF → IPFS)</div>
          <div className="text-white/60 text-xs break-all">{url}</div>
        </div>
        <button onClick={build} disabled={busy} className="px-3 py-2 rounded bg-sky-500 text-white disabled:opacity-50">{busy ? 'Processing...' : 'Build Index'}</button>
      </div>
      <div className="text-sm text-white/80">{status}</div>
      {indexUrl && (
        <div className="mt-2 text-xs text-sky-300 break-all">Index: {indexUrl}</div>
      )}
    </div>
  );
}
