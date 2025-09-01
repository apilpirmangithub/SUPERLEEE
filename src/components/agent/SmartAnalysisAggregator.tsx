import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EnhancedWorkflowEngine, WorkflowResult, WorkflowStep } from '@/lib/agent/workflow-engine';
import { LicenseSettings } from '@/lib/license/terms';

interface SmartAnalysisAggregatorProps {
  file: File | null;
  userAddress: string;
  workflowEngine: EnhancedWorkflowEngine;
  onApprove: (result: WorkflowResult, licenseOverrides?: Partial<LicenseSettings>) => Promise<void>;
  onEdit: (result: WorkflowResult) => void;
  onRetry: () => void;
  onReview: (result: WorkflowResult) => void;
}

export function SmartAnalysisAggregator({
  file,
  userAddress,
  workflowEngine,
  onApprove,
  onEdit,
  onRetry,
  onReview
}: SmartAnalysisAggregatorProps) {
  const [analysisResult, setAnalysisResult] = useState<WorkflowResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [licenseOverrides, setLicenseOverrides] = useState<Partial<LicenseSettings>>({});

  const runAnalysis = useCallback(async () => {
    if (!file || !userAddress) return;

    setIsAnalyzing(true);
    try {
      const result = await workflowEngine.executeAutoWorkflow(file, userAddress);
      setAnalysisResult(result);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [file, userAddress, workflowEngine]);

  const handleQuickApprove = useCallback(async () => {
    if (!analysisResult) return;
    await onApprove(analysisResult, licenseOverrides);
  }, [analysisResult, onApprove, licenseOverrides]);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStepIcon = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed': return '✅';
      case 'running': return '⏳';
      case 'failed': return '❌';
      case 'skipped': return '⏭️';
      default: return '⏸️';
    }
  };

  const getLicenseIcon = (license: string) => {
    switch (license) {
      case 'commercial_remix': return '💰';
      case 'non_commercial_remix': return '🎨';
      case 'open_use': return '🆓';
      default: return '📜';
    }
  };

  React.useEffect(() => {
    if (file && !analysisResult && !isAnalyzing) {
      runAnalysis();
    }
  }, [file, analysisResult, isAnalyzing, runAnalysis]);

  if (!file) {
    return (
      <div className="text-center py-8 text-gray-500">
        Upload an image to start smart analysis
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-2">
            <div className="animate-spin w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full"></div>
            <span className="text-blue-400 font-medium">🧠 Smart Analysis in Progress...</span>
          </div>
        </div>
        
        <div className="space-y-3">
          {[
            'Security & Virus Scan',
            'AI Generation Detection', 
            'Content Quality Analysis',
            'Duplicate Detection',
            'Identity Requirements Check',
            'Content Enrichment & Context',
            'License Recommendation',
            'Compliance Validation',
            'Metadata Generation',
            'Risk Scoring'
          ].map((step, index) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3 p-3 bg-white/5 rounded-lg"
            >
              <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              </div>
              <span className="text-gray-300">{step}</span>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (!analysisResult) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
        <span className="text-red-400">❌ Analysis failed. Please try again.</span>
        <button
          onClick={runAnalysis}
          className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 transition-colors"
        >
          Retry Analysis
        </button>
      </div>
    );
  }

  const { analysis, recommendations, autoApproved, steps } = analysisResult;
  const primaryRecommendation = recommendations[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            🧠 Smart Analysis Complete
            {autoApproved && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">AUTO-APPROVED</span>}
          </h3>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {showDetails ? '🔼' : '🔽'} Details
          </button>
        </div>

        {/* Quick Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">
              {analysis.isAIGenerated ? '🤖' : '👤'}
            </div>
            <div className="text-xs text-gray-400">Origin</div>
            <div className="text-sm text-white">
              {analysis.isAIGenerated ? 'AI Generated' : 'Human Created'}
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">⭐</div>
            <div className="text-xs text-gray-400">Quality</div>
            <div className="text-sm text-white">{analysis.quality}/10</div>
          </div>

          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className={`text-xs px-2 py-1 rounded-full mb-1 ${getRiskColor(analysis.riskLevel)}`}>
              {analysis.riskLevel.toUpperCase()}
            </div>
            <div className="text-xs text-gray-400">Risk Level</div>
          </div>

          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">
              {getLicenseIcon(analysis.suggestedLicense)}
            </div>
            <div className="text-xs text-gray-400">License</div>
            <div className="text-xs text-white capitalize">
              {analysis.suggestedLicense.replace('_', ' ')}
            </div>
          </div>
        </div>

        {/* Primary Recommendation */}
        <div className={`p-4 rounded-lg ${
          primaryRecommendation?.type === 'approve' ? 'bg-green-500/10 border border-green-500/20' :
          primaryRecommendation?.type === 'review' ? 'bg-yellow-500/10 border border-yellow-500/20' :
          primaryRecommendation?.type === 'reject' ? 'bg-red-500/10 border border-red-500/20' :
          'bg-blue-500/10 border border-blue-500/20'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="font-medium text-white mb-1">
                {primaryRecommendation?.type === 'approve' ? '✅ Ready for Registration' :
                 primaryRecommendation?.type === 'review' ? '👁️ Manual Review Required' :
                 primaryRecommendation?.type === 'reject' ? '❌ Registration Blocked' :
                 '📝 Action Required'}
              </div>
              <div className="text-sm text-gray-300 mb-3">
                {primaryRecommendation?.reason}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {primaryRecommendation?.type === 'approve' && (
              <button
                onClick={handleQuickApprove}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-white font-medium transition-colors"
              >
                🚀 Quick Approve & Register
              </button>
            )}

            {primaryRecommendation?.type === 'review' && (
              <button
                onClick={() => onReview(analysisResult)}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 rounded-lg text-white font-medium transition-colors"
              >
                👁️ Submit for Review
              </button>
            )}

            <button
              onClick={() => onEdit(analysisResult)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-blue-400 transition-colors"
            >
              ✏️ Edit Metadata
            </button>

            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-3 py-2 bg-gray-500/20 hover:bg-gray-500/30 rounded-lg text-gray-400 transition-colors"
            >
              🔄 Retry Analysis
            </button>
          </div>
        </div>
      </div>

      {/* Detailed Analysis */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 space-y-6">
              {/* Content Analysis */}
              <div>
                <h4 className="text-lg font-medium text-white mb-3">📊 Content Analysis</h4>
                <div className="bg-white/5 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-400 text-sm">Content Type:</span>
                      <span className="text-white ml-2">{analysis.contentType}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">AI Confidence:</span>
                      <span className="text-white ml-2">{Math.round(analysis.aiConfidence * 100)}%</span>
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-gray-400 text-sm">Description:</span>
                    <p className="text-white text-sm mt-1">{analysis.description}</p>
                  </div>

                  <div>
                    <span className="text-gray-400 text-sm">Tags:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {analysis.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Workflow Steps */}
              <div>
                <h4 className="text-lg font-medium text-white mb-3">⚡ Workflow Steps</h4>
                <div className="space-y-2">
                  {steps.map((step) => (
                    <div key={step.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <span className="text-lg">{getStepIcon(step.status)}</span>
                      <div className="flex-1">
                        <span className="text-white text-sm">{step.name}</span>
                        {step.duration && (
                          <span className="text-gray-400 text-xs ml-2">({step.duration}ms)</span>
                        )}
                      </div>
                      {step.status === 'failed' && step.error && (
                        <span className="text-red-400 text-xs">{step.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Issues & Recommendations */}
              {(analysis.violations.length > 0 || recommendations.length > 1) && (
                <div>
                  <h4 className="text-lg font-medium text-white mb-3">⚠️ Issues & Recommendations</h4>
                  <div className="space-y-3">
                    {analysis.violations.map((violation, index) => (
                      <div key={index} className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <span className="text-red-400 text-sm">⚠️ {violation}</span>
                      </div>
                    ))}
                    
                    {recommendations.slice(1).map((rec, index) => (
                      <div key={index} className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <div className="text-blue-400 text-sm font-medium">{rec.action}</div>
                        <div className="text-gray-300 text-xs mt-1">{rec.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Advanced Options */}
              <div>
                <h4 className="text-lg font-medium text-white mb-3">⚙️ License Overrides</h4>
                <div className="bg-white/5 rounded-lg p-4 space-y-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">PIL Type Override:</label>
                    <select
                      value={licenseOverrides.pilType || analysis.suggestedLicense}
                      onChange={(e) => setLicenseOverrides(prev => ({ ...prev, pilType: e.target.value as any }))}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="open_use">Open Use</option>
                      <option value="non_commercial_remix">Non-Commercial Remix</option>
                      <option value="commercial_remix">Commercial Remix</option>
                    </select>
                  </div>

                  {(licenseOverrides.pilType === 'commercial_remix' || analysis.suggestedLicense === 'commercial_remix') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 text-sm mb-2">Revenue Share (%):</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={licenseOverrides.revShare || 0}
                          onChange={(e) => setLicenseOverrides(prev => ({ ...prev, revShare: Number(e.target.value) }))}
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-sm mb-2">License Price (USD):</label>
                        <input
                          type="number"
                          min="0"
                          value={licenseOverrides.licensePrice || 0}
                          onChange={(e) => setLicenseOverrides(prev => ({ ...prev, licensePrice: Number(e.target.value) }))}
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
