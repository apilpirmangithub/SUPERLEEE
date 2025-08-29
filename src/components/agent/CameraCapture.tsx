"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

interface CameraCaptureProps {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  onFallback?: () => void; // called when getUserMedia not available or fails
}

export function CameraCapture({ open, onClose, onCapture, onFallback }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      stopStream();
      setError(null);
      return;
    }

    const start = async () => {
      setIsStarting(true);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setError("Camera not supported by this browser");
          onFallback?.();
          return;
        }
        const constraints: MediaStreamConstraints = {
          video: { facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (e: any) {
        setError("Unable to access camera");
        onFallback?.();
      } finally {
        setIsStarting(false);
      }
    };

    start();

    return () => {
      stopStream();
    };
  }, [open, onFallback, stopStream]);

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
      onCapture(file);
      onClose();
    }, "image/jpeg", 0.92);
  };


  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="relative w-[92vw] max-w-[660px] rounded-2xl border border-white/15 bg-black/70 backdrop-blur-md p-4">
        <div className="text-white/80 text-sm mb-2">Camera</div>
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} playsInline muted className="w-full h-full object-contain" />
          {isStarting && (
            <div className="absolute inset-0 grid place-items-center text-white/70 text-sm">Starting camera…</div>
          )}
          {error && (
            <div className="absolute inset-0 grid place-items-center text-red-400 text-sm">{error}</div>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-white text-sm">Cancel</button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onFallback?.()}
              className="px-3 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-white text-sm"
              title="Use system camera picker"
            >System Picker</button>
            <button onClick={handleCapture} disabled={isStarting} className="px-3 py-2 rounded-lg bg-sky-500/90 hover:bg-sky-400 disabled:opacity-60 text-white text-sm">Take Photo</button>
          </div>
        </div>
      </div>
    </div>
  );
}
