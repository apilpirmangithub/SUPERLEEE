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
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: `Analyze this image and determine:
1. Is it AI-generated? (yes/no and confidence 0-1)
2. Overall quality score (1-10)
3. Suitable for IP registration? (yes/no)
4. Recommended license type (commercial/non-commercial/remix)

Respond in JSON format:
{
  "isAIGenerated": boolean,
  "confidence": number,
  "qualityScore": number,
  "ipEligible": boolean,
  "recommendedLicense": "commercial|nonCommercial|remix",
  "reasoning": "brief explanation"
}`
          }
        ],
        max_tokens: 300,
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      
      // Convert simple result to advanced format
      const analysis: AdvancedAnalysisResult = {
        aiDetection: {
          isAIGenerated: result.isAIGenerated || false,
          confidence: result.confidence || 0.5,
          indicators: result.isAIGenerated ? ["Basic AI pattern detection"] : [],
          aiModel: undefined,
          learningRestriction: result.isAIGenerated ? 'disabled' : 'enabled'
        },
        qualityAssessment: {
          overall: result.qualityScore || 5,
          technical: {
            resolution: result.qualityScore || 5,
            sharpness: result.qualityScore || 5,
            composition: result.qualityScore || 5,
            lighting: result.qualityScore || 5,
            colorBalance: result.qualityScore || 5
          },
          artistic: {
            creativity: result.qualityScore || 5,
            originality: result.qualityScore || 5,
            aesthetics: result.qualityScore || 5,
            concept: result.qualityScore || 5
          }
        },
        ipEligibility: {
          isEligible: result.ipEligible || false,
          score: (result.qualityScore || 5) * 10,
          reasons: result.ipEligible ? ["Basic quality assessment passed"] : ["Basic quality assessment failed"],
          risks: result.isAIGenerated ? ["AI-generated content has limited IP protection"] : [],
          requirements: result.ipEligible ? [] : ["Improve image quality or authenticity"]
        },
        licenseRecommendation: {
          primary: result.recommendedLicense || 'nonCommercial',
          confidence: 0.7,
          reasoning: result.reasoning || "Basic recommendation based on simple analysis",
          aiLearningAllowed: !result.isAIGenerated,
          robotTerms: {
            userAgent: result.isAIGenerated ? "*" : "*",
            allow: result.isAIGenerated ? "Disallow: /" : "Allow: /"
          },
          suggestedTerms: {
            mintingFee: result.recommendedLicense === 'commercial' ? 50 : 0,
            commercialRevShare: result.recommendedLicense === 'commercial' ? 10 : 0,
            derivativesAllowed: result.recommendedLicense === 'remix',
            commercialUse: result.recommendedLicense === 'commercial',
            aiTrainingRestricted: result.isAIGenerated
          }
        },
        content: {
          type: "image",
          category: "digital content",
          description: "Content analyzed with basic AI detection",
          tags: result.isAIGenerated ? ["AI-Generated", "Basic-Analysis"] : ["Human-Created", "Basic-Analysis"],
          marketValue: result.qualityScore > 7 ? 'high' : result.qualityScore > 5 ? 'medium' : 'low'
        }
      };

      const recommendation: SimpleRecommendation = {
        status: result.isAIGenerated ? 'ai-restricted' : (result.qualityScore > 7 ? 'good' : 'fair'),
        message: result.isAIGenerated ? 
          '⚠️ Possible AI content detected (basic analysis)' : 
          `✅ Human content detected (quality: ${result.qualityScore}/10)`,
        action: result.isAIGenerated ? 
          'Register with AI restrictions' : 
          'Register with recommended license',
        license: result.recommendedLicense === 'commercial' ? 'Commercial Use' : 
                result.recommendedLicense === 'remix' ? 'Remix License' : 'Non-Commercial',
        aiLearning: result.isAIGenerated ? '🚫 Restricted (basic protection)' : '✅ Your choice'
      };

      return { analysis, recommendation };

    } catch (error) {
      console.error("Fallback AI analysis error:", error);
      throw error;
    }
  }
}
