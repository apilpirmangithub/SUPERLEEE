"use client";

import React, { useState } from "react";
import { X, Upload, FileText } from "lucide-react";
import { uploadFile, uploadJSON, extractCid, toHttps } from "@/lib/utils/ipfs";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmitted?: (params: { cid: string; url: string }) => void;
};

export default function ManualReviewModal({ open, onClose, onSubmitted }: Props) {
  const [name, setName] = useState("");
  const [wallet, setWallet] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [links, setLinks] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list);
    setFiles(prev => [...prev, ...arr].slice(0, 6));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // Upload attachments first
      const attachments: { name: string; cid: string; url: string }[] = [];
      for (const f of files) {
        const up = await uploadFile(f);
        const cid = extractCid(up.cid || up.url);
        attachments.push({ name: f.name, cid, url: toHttps(cid) });
      }

      const payload = {
        type: "manual_review_request",
        createdAt: new Date().toISOString(),
        applicant: { name, wallet, email },
        description,
        links: links
          .split(/[\n,]/)
          .map(s => s.trim())
          .filter(Boolean),
        attachments,
      };

      const j = await uploadJSON(payload);
      const cid = extractCid(j.cid || j.url);
      const url = toHttps(cid);
      onSubmitted?.({ cid, url });
      onClose();
    } catch (e: any) {
      setError(e?.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Manual Review</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Nama
            <input value={name} onChange={e=>setName(e.target.value)} className="bg-transparent border border-white/15 rounded p-2" placeholder="Nama lengkap" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Wallet
            <input value={wallet} onChange={e=>setWallet(e.target.value)} className="bg-transparent border border-white/15 rounded p-2" placeholder="0x..." />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            Email (opsional)
            <input value={email} onChange={e=>setEmail(e.target.value)} className="bg-transparent border border-white/15 rounded p-2" placeholder="name@example.com" />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            Deskripsi/Penjelasan
            <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={4} className="bg-transparent border border-white/15 rounded p-2 resize-none" placeholder="Jelaskan bukti kepemilikan/izin, konteks karya, dll." />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            Link referensi (pisahkan dengan koma/baris baru)
            <textarea value={links} onChange={e=>setLinks(e.target.value)} rows={2} className="bg-transparent border border-white/15 rounded p-2 resize-none" placeholder="https://... , https://..." />
          </label>

          <div className="sm:col-span-2">
            <div className="mb-2 text-sm font-medium">Lampiran (maks 6)</div>
            <div className="rounded-xl border border-dashed border-white/20 p-4 flex flex-col items-center justify-center gap-2 text-sm">
              <Upload className="h-5 w-5" />
              <div>Drag & drop file di sini atau</div>
              <label className="inline-flex px-3 py-1 rounded bg-white/10 hover:bg-white/15 cursor-pointer">Pilih File
                <input type="file" multiple className="hidden" onChange={(e)=>addFiles(e.target.files)} />
              </label>
              {files.length > 0 && (
                <div className="mt-3 w-full grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10">
                      <FileText className="h-4 w-4" />
                      <div className="flex-1 min-w-0 truncate">{f.name}</div>
                      <div className="text-xs opacity-60">{(f.size/1024/1024).toFixed(2)} MB</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {error && <div className="mt-3 p-2 rounded border border-red-500/30 bg-red-500/10 text-red-300 text-sm">{error}</div>}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-white/15 hover:bg-white/5">Batal</button>
          <button onClick={handleSubmit} disabled={submitting || (!name && !wallet && !description && files.length===0)} className="px-4 py-2 rounded-xl bg-sky-500/90 hover:bg-sky-400 text-white disabled:opacity-50">
            {submitting ? "Mengirim..." : "Kirim untuk Review"}
          </button>
        </div>
      </div>
    </div>
  );
}
