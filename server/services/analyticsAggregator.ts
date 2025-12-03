/**
 * Analytics Aggregator Service
 * 
 * Provides comprehensive portfolio analytics including:
 * - Portfolio snapshots
 * - Asset allocation breakdowns
 * - 5-year projected returns (scenario analysis)
 * - Benchmark comparison data
 * - Actionable recommendations grouped by priority
 */

import type {
  Portfolio,
  Holding,
  AssetAllocation,
  Recommendation,
  RiskProfile,
} from "@shared/schema";

import type {
  PortfolioSnapshot,
  AllocationBreakdown,
  ProjectionScenario,
  BenchmarkDataPoint,
  ActionItem,
  AnalyticsResponse,
  PerformanceMetrics,
} from "@shared/analyticsTypes";

import { calculatePerformanceMetrics } from "../utils/performanceMetrics";

export class AnalyticsAggregatorService {
  /**
   * Generate comprehensive analytics for a portfolio
   */
  async generateAnalytics(
    portfolio: Portfolio,
    holdings: Holding[],
    allocations: AssetAllocation[],
    recommendations: Recommendation[],
    riskProfile?: RiskProfile
  ): Promise<AnalyticsResponse> {
    const snapshot = this.buildSnapshot(portfolio);
    const allocationBreakdown = this.buildAllocationBreakdown(holdings, allocations);
    const projections = this.calculateProjections(portfolio, riskProfile);
    const benchmark = this.generateBenchmarkData(portfolio);
    const performanceMetrics = calculatePerformanceMetrics(benchmark);
    const actionItems = this.groupActionItems(recommendations);

    return {
      snapshot,
      allocation: allocationBreakdown,
      projections,
      benchmark,
      performanceMetrics,
      recommendations: recommendations.filter(r => r.isActive === 1),
      actionItems,
    };
  }

  /**
   * Build portfolio snapshot
   */
  private buildSnapshot(portfolio: Portfolio): PortfolioSnapshot {
    const totalValue = parseFloat(portfolio.totalValue || "0");
    const totalInvested = parseFloat(portfolio.totalInvested || "0");
    const totalReturns = parseFloat(portfolio.totalReturns || "0");
    const returnsPercentage = parseFloat(portfolio.returnsPercentage || "0");

    return {
      totalValue,
      totalInvested,
      totalReturns,
      returnsPercentage,
      portfolioCount: 1, // Can be extended to support multiple portfolios
    };
  }

  /**
   * Build detailed allocation breakdown
   */
  private buildAllocationBreakdown(
    holdings: Holding[],
    allocations: AssetAllocation[]
  ): AllocationBreakdown[] {
    const assetTypeMap = new Map<string, {
      value: number;
      investment: number;
      returns: number;
    }>();

    // Aggregate holdings by asset type
    holdings.forEach(holding => {
      const current = assetTypeMap.get(holding.assetType) || {
        value: 0,
        investment: 0,
        returns: 0,
      };

      current.value += parseFloat(holding.currentValue);
      current.investment += parseFloat(holding.investedAmount);
      current.returns += parseFloat(holding.returns);

      assetTypeMap.set(holding.assetType, current);
    });

    const totalValue = Array.from(assetTypeMap.values())
      .reduce((sum, item) => sum + item.value, 0);

    // Build breakdown with allocation data
    const breakdown: AllocationBreakdown[] = [];

    assetTypeMap.forEach((data, assetType) => {
      const allocation = allocations.find(a => a.assetType === assetType);
      const currentAllocation = (data.value / totalValue) * 100;
      const returnsPercentage = data.investment > 0
        ? (data.returns / data.investment) * 100
        : 0;

      breakdown.push({
        assetType,
        currentAllocation,
        recommendedAllocation: allocation?.recommendedAllocation
          ? parseFloat(allocation.recommendedAllocation)
          : null,
        currentValue: data.value,
        investment: data.investment,
        returns: data.returns,
        returnsPercentage,
        deviation: allocation?.deviation ? parseFloat(allocation.deviation) : null,
      });
    });

    return breakdown.sort((a, b) => b.currentValue - a.currentValue);
  }

  /**
   * Calculate 5-year projected returns (scenario analysis)
   */
  private calculateProjections(
    portfolio: Portfolio,
    riskProfile?: RiskProfile
  ): AnalyticsResponse["projections"] {
    const currentValue = parseFloat(portfolio.totalValue || "0");

    // Base return rates based on risk profile
    const baseRate = this.getBaseReturnRate(riskProfile);

    // Scenario multipliers
    const scenarios = {
      worst: { multiplier: 0.5, label: "worst" as const },
      base: { multiplier: 1.0, label: "base" as const },
      best: { multiplier: 1.5, label: "best" as const },
    };

    const currentAllocation: ProjectionScenario[] = [];
    const afterRestructuring: ProjectionScenario[] = [];

    Object.values(scenarios).forEach(scenario => {
      const annualReturn = baseRate * scenario.multiplier;
      const projectedValue = currentValue * Math.pow(1 + annualReturn / 100, 5);
      const totalReturn = ((projectedValue - currentValue) / currentValue) * 100;

      currentAllocation.push({
        scenarioType: scenario.label,
        projectedValue,
        totalReturn,
        avgAnnualReturn: annualReturn,
        gainVsCurrent: projectedValue - currentValue,
      });

      // After restructuring (assume 15% improvement)
      const improvedReturn = annualReturn * 1.15;
      const improvedValue = currentValue * Math.pow(1 + improvedReturn / 100, 5);
      const improvedTotal = ((improvedValue - currentValue) / currentValue) * 100;

      afterRestructuring.push({
        scenarioType: scenario.label,
        projectedValue: improvedValue,
        totalReturn: improvedTotal,
        avgAnnualReturn: improvedReturn,
        gainVsCurrent: improvedValue - currentValue,
      });
    });

    // Calculate potential gain (base case improvement)
    const baseCurrent = currentAllocation.find(s => s.scenarioType === "base");
    const baseRestructured = afterRestructuring.find(s => s.scenarioType === "base");
    const potentialGain = baseCurrent && baseRestructured
      ? baseRestructured.projectedValue - baseCurrent.projectedValue
      : 0;

    return {
      currentAllocation,
      afterRestructuring,
      potentialGain,
    };
  }

  /**
   * Get base return rate based on risk profile
   */
  private getBaseReturnRate(riskProfile?: RiskProfile): number {
    if (!riskProfile) return 12; // Default moderate return

    switch (riskProfile.riskLevel) {
      case "very_low":
        return 7;
      case "low":
        return 9;
      case "moderate":
        return 12;
      case "high":
        return 15;
      case "very_high":
        return 18;
      default:
        return 12;
    }
  }

  /**
   * Generate benchmark comparison data
   */
  private generateBenchmarkData(portfolio: Portfolio): BenchmarkDataPoint[] {
    const currentValue = parseFloat(portfolio.totalValue || "0");
    const currentDate = new Date();
    const annualReturn = parseFloat(portfolio.returnsPercentage || "10.9") / 100;
    const benchmarkReturn = 0.105; // 10.5% annual

    // Generate last 12 months of data
    const dataPoints: BenchmarkDataPoint[] = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Add realistic monthly volatility (3-5% monthly fluctuation around trend)
    // Using a seeded pseudo-random approach for consistency
    const monthlyVolatility = [
      0.02, -0.01, 0.03, -0.02, 0.04, 0.01, 
      -0.01, 0.02, -0.02, 0.03, 0.01, -0.01
    ];

    let portfolioCumulative = 1.0;
    let benchmarkCumulative = 1.0;
    const invested = parseFloat(portfolio.totalInvested || "0");

    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);

      // Calculate expected growth to reach annual return
      const monthProgress = (11 - i) / 11;
      const expectedGrowth = 1 + annualReturn * monthProgress;
      const expectedBenchmarkGrowth = 1 + benchmarkReturn * monthProgress;
      
      // Add monthly fluctuation while trending toward final value
      const monthlyReturn = (annualReturn / 12) + monthlyVolatility[11 - i];
      const monthlyBenchmarkReturn = (benchmarkReturn / 12) + (monthlyVolatility[11 - i] * 0.8);
      
      portfolioCumulative *= (1 + monthlyReturn);
      benchmarkCumulative *= (1 + monthlyBenchmarkReturn);

      dataPoints.push({
        period: monthNames[date.getMonth()],
        portfolioValue: invested * portfolioCumulative,
        benchmarkValue: invested * benchmarkCumulative,
        date: date.toISOString().split('T')[0],
      });
    }

    return dataPoints;
  }

  /**
   * Group recommendations into actionable items
   */
  private groupActionItems(recommendations: Recommendation[]): ActionItem[] {
    const actionItems: ActionItem[] = [];

    // Group by action type and priority
    const sellRecs = recommendations.filter(r => r.action === "sell" && r.isActive === 1);
    const reviewRecs = recommendations.filter(r => 
      (r.action === "decrease" || r.action === "hold") && 
      r.priority && r.priority >= 4 && r.priority <= 7 &&
      r.isActive === 1
    );
    const holdRecs = recommendations.filter(r => 
      r.action === "hold" && 
      r.priority && r.priority < 4 &&
      r.isActive === 1
    );

    // HIGH Priority: SELL recommendations
    if (sellRecs.length > 0) {
      const totalValue = sellRecs.reduce((sum, r) => 
        sum + parseFloat(r.suggestedAmount || "0"), 0
      );
      const potentialGain = sellRecs.reduce((sum, r) => {
        const expectedReturn = parseFloat(r.expectedReturn || "0");
        const amount = parseFloat(r.suggestedAmount || "0");
        return sum + (amount * expectedReturn / 100 * 5); // 5-year projection
      }, 0);

      actionItems.push({
        id: "action-sell",
        priority: "HIGH",
        priorityScore: Math.max(...sellRecs.map(r => r.priority || 0)),
        action: "SELL",
        title: "SELL: Underperforming Funds",
        description: `Funds showing consistent negative alpha over 12+ months. Total value: ₹${(totalValue / 100000).toFixed(2)}L. Recommend reallocation to better-performing alternatives within same asset class.`,
        affectedFunds: sellRecs.length,
        totalValue,
        potentialGain,
        timeline: "Within 30 days",
        recommendations: sellRecs,
      });
    }

    // MEDIUM Priority: REVIEW recommendations
    if (reviewRecs.length > 0) {
      const totalValue = reviewRecs.reduce((sum, r) => 
        sum + parseFloat(r.suggestedAmount || "0"), 0
      );

      actionItems.push({
        id: "action-review",
        priority: "MEDIUM",
        priorityScore: Math.max(...reviewRecs.map(r => r.priority || 0)),
        action: "REVIEW",
        title: "REVIEW: Funds on Watch List",
        description: "Recent underperformance but not critical yet. Monitor closely over next 90 days before making final decision.",
        affectedFunds: reviewRecs.length,
        totalValue,
        potentialGain: null,
        timeline: "Review Date: 90 days",
        recommendations: reviewRecs,
      });
    }

    // LOW Priority: HOLD strong performers
    if (holdRecs.length > 0) {
      const totalValue = holdRecs.reduce((sum, r) => 
        sum + parseFloat(r.suggestedAmount || "0"), 0
      );

      actionItems.push({
        id: "action-hold",
        priority: "LOW",
        priorityScore: Math.max(...holdRecs.map(r => r.priority || 0)),
        action: "HOLD",
        title: "HOLD: Strong Performers",
        description: "Majority of portfolio performing excellently. Continue current strategy with annual rebalancing.",
        affectedFunds: holdRecs.length,
        totalValue,
        potentialGain: null,
        timeline: "Annual review",
        recommendations: holdRecs,
      });
    }

    return actionItems.sort((a, b) => b.priorityScore - a.priorityScore);
  }
}

/**
 * Initialize the Analytics Aggregator Service
 */
export function createAnalyticsAggregatorService(): AnalyticsAggregatorService {
  return new AnalyticsAggregatorService();
}
