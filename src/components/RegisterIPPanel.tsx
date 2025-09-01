"use client";

import React, { useState } from "react";
import { Upload, X, FileImage, Sparkles } from "lucide-react";
import { LicenseSelector } from "./LicenseSelector";
import { useFileUpload } from "@/hooks/useFileUpload";
import { DEFAULT_LICENSE_SETTINGS, type LicenseSettings } from "@/lib/license/terms";

interface RegisterIPPanelProps {
  onRegister?: (file: File, license?: LicenseSettings) => void;
  className?: string;
}

export function RegisterIPPanel({ onRegister, className = "" }: RegisterIPPanelProps) {
  const fileUpload = useFileUpload();
  const [selectedLicense, setSelectedLicense] = useState<LicenseSettings>(DEFAULT_LICENSE_SETTINGS);
  const [showLicenseSelector, setShowLicenseSelector] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegister = async () => {
    if (fileUpload.file && onRegister) {
      setIsRegistering(true);
      try {
        await onRegister(fileUpload.file, selectedLicense);
      } catch (error) {
        console.error('Registration failed:', error);
      } finally {
        setIsRegistering(false);
      }
    }
  };

  // Auto-register after file upload (simplified workflow)
  React.useEffect(() => {
    if (fileUpload.file && onRegister && !isRegistering) {
      // Small delay to let user see the preview
      const timer = setTimeout(() => {
        handleRegister();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [fileUpload.file]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 text-purple-400" />
          <h2 className="text-xl font-semibold text-white">Daftarkan IP Anda</h2>
        </div>
        <p className="text-sm text-white/70">Upload gambar untuk registrasi otomatis ke Story Protocol</p>
      </div>

      {/* File Upload */}
      <div className="space-y-4">
        {!fileUpload.file ? (
          <div
            onClick={() => document.getElementById('file-input')?.click()}
            className="relative border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-white/30 hover:bg-white/5 transition-all cursor-pointer group"
          >
            <input
              id="file-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => fileUpload.handleFileSelect(e.target.files?.[0])}
            />
            
            <div className="space-y-3">
              <div className="mx-auto w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                <Upload className="h-8 w-8 text-purple-400" />
              </div>
              <div>
                <p className="text-white font-medium">Upload & Register Otomatis</p>
                <p className="text-sm text-white/60">PNG, JPG, GIF hingga 10MB</p>
                <p className="text-xs text-purple-300 mt-1">⚡ Registrasi dimulai setelah upload</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start gap-4">
              <div className="relative">
                <img
                  src={fileUpload.previewUrl!}
                  alt="Preview"
                  className="w-20 h-20 rounded-lg object-cover"
                />
                {!isRegistering && (
                  <button
                    onClick={fileUpload.removeFile}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <FileImage className="h-4 w-4 text-purple-400" />
                  <span className="font-medium text-white truncate">{fileUpload.file.name}</span>
                </div>
                <p className="text-xs text-white/60">
                  {(fileUpload.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                {isRegistering && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full"></div>
                    <span className="text-xs text-purple-300">Mendaftarkan IP...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick License Info */}
      {fileUpload.file && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              Pengaturan Lisensi
            </div>
            <button
              onClick={() => setShowLicenseSelector(!showLicenseSelector)}
              disabled={isRegistering}
              className="text-xs px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors disabled:opacity-50"
            >
              {showLicenseSelector ? 'Sembunyikan' : 'Ubah Lisensi'}
            </button>
          </div>

          {/* Current license preview */}
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-400/20">
            <div className="text-sm font-medium text-purple-300 mb-1">Lisensi Default:</div>
            <div className="text-sm text-white/80">
              {selectedLicense.pilType === 'open_use' && '🎁 Open Use - Gratis untuk penggunaan non-komersial'}
              {selectedLicense.pilType === 'non_commercial_remix' && '🔄 Non-Commercial Remix - Boleh remix, tidak komersial'}
              {selectedLicense.pilType === 'commercial_use' && '💼 Commercial Use - Boleh komersial, tidak boleh remix'}
              {selectedLicense.pilType === 'commercial_remix' && '🎨 Commercial Remix - Boleh komersial + remix dengan bagi hasil'}
            </div>
          </div>

          {/* License selector */}
          {showLicenseSelector && (
            <LicenseSelector
              selectedLicense={selectedLicense}
              onLicenseChange={setSelectedLicense}
            />
          )}
        </div>
      )}

      {/* Manual Register Button (fallback) */}
      {fileUpload.file && !isRegistering && (
        <button
          onClick={handleRegister}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium hover:from-purple-600 hover:to-blue-600 transition-all"
        >
          Daftarkan Sekarang
        </button>
      )}

      {/* Progress indicator */}
      {isRegistering && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
          <div className="flex items-center gap-2">
            <div className="animate-spin w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full"></div>
            <h4 className="font-medium text-white">Memproses Registrasi IP...</h4>
          </div>
          <div className="text-sm space-y-1 text-white/70">
            <p>• Mengkompresi gambar</p>
            <p>• Upload ke IPFS</p>
            <p>• Membuat metadata</p>
            <p>• Cek duplikat</p>
            <p>• Mint & register IP</p>
          </div>
        </div>
      )}

      {/* Auto-registration note */}
      {!fileUpload.file && (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-400/20">
          <h4 className="font-medium text-blue-300 mb-2">🚀 Workflow Sederhana:</h4>
          <div className="text-sm space-y-1 text-white/70">
            <p>1. Upload gambar</p>
            <p>2. Registrasi dimulai otomatis</p>
            <p>3. IP terdaftar dalam hitungan menit</p>
            <p className="text-xs text-blue-300 mt-2">*Lisensi default: Open Use (Non-komersial)</p>
          </div>
        </div>
      )}
    </div>
  );
}
