import type { LicenseTermsData } from "./terms";

export interface SimpleLicenseOptions {
  // Step 1: Basic Intent
  purpose: 'personal' | 'commercial' | 'remix' | 'open';
  
  // Step 2: Simple Toggles
  allowCommercialUse: boolean;
  allowDerivatives: boolean;
  requireAttribution: boolean;
  
  // Step 3: Revenue (only if commercial)
  revenueShare?: number; // 0-50%
  mintingFee?: number; // in dollars
  
  // Step 4: AI Protection
  blockAITraining: boolean;
}

export class SmartLicenseWizard {
  private readonly zeroAddress = "0x0000000000000000000000000000000000000000" as `0x${string}`;
  private readonly wipToken = "0x1514000000000000000000000000000000000000" as `0x${string}`;
  private readonly royaltyPolicy = "0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E" as `0x${string}`;

  // Convert simple options to full PIL terms
  generatePILTerms(options: SimpleLicenseOptions): LicenseTermsData {
    const baseTerms = {
      transferable: true,
      royaltyPolicy: this.royaltyPolicy,
      currency: this.wipToken,
      expiration: 0n,
      commercializerChecker: this.zeroAddress,
      commercializerCheckerData: "0x" as `0x${string}`,
      uri: "",
    };

    let terms;

    switch (options.purpose) {
      case 'personal':
        terms = {
          ...baseTerms,
          defaultMintingFee: 0n,
          commercialUse: false,
          commercialAttribution: false,
          commercialRevShare: 0,
          commercialRevCeling: 0n,
          derivativesAllowed: options.allowDerivatives,
          derivativesAttribution: options.requireAttribution,
          derivativesApproval: false,
          derivativesReciprocal: false,
          derivativeRevCeling: 0n,
        };
        break;

      case 'commercial':
        terms = {
          ...baseTerms,
          defaultMintingFee: BigInt((options.mintingFee || 0) * 1e18), // Convert USD to wei equivalent
          commercialUse: true,
          commercialAttribution: options.requireAttribution,
          commercialRevShare: (options.revenueShare || 0) * 10000, // Convert % to basis points
          commercialRevCeling: 0n,
          derivativesAllowed: options.allowDerivatives,
          derivativesAttribution: options.requireAttribution,
          derivativesApproval: false,
          derivativesReciprocal: options.allowDerivatives,
          derivativeRevCeling: 0n,
        };
        break;

      case 'remix':
        terms = {
          ...baseTerms,
          defaultMintingFee: BigInt((options.mintingFee || 0) * 1e18),
          commercialUse: options.allowCommercialUse,
          commercialAttribution: true,
          commercialRevShare: (options.revenueShare || 10) * 10000,
          commercialRevCeling: 0n,
          derivativesAllowed: true,
          derivativesAttribution: true,
          derivativesApproval: false,
          derivativesReciprocal: true,
          derivativeRevCeling: 0n,
        };
        break;

      case 'open':
        terms = {
          ...baseTerms,
          defaultMintingFee: 0n,
          commercialUse: true,
          commercialAttribution: options.requireAttribution,
          commercialRevShare: 0,
          commercialRevCeling: 0n,
          derivativesAllowed: true,
          derivativesAttribution: options.requireAttribution,
          derivativesApproval: false,
          derivativesReciprocal: false,
          derivativeRevCeling: 0n,
        };
        break;

      default:
        throw new Error('Invalid license purpose');
    }

    // Create licensing config
    const licensingConfig = {
      isSet: true,
      mintingFee: terms.defaultMintingFee,
      licensingHook: this.zeroAddress,
      hookData: "0x" as `0x${string}`,
      commercialRevShare: terms.commercialRevShare,
      disabled: false,
      expectMinimumGroupRewardShare: 0,
      expectGroupRewardPool: this.zeroAddress,
    };

    return { terms, licensingConfig };
  }

  // Get user-friendly description
  getDescription(options: SimpleLicenseOptions): string {
    const descriptions = {
      personal: "Perfect for personal projects and non-commercial sharing",
      commercial: "Allows others to use your work commercially with revenue sharing",
      remix: "Encourages creative remixes while protecting your original work",
      open: "Maximum freedom - like Creative Commons but with IP protection"
    };

    let desc = descriptions[options.purpose];
    
    if (options.blockAITraining) {
      desc += " • AI training blocked for your protection";
    }
    
    if (options.revenueShare && options.revenueShare > 0) {
      desc += ` • You earn ${options.revenueShare}% from commercial use`;
    }

    if (options.mintingFee && options.mintingFee > 0) {
      desc += ` • $${options.mintingFee} minting fee`;
    }
    
    return desc;
  }

  // Get license type name for display
  getLicenseName(options: SimpleLicenseOptions): string {
    const names = {
      personal: "Personal Use License",
      commercial: "Commercial License", 
      remix: "Creative Remix License",
      open: "Open Source License"
    };

    return names[options.purpose];
  }

  // Get recommended options based on purpose
  getRecommendedOptions(purpose: SimpleLicenseOptions['purpose']): Partial<SimpleLicenseOptions> {
    switch (purpose) {
      case 'personal':
        return {
          allowCommercialUse: false,
          allowDerivatives: true,
          requireAttribution: true,
          revenueShare: 0,
          mintingFee: 0,
          blockAITraining: true
        };

      case 'commercial':
        return {
          allowCommercialUse: true,
          allowDerivatives: false,
          requireAttribution: true,
          revenueShare: 15,
          mintingFee: 10,
          blockAITraining: true
        };

      case 'remix':
        return {
          allowCommercialUse: false,
          allowDerivatives: true,
          requireAttribution: true,
          revenueShare: 10,
          mintingFee: 5,
          blockAITraining: true
        };

      case 'open':
        return {
          allowCommercialUse: true,
          allowDerivatives: true,
          requireAttribution: true,
          revenueShare: 0,
          mintingFee: 0,
          blockAITraining: false
        };

      default:
        return {};
    }
  }
}
