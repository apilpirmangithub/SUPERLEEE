"use client";

import React, { useState } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { RegisterIPPanel } from "@/components/RegisterIPPanel";
import { useRegisterIPAgent } from "@/hooks/useRegisterIPAgent";
import { type LicenseSettings } from "@/lib/license/terms";
import { compressImage } from "@/lib/utils/image";
import { sha256HexOfFile } from "@/lib/utils/crypto";
import { uploadFile, extractCid, toHttps, toIpfsUri } from "@/lib/utils/ipfs";
import { ThemeProvider } from "@/components/ThemeProvider";

export default function SimpleRegisterPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const [registerResult, setRegisterResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const { executeSimplifiedRegister, registerState, resetRegister } = useRegisterIPAgent();

  const handleRegister = async (file: File, license?: LicenseSettings) => {
    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    // Ensure we're on Aeneid network
    if (chainId !== 1315) {
      try {
        await switchChainAsync({ chainId: 1315 });
      } catch {
        setError("Please switch to Aeneid network");
        return;
      }
    }

    try {
      setError(null);
      const result = await executeSimplifiedRegister(file, license);
      
      if (result.success) {
        setRegisterResult(result);
      } else {
        setError(result.error || "Registration failed");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during registration");
    }
  };

  const resetAll = () => {
    setRegisterResult(null);
    setError(null);
    resetRegister();
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gradient-to-br from-ai-bg via-ai-bg to-purple-900/20">
        {/* Navigation */}
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors"
            >
              ← Back to Chat
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-lg bg-blue-500/80 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
            >
              📋 My IPs
            </Link>
          </div>
        </div>

        <div className="container mx-auto px-4 pb-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">
              ⚡ Simple IP Registration
            </h1>
            <p className="text-white/70 max-w-2xl mx-auto">
              Upload gambar dan daftarkan sebagai IP asset dalam satu klik. 
              Workflow sederhana tanpa konfigurasi rumit.
            </p>
          </div>

          {/* Connection Status */}
          {!isConnected && (
            <div className="max-w-md mx-auto mb-8 p-4 rounded-xl bg-yellow-500/10 border border-yellow-400/20">
              <p className="text-yellow-300 text-center">
                Please connect your wallet to continue
              </p>
            </div>
          )}

          {/* Main Content */}
          <div className="max-w-2xl mx-auto">
            {/* Registration Panel */}
            {!registerResult && !error && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                <RegisterIPPanel onRegister={handleRegister} />
              </div>
            )}

            {/* Progress Display */}
            {registerState.status !== 'idle' && !registerResult && !error && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full"></div>
                    <h3 className="text-lg font-semibold text-white">Processing Registration...</h3>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">Progress</span>
                      <span className="text-white">{registerState.progress}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${registerState.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="text-sm text-white/70">
                    Status: {
                      registerState.status === 'compressing' && 'Compressing image...' ||
                      registerState.status === 'uploading-image' && 'Uploading to IPFS...' ||
                      registerState.status === 'creating-metadata' && 'Creating metadata...' ||
                      registerState.status === 'uploading-metadata' && 'Uploading metadata...' ||
                      registerState.status === 'checking-duplicates' && 'Checking for duplicates...' ||
                      registerState.status === 'minting' && 'Minting IP asset...' ||
                      'Processing...'
                    }
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-500/10 border border-red-400/20 rounded-2xl p-6 backdrop-blur-sm">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                      <span className="text-red-400">❌</span>
                    </div>
                    <h3 className="text-lg font-semibold text-red-300">Registration Failed</h3>
                  </div>
                  <p className="text-red-200">{error}</p>
                  <button
                    onClick={resetAll}
                    className="w-full py-3 px-4 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 font-medium transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {/* Success Display */}
            {registerResult && (
              <div className="bg-green-500/10 border border-green-400/20 rounded-2xl p-6 backdrop-blur-sm">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                      <span className="text-green-400">✅</span>
                    </div>
                    <h3 className="text-lg font-semibold text-green-300">Registration Successful!</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white/5 rounded-xl p-4">
                      <h4 className="font-medium text-white mb-2">IP Asset Details</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-white/70">IP ID:</span>
                          <span className="ml-2 text-white font-mono">{registerResult.ipId}</span>
                        </div>
                        <div>
                          <span className="text-white/70">License Type:</span>
                          <span className="ml-2 text-white">{registerResult.licenseType}</span>
                        </div>
                        <div>
                          <span className="text-white/70">Transaction:</span>
                          <span className="ml-2 text-white font-mono break-all">{registerResult.txHash}</span>
                        </div>
                      </div>
                    </div>

                    {registerResult.imageUrl && (
                      <div className="bg-white/5 rounded-xl p-4">
                        <h4 className="font-medium text-white mb-2">Registered Image</h4>
                        <img 
                          src={registerResult.imageUrl} 
                          alt="Registered IP" 
                          className="w-full max-w-sm mx-auto rounded-lg"
                        />
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                      <a
                        href={`https://aeneid.explorer.story.foundation/ipa/${registerResult.ipId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-3 px-4 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 text-center font-medium transition-colors"
                      >
                        🔗 View IP on Explorer
                      </a>
                      <a
                        href={`https://aeneid.explorer.story.foundation/tx/${registerResult.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-3 px-4 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 text-center font-medium transition-colors"
                      >
                        📄 View Transaction
                      </a>
                    </div>

                    <button
                      onClick={resetAll}
                      className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition-colors"
                    >
                      Register Another IP
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Features List */}
          <div className="max-w-4xl mx-auto mt-12">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-4">
                  <span className="text-2xl">⚡</span>
                </div>
                <h3 className="font-semibold text-white mb-2">One-Click Registration</h3>
                <p className="text-white/70 text-sm">
                  Upload gambar dan registrasi dimulai otomatis. Tidak perlu konfigurasi rumit.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
                  <span className="text-2xl">🛡️</span>
                </div>
                <h3 className="font-semibold text-white mb-2">Duplicate Protection</h3>
                <p className="text-white/70 text-sm">
                  Otomatis cek duplikat berdasarkan image hash untuk mencegah registrasi ganda.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                  <span className="text-2xl">📋</span>
                </div>
                <h3 className="font-semibold text-white mb-2">Auto Metadata</h3>
                <p className="text-white/70 text-sm">
                  Title dan description dibuat otomatis dari nama file. Lisensi default open use.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
