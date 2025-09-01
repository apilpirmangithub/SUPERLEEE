import OpenAI from 'openai';
import { AdvancedAnalysisResult, SimpleRecommendation } from '@/types/ai-detection';

export class FallbackAIDetection {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async analyzeImageBasic(imageUrl: string): Promise<{ analysis: AdvancedAnalysisResult; recommendation: SimpleRecommendation }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this image and determine strictly, being conservative:
1. Is it AI-generated? (boolean) with confidence 0-1
2. Overall quality score (1-10)
3. Suitable for IP registration? (boolean)
4. Recommended license type (commercial/nonCommercial/remix)
Return JSON only with keys: isAIGenerated, confidence, qualityScore, ipEligible, recommendedLicense, reasoning.`
              },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: 300,
        temperature: 0.2,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');

      // Conservative post-processing
      const parsedQuality = Number(result.qualityScore || 5);
      const score = Math.max(1, Math.min(10, parsedQuality));
      let isAIGenerated = Boolean(result.isAIGenerated);
      const confidence = Math.max(0, Math.min(1, Number(result.confidence || 0)));
      // Require high confidence to flag as AI
      if (confidence < 0.85) isAIGenerated = false;

      const computedScore = score * 10;
      let ipEligible = typeof result.ipEligible === 'boolean' ? result.ipEligible : computedScore >= 60;
      if (computedScore >= 60 && !isAIGenerated) ipEligible = true; // keep consistent

      // Convert simple result to advanced format
      const analysis: AdvancedAnalysisResult = {
        aiDetection: {
          isAIGenerated,
          confidence,
          indicators: isAIGenerated ? ["Basic AI pattern detection"] : [],
          aiModel: undefined,
          learningRestriction: isAIGenerated ? 'disabled' : 'enabled'
        },
        qualityAssessment: {
          overall: score,
          technical: {
            resolution: score,
            sharpness: score,
            composition: score,
            lighting: score,
            colorBalance: score
          },
          artistic: {
            creativity: score,
            originality: score,
            aesthetics: score,
            concept: score
          }
        },
        ipEligibility: {
          isEligible: ipEligible,
          score: computedScore,
          reasons: ipEligible ? ["Basic quality assessment passed"] : ["Basic quality assessment failed"],
          risks: isAIGenerated ? ["AI-generated content has limited IP protection"] : [],
          requirements: ipEligible ? [] : ["Improve image quality or authenticity"]
        },
        licenseRecommendation: {
          primary: result.recommendedLicense || 'nonCommercial',
          confidence: 0.7,
          reasoning: result.reasoning || "Basic recommendation based on simple analysis",
          aiLearningAllowed: !isAIGenerated,
          robotTerms: {
            userAgent: '*',
            allow: isAIGenerated ? "Disallow: /" : "Allow: /"
          },
          suggestedTerms: {
            mintingFee: result.recommendedLicense === 'commercial' ? 50 : 0,
            commercialRevShare: result.recommendedLicense === 'commercial' ? 10 : 0,
            derivativesAllowed: result.recommendedLicense === 'remix',
            commercialUse: result.recommendedLicense === 'commercial',
            aiTrainingRestricted: isAIGenerated
          }
        },
        content: {
          type: "image",
          category: "digital content",
          description: "Content analyzed with basic AI detection",
          tags: isAIGenerated ? ["AI-Generated", "Basic-Analysis"] : ["Human-Created", "Basic-Analysis"],
          marketValue: score > 7 ? 'high' : score > 5 ? 'medium' : 'low'
        }
      };

      const recommendation: SimpleRecommendation = {
        status: analysis.aiDetection.isAIGenerated ? 'ai-restricted' : (analysis.qualityAssessment.overall > 7 ? 'good' : 'fair'),
        message: analysis.aiDetection.isAIGenerated ?
          '⚠️ High-confidence AI content detected (fallback)' :
          `✅ Human content detected (quality: ${analysis.qualityAssessment.overall}/10)`,
        action: analysis.aiDetection.isAIGenerated ?
          'Register with AI restrictions' :
          'Register with recommended license',
        license: analysis.licenseRecommendation.primary === 'commercial' ? 'Commercial Use' :
                analysis.licenseRecommendation.primary === 'remix' ? 'Remix License' : 'Non-Commercial',
        aiLearning: analysis.aiDetection.isAIGenerated ? '🚫 Restricted (basic protection)' : '✅ Your choice'
      };

      return { analysis, recommendation };

    } catch (error) {
      console.error("Fallback AI analysis error:", error);
      throw error;
    }
  }
}
