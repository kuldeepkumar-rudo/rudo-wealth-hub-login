import type { BenchmarkDataPoint } from "@shared/analyticsTypes";

export interface PerformanceMetrics {
  volatility: number; // Annualized standard deviation (%)
  sharpeRatio: number; // Risk-adjusted return metric
  maxDrawdown: number; // Maximum peak-to-trough decline (%)
  maxDrawdownPeriod: {
    start: string;
    end: string;
  } | null;
}

const RISK_FREE_RATE = 0.07; // 7% - India's current risk-free rate (approx)
const TRADING_DAYS_PER_YEAR = 252;
const MONTHS_PER_YEAR = 12;

/**
 * Detect data frequency based on number of periods
 * Returns the annualization factor (periods per year)
 */
function detectDataFrequency(dataLength: number): number {
  // If we have approximately 12 periods, assume monthly data
  if (dataLength >= 10 && dataLength <= 15) {
    return MONTHS_PER_YEAR;
  }
  // If we have approximately 52 periods, assume weekly data
  if (dataLength >= 50 && dataLength <= 54) {
    return 52;
  }
  // If we have more than 200 periods, assume daily data
  if (dataLength >= 200) {
    return TRADING_DAYS_PER_YEAR;
  }
  // Default to monthly if uncertain
  return MONTHS_PER_YEAR;
}

/**
 * Calculate comprehensive performance metrics
 */
export function calculatePerformanceMetrics(
  benchmarkData: BenchmarkDataPoint[]
): PerformanceMetrics {
  if (benchmarkData.length < 2) {
    return {
      volatility: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      maxDrawdownPeriod: null,
    };
  }

  // Detect the data frequency (monthly, weekly, or daily)
  const periodsPerYear = detectDataFrequency(benchmarkData.length);

  // Calculate period-to-period returns
  const returns = calculatePeriodReturns(benchmarkData.map(d => d.portfolioValue));
  
  // 1. Volatility (annualized standard deviation)
  const volatility = calculateVolatility(returns, periodsPerYear);
  
  // 2. Sharpe Ratio
  const averageReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const annualizedReturn = averageReturn * periodsPerYear;
  const sharpeRatio = calculateSharpeRatio(annualizedReturn, volatility, RISK_FREE_RATE);
  
  // 3. Max Drawdown
  const { maxDrawdown, maxDrawdownPeriod } = calculateMaxDrawdown(benchmarkData);

  return {
    volatility,
    sharpeRatio,
    maxDrawdown,
    maxDrawdownPeriod,
  };
}

/**
 * Calculate period-to-period returns (percentage change)
 */
function calculatePeriodReturns(values: number[]): number[] {
  const returns: number[] = [];
  
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] !== 0) {
      const periodReturn = (values[i] - values[i - 1]) / values[i - 1];
      returns.push(periodReturn);
    }
  }
  
  return returns;
}

/**
 * Calculate volatility (annualized standard deviation)
 */
function calculateVolatility(returns: number[], periodsPerYear: number): number {
  if (returns.length === 0) return 0;
  
  // Calculate mean
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  
  // Calculate variance
  const variance = returns.reduce((sum, r) => {
    const diff = r - mean;
    return sum + (diff * diff);
  }, 0) / returns.length;
  
  // Standard deviation
  const stdDev = Math.sqrt(variance);
  
  // Annualize (multiply by square root of periods per year)
  const annualizedVolatility = stdDev * Math.sqrt(periodsPerYear);
  
  // Return as percentage
  return annualizedVolatility * 100;
}

/**
 * Calculate Sharpe Ratio
 * Formula: (Portfolio Return - Risk Free Rate) / Portfolio Volatility
 */
function calculateSharpeRatio(
  annualizedReturn: number,
  volatility: number,
  riskFreeRate: number
): number {
  if (volatility === 0) return 0;
  
  // Convert to decimal if not already
  const returnDecimal = annualizedReturn;
  const volatilityDecimal = volatility / 100;
  
  return (returnDecimal - riskFreeRate) / volatilityDecimal;
}

/**
 * Calculate maximum drawdown and its period
 */
function calculateMaxDrawdown(
  data: BenchmarkDataPoint[]
): { maxDrawdown: number; maxDrawdownPeriod: { start: string; end: string } | null } {
  if (data.length < 2) {
    return { maxDrawdown: 0, maxDrawdownPeriod: null };
  }

  let maxDrawdown = 0;
  let peak = data[0].portfolioValue;
  let peakIndex = 0;
  let troughIndex = 0;
  let maxDrawdownStart = data[0].period;
  let maxDrawdownEnd = data[0].period;

  for (let i = 1; i < data.length; i++) {
    const currentValue = data[i].portfolioValue;
    
    // Update peak if new high
    if (currentValue > peak) {
      peak = currentValue;
      peakIndex = i;
    }
    
    // Calculate drawdown from peak
    const drawdown = ((peak - currentValue) / peak) * 100;
    
    // Update max drawdown if this is worse
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      troughIndex = i;
      maxDrawdownStart = data[peakIndex].period;
      maxDrawdownEnd = data[i].period;
    }
  }

  return {
    maxDrawdown,
    maxDrawdownPeriod: maxDrawdown > 0 ? { start: maxDrawdownStart, end: maxDrawdownEnd } : null,
  };
}

/**
 * Get Sharpe ratio interpretation for UI
 */
export function getSharpeRatioInterpretation(sharpeRatio: number): {
  label: string;
  variant: "default" | "secondary" | "destructive";
} {
  if (sharpeRatio >= 2) {
    return { label: "Excellent", variant: "default" };
  } else if (sharpeRatio >= 1) {
    return { label: "Good", variant: "default" };
  } else if (sharpeRatio >= 0) {
    return { label: "Acceptable", variant: "secondary" };
  } else {
    return { label: "Poor", variant: "destructive" };
  }
}

/**
 * Get volatility risk level for UI
 */
export function getVolatilityRiskLevel(volatility: number): {
  label: string;
  variant: "default" | "secondary" | "destructive";
} {
  if (volatility < 10) {
    return { label: "Low Risk", variant: "default" };
  } else if (volatility < 20) {
    return { label: "Moderate Risk", variant: "secondary" };
  } else if (volatility < 30) {
    return { label: "High Risk", variant: "destructive" };
  } else {
    return { label: "Very High Risk", variant: "destructive" };
  }
}
