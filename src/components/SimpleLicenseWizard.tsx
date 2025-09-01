"use client";

import React, { useState, useEffect } from 'react';
import { SmartLicenseWizard, SimpleLicenseOptions } from '@/lib/license/SmartLicenseWizard';
import { ArrowLeft, ArrowRight, CheckCircle, Home, DollarSign, Palette, Globe, Shield, Zap } from 'lucide-react';

interface SimpleLicenseWizardProps {
  onLicenseSelect: (data: { terms: any; description: string; name: string }) => void;
  onClose: () => void;
}

export default function SimpleLicenseWizard({ onLicenseSelect, onClose }: SimpleLicenseWizardProps) {
  const [step, setStep] = useState(1);
  const [options, setOptions] = useState<SimpleLicenseOptions>({
    purpose: 'personal',
    allowCommercialUse: false,
    allowDerivatives: true,
    requireAttribution: true,
    revenueShare: 10,
    mintingFee: 0,
    blockAITraining: true
  });

  const wizard = new SmartLicenseWizard();

  // Auto-apply recommended settings when purpose changes
  useEffect(() => {
    const recommended = wizard.getRecommendedOptions(options.purpose);
    setOptions(prev => ({ ...prev, ...recommended }));
  }, [options.purpose]);

  const handleComplete = () => {
    const pilTerms = wizard.generatePILTerms(options);
    const description = wizard.getDescription(options);
    const name = wizard.getLicenseName(options);
    onLicenseSelect({ terms: pilTerms, description, name });
  };

  const canProceed = () => {
    if (step === 3 && options.allowCommercialUse) {
      return options.revenueShare !== undefined && options.mintingFee !== undefined;
    }
    return true;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-ai-bg border border-white/10 p-6 overflow-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-ai-primary" />
              Smart License Wizard
            </h3>
            <p className="text-sm text-white/70 mt-1">Create perfect license terms in 4 simple steps</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/60 hover:text-white text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-white">Step {step} of 4</span>
            <span className="text-xs text-white/60">{Math.round((step / 4) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-ai-primary to-ai-accent h-2 rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Purpose */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">What's your main goal?</h4>
              <p className="text-sm text-white/70 mb-6">Choose the purpose that best fits how you want others to use your work</p>
            </div>
            
            <div className="space-y-3">
              {[
                { 
                  value: 'personal', 
                  icon: Home,
                  title: '🏠 Personal Use', 
                  desc: 'Share with friends, non-commercial projects only',
                  color: 'border-green-500/30 bg-green-500/10'
                },
                { 
                  value: 'commercial', 
                  icon: DollarSign,
                  title: '💼 Commercial License', 
                  desc: 'Let others use commercially, you earn revenue share',
                  color: 'border-blue-500/30 bg-blue-500/10'
                },
                { 
                  value: 'remix', 
                  icon: Palette,
                  title: '🎨 Creative Remix', 
                  desc: 'Encourage remixes and derivatives with attribution',
                  color: 'border-purple-500/30 bg-purple-500/10'
                },
                { 
                  value: 'open', 
                  icon: Globe,
                  title: '🌍 Open Source', 
                  desc: 'Maximum freedom with IP protection included',
                  color: 'border-yellow-500/30 bg-yellow-500/10'
                }
              ].map((option) => {
                const Icon = option.icon;
                const isSelected = options.purpose === option.value;
                return (
                  <label 
                    key={option.value} 
                    className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all hover:scale-[1.02] ${
                      isSelected 
                        ? `${option.color} border-opacity-100` 
                        : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                    }`}
                  >
                    <input
                      type="radio"
                      name="purpose"
                      value={option.value}
                      checked={isSelected}
                      onChange={(e) => setOptions({...options, purpose: e.target.value as any})}
                      className="sr-only"
                    />
                    <Icon className={`h-5 w-5 mr-3 ${isSelected ? 'text-white' : 'text-white/60'}`} />
                    <div className="flex-1">
                      <div className={`font-medium ${isSelected ? 'text-white' : 'text-white/90'}`}>
                        {option.title}
                      </div>
                      <div className={`text-sm ${isSelected ? 'text-white/80' : 'text-white/60'}`}>
                        {option.desc}
                      </div>
                    </div>
                    {isSelected && <CheckCircle className="h-5 w-5 text-ai-primary ml-3" />}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Permissions */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">Usage Permissions</h4>
              <p className="text-sm text-white/70 mb-6">Configure how others can use your work</p>
            </div>
            
            <div className="space-y-4">
              <div className={`flex items-center justify-between p-4 border rounded-xl transition-all ${
                options.allowCommercialUse ? 'border-green-500/30 bg-green-500/10' : 'border-white/20'
              }`}>
                <div>
                  <div className="font-medium text-white flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Commercial Use
                  </div>
                  <div className="text-sm text-white/60">Allow others to make money from your work</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.allowCommercialUse}
                    onChange={(e) => setOptions({...options, allowCommercialUse: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ai-primary"></div>
                </label>
              </div>

              <div className={`flex items-center justify-between p-4 border rounded-xl transition-all ${
                options.allowDerivatives ? 'border-purple-500/30 bg-purple-500/10' : 'border-white/20'
              }`}>
                <div>
                  <div className="font-medium text-white flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Derivatives & Remixes
                  </div>
                  <div className="text-sm text-white/60">Let others create new works based on yours</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.allowDerivatives}
                    onChange={(e) => setOptions({...options, allowDerivatives: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ai-primary"></div>
                </label>
              </div>

              <div className={`flex items-center justify-between p-4 border rounded-xl transition-all ${
                options.requireAttribution ? 'border-blue-500/30 bg-blue-500/10' : 'border-white/20'
              }`}>
                <div>
                  <div className="font-medium text-white flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Require Attribution
                  </div>
                  <div className="text-sm text-white/60">Others must credit you when using your work</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.requireAttribution}
                    onChange={(e) => setOptions({...options, requireAttribution: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ai-primary"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Revenue Settings */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">
                {options.allowCommercialUse ? 'Revenue Settings' : 'Skip Revenue Settings'}
              </h4>
              <p className="text-sm text-white/70 mb-6">
                {options.allowCommercialUse 
                  ? 'Configure how you earn from commercial use of your work'
                  : 'Revenue settings not needed for non-commercial licenses'
                }
              </p>
            </div>

            {options.allowCommercialUse ? (
              <div className="space-y-6">
                <div className="p-4 border border-white/20 rounded-xl">
                  <label className="block text-sm font-medium text-white mb-3">
                    💸 Revenue Share: <span className="text-ai-primary font-bold">{options.revenueShare}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={options.revenueShare}
                    onChange={(e) => setOptions({...options, revenueShare: parseInt(e.target.value)})}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-white/60 mt-2">
                    <span>0% (Free)</span>
                    <span>25% (Balanced)</span>
                    <span>50% (Maximum)</span>
                  </div>
                  <div className="text-sm text-white/70 mt-2">
                    You'll earn <span className="text-ai-primary font-medium">{options.revenueShare}%</span> of revenue from commercial use
                  </div>
                </div>

                <div className="p-4 border border-white/20 rounded-xl">
                  <label className="block text-sm font-medium text-white mb-3">
                    🎫 Minting Fee (USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    value={options.mintingFee}
                    onChange={(e) => setOptions({...options, mintingFee: parseInt(e.target.value)})}
                    className="w-full p-3 border border-white/20 rounded-lg bg-white/5 text-white placeholder-white/50 focus:border-ai-primary focus:outline-none"
                    placeholder="0"
                  />
                  <div className="text-sm text-white/70 mt-2">
                    One-time fee others pay to license your work
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-8 border border-white/10 rounded-xl bg-white/5">
                <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <p className="text-white/80">Revenue settings not applicable for your chosen license type.</p>
                <p className="text-sm text-white/60 mt-2">Your work will be available under non-commercial terms.</p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: AI Protection & Summary */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">AI Protection & Final Review</h4>
              <p className="text-sm text-white/70 mb-6">Configure AI training permissions and review your license</p>
            </div>
            
            <div className={`flex items-center justify-between p-4 border rounded-xl transition-all ${
              options.blockAITraining ? 'border-red-500/30 bg-red-500/10' : 'border-green-500/30 bg-green-500/10'
            }`}>
              <div>
                <div className="font-medium text-white flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Block AI Training
                </div>
                <div className="text-sm text-white/60">Prevent AI models from training on your work</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.blockAITraining}
                  onChange={(e) => setOptions({...options, blockAITraining: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ai-primary"></div>
              </label>
            </div>

            {/* License Summary */}
            <div className="p-6 bg-gradient-to-br from-ai-primary/10 to-ai-accent/10 rounded-xl border border-ai-primary/20">
              <h5 className="font-bold text-white mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-ai-primary" />
                📋 Your License Summary
              </h5>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/70">License Type:</span>
                  <span className="text-white font-medium">{wizard.getLicenseName(options)}</span>
                </div>
                {options.allowCommercialUse && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-white/70">Revenue Share:</span>
                      <span className="text-ai-primary font-medium">{options.revenueShare}%</span>
                    </div>
                    {options.mintingFee && options.mintingFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-white/70">Minting Fee:</span>
                        <span className="text-ai-accent font-medium">${options.mintingFee}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-white/70">AI Training:</span>
                  <span className={`font-medium ${options.blockAITraining ? 'text-red-400' : 'text-green-400'}`}>
                    {options.blockAITraining ? '🚫 Blocked' : '✅ Allowed'}
                  </span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-black/20 rounded-lg">
                <p className="text-sm text-white/80">
                  {wizard.getDescription(options)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/10">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="flex items-center gap-2 px-4 py-2 text-white/70 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex gap-2">
            {[1, 2, 3, 4].map(num => (
              <div
                key={num}
                className={`w-2 h-2 rounded-full transition-colors ${
                  num <= step ? 'bg-ai-primary' : 'bg-white/20'
                }`}
              />
            ))}
          </div>

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2 bg-ai-primary hover:bg-ai-primary/80 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-ai-primary to-ai-accent hover:from-ai-primary/80 hover:to-ai-accent/80 text-white rounded-lg transition-all transform hover:scale-105"
            >
              <CheckCircle className="h-4 w-4" />
              Create License
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
