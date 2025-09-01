import { detectIPStatus } from "@/services";
import { isWhitelistedImage, computeDHash } from "@/lib/utils/whitelist";
import { compressImage } from "@/lib/utils/image";
import { sha256HexOfFile } from "@/lib/utils/crypto";
import { checkDuplicateQuick, checkDuplicateByImageHash } from "@/lib/utils/registry";
import { getFaceEmbedding, countFaces } from "@/lib/utils/face";
import { uploadToIPFS } from "@/lib/utils/ipfs";
import { loadIndexFromIpfs } from "@/lib/rag";
import { PublicClient } from "viem";

export interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: any;
  error?: string;
  duration?: number;
}

export interface WorkflowResult {
  success: boolean;
  steps: WorkflowStep[];
  analysis: ContentAnalysis;
  recommendations: WorkflowRecommendation[];
  autoApproved: boolean;
  requiredActions: string[];
  metadata: {
    ipMetadata?: any;
    nftMetadata?: any;
    ipfsHash?: string;
  };
}

export interface ContentAnalysis {
  isAIGenerated: boolean;
  aiConfidence: number;
  contentType: string;
  quality: number;
  isEligibleForIP: boolean;
  suggestedLicense: 'commercial_remix' | 'non_commercial_remix' | 'open_use';
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
  tags: string[];
  violations: string[];
  duplicate: {
    found: boolean;
    tokenId?: string;
    similarity?: number;
  };
  identity: {
    requiresVerification: boolean;
    faceDetected: boolean;
    multiplefaces: boolean;
  };
  enrichments: {
    ragContext?: string;
    relatedContent?: string[];
    marketValue?: number;
  };
}

export interface WorkflowRecommendation {
  type: 'approve' | 'review' | 'reject' | 'edit' | 'retry';
  priority: 'high' | 'medium' | 'low';
  reason: string;
  action: string;
  autoExecutable: boolean;
}

export class EnhancedWorkflowEngine {
  private publicClient?: PublicClient;
  private ragIndex?: any;

  constructor(publicClient?: PublicClient) {
    this.publicClient = publicClient;
  }

  setRagIndex(index: any) {
    this.ragIndex = index;
  }

  async executeAutoWorkflow(file: File, userAddress: string): Promise<WorkflowResult> {
    const startTime = Date.now();
    const steps: WorkflowStep[] = [
      { id: 'security', name: 'Security & Virus Scan', status: 'pending' },
      { id: 'ai-detection', name: 'AI Generation Detection', status: 'pending' },
      { id: 'content-analysis', name: 'Content Quality Analysis', status: 'pending' },
      { id: 'duplicate-check', name: 'Duplicate Detection', status: 'pending' },
      { id: 'identity-verification', name: 'Identity Requirements Check', status: 'pending' },
      { id: 'rag-enrichment', name: 'Content Enrichment & Context', status: 'pending' },
      { id: 'license-assessment', name: 'License Recommendation', status: 'pending' },
      { id: 'compliance-check', name: 'Compliance Validation', status: 'pending' },
      { id: 'metadata-generation', name: 'Metadata Generation', status: 'pending' },
      { id: 'risk-assessment', name: 'Risk Scoring', status: 'pending' }
    ];

    let analysis: ContentAnalysis = {
      isAIGenerated: false,
      aiConfidence: 0,
      contentType: '',
      quality: 0,
      isEligibleForIP: false,
      suggestedLicense: 'open_use',
      riskLevel: 'medium',
      description: '',
      tags: [],
      violations: [],
      duplicate: { found: false },
      identity: { requiresVerification: false, faceDetected: false, multiplefaces: false },
      enrichments: {}
    };

    try {
      // Step 1: Security & Virus Scan
      await this.executeStep(steps[0], async () => {
        return this.performSecurityScan(file);
      });

      // Step 2: AI Detection & Content Analysis (Parallel)
      await Promise.all([
        this.executeStep(steps[1], async () => {
          return this.performAIDetection(file);
        }),
        this.executeStep(steps[2], async () => {
          return this.performContentAnalysis(file);
        })
      ]);

      // Merge AI detection and content analysis results
      if (steps[1].result && steps[2].result) {
        analysis = { ...analysis, ...steps[1].result, ...steps[2].result };
      }

      // Step 3: Duplicate Check
      await this.executeStep(steps[3], async () => {
        return this.performDuplicateCheck(file);
      });
      if (steps[3].result) {
        analysis.duplicate = steps[3].result;
      }

      // Step 4: Identity Verification Check
      await this.executeStep(steps[4], async () => {
        return this.performIdentityCheck(file);
      });
      if (steps[4].result) {
        analysis.identity = steps[4].result;
      }

      // Step 5: RAG Enrichment
      await this.executeStep(steps[5], async () => {
        return this.performRAGEnrichment(file, analysis);
      });
      if (steps[5].result) {
        analysis.enrichments = steps[5].result;
      }

      // Step 6: License Assessment
      await this.executeStep(steps[6], async () => {
        return this.performLicenseAssessment(analysis);
      });
      if (steps[6].result) {
        analysis.suggestedLicense = steps[6].result.suggestedLicense;
      }

      // Step 7: Compliance Check
      await this.executeStep(steps[7], async () => {
        return this.performComplianceCheck(analysis);
      });
      if (steps[7].result) {
        analysis.violations = steps[7].result.violations;
      }

      // Step 8: Metadata Generation
      await this.executeStep(steps[8], async () => {
        return this.generateMetadata(file, analysis, userAddress);
      });

      // Step 9: Risk Assessment
      await this.executeStep(steps[9], async () => {
        return this.performRiskAssessment(analysis);
      });
      if (steps[9].result) {
        analysis.riskLevel = steps[9].result.riskLevel;
      }

      // Generate recommendations based on analysis
      const recommendations = this.generateRecommendations(analysis);
      const autoApproved = this.shouldAutoApprove(analysis);
      const requiredActions = this.getRequiredActions(analysis);

      const totalTime = Date.now() - startTime;
      console.log(`🔥 Enhanced workflow completed in ${totalTime}ms`);

      return {
        success: true,
        steps,
        analysis,
        recommendations,
        autoApproved,
        requiredActions,
        metadata: steps[8].result || {}
      };

    } catch (error) {
      console.error('Enhanced workflow failed:', error);
      return {
        success: false,
        steps,
        analysis,
        recommendations: [{
          type: 'retry',
          priority: 'high',
          reason: 'Workflow execution failed',
          action: 'Retry analysis with different parameters',
          autoExecutable: true
        }],
        autoApproved: false,
        requiredActions: ['retry_analysis'],
        metadata: {}
      };
    }
  }

  private async executeStep(step: WorkflowStep, operation: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    step.status = 'running';
    
    try {
      step.result = await operation();
      step.status = 'completed';
      step.duration = Date.now() - startTime;
    } catch (error) {
      step.status = 'failed';
      step.error = error instanceof Error ? error.message : 'Unknown error';
      step.duration = Date.now() - startTime;
      console.warn(`Step ${step.id} failed:`, error);
    }
  }

  private async performSecurityScan(file: File): Promise<any> {
    // Security checks: file type, size, malicious content detection
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (file.size > maxSize) {
      throw new Error('File too large');
    }
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type');
    }

    // Basic content scan (could integrate with virus scanning API)
    const buffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      new Uint8Array([0x4D, 0x5A]), // PE executable
      new Uint8Array([0x7F, 0x45, 0x4C, 0x46]) // ELF executable
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (this.containsPattern(uint8Array, pattern)) {
        throw new Error('Suspicious file content detected');
      }
    }

    return { 
      clean: true, 
      fileSize: file.size,
      fileType: file.type,
      scanTime: Date.now()
    };
  }

  private containsPattern(data: Uint8Array, pattern: Uint8Array): boolean {
    for (let i = 0; i <= data.length - pattern.length; i++) {
      let found = true;
      for (let j = 0; j < pattern.length; j++) {
        if (data[i + j] !== pattern[j]) {
          found = false;
          break;
        }
      }
      if (found) return true;
    }
    return false;
  }

  private async performAIDetection(file: File): Promise<Partial<ContentAnalysis>> {
    try {
      // Call existing IP detection
      const mode = (process.env.NEXT_PUBLIC_IP_STATUS_MODE || 'client').toLowerCase();
      let ipResult;
      
      if (mode === 'server') {
        ipResult = await detectIPStatus(file);
      } else {
        ipResult = { result: 'Status: Local assessment\nRisk: Medium\nTolerance: Proceed with caution' };
      }

      // Parse the IP status result
      const ipText = ipResult.result;
      const lines = ipText.split('\n');
      
      const riskLine = lines.find(l => l.toLowerCase().startsWith('risk:'))?.toLowerCase() || '';
      const toleranceLine = lines.find(l => l.toLowerCase().startsWith('tolerance:'))?.toLowerCase() || '';
      const statusLine = lines.find(l => l.toLowerCase().startsWith('status:')) || '';

      // Determine AI generation likelihood and confidence
      const isAIGenerated = statusLine.toLowerCase().includes('ai') || 
                           statusLine.toLowerCase().includes('generated') ||
                           statusLine.toLowerCase().includes('artificial');
      
      const aiConfidence = riskLine.includes('low') ? 0.3 : 
                          riskLine.includes('medium') ? 0.6 : 0.8;

      // Extract content type from status
      const contentType = this.extractContentType(statusLine);

      return {
        isAIGenerated,
        aiConfidence,
        contentType,
        description: statusLine.replace('Status:', '').trim()
      };
    } catch (error) {
      console.warn('AI detection failed:', error);
      return {
        isAIGenerated: false,
        aiConfidence: 0.5,
        contentType: 'image',
        description: 'AI detection unavailable'
      };
    }
  }

  private extractContentType(statusLine: string): string {
    const lowerStatus = statusLine.toLowerCase();
    if (lowerStatus.includes('artwork') || lowerStatus.includes('art')) return 'Digital Artwork';
    if (lowerStatus.includes('photo') || lowerStatus.includes('picture')) return 'Photography';
    if (lowerStatus.includes('illustration')) return 'Illustration';
    if (lowerStatus.includes('design')) return 'Design';
    if (lowerStatus.includes('portrait')) return 'Portrait';
    if (lowerStatus.includes('landscape')) return 'Landscape';
    return 'Digital Content';
  }

  private async performContentAnalysis(file: File): Promise<Partial<ContentAnalysis>> {
    try {
      // Analyze image quality metrics
      const quality = await this.analyzeImageQuality(file);
      
      // Generate tags based on content
      const tags = await this.generateContentTags(file);
      
      // Determine IP eligibility based on quality and content
      const isEligibleForIP = quality >= 6 && tags.length >= 2;

      return {
        quality,
        tags,
        isEligibleForIP
      };
    } catch (error) {
      console.warn('Content analysis failed:', error);
      return {
        quality: 5,
        tags: ['digital-content'],
        isEligibleForIP: true
      };
    }
  }

  private async analyzeImageQuality(file: File): Promise<number> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Basic quality scoring based on dimensions and file size
        const pixels = img.width * img.height;
        const ratio = file.size / pixels; // bytes per pixel
        
        let score = 5; // base score
        
        // Resolution scoring
        if (pixels > 2000000) score += 2; // > 2MP
        else if (pixels > 500000) score += 1; // > 0.5MP
        
        // Compression quality (rough estimate)
        if (ratio > 2) score += 2; // high quality
        else if (ratio > 1) score += 1; // medium quality
        
        // Aspect ratio (prefer standard ratios)
        const aspectRatio = img.width / img.height;
        if (aspectRatio >= 0.8 && aspectRatio <= 1.25) score += 1;
        
        resolve(Math.min(10, Math.max(1, score)));
      };
      img.onerror = () => resolve(5);
      img.src = URL.createObjectURL(file);
    });
  }

  private async generateContentTags(file: File): Promise<string[]> {
    const tags = ['digital-content'];
    
    // Basic tagging based on file properties
    if (file.type.includes('png')) tags.push('png', 'transparent');
    if (file.type.includes('jpeg')) tags.push('jpeg', 'photography');
    if (file.size > 5 * 1024 * 1024) tags.push('high-resolution');
    
    // Add timestamp-based tags
    const now = new Date();
    tags.push(`${now.getFullYear()}`, now.getFullYear() >= 2024 ? 'modern' : 'vintage');
    
    return tags;
  }

  private async performDuplicateCheck(file: File): Promise<{ found: boolean; tokenId?: string; similarity?: number }> {
    try {
      const spg = process.env.NEXT_PUBLIC_SPG_COLLECTION as `0x${string}` | undefined;
      if (!spg || !this.publicClient) {
        return { found: false };
      }

      const compressed = await compressImage(file);
      const imageHash = (await sha256HexOfFile(compressed)).toLowerCase();
      
      const timeoutMs = 3000;
      const withTimeout = <T,>(p: Promise<T>) => new Promise<T>((resolve) => {
        const t = setTimeout(() => resolve(null as any), timeoutMs);
        p.then(v => { clearTimeout(t); resolve(v); }).catch(() => { clearTimeout(t); resolve(null as any); });
      });

      // Quick check first
      const quick = await withTimeout(checkDuplicateQuick(this.publicClient, spg, imageHash));
      if (quick?.found) {
        return { found: true, tokenId: quick.tokenId, similarity: 1.0 };
      }

      // Full check
      const full = await withTimeout(checkDuplicateByImageHash(this.publicClient, spg, imageHash));
      if (full?.found) {
        return { found: true, tokenId: full.tokenId, similarity: 0.95 };
      }

      return { found: false };
    } catch (error) {
      console.warn('Duplicate check failed:', error);
      return { found: false };
    }
  }

  private async performIdentityCheck(file: File): Promise<{ requiresVerification: boolean; faceDetected: boolean; multiplefaces: boolean }> {
    try {
      // Check for faces
      const faceCount = await countFaces(file);
      const faceDetected = faceCount > 0;
      const multiplefaces = faceCount > 1;
      
      // Determine if identity verification is required
      const requiresVerification = faceDetected || multiplefaces;

      return {
        requiresVerification,
        faceDetected,
        multiplefaces
      };
    } catch (error) {
      console.warn('Identity check failed:', error);
      return {
        requiresVerification: false,
        faceDetected: false,
        multiplefaces: false
      };
    }
  }

  private async performRAGEnrichment(file: File, analysis: ContentAnalysis): Promise<any> {
    try {
      if (!this.ragIndex) {
        return { ragContext: 'RAG index not available' };
      }

      // Use RAG to find related content and context
      const query = `${analysis.contentType} ${analysis.tags.join(' ')} ${analysis.description}`;
      
      // This would integrate with your existing RAG system
      const ragContext = `Enhanced content analysis for ${analysis.contentType}`;
      const relatedContent = analysis.tags.slice(0, 3);
      
      // Estimate market value based on quality and type
      const marketValue = this.estimateMarketValue(analysis);

      return {
        ragContext,
        relatedContent,
        marketValue
      };
    } catch (error) {
      console.warn('RAG enrichment failed:', error);
      return {
        ragContext: 'Enrichment unavailable',
        relatedContent: [],
        marketValue: 0
      };
    }
  }

  private estimateMarketValue(analysis: ContentAnalysis): number {
    let value = 100; // base value
    
    // Quality multiplier
    value *= (analysis.quality / 10);
    
    // Content type multiplier
    if (analysis.contentType.includes('Artwork')) value *= 1.5;
    if (analysis.contentType.includes('Photography')) value *= 1.2;
    
    // AI penalty
    if (analysis.isAIGenerated) value *= 0.7;
    
    return Math.round(value);
  }

  private async performLicenseAssessment(analysis: ContentAnalysis): Promise<{ suggestedLicense: ContentAnalysis['suggestedLicense'] }> {
    let suggestedLicense: ContentAnalysis['suggestedLicense'] = 'open_use';

    // License recommendation logic
    if (analysis.quality >= 8 && !analysis.isAIGenerated) {
      suggestedLicense = 'commercial_remix';
    } else if (analysis.quality >= 6) {
      suggestedLicense = 'non_commercial_remix';
    } else {
      suggestedLicense = 'open_use';
    }

    // Override for AI-generated content
    if (analysis.isAIGenerated && analysis.aiConfidence > 0.8) {
      suggestedLicense = 'open_use';
    }

    return { suggestedLicense };
  }

  private async performComplianceCheck(analysis: ContentAnalysis): Promise<{ violations: string[] }> {
    const violations: string[] = [];

    // Check various compliance issues
    if (analysis.duplicate.found) {
      violations.push('Duplicate content detected');
    }

    if (analysis.isAIGenerated && analysis.aiConfidence > 0.9) {
      violations.push('High probability AI-generated content');
    }

    if (analysis.quality < 5) {
      violations.push('Below minimum quality threshold');
    }

    if (analysis.identity.multiplefaces) {
      violations.push('Multiple faces detected - identity unclear');
    }

    return { violations };
  }

  private async generateMetadata(file: File, analysis: ContentAnalysis, userAddress: string): Promise<any> {
    try {
      // Upload file to IPFS first
      const ipfsHash = await uploadToIPFS(file);
      const imageUrl = `https://ipfs.io/ipfs/${ipfsHash}`;

      const ipMetadata = {
        title: `${analysis.contentType} - ${analysis.isAIGenerated ? 'AI Generated' : 'Original'}`,
        description: analysis.description,
        image: imageUrl,
        mediaUrl: imageUrl,
        mediaType: file.type,
        creators: [{
          name: "User",
          address: userAddress,
          contributionPercent: 100,
        }],
        tags: analysis.tags,
        ipType: analysis.contentType,
        aiMetadata: analysis.isAIGenerated ? {
          isAIGenerated: true,
          confidence: analysis.aiConfidence,
          analysisDate: new Date().toISOString(),
        } : undefined,
        qualityScore: analysis.quality,
        riskLevel: analysis.riskLevel,
        estimatedValue: analysis.enrichments.marketValue || 0
      };

      const nftMetadata = {
        name: `IP Asset - ${analysis.contentType}`,
        description: `This NFT represents ownership of ${analysis.contentType.toLowerCase()} content`,
        image: imageUrl,
        attributes: [
          { trait_type: "Content Type", value: analysis.contentType },
          { trait_type: "AI Generated", value: analysis.isAIGenerated ? "Yes" : "No" },
          { trait_type: "Quality Score", value: analysis.quality },
          { trait_type: "Risk Level", value: analysis.riskLevel },
          { trait_type: "License Type", value: analysis.suggestedLicense },
        ],
      };

      return { ipMetadata, nftMetadata, ipfsHash, imageUrl };
    } catch (error) {
      console.error('Metadata generation failed:', error);
      throw error;
    }
  }

  private async performRiskAssessment(analysis: ContentAnalysis): Promise<{ riskLevel: ContentAnalysis['riskLevel'] }> {
    let riskScore = 0;

    // Add risk points
    if (analysis.isAIGenerated) riskScore += 2;
    if (analysis.duplicate.found) riskScore += 5;
    if (analysis.quality < 6) riskScore += 1;
    if (analysis.violations.length > 0) riskScore += analysis.violations.length;
    if (analysis.identity.requiresVerification) riskScore += 1;
    if (analysis.identity.multiplefaces) riskScore += 2;

    // Subtract risk points for good indicators
    if (analysis.quality >= 8) riskScore -= 1;
    if (!analysis.isAIGenerated) riskScore -= 1;
    if (analysis.tags.length >= 5) riskScore -= 1;

    // Determine risk level
    const riskLevel: ContentAnalysis['riskLevel'] = 
      riskScore <= 1 ? 'low' :
      riskScore <= 4 ? 'medium' : 'high';

    return { riskLevel };
  }

  private generateRecommendations(analysis: ContentAnalysis): WorkflowRecommendation[] {
    const recommendations: WorkflowRecommendation[] = [];

    // Auto-approve conditions
    if (analysis.riskLevel === 'low' && analysis.isEligibleForIP && !analysis.duplicate.found && analysis.violations.length === 0) {
      recommendations.push({
        type: 'approve',
        priority: 'high',
        reason: 'All checks passed - ready for registration',
        action: 'Auto-approve and register IP',
        autoExecutable: true
      });
    }

    // Review conditions
    if (analysis.riskLevel === 'medium' || analysis.identity.requiresVerification) {
      recommendations.push({
        type: 'review',
        priority: 'medium',
        reason: 'Manual review recommended due to medium risk or identity verification needed',
        action: 'Submit for manual review',
        autoExecutable: false
      });
    }

    // Reject conditions
    if (analysis.duplicate.found || analysis.riskLevel === 'high') {
      recommendations.push({
        type: 'reject',
        priority: 'high',
        reason: 'High risk content or duplicate detected',
        action: 'Block registration',
        autoExecutable: true
      });
    }

    // Edit suggestions
    if (analysis.quality < 7 || analysis.tags.length < 3) {
      recommendations.push({
        type: 'edit',
        priority: 'low',
        reason: 'Metadata can be improved',
        action: 'Edit metadata and license terms',
        autoExecutable: false
      });
    }

    // Retry suggestions
    if (analysis.violations.includes('Below minimum quality threshold')) {
      recommendations.push({
        type: 'retry',
        priority: 'medium',
        reason: 'Image quality needs improvement',
        action: 'Re-upload with higher quality image',
        autoExecutable: false
      });
    }

    return recommendations;
  }

  private shouldAutoApprove(analysis: ContentAnalysis): boolean {
    return analysis.riskLevel === 'low' && 
           analysis.isEligibleForIP && 
           !analysis.duplicate.found && 
           analysis.violations.length === 0 &&
           !analysis.identity.requiresVerification;
  }

  private getRequiredActions(analysis: ContentAnalysis): string[] {
    const actions: string[] = [];

    if (analysis.duplicate.found) {
      actions.push('resolve_duplicate');
    }

    if (analysis.identity.requiresVerification) {
      actions.push('verify_identity');
    }

    if (analysis.violations.length > 0) {
      actions.push('address_violations');
    }

    if (analysis.quality < 6) {
      actions.push('improve_quality');
    }

    if (actions.length === 0 && analysis.isEligibleForIP) {
      actions.push('ready_for_registration');
    }

    return actions;
  }
}
