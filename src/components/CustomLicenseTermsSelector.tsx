"use client";

import React, { useEffect, useMemo, useState } from "react";
import { uploadJSON, toHttps, extractCid } from "@/lib/utils/ipfs";
import type { LicenseTermsData, PILTerms, LicensingConfig } from "@/lib/license/terms";

type BoolOrNull = boolean | null;

type FormState = {
  transferable: BoolOrNull;
  defaultMintingFee: string;
  expiration: string;
  commercialUse: BoolOrNull;
  commercialAttribution: BoolOrNull;
  commercializerChecker: string;
  commercializerCheckerData: string;
  commercialRevShare: string;
  commercialRevCeiling: string;
  derivativesAllowed: BoolOrNull;
  derivativesAttribution: BoolOrNull;
  derivativesApproval: BoolOrNull;
  derivativesReciprocal: BoolOrNull;
  derivativeRevCeiling: string;
  royaltyPolicy: string;
  currency: string;
  uri: string;
  territory: string;
  channelsOfDistribution: string;
  attribution: BoolOrNull;
  contentStandards: string;
  sublicensable: BoolOrNull;
  aiLearningModels: BoolOrNull;
  restrictionOnCrossPlatformUse: BoolOrNull;
  governingLaw: string;
  alternativeDisputeResolution: string;
  additionalParameters: string;
};

const initialState: FormState = {
  transferable: null,
  defaultMintingFee: "",
  expiration: "",
  commercialUse: null,
  commercialAttribution: null,
  commercializerChecker: "",
  commercializerCheckerData: "",
  commercialRevShare: "",
  commercialRevCeiling: "",
  derivativesAllowed: null,
  derivativesAttribution: null,
  derivativesApproval: null,
  derivativesReciprocal: null,
  derivativeRevCeiling: "",
  royaltyPolicy: "",
  currency: "",
  uri: "",
  territory: "",
  channelsOfDistribution: "",
  attribution: null,
  contentStandards: "",
  sublicensable: null,
  aiLearningModels: null,
  restrictionOnCrossPlatformUse: null,
  governingLaw: "",
  alternativeDisputeResolution: "",
  additionalParameters: "",
};

export default function CustomLicenseTermsSelector({ onSubmit, onClose }: { onSubmit: (terms: LicenseTermsData) => void; onClose: () => void; }) {
  const [licenseTerms, setLicenseTerms] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleInputChange<K extends keyof FormState>(field: K, value: FormState[K]) {
    setLicenseTerms((prev) => ({ ...prev, [field]: value }));
  }

  function validateTerms(): string[] {
    const errs: string[] = [];
    if (licenseTerms.transferable === null) errs.push("Transferable must be set");
    if (licenseTerms.commercialUse === null) errs.push("Commercial Use must be set");
    if (licenseTerms.derivativesAllowed === null) errs.push("Derivatives Allowed must be set");
    if (licenseTerms.aiLearningModels === null) errs.push("AI Learning Models must be set");
    if (licenseTerms.commercialUse) {
      if (!licenseTerms.royaltyPolicy) errs.push("Royalty Policy required for commercial use");
      if (!licenseTerms.currency) errs.push("Currency required for commercial use");
    }
    return errs;
  }

  async function registerCustomTerms() {
    const errs = validateTerms();
    if (errs.length) {
      setError(errs.join("\n"));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const offChain = {
        territory: licenseTerms.territory || "Global",
        channelsOfDistribution: licenseTerms.channelsOfDistribution || "All",
        attribution: licenseTerms.attribution ?? false,
        contentStandards: licenseTerms.contentStandards || "None",
        sublicensable: licenseTerms.sublicensable ?? false,
        aiLearningModels: licenseTerms.aiLearningModels ?? false,
        restrictionOnCrossPlatformUse: licenseTerms.restrictionOnCrossPlatformUse ?? false,
        governingLaw: licenseTerms.governingLaw || "",
        alternativeDisputeResolution: licenseTerms.alternativeDisputeResolution || "",
        additionalParameters: licenseTerms.additionalParameters || "",
      };
      const uploaded = await uploadJSON(offChain);
      const cid = extractCid(uploaded.cid || uploaded.url);
      const offChainUri = `https://ipfs.io/ipfs/${cid}`;

      const terms: PILTerms = {
        transferable: Boolean(licenseTerms.transferable),
        royaltyPolicy: (licenseTerms.royaltyPolicy || "0x0000000000000000000000000000000000000000") as `0x${string}`,
        defaultMintingFee: BigInt(licenseTerms.defaultMintingFee || 0),
        expiration: BigInt(licenseTerms.expiration || 0),
        commercialUse: Boolean(licenseTerms.commercialUse),
        commercialAttribution: Boolean(licenseTerms.commercialAttribution),
        commercializerChecker: (licenseTerms.commercializerChecker || "0x0000000000000000000000000000000000000000") as `0x${string}`,
        commercializerCheckerData: (licenseTerms.commercializerCheckerData || "0x") as `0x${string}`,
        commercialRevShare: Number(licenseTerms.commercialRevShare || 0),
        commercialRevCeiling: BigInt(licenseTerms.commercialRevCeiling || 0),
        derivativesAllowed: Boolean(licenseTerms.derivativesAllowed),
        derivativesAttribution: Boolean(licenseTerms.derivativesAttribution),
        derivativesApproval: Boolean(licenseTerms.derivativesApproval),
        derivativesReciprocal: Boolean(licenseTerms.derivativesReciprocal),
        derivativeRevCeiling: BigInt(licenseTerms.derivativeRevCeiling || 0),
        currency: (licenseTerms.currency || "0x0000000000000000000000000000000000000000") as `0x${string}`,
        uri: offChainUri,
      };

      const licensingConfig: LicensingConfig = {
        isSet: true,
        mintingFee: terms.defaultMintingFee,
        licensingHook: "0x0000000000000000000000000000000000000000",
        hookData: "0x",
        commercialRevShare: terms.commercialRevShare,
        disabled: false,
        expectMinimumGroupRewardShare: 0,
        expectGroupRewardPool: "0x0000000000000000000000000000000000000000",
      } as any;

      const assembled: LicenseTermsData = { terms, licensingConfig };
      onSubmit(assembled);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl rounded-xl bg-[#0b0f1a] border border-white/10 p-4 sm:p-6 overflow-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Custom PIL Terms Configuration</h3>
          <button onClick={onClose} className="text-white/60 hover:text-white">✕</button>
        </div>

        {error && (
          <div className="mb-3 text-sm text-yellow-300 whitespace-pre-wrap">{error}</div>
        )}

        <div className="space-y-4 text-sm text-white">
          <section className="border border-white/10 rounded-lg p-3">
            <h4 className="font-medium mb-2">Basic Terms</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">Transferable *
                <select className="bg-transparent border border-white/20 rounded p-2" value={licenseTerms.transferable === null ? '' : String(licenseTerms.transferable)} onChange={(e)=>handleInputChange('transferable', e.target.value === 'true')}>
                  <option value="">Select...</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">Default Minting Fee (wei)
                <input className="bg-transparent border border-white/20 rounded p-2" type="number" value={licenseTerms.defaultMintingFee} onChange={(e)=>handleInputChange('defaultMintingFee', e.target.value)} />
              </label>
              <label className="flex flex-col gap-1">Expiration (0 for none)
                <input className="bg-transparent border border-white/20 rounded p-2" type="number" value={licenseTerms.expiration} onChange={(e)=>handleInputChange('expiration', e.target.value)} />
              </label>
            </div>
          </section>

          <section className="border border-white/10 rounded-lg p-3">
            <h4 className="font-medium mb-2">Commercial Terms</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">Commercial Use *
                <select className="bg-transparent border border-white/20 rounded p-2" value={licenseTerms.commercialUse === null ? '' : String(licenseTerms.commercialUse)} onChange={(e)=>handleInputChange('commercialUse', e.target.value === 'true')}>
                  <option value="">Select...</option>
                  <option value="true">Allow</option>
                  <option value="false">Disallow</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">Commercial Attribution
                <select className="bg-transparent border border-white/20 rounded p-2" value={licenseTerms.commercialAttribution === null ? '' : String(licenseTerms.commercialAttribution)} onChange={(e)=>handleInputChange('commercialAttribution', e.target.value === 'true')}>
                  <option value="">Select...</option>
                  <option value="true">Required</option>
                  <option value="false">Not required</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">Commercial Rev Share (ppm)
                <input className="bg-transparent border border-white/20 rounded p-2" type="number" value={licenseTerms.commercialRevShare} onChange={(e)=>handleInputChange('commercialRevShare', e.target.value)} />
              </label>
              <label className="flex flex-col gap-1">Commercial Rev Ceiling
                <input className="bg-transparent border border-white/20 rounded p-2" type="number" value={licenseTerms.commercialRevCeiling} onChange={(e)=>handleInputChange('commercialRevCeiling', e.target.value)} />
              </label>
              <label className="flex flex-col gap-1">Royalty Policy
                <input className="bg-transparent border border-white/20 rounded p-2" placeholder="0x..." value={licenseTerms.royaltyPolicy} onChange={(e)=>handleInputChange('royaltyPolicy', e.target.value)} />
              </label>
              <label className="flex flex-col gap-1">Currency
                <input className="bg-transparent border border-white/20 rounded p-2" placeholder="0x..." value={licenseTerms.currency} onChange={(e)=>handleInputChange('currency', e.target.value)} />
              </label>
            </div>
          </section>

          <section className="border border-white/10 rounded-lg p-3">
            <h4 className="font-medium mb-2">Derivative Terms</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">Derivatives Allowed *
                <select className="bg-transparent border border-white/20 rounded p-2" value={licenseTerms.derivativesAllowed === null ? '' : String(licenseTerms.derivativesAllowed)} onChange={(e)=>handleInputChange('derivativesAllowed', e.target.value === 'true')}>
                  <option value="">Select...</option>
                  <option value="true">Allow</option>
                  <option value="false">Disallow</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">Derivatives Attribution
                <select className="bg-transparent border border-white/20 rounded p-2" value={licenseTerms.derivativesAttribution === null ? '' : String(licenseTerms.derivativesAttribution)} onChange={(e)=>handleInputChange('derivativesAttribution', e.target.value === 'true')}>
                  <option value="">Select...</option>
                  <option value="true">Required</option>
                  <option value="false">Not required</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">Derivatives Approval
                <select className="bg-transparent border border-white/20 rounded p-2" value={licenseTerms.derivativesApproval === null ? '' : String(licenseTerms.derivativesApproval)} onChange={(e)=>handleInputChange('derivativesApproval', e.target.value === 'true')}>
                  <option value="">Select...</option>
                  <option value="true">Require</option>
                  <option value="false">No</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">Derivatives Reciprocal
                <select className="bg-transparent border border-white/20 rounded p-2" value={licenseTerms.derivativesReciprocal === null ? '' : String(licenseTerms.derivativesReciprocal)} onChange={(e)=>handleInputChange('derivativesReciprocal', e.target.value === 'true')}>
                  <option value="">Select...</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">Derivative Rev Ceiling
                <input className="bg-transparent border border-white/20 rounded p-2" type="number" value={licenseTerms.derivativeRevCeiling} onChange={(e)=>handleInputChange('derivativeRevCeiling', e.target.value)} />
              </label>
            </div>
          </section>

          <section className="border border-white/10 rounded-lg p-3">
            <h4 className="font-medium mb-2">Off-chain Terms</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">Territory
                <input className="bg-transparent border border-white/20 rounded p-2" value={licenseTerms.territory} onChange={(e)=>handleInputChange('territory', e.target.value)} />
              </label>
              <label className="flex flex-col gap-1">Channels of Distribution
                <input className="bg-transparent border border-white/20 rounded p-2" value={licenseTerms.channelsOfDistribution} onChange={(e)=>handleInputChange('channelsOfDistribution', e.target.value)} />
              </label>
              <label className="flex flex-col gap-1">Attribution
                <select className="bg-transparent border border-white/20 rounded p-2" value={licenseTerms.attribution === null ? '' : String(licenseTerms.attribution)} onChange={(e)=>handleInputChange('attribution', e.target.value === 'true')}>
                  <option value="">Select...</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">Content Standards
                <input className="bg-transparent border border-white/20 rounded p-2" value={licenseTerms.contentStandards} onChange={(e)=>handleInputChange('contentStandards', e.target.value)} />
              </label>
              <label className="flex flex-col gap-1">Sublicensable
                <select className="bg-transparent border border-white/20 rounded p-2" value={licenseTerms.sublicensable === null ? '' : String(licenseTerms.sublicensable)} onChange={(e)=>handleInputChange('sublicensable', e.target.value === 'true')}>
                  <option value="">Select...</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">AI Learning Models Allowed *
                <select className="bg-transparent border border-blue-400 rounded p-2" value={licenseTerms.aiLearningModels === null ? '' : String(licenseTerms.aiLearningModels)} onChange={(e)=>handleInputChange('aiLearningModels', e.target.value === 'true')}>
                  <option value="">Select...</option>
                  <option value="true">Allow</option>
                  <option value="false">Prohibit</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">Cross-Platform Restrictions
                <select className="bg-transparent border border-white/20 rounded p-2" value={licenseTerms.restrictionOnCrossPlatformUse === null ? '' : String(licenseTerms.restrictionOnCrossPlatformUse)} onChange={(e)=>handleInputChange('restrictionOnCrossPlatformUse', e.target.value === 'true')}>
                  <option value="">Select...</option>
                  <option value="true">Restrict</option>
                  <option value="false">Allow</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">Governing Law
                <input className="bg-transparent border border-white/20 rounded p-2" value={licenseTerms.governingLaw} onChange={(e)=>handleInputChange('governingLaw', e.target.value)} />
              </label>
              <label className="flex flex-col gap-1">Alternative Dispute Resolution
                <input className="bg-transparent border border-white/20 rounded p-2" value={licenseTerms.alternativeDisputeResolution} onChange={(e)=>handleInputChange('alternativeDisputeResolution', e.target.value)} />
              </label>
              <label className="flex flex-col gap-1">Additional Parameters
                <textarea className="bg-transparent border border-white/20 rounded p-2" rows={3} value={licenseTerms.additionalParameters} onChange={(e)=>handleInputChange('additionalParameters', e.target.value)} />
              </label>
            </div>
          </section>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 border border-white/20 rounded text-white/80 hover:text-white">Cancel</button>
          <button disabled={submitting} onClick={registerCustomTerms} className="px-4 py-2 rounded bg-sky-500 hover:bg-sky-400 text-white disabled:opacity-50">{submitting ? 'Submitting...' : 'Use These Terms'}</button>
        </div>
      </div>
    </div>
  );
}
