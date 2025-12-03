import type { Recommendation, Holding } from "./schema";

export type TaxClassification = "LTCG" | "STCG" | "N/A";

export interface HoldingPeriodInfo {
  daysHeld: number;
  acquisitionDate: Date | null;
  taxClassification: TaxClassification;
  monthsUntilLTCG: number | null;
}

export interface EnhancedHolding extends Holding {
  holdingPeriod: HoldingPeriodInfo;
}

export interface PortfolioSnapshot {
  totalValue: number;
  totalInvested: number;
  totalReturns: number;
  returnsPercentage: number;
  portfolioCount: number;
}

export interface AllocationBreakdown {
  assetType: string;
  currentAllocation: number; // percentage
  recommendedAllocation: number | null; // percentage
  currentValue: number;
  investment: number;
  returns: number;
  returnsPercentage: number;
  deviation: number | null; // difference from recommended
}

export interface ProjectionScenario {
  scenarioType: "worst" | "base" | "best";
  projectedValue: number;
  totalReturn: number; // percentage
  avgAnnualReturn: number; // percentage
  gainVsCurrent: number; // absolute gain
}

export interface BenchmarkDataPoint {
  period: string; // e.g., "Jan", "Feb", "Q1 2024"
  portfolioValue: number;
  benchmarkValue: number;
  date: string;
}

export interface ActionItem {
  id: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  priorityScore: number; // 1-10
  action: string;
  title: string;
  description: string;
  affectedFunds: number;
  totalValue: number;
  potentialGain: number | null;
  timeline: string;
  recommendations: Recommendation[];
}

export interface PerformanceMetrics {
  volatility: number; // Annualized standard deviation (%)
  sharpeRatio: number; // Risk-adjusted return metric
  maxDrawdown: number; // Maximum peak-to-trough decline (%)
  maxDrawdownPeriod: {
    start: string;
    end: string;
  } | null;
}

export interface AnalyticsResponse {
  snapshot: PortfolioSnapshot;
  allocation: AllocationBreakdown[];
  projections: {
    currentAllocation: ProjectionScenario[];
    afterRestructuring: ProjectionScenario[];
    potentialGain: number;
  };
  benchmark: BenchmarkDataPoint[];
  performanceMetrics: PerformanceMetrics;
  recommendations: Recommendation[];
  actionItems: ActionItem[];
}
