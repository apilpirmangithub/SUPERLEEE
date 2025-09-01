"use client";

import React from "react";
import { Shield, DollarSign, Users, Bot, Lock, Unlock, AlertTriangle, CheckCircle } from "lucide-react";
import { AdvancedAnalysisResult, SimpleRecommendation } from "@/types/ai-detection";

interface LicenseRecommendationCardProps {
  analysis: AdvancedAnalysisResult;
  recommendation: SimpleRecommendation;
  className?: string;
  onAcceptRecommendation?: () => void;
  onCustomizeLicense?: () => void;
}

export function LicenseRecommendationCard({ 
  analysis, 
  recommendation, 
  className = "",
  onAcceptRecommendation,
  onCustomizeLicense 
}: LicenseRecommendationCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'border-yellow-500/30 bg-yellow-500/10';
      case 'good': return 'border-green-500/30 bg-green-500/10';
      case 'fair': return 'border-yellow-500/30 bg-yellow-500/10';
      case 'ai-restricted': return 'border-red-500/30 bg-red-500/10';
      case 'poor': return 'border-gray-500/30 bg-gray-500/10';
      default: return 'border-white/10 bg-white/5';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="h-5 w-5 text-yellow-400" />;
      case 'good': return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'fair': return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      case 'ai-restricted': return <Shield className="h-5 w-5 text-red-400" />;
      case 'poor': return <AlertTriangle className="h-5 w-5 text-gray-400" />;
      default: return <Shield className="h-5 w-5 text-blue-400" />;
    }
  };

  return (
    <div className={`rounded-xl border ${getStatusColor(recommendation.status)} p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {getStatusIcon(recommendation.status)}
          <div>
            <h3 className="text-lg font-semibold text-white">License Recommendation</h3>
            <p className="text-sm text-white/70">Based on AI analysis and IP assessment</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          recommendation.status === 'excellent' ? 'bg-yellow-500/20 text-yellow-300' :
          recommendation.status === 'good' ? 'bg-green-500/20 text-green-300' :
          recommendation.status === 'fair' ? 'bg-yellow-500/20 text-yellow-300' :
          recommendation.status === 'ai-restricted' ? 'bg-red-500/20 text-red-300' : 'bg-gray-500/20 text-gray-300'
        }`}>
          {recommendation.status.toUpperCase()}
        </div>
      </div>

      {/* Main Message */}
      <div className="mb-6">
        <p className="text-white/90 mb-3">{recommendation.message}</p>
        <p className="text-sm text-white/70">{recommendation.action}</p>
      </div>

      {/* License Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* License Type */}
        <div className="p-4 rounded-lg bg-black/30 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-white">License Type</span>
          </div>
          <p className="text-white/90">{recommendation.license}</p>
          <p className="text-xs text-white/60 mt-1">
            {analysis.licenseRecommendation.primary === 'commercial' ? 'Full commercial rights with revenue sharing' :
             analysis.licenseRecommendation.primary === 'remix' ? 'Derivative works allowed with attribution' :
             'Non-commercial use only'}
          </p>
        </div>

        {/* AI Learning Control */}
        <div className="p-4 rounded-lg bg-black/30 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            {analysis.licenseRecommendation.aiLearningAllowed ? (
              <Unlock className="h-4 w-4 text-green-400" />
            ) : (
              <Lock className="h-4 w-4 text-red-400" />
            )}
            <span className="text-sm font-medium text-white">AI Training</span>
          </div>
          <p className="text-white/90">{recommendation.aiLearning}</p>
          <p className="text-xs text-white/60 mt-1">
            {analysis.licenseRecommendation.aiLearningAllowed ? 
              'Creator can choose to allow AI training' : 
              'AI training automatically blocked for protection'}
          </p>
        </div>
      </div>

      {/* Financial Terms */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-400" />
          Financial Terms
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 rounded-lg bg-black/20 border border-white/5">
            <p className="text-lg font-semibold text-white">
              {analysis.licenseRecommendation.suggestedTerms.mintingFee}
            </p>
            <p className="text-xs text-white/60">WIP Minting Fee</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-black/20 border border-white/5">
            <p className="text-lg font-semibold text-white">
              {analysis.licenseRecommendation.suggestedTerms.commercialRevShare}%
            </p>
            <p className="text-xs text-white/60">Revenue Share</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-black/20 border border-white/5">
            <p className={`text-lg font-semibold ${analysis.licenseRecommendation.suggestedTerms.commercialUse ? 'text-green-400' : 'text-red-400'}`}>
              {analysis.licenseRecommendation.suggestedTerms.commercialUse ? 'Yes' : 'No'}
            </p>
            <p className="text-xs text-white/60">Commercial Use</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-black/20 border border-white/5">
            <p className={`text-lg font-semibold ${analysis.licenseRecommendation.suggestedTerms.derivativesAllowed ? 'text-green-400' : 'text-red-400'}`}>
              {analysis.licenseRecommendation.suggestedTerms.derivativesAllowed ? 'Yes' : 'No'}
            </p>
            <p className="text-xs text-white/60">Derivatives</p>
          </div>
        </div>
      </div>

      {/* AI Protection Details */}
      {analysis.aiDetection.isAIGenerated && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="h-4 w-4 text-red-400" />
            <span className="text-sm font-medium text-red-300">AI Content Protection Active</span>
          </div>
          <p className="text-sm text-red-200/90 mb-2">
            This content has been identified as AI-generated with {Math.round(analysis.aiDetection.confidence * 100)}% confidence.
          </p>
          <div className="text-xs text-red-200/70">
            <p>🛡️ Automatic protections enabled:</p>
            <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
              <li>AI training blocked via robot.txt terms</li>
              <li>Metadata tagged as AI-generated for transparency</li>
              <li>Restricted licensing to protect creator rights</li>
              <li>Lower IP eligibility score due to AI generation</li>
            </ul>
          </div>
        </div>
      )}

      {/* Risk Warnings */}
      {analysis.ipEligibility.risks.length > 0 && (
        <div className="mb-6 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <span className="text-sm font-medium text-yellow-300">Important Considerations</span>
          </div>
          <ul className="text-sm text-yellow-200/90 space-y-1">
            {analysis.ipEligibility.risks.slice(0, 3).map((risk, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">•</span>
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Reasoning */}
      <div className="mb-6 p-4 rounded-lg bg-black/30 border border-white/5">
        <h4 className="text-sm font-medium text-white mb-2">Why This Recommendation?</h4>
        <p className="text-sm text-white/70">{analysis.licenseRecommendation.reasoning}</p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onAcceptRecommendation}
          className="flex-1 bg-ai-primary hover:bg-ai-primary/80 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Accept Recommendation
        </button>
        <button
          onClick={onCustomizeLicense}
          className="flex-1 border border-white/20 hover:border-white/40 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Customize License
        </button>
      </div>

      {/* Confidence Indicator */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-xs text-white/60">
          <span>Recommendation Confidence</span>
          <span>{Math.round(analysis.licenseRecommendation.confidence * 100)}%</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-1 mt-1">
          <div 
            className="bg-ai-primary h-1 rounded-full transition-all duration-300"
            style={{ width: `${analysis.licenseRecommendation.confidence * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
