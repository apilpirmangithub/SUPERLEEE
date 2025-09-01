import React, { useRef, useEffect, useCallback, useState } from "react";
import { usePublicClient } from "wagmi";
import { storyAeneid } from "@/lib/chains/story";
import { waitForTxConfirmation } from "@/lib/utils/transaction";
import { useChatAgent } from "@/hooks/useChatAgent";
import { useRegisterIPAgent } from "@/hooks/useRegisterIPAgent";
import { useFileUpload } from "@/hooks/useFileUpload";
import { DEFAULT_LICENSE_SETTINGS } from "@/lib/license/terms";
import type { LicenseSettings } from "@/lib/license/terms";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";
import { HistorySidebar } from "./HistorySidebar";
import { Toast } from "./Toast";
import { CameraCapture } from "./CameraCapture";
import { AIStatusIndicator } from "../AIStatusIndicator";
import { EnhancedWorkflowEngine, WorkflowResult } from "@/lib/agent/workflow-engine";
import CustomLicenseTermsSelector from "@/components/CustomLicenseTermsSelector";
import ManualReviewModal from "@/components/agent/ManualReviewModal";
import { motion, AnimatePresence } from "framer-motion";
import type { Hex } from "viem";
import { useRouter } from "next/navigation";

export function EnhancedWorkflowOrchestrator() {
  const chatAgent = useChatAgent();
  const registerAgent = useRegisterIPAgent();
  const fileUpload = useFileUpload();
  const publicClient = usePublicClient();
  const router = useRouter();

  const [toast, setToast] = useState<string | null>(null);
  const [workflowEngine] = useState(() => new EnhancedWorkflowEngine(publicClient || undefined));
  const [showCustomLicense, setShowCustomLicense] = useState(false);
  const [customTerms, setCustomTerms] = useState<import("@/lib/license/terms").LicenseTermsData | null>(null);
  const [selectedPilType, setSelectedPilType] = useState<'open_use' | 'commercial_remix'>('commercial_remix');
  const [selectedRevShare, setSelectedRevShare] = useState<number>(0);
  const [selectedLicensePrice, setSelectedLicensePrice] = useState<number>(0);
  const [showCamera, setShowCamera] = useState(false);
  const [showManualReview, setShowManualReview] = useState(false);
  const [currentWorkflowResult, setCurrentWorkflowResult] = useState<WorkflowResult | null>(null);
  const [registrationInProgress, setRegistrationInProgress] = useState(false);
  
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const explorerBase = storyAeneid.blockExplorers?.default.url || "https://aeneid.storyscan.xyz";

  // Initialize workflow engine with public client
  useEffect(() => {
    if (publicClient) {
      workflowEngine.setRagIndex(chatAgent.engine);
    }
  }, [publicClient, workflowEngine, chatAgent.engine]);

  // Auto-analyze when file is uploaded (integrated with chat)
  useEffect(() => {
    if (!fileUpload.file) return;
    if (!isAnalyzing) {
      analyzeImageWithSmartPipeline();
    }
  }, [fileUpload.file]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    chatScrollRef.current?.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chatAgent.messages]);

  const handleNewChat = useCallback(() => {
    chatAgent.newChat();
    try { fileUpload.removeFile(); } catch {}
    setCurrentWorkflowResult(null);
    setToast(null);
  }, [chatAgent, fileUpload]);

  const handleOpenSession = useCallback((id: string) => {
    chatAgent.openSession(id);
    try { fileUpload.removeFile(); } catch {}
    setCurrentWorkflowResult(null);
    setToast(null);
  }, [chatAgent, fileUpload]);

  const analyzeImageWithSmartPipeline = async () => {
    if (!fileUpload.file) return;

    setIsAnalyzing(true);

    // Add immediate loading message with smart pipeline indicator
    const loadingMessage = {
      role: "agent" as const,
      text: "🧠 Menjalankan Smart Analysis Pipeline...\n\nTunggu sebentar, saya sedang menganalisis gambar Anda dengan 10 tahap pemeriksaan otomatis untuk keamanan dan kualitas IP.",
      ts: Date.now(),
      isLoading: true
    };

    chatAgent.addCompleteMessage(loadingMessage);

    // Store file reference and remove preview
    const currentFile = fileUpload.file;
    const previewUrl = URL.createObjectURL(currentFile);

    setTimeout(() => {
      fileUpload.removeFile();
    }, 100);

    try {
      // Run enhanced workflow pipeline
      const result = await workflowEngine.executeAutoWorkflow(currentFile, "user-address");
      setCurrentWorkflowResult(result);

      // Create detailed analysis text for chat
      const stepsCompleted = result.steps.filter(s => s.status === 'completed').length;
      const stepsFailed = result.steps.filter(s => s.status === 'failed').length;

      let analysisText = `🎯 Smart Analysis Complete (${stepsCompleted}/${result.steps.length} steps)\n\n`;

      // Add analysis summary
      analysisText += `📊 **Ringkasan Analisis:**\n`;
      analysisText += `• Jenis Konten: ${result.analysis.contentType}\n`;
      analysisText += `• Skor Kualitas: ${result.analysis.quality}/10\n`;
      analysisText += `• AI Generated: ${result.analysis.isAIGenerated ? '🤖 Ya' : '👤 Tidak'}\n`;
      analysisText += `• Level Risiko: ${result.analysis.riskLevel === 'low' ? '🟢 Rendah' : result.analysis.riskLevel === 'medium' ? '🟡 Sedang' : '🔴 Tinggi'}\n`;
      analysisText += `• Layak untuk IP: ${result.analysis.isEligibleForIP ? '✅ Ya' : '❌ Tidak'}\n\n`;

      // Add description
      if (result.analysis.description) {
        analysisText += `📝 **Deskripsi:** ${result.analysis.description}\n\n`;
      }

      // Add issues if any
      if (result.analysis.violations.length > 0) {
        analysisText += `⚠️ **Masalah yang ditemukan:**\n`;
        result.analysis.violations.forEach(violation => {
          analysisText += `• ${violation}\n`;
        });
        analysisText += `\n`;
      }

      // Add duplicate warning
      if (result.analysis.duplicate.found) {
        analysisText += `🚫 **Duplikasi Terdeteksi:** Konten ini sudah terdaftar${result.analysis.duplicate.tokenId ? ` (Token #${result.analysis.duplicate.tokenId})` : ''}.\n\n`;
      }

      // Add recommendation
      const primaryRec = result.recommendations[0];
      if (primaryRec) {
        analysisText += `💡 **Rekomendasi:** ${primaryRec.action}\n`;
        analysisText += `📋 **Alasan:** ${primaryRec.reason}\n\n`;
      }

      // Add license recommendation
      analysisText += `📜 **Lisensi yang Disarankan:** ${result.analysis.suggestedLicense.replace('_', ' ').toUpperCase()}\n\n`;

      // Determine appropriate buttons based on analysis
      let buttons: string[] = [];

      if (result.autoApproved && !result.analysis.duplicate.found) {
        buttons = ["🚀 Quick Register", "✏️ Edit Metadata", "📊 View Details"];
        analysisText += `✅ **Status: SIAP UNTUK REGISTRASI OTOMATIS**`;
      } else if (result.analysis.duplicate.found) {
        buttons = ["📝 Submit Review", "🔄 Upload Lain", "📊 View Details"];
        analysisText += `🚫 **Status: REGISTRASI DIBLOKIR (DUPLIKASI)**`;
      } else if (result.recommendations[0]?.type === 'review') {
        buttons = ["📝 Submit Review", "✏️ Edit Metadata", "📊 View Details"];
        analysisText += `👁️ **Status: BUTUH REVIEW MANUAL**`;
      } else {
        buttons = ["✏️ Edit Metadata", "🔄 Retry Analysis", "📊 View Details"];
        analysisText += `⚠️ **Status: BUTUH PENYESUAIAN**`;
      }

      // Update message with results and image preview
      chatAgent.updateLastMessage({
        text: analysisText,
        isLoading: false,
        buttons,
        image: { url: previewUrl, alt: currentFile.name }
      });

      // Show step details in separate message if requested
      if (stepsFailed > 0) {
        const failedSteps = result.steps.filter(s => s.status === 'failed');
        const errorMessage = `⚠️ Beberapa pemeriksaan gagal:\n\n${failedSteps.map(s => `• ${s.name}: ${s.error}`).join('\n')}`;

        setTimeout(() => {
          chatAgent.addMessage("agent", errorMessage);
        }, 1000);
      }

    } catch (error) {
      console.error('Smart analysis failed:', error);
      chatAgent.updateLastMessage({
        text: "❌ Smart analysis gagal. Silakan coba lagi atau gunakan mode chat tradisional.",
        isLoading: false,
        buttons: ["🔄 Retry Analysis", "📁 Upload File Lain"]
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSmartApprove = useCallback(async (result: WorkflowResult, licenseOverrides?: Partial<LicenseSettings>) => {
    if (!fileUpload.file) {
      setToast("No file available for registration ❌");
      return;
    }

    setRegistrationInProgress(true);
    
    try {
      // Prepare license settings
      const licenseSettings: LicenseSettings = {
        ...DEFAULT_LICENSE_SETTINGS,
        pilType: licenseOverrides?.pilType || result.analysis.suggestedLicense,
        revShare: licenseOverrides?.revShare || 0,
        licensePrice: licenseOverrides?.licensePrice || 0,
      };

      // Create registration intent
      const intent = {
        kind: "register" as const,
        title: `${result.analysis.contentType} - Smart Registration`,
        prompt: result.analysis.description,
        pilType: licenseSettings.pilType
      };

      chatAgent.updateStatus("🚀 Smart registration in progress...");

      // Execute registration
      const regResult = await registerAgent.executeRegister(
        intent,
        fileUpload.file,
        licenseSettings,
        customTerms ? { customTerms } : undefined
      );

      if (regResult.success) {
        // Show initial success with transaction link
        const submittedMessage = `Smart Registration Submitted ⏳
        
Workflow: Enhanced AI Pipeline
Quality Score: ${result.analysis.quality}/10
License: ${licenseSettings.pilType}
Risk Level: ${result.analysis.riskLevel}

↗ Transaction: ${explorerBase}/tx/${regResult.txHash}`;

        chatAgent.addMessage("agent", submittedMessage);

        // Wait for confirmation
        try {
          chatAgent.updateStatus("Waiting for blockchain confirmation...");
          const confirmed = await waitForTxConfirmation(
            publicClient!, 
            regResult.txHash as Hex,
            { timeoutMs: 90_000 }
          );

          if (confirmed) {
            const successText = `Smart Registration Success ✅

Your content has been registered as IP with enhanced metadata!

IP ID: ${regResult.ipId}
License: ${regResult.licenseType}
Quality Score: ${result.analysis.quality}/10
Market Value: $${result.analysis.enrichments.marketValue || 0}`;

            // Create success message with links
            const message = {
              role: "agent" as const,
              text: successText,
              ts: Date.now(),
              image: regResult.imageUrl ? {
                url: regResult.imageUrl,
                alt: "Registered IP image"
              } : undefined,
              links: [
                {
                  text: `📋 View IP: ${regResult.ipId}`,
                  url: `https://aeneid.explorer.story.foundation/ipa/${regResult.ipId}`
                },
                {
                  text: `🔗 View Transaction: ${regResult.txHash}`,
                  url: `${explorerBase}/tx/${regResult.txHash}`
                }
              ]
            };

            chatAgent.addCompleteMessage(message);
            setToast("Smart registration complete ✅");
            
            // Reset workflow
            setWorkflowMode({ type: 'chat', active: false });
            setCurrentWorkflowResult(null);
          } else {
            chatAgent.updateStatus("Transaction pending. Check explorer for updates.");
          }
        } catch {
          chatAgent.updateStatus("Transaction pending. Check explorer for updates.");
        }
      } else {
        chatAgent.addMessage("agent", `Registration failed: ${regResult.error}`);
        setToast("Registration failed ❌");
      }
    } catch (error) {
      console.error('Smart registration failed:', error);
      chatAgent.addMessage("agent", "❌ Smart registration failed. Please try again.");
      setToast("Registration error ❌");
    } finally {
      setRegistrationInProgress(false);
      registerAgent.resetRegister();
    }
  }, [fileUpload.file, chatAgent, registerAgent, publicClient, explorerBase, customTerms]);

  const handleSmartEdit = useCallback((result: WorkflowResult) => {
    setCurrentWorkflowResult(result);
    
    // Add edit message to chat
    const editMessage = `✏️ Editing IP Metadata

Current Settings:
- License: ${result.analysis.suggestedLicense}
- Quality: ${result.analysis.quality}/10
- Content Type: ${result.analysis.contentType}

You can now modify the license terms or metadata before registration.`;

    chatAgent.addMessage("agent", editMessage, [
      "Custom License Terms",
      "Change PIL Type",
      "Continue with Current Settings"
    ]);
  }, [chatAgent]);

  const handleSmartRetry = useCallback(() => {
    setCurrentWorkflowResult(null);

    // Add retry message to chat
    chatAgent.addMessage("agent", "🔄 Mengulangi smart analysis...");

    // Trigger re-analysis with current file in chat
    setTimeout(() => {
      if (fileUpload.file) {
        analyzeImageWithSmartPipeline();
      } else {
        chatAgent.addMessage("agent", "📁 Silakan upload file terlebih dahulu untuk analisis ulang.");
      }
    }, 100);
  }, [fileUpload.file, chatAgent]);

  const handleSmartReview = useCallback((result: WorkflowResult) => {
    setCurrentWorkflowResult(result);
    setShowManualReview(true);
  }, []);

  const handleButtonClick = useCallback((buttonText: string) => {
    if (buttonText === "Register IP") {
      fileInputRef.current?.click();
      return;
    }
    if (buttonText === "Upload File" || buttonText === "📁 Upload File Lain") {
      fileInputRef.current?.click();
    } else if (buttonText === "🚀 Quick Register" && currentWorkflowResult) {
      handleSmartApprove(currentWorkflowResult);
    } else if (buttonText === "Custom License" || buttonText === "✏️ Edit Metadata") {
      setShowCustomLicense(true);
    } else if (buttonText === "Custom License Terms") {
      setShowCustomLicense(true);
    } else if (buttonText === "Take Photo") {
      setShowCamera(true);
    } else if (buttonText === "Submit for Review" || buttonText === "📝 Submit Review") {
      setShowManualReview(true);
    } else if (buttonText === "Review & Edit" && currentWorkflowResult) {
      handleSmartEdit(currentWorkflowResult);
    } else if (buttonText === "Retry" || buttonText === "🔄 Retry Analysis") {
      handleSmartRetry();
    } else if (buttonText === "Browse IP") {
      try { router.push('/dashboard'); } catch {}
    } else if (buttonText === "📊 View Details") {
      // Show detailed analysis in chat
      if (currentWorkflowResult) {
        showDetailedAnalysis(currentWorkflowResult);
      }
    } else {
      chatAgent.processPrompt(buttonText);
    }
  }, [chatAgent, currentWorkflowResult, handleSmartApprove, handleSmartEdit, handleSmartRetry, router]);

  const showDetailedAnalysis = useCallback((result: WorkflowResult) => {
    let detailText = `📊 **Detail Analisis Lengkap**\n\n`;

    // Workflow steps
    detailText += `⚡ **Tahapan Workflow:**\n`;
    result.steps.forEach((step, index) => {
      const icon = step.status === 'completed' ? '✅' : step.status === 'failed' ? '❌' : '⏳';
      detailText += `${index + 1}. ${icon} ${step.name}`;
      if (step.duration) detailText += ` (${step.duration}ms)`;
      if (step.error) detailText += ` - Error: ${step.error}`;
      detailText += `\n`;
    });

    detailText += `\n🏷️ **Tags:** ${result.analysis.tags.join(', ')}\n\n`;

    if (result.analysis.enrichments.marketValue) {
      detailText += `💰 **Estimasi Nilai Pasar:** $${result.analysis.enrichments.marketValue}\n\n`;
    }

    // Recommendations
    if (result.recommendations.length > 1) {
      detailText += `💡 **Semua Rekomendasi:**\n`;
      result.recommendations.forEach((rec, index) => {
        detailText += `${index + 1}. **${rec.action}** (${rec.priority})\n   ${rec.reason}\n`;
      });
    }

    chatAgent.addMessage("agent", detailText);
  }, [chatAgent]);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      fileUpload.handleFileSelect(file);
      event.target.value = '';
    }
  }, [fileUpload]);


  return (
    <div className="mx-auto max-w-[1400px] px-2 sm:px-4 md:px-6 overflow-x-hidden">
      <div className="flex flex-col lg:grid lg:grid-cols-[180px,1fr] gap-3 lg:gap-6 h-[calc(100vh-120px)] lg:h-[calc(100vh-180px)]">
        {/* History Sidebar */}
        <div className="hidden lg:block">
          <HistorySidebar
            messages={chatAgent.messages}
            onNewChat={handleNewChat}
            chatHistory={chatAgent.history?.map(h => ({ id: h.id, title: h.title, lastMessage: h.lastMessage, timestamp: h.timestamp, messageCount: h.messageCount }))}
            onOpenSession={handleOpenSession}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {/* Enhanced Header */}
          <div className="shrink-0 mb-3 lg:mb-4">
            <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 p-3 lg:p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shadow-lg">
                  <span className="text-lg font-bold text-white">S</span>
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {workflowMode.type === 'smart-analysis' ? 'SMART ANALYSIS MODE' : 'CHAT WITH SUPERLEE'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {workflowMode.type === 'smart-analysis' ? 'Enhanced AI Pipeline' : 'Traditional Chat Mode'}
                    </div>
                  </div>
                  <AIStatusIndicator />
                </div>
              </div>

              {/* Mode Toggle & Actions */}
              <div className="flex items-center gap-2">
                {/* Workflow Mode Toggle */}
                <div className="hidden md:flex bg-white/10 rounded-lg p-1">
                  <button
                    onClick={() => handleButtonClick("Switch to Chat Mode")}
                    className={`px-3 py-1 rounded text-xs transition-colors ${
                      workflowMode.type === 'chat' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    💬 Chat
                  </button>
                  <button
                    onClick={() => handleButtonClick("Switch to Smart Mode")}
                    className={`px-3 py-1 rounded text-xs transition-colors ${
                      workflowMode.type === 'smart-analysis' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    🧠 Smart
                  </button>
                </div>

                {/* New Chat Button */}
                <button
                  onClick={handleNewChat}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/15 transition-colors"
                  title="New Chat"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Dynamic Content Area */}
          <section className="flex-1 rounded-2xl border border-white/10 bg-white/5 overflow-hidden flex flex-col min-h-0">
            {/* Content Container */}
            <div
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto scrollbar-invisible"
            >
              <div className="mx-auto w-full max-w-[900px] px-2 sm:px-3 lg:px-4 py-3 lg:py-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={workflowMode.type}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {renderWorkflowContent()}
                  </motion.div>
                </AnimatePresence>

                {/* Registration Progress Overlay */}
                {registrationInProgress && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                  >
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-center">
                      <div className="animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <div className="text-white font-medium">🚀 Smart Registration in Progress</div>
                      <div className="text-gray-400 text-sm mt-2">Please wait while we register your IP...</div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Composer - Only show in chat mode */}
            {workflowMode.type === 'chat' && (
              <div className="shrink-0">
                <Composer
                  onSubmit={(prompt) => chatAgent.processPrompt(prompt, fileUpload.file || undefined)}
                  status={chatAgent.status}
                  file={fileUpload.file}
                  onFileSelect={fileUpload.handleFileSelect}
                  onFileRemove={fileUpload.removeFile}
                  previewUrl={fileUpload.previewUrl}
                  isTyping={chatAgent.isTyping}
                  awaitingInput={chatAgent.awaitingInput}
                  messages={chatAgent.messages}
                />
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      {/* Modals */}
      {showCustomLicense && (
        <CustomLicenseTermsSelector
          onSubmit={(t) => { 
            setCustomTerms(t); 
            setShowCustomLicense(false); 
            chatAgent.addMessage('agent', 'Custom license terms updated. You can now proceed with registration.');
          }}
          onClose={() => setShowCustomLicense(false)}
        />
      )}

      <CameraCapture
        open={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={(file) => {
          fileUpload.handleFileSelect(file);
        }}
        onFallback={() => {
          setShowCamera(false);
          cameraInputRef.current?.click();
        }}
      />

      <ManualReviewModal
        open={showManualReview}
        onClose={() => setShowManualReview(false)}
        onSubmitted={({ cid, url }) => {
          chatAgent.addCompleteMessage({
            role: 'agent',
            ts: Date.now(),
            text: `Review request submitted ✅\nCID: ${cid}`,
            links: [{ text: 'View review file on IPFS', url }]
          });
          setToast('Review submitted ✅');
        }}
      />

      {/* Toast Notifications */}
      <Toast
        message={toast}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
