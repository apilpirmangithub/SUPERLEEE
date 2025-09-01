"use client";

import React, { useState } from "react";
import { EnhancedRegisterIPPanel } from "@/components/EnhancedRegisterIPPanel";
import { useRegisterIPAgent } from "@/hooks/useRegisterIPAgent";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { Brain, CheckCircle, AlertTriangle, ExternalLink } from "lucide-react";
import type { LicenseSettings } from "@/lib/license/terms";
import type { AdvancedAnalysisResult, SimpleRecommendation, AIMetadata } from "@/types/ai-detection";

export default function TestAIAdvancedPage() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { registerState, executeRegister, resetRegister } = useRegisterIPAgent();
  const [lastRegistration, setLastRegistration] = useState<any>(null);

  const handleRegister = async (
    file: File,
    title: string,
    description: string,
    license: LicenseSettings,
    aiResult?: {
      analysis: AdvancedAnalysisResult;
      recommendation: SimpleRecommendation;
      metadata: AIMetadata;
    }
  ) => {
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      console.log("Starting enhanced IP registration with AI analysis...");
      console.log("AI Analysis Result:", aiResult);

      // Create register intent
      const intent = {
        title,
        prompt: description,
      };

      // If we have AI analysis, we can use the enhanced metadata
      let customLicenseTerms = undefined;
      if (aiResult?.analysis) {
        // Use AI-enhanced license terms if available
        customLicenseTerms = {
          transferable: true,
          royaltyPolicy: "0x0000000000000000000000000000000000000000" as `0x${string}`,
          defaultMintingFee: BigInt(aiResult.analysis.licenseRecommendation.suggestedTerms.mintingFee),
          commercialUse: aiResult.analysis.licenseRecommendation.suggestedTerms.commercialUse,
          commercialAttribution: true,
          commercializerChecker: "0x0000000000000000000000000000000000000000" as `0x${string}`,
          commercializerCheckerData: "0x" as `0x${string}`,
          commercialRevShare: aiResult.analysis.licenseRecommendation.suggestedTerms.commercialRevShare * 100, // Convert to basis points
          commercialRevCeling: 1000000,
          derivativesAllowed: aiResult.analysis.licenseRecommendation.suggestedTerms.derivativesAllowed,
          derivativesAttribution: true,
          derivativesApproval: false,
          derivativesReciprocal: true,
          derivativeRevCeling: 1000000,
          currency: "0x0000000000000000000000000000000000000000" as `0x${string}`,
          uri: "",
        };
      }

      const result = await executeRegister(intent, file, license, {
        customTerms: customLicenseTerms
      });

      if (result.success) {
        setLastRegistration({
          ...result,
          aiAnalysis: aiResult?.analysis,
          recommendation: aiResult?.recommendation,
          metadata: aiResult?.metadata,
        });
        
        console.log("Enhanced IP registration successful!", result);
      } else {
        console.error("Registration failed:", result.error);
        alert(`Registration failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Registration error:", error);
      alert(`Registration error: ${error}`);
    }
  };

  const handleReset = () => {
    resetRegister();
    setLastRegistration(null);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-ai-bg p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <Brain className="h-12 w-12 text-ai-primary mx-auto" />
              <h1 className="text-2xl font-bold text-white">Advanced AI Detection Test</h1>
              <p className="text-white/70">
                Test the enhanced IP registration with AI analysis and smart license recommendations
              </p>
            </div>
            
            <button
              onClick={() => connect({ connector: injected() })}
              className="bg-ai-primary hover:bg-ai-primary/80 text-white px-8 py-3 rounded-xl font-medium transition-colors"
            >
              Connect Wallet to Test
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ai-bg p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Brain className="h-8 w-8 text-ai-primary" />
            <h1 className="text-3xl font-bold text-white">Advanced AI Detection Test</h1>
          </div>
          <p className="text-white/70 max-w-2xl mx-auto">
            Upload an image to test our enhanced AI detection system with automatic license recommendations, 
            quality assessment, and IP eligibility scoring.
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-white/60">
            <span>Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</span>
            <span>•</span>
            <span>Story Protocol Aeneid Testnet</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Registration Panel */}
          <div className="lg:col-span-2">
            <EnhancedRegisterIPPanel 
              onRegister={handleRegister}
              className="h-fit"
            />
          </div>

          {/* Status Panel */}
          <div className="space-y-6">
            {/* Registration Status */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                Registration Status
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70">Status:</span>
                  <span className={`font-medium ${
                    registerState.status === 'success' ? 'text-green-400' :
                    registerState.status === 'error' ? 'text-red-400' :
                    registerState.status === 'idle' ? 'text-white/60' : 'text-ai-primary'
                  }`}>
                    {registerState.status === 'idle' ? 'Ready' :
                     registerState.status === 'success' ? 'Success' :
                     registerState.status === 'error' ? 'Error' :
                     registerState.status.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </span>
                </div>
                
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      registerState.status === 'success' ? 'bg-green-400' :
                      registerState.status === 'error' ? 'bg-red-400' : 'bg-ai-primary'
                    }`}
                    style={{ width: `${registerState.progress}%` }}
                  />
                </div>

                {registerState.error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-red-300 text-xs">{registerState.error.message || registerState.error}</p>
                  </div>
                )}

                {registerState.status !== 'idle' && (
                  <button
                    onClick={handleReset}
                    className="w-full py-2 px-3 rounded-lg border border-white/20 text-white/80 hover:border-white/40 transition-colors text-sm"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Features Info */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                <Brain className="h-4 w-4 text-ai-primary" />
                AI Features
              </h3>
              
              <div className="space-y-2 text-sm text-white/70">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-ai-primary rounded-full"></div>
                  <span>AI Content Detection</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-ai-accent rounded-full"></div>
                  <span>Quality Assessment</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-ai-magenta rounded-full"></div>
                  <span>IP Eligibility Scoring</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                  <span>Smart License Recommendations</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                  <span>Auto AI Learning Control</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
                  <span>Robot Terms Generation</span>
                </div>
              </div>
            </div>

            {/* Last Registration Results */}
            {lastRegistration && (
              <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                <h3 className="font-medium text-green-300 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Last Registration
                </h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">IP ID:</span>
                    <span className="text-green-300 font-mono text-xs">
                      {lastRegistration.ipId?.slice(0, 8)}...
                    </span>
                  </div>
                  
                  {lastRegistration.aiAnalysis && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-white/70">AI Status:</span>
                        <span className={`text-xs font-medium ${
                          lastRegistration.aiAnalysis.aiDetection.isAIGenerated ? 'text-red-300' : 'text-green-300'
                        }`}>
                          {lastRegistration.aiAnalysis.aiDetection.isAIGenerated ? 'AI-Generated' : 'Human-Created'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-white/70">Quality:</span>
                        <span className="text-white/90">{lastRegistration.aiAnalysis.qualityAssessment.overall}/10</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-white/70">IP Score:</span>
                        <span className="text-white/90">{lastRegistration.aiAnalysis.ipEligibility.score}/100</span>
                      </div>
                    </>
                  )}
                  
                  <div className="pt-2 border-t border-white/10">
                    <a
                      href={`https://testnet.storyscan.xyz/ip/${lastRegistration.ipId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-ai-primary hover:text-ai-primary/80 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span className="text-xs">View on StoryScan</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
