/**
 * AI Recommendation Engine - RuDo Portfolio Analysis
 * 
 * This service provides AI-powered portfolio recommendations using OpenAI models.
 * It analyzes holdings, risk profiles, and market data to generate actionable insights.
 */

import type { 
  Portfolio, 
  Holding, 
  RiskProfile, 
  AssetAllocation,
  InsertRecommendation 
} from "@shared/schema";

interface PortfolioAnalysisInput {
  portfolio: Portfolio;
  holdings: Holding[];
  riskProfile?: RiskProfile;
  currentAllocations?: AssetAllocation[];
}

interface RecommendationContext {
  action: "buy" | "sell" | "hold" | "increase" | "decrease";
  assetType?: string;
  assetName?: string;
  reasoning: string;
  suggestedAmount?: number;
  priority: number; // 1-10
  confidence: number; // 0-1
  expectedReturn?: number; // percentage
}

/**
 * AI Recommendation Service
 * 
 * Uses OpenAI to analyze portfolios and generate recommendations
 */
export class AIRecommendationService {
  private apiKey: string | undefined;
  private model: string;

  constructor() {
    // When using Replit AI Integrations, the API key is managed automatically
    this.apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  /**
   * Generate portfolio recommendations
   * 
   * Analyzes the portfolio and returns actionable recommendations
   */
  async generateRecommendations(
    input: PortfolioAnalysisInput
  ): Promise<InsertRecommendation[]> {
    if (!this.apiKey) {
      console.warn('OpenAI API key not configured. Returning mock recommendations.');
      return this.getMockRecommendations(input);
    }

    try {
      const analysisPrompt = this.buildAnalysisPrompt(input);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(),
            },
            {
              role: 'user',
              content: analysisPrompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        console.error('OpenAI API error:', await response.text());
        return this.getMockRecommendations(input);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      return this.parseAIResponse(aiResponse, input.portfolio.id);
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      return this.getMockRecommendations(input);
    }
  }

  /**
   * Build the analysis prompt for the AI
   */
  private buildAnalysisPrompt(input: PortfolioAnalysisInput): string {
    const { portfolio, holdings, riskProfile, currentAllocations } = input;

    let prompt = `Analyze this investment portfolio and provide recommendations:\n\n`;
    
    prompt += `Portfolio: ${portfolio.name}\n`;
    prompt += `Total Value: ₹${portfolio.totalValue}\n`;
    prompt += `Total Invested: ₹${portfolio.totalInvested}\n`;
    prompt += `Returns: ${portfolio.returnsPercentage}%\n\n`;

    if (riskProfile) {
      prompt += `Risk Profile:\n`;
      prompt += `- Risk Level: ${riskProfile.riskLevel}\n`;
      prompt += `- Risk Score: ${riskProfile.riskScore}/100\n`;
      prompt += `- Investment Horizon: ${riskProfile.investmentHorizon} months\n`;
      if (riskProfile.investmentGoals && riskProfile.investmentGoals.length > 0) {
        prompt += `- Goals: ${riskProfile.investmentGoals.join(', ')}\n`;
      }
      prompt += '\n';
    }

    prompt += `Current Holdings (${holdings.length}):\n`;
    holdings.forEach(holding => {
      prompt += `- ${holding.assetName} (${holding.assetType}): `;
      prompt += `₹${holding.currentValue} (${holding.returnsPercentage}% returns)\n`;
    });
    prompt += '\n';

    if (currentAllocations && currentAllocations.length > 0) {
      prompt += `Asset Allocation:\n`;
      currentAllocations.forEach(allocation => {
        prompt += `- ${allocation.assetType}: ${allocation.currentAllocation}%`;
        if (allocation.recommendedAllocation) {
          prompt += ` (target: ${allocation.recommendedAllocation}%)`;
        }
        prompt += '\n';
      });
      prompt += '\n';
    }

    prompt += `Provide 3-5 specific, actionable recommendations to optimize this portfolio.`;
    prompt += ` For each recommendation, include:\n`;
    prompt += `1. Action (buy/sell/hold/increase/decrease)\n`;
    prompt += `2. Asset type and name (if specific)\n`;
    prompt += `3. Clear reasoning\n`;
    prompt += `4. Suggested amount (if applicable)\n`;
    prompt += `5. Priority (1-10, where 10 is most urgent)\n`;
    prompt += `6. Confidence level (0-1)\n`;
    prompt += `7. Expected return percentage (if applicable)\n\n`;
    prompt += `Format your response as a JSON array of recommendations.`;

    return prompt;
  }

  /**
   * System prompt that defines the AI's role
   */
  private getSystemPrompt(): string {
    return `You are RuDo, an expert financial advisor specializing in portfolio management for NRI (Non-Resident Indian) clients. 
    
Your role is to analyze investment portfolios and provide data-driven, personalized recommendations that consider:
- Risk tolerance and investment horizon
- Asset allocation and diversification
- Indian market conditions and regulations
- NRI-specific investment considerations
- Tax implications for NRIs
- Currency risk management

Provide clear, actionable advice that is easy to understand. Focus on long-term wealth creation while managing risk appropriately. Always consider the client's specific goals and risk profile when making recommendations.

When suggesting specific investments, be conservative and focus on well-established options suitable for the client's risk level. Always disclose the risks involved.`;
  }

  /**
   * Parse AI response into recommendations
   */
  private parseAIResponse(
    aiResponse: string,
    portfolioId: string
  ): InsertRecommendation[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const recommendations: RecommendationContext[] = JSON.parse(jsonMatch[0]);

      return recommendations.map(rec => ({
        portfolioId,
        action: rec.action,
        assetType: rec.assetType as any || null,
        assetName: rec.assetName || null,
        reasoning: rec.reasoning,
        suggestedAmount: rec.suggestedAmount?.toString() || null,
        priority: rec.priority,
        confidence: rec.confidence.toString(),
        expectedReturn: rec.expectedReturn?.toString() || null,
        aiModel: 'rudo',
        metadata: null,
        holdingId: null,
        riskImpact: null,
        isActive: 1,
        expiresAt: null,
      }));
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.log('Raw AI response:', aiResponse);
      
      // Return a single recommendation from the text
      return [{
        portfolioId,
        action: 'hold',
        reasoning: aiResponse.substring(0, 500),
        priority: 5,
        confidence: '0.7',
        aiModel: 'rudo',
        assetType: null,
        assetName: null,
        suggestedAmount: null,
        expectedReturn: null,
        metadata: null,
        holdingId: null,
        riskImpact: null,
        isActive: 1,
        expiresAt: null,
      }];
    }
  }

  /**
   * Get mock recommendations when AI is not available
   */
  private getMockRecommendations(
    input: PortfolioAnalysisInput
  ): InsertRecommendation[] {
    const { portfolio, holdings, riskProfile } = input;
    const recommendations: InsertRecommendation[] = [];

    // Diversification check
    const assetTypes = new Set(holdings.map(h => h.assetType));
    if (assetTypes.size < 3) {
      recommendations.push({
        portfolioId: portfolio.id,
        action: 'buy',
        assetType: 'mutual_fund',
        assetName: null,
        reasoning: 'Your portfolio lacks diversification. Consider adding mutual funds to spread risk across different sectors and reduce volatility.',
        suggestedAmount: '50000',
        priority: 8,
        confidence: '0.85',
        expectedReturn: '12',
        riskImpact: 'moderate',
        aiModel: 'rudo',
        metadata: null,
        holdingId: null,
        isActive: 1,
        expiresAt: null,
      });
    }

    // High returns recommendation
    const highPerformers = holdings.filter(h => 
      parseFloat(h.returnsPercentage) > 15
    );
    
    if (highPerformers.length > 0) {
      const topPerformer = highPerformers.reduce((max, h) => 
        parseFloat(h.returnsPercentage) > parseFloat(max.returnsPercentage) ? h : max
      );
      
      recommendations.push({
        portfolioId: portfolio.id,
        action: 'increase',
        assetType: topPerformer.assetType,
        assetName: topPerformer.assetName,
        holdingId: topPerformer.id,
        reasoning: `${topPerformer.assetName} has shown strong performance with ${topPerformer.returnsPercentage}% returns. Consider increasing your position to capitalize on this momentum while it aligns with your risk profile.`,
        suggestedAmount: '30000',
        priority: 7,
        confidence: '0.75',
        expectedReturn: '15',
        riskImpact: riskProfile?.riskLevel || 'moderate',
        aiModel: 'rudo',
        metadata: null,
        isActive: 1,
        expiresAt: null,
      });
    }

    // Rebalancing recommendation
    const totalValue = parseFloat(portfolio.totalValue || "0");
    if (totalValue > 0) {
      const stockValue = holdings
        .filter(h => h.assetType === 'stock')
        .reduce((sum, h) => sum + parseFloat(h.currentValue), 0);
      
      const stockPercentage = (stockValue / totalValue) * 100;
      
      if (riskProfile && riskProfile.riskLevel === 'low' && stockPercentage > 20) {
        recommendations.push({
          portfolioId: portfolio.id,
          action: 'decrease',
          assetType: 'stock',
          assetName: null,
          reasoning: `Your stock allocation (${stockPercentage.toFixed(1)}%) is higher than recommended for your low-risk profile. Consider rebalancing into fixed deposits or debt funds to align with your risk tolerance.`,
          suggestedAmount: ((stockPercentage - 15) * totalValue / 100).toString(),
          priority: 9,
          confidence: '0.9',
          expectedReturn: null,
          riskImpact: 'low',
          aiModel: 'rudo',
          metadata: null,
          holdingId: null,
          isActive: 1,
          expiresAt: null,
        });
      }
    }

    // Default hold recommendation
    if (recommendations.length === 0) {
      recommendations.push({
        portfolioId: portfolio.id,
        action: 'hold',
        assetType: null,
        assetName: null,
        reasoning: 'Your portfolio is well-balanced and performing adequately. Continue with your current strategy and review quarterly to adjust for market conditions.',
        suggestedAmount: null,
        priority: 5,
        confidence: '0.8',
        expectedReturn: '10',
        riskImpact: riskProfile?.riskLevel || 'moderate',
        aiModel: 'rudo',
        metadata: null,
        holdingId: null,
        isActive: 1,
        expiresAt: null,
      });
    }

    return recommendations;
  }

  /**
   * Analyze asset allocation and suggest rebalancing
   */
  async analyzeAssetAllocation(
    portfolio: Portfolio,
    holdings: Holding[],
    riskProfile?: RiskProfile
  ): Promise<AssetAllocation[]> {
    const totalValue = parseFloat(portfolio.totalValue || "0");
    if (totalValue === 0) return [];

    // Group holdings by asset type
    const allocationMap = new Map<string, number>();
    holdings.forEach(holding => {
      const current = allocationMap.get(holding.assetType) || 0;
      allocationMap.set(holding.assetType, current + parseFloat(holding.currentValue));
    });

    // Get recommended allocations based on risk profile
    const recommendedAllocations = this.getRecommendedAllocations(riskProfile);

    // Build allocation array
    const allocations: any[] = [];
    allocationMap.forEach((value, assetType) => {
      const currentPercentage = (value / totalValue) * 100;
      const recommended = recommendedAllocations.get(assetType) || null;
      const deviation = recommended !== null ? currentPercentage - recommended : null;

      allocations.push({
        portfolioId: portfolio.id,
        assetType: assetType as any,
        currentAllocation: currentPercentage.toFixed(2),
        recommendedAllocation: recommended?.toFixed(2) || null,
        currentValue: value.toFixed(2),
        deviation: deviation?.toFixed(2) || null,
      });
    });

    return allocations;
  }

  /**
   * Get recommended allocations based on risk profile
   */
  private getRecommendedAllocations(riskProfile?: RiskProfile): Map<string, number> {
    const allocations = new Map<string, number>();

    if (!riskProfile) {
      // Default moderate allocation
      allocations.set('stock', 25);
      allocations.set('mutual_fund', 35);
      allocations.set('fixed_deposit', 20);
      allocations.set('bond', 15);
      allocations.set('gold', 5);
      return allocations;
    }

    switch (riskProfile.riskLevel) {
      case 'very_low':
        allocations.set('fixed_deposit', 40);
        allocations.set('bond', 30);
        allocations.set('mutual_fund', 20);
        allocations.set('stock', 10);
        break;

      case 'low':
        allocations.set('mutual_fund', 35);
        allocations.set('fixed_deposit', 30);
        allocations.set('bond', 20);
        allocations.set('stock', 15);
        break;

      case 'moderate':
        allocations.set('mutual_fund', 35);
        allocations.set('stock', 25);
        allocations.set('fixed_deposit', 20);
        allocations.set('bond', 15);
        allocations.set('gold', 5);
        break;

      case 'high':
        allocations.set('stock', 40);
        allocations.set('mutual_fund', 35);
        allocations.set('bond', 15);
        allocations.set('gold', 10);
        break;

      case 'very_high':
        allocations.set('stock', 50);
        allocations.set('mutual_fund', 30);
        allocations.set('bond', 15);
        allocations.set('real_estate', 5);
        break;
    }

    return allocations;
  }
}

/**
 * Initialize the AI Recommendation Service
 */
export function createAIRecommendationService(): AIRecommendationService {
  return new AIRecommendationService();
}
